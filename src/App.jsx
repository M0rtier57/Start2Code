import { NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import CookieNotice from './components/CookieNotice'
import LanguagePicker from './components/LanguagePicker'
import Logo from './components/Logo'
import SiteFooter from './components/SiteFooter'
import { Avatar, LoadingScreen } from './components/ui'
import { useAuth } from './lib/AuthContext'
import { LEGAL_PATHS } from './content/legal'
import { RESET_PATH } from './lib/passwordReset'
import { isConfigured } from './lib/supabaseClient'
import { useI18n } from './i18n'

import AdminPanel from './pages/AdminPanel'
import Dashboard from './pages/Dashboard'
import Legal from './pages/Legal'
import Login from './pages/Login'
import MyData from './pages/MyData'
import NewPassword from './pages/NewPassword'
import PythonWorkspace from './pages/PythonWorkspace'
import ScratchWorkspace from './pages/ScratchWorkspace'
import TeacherDashboard from './pages/TeacherDashboard'

export default function App() {
  const { session, loading } = useAuth()
  const { t } = useI18n()
  const { pathname } = useLocation()

  // Checked before anything touches auth: without credentials every request
  // would fail, and an explanation beats a silently broken login form.
  if (!isConfigured) return <SetupNeeded />

  // A mailed reset link signs the account in on arrival, so this has to be
  // decided before the session check — otherwise the link would drop straight
  // into the dashboard and the forgotten password would stay as it was.
  if (pathname === RESET_PATH) return <NewPassword />
  if (LEGAL_PATHS.includes(pathname)) return <><Legal /><CookieNotice /></>

  if (loading) return <LoadingScreen label={t('common.loading')} />
  if (!session) return <><Login /><CookieNotice /></>

  return (
    <Routes>
      {/* The editors are full-screen and deliberately sit outside the shell. */}
      <Route path="/scratch/:projectId" element={<ScratchWorkspace />} />
      <Route path="/python/:projectId" element={<PythonWorkspace />} />

      <Route element={<Shell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mijn-gegevens" element={<MyData />} />
        <Route path="/classes" element={<RequireRole teacher><TeacherDashboard /></RequireRole>} />
        <Route path="/admin" element={<RequireRole admin><AdminPanel /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Shell() {
  const { displayName, profile, isTeacher, isAdmin, signOut } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <>
      <a className="skip-link" href="#main">{t('nav.skipToContent')}</a>

      <header className="app-header">
        <div className="app-header-inner">
          <button
            className="logo"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
          >
            <Logo /> Start2Code
          </button>

          <nav className="row" style={{ marginLeft: 12 }}>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('nav.myWork')}
            </NavLink>
            {isTeacher && (
              <NavLink to="/classes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {t('nav.classes')}
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>

          <span style={{ flex: 1 }} />

          <div className="row">
            <NavLink
              to="/mijn-gegevens"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t('nav.myData')}
            </NavLink>
            <Avatar name={displayName} />
            <div className="tiny" style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 650 }}>{displayName}</div>
              <div className="muted">{t(`role.${profile?.role ?? 'student'}`)}</div>
            </div>
            <LanguagePicker compact />
            <button className="btn btn-ghost btn-sm" onClick={signOut}>{t('nav.logout')}</button>
          </div>
        </div>
      </header>

      <main id="main"><Outlet /></main>

      <SiteFooter />
      <CookieNotice />
    </>
  )
}

/**
 * Shown when the Supabase environment variables are missing. This is almost
 * always a deployed build whose host has no environment variables set, so it
 * says which ones and where they go rather than just failing.
 */
function SetupNeeded() {
  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ width: 'min(560px, 100%)' }}>
        <div className="logo" style={{ fontSize: '1.2rem' }}>
          <Logo /> Start2Code
        </div>

        <h2 className="mt-4">Almost there — this build has no database yet</h2>
        <p className="muted mt-2">
          The app was built without its Supabase credentials, so it cannot log anyone in.
        </p>

        <p className="small mt-4"><strong>Add these two variables, then build again:</strong></p>
        <pre
          className="mt-2"
          style={{
            background: 'var(--dark-1)', color: 'var(--dark-ink)', padding: 14,
            borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 13, overflowX: 'auto'
          }}
        >{`VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>`}</pre>

        <p className="small muted mt-4">
          On Hostinger they go in your site&rsquo;s environment variable settings; on your own
          machine, in <code>.env.local</code>. Vite reads them at build time, so a rebuild is
          needed after adding them.
        </p>
      </div>
    </div>
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
