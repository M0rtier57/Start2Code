import { useCallback, useEffect, useMemo, useState } from 'react'

import { Avatar, LoadingScreen, timeAgo, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import { listAllProfiles, setUserRole } from '../lib/api'
import { tracks } from '../curriculum'

/**
 * Admin-only view: who is on the platform and what they are allowed to do.
 * Role changes are additionally enforced in the database by a trigger, so a
 * tampered-with client cannot promote anyone.
 */
export default function AdminPanel() {
  const { user } = useAuth()
  const toast = useToast()

  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      setPeople(await listAllProfiles())
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
      toast.success(`${person.full_name || person.email} is now a ${role}`)
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
        <StatCard label="Students" value={counts.student ?? 0} />
        <StatCard label="Teachers" value={counts.teacher ?? 0} />
        <StatCard label="Admins" value={counts.admin ?? 0} />
        <StatCard label="Lessons available" value={Object.values(tracks).reduce((sum, t) => sum + t.lessons.length, 0)} />
      </div>

      <div className="row mt-6 wrap">
        <input
          placeholder="Search by name or email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="admin">Admins</option>
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
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && <p className="muted center mt-4">Nobody matches that search.</p>}
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
