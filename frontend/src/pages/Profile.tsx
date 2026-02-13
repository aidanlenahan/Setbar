import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      navigate('/login')
      return
    }

    const loadProfile = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/auth/me')
        setUsername(response.data.name || '')
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmed = username.trim()
    if (!trimmed) {
      setError('Username is required')
      return
    }
    if (trimmed.length > 16) {
      setError('Username must be 16 characters or fewer')
      return
    }

    try {
      setSaving(true)
      const response = await axios.patch('/api/auth/profile', { username: trimmed })

      const authUserRaw = localStorage.getItem('auth_user')
      let authUser = { id: response.data.id, email: response.data.email, name: response.data.name }
      if (authUserRaw) {
        try {
          const parsed = JSON.parse(authUserRaw)
          authUser = { ...parsed, name: response.data.name }
        } catch {
          authUser = { id: response.data.id, email: response.data.email, name: response.data.name }
        }
      }

      localStorage.setItem('auth_user', JSON.stringify(authUser))
      window.dispatchEvent(new Event('auth-changed'))
      setUsername(response.data.name)
      setSuccess('Username updated')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update username')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1>Edit Profile</h1>

        {loading ? (
          <p className="profile-muted">Loading profile...</p>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="profile-field">
              <label htmlFor="profile-username">Username</label>
              <input
                id="profile-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={16}
                required
              />
              <small>{username.length}/16</small>
            </div>

            {error && <p className="profile-error">{error}</p>}
            {success && <p className="profile-success">{success}</p>}

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Username'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
