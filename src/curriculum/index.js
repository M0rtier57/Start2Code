import { pythonLessons } from './python'
import { scratchLessons } from './scratch'

export { pythonLessons, scratchLessons }

export const tracks = {
  scratch: {
    id: 'scratch',
    name: 'Scratch',
    emoji: '🧩',
    tagline: 'Build games by clicking blocks together.',
    lessons: scratchLessons
  },
  python: {
    id: 'python',
    name: 'Python',
    emoji: '🐍',
    tagline: 'Write real code and make games with pygame.',
    lessons: pythonLessons
  }
}

export function getLesson(track, lessonId) {
  return tracks[track]?.lessons.find((lesson) => lesson.id === lessonId) ?? null
}

/** Finds a lesson by id without knowing which track it belongs to. */
export function findLessonAnywhere(lessonId) {
  for (const track of Object.values(tracks)) {
    const lesson = track.lessons.find((item) => item.id === lessonId)
    if (lesson) return { track: track.id, lesson }
  }
  return null
}

export function nextLesson(track, lessonId) {
  const lessons = tracks[track]?.lessons ?? []
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  return index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null
}

export const totalLessonCount = scratchLessons.length + pythonLessons.length
