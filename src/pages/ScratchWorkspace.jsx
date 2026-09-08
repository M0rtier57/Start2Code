import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import LessonPanel from '../components/LessonPanel'
import ReviewPanel from '../components/review'
import { LoadingScreen, Modal, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import {
  downloadScratchFile, getProfile, getProject, getReview, lessonStarterUrl, logActivity,
  renameProject, saveScratchFile, submitProject
} from '../lib/api'
import { STATE_KEY, STATE_STYLE, submissionState } from '../lib/submission'
import { downloadBlob, pickFile, toFilename } from '../lib/download'
import { useCurriculum } from '../lib/CurriculumContext'
import { useI18n } from '../i18n'

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
  const { user, isTeacher } = useAuth()
  const toast = useToast()
  const { getLesson, tracks, loading: curriculumLoading } = useCurriculum()
  const { t, pick } = useI18n()

  const [project, setProject] = useState(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [editorReady, setEditorReady] = useState(false)
  const [saveState, setSaveState] = useState('saved')
  const [showLesson, setShowLesson] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Only used when a teacher opens someone else's work to mark it.
  const [owner, setOwner] = useState(null)
  const [review, setReview] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const frame = useRef(null)
  const dirty = useRef(false)
  const contentLoaded = useRef(false)   // guards against loading twice

  // A teacher opening a child's project is marking it, not editing it. Saving
  // is blocked by row level security anyway; this stops the app from trying,
  // and swaps the lesson steps for the marking panel.
  const reviewing = Boolean(project && user && project.owner_id !== user.id && isTeacher)

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

        getReview(row.id).then(setReview).catch(() => {})
        if (user && row.owner_id !== user.id) {
          getProfile(row.owner_id).then(setOwner).catch(() => {})
        }
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

      if (data.type === 'ready') setEditorReady(true)

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

  /* --------------------------------------------------------- initial content
   * Runs once the editor is up *and* the project and curriculum have loaded.
   * Doing this on the 'ready' message alone would race: the VM often reports
   * ready before the lesson is known, and the starting project would be skipped.
   */
  useEffect(() => {
    if (!editorReady || contentLoaded.current || !project) return
    if (curriculumLoading) return   // wait until we know whether a starter exists

    contentLoaded.current = true

    const send = (buffer) => frame.current?.contentWindow?.postMessage(
      { source: 's2c', type: 'load-sb3', buffer }, '*', [buffer]
    )

    ;(async () => {
      // Saved work always wins. Only a project that has never been saved falls
      // back to the lesson's starting project, so a child's own work can never
      // be overwritten by the template.
      if (project.storage_path) {
        try {
          const blob = await downloadScratchFile(project.storage_path)
          send(await blob.arrayBuffer())
        } catch (error) {
          toast.error(t('ws.openFailed', { error: error.message }))
        }
        return
      }

      if (lesson?.starterPath) {
        try {
          const response = await fetch(lessonStarterUrl(lesson.starterPath))
          if (!response.ok) throw new Error(`status ${response.status}`)
          send(await response.arrayBuffer())
        } catch (error) {
          // Not fatal — the child simply starts from the empty stage.
          console.warn('Could not load the lesson starter project:', error.message)
          toast.error(t('ws.starterFailed'))
        }
      }
    })()
  }, [editorReady, project, lesson, curriculumLoading, toast, t])

  /* ------------------------------------------------------------------ save */
  const exportSb3 = useCallback(async () => {
    if (!frame.current) throw new Error('The editor is not ready yet.')
    const reply = await requestFromFrame(frame.current, { type: 'export-sb3' }, 'sb3')
    return new Blob([reply.buffer], { type: 'application/x.scratch.sb3' })
  }, [])

  const save = useCallback(async () => {
    if (!project || !editorReady || reviewing) return
    setSaveState('saving')
    try {
      const blob = await exportSb3()
      await saveScratchFile(project, user.id, blob)
      if (title !== project.title) await renameProject(project.id, title)
      dirty.current = false
      setSaveState('saved')
      toast.success(t('ws.projectSaved'))
      logActivity(user?.id, 'project_saved', { project_id: project.id, kind: 'scratch' })
    } catch (error) {
      setSaveState('error')
      toast.error(t('ws.saveError', { error: error.message }))
    }
  }, [project, editorReady, exportSb3, user, title, toast, t, reviewing])

  const download = useCallback(async () => {
    try {
      const blob = await exportSb3()
      downloadBlob(blob, toFilename(title, 'sb3'))
      toast.success(t('ws.downloaded'))
    } catch (error) {
      toast.error(error.message)
    }
  }, [exportSb3, title, toast, t])

  const upload = useCallback(async () => {
    const file = await pickFile('.sb3')
    if (!file) return
    const buffer = await file.arrayBuffer()
    frame.current?.contentWindow?.postMessage({ source: 's2c', type: 'load-sb3', buffer }, '*', [buffer])
    toast.success(t('ws.projectLoaded'))
  }, [toast, t])

  /*
   * Autosave every five minutes; children forget, and the bell does not.
   *
   * Each save uploads the whole .sb3 — sprites and sounds included — so a class
   * of thirty moves real traffic. Five minutes keeps that in hand, and little
   * is at risk: work is also saved on hand-in, and closing the tab warns first.
   */
  useEffect(() => {
    const timer = setInterval(() => { if (dirty.current && !reviewing) save() }, 300_000)
    return () => clearInterval(timer)
  }, [save, reviewing])

  useEffect(() => {
    const handler = (event) => { if (dirty.current && !reviewing) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [reviewing])

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); save() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])


  /* ------------------------------------------------------------- handing in */
  const state = submissionState(project, review)

  const handIn = useCallback(async () => {
    if (!project) return
    setSubmitting(true)
    try {
      // Save the current blocks first, so the teacher marks what the
      // child actually sees.
      await save()
      const updated = await submitProject(project.id)
      setProject(updated)
      toast.success(t('submit.done'))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }, [project, toast, t, save])

  if (loading) return <div className="ws"><LoadingScreen label={t('ws.opening')} /></div>

  const saveLabel = {
    saved: editorReady ? t('ws.saved') : t('ws.loadingEditor'),
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
          onChange={(e) => { setTitle(e.target.value); setSaveState('dirty'); dirty.current = true }}
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

        <button className="btn btn-dark btn-sm" onClick={() => setShowLesson((v) => !v)}>
          {showLesson ? t('ws.hideSteps') : t('ws.steps')}
        </button>
        <button className="btn btn-dark btn-sm" onClick={upload} disabled={!editorReady}>{t('ws.openSb3')}</button>
        <button className="btn btn-dark btn-sm" onClick={download} disabled={!editorReady}>{t('ws.downloadSb3')}</button>
        {!reviewing && (
          <button className="btn btn-sm" onClick={save} disabled={!editorReady || saveState === 'saving'}>{t('common.save')}</button>
        )}
        {!reviewing && (
          <button
            className="btn btn-sm"
            style={{ background: '#e6a817', color: '#4a3200' }}
            onClick={handIn}
            disabled={submitting || !editorReady}
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
            track="scratch"
            lesson={lesson}
            review={review}
            onClose={() => setShowLesson(false)}
            onPickLesson={(next) => (next?.id ? navigate(`/scratch/${projectId}?lesson=${next.id}`) : setPickerOpen(true))}
          />
        )}

        <div className="ws-pane grow" style={{ flex: 1, position: 'relative' }}>
          {!editorReady && (
            <div className="loading-screen" style={{ position: 'absolute', inset: 0, background: 'var(--dark-0)', zIndex: 2 }}>
              <div className="spinner spinner-lg" />
              <p className="muted">{t('ws.startingEditor')}</p>
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
        <Modal title={t('ws.chooseLesson')} onClose={() => setPickerOpen(false)} wide>
          <div className="grid grid-auto">
            {tracks.scratch.lessons.map((item) => (
              <button
                key={item.id}
                className="tile"
                onClick={() => { setPickerOpen(false); navigate(`/scratch/${projectId}?lesson=${item.id}`) }}
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
