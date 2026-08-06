import { useMemo, useState } from 'react'

import LessonEditor from './LessonEditor'
import { Empty, Modal, useToast } from './ui'
import { useAuth } from '../lib/AuthContext'
import { deleteLesson, updateLesson } from '../lib/api'
import { useCurriculum } from '../lib/CurriculumContext'
import { pythonLessons, scratchLessons } from '../curriculum'

const BUILT_IN = { scratch: scratchLessons, python: pythonLessons }

/**
 * Lesson management, used by both the teacher and the admin screens.
 *
 * A teacher writes lessons for their own classes; an admin can additionally
 * publish to everyone and customise the lessons that ship in the code.
 */
export default function LessonsManager({ classes = [] }) {
  const { isAdmin, user } = useAuth()
  const { rows, refresh } = useCurriculum()
  const toast = useToast()

  const [editing, setEditing] = useState(null)       // a lessons row
  const [customising, setCustomising] = useState(null) // a built-in lesson
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [track, setTrack] = useState('python')

  const mine = useMemo(
    () => rows.filter((row) => row.track === track),
    [rows, track]
  )

  const overriddenKeys = useMemo(() => new Set(rows.map((row) => row.lesson_key)), [rows])

  const remove = async (row) => {
    try {
      await deleteLesson(row.id)
      toast.success(
        BUILT_IN[row.track].some((l) => l.id === row.lesson_key)
          ? 'Your version was removed — the original lesson is back'
          : 'Lesson deleted'
      )
      refresh()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setConfirm(null)
    }
  }

  /** Pull a lesson back out of sight without deleting it. */
  const unpublish = async (row) => {
    try {
      await updateLesson(row.id, { scope: 'private', class_id: null })
      toast.success('That lesson is private again — only you can see it')
      refresh()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const closeAll = () => { setEditing(null); setCustomising(null); setCreating(false) }
  const saved = () => { closeAll(); refresh() }

  return (
    <div>
      <div className="row-between wrap">
        <div>
          <h2>Lessons</h2>
          <p className="small muted mt-2">
            {isAdmin
              ? 'Write lessons for everyone, or change the ones that come with Start2Code.'
              : 'Write your own lessons for the classes you teach.'}
          </p>
        </div>
        <button className="btn" onClick={() => setCreating(true)}>+ New lesson</button>
      </div>

      <div className="row mt-4">
        {['python', 'scratch'].map((id) => (
          <button
            key={id}
            className={`btn btn-sm ${track === id ? '' : 'btn-ghost'}`}
            onClick={() => setTrack(id)}
          >
            {id === 'python' ? '🐍 Python' : '🧩 Scratch'}
          </button>
        ))}
      </div>

      {/* Custom lessons */}
      <h3 className="mt-6">Custom lessons</h3>
      {mine.length === 0 ? (
        <div className="mt-2">
          <Empty emoji="✏️" title="No custom lessons yet"
                 action={<button className="btn" onClick={() => setCreating(true)}>Write one</button>}>
            Lessons you write appear in the children&rsquo;s lesson list alongside the built-in ones.
          </Empty>
        </div>
      ) : (
        <div className="card card-pad-0 table-scroll mt-2">
          <table className="table">
            <thead>
              <tr>
                <th>Lesson</th><th>Visible to</th><th>Steps</th><th style={{ width: 170 }} />
              </tr>
            </thead>
            <tbody>
              {mine.map((row) => {
                const isOverride = BUILT_IN[row.track].some((l) => l.id === row.lesson_key)
                const owned = row.author_id === user.id || isAdmin
                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.title}</div>
                      <div className="tiny muted">{row.blurb || '—'}</div>
                      {isOverride && <span className="badge badge-brand mt-2">replaces a built-in lesson</span>}
                    </td>
                    <td>
                      {row.scope === 'private' && <span className="badge">🔒 Only me</span>}
                      {row.scope === 'global' && <span className="badge badge-ok">🌍 Everyone</span>}
                      {row.scope === 'class' && (
                        <span className="badge badge-brand">
                          👩‍🏫 {classes.find((c) => c.id === row.class_id)?.name ?? 'A class'}
                        </span>
                      )}
                      {row.scope === 'private' && owned && (
                        <div className="mt-2">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditing(row)}
                            title="Open the lesson to choose who can see it"
                          >
                            Share…
                          </button>
                        </div>
                      )}
                      {row.scope !== 'private' && owned && (
                        <div className="mt-2">
                          <button
                            className="btn btn-quiet btn-sm"
                            onClick={() => unpublish(row)}
                            title="Hide it from everyone again"
                          >
                            Make private
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="num">{Array.isArray(row.steps) ? row.steps.length : 0}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(row)} disabled={!owned}>Edit</button>
                        <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(row)} disabled={!owned}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Built-in lessons — admins may take a copy and edit it */}
      {isAdmin && (
        <>
          <h3 className="mt-6">Built-in lessons</h3>
          <p className="small muted mt-2">
            These ship with Start2Code. Customising one saves your own version over it for
            everybody; deleting your version brings the original back.
          </p>
          <div className="card card-pad-0 table-scroll mt-2">
            <table className="table">
              <thead>
                <tr><th>Lesson</th><th>Steps</th><th style={{ width: 150 }} /></tr>
              </thead>
              <tbody>
                {BUILT_IN[track].map((lesson) => {
                  const replaced = overriddenKeys.has(lesson.id)
                  return (
                    <tr key={lesson.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{lesson.title}</div>
                        <div className="tiny muted">{lesson.blurb}</div>
                      </td>
                      <td className="num">{lesson.steps.length}</td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          {replaced
                            ? <span className="badge badge-brand">customised</span>
                            : <button className="btn btn-ghost btn-sm" onClick={() => setCustomising({ ...lesson, track })}>
                                Customise
                              </button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(creating || editing || customising) && (
        <LessonEditor
          lesson={editing}
          builtIn={customising}
          classes={classes}
          canPublishGlobal={isAdmin}
          onClose={closeAll}
          onSaved={saved}
        />
      )}

      {confirm && (
        <Modal
          title="Delete this lesson?"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => remove(confirm)}>Delete</button>
            </>
          }
        >
          <p><strong>{confirm.title}</strong> will disappear from the children&rsquo;s lesson list.</p>
          <p className="small muted mt-2">
            Work they already saved is kept — only the instructions go away.
          </p>
        </Modal>
      )}
    </div>
  )
}
