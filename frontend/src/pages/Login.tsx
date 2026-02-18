import { useEffect, useState } from 'react'
import type { FormEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      navigate('/track')
    }
  }, [navigate])

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload = mode === 'login'
        ? { email, password }
        : { username, email, password }

      const response = await axios.post(endpoint, payload)
      const token = response.data.access_token

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify({
        id: response.data.user_id,
        email: response.data.email,
        name: response.data.name,
      }))
      localStorage.removeItem('trial_mode')
      localStorage.removeItem('trial_notice_dismissed')
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      window.dispatchEvent(new Event('auth-changed'))
      window.dispatchEvent(new Event('trial-changed'))

      navigate('/track')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <p className="login-eyebrow">Welcome</p>
          <h1>{mode === 'login' ? 'Sign in to NessFitness' : 'Create your account'}</h1>
          <p className="login-subtitle">
            Log sessions, track progress, and keep your training consistent.
          </p>
        </header>

        <div className="auth-mode-toggle">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            onClick={() => {
              setMode('login')
              setError(null)
            }}
          >
            Login
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            onClick={() => {
              setMode('register')
              setError(null)
            }}
          >
            Register
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={16}
                required
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/*
        <p className="auth-note">
          Easiest path is email + password. Use your no-reply mailbox later for verification/reset emails.
        </p>
        */}
      </div>
    </div>
  )
}
