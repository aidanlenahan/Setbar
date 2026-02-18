import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Track from './pages/Home'
import Landing from './pages/Landing'
import Exercises from './pages/Exercises'
import WorkoutPlan from './pages/WorkoutPlan'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Preferences from './pages/Preferences'
import Help from './pages/Help'
import './App.css'

const resolveTheme = (theme: string) => (theme === 'dark' ? 'dark' : 'light')

const applyTheme = (theme: string) => {
  const resolved = resolveTheme(theme)
  document.body.classList.toggle('dark-mode', resolved === 'dark')
  document.documentElement.setAttribute('data-theme', resolved)
}

const getStoredPreferences = () => {
  try {
    const raw = localStorage.getItem('nessfitness-preferences')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function AppShell() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('auth_token'))
  const [username, setUsername] = useState<string>('Account')
  const [isTrialMode, setIsTrialMode] = useState<boolean>(() => localStorage.getItem('trial_mode') === 'true')
  const [showTrialNotice, setShowTrialNotice] = useState<boolean>(
    () => localStorage.getItem('trial_notice_dismissed') !== 'true'
  )
  const [showTrialExitModal, setShowTrialExitModal] = useState(false)

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(!!localStorage.getItem('auth_token'))
      setIsTrialMode(localStorage.getItem('trial_mode') === 'true')
      setShowTrialNotice(localStorage.getItem('trial_notice_dismissed') !== 'true')

      const rawUser = localStorage.getItem('auth_user')
      if (!rawUser) {
        setUsername('Account')
        return
      }

      try {
        const parsed = JSON.parse(rawUser)
        setUsername(parsed?.name || 'Account')
      } catch {
        setUsername('Account')
      }
    }

    syncAuthState()
    window.addEventListener('storage', syncAuthState)
    window.addEventListener('auth-changed', syncAuthState)
    window.addEventListener('trial-changed', syncAuthState)

    return () => {
      window.removeEventListener('storage', syncAuthState)
      window.removeEventListener('auth-changed', syncAuthState)
      window.removeEventListener('trial-changed', syncAuthState)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('trial_mode')
    localStorage.removeItem('trial_notice_dismissed')
    localStorage.removeItem('theme_override')
    delete axios.defaults.headers.common.Authorization
    setIsAuthenticated(false)
    window.dispatchEvent(new Event('auth-changed'))
    navigate('/login')
  }

  const handleBrandClick = () => {
    if (isTrialMode && !isAuthenticated) {
      setShowTrialExitModal(true)
      return
    }

    navigate('/')
  }

  const canAccessApp = isAuthenticated || isTrialMode
  const showFullNav = isAuthenticated || isTrialMode
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')
    const themeOverride = localStorage.getItem('theme_override') === 'true'
    const prefs = getStoredPreferences()

    if (themeOverride && storedTheme) {
      applyTheme(storedTheme)
      return
    }

    if (!isAuthenticated && !isTrialMode) {
      localStorage.setItem('theme', 'dark')
      applyTheme('dark')
      return
    }

    if (prefs && typeof prefs.darkMode === 'boolean') {
      const preferredTheme = prefs.darkMode ? 'dark' : 'light'
      localStorage.setItem('theme', preferredTheme)
      applyTheme(preferredTheme)
    } else {
      applyTheme(storedTheme || 'dark')
    }

    const handleThemeToggle = (event: Event) => {
      const detail = (event as CustomEvent).detail as { newState?: string } | undefined
      if (!detail?.newState) return
      const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
      const nextTheme = detail.newState === 'auto'
        ? (currentTheme === 'dark' ? 'light' : 'dark')
        : detail.newState

      localStorage.setItem('theme', nextTheme)
      localStorage.setItem('theme_override', 'true')
      applyTheme(nextTheme)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'theme') {
        applyTheme(event.newValue || 'light')
      }
    }

    document.addEventListener('themeToggle', handleThemeToggle)
    window.addEventListener('storage', handleStorage)

    return () => {
      document.removeEventListener('themeToggle', handleThemeToggle)
      window.removeEventListener('storage', handleStorage)
    }
  }, [isAuthenticated, isTrialMode])

  useEffect(() => {
    if (!isAuthenticated) return

    const loadPreferences = async () => {
      try {
        const response = await axios.get('/api/preferences')
        localStorage.setItem('nessfitness-preferences', JSON.stringify(response.data))
        localStorage.setItem('theme_override', 'false')

        const preferredTheme = response.data.darkMode ? 'dark' : 'light'
        localStorage.setItem('theme', preferredTheme)
        applyTheme(preferredTheme)
        window.dispatchEvent(new Event('preferences-changed'))
      } catch {
        // If preferences fail to load, keep local defaults
      }
    }

    loadPreferences()
  }, [isAuthenticated])

  return (
    <div className="app">
      <nav className="navbar">
        <button type="button" className="nav-brand" onClick={handleBrandClick}>
          NessFitness
        </button>
        <div className="nav-links">
          {showFullNav && (
            <>
              <Link to="/track">Track</Link>
              <Link to="/exercises">Exercises</Link>
              <Link to="/workout-plan">Workout Plan</Link>
              <Link to="/history">History</Link>
            </>
          )}
        </div>

        <div className="nav-auth">
          {isAuthenticated ? (
            <div className="user-menu">
              <button type="button" className="user-menu-trigger">
                {username}
              </button>
              <div className="user-menu-dropdown">
                <Link to="/profile">Edit Profile</Link>
                <Link to="/preferences">Preferences</Link>
                <button type="button" onClick={handleLogout}>Logout</button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="nav-login-link">Login</Link>
          )}
        </div>
      </nav>

      <main className="main-content">
        {isTrialMode && !isAuthenticated && showTrialNotice && (
          <div className="trial-banner" role="status">
            <div>
              <strong>Trial mode</strong> is active. Some customization features are disabled. Log in to unlock everything.
            </div>
            <button
              type="button"
              className="trial-close"
              onClick={() => {
                localStorage.setItem('trial_notice_dismissed', 'true')
                setShowTrialNotice(false)
              }}
            >
              Close
            </button>
          </div>
        )}
        {showTrialExitModal && (
          <div className="trial-exit-overlay" onClick={() => setShowTrialExitModal(false)}>
            <div className="trial-exit-modal" onClick={(event) => event.stopPropagation()}>
              <h2>Exit trial mode?</h2>
              <p>
                Leaving trial mode will take you back to the homepage. You can start a trial again at any time.
              </p>
              <div className="trial-exit-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    localStorage.removeItem('trial_mode')
                    localStorage.removeItem('trial_notice_dismissed')
                    window.dispatchEvent(new Event('trial-changed'))
                    setShowTrialExitModal(false)
                    navigate('/')
                  }}
                >
                  Exit trial
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowTrialExitModal(false)}
                >
                  Stay
                </button>
              </div>
            </div>
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={canAccessApp ? <Navigate to="/track" replace /> : (
              <Landing
                onStartTrial={() => {
                  localStorage.setItem('trial_mode', 'true')
                  localStorage.removeItem('trial_notice_dismissed')
                  window.dispatchEvent(new Event('trial-changed'))
                  navigate('/track')
                }}
              />
            )}
          />
          <Route path="/track" element={canAccessApp ? <Track /> : <Navigate to="/" replace />} />
          <Route path="/exercises" element={canAccessApp ? <Exercises /> : <Navigate to="/" replace />} />
          <Route path="/workout-plan" element={canAccessApp ? <WorkoutPlan /> : <Navigate to="/" replace />} />
          <Route path="/history" element={canAccessApp ? <div className="placeholder">History coming soon...</div> : <Navigate to="/" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={canAccessApp ? <Profile /> : <Navigate to="/" replace />} />
          <Route path="/preferences" element={canAccessApp ? <Preferences /> : <Navigate to="/" replace />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </main>

      <div className="theme-toggle-floating" aria-label="Theme toggle">
        <theme-switch></theme-switch>
      </div>

      <footer className="app-footer">
        <div className="footer-links">
          {showFullNav && (
            <>
              <Link to="/track">Track</Link>
              <Link to="/exercises">Exercises</Link>
              <Link to="/workout-plan">Workout Plan</Link>
              <Link to="/history">History</Link>
            </>
          )}
        </div>

        <div className="footer-meta">
          <span>Copyright {currentYear} NessFitness</span>
          <Link className="footer-feedback" to="/help">Help and Feedback</Link>
          <a className="footer-feedback" href="/login">Login</a>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}

export default App
