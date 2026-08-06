import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { listLessons } from './api'
import { useAuth } from './AuthContext'
import { pythonLessons, scratchLessons } from '../curriculum'

const CurriculumContext = createContext(null)

const BUILT_IN = {
  scratch: scratchLessons,
  python: pythonLessons
}

/** Database row → the shape the rest of the app already expects from a lesson. */
function fromRow(row) {
  return {
    id: row.lesson_key,
    title: row.title,
    blurb: row.blurb ?? '',
    minutes: row.minutes ?? 15,
    mode: row.mode ?? 'console',
    steps: Array.isArray(row.steps) ? row.steps : [],
    starter: row.starter ?? '',
    starterPath: row.starter_path ?? null,
    concepts: [],
    track: row.track,

    // Extra fields, used by the management screens only.
    custom: true,
    rowId: row.id,
    scope: row.scope,
    classId: row.class_id,
    authorId: row.author_id,
    position: row.position ?? 0,
    archived: row.archived
  }
}

/**
 * Lessons come from two places: the ones that ship in src/curriculum, and rows
 * in the `lessons` table written by teachers and admins. This merges them.
 *
 * A database lesson whose key matches a built-in one *replaces* it — that is how
 * an admin edits a lesson that exists in the code without a deploy.
 */
export function CurriculumProvider({ children }) {
  const { session } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) { setRows([]); setLoading(false); return }
    try {
      setRows(await listLessons())
    } catch (error) {
      // A missing table or a failed request must not take the whole app down;
      // the built-in curriculum still works on its own.
      console.warn('Could not load custom lessons:', error.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { refresh() }, [refresh])

  const value = useMemo(() => {
    const custom = rows.filter((row) => !row.archived).map(fromRow)

    const tracks = {}
    for (const trackId of ['scratch', 'python']) {
      const mine = custom.filter((lesson) => lesson.track === trackId)
      const byKey = new Map(mine.map((lesson) => [lesson.id, lesson]))
      const builtInIds = new Set(BUILT_IN[trackId].map((lesson) => lesson.id))

      // Built-ins keep their authored order, with any override swapped in place.
      const merged = BUILT_IN[trackId].map((lesson) => byKey.get(lesson.id) ?? lesson)

      // Brand new lessons follow, in the order their author gave them.
      const extra = mine
        .filter((lesson) => !builtInIds.has(lesson.id))
        .sort((a, b) => a.position - b.position)

      tracks[trackId] = {
        id: trackId,
        name: trackId === 'scratch' ? 'Scratch' : 'Python',
        emoji: trackId === 'scratch' ? '🧩' : '🐍',
        tagline: trackId === 'scratch'
          ? 'Build games by clicking blocks together.'
          : 'Write real code and make games with pygame.',
        lessons: [...merged, ...extra]
      }
    }

    const getLesson = (track, lessonId) =>
      tracks[track]?.lessons.find((lesson) => lesson.id === lessonId) ?? null

    const nextLesson = (track, lessonId) => {
      const list = tracks[track]?.lessons ?? []
      const index = list.findIndex((lesson) => lesson.id === lessonId)
      return index >= 0 && index < list.length - 1 ? list[index + 1] : null
    }

    return { tracks, rows, loading, refresh, getLesson, nextLesson }
  }, [rows, loading, refresh])

  return <CurriculumContext.Provider value={value}>{children}</CurriculumContext.Provider>
}

export function useCurriculum() {
  const context = useContext(CurriculumContext)
  if (!context) throw new Error('useCurriculum must be used inside a <CurriculumProvider>')
  return context
}
