/**
 * Every database call the app makes lives here, so the UI never talks to
 * Supabase directly. Row level security does the real access control; these
 * helpers just shape the queries.
 */
import { supabase } from './supabaseClient'

const BUCKET = 'projects'

function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

/* ---------------------------------------------------------------- projects */

export async function listMyProjects() {
  return unwrap(
    await supabase
      .from('projects')
      .select('id, kind, title, lesson_id, thumbnail, updated_at, created_at, submitted_at')
      .order('updated_at', { ascending: false })
  )
}

export async function getProject(id) {
  return unwrap(await supabase.from('projects').select('*').eq('id', id).single())
}

export async function createProject({ kind, title, code = null, lessonId = null, ownerId }) {
  return unwrap(
    await supabase
      .from('projects')
      .insert({ kind, title, code, lesson_id: lessonId, owner_id: ownerId })
      .select()
      .single()
  )
}

export async function renameProject(id, title) {
  return unwrap(await supabase.from('projects').update({ title }).eq('id', id).select().single())
}

export async function deleteProject(project) {
  if (project.storage_path) {
    // Best effort: a leftover file is harmless, a blocked delete is not.
    await supabase.storage.from(BUCKET).remove([project.storage_path])
  }
  await removeProjectAssets(project.id).catch(() => {})
  return unwrap(await supabase.from('projects').delete().eq('id', project.id))
}

/**
 * Hand a project in for marking.
 *
 * Setting the timestamp again is exactly how a child resubmits corrected work:
 * the teacher's queue asks for projects submitted since they were last marked,
 * so a fresh submission reappears there without anything else being cleared.
 */
export async function submitProject(id) {
  return unwrap(
    await supabase
      .from('projects')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
  )
}

/** Take it back out of the queue — for a child who handed in too early. */
export async function withdrawProject(id) {
  return unwrap(
    await supabase.from('projects').update({ submitted_at: null }).eq('id', id).select().single()
  )
}

/** Python projects keep their source in the row itself. */
export async function savePythonCode(id, code, thumbnail = null, extras = {}) {
  const patch = { ...(thumbnail ? { code, thumbnail } : { code }), ...extras }
  return unwrap(await supabase.from('projects').update(patch).eq('id', id).select().single())
}

/* ------------------------------------------- extra files and sprites */

/** Save the extra .py files and/or the sprite list of a project: { files?, assets? }. */
export async function saveProjectExtras(id, patch) {
  return unwrap(await supabase.from('projects').update(patch).eq('id', id).select().single())
}

/**
 * Uploaded sprites live in the same bucket as a child's other work, under
 * <user-id>/assets/<project-id>/, which the existing storage policies already
 * restrict to that child and the teacher of their class.
 */
export async function uploadAsset(ownerId, projectId, name, blob) {
  const path = `${ownerId}/assets/${projectId}/${name}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: 'image/png' })
  if (error) throw new Error(error.message)
  return path
}

export async function downloadAsset(path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw new Error(error.message)
  return data
}

export async function removeAssets(paths) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw new Error(error.message)
}

/** Everything a deleted project left in storage. Best effort, like the rest of the clean-up. */
async function removeProjectAssets(projectId) {
  const { data: session } = await supabase.auth.getSession()
  const ownerId = session?.session?.user?.id
  if (!ownerId) return

  const folder = `${ownerId}/assets/${projectId}`
  const { data: listed } = await supabase.storage.from(BUCKET).list(folder)
  if (listed?.length) await supabase.storage.from(BUCKET).remove(listed.map((item) => `${folder}/${item.name}`))
}

/**
 * Scratch projects are .sb3 archives, so they go to Storage under
 * `<user-id>/<project-id>.sb3` — the path the storage policies key off.
 */
export async function saveScratchFile(project, ownerId, blob, thumbnail = null) {
  const path = `${ownerId}/${project.id}.sb3`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'application/x.scratch.sb3' })
  if (error) throw new Error(error.message)

  const patch = { storage_path: path }
  if (thumbnail) patch.thumbnail = thumbnail
  return unwrap(await supabase.from('projects').update(patch).eq('id', project.id).select().single())
}

export async function downloadScratchFile(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath)
  if (error) throw new Error(error.message)
  return data
}

/* ---------------------------------------------------------------- progress */

export async function listMyProgress() {
  return unwrap(await supabase.from('lesson_progress').select('*'))
}

/**
 * Progress rows are unique per (user, track, lesson), so an upsert on that key
 * keeps a single row per lesson no matter how often it is saved.
 */
export async function saveProgress({ userId, track, lessonId, completedSteps, totalSteps, stepsDone = [] }) {
  const status = totalSteps > 0 && completedSteps >= totalSteps ? 'completed' : 'in_progress'

  return unwrap(
    await supabase
      .from('lesson_progress')
      .upsert(
        {
          user_id: userId,
          track,
          lesson_id: lessonId,
          completed_steps: completedSteps,
          total_steps: totalSteps,
          // Stored so a teacher can see which steps are done, and so the ticks
          // survive a child moving to another computer.
          steps_done: [...stepsDone].sort((a, b) => a - b),
          status,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,track,lesson_id' }
      )
      .select()
      .single()
  )
}

/* ---------------------------------------------------------------- activity */

/** Fire-and-forget: the timeline is nice to have, never worth failing a save. */
export function logActivity(userId, kind, detail = {}) {
  if (!userId) return Promise.resolve()
  return supabase
    .from('activity_events')
    .insert({ user_id: userId, kind, detail })
    .then(({ error }) => { if (error) console.warn('activity log failed:', error.message) })
}

/* ----------------------------------------------------------------- classes */

export async function listMyClasses() {
  return unwrap(
    await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false })
  )
}

function makeJoinCode() {
  // No 0/O/1/I — these get read aloud and typed by children.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

export async function createClass(name, teacherId) {
  // The code is unique in the database; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from('classes')
      .insert({ name, teacher_id: teacherId, join_code: makeJoinCode() })
      .select()
      .single()

    if (!error) return data
    if (error.code !== '23505') throw new Error(error.message)
  }
  throw new Error('Could not generate a free class code. Please try again.')
}

/** Open every level of a class at once, or go back to one at a time. */
export async function setClassLessonsOpen(id, open) {
  const { error } = await supabase.from('classes').update({ lessons_open: open }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function archiveClass(id, archived) {
  return unwrap(await supabase.from('classes').update({ archived }).eq('id', id).select().single())
}

export async function deleteClass(id) {
  return unwrap(await supabase.from('classes').delete().eq('id', id))
}

export async function joinClassByCode(code) {
  const { data, error } = await supabase.rpc('join_class_by_code', { code })
  if (error) throw new Error(error.message)
  return data
}

export async function leaveClass(classId, studentId) {
  return unwrap(
    await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId)
  )
}

export async function removeStudent(classId, studentId) {
  return leaveClass(classId, studentId)
}

/**
 * Look a child up by name or email, to add them to a class by hand.
 *
 * Goes through a SECURITY DEFINER function rather than a plain select: a
 * teacher may only read the profiles of children they already teach, and this
 * is exactly the case where they need to find one they do not.
 */
export async function searchStudents(query) {
  const q = (query ?? '').trim()
  if (q.length < 2) return []

  const { data, error } = await supabase.rpc('search_students', { q })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Put an existing child in a class. Already a member is not an error. */
export async function addStudentToClass(classId, studentId) {
  const { error } = await supabase
    .from('class_members')
    .insert({ class_id: classId, student_id: studentId })

  // 23505 = unique violation, i.e. they were already in this class.
  if (error && error.code !== '23505') throw new Error(error.message)
}

/** Roster for one class, with each student's profile attached. */
export async function listClassMembers(classId) {
  const rows = unwrap(
    await supabase
      .from('class_members')
      .select('student_id, joined_at, profiles:student_id (id, full_name, email, role)')
      .eq('class_id', classId)
  )
  return rows
    .map((row) => ({ ...row.profiles, joined_at: row.joined_at }))
    .filter((student) => student && student.id)
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
}

/**
 * Progress and projects for a set of students, fetched in two queries rather
 * than one per child — a class of thirty would otherwise be sixty round trips.
 */
export async function listProgressFor(studentIds) {
  if (!studentIds.length) return []
  return unwrap(await supabase.from('lesson_progress').select('*').in('user_id', studentIds))
}

export async function listProjectsFor(studentIds, { submittedOnly = false } = {}) {
  if (!studentIds.length) return []

  let query = supabase
    .from('projects')
    .select('id, owner_id, kind, title, lesson_id, updated_at, submitted_at, storage_path, code')
    .in('owner_id', studentIds)

  // The review queue only contains work a child has actually handed in.
  // Everything else is theirs alone until they decide it is ready.
  if (submittedOnly) query = query.not('submitted_at', 'is', null)

  return unwrap(await query.order('submitted_at', { ascending: true, nullsFirst: false }))
}

export async function listActivityFor(studentIds, limit = 60) {
  if (!studentIds.length) return []
  return unwrap(
    await supabase
      .from('activity_events')
      .select('id, user_id, kind, detail, created_at')
      .in('user_id', studentIds)
      .order('created_at', { ascending: false })
      .limit(limit)
  )
}

/** One student's progress on one lesson — used when marking their work. */
export async function getProgressFor(userId, track, lessonId) {
  if (!userId || !lessonId) return null
  return unwrap(
    await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('track', track)
      .eq('lesson_id', lessonId)
      .maybeSingle()
  )
}

/* ----------------------------------------------------------------- reviews */

/** Reviews of a set of projects, keyed by project id for easy lookup. */
export async function listReviewsFor(projectIds) {
  if (!projectIds.length) return new Map()

  const rows = unwrap(
    await supabase
      .from('reviews')
      .select('*, reviewer:reviewer_id (full_name, email)')
      .in('project_id', projectIds)
  )
  return new Map(rows.map((row) => [row.project_id, row]))
}

/** Every review of the signed-in child's own work. */
export async function listMyReviews() {
  const rows = unwrap(
    await supabase.from('reviews').select('*, reviewer:reviewer_id (full_name)')
  )
  return new Map(rows.map((row) => [row.project_id, row]))
}

/**
 * Mark a project. One review per project, so this upserts on project_id —
 * re-marking corrected work replaces the old verdict instead of stacking up.
 */
export async function saveReview({ projectId, reviewerId, verdict, score, feedback, stepFeedback = {} }) {
  return unwrap(
    await supabase
      .from('reviews')
      .upsert(
        {
          project_id: projectId,
          reviewer_id: reviewerId,
          verdict,
          score: score === '' || score == null ? null : Number(score),
          feedback: feedback?.trim() || null,
          // Empty notes are dropped so the column stays readable.
          step_feedback: Object.fromEntries(
            Object.entries(stepFeedback).filter(([, note]) => note && note.trim())
          ),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'project_id' }
      )
      .select()
      .single()
  )
}

/** One profile, for showing whose work a teacher is looking at. */
export async function getProfile(id) {
  if (!id) return null
  return unwrap(
    await supabase.from('profiles').select('id, full_name, email').eq('id', id).maybeSingle()
  )
}

/** The review of a single project, if it has one. */
export async function getReview(projectId) {
  return unwrap(
    await supabase.from('reviews').select('*').eq('project_id', projectId).maybeSingle()
  )
}

export async function deleteReview(projectId) {
  return unwrap(await supabase.from('reviews').delete().eq('project_id', projectId))
}

/* ----------------------------------------------------------------- lessons */

/**
 * Every lesson the current user is allowed to see: global ones, lessons for
 * classes they are in, and their own drafts. RLS decides which rows come back.
 */
export async function listLessons() {
  const rows = unwrap(
    await supabase
      .from('lessons')
      .select('*, lesson_classes (class_id)')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
  )

  // Flatten the embedded join rows into a plain array of class ids.
  return rows.map((row) => ({
    ...row,
    class_ids: (row.lesson_classes ?? []).map((link) => link.class_id)
  }))
}

/**
 * Replace the set of classes a lesson is shared with.
 *
 * Written as a diff rather than delete-then-insert so that re-saving a lesson
 * without changing its classes touches nothing.
 */
export async function setLessonClasses(lessonId, classIds) {
  const current = unwrap(
    await supabase.from('lesson_classes').select('class_id').eq('lesson_id', lessonId)
  ).map((row) => row.class_id)

  const wanted = [...new Set(classIds)]
  const toAdd = wanted.filter((id) => !current.includes(id))
  const toRemove = current.filter((id) => !wanted.includes(id))

  if (toRemove.length) {
    const { error } = await supabase
      .from('lesson_classes')
      .delete()
      .eq('lesson_id', lessonId)
      .in('class_id', toRemove)
    if (error) throw new Error(error.message)
  }

  if (toAdd.length) {
    const { error } = await supabase
      .from('lesson_classes')
      .insert(toAdd.map((classId) => ({ lesson_id: lessonId, class_id: classId })))
    if (error) throw new Error(error.message)
  }
}

/** Keys must be unique and stable — progress rows point at them. */
export function makeLessonKey(track) {
  const random = Math.random().toString(36).slice(2, 8)
  return `custom-${track}-${Date.now().toString(36)}${random}`
}

export async function createLesson(lesson) {
  return unwrap(await supabase.from('lessons').insert(lesson).select().single())
}

export async function updateLesson(id, patch) {
  return unwrap(await supabase.from('lessons').update(patch).eq('id', id).select().single())
}

export async function deleteLesson(id) {
  return unwrap(await supabase.from('lessons').delete().eq('id', id))
}

const LESSON_BUCKET = 'lesson-assets'

/**
 * Upload the .sb3 a Scratch lesson starts from. The bucket is public-read, so
 * every child following the lesson can fetch it without a signed URL.
 */
export async function uploadLessonStarter(file, authorId) {
  const path = `${authorId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.sb3`

  const { error } = await supabase.storage
    .from(LESSON_BUCKET)
    .upload(path, file, { upsert: true, contentType: 'application/x.scratch.sb3' })
  if (error) throw new Error(error.message)

  return path
}

export function lessonStarterUrl(path) {
  if (!path) return null
  return supabase.storage.from(LESSON_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function removeLessonStarter(path) {
  if (!path) return
  await supabase.storage.from(LESSON_BUCKET).remove([path])
}

/* ------------------------------------------------------------------- admin */

export async function listAllProfiles() {
  return unwrap(
    await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
  )
}

/**
 * What would move if these two accounts were joined? Shown before anything is
 * touched, because a merge cannot be undone.
 */
export async function mergePreview(duplicateId, keepId) {
  const { data, error } = await supabase.rpc('merge_preview', {
    duplicate: duplicateId,
    keep: keepId
  })
  if (error) throw new Error(error.message)
  return data
}

/**
 * Join two accounts: everything the duplicate owns moves to the kept account,
 * and the duplicate is deleted. The whole thing is one transaction in the
 * database, so a failure half way leaves nothing behind.
 */
export async function mergeAccounts({ duplicateId, keepId, name, email }) {
  const { data, error } = await supabase.rpc('merge_accounts', {
    duplicate: duplicateId,
    keep: keepId,
    new_name: name?.trim() || null,
    new_email: email?.trim() || null
  })
  if (error) throw new Error(error.message)
  return data
}

export async function setUserRole(userId, role) {
  return unwrap(await supabase.from('profiles').update({ role }).eq('id', userId).select().single())
}

/* ------------------------------------------------------- my data (GDPR) */

/**
 * Everything we hold about one person, in one file.
 *
 * Deliberately built from the same policies the rest of the app runs under:
 * row level security means this can only ever return the caller's own rows, so
 * there is no way to turn it into a tool for reading somebody else's work.
 */
export async function exportMyData(userId) {
  const [profile, projects, progress, memberships, activity, myLabels, labelLinks] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('projects').select('*').eq('owner_id', userId),
    supabase.from('lesson_progress').select('*').eq('user_id', userId),
    supabase.from('class_members').select('class_id, joined_at, classes (name)').eq('student_id', userId),
    supabase.from('activity_events').select('kind, detail, created_at').eq('user_id', userId),
    // Only a teacher has any; for everybody else row level security returns none.
    supabase.from('teacher_labels').select('id, name, color, created_at'),
    supabase.from('project_labels').select('project_id, label_id, created_at')
  ])

  const mine = (projects.data ?? []).map((project) => project.id)
  const reviews = mine.length
    ? await supabase.from('reviews').select('*').in('project_id', mine)
    : { data: [] }

  return {
    exported_at: new Date().toISOString(),
    about: 'Alles wat Start2Code over dit account bewaart. / Everything Start2Code holds about this account.',
    profile: profile.data ?? null,
    projects: projects.data ?? [],
    lesson_progress: progress.data ?? [],
    classes: memberships.data ?? [],
    reviews: reviews.data ?? [],
    activity: activity.data ?? [],
    // The extra files and sprite list are columns of the project, so they are
    // already inside "projects" above; uploaded pictures are listed by name.
    teacher_labels: myLabels.data ?? [],
    teacher_label_links: labelLinks.data ?? []
  }
}

/**
 * Delete the signed-in account for good. The database decides who may do this
 * and what goes with it; see supabase/data-deletion.sql.
 */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    // The one refusal worth translating: a teacher still owns live classes.
    if (/still_teaching/.test(error.message)) throw new Error('still_teaching')
    throw new Error(error.message)
  }
}

/** A teacher removing a pupil's account at the school's or a parent's request. */
export async function deleteStudentAccount(studentId) {
  const { data, error } = await supabase.rpc('delete_student_account', { student: studentId })
  if (error) throw new Error(error.message)
  return data
}

/* ------------------------------------------- one child's work, and labels */

/**
 * Everything one child has made, not just what they handed in.
 *
 * The review queue stays limited to submitted work on purpose: marking is about
 * what a child says is ready. This is for looking around — a teacher can already
 * read all of their own pupils' projects (the database allows it through
 * teaches_student), so this needs no new permission, only a different question.
 */
export async function listStudentProjects(studentId) {
  return unwrap(
    await supabase
      .from('projects')
      .select('id, owner_id, kind, title, lesson_id, created_at, updated_at, submitted_at')
      .eq('owner_id', studentId)
      .order('updated_at', { ascending: false })
  )
}

/**
 * The teacher's own labels. Row level security hands back only the caller's, so
 * there is nothing to filter here — and a child who asked would get nothing.
 */
export async function listMyLabels() {
  return unwrap(
    await supabase.from('teacher_labels').select('id, name, color, created_at').order('name')
  )
}

export async function createLabel({ name, color = 'grey' }) {
  return unwrap(
    await supabase.from('teacher_labels').insert({ name: name.trim(), color }).select().single()
  )
}

export async function updateLabel(id, patch) {
  const clean = { ...patch }
  if (clean.name != null) clean.name = clean.name.trim()
  return unwrap(await supabase.from('teacher_labels').update(clean).eq('id', id).select().single())
}

/** Removes the label and, through the cascade, it comes off every project. */
export async function deleteLabel(id) {
  const { error } = await supabase.from('teacher_labels').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Which labels sit on which projects, as a Map of projectId -> Set of labelIds. */
export async function listProjectLabels(projectIds) {
  const map = new Map()
  if (!projectIds.length) return map

  const rows = unwrap(
    await supabase.from('project_labels').select('project_id, label_id').in('project_id', projectIds)
  )
  rows.forEach((row) => {
    if (!map.has(row.project_id)) map.set(row.project_id, new Set())
    map.get(row.project_id).add(row.label_id)
  })
  return map
}

/** Put one label on, or take it off, a whole selection of projects at once. */
export async function setLabelOnProjects(projectIds, labelId, on) {
  if (!projectIds.length) return

  if (on) {
    const rows = projectIds.map((project_id) => ({ project_id, label_id: labelId }))
    // Already there is fine: ticking a label twice must not be an error.
    const { error } = await supabase
      .from('project_labels')
      .upsert(rows, { onConflict: 'project_id,label_id', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('project_labels')
      .delete()
      .eq('label_id', labelId)
      .in('project_id', projectIds)
    if (error) throw new Error(error.message)
  }
}
