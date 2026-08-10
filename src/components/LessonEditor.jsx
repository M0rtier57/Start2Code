import { useState } from 'react'
import Editor from '@monaco-editor/react'

import { Modal, useToast } from './ui'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../i18n'
import {
  createLesson, makeLessonKey, removeLessonStarter, setLessonClasses, updateLesson, uploadLessonStarter
} from '../lib/api'
import { pickFile } from '../lib/download'
import { BLANK_PYGAME, BLANK_PYTHON } from '../curriculum/python'

/**
 * Create or edit a lesson.
 *
 * `lesson` is a row from the lessons table when editing, or null when creating.
 * `builtIn` seeds the form from a lesson that ships in the code — that is how an
 * admin customises one: it saves under the same key, and the merge in
 * CurriculumContext then prefers this version everywhere.
 */
export default function LessonEditor({ lesson, builtIn, classes = [], canPublishGlobal, onClose, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const { pick } = useI18n()

  const seed = lesson ?? builtIn ?? null
  const isEditing = Boolean(lesson)

  // A built-in lesson carries { nl, en } text; a database row plain strings.
  const resolvedTitle = pick(seed?.title) || ''
  const resolvedBlurb = pick(seed?.blurb) || ''
  // Built-in steps may be objects carrying an automatic check; the editor works
  // in plain text, so they are flattened here. A teacher editing a built-in
  // lesson keeps the words and loses the automatic checking — which is honest,
  // since the check no longer necessarily matches what they wrote.
  const resolvedSteps = (pick(seed?.steps) || []).map(
    (step) => (typeof step === 'string' ? step : step?.text ?? '')
  )

  const [track, setTrack] = useState(seed?.track ?? 'python')
  const [title, setTitle] = useState(resolvedTitle)
  const [blurb, setBlurb] = useState(resolvedBlurb)
  const [minutes, setMinutes] = useState(seed?.minutes ?? 15)
  const [mode, setMode] = useState(seed?.mode ?? 'console')
  const [steps, setSteps] = useState(
    resolvedSteps.length ? [...resolvedSteps] : ['']
  )
  const [starter, setStarter] = useState(seed?.starter ?? '')
  const [starterPath, setStarterPath] = useState(lesson?.starter_path ?? seed?.starterPath ?? null)
  const [uploading, setUploading] = useState(false)
  // New lessons start private, so nothing reaches children until it is ready.
  const [scope, setScope] = useState(lesson?.scope ?? 'private')
  const [classIds, setClassIds] = useState(lesson?.class_ids ?? [])
  const [busy, setBusy] = useState(false)

  const isPython = track === 'python'

  const setStep = (index, value) =>
    setSteps((current) => current.map((step, i) => (i === index ? value : step)))

  const addStep = () => setSteps((current) => [...current, ''])

  const removeStep = (index) =>
    setSteps((current) => (current.length === 1 ? [''] : current.filter((_, i) => i !== index)))

  const moveStep = (index, delta) =>
    setSteps((current) => {
      const target = index + delta
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const useTemplate = () => setStarter(mode === 'game' ? BLANK_PYGAME : BLANK_PYTHON)

  /**
   * A Scratch lesson starts from a project file rather than source code. Build
   * it in the editor, download the .sb3, then upload it here.
   */
  const uploadStarter = async () => {
    const file = await pickFile('.sb3')
    if (!file) return

    setUploading(true)
    try {
      const previous = starterPath
      const path = await uploadLessonStarter(file, user.id)
      setStarterPath(path)
      // Only bin the old file once the new one is safely stored.
      if (previous) removeLessonStarter(previous)
      toast.success('Starting project uploaded')
    } catch (error) {
      toast.error(`Could not upload: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()

    const cleanSteps = steps.map((step) => step.trim()).filter(Boolean)
    if (!title.trim()) return toast.error('Give the lesson a title.')
    if (cleanSteps.length === 0) return toast.error('Add at least one step.')
    if (scope === 'class' && classIds.length === 0) {
      return toast.error('Pick at least one class, or keep the lesson private.')
    }

    const payload = {
      track,
      title: title.trim(),
      blurb: blurb.trim(),
      minutes: Number(minutes) || 15,
      mode: isPython ? mode : 'console',
      steps: cleanSteps,
      starter: isPython ? starter : null,
      starter_path: isPython ? null : starterPath,
      scope
    }

    // A lesson that is no longer class-scoped should not keep its old classes.
    const links = scope === 'class' ? classIds : []

    setBusy(true)
    try {
      if (isEditing) {
        await updateLesson(lesson.id, payload)
        await setLessonClasses(lesson.id, links)
        toast.success('Lesson updated')
      } else {
        const created = await createLesson({
          ...payload,
          // Reusing a built-in key makes this row override that lesson.
          lesson_key: builtIn ? builtIn.id : makeLessonKey(track),
          author_id: user.id
        })
        if (links.length) await setLessonClasses(created.id, links)
        toast.success(builtIn ? 'Built-in lesson customised' : 'Lesson created')
      }
      onSaved?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const heading = isEditing
    ? 'Edit lesson'
    : builtIn ? `Customise “${pick(builtIn.title)}”` : 'New lesson'

  return (
    <Modal title={heading} onClose={onClose} wide>
      <form onSubmit={submit} className="col" style={{ gap: 16 }}>
        {builtIn && !isEditing && (
          <p className="small" style={{ background: 'var(--brand-soft)', padding: 12, borderRadius: 10 }}>
            This saves your own version of a built-in lesson. Everyone who can see it will get
            your version instead. Student progress is kept, because the lesson keeps its identity.
          </p>
        )}

        <div className="row wrap" style={{ gap: 12, alignItems: 'flex-start' }}>
          <label className="field grow">
            Track
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              disabled={Boolean(builtIn) || isEditing}
              title={builtIn || isEditing ? 'The track cannot change once a lesson exists' : undefined}
            >
              <option value="python">🐍 Python</option>
              <option value="scratch">🧩 Scratch</option>
            </select>
          </label>

          <label className="field" style={{ width: 130 }}>
            Minutes
            <input type="number" min="5" max="120" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>

          {isPython && (
            <label className="field" style={{ width: 190 }}>
              Runs as
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="console">Console program</option>
                <option value="game">pygame window</option>
              </select>
            </label>
          )}
        </div>

        <label className="field">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Make a bouncing ball" required />
        </label>

        <label className="field">
          One-line description
          <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Move a ball around and make it bounce off the walls." />
        </label>

        {/* Who can see it */}
        <div className="row wrap" style={{ gap: 12, alignItems: 'flex-start' }}>
          <label className="field grow">
            Who can see this lesson
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="private">🔒 Only me — a draft</option>
              <option value="class">👩‍🏫 One class</option>
              {canPublishGlobal && <option value="global">🌍 Everyone on Start2Code</option>}
            </select>
          </label>

        </div>

        {/* A lesson can go to as many classes as you like. */}
        {scope === 'class' && (
          <div>
            <label className="field" style={{ marginBottom: 0 }}>Classes</label>
            {classes.length === 0 ? (
              <p className="small muted mt-2">
                You do not teach any classes yet — create one first, or keep this lesson private.
              </p>
            ) : (
              <div className="col mt-2" style={{ gap: 6 }}>
                {classes.map((item) => {
                  const checked = classIds.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      className="row"
                      style={{
                        gap: 10, cursor: 'pointer', padding: '8px 12px',
                        border: `1px solid ${checked ? 'var(--brand)' : 'var(--line)'}`,
                        background: checked ? 'var(--brand-soft)' : 'transparent',
                        borderRadius: 10
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        style={{ width: 16, height: 16, margin: 0 }}
                        onChange={() => setClassIds((current) => (
                          checked ? current.filter((id) => id !== item.id) : [...current, item.id]
                        ))}
                      />
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      {item.archived && <span className="badge">archived</span>}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <p className="tiny muted" style={{ marginTop: -6 }}>
          {scope === 'private' && 'Nobody else can see this yet. Change it here when you are ready to share.'}
          {scope === 'class' && `Students in ${classIds.length === 1 ? 'that class' : `those ${classIds.length} classes`} see it under “From your teacher”.`}
          {scope === 'global' && 'Every student and teacher on Start2Code sees it, in the main lesson list.'}
        </p>

        {/* Steps */}
        <div>
          <div className="row-between">
            <label className="field" style={{ marginBottom: 0 }}>Steps</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addStep}>+ Add step</button>
          </div>
          <p className="tiny muted mt-2">
            One instruction per step — children tick them off. Wrap code in `backticks`.
          </p>

          <div className="col mt-2" style={{ gap: 8 }}>
            {steps.map((step, index) => (
              <div key={index} className="row" style={{ gap: 6 }}>
                <span className="badge" style={{ minWidth: 26, justifyContent: 'center' }}>{index + 1}</span>
                <input
                  value={step}
                  onChange={(e) => setStep(index, e.target.value)}
                  placeholder="Press the green flag and watch what happens."
                />
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => removeStep(index)} aria-label="Remove step">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Starter code */}
        {isPython && (
          <div>
            <div className="row-between">
              <label className="field" style={{ marginBottom: 0 }}>Starting code</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={useTemplate}>
                Use the {mode === 'game' ? 'pygame' : 'console'} template
              </button>
            </div>
            <p className="tiny muted mt-2">This is what the child sees when they open the lesson.</p>
            <div className="mt-2" style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              <Editor
                height="260px"
                defaultLanguage="python"
                theme="vs-dark"
                value={starter}
                onChange={(value) => setStarter(value ?? '')}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  tabSize: 4
                }}
              />
            </div>
          </div>
        )}

        {/* Scratch starting project */}
        {!isPython && (
          <div>
            <label className="field" style={{ marginBottom: 0 }}>Starting project (optional)</label>
            <p className="tiny muted mt-2">
              Children open the lesson with this project already loaded — half-built sprites, a
              backdrop, whatever they should start from. Build it in the Scratch editor, press
              <strong> ⬇ Download .sb3</strong>, then upload the file here.
            </p>

            <div className="row mt-2 wrap">
              <button type="button" className="btn btn-ghost btn-sm" onClick={uploadStarter} disabled={uploading}>
                {uploading ? 'Uploading…' : starterPath ? 'Replace .sb3' : '⬆ Upload .sb3'}
              </button>

              {starterPath && (
                <>
                  <span className="badge badge-ok">✓ starting project attached</span>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => { removeLessonStarter(starterPath); setStarterPath(null) }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>

            {!starterPath && (
              <p className="tiny muted mt-2">
                Without one, the lesson opens on an empty stage with the cat.
              </p>
            )}
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Create lesson'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
