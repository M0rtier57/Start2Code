import { useEffect, useState } from 'react'

import { listMyClasses } from './api'
import { useAuth } from './AuthContext'

/**
 * Which of a teacher's levels a child may start yet.
 *
 * The rule is short: a level opens when the previous one has been handed in.
 * Three things keep it from being a trap:
 *
 *   - Anything the child has already begun stays open. Switching this on in the
 *     middle of term must not lock somebody out of the level they are halfway
 *     through.
 *   - A teacher can open everything for a whole class (classes.lessons_open).
 *   - Teachers and admins are never locked.
 *
 * "Previous" means previous within the same class. A child in two classes with
 * different sets of levels must not be held up by a level that was never theirs.
 *
 * This guards the interface, not the database: a child who is determined can
 * open a project for a locked level by hand. The point is pacing a classroom,
 * not keeping secrets, and the locked level's content is not private.
 */
export function lessonLocks({ lessons, classes, projects, progress, bypass }) {
  const locks = new Map()
  const myClassIds = new Set(classes.map((klass) => klass.id))
  const openClassIds = new Set(classes.filter((klass) => klass.lessons_open).map((klass) => klass.id))

  const handedIn = new Set(projects.filter((p) => p.lesson_id && p.submitted_at).map((p) => p.lesson_id))
  const started = new Set([
    ...projects.filter((p) => p.lesson_id).map((p) => p.lesson_id),
    ...progress.map((row) => row.lesson_id)
  ])

  lessons.forEach((lesson, index) => {
    const mine = (lesson.classIds ?? []).filter((id) => myClassIds.has(id))
    const group = mine[0]

    const before = lessons.slice(0, index).reverse()
    const previous = group
      ? before.find((other) => (other.classIds ?? []).includes(group))
      : before[0]

    const locked = Boolean(
      !bypass
      && previous
      && !mine.some((id) => openClassIds.has(id))
      && !handedIn.has(previous.id)
      && !started.has(lesson.id)
    )

    locks.set(lesson.id, { locked, previous: locked ? previous : null })
  })

  return locks
}

/**
 * Inside the editor: may the child jump to the next level yet?
 *
 * The tile on the dashboard is not the only way forward — the lesson panel
 * offers "next level" the moment the last step is ticked. For a class level it
 * waits until this project has been handed in, or the class is open.
 */
export function useNextLocked(lesson, handedIn) {
  const { isTeacher } = useAuth()
  const [classes, setClasses] = useState([])
  const isClassLesson = lesson?.scope === 'class'

  useEffect(() => {
    if (!isClassLesson || isTeacher) return
    let active = true
    listMyClasses().then((rows) => { if (active) setClasses(rows) }).catch(() => {})
    return () => { active = false }
  }, [isClassLesson, isTeacher])

  if (!isClassLesson || isTeacher || handedIn) return false
  return !classes.some(
    (klass) => klass.lessons_open && (lesson.classIds ?? []).includes(klass.id)
  )
}
