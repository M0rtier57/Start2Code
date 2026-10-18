import { useCallback, useEffect, useMemo, useState } from 'react'
import { LabelChip, LabelPickerModal, ManageLabelsModal } from './ProjectLabels'
import { VerdictBadge, reviewCardClass } from './review'
import { Avatar, Empty, KindBadge, LoadingScreen, timeAgo, useToast } from './ui'
import {
  listMyLabels, listProjectLabels, listReviewsFor, listStudentProjects, setLabelOnProjects
} from '../lib/api'
import { useOpenProject } from '../lib/returnTo'
import { STATE_KEY, STATE_STYLE, submissionState } from '../lib/submission'
import { useI18n } from '../i18n'

/** Used by the "status" sort: what needs a teacher's eyes comes first. */
const STATE_RANK = { waiting: 0, failed: 1, 'draft-reviewed': 2, draft: 3, passed: 4 }

const NO_LABEL = 'none'

/**
 * Everything one child has made, with the teacher's own private labels on top.
 *
 * The review queue answers "what is waiting for me?". This answers "what has
 * this child actually done?" — including the blank projects and half-starts
 * that never get handed in, which is exactly the rubbish a teacher wants to
 * label and set aside without deleting a child's work.
 */
export default function StudentProjects({ student, onBack }) {
  const { t } = useI18n()
  const toast = useToast()
  const openProject = useOpenProject()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [reviews, setReviews] = useState(new Map())
  const [labels, setLabels] = useState([])
  const [links, setLinks] = useState(new Map())       // projectId -> Set(labelId)

  const [labelFilter, setLabelFilter] = useState('all')   // all | none | <label id>
  const [kindFilter, setKindFilter] = useState('all')     // all | scratch | python
  const [sort, setSort] = useState('updated')
  const [selected, setSelected] = useState(() => new Set())
  const [bulkLabel, setBulkLabel] = useState('')

  const [pickFor, setPickFor] = useState(null)             // a project
  const [manageOpen, setManageOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const mine = await listStudentProjects(student.id)
      const ids = mine.map((project) => project.id)
      const [labelRows, linkMap, reviewMap] = await Promise.all([
        listMyLabels(), listProjectLabels(ids), listReviewsFor(ids)
      ])
      setProjects(mine)
      setLabels(labelRows)
      setLinks(linkMap)
      setReviews(reviewMap)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [student.id, toast])

  useEffect(() => { load() }, [load])

  /** A project's labels, in the order the teacher's own list has them. */
  const labelsOf = useCallback((project) => (
    labels.filter((label) => links.get(project.id)?.has(label.id))
  ), [labels, links])

  /** How many of this child's projects carry each label (all of them, not the filtered view). */
  const usage = useMemo(() => {
    const counts = new Map()
    links.forEach((set) => set.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)))
    return counts
  }, [links])

  const unlabelledCount = projects.filter((project) => !links.get(project.id)?.size).length

  const stateOf = useCallback(
    (project) => submissionState(project, reviews.get(project.id)),
    [reviews]
  )

  /* ------------------------------------------------------------- the list */
  const visible = useMemo(() => {
    const byTitle = (a, b) => a.title.localeCompare(b.title, 'nl', { numeric: true, sensitivity: 'base' })
    const firstLabel = (project) => labelsOf(project)[0]?.name ?? '￿'   // unlabelled last

    const sorters = {
      updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
      created: (a, b) => b.created_at.localeCompare(a.created_at),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      title: byTitle,
      kind: (a, b) => a.kind.localeCompare(b.kind) || byTitle(a, b),
      status: (a, b) => STATE_RANK[stateOf(a)] - STATE_RANK[stateOf(b)] || byTitle(a, b),
      label: (a, b) => firstLabel(a).localeCompare(firstLabel(b), 'nl') || byTitle(a, b)
    }

    return projects
      .filter((project) => {
        if (kindFilter !== 'all' && project.kind !== kindFilter) return false
        if (labelFilter === 'all') return true
        const set = links.get(project.id)
        return labelFilter === NO_LABEL ? !set?.size : Boolean(set?.has(labelFilter))
      })
      .sort(sorters[sort] ?? sorters.updated)
  }, [projects, links, kindFilter, labelFilter, sort, labelsOf, stateOf])

  // A selection that has since been filtered out must not be acted on: "label
  // these 3" while only 1 of them is on screen is how a wrong project gets tagged.
  const selectedVisible = visible.filter((project) => selected.has(project.id))
  const allSelected = visible.length > 0 && selectedVisible.length === visible.length

  const toggleSelected = (id) => setSelected((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visible.map((p) => p.id)))

  /* ------------------------------------------------------------ mutations */
  const applyLink = useCallback((projectIds, labelId, on) => {
    setLinks((current) => {
      const next = new Map(current)
      projectIds.forEach((id) => {
        const set = new Set(next.get(id) ?? [])
        if (on) set.add(labelId); else set.delete(labelId)
        next.set(id, set)
      })
      return next
    })
  }, [])

  const bulk = async (on) => {
    if (!bulkLabel || selectedVisible.length === 0) return
    const ids = selectedVisible.map((project) => project.id)
    try {
      await setLabelOnProjects(ids, bulkLabel, on)
      applyLink(ids, bulkLabel, on)
      toast.success(t(on ? 'sp.bulkAdded' : 'sp.bulkRemoved', { count: ids.length }))
      setSelected(new Set())
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (loading) return <div className="mt-6"><LoadingScreen label={t('common.loading')} /></div>

  const name = student.full_name || student.email
  const handedIn = projects.filter((project) => project.submitted_at).length

  return (
    <div>
      <button className="btn btn-quiet btn-sm" onClick={onBack}>{t('sp.back')}</button>

      <div className="card row-between wrap mt-2">
        <div className="row">
          <Avatar name={name} />
          <div>
            <h2>{name}</h2>
            <p className="small muted mt-2">
              {t('sp.summary', { total: projects.length, handedIn })}
            </p>
          </div>
        </div>
        <p className="tiny muted" style={{ maxWidth: 320 }}>🔒 {t('lbl.private')}</p>
      </div>

      {projects.length === 0 ? (
        <div className="mt-6">
          <Empty emoji="🪹" title={t('sp.empty')}>{t('sp.emptySub')}</Empty>
        </div>
      ) : (
        <>
          {/* ------------------------------------------------- label filter */}
          <div className="row wrap mt-4" style={{ gap: 8 }} role="group" aria-label={t('sp.filterLabels')}>
            <button
              className={`btn btn-sm ${labelFilter === 'all' ? '' : 'btn-ghost'}`}
              aria-pressed={labelFilter === 'all'}
              onClick={() => setLabelFilter('all')}
            >
              {t('sp.all')} ({projects.length})
            </button>

            {labels.map((label) => (
              <button
                key={label.id}
                className={`label-filter label-chip-${label.color} ${labelFilter === label.id ? 'on' : ''}`}
                aria-pressed={labelFilter === label.id}
                onClick={() => setLabelFilter(labelFilter === label.id ? 'all' : label.id)}
              >
                {label.name} ({usage.get(label.id) ?? 0})
              </button>
            ))}

            <button
              className={`label-filter label-chip-grey ${labelFilter === NO_LABEL ? 'on' : ''}`}
              aria-pressed={labelFilter === NO_LABEL}
              onClick={() => setLabelFilter(labelFilter === NO_LABEL ? 'all' : NO_LABEL)}
            >
              {t('sp.noLabel')} ({unlabelledCount})
            </button>

            <button className="btn btn-quiet btn-sm" onClick={() => setManageOpen(true)}>
              🏷 {t('lbl.manage')}
            </button>
          </div>

          {/* ---------------------------------------------- kind + sort row */}
          <div className="row wrap mt-4" style={{ gap: 12 }}>
            <label className="row" style={{ gap: 8 }}>
              <span className="small muted">{t('sp.sortBy')}</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} style={{ width: 'auto' }}>
                {['updated', 'created', 'oldest', 'title', 'kind', 'status', 'label'].map((id) => (
                  <option key={id} value={id}>{t(`sp.sort.${id}`)}</option>
                ))}
              </select>
            </label>

            <label className="row" style={{ gap: 8 }}>
              <span className="small muted">{t('sp.kind')}</span>
              <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} style={{ width: 'auto' }}>
                <option value="all">{t('sp.all')}</option>
                <option value="scratch">Scratch</option>
                <option value="python">Python</option>
              </select>
            </label>

            <label className="consent" style={{ marginLeft: 'auto' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span className="small">{t('sp.selectAll', { count: visible.length })}</span>
            </label>
          </div>

          {/* ------------------------------------------------- bulk actions */}
          {selectedVisible.length > 0 && (
            <div className="card card-flat row wrap mt-4" style={{ gap: 10, background: 'var(--accent-wash)' }}>
              <strong className="small">{t('sp.selected', { count: selectedVisible.length })}</strong>

              {labels.length === 0 ? (
                <button className="btn btn-sm" onClick={() => setManageOpen(true)}>{t('lbl.makeFirst')}</button>
              ) : (
                <>
                  <select
                    value={bulkLabel}
                    onChange={(event) => setBulkLabel(event.target.value)}
                    aria-label={t('sp.pickLabel')}
                    style={{ width: 'auto' }}
                  >
                    <option value="">{t('sp.pickLabel')}</option>
                    {labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}
                  </select>
                  <button className="btn btn-sm" disabled={!bulkLabel} onClick={() => bulk(true)}>
                    {t('sp.add')}
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled={!bulkLabel} onClick={() => bulk(false)}>
                    {t('sp.remove')}
                  </button>
                </>
              )}

              <button className="btn btn-quiet btn-sm" onClick={() => setSelected(new Set())}>
                {t('sp.clear')}
              </button>
            </div>
          )}

          {visible.length === 0 && (
            <div className="mt-6"><Empty emoji="🔍" title={t('sp.noMatch')}>{t('sp.noMatchSub')}</Empty></div>
          )}

          {/* ------------------------------------------------------ the cards */}
          <div className="grid grid-auto mt-4">
            {visible.map((project) => {
              const review = reviews.get(project.id)
              const state = stateOf(project)
              const mine = labelsOf(project)

              return (
                <div key={project.id} className={`card ${reviewCardClass(review)}`}>
                  <div className="row-between">
                    <KindBadge kind={project.kind} />
                    <input
                      type="checkbox"
                      className="card-check"
                      checked={selected.has(project.id)}
                      onChange={() => toggleSelected(project.id)}
                      aria-label={t('sp.selectOne', { title: project.title })}
                    />
                  </div>

                  <h3 className="mt-4">{project.title}</h3>
                  <p className="tiny muted mt-2">
                    {t('sp.edited', { when: timeAgo(project.updated_at) })}
                    {' · '}
                    {t('sp.created', { date: new Date(project.created_at).toLocaleDateString() })}
                  </p>

                  <div className="row mt-2 wrap">
                    {/* Passed and failed are already said by the verdict badge. */}
                    {state !== 'passed' && state !== 'failed' && (
                      <span className={STATE_STYLE[state]}>{t(STATE_KEY[state])}</span>
                    )}
                    {review && <VerdictBadge review={review} />}
                    {review?.score != null && <span className="score-pill">{review.score}</span>}
                  </div>

                  <div className="row mt-4 wrap" style={{ gap: 6, minHeight: 28 }}>
                    {mine.map((label) => (
                      <LabelChip
                        key={label.id}
                        label={label}
                        onRemove={async () => {
                          try {
                            await setLabelOnProjects([project.id], label.id, false)
                            applyLink([project.id], label.id, false)
                          } catch (error) {
                            toast.error(error.message)
                          }
                        }}
                      />
                    ))}
                    <button className="label-add" onClick={() => setPickFor(project)}>
                      + {t('sp.label')}
                    </button>
                  </div>

                  <button
                    className="btn btn-ghost btn-block btn-sm mt-4"
                    onClick={() => openProject(project)}
                  >
                    {t('sp.open')}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {pickFor && (
        <LabelPickerModal
          project={pickFor}
          labels={labels}
          active={links.get(pickFor.id) ?? new Set()}
          onToggle={(projectId, labelId, on) => applyLink([projectId], labelId, on)}
          onLabelCreated={(label) => setLabels((current) => [...current, label].sort(
            (a, b) => a.name.localeCompare(b.name, 'nl')
          ))}
          onClose={() => setPickFor(null)}
        />
      )}

      {manageOpen && (
        <ManageLabelsModal
          labels={labels}
          usage={usage}
          onChanged={(saved) => setLabels((current) => current.map((l) => (l.id === saved.id ? saved : l)))}
          onCreated={(label) => setLabels((current) => [...current, label].sort(
            (a, b) => a.name.localeCompare(b.name, 'nl')
          ))}
          onDeleted={(id) => {
            setLabels((current) => current.filter((l) => l.id !== id))
            setLinks((current) => {
              const next = new Map()
              current.forEach((set, projectId) => {
                const copy = new Set(set)
                copy.delete(id)
                next.set(projectId, copy)
              })
              return next
            })
            if (labelFilter === id) setLabelFilter('all')
            if (bulkLabel === id) setBulkLabel('')
          }}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  )
}
