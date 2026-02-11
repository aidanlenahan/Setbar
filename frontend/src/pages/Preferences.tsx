import { useState, useEffect } from 'react'
import './Preferences.css'

interface PreferencesData {
  darkMode: boolean
  defaultEntryMode: 'form' | 'quick'
  weightUnit: 'lbs' | 'kg'
  autoSaveWorkout: boolean
  soundEffects: boolean
  showExerciseGifs: boolean
}

const DEFAULT_PREFERENCES: PreferencesData = {
  darkMode: true,
  defaultEntryMode: 'quick',
  weightUnit: 'lbs',
  autoSaveWorkout: true,
  soundEffects: false,
  showExerciseGifs: true,
}

export default function Preferences() {
  const [preferences, setPreferences] = useState<PreferencesData>(DEFAULT_PREFERENCES)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load preferences from localStorage
    const stored = localStorage.getItem('nessfitness-preferences')
    if (stored) {
      try {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) })
      } catch (err) {
        console.error('Failed to parse preferences:', err)
      }
    }
  }, [])

  useEffect(() => {
    // Apply dark mode
    if (preferences.darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [preferences.darkMode])

  const handleSave = () => {
    localStorage.setItem('nessfitness-preferences', JSON.stringify(preferences))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES)
    localStorage.removeItem('nessfitness-preferences')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updatePreference = <K extends keyof PreferencesData>(
    key: K,
    value: PreferencesData[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="preferences-container">
      <header className="preferences-header">
        <h1>⚙️ Preferences</h1>
        <p>Customize your NessFitness experience</p>
      </header>

      <div className="preferences-content">
        {/* Appearance Section */}
        <section className="pref-section">
          <h2>🎨 Appearance</h2>
          
          <div className="pref-item">
            <div className="pref-info">
              <label htmlFor="darkMode">Dark Mode</label>
              <p className="pref-description">Enable dark theme for reduced eye strain</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="darkMode"
                checked={preferences.darkMode}
                onChange={(e) => updatePreference('darkMode', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="pref-item">
            <div className="pref-info">
              <label htmlFor="showExerciseGifs">Exercise GIFs</label>
              <p className="pref-description">Show animated exercise demonstrations</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="showExerciseGifs"
                checked={preferences.showExerciseGifs}
                onChange={(e) => updatePreference('showExerciseGifs', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Workout Section */}
        <section className="pref-section">
          <h2>🏋️ Workout</h2>
          
          <div className="pref-item">
            <div className="pref-info">
              <label htmlFor="defaultEntryMode">Default Entry Mode</label>
              <p className="pref-description">Choose your preferred way to log sets</p>
            </div>
            <select
              id="defaultEntryMode"
              className="pref-select"
              value={preferences.defaultEntryMode}
              onChange={(e) => updatePreference('defaultEntryMode', e.target.value as 'form' | 'quick')}
            >
              <option value="quick">Quick Entry (e.g., "sq 225 3x5")</option>
              <option value="form">Form Mode (dropdown + inputs)</option>
            </select>
          </div>

          <div className="pref-item">
            <div className="pref-info">
              <label htmlFor="weightUnit">Weight Unit</label>
              <p className="pref-description">Display weights in pounds or kilograms</p>
            </div>
            <select
              id="weightUnit"
              className="pref-select"
              value={preferences.weightUnit}
              onChange={(e) => updatePreference('weightUnit', e.target.value as 'lbs' | 'kg')}
            >
              <option value="lbs">Pounds (lbs)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>

          <div className="pref-item">
            <div className="pref-info">
              <label htmlFor="autoSaveWorkout">Auto-save Workout</label>
              <p className="pref-description">Automatically save workout data as you log</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="autoSaveWorkout"
                checked={preferences.autoSaveWorkout}
                onChange={(e) => updatePreference('autoSaveWorkout', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Sound Section */}
        <section className="pref-section">
          <h2>🔊 Sound</h2>
          
          <div className="pref-item">
            <div className="pref-info">
              <label htmlFor="soundEffects">Sound Effects</label>
              <p className="pref-description">Play sounds when logging sets</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="soundEffects"
                checked={preferences.soundEffects}
                onChange={(e) => updatePreference('soundEffects', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Attribution Section */}
        <section className="pref-section attribution-section">
          <h2>ℹ️ About</h2>
          <div className="attribution-box">
            <p>
              <strong>NessFitness</strong> v1.0.0
            </p>
            <p>
              Exercise database powered by{' '}
              <a href="https://github.com/wrkout/exercises.json" target="_blank" rel="noopener noreferrer">
                wrkout/exercises.json
              </a>{' '}
              (Public Domain - CC0)
            </p>
            <p className="license-note">
              873 exercises available locally, no internet required.
            </p>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="pref-actions">
          <button onClick={handleReset} className="btn-secondary">
            Reset to Defaults
          </button>
          <button onClick={handleSave} className="btn-primary">
            {saved ? '✓ Saved!' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
