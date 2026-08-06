import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'

import Console from '../components/Console'
import LessonPanel from '../components/LessonPanel'
import { LoadingScreen, Modal, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import { getProject, logActivity, renameProject, savePythonCode } from '../lib/api'
import { downloadText, toFilename } from '../lib/download'
import { getLesson, pythonLessons } from '../curriculum'

const AUTOSAVE_DELAY = 2500

export default function PythonWorkspace() {
  const { projectId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

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

  const frame = useRef(null)
  const pendingRun = useRef(null)     // code waiting for a fresh frame to boot
  const savedCode = useRef('')

  const lesson = useMemo(
    () => getLesson('python', project?.lesson_id ?? params.get('lesson')),
    [project?.lesson_id, params]
  )

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
    if (!project) return
    setSaveState('saving')
    try {
      await savePythonCode(project.id, nextCode)
      if (nextTitle !== project.title) await renameProject(project.id, nextTitle)
      savedCode.current = nextCode
      setSaveState('saved')
      logActivity(user?.id, 'project_saved', { project_id: project.id, kind: 'python' })
    } catch (error) {
      setSaveState('error')
      toast.error(`Could not save: ${error.message}`)
    }
  }, [project, code, title, user, toast])

  // Autosave after a pause in typing, so nothing is ever lost at the bell.
  useEffect(() => {
    if (!project || code === savedCode.current) return
    setSaveState('dirty')
    const timer = setTimeout(() => save(code, title), AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [code, title, project, save])

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const handler = (event) => {
      if (savedCode.current !== code) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [code])

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
          append([{ stream: 'sys', text: data.ok ? '\n▸ Program finished.\n' : '\n▸ Program stopped because of an error.\n' }])
          break
        case 'needs-reload':
          break
        default:
          break
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [append])

  const run = useCallback(() => {
    setOutput([{ stream: 'sys', text: `▸ Running your ${mode === 'game' ? 'game' : 'program'}…\n` }])
    setRunning(true)

    // Pyodide has no clean way to abort a running program, so each run gets a
    // brand new frame. Remounting the iframe is the reset.
    pendingRun.current = { code, mode }
    setFrameKey((key) => key + 1)

    if (project && code !== savedCode.current) save(code, title)
    logActivity(user?.id, 'code_run', { project_id: project?.id, mode })
  }, [code, mode, project, save, title, user])

  const stop = useCallback(() => {
    pendingRun.current = null
    setFrameKey((key) => key + 1)
    setRunning(false)
    append([{ stream: 'sys', text: '\n▸ Stopped.\n' }])
  }, [append])

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

  if (loading) return <div className="ws"><LoadingScreen label="Opening your project…" /></div>

  const saveLabel = {
    saved: 'All changes saved',
    dirty: 'Unsaved changes',
    saving: 'Saving…',
    error: 'Save failed'
  }[saveState]

  return (
    <div className="ws">
      <div className="ws-bar">
        <button className="btn btn-dark btn-sm" onClick={() => navigate('/')}>← My projects</button>

        <input
          className="ws-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSaveState('dirty') }}
          onBlur={() => save(code, title)}
          aria-label="Project name"
        />

        <span className="save-state">
          <span className="dot" style={{ color: saveState === 'error' ? '#ff6b6b' : saveState === 'saved' ? '#51cf66' : '#fab005' }} />
          {saveLabel}
        </span>

        <span style={{ flex: 1 }} />

        <button className="btn btn-ok btn-sm" onClick={run} disabled={running}>▶ Run</button>
        <button className="btn btn-dark btn-sm" onClick={stop} disabled={!running}>■ Stop</button>
        <button className="btn btn-dark btn-sm" onClick={() => setShowLesson((v) => !v)}>
          {showLesson ? 'Hide steps' : '📋 Steps'}
        </button>
        <button className="btn btn-dark btn-sm" onClick={() => downloadText(code, toFilename(title, 'py'))}>
          ⬇ Download .py
        </button>
        <button className="btn btn-sm" onClick={() => save()} disabled={saveState === 'saving'}>Save</button>
      </div>

      <div className="ws-body">
        {showLesson && (
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
        <div className="ws-pane" style={{ flex: 1, borderLeft: '1px solid var(--dark-3)' }}>
          <div className="console-head" style={{ borderBottom: '1px solid var(--dark-3)', borderTop: 0 }}>
            <span>{mode === 'game' ? 'Game stage' : 'Stage (console mode)'}</span>
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
        <Modal title="Choose a lesson" onClose={() => setPickerOpen(false)} wide>
          <div className="grid grid-auto">
            {pythonLessons.map((item) => (
              <button
                key={item.id}
                className="tile"
                onClick={() => { setPickerOpen(false); navigate(`/python/${projectId}?lesson=${item.id}`) }}
              >
                <h3>{item.title}</h3>
                <p className="small muted mt-2">{item.blurb}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
