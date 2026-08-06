import { useCallback, useEffect, useMemo, useState } from 'react'

import { Avatar, Empty, KindBadge, LoadingScreen, Modal, ProgressBar, timeAgo, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import {
  archiveClass, createClass, deleteClass, downloadScratchFile, listActivityFor,
  listClassMembers, listMyClasses, listProgressFor, listProjectsFor, removeStudent
} from '../lib/api'
import { downloadBlob, downloadText, toFilename } from '../lib/download'
import { tracks } from '../curriculum'

export default function TeacherDashboard() {
  const toast = useToast()

  const [classes, setClasses] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      // Row level security already limits this to the caller's own classes
      // (or every class, for an admin).
      const rows = await listMyClasses()
      setClasses(rows)
      setActiveId((current) => current ?? rows[0]?.id ?? null)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { refresh() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingScreen label="Loading your classes…" />

  const active = classes.find((c) => c.id === activeId) ?? null

  return (
    <div className="page">
      <div className="row-between wrap">
        <div>
          <h1>Classes</h1>
          <p className="muted mt-2">Track how your students are getting on.</p>
        </div>
        <button className="btn" onClick={() => setNewOpen(true)}>+ New class</button>
      </div>

      {classes.length === 0 ? (
        <div className="mt-6">
          <Empty emoji="🏫" title="No classes yet"
                 action={<button className="btn" onClick={() => setNewOpen(true)}>Create your first class</button>}>
            Create a class, then share its join code with your students.
          </Empty>
        </div>
      ) : (
        <>
          <div className="tabs mt-6">
            {classes.map((item) => (
              <button
                key={item.id}
                className={`tab ${item.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(item.id)}
              >
                {item.name}{item.archived ? ' (archived)' : ''}
              </button>
            ))}
          </div>

          {active && (
            <ClassDetail
              key={active.id}
              klass={active}
              onChanged={refresh}
            />
          )}
        </>
      )}

      {newOpen && (
        <NewClassModal
          onClose={() => setNewOpen(false)}
          onCreated={(created) => { setNewOpen(false); refresh(); setActiveId(created.id) }}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function ClassDetail({ klass, onChanged }) {
  const toast = useToast()
  const { isAdmin } = useAuth()

  const [students, setStudents] = useState([])
  const [progress, setProgress] = useState([])
  const [projects, setProjects] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('progress')
  const [inspect, setInspect] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const roster = await listClassMembers(klass.id)
      setStudents(roster)

      const ids = roster.map((student) => student.id)
      const [progressRows, projectRows, activityRows] = await Promise.all([
        listProgressFor(ids), listProjectsFor(ids), listActivityFor(ids)
      ])
      setProgress(progressRows)
      setProjects(projectRows)
      setActivity(activityRows)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [klass.id, toast])

  useEffect(() => { load() }, [load])

  const byStudent = useMemo(() => {
    const map = new Map()
    students.forEach((student) => map.set(student.id, { scratch: 0, python: 0, lessons: new Map(), lastSeen: null }))

    progress.forEach((row) => {
      const entry = map.get(row.user_id)
      if (!entry) return
      entry.lessons.set(row.lesson_id, row)
      if (row.status === 'completed') entry[row.track] += 1
      if (!entry.lastSeen || row.updated_at > entry.lastSeen) entry.lastSeen = row.updated_at
    })

    projects.forEach((project) => {
      const entry = map.get(project.owner_id)
      if (entry && (!entry.lastSeen || project.updated_at > entry.lastSeen)) entry.lastSeen = project.updated_at
    })

    return map
  }, [students, progress, projects])

  const exportCsv = () => {
    const header = ['Student', 'Email', 'Scratch lessons done', 'Python lessons done', 'Projects', 'Last active']
    const rows = students.map((student) => {
      const entry = byStudent.get(student.id)
      const count = projects.filter((p) => p.owner_id === student.id).length
      return [
        student.full_name ?? '', student.email ?? '',
        entry?.scratch ?? 0, entry?.python ?? 0, count,
        entry?.lastSeen ? new Date(entry.lastSeen).toISOString() : 'never'
      ]
    })
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadText(csv, toFilename(`${klass.name}-progress`, 'csv'), 'text/csv')
    toast.success('Exported class results')
  }

  if (loading) return <div className="mt-6"><LoadingScreen label="Loading class…" /></div>

  return (
    <div>
      {/* Class header */}
      <div className="card row-between wrap">
        <div>
          <h2>{klass.name}</h2>
          <p className="small muted mt-2">{students.length} student{students.length === 1 ? '' : 's'}</p>
        </div>
        <div className="row wrap">
          <div className="center">
            <p className="tiny muted">Join code</p>
            <span className="join-code">{klass.join_code}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            navigator.clipboard?.writeText(klass.join_code)
            toast.success('Code copied')
          }}>Copy</button>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv}>⬇ CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            await archiveClass(klass.id, !klass.archived); onChanged()
          }}>{klass.archived ? 'Unarchive' : 'Archive'}</button>
          {isAdmin && (
            <button className="btn btn-quiet btn-sm" onClick={async () => {
              if (!window.confirm(`Delete the class "${klass.name}"? Student projects are kept.`)) return
              await deleteClass(klass.id); onChanged()
            }}>Delete</button>
          )}
        </div>
      </div>

      {students.length === 0 ? (
        <div className="mt-6">
          <Empty emoji="🧑‍🎓" title="No students have joined yet">
            Share the code <strong>{klass.join_code}</strong> with your class. They enter it
            from their dashboard under “Join a class”.
          </Empty>
        </div>
      ) : (
        <>
          <div className="tabs mt-6">
            <button className={`tab ${view === 'progress' ? 'active' : ''}`} onClick={() => setView('progress')}>Progress</button>
            <button className={`tab ${view === 'matrix' ? 'active' : ''}`} onClick={() => setView('matrix')}>Lesson by lesson</button>
            <button className={`tab ${view === 'projects' ? 'active' : ''}`} onClick={() => setView('projects')}>Projects</button>
            <button className={`tab ${view === 'activity' ? 'active' : ''}`} onClick={() => setView('activity')}>Activity</button>
          </div>

          {view === 'progress' && (
            <div className="card card-pad-0 table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th style={{ width: 190 }}>🧩 Scratch</th>
                    <th style={{ width: 190 }}>🐍 Python</th>
                    <th>Projects</th>
                    <th>Last active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const entry = byStudent.get(student.id)
                    const count = projects.filter((p) => p.owner_id === student.id).length
                    return (
                      <tr key={student.id}>
                        <td>
                          <div className="row">
                            <Avatar name={student.full_name || student.email} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{student.full_name || '—'}</div>
                              <div className="tiny muted">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <ProgressBar value={entry.scratch} total={tracks.scratch.lessons.length}
                                       tone={entry.scratch === tracks.scratch.lessons.length ? 'ok' : ''} />
                          <span className="tiny muted">{entry.scratch}/{tracks.scratch.lessons.length}</span>
                        </td>
                        <td>
                          <ProgressBar value={entry.python} total={tracks.python.lessons.length}
                                       tone={entry.python === tracks.python.lessons.length ? 'ok' : ''} />
                          <span className="tiny muted">{entry.python}/{tracks.python.lessons.length}</span>
                        </td>
                        <td className="num">{count}</td>
                        <td className="small muted">{timeAgo(entry.lastSeen)}</td>
                        <td>
                          <button className="btn btn-quiet btn-sm" title="Remove from class"
                                  onClick={async () => {
                                    if (!window.confirm(`Remove ${student.full_name || student.email} from this class?`)) return
                                    await removeStudent(klass.id, student.id)
                                    load()
                                  }}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {view === 'matrix' && <LessonMatrix students={students} byStudent={byStudent} />}

          {view === 'projects' && (
            projects.length === 0
              ? <Empty emoji="📁" title="No projects yet">Projects appear as soon as students save their work.</Empty>
              : (
                <div className="grid grid-auto">
                  {projects.map((project) => {
                    const owner = students.find((s) => s.id === project.owner_id)
                    return (
                      <div key={project.id} className="card">
                        <div className="row-between">
                          <KindBadge kind={project.kind} />
                          <span className="tiny muted">{timeAgo(project.updated_at)}</span>
                        </div>
                        <h3 className="mt-4">{project.title}</h3>
                        <p className="small muted mt-2">{owner?.full_name || owner?.email || 'Unknown student'}</p>
                        <button className="btn btn-ghost btn-block mt-4" onClick={() => setInspect({ project, owner })}>
                          Look at it
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
          )}

          {view === 'activity' && (
            activity.length === 0
              ? <Empty emoji="📈" title="Nothing yet">Saving and running code shows up here.</Empty>
              : (
                <div className="card">
                  {activity.map((event) => {
                    const who = students.find((s) => s.id === event.user_id)
                    return (
                      <div key={event.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                        <Avatar name={who?.full_name || who?.email} />
                        <div className="grow">
                          <span style={{ fontWeight: 600 }}>{who?.full_name || 'Someone'}</span>{' '}
                          <span className="muted small">{describeEvent(event)}</span>
                        </div>
                        <span className="tiny muted">{timeAgo(event.created_at)}</span>
                      </div>
                    )
                  })}
                </div>
              )
          )}
        </>
      )}

      {inspect && <ProjectInspector {...inspect} onClose={() => setInspect(null)} />}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function LessonMatrix({ students, byStudent }) {
  const [track, setTrack] = useState('python')
  const lessons = tracks[track].lessons

  return (
    <div>
      <div className="row mt-2" style={{ marginBottom: 14 }}>
        {Object.values(tracks).map((item) => (
          <button
            key={item.id}
            className={`btn btn-sm ${track === item.id ? '' : 'btn-ghost'}`}
            onClick={() => setTrack(item.id)}
          >
            {item.emoji} {item.name}
          </button>
        ))}
      </div>

      <div className="card card-pad-0 table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: '#fff' }}>Student</th>
              {lessons.map((lesson, index) => (
                <th key={lesson.id} className="num" title={lesson.title}>{index + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td style={{ position: 'sticky', left: 0, background: '#fff', fontWeight: 600 }}>
                  {student.full_name || student.email}
                </td>
                {lessons.map((lesson) => {
                  const row = byStudent.get(student.id)?.lessons.get(lesson.id)
                  const done = row?.status === 'completed'
                  const started = Boolean(row)
                  return (
                    <td key={lesson.id} className="num"
                        title={`${lesson.title}${row ? ` — ${row.completed_steps}/${row.total_steps} steps` : ' — not started'}`}>
                      {done ? '✅' : started ? '🟡' : '·'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted mt-2">✅ finished · 🟡 started · · not opened yet — hover a cell for details.</p>
    </div>
  )
}

function ProjectInspector({ project, owner, onClose }) {
  const toast = useToast()

  const download = async () => {
    try {
      if (project.kind === 'python') {
        downloadText(project.code ?? '', toFilename(project.title, 'py'))
      } else if (project.storage_path) {
        const blob = await downloadScratchFile(project.storage_path)
        downloadBlob(blob, toFilename(project.title, 'sb3'))
      } else {
        toast.error('This project has not been saved yet.')
        return
      }
      toast.success('Downloaded')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal
      title={project.title}
      onClose={onClose}
      wide
      footer={<button className="btn" onClick={download}>⬇ Download</button>}
    >
      <p className="small muted">
        {owner?.full_name || owner?.email} · edited {timeAgo(project.updated_at)}
      </p>

      {project.kind === 'python' ? (
        <pre
          className="mt-4"
          style={{
            background: 'var(--dark-1)', color: 'var(--dark-ink)', padding: 16,
            borderRadius: 10, overflow: 'auto', maxHeight: '52vh',
            fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.55
          }}
        >
          {project.code || '(empty)'}
        </pre>
      ) : (
        <p className="mt-4">
          Scratch projects open in the editor. Download the <code>.sb3</code> and open it
          from any Scratch workspace, or at scratch.mit.edu.
        </p>
      )}
    </Modal>
  )
}

function describeEvent(event) {
  switch (event.kind) {
    case 'project_created': return 'started a new project'
    case 'project_saved':   return 'saved their work'
    case 'code_run':        return `ran their ${event.detail?.mode === 'game' ? 'game' : 'code'}`
    default:                return event.kind.replace(/_/g, ' ')
  }
}

function NewClassModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const created = await createClass(name.trim(), user.id)
      toast.success(`Class created — the join code is ${created.join_code}`)
      onCreated(created)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="New class" onClose={onClose}>
      <form onSubmit={submit} className="col" style={{ gap: 14 }}>
        <label className="field">
          Class name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="6A — Wednesday club" required autoFocus />
        </label>
        <p className="small muted">A join code is generated automatically for your students.</p>
        <button className="btn btn-lg" type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Create class'}
        </button>
      </form>
    </Modal>
  )
}
