import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Home from './pages/Home'
import Exercises from './pages/Exercises'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Preferences from './pages/Preferences'
import './App.css'

function AppShell() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('auth_token'))
  const [username, setUsername] = useState<string>('Account')

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(!!localStorage.getItem('auth_token'))

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

    return () => {
      window.removeEventListener('storage', syncAuthState)
      window.removeEventListener('auth-changed', syncAuthState)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    delete axios.defaults.headers.common.Authorization
    setIsAuthenticated(false)
    window.dispatchEvent(new Event('auth-changed'))
    navigate('/login')
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">🏋️ NessFitness</div>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/exercises">Exercises</Link>
          <Link to="/history">History</Link>
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/history" element={<div className="placeholder">History coming soon...</div>} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/preferences" element={<Preferences />} />
        </Routes>
      </main>
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
