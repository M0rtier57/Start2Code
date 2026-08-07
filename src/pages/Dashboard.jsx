import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Empty, KindBadge, LoadingScreen, Modal, ProgressBar, timeAgo, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import {
  createProject, deleteProject, joinClassByCode, listMyClasses,
  listMyProgress, listMyProjects, logActivity
} from '../lib/api'
import { downloadJson } from '../lib/download'
import { useCurriculum } from '../lib/CurriculumContext'
import { BLANK_PYGAME, BLANK_PYTHON } from '../curriculum/python'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, displayName } = useAuth()
  const toast = useToast()
  const { tracks, classLessons } = useCurriculum()

  const [projects, setProjects] = useState([])
  const [progress, setProgress] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [joinOpen, setJoinOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [tab, setTab] = useState('learn')

  const refresh = useCallback(async () => {
    try {
      const [projectRows, progressRows, classRows] = await Promise.all([
        listMyProjects(), listMyProgress(), listMyClasses()
      ])
      setProjects(projectRows)
      setProgress(progressRows)
      setClasses(classRows)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { refresh() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const progressByLesson = useMemo(() => {
    const map = new Map()
    progress.forEach((row) => map.set(row.lesson_id, row))
    return map
  }, [progress])

  const start = useCallback(async (trackId, lesson) => {
    try {
      const isScratch = trackId === 'scratch'
      const project = await createProject({
        kind: trackId,
        title: lesson ? lesson.title : `My ${isScratch ? 'Scratch' : 'Python'} project`,
        code: isScratch ? null : (lesson?.starter ?? BLANK_PYTHON),
        lessonId: lesson?.id ?? null,
        ownerId: user.id
      })
      logActivity(user.id, 'project_created', { project_id: project.id, kind: trackId, lesson: lesson?.id })
      navigate(`/${trackId}/${project.id}${lesson ? `?lesson=${lesson.id}` : ''}`)
    } catch (error) {
      toast.error(error.message)
    }
  }, [user, navigate, toast])

  /**
   * Start something with no lesson attached. Python has two real starting
   * points — a plain console script and a pygame window — and picking the wrong
   * one is a frustrating way to begin, so both are offered directly.
   */
  const startBlank = useCallback(async (trackId, flavour = 'console') => {
    const isScratch = trackId === 'scratch'
    const isGame = flavour === 'game'

    const title = isScratch ? 'My Scratch project' : isGame ? 'My game' : 'My Python program'
    const code = isScratch ? null : isGame ? BLANK_PYGAME : BLANK_PYTHON

    try {
      const project = await createProject({ kind: trackId, title, code, lessonId: null, ownerId: user.id })
      logActivity(user.id, 'project_created', { project_id: project.id, kind: trackId, blank: flavour })
      navigate(`/${trackId}/${project.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }, [user, navigate, toast])

  const openProject = (project) => navigate(`/${project.kind}/${project.id}`)

  const remove = async (project) => {
    try {
      await deleteProject(project)
      setProjects((current) => current.filter((p) => p.id !== project.id))
      toast.success('Project deleted')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setConfirmDelete(null)
    }
  }

  if (loading) return <LoadingScreen label="Loading your work…" />

  const totals = Object.values(tracks).map((track) => {
    const done = track.lessons.filter((lesson) => progressByLesson.get(lesson.id)?.status === 'completed').length
    return { track, done, total: track.lessons.length }
  })

  return (
    <div className="page">
      <div className="row-between wrap">
        <div>
          <h1>Hi {displayName}! 👋</h1>
          <p className="muted mt-2">Pick up where you left off, or start something new.</p>
        </div>
        <div className="row">
          {classes.length === 0 && (
            <button className="btn btn-ghost" onClick={() => setJoinOpen(true)}>Join a class</button>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => {
              downloadJson({ exportedAt: new Date().toISOString(), projects, progress }, 'start2code-progress.json')
              toast.success('Downloaded a copy of your progress')
            }}
          >
            ⬇ Export progress
          </button>
        </div>
      </div>

      {classes.length > 0 && (
        <p className="small muted mt-4">
          In {classes.length === 1 ? 'class' : 'classes'}: {classes.map((c) => c.name).join(', ')}
        </p>
      )}

      {/* Work set by a teacher, kept clearly apart from the general curriculum. */}
      {classLessons.length > 0 && (
        <section className="mt-6">
          <div className="row-between wrap">
            <h2>📌 From your teacher</h2>
            <span className="badge badge-brand">
              {classLessons.length} lesson{classLessons.length === 1 ? '' : 's'} for your class
            </span>
          </div>
          <p className="small muted mt-2">Lessons your teacher made especially for you.</p>

          <div className="grid grid-auto mt-4">
            {classLessons.map((lesson) => {
              const row = progressByLesson.get(lesson.id)
              const complete = row?.status === 'completed'
              return (
                <button
                  key={lesson.id}
                  className="tile"
                  style={{ borderColor: complete ? 'var(--ok)' : 'var(--brand)', borderWidth: 2 }}
                  onClick={() => start(lesson.track, lesson)}
                >
                  <div className="row-between">
                    <KindBadge kind={lesson.track} />
                    {complete
                      ? <span className="badge badge-ok">✓ Done</span>
                      : row ? <span className="badge badge-brand">In progress</span> : null}
                  </div>
                  <h3 className="mt-2">{lesson.title}</h3>
                  <p className="small muted mt-2">{lesson.blurb}</p>
                  {row && row.total_steps > 0 && (
                    <div className="mt-4">
                      <ProgressBar value={row.completed_steps} total={row.total_steps} tone={complete ? 'ok' : ''} />
                    </div>
                  )}
                  <p className="tiny muted mt-2">⏱ about {lesson.minutes} min</p>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Start something new — the fastest possible route into an editor. */}
      <h2 className="mt-6">Start something new</h2>
      <div className="grid grid-auto mt-4">
        <button className="tile" onClick={() => startBlank('scratch')}>
          <span style={{ fontSize: '1.9rem' }}>🧩</span>
          <h3 className="mt-2">Blank Scratch project</h3>
          <p className="small muted mt-2">An empty stage and the block palette. Build whatever you like.</p>
        </button>

        <button className="tile" onClick={() => startBlank('python', 'console')}>
          <span style={{ fontSize: '1.9rem' }}>🐍</span>
          <h3 className="mt-2">Blank Python program</h3>
          <p className="small muted mt-2">A code editor and a console. Starts instantly.</p>
        </button>

        <button className="tile" onClick={() => startBlank('python', 'game')}>
          <span style={{ fontSize: '1.9rem' }}>🎮</span>
          <h3 className="mt-2">Blank pygame game</h3>
          <p className="small muted mt-2">A ready-made game window you can draw in straight away.</p>
        </button>
      </div>

      {/* Track summary */}
      <h2 className="mt-6">Your learning</h2>
      <div className="grid mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {totals.map(({ track, done, total }) => (
          <div key={track.id} className="card">
            <div className="row-between">
              <h2>{track.emoji} {track.name}</h2>
              <span className="badge">{done}/{total} done</span>
            </div>
            <p className="small muted mt-2">{track.tagline}</p>
            <div className="mt-4"><ProgressBar value={done} total={total} tone={done === total ? 'ok' : ''} /></div>
            <button className="btn btn-block mt-4" onClick={() => start(track.id, track.lessons[Math.min(done, total - 1)])}>
              {done === 0 ? 'Start lesson 1' : done === total ? 'Practise again' : 'Continue learning'}
            </button>
          </div>
        ))}
      </div>

      <div className="tabs mt-6">
        <button className={`tab ${tab === 'learn' ? 'active' : ''}`} onClick={() => setTab('learn')}>Lessons</button>
        <button className={`tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
          My projects ({projects.length})
        </button>
      </div>

      {tab === 'learn' ? (
        <div className="col" style={{ gap: 30 }}>
          {Object.values(tracks).map((track) => (
            <section key={track.id}>
              <div className="row-between">
                <h2>{track.emoji} {track.name} lessons</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => startBlank(track.id)}>
                  + Blank {track.name} project
                </button>
              </div>

              <div className="grid grid-auto mt-4">
                {track.lessons.map((lesson, index) => {
                  const row = progressByLesson.get(lesson.id)
                  const complete = row?.status === 'completed'
                  return (
                    <button key={lesson.id} className="tile" onClick={() => start(track.id, lesson)}>
                      <div className="row-between">
                        <span className="badge">Lesson {index + 1}</span>
                        {complete
                          ? <span className="badge badge-ok">✓ Done</span>
                          : row ? <span className="badge badge-brand">In progress</span> : null}
                      </div>
                      <h3 className="mt-2">{lesson.title}</h3>
                      <p className="small muted mt-2">{lesson.blurb}</p>
                      {row && row.total_steps > 0 && (
                        <div className="mt-4">
                          <ProgressBar value={row.completed_steps} total={row.total_steps} tone={complete ? 'ok' : ''} />
                        </div>
                      )}
                      <p className="tiny muted mt-2">⏱ about {lesson.minutes} min</p>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div>
          {projects.length === 0 ? (
            <Empty emoji="🚀" title="No projects yet"
                   action={<button className="btn" onClick={() => setTab('learn')}>Browse the lessons</button>}>
              Start a lesson and your work will appear here automatically.
            </Empty>
          ) : (
            <div className="grid grid-auto">
              {projects.map((project) => (
                <div key={project.id} className="card">
                  <div className="row-between">
                    <KindBadge kind={project.kind} />
                    <button
                      className="btn btn-quiet btn-sm"
                      onClick={() => setConfirmDelete(project)}
                      aria-label={`Delete ${project.title}`}
                    >🗑</button>
                  </div>
                  <h3 className="mt-4">{project.title}</h3>
                  <p className="tiny muted mt-2">Edited {timeAgo(project.updated_at)}</p>
                  <button className="btn btn-block mt-4" onClick={() => openProject(project)}>Open</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {joinOpen && <JoinClassModal onClose={() => setJoinOpen(false)} onJoined={() => { setJoinOpen(false); refresh() }} />}

      {confirmDelete && (
        <Modal
          title="Delete this project?"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => remove(confirmDelete)}>Delete for ever</button>
            </>
          }
        >
          <p><strong>{confirmDelete.title}</strong> will be gone and cannot be brought back.</p>
          <p className="small muted mt-2">Tip: open it first and download a copy if you want to keep it.</p>
        </Modal>
      )}
    </div>
  )
}

function JoinClassModal({ onClose, onJoined }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const joined = await joinClassByCode(code.trim())
      toast.success(`You joined ${joined?.name ?? 'the class'}!`)
      onJoined()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Join your class" onClose={onClose}>
      <p className="small muted">Your teacher will give you a six-letter code.</p>
      <form onSubmit={submit} className="col mt-4" style={{ gap: 14 }}>
        <input
          className="code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123" maxLength={6} required aria-label="Class code"
        />
        <button className="btn btn-lg" type="submit" disabled={busy || code.length < 4}>
          {busy ? 'Checking…' : 'Join class'}
        </button>
      </form>
    </Modal>
  )
}
