import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import LessonPanel from '../components/LessonPanel'
import { LoadingScreen, Modal, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import {
  downloadScratchFile, getProject, logActivity, renameProject, saveScratchFile
} from '../lib/api'
import { downloadBlob, pickFile, toFilename } from '../lib/download'
import { useCurriculum } from '../lib/CurriculumContext'

/** Waits for a reply to one request on the bridge. */
function requestFromFrame(frame, message, expectType, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2)

    const onMessage = (event) => {
      const data = event.data
      if (!data || data.source !== 's2c-scratch') return
      if (data.requestId && data.requestId !== requestId) return

      if (data.type === expectType) { cleanup(); resolve(data) }
      else if (data.type === 'error') { cleanup(); reject(new Error(data.message)) }
    }

    const timer = setTimeout(() => { cleanup(); reject(new Error('The editor did not respond in time.')) }, timeout)
    function cleanup() { clearTimeout(timer); window.removeEventListener('message', onMessage) }

    window.addEventListener('message', onMessage)
    frame.contentWindow?.postMessage({ ...message, source: 's2c', requestId }, '*')
  })
}

export default function ScratchWorkspace() {
  const { projectId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { getLesson, tracks } = useCurriculum()

  const [project, setProject] = useState(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [editorReady, setEditorReady] = useState(false)
  const [saveState, setSaveState] = useState('saved')
  const [showLesson, setShowLesson] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  const frame = useRef(null)
  const dirty = useRef(false)

  const lesson = useMemo(
    () => getLesson('scratch', project?.lesson_id ?? params.get('lesson')),
    // getLesson changes identity once the custom lessons have loaded; without
    // it here, a database lesson would never show up in the panel.
    [getLesson, project?.lesson_id, params]
  )

  /* ------------------------------------------------------------------ load */
  useEffect(() => {
    let active = true
    getProject(projectId)
      .then((row) => {
        if (!active) return
        setProject(row)
        setTitle(row.title)
      })
      .catch((error) => { toast.error(error.message); navigate('/') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId])   // eslint-disable-line react-hooks/exhaustive-deps

  /* --------------------------------------------------- bridge from the frame */
  useEffect(() => {
    const onMessage = async (event) => {
      const data = event.data
      if (!data || data.source !== 's2c-scratch') return

      if (data.type === 'ready') {
        setEditorReady(true)
        // Restore saved work as soon as the VM exists.
        if (project?.storage_path) {
          try {
            const blob = await downloadScratchFile(project.storage_path)
            const buffer = await blob.arrayBuffer()
            frame.current?.contentWindow?.postMessage(
              { source: 's2c', type: 'load-sb3', buffer }, '*', [buffer]
            )
          } catch (error) {
            toast.error(`Could not open your saved project: ${error.message}`)
          }
        }
      }

      if (data.type === 'dirty' && !dirty.current) {
        dirty.current = true
        setSaveState('dirty')
      }

      if (data.type === 'loaded') {
        dirty.current = false
        setSaveState('saved')
      }

      if (data.type === 'error' && !data.requestId) {
        toast.error(data.message)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [project, toast])

  /* ------------------------------------------------------------------ save */
  const exportSb3 = useCallback(async () => {
    if (!frame.current) throw new Error('The editor is not ready yet.')
    const reply = await requestFromFrame(frame.current, { type: 'export-sb3' }, 'sb3')
    return new Blob([reply.buffer], { type: 'application/x.scratch.sb3' })
  }, [])

  const save = useCallback(async () => {
    if (!project || !editorReady) return
    setSaveState('saving')
    try {
      const blob = await exportSb3()
      await saveScratchFile(project, user.id, blob)
      if (title !== project.title) await renameProject(project.id, title)
      dirty.current = false
      setSaveState('saved')
      toast.success('Project saved')
      logActivity(user?.id, 'project_saved', { project_id: project.id, kind: 'scratch' })
    } catch (error) {
      setSaveState('error')
      toast.error(`Could not save: ${error.message}`)
    }
  }, [project, editorReady, exportSb3, user, title, toast])

  const download = useCallback(async () => {
    try {
      const blob = await exportSb3()
      downloadBlob(blob, toFilename(title, 'sb3'))
      toast.success('Downloaded — open it at scratch.mit.edu or here again later.')
    } catch (error) {
      toast.error(error.message)
    }
  }, [exportSb3, title, toast])

  const upload = useCallback(async () => {
    const file = await pickFile('.sb3')
    if (!file) return
    const buffer = await file.arrayBuffer()
    frame.current?.contentWindow?.postMessage({ source: 's2c', type: 'load-sb3', buffer }, '*', [buffer])
    toast.success('Project loaded')
  }, [toast])

  // Autosave every couple of minutes; children forget, and the bell does not.
  useEffect(() => {
    const timer = setInterval(() => { if (dirty.current) save() }, 120_000)
    return () => clearInterval(timer)
  }, [save])

  useEffect(() => {
    const handler = (event) => { if (dirty.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); save() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  if (loading) return <div className="ws"><LoadingScreen label="Opening your project…" /></div>

  const saveLabel = {
    saved: editorReady ? 'All changes saved' : 'Loading editor…',
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
          onChange={(e) => { setTitle(e.target.value); setSaveState('dirty'); dirty.current = true }}
          aria-label="Project name"
        />

        <span className="save-state">
          <span className="dot" style={{ color: saveState === 'error' ? '#ff6b6b' : saveState === 'saved' ? '#51cf66' : '#fab005' }} />
          {saveLabel}
        </span>

        <span style={{ flex: 1 }} />

        <button className="btn btn-dark btn-sm" onClick={() => setShowLesson((v) => !v)}>
          {showLesson ? 'Hide steps' : '📋 Steps'}
        </button>
        <button className="btn btn-dark btn-sm" onClick={upload} disabled={!editorReady}>⬆ Open .sb3</button>
        <button className="btn btn-dark btn-sm" onClick={download} disabled={!editorReady}>⬇ Download .sb3</button>
        <button className="btn btn-sm" onClick={save} disabled={!editorReady || saveState === 'saving'}>Save</button>
      </div>

      <div className="ws-body">
        {showLesson && (
          <LessonPanel
            track="scratch"
            lesson={lesson}
            onClose={() => setShowLesson(false)}
            onPickLesson={(next) => (next?.id ? navigate(`/scratch/${projectId}?lesson=${next.id}`) : setPickerOpen(true))}
          />
        )}

        <div className="ws-pane grow" style={{ flex: 1, position: 'relative' }}>
          {!editorReady && (
            <div className="loading-screen" style={{ position: 'absolute', inset: 0, background: 'var(--dark-0)', zIndex: 2 }}>
              <div className="spinner spinner-lg" />
              <p className="muted">Starting the block editor…</p>
            </div>
          )}
          <iframe
            ref={frame}
            src="/scratch.html"
            className="iframe-fill"
            title="Scratch editor"
            allow="autoplay; microphone; camera"
          />
        </div>
      </div>

      {pickerOpen && (
        <Modal title="Choose a lesson" onClose={() => setPickerOpen(false)} wide>
          <div className="grid grid-auto">
            {tracks.scratch.lessons.map((item) => (
              <button
                key={item.id}
                className="tile"
                onClick={() => { setPickerOpen(false); navigate(`/scratch/${projectId}?lesson=${item.id}`) }}
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
