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
      .select('id, kind, title, lesson_id, thumbnail, updated_at, created_at')
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
  return unwrap(await supabase.from('projects').delete().eq('id', project.id))
}

/** Python projects keep their source in the row itself. */
export async function savePythonCode(id, code, thumbnail = null) {
  const patch = thumbnail ? { code, thumbnail } : { code }
  return unwrap(await supabase.from('projects').update(patch).eq('id', id).select().single())
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
export async function saveProgress({ userId, track, lessonId, completedSteps, totalSteps }) {
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
      .select('id, name, join_code, archived, created_at, teacher_id')
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

export async function listProjectsFor(studentIds) {
  if (!studentIds.length) return []
  return unwrap(
    await supabase
      .from('projects')
      .select('id, owner_id, kind, title, lesson_id, updated_at, storage_path, code')
      .in('owner_id', studentIds)
      .order('updated_at', { ascending: false })
  )
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

/* ----------------------------------------------------------------- lessons */

/**
 * Every lesson the current user is allowed to see: global ones, lessons for
 * classes they are in, and their own drafts. RLS decides which rows come back.
 */
export async function listLessons() {
  return unwrap(
    await supabase
      .from('lessons')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
  )
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

/* ------------------------------------------------------------------- admin */

export async function listAllProfiles() {
  return unwrap(
    await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
  )
}

export async function setUserRole(userId, role) {
  return unwrap(await supabase.from('profiles').update({ role }).eq('id', userId).select().single())
}
