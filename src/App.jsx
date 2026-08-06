import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'

import { Avatar, LoadingScreen } from './components/ui'
import { useAuth } from './lib/AuthContext'

import AdminPanel from './pages/AdminPanel'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import PythonWorkspace from './pages/PythonWorkspace'
import ScratchWorkspace from './pages/ScratchWorkspace'
import TeacherDashboard from './pages/TeacherDashboard'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen label="Getting things ready…" />
  if (!session) return <Login />

  return (
    <Routes>
      {/* The editors are full-screen and deliberately sit outside the shell. */}
      <Route path="/scratch/:projectId" element={<ScratchWorkspace />} />
      <Route path="/python/:projectId" element={<PythonWorkspace />} />

      <Route element={<Shell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/classes" element={<RequireRole teacher><TeacherDashboard /></RequireRole>} />
        <Route path="/admin" element={<RequireRole admin><AdminPanel /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Shell() {
  const { displayName, profile, isTeacher, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <button
            className="logo"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
          >
            <span className="logo-mark">&lt;/&gt;</span> Start2Code
          </button>

          <nav className="row" style={{ marginLeft: 12 }}>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              My work
            </NavLink>
            {isTeacher && (
              <NavLink to="/classes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Classes
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Admin
              </NavLink>
            )}
          </nav>

          <span style={{ flex: 1 }} />

          <div className="row">
            <Avatar name={displayName} />
            <div className="tiny" style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 650 }}>{displayName}</div>
              <div className="muted">{profile?.role ?? 'student'}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Log out</button>
          </div>
        </div>
      </header>

      <main><Outlet /></main>
    </>
  )
}

/** Sends anyone without the right role back to their own dashboard. */
function RequireRole({ children, teacher = false, admin = false }) {
  const { isTeacher, isAdmin, profile } = useAuth()

  // Wait for the profile before deciding — otherwise a slow load looks like a
  // permission failure and bounces the user.
  if (!profile) return <LoadingScreen />
  if (admin && !isAdmin) return <Navigate to="/" replace />
  if (teacher && !isTeacher) return <Navigate to="/" replace />
  return children
}
