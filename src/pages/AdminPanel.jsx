import { useCallback, useEffect, useMemo, useState } from 'react'

import LessonsManager from '../components/LessonsManager'
import { Avatar, LoadingScreen, timeAgo, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import { listAllProfiles, listMyClasses, setUserRole } from '../lib/api'
import { useCurriculum } from '../lib/CurriculumContext'
import { ROLES, roleLabel } from '../lib/roles'
import { useI18n } from '../i18n'

/**
 * Admin-only view: who is on the platform and what they are allowed to do.
 * Role changes are additionally enforced in the database by a trigger, so a
 * tampered-with client cannot promote anyone.
 */
export default function AdminPanel() {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  const { tracks } = useCurriculum()

  const [people, setPeople] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [section, setSection] = useState('people')   // people | lessons

  const load = useCallback(async () => {
    try {
      const [profiles, classRows] = await Promise.all([listAllProfiles(), listMyClasses()])
      setPeople(profiles)
      setClasses(classRows)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const changeRole = async (person, role) => {
    const previous = people
    // Optimistic: the list should feel instant, and we roll back on failure.
    setPeople((current) => current.map((p) => (p.id === person.id ? { ...p, role } : p)))
    try {
      await setUserRole(person.id, role)
      toast.success(`${person.full_name || person.email} is now a ${roleLabel(t, role)}`)
    } catch (error) {
      setPeople(previous)
      toast.error(error.message)
    }
  }

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return people.filter((person) => {
      if (roleFilter !== 'all' && person.role !== roleFilter) return false
      if (!needle) return true
      return `${person.full_name ?? ''} ${person.email ?? ''}`.toLowerCase().includes(needle)
    })
  }, [people, filter, roleFilter])

  if (loading) return <LoadingScreen label="Loading users…" />

  const counts = people.reduce((acc, person) => {
    acc[person.role] = (acc[person.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="page">
      <h1>Administration</h1>
      <p className="muted mt-2">Manage who can teach and who can administer Start2Code.</p>

      <div className="grid mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        {ROLES.map((role) => (
          <StatCard
            key={role.id}
            label={roleLabel(t, role.id, { plural: true, capital: true })}
            value={counts[role.id] ?? 0}
          />
        ))}
        <StatCard
          label="Lessons available"
          value={Object.values(tracks).reduce((sum, track) => sum + track.lessons.length, 0)}
        />
      </div>

      <div className="tabs mt-6">
        <button className={`tab ${section === 'people' ? 'active' : ''}`} onClick={() => setSection('people')}>
          People
        </button>
        <button className={`tab ${section === 'lessons' ? 'active' : ''}`} onClick={() => setSection('lessons')}>
          Lessons
        </button>
      </div>

      {section === 'lessons' && <LessonsManager classes={classes} />}

      {section === 'people' && (
      <>
      <div className="row wrap">
        <input
          placeholder="Search by name or email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="all">All roles</option>
          {ROLES.map((role) => (
            <option key={role.id} value={role.id}>
              {roleLabel(t, role.id, { plural: true, capital: true })}
            </option>
          ))}
        </select>
      </div>

      <div className="card card-pad-0 table-scroll mt-4">
        <table className="table">
          <thead>
            <tr><th>Person</th><th>Joined</th><th style={{ width: 200 }}>Role</th></tr>
          </thead>
          <tbody>
            {visible.map((person) => (
              <tr key={person.id}>
                <td>
                  <div className="row">
                    <Avatar name={person.full_name || person.email} />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {person.full_name || '—'}
                        {person.id === user.id && <span className="badge badge-brand" style={{ marginLeft: 8 }}>you</span>}
                      </div>
                      <div className="tiny muted">{person.email}</div>
                    </div>
                  </div>
                </td>
                <td className="small muted">{timeAgo(person.created_at)}</td>
                <td>
                  <select
                    value={person.role}
                    disabled={person.id === user.id}
                    title={person.id === user.id ? 'You cannot change your own role' : undefined}
                    onChange={(e) => changeRole(person, e.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {roleLabel(t, role.id, { capital: true })}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && <p className="muted center mt-4">Nobody matches that search.</p>}
      </>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="tiny muted">{label}</p>
      <p style={{ fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</p>
    </div>
  )
}
