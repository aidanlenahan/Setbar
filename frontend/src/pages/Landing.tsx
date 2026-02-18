import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'

interface LandingProps {
  onStartTrial: () => void
}

export default function Landing({ onStartTrial }: LandingProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">NessFitness</p>
          <h1>Track workouts and build consistent training habits.</h1>
          <p className="landing-subtitle">
            Log sets fast, browse the exercise library, and generate weekly splits.
            Everything stays organized so you can focus on your next session.
          </p>
          <div className="landing-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              Try it out
            </button>
            <Link className="btn-secondary" to="/login">Log in</Link>
          </div>
        </div>
        <div className="landing-hero-panel">
          <div className="hero-panel-card">
            <h3>Today at a glance</h3>
            <p>Track your latest workout and keep momentum going.</p>
            <div className="hero-panel-metrics">
              <div>
                <span className="metric-value">3</span>
                <span className="metric-label">sets logged</span>
              </div>
              <div>
                <span className="metric-value">6</span>
                <span className="metric-label">exercises</span>
              </div>
              <div>
                <span className="metric-value">45</span>
                <span className="metric-label">minutes</span>
              </div>
            </div>
          </div>
          <div className="hero-panel-card muted">
            <h4>Exercise library</h4>
            <p>Search by name, shortcut, or equipment.</p>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="feature-card">
          <h3>Fast workout logging</h3>
          <p>Quick entry or form mode lets you capture sets in seconds.</p>
        </div>
        <div className="feature-card">
          <h3>Exercise database</h3>
          <p>Browse hundreds of exercises with filters and shortcuts.</p>
        </div>
        <div className="feature-card">
          <h3>Plan your split</h3>
          <p>Generate weekly routines based on your preferred split.</p>
        </div>
        <div className="feature-card">
          <h3>Customize later</h3>
          <p>Create custom exercises and preferences after you sign in.</p>
        </div>
      </section>

      {isModalOpen && (
        <div className="landing-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="landing-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Trial mode</h2>
            <p>
              You can explore the app without creating an account. Trial mode lets you
              navigate the main pages, but saving preferences and custom exercises is limited.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setIsModalOpen(false)
                  onStartTrial()
                }}
              >
                Open
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
