import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'

import Console from '../components/Console'
import LessonPanel from '../components/LessonPanel'
import ReviewPanel from '../components/review'
import { LoadingScreen, Modal, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import {
  getProfile, getProject, getReview, logActivity, renameProject, savePythonCode, submitProject
} from '../lib/api'
import { STATE_KEY, STATE_STYLE, submissionState } from '../lib/submission'
import { downloadText, toFilename } from '../lib/download'
import { useCurriculum } from '../lib/CurriculumContext'
import { useI18n } from '../i18n'

const AUTOSAVE_DELAY = 2500

export default function PythonWorkspace() {
  const { projectId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, isTeacher } = useAuth()
  const toast = useToast()
  const { getLesson, tracks } = useCurriculum()
  const { t, pick } = useI18n()

  const [project, setProject] = useState(null)
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState('saved')   // saved | dirty | saving | error
  const [output, setOutput] = useState([])
  const [running, setRunning] = useState(false)
  const [consoleHeight, setConsoleHeight] = useState(220)
  const [showLesson, setShowLesson] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [frameKey, setFrameKey] = useState(0)
  const [stageFull, setStageFull] = useState(false)

  // Only used when a teacher opens someone else's work to mark it.
  const [owner, setOwner] = useState(null)
  const [review, setReview] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const frame = useRef(null)
  const stagePane = useRef(null)
  const pendingRun = useRef(null)     // code waiting for a fresh frame to boot
  const savedCode = useRef('')

  const lesson = useMemo(
    () => getLesson('python', project?.lesson_id ?? params.get('lesson')),
    // getLesson changes identity once the custom lessons have loaded; without
    // it here, a database lesson would never show up in the panel.
    [getLesson, project?.lesson_id, params]
  )

  // A teacher opening a child's project is here to mark it, not to edit it.
  // Saving is blocked by row level security anyway; this stops the app from
  // even trying, and swaps the lesson steps for the marking panel.
  const reviewing = Boolean(project && user && project.owner_id !== user.id && isTeacher)

  // Lessons up to the pygame ones only need a console; loading pygame for them
  // would mean a multi-second download for a two-line program.
  const mode = useMemo(() => {
    if (/^\s*import\s+pygame|^\s*from\s+pygame/m.test(code)) return 'game'
    return lesson?.mode === 'game' ? 'game' : 'console'
  }, [code, lesson])

  /* ------------------------------------------------------------------ load */
  useEffect(() => {
    let active = true
    setLoading(true)

    getProject(projectId)
      .then((row) => {
        if (!active) return
        setProject(row)
        setCode(row.code ?? '')
        savedCode.current = row.code ?? ''
        setTitle(row.title)

        // Whose work is this, and has it been marked already?
        if (user && row.owner_id !== user.id) {
          getProfile(row.owner_id).then(setOwner).catch(() => {})
          getReview(row.id).then(setReview).catch(() => {})
        }
      })
      .catch((error) => {
        toast.error(error.message)
        navigate('/')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [projectId])   // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------------ save */
  const save = useCallback(async (nextCode = code, nextTitle = title) => {
    if (!project || reviewing) return
    setSaveState('saving')
    try {
      await savePythonCode(project.id, nextCode)
      if (nextTitle !== project.title) await renameProject(project.id, nextTitle)
      savedCode.current = nextCode
      setSaveState('saved')
      logActivity(user?.id, 'project_saved', { project_id: project.id, kind: 'python' })
    } catch (error) {
      setSaveState('error')
      toast.error(t('ws.saveError', { error: error.message }))
    }
  }, [project, code, title, user, toast, t, reviewing])

  // Autosave after a pause in typing, so nothing is ever lost at the bell.
  useEffect(() => {
    if (!project || reviewing || code === savedCode.current) return
    setSaveState('dirty')
    const timer = setTimeout(() => save(code, title), AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [code, title, project, save, reviewing])

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const handler = (event) => {
      if (!reviewing && savedCode.current !== code) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [code, reviewing])

  /* ------------------------------------------------------------------- run */
  const append = useCallback((entries) => {
    setOutput((current) => {
      const next = [...current, ...entries]
      // Keep the console bounded; a runaway loop can print for ever.
      return next.length > 3000 ? next.slice(next.length - 3000) : next
    })
  }, [])

  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data
      if (!data || data.source !== 's2c-python') return

      switch (data.type) {
        case 'boot':
          // A fresh frame is ready; send the run that was waiting for it.
          if (pendingRun.current) {
            frame.current?.contentWindow?.postMessage(
              { source: 's2c', type: 'run', code: pendingRun.current.code, mode: pendingRun.current.mode },
              '*'
            )
            pendingRun.current = null
          }
          break
        case 'started':
          setRunning(true)
          break
        case 'output':
          append(data.lines)
          break
        case 'finished':
          setRunning(false)
          append([{ stream: 'sys', text: data.ok ? t('console.finished') : t('console.crashed') }])

          // The console is hidden while the stage is fullscreen, so a crash
          // would be silent. Come back out so the error is actually readable.
          if (!data.ok) {
            setStageFull(false)
            if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
          }
          break
        case 'needs-reload':
          break
        default:
          break
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [append, t])

  const run = useCallback(() => {
    setOutput([{ stream: 'sys', text: (mode === 'game' ? t('console.runningGame') : t('console.runningProgram')) + '\n' }])
    setRunning(true)

    // Pyodide has no clean way to abort a running program, so each run gets a
    // brand new frame. Remounting the iframe is the reset.
    pendingRun.current = { code, mode }
    setFrameKey((key) => key + 1)

    if (project && code !== savedCode.current) save(code, title)
    logActivity(user?.id, 'code_run', { project_id: project?.id, mode })
  }, [code, mode, project, save, title, user, t])

  const stop = useCallback(() => {
    pendingRun.current = null
    setFrameKey((key) => key + 1)
    setRunning(false)
    append([{ stream: 'sys', text: t('console.stopped') }])
  }, [append, t])

  // Ctrl/Cmd+S to save, Ctrl/Cmd+Enter to run — muscle memory for older kids.
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key === 's') { event.preventDefault(); save() }
      if (event.key === 'Enter') { event.preventDefault(); run() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, run])

  /* ------------------------------------------------------------ fullscreen
   * Two things happen together: the pane is stretched over the whole app with
   * CSS, and the browser is asked for real fullscreen. The CSS half is what
   * actually matters — native fullscreen is a bonus that some browsers refuse.
   *
   * The iframe element is never moved or re-rendered, only restyled, so a game
   * that is already running keeps running.
   */
  const toggleStageFull = useCallback(() => {
    const next = !stageFull
    setStageFull(next)

    if (next) {
      stagePane.current?.requestFullscreen?.().catch(() => {})
      // The game only receives arrow keys if the frame has focus.
      setTimeout(() => frame.current?.focus(), 60)
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [stageFull])

  // Esc leaves native fullscreen without telling React, so follow the browser.
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setStageFull(false) }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Esc also leaves the CSS-only version, for browsers that refused the real one.
  useEffect(() => {
    if (!stageFull) return
    const onKey = (event) => { if (event.key === 'Escape') setStageFull(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stageFull])

  /* -------------------------------------------------------------- resizing */
  const startResize = (event) => {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = consoleHeight

    const onMove = (move) => {
      const next = Math.min(Math.max(startHeight + (startY - move.clientY), 90), window.innerHeight - 220)
      setConsoleHeight(next)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }


  /* ------------------------------------------------------------- handing in */
  const state = submissionState(project, review)

  const handIn = useCallback(async () => {
    if (!project) return
    setSubmitting(true)
    try {
      // Hand in exactly what is on screen.
      await save(code, title)
      const updated = await submitProject(project.id)
      setProject(updated)
      toast.success(t('submit.done'))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }, [project, toast, t, save, code, title])

  if (loading) return <div className="ws"><LoadingScreen label={t('ws.opening')} /></div>

  const saveLabel = {
    saved: t('ws.saved'),
    dirty: t('ws.dirty'),
    saving: t('ws.savingState'),
    error: t('ws.saveFailed')
  }[saveState]

  return (
    <div className="ws">
      <div className="ws-bar">
        <button className="btn btn-dark btn-sm" onClick={() => navigate('/')}>{t('common.back')}</button>

        <input
          className="ws-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSaveState('dirty') }}
          onBlur={() => save(code, title)}
          aria-label={t('ws.projectName')}
          readOnly={reviewing}
        />

        {reviewing && (
          <span className="badge badge-brand">
            {t('review.viewingWork', { name: owner?.full_name || owner?.email || '…' })}
          </span>
        )}

        {!reviewing && (
          <span className="save-state">
            <span className="dot" style={{ color: saveState === 'error' ? '#ff6b6b' : saveState === 'saved' ? '#51cf66' : '#fab005' }} />
            {saveLabel}
          </span>
        )}

        {!reviewing && state !== 'draft' && (
          <span className={STATE_STYLE[state]}>{t(STATE_KEY[state])}</span>
        )}

        <span style={{ flex: 1 }} />

        <button className="btn btn-ok btn-sm" onClick={run} disabled={running}>{t('ws.run')}</button>
        <button className="btn btn-dark btn-sm" onClick={stop} disabled={!running}>{t('ws.stop')}</button>
        <button className="btn btn-dark btn-sm" onClick={() => setShowLesson((v) => !v)}>
          {showLesson ? t('ws.hideSteps') : t('ws.steps')}
        </button>
        <button className="btn btn-dark btn-sm" onClick={() => downloadText(code, toFilename(title, 'py'))}>
          {t('ws.downloadPy')}
        </button>
        {!reviewing && (
          <button className="btn btn-sm" onClick={() => save()} disabled={saveState === 'saving'}>{t('common.save')}</button>
        )}
        {!reviewing && (
          <button
            className="btn btn-sm"
            style={{ background: '#e6a817', color: '#4a3200' }}
            onClick={handIn}
            disabled={submitting}
            title={t('submit.privateHint')}
          >
            {state === 'failed' ? t('submit.handAgain') : t('submit.hand')}
          </button>
        )}
      </div>

      <div className="ws-body">
        {reviewing ? (
          <ReviewPanel
            project={project}
            owner={owner}
            review={review}
            onReviewed={setReview}
          />
        ) : showLesson && (
          <LessonPanel
            track="python"
            lesson={lesson}
            onClose={() => setShowLesson(false)}
            onPickLesson={(next) => (next?.id ? navigate(`/python/${projectId}?lesson=${next.id}`) : setPickerOpen(true))}
          />
        )}

        {/* Editor + console */}
        <div className="ws-pane" style={{ flex: 1.1 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? '')}
              options={{
                fontSize: 15,
                fontFamily: 'JetBrains Mono, ui-monospace, Consolas, monospace',
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
                renderWhitespace: 'selection',
                padding: { top: 12 },
                lineNumbersMinChars: 3
              }}
            />
          </div>

          <Console
            entries={output}
            running={running}
            height={consoleHeight}
            onResizeStart={startResize}
            onClear={() => setOutput([])}
          />
        </div>

        {/* Game stage */}
        <div
          ref={stagePane}
          className="ws-pane"
          style={stageFull
            ? { position: 'fixed', inset: 0, zIndex: 900, background: 'var(--dark-0)' }
            : { flex: 1, borderLeft: '1px solid var(--dark-3)' }}
        >
          <div className="console-head" style={{ borderBottom: '1px solid var(--dark-3)', borderTop: 0 }}>
            <span>{mode === 'game' ? t('ws.gameStage') : t('ws.consoleStage')}</span>
            <span style={{ flex: 1 }} />

            {stageFull && (
              <>
                <button className="btn btn-ok btn-sm" onClick={run} disabled={running}>{t('ws.run')}</button>
                <button className="btn btn-dark btn-sm" onClick={stop} disabled={!running}>{t('ws.stop')}</button>
              </>
            )}

            <button
              className="btn btn-dark btn-sm"
              onClick={toggleStageFull}
              title={stageFull ? t('ws.exitFullscreenHint') : t('ws.fullscreenHint')}
            >
              {stageFull ? t('ws.exitFullscreen') : t('ws.fullscreen')}
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <iframe
              key={frameKey}
              ref={frame}
              src="/runner.html"
              className="iframe-fill"
              title="Python runner"
            />
          </div>
        </div>
      </div>

      {pickerOpen && (
        <Modal title={t('ws.chooseLesson')} onClose={() => setPickerOpen(false)} wide>
          <div className="grid grid-auto">
            {tracks.python.lessons.map((item) => (
              <button
                key={item.id}
                className="tile"
                onClick={() => { setPickerOpen(false); navigate(`/python/${projectId}?lesson=${item.id}`) }}
              >
                <h3>{pick(item.title)}</h3>
                <p className="small muted mt-2">{pick(item.blurb)}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
