import { useState, useEffect } from 'react'
import axios from 'axios'
import './Preferences.css'

interface PreferencesData {
  darkMode: boolean
  defaultEntryMode: 'form' | 'quick'
  weightUnit: 'lbs' | 'kg'
  autoSaveWorkout: boolean
  soundEffects: boolean
  showExerciseGifs: boolean
}

interface CustomExercise {
  id: number
  name: string
  shortcut: string
  category: string
  equipment: string
  description: string
  target_muscles?: string[]
  secondary_muscles?: string[]
  instructions?: string[]
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
  const [muscleOptions, setMuscleOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [equipmentOptions, setEquipmentOptions] = useState<string[]>([])
  const [customExerciseSaved, setCustomExerciseSaved] = useState<string | null>(null)
  const [customExerciseError, setCustomExerciseError] = useState<string | null>(null)
  const [creatingExercise, setCreatingExercise] = useState(false)
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([])
  const [loadingCustomExercises, setLoadingCustomExercises] = useState(false)
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [updatingExercise, setUpdatingExercise] = useState(false)
  const [editExerciseError, setEditExerciseError] = useState<string | null>(null)
  const [customExerciseForm, setCustomExerciseForm] = useState({
    name: '',
    shortcut: '',
    category: '',
    equipment: '',
    difficulty: 'intermediate',
    primaryMuscle: '',
    secondaryMuscle: '',
    instructionsText: '',
  })
  const [editExerciseForm, setEditExerciseForm] = useState({
    name: '',
    shortcut: '',
    category: '',
    equipment: '',
    difficulty: 'intermediate',
    primaryMuscle: '',
    secondaryMuscle: '',
    instructionsText: '',
  })

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

  useEffect(() => {
    const loadExerciseOptions = async () => {
      try {
        const response = await axios.get('/api/exercises/filters')
        setMuscleOptions(response.data.body_parts || [])
        setCategoryOptions(response.data.categories || [])
        setEquipmentOptions(response.data.equipment || [])
      } catch (err) {
        console.error('Failed to load exercise filter options', err)
      }
    }

    loadExerciseOptions()
  }, [])

  useEffect(() => {
    fetchCustomExercises()
  }, [])

  const fetchCustomExercises = async () => {
    try {
      setLoadingCustomExercises(true)
      const response = await axios.get('/api/custom-exercises')
      setCustomExercises(response.data || [])
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setCustomExercises([])
      } else {
        console.error('Failed to load custom exercises', err)
      }
    } finally {
      setLoadingCustomExercises(false)
    }
  }

  const resetCustomExerciseForm = () => {
    setCustomExerciseForm({
      name: '',
      shortcut: '',
      category: '',
      equipment: '',
      difficulty: 'intermediate',
      primaryMuscle: '',
      secondaryMuscle: '',
      instructionsText: '',
    })
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditingExerciseId(null)
    setEditExerciseError(null)
    setEditExerciseForm({
      name: '',
      shortcut: '',
      category: '',
      equipment: '',
      difficulty: 'intermediate',
      primaryMuscle: '',
      secondaryMuscle: '',
      instructionsText: '',
    })
  }

  const getDifficultyFromDescription = (description: string) => {
    const value = (description || '').split('|')[0]?.trim()?.toLowerCase()
    return value === 'beginner' || value === 'intermediate' || value === 'expert' ? value : 'intermediate'
  }

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

  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    setCustomExerciseError(null)
    setCustomExerciseSaved(null)

    const instructions = customExerciseForm.instructionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!customExerciseForm.primaryMuscle) {
      setCustomExerciseError('Primary muscle group is required')
      return
    }

    if (instructions.length === 0) {
      setCustomExerciseError('Add at least one instruction step')
      return
    }

    try {
      setCreatingExercise(true)
      const payload = {
        name: customExerciseForm.name,
        shortcut: customExerciseForm.shortcut,
        category: customExerciseForm.category,
        equipment: customExerciseForm.equipment,
        difficulty: customExerciseForm.difficulty,
        primary_muscles: [customExerciseForm.primaryMuscle],
        secondary_muscles: customExerciseForm.secondaryMuscle ? [customExerciseForm.secondaryMuscle] : [],
        instructions,
      }

      await axios.post('/api/exercises/custom', payload)
      setCustomExerciseSaved('Custom exercise created')

      resetCustomExerciseForm()
      await fetchCustomExercises()
    } catch (err: any) {
      setCustomExerciseError(err.response?.data?.detail || 'Failed to create custom exercise')
    } finally {
      setCreatingExercise(false)
    }
  }

  const handleEditCustomExercise = (exercise: CustomExercise) => {
    setEditExerciseError(null)
    setEditingExerciseId(exercise.id)
    setEditExerciseForm({
      name: exercise.name || '',
      shortcut: exercise.shortcut || '',
      category: exercise.category || '',
      equipment: exercise.equipment || '',
      difficulty: getDifficultyFromDescription(exercise.description),
      primaryMuscle: exercise.target_muscles?.[0] || '',
      secondaryMuscle: exercise.secondary_muscles?.[0] || '',
      instructionsText: (exercise.instructions || []).join('\n'),
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExerciseId) return

    setEditExerciseError(null)
    const instructions = editExerciseForm.instructionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!editExerciseForm.primaryMuscle) {
      setEditExerciseError('Primary muscle group is required')
      return
    }

    if (instructions.length === 0) {
      setEditExerciseError('Add at least one instruction step')
      return
    }

    try {
      setUpdatingExercise(true)
      const payload = {
        name: editExerciseForm.name,
        shortcut: editExerciseForm.shortcut,
        category: editExerciseForm.category,
        equipment: editExerciseForm.equipment,
        difficulty: editExerciseForm.difficulty,
        primary_muscles: [editExerciseForm.primaryMuscle],
        secondary_muscles: editExerciseForm.secondaryMuscle ? [editExerciseForm.secondaryMuscle] : [],
        instructions,
      }

      await axios.put(`/api/exercises/custom/${editingExerciseId}`, payload)
      await fetchCustomExercises()
      setCustomExerciseSaved('Custom exercise updated')
      closeEditModal()
    } catch (err: any) {
      setEditExerciseError(err.response?.data?.detail || 'Failed to update custom exercise')
    } finally {
      setUpdatingExercise(false)
    }
  }

  const handleRemoveCustomExercise = async (exerciseId: number) => {
    try {
      await axios.delete(`/api/exercises/custom/${exerciseId}`)
      if (editingExerciseId === exerciseId) {
        closeEditModal()
      }
      await fetchCustomExercises()
      setCustomExerciseSaved('Custom exercise removed')
      setCustomExerciseError(null)
    } catch (err: any) {
      setCustomExerciseError(err.response?.data?.detail || 'Failed to remove custom exercise')
    }
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

        <section className="pref-section">
          <h2>➕ Custom Exercise</h2>
          <form className="custom-exercise-form" onSubmit={handleCreateCustomExercise}>
            <div className="custom-form-grid">
              <div className="custom-field">
                <label htmlFor="custom-name">Exercise Name</label>
                <input
                  id="custom-name"
                  type="text"
                  value={customExerciseForm.name}
                  onChange={(e) => setCustomExerciseForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="custom-field">
                <label htmlFor="custom-shortcut">Shortcut</label>
                <input
                  id="custom-shortcut"
                  type="text"
                  maxLength={20}
                  value={customExerciseForm.shortcut}
                  onChange={(e) => setCustomExerciseForm((prev) => ({ ...prev, shortcut: e.target.value }))}
                  required
                />
              </div>

              <div className="custom-field">
                <label htmlFor="custom-category">Category</label>
                <select
                  id="custom-category"
                  value={customExerciseForm.category}
                  onChange={(e) => setCustomExerciseForm((prev) => ({ ...prev, category: e.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="custom-field">
                <label htmlFor="custom-equipment">Equipment</label>
                <select
                  id="custom-equipment"
                  value={customExerciseForm.equipment}
                  onChange={(e) => setCustomExerciseForm((prev) => ({ ...prev, equipment: e.target.value }))}
                  required
                >
                  <option value="">Select equipment</option>
                  {equipmentOptions.map((equipment) => (
                    <option key={equipment} value={equipment}>{equipment}</option>
                  ))}
                </select>
              </div>

              <div className="custom-field">
                <label htmlFor="custom-difficulty">Difficulty</label>
                <select
                  id="custom-difficulty"
                  value={customExerciseForm.difficulty}
                  onChange={(e) => setCustomExerciseForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                  required
                >
                  <option value="beginner">beginner</option>
                  <option value="intermediate">intermediate</option>
                  <option value="expert">expert</option>
                </select>
              </div>

              <div className="custom-field">
                <label htmlFor="custom-primary">Primary Muscle Group</label>
                <select
                  id="custom-primary"
                  value={customExerciseForm.primaryMuscle}
                  onChange={(e) => setCustomExerciseForm((prev) => ({ ...prev, primaryMuscle: e.target.value }))}
                  required
                >
                  <option value="">Select muscle group</option>
                  {muscleOptions.map((muscle) => (
                    <option key={muscle} value={muscle}>{muscle}</option>
                  ))}
                </select>
              </div>

              <div className="custom-field">
                <label htmlFor="custom-secondary">Secondary Muscle Group (optional)</label>
                <select
                  id="custom-secondary"
                  value={customExerciseForm.secondaryMuscle}
                  onChange={(e) => setCustomExerciseForm((prev) => ({ ...prev, secondaryMuscle: e.target.value }))}
                >
                  <option value="">None</option>
                  {muscleOptions.map((muscle) => (
                    <option key={muscle} value={muscle}>{muscle}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="custom-field">
              <label htmlFor="custom-instructions">Instructions (one step per line)</label>
              <textarea
                id="custom-instructions"
                value={customExerciseForm.instructionsText}
                onChange={(e) => setCustomExerciseForm((prev) => ({ ...prev, instructionsText: e.target.value }))}
                rows={5}
                required
              />
            </div>

            {customExerciseError && <p className="custom-error">{customExerciseError}</p>}
            {customExerciseSaved && <p className="custom-success">{customExerciseSaved}</p>}

            <div className="custom-actions">
              <button type="submit" className="btn-primary" disabled={creatingExercise}>
                {creatingExercise ? 'Creating...' : 'Create Exercise'}
              </button>
            </div>
          </form>

          <div className="custom-exercise-list-section">
            <h3>Your Custom Exercises</h3>
            {loadingCustomExercises ? (
              <p className="custom-list-empty">Loading custom exercises...</p>
            ) : customExercises.length === 0 ? (
              <p className="custom-list-empty">No custom exercises yet.</p>
            ) : (
              <div className="custom-exercise-list">
                {customExercises.map((exercise) => (
                  <div key={exercise.id} className="custom-exercise-item">
                    <div className="custom-exercise-main">
                      <p className="custom-exercise-title">{exercise.name}</p>
                      <p className="custom-exercise-meta">
                        {exercise.shortcut} • {exercise.category} • {exercise.equipment}
                      </p>
                    </div>
                    <div className="custom-item-actions">
                      <button type="button" className="btn-secondary" onClick={() => handleEditCustomExercise(exercise)}>
                        Edit
                      </button>
                      <button type="button" className="btn-secondary danger" onClick={() => handleRemoveCustomExercise(exercise.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {isEditModalOpen && (
        <div className="custom-modal-overlay" onClick={closeEditModal}>
          <section className="custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-header">
              <h3>Edit Custom Exercise</h3>
              <button type="button" className="custom-modal-close" onClick={closeEditModal}>Close</button>
            </div>

            <form className="custom-exercise-form" onSubmit={handleUpdateCustomExercise}>
              <div className="custom-form-grid">
                <div className="custom-field">
                  <label htmlFor="edit-custom-name">Exercise Name</label>
                  <input
                    id="edit-custom-name"
                    type="text"
                    value={editExerciseForm.name}
                    onChange={(e) => setEditExerciseForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="custom-field">
                  <label htmlFor="edit-custom-shortcut">Shortcut</label>
                  <input
                    id="edit-custom-shortcut"
                    type="text"
                    maxLength={20}
                    value={editExerciseForm.shortcut}
                    onChange={(e) => setEditExerciseForm((prev) => ({ ...prev, shortcut: e.target.value }))}
                    required
                  />
                </div>

                <div className="custom-field">
                  <label htmlFor="edit-custom-category">Category</label>
                  <select
                    id="edit-custom-category"
                    value={editExerciseForm.category}
                    onChange={(e) => setEditExerciseForm((prev) => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="custom-field">
                  <label htmlFor="edit-custom-equipment">Equipment</label>
                  <select
                    id="edit-custom-equipment"
                    value={editExerciseForm.equipment}
                    onChange={(e) => setEditExerciseForm((prev) => ({ ...prev, equipment: e.target.value }))}
                    required
                  >
                    <option value="">Select equipment</option>
                    {equipmentOptions.map((equipment) => (
                      <option key={equipment} value={equipment}>{equipment}</option>
                    ))}
                  </select>
                </div>

                <div className="custom-field">
                  <label htmlFor="edit-custom-difficulty">Difficulty</label>
                  <select
                    id="edit-custom-difficulty"
                    value={editExerciseForm.difficulty}
                    onChange={(e) => setEditExerciseForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                    required
                  >
                    <option value="beginner">beginner</option>
                    <option value="intermediate">intermediate</option>
                    <option value="expert">expert</option>
                  </select>
                </div>

                <div className="custom-field">
                  <label htmlFor="edit-custom-primary">Primary Muscle Group</label>
                  <select
                    id="edit-custom-primary"
                    value={editExerciseForm.primaryMuscle}
                    onChange={(e) => setEditExerciseForm((prev) => ({ ...prev, primaryMuscle: e.target.value }))}
                    required
                  >
                    <option value="">Select muscle group</option>
                    {muscleOptions.map((muscle) => (
                      <option key={muscle} value={muscle}>{muscle}</option>
                    ))}
                  </select>
                </div>

                <div className="custom-field">
                  <label htmlFor="edit-custom-secondary">Secondary Muscle Group (optional)</label>
                  <select
                    id="edit-custom-secondary"
                    value={editExerciseForm.secondaryMuscle}
                    onChange={(e) => setEditExerciseForm((prev) => ({ ...prev, secondaryMuscle: e.target.value }))}
                  >
                    <option value="">None</option>
                    {muscleOptions.map((muscle) => (
                      <option key={muscle} value={muscle}>{muscle}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="custom-field">
                <label htmlFor="edit-custom-instructions">Instructions (one step per line)</label>
                <textarea
                  id="edit-custom-instructions"
                  value={editExerciseForm.instructionsText}
                  onChange={(e) => setEditExerciseForm((prev) => ({ ...prev, instructionsText: e.target.value }))}
                  rows={5}
                  required
                />
              </div>

              {editExerciseError && <p className="custom-error">{editExerciseError}</p>}

              <div className="custom-actions">
                <button type="button" className="btn-secondary" onClick={closeEditModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={updatingExercise}>
                  {updatingExercise ? 'Updating...' : 'Update Exercise'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
