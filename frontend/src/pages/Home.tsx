import { useState, useEffect } from 'react'
import axios from 'axios'
import './Home.css'

interface Exercise {
  id: number
  name: string
  shortcut: string
}

interface WorkoutSet {
  id: number
  exercise_id: number
  weight: number
  reps: number
  set_number: number
  notes: string
}

function Track() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([])
  const [workoutId, setWorkoutId] = useState<number | null>(null)
  const [entryMode, setEntryMode] = useState<'form' | 'quick'>('form')
  
  // Form mode state
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [sets, setSets] = useState('1')
  const [notes, setNotes] = useState('')
  
  // Quick entry mode state
  const [quickEntry, setQuickEntry] = useState('')
  const [quickEntryError, setQuickEntryError] = useState('')

  useEffect(() => {
    fetchTodayWorkout()
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchExercises(exerciseSearch)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [exerciseSearch])

  const fetchExercises = async (searchTerm = '') => {
    try {
      console.log('Fetching exercises for dropdown...')
      const params = new URLSearchParams({
        skip: '0',
        limit: '100',
        sort_by: 'name',
        sort_order: 'asc',
      })

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }

      const response = await axios.get(`/api/exercises?${params.toString()}`)
      const results = Array.isArray(response.data?.exercises) ? response.data.exercises : []
      console.log(`Fetched ${results.length} exercises`)
      setExercises(results)
    } catch (err) {
      console.error('Failed to fetch exercises:', err)
      setError('Failed to load exercises')
    }
  }

  const fetchTodayWorkout = async () => {
    try {
      console.log('Fetching today\'s workout...')
      const response = await axios.get('/api/workouts/today')
      console.log('Workout fetched:', response.data)
      setWorkoutId(response.data.id)
      fetchTodaySets(response.data.id)
    } catch (err) {
      console.error('Failed to fetch today\'s workout:', err)
      setError('Failed to load today\'s workout')
    }
  }

  const fetchTodaySets = async (wId: number) => {
    try {
      console.log(`Fetching sets for workout ${wId}...`)
      const response = await axios.get(`/api/workouts/${wId}/sets`)
      console.log(`Fetched ${response.data.length} sets`)
      setTodaySets(response.data)
    } catch (err) {
      console.error('Failed to fetch sets:', err)
    }
  }

  const handleAddSetForm = async () => {
    if (!workoutId || !selectedExercise || !weight || !reps) return

    try {
      await axios.post(`/api/workouts/${workoutId}/sets`, {
        exercise_id: selectedExercise,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        set_number: 1,
        notes: notes || null
      })
      
      // Reset form
      setWeight('')
      setReps('')
      setNotes('')
      
      // Refresh sets
      fetchTodaySets(workoutId)
    } catch (err) {
      console.error('Failed to add set:', err)
    }
  }

  const handleQuickEntry = async () => {
    if (!quickEntry.trim()) return

    try {
      setQuickEntryError('')
      const response = await axios.post('/api/quick-entry', {
        entry: quickEntry
      })
      
      console.log('Quick entry success:', response.data)
      setQuickEntry('')
      
      // Refresh sets
      if (workoutId) {
        fetchTodaySets(workoutId)
      } else {
        fetchTodayWorkout()
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to parse entry'
      setQuickEntryError(errorMsg)
      console.error('Quick entry failed:', err)
    }
  }

  const getExerciseName = (exerciseId: number) => {
    const ex = exercises.find(e => e.id === exerciseId)
    return ex ? ex.name : 'Unknown'
  }

  const selectedExerciseName = selectedExercise ? getExerciseName(selectedExercise) : ''

  return (
    <div className="home">
      <h1>Track Workout</h1>
      
      <div className="mode-toggle">
        <button 
          className={entryMode === 'form' ? 'active' : ''}
          onClick={() => setEntryMode('form')}
        >
          Form Mode
        </button>
        <button 
          className={entryMode === 'quick' ? 'active' : ''}
          onClick={() => setEntryMode('quick')}
        >
          Quick Entry
        </button>
      </div>
      
      {entryMode === 'form' ? (
        <div className="workout-form">
          <div className="form-group">
            <label>Exercise</label>
            <div className="exercise-search-wrapper">
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setExerciseSearch(nextValue)
                  setSelectedExercise(null)
                  setIsDropdownOpen(Boolean(nextValue.trim()))
                }}
                onFocus={() => {
                  if (exerciseSearch.trim()) {
                    setIsDropdownOpen(true)
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => setIsDropdownOpen(false), 150)
                }}
                placeholder="Search by name or shortcut"
                className="exercise-search-input"
              />
              {isDropdownOpen && (
                <div className="exercise-dropdown" role="listbox" aria-label="Exercise options">
                  {exercises.length === 0 ? (
                    <div className="exercise-option empty">No matches found</div>
                  ) : (
                    exercises.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        className={`exercise-option${selectedExercise === ex.id ? ' selected' : ''}`}
                        onClick={() => {
                          setSelectedExercise(ex.id)
                          setExerciseSearch(ex.name)
                          setIsDropdownOpen(false)
                        }}
                      >
                        <span className="exercise-option-name">{ex.name}</span>
                        {ex.shortcut && <span className="exercise-option-shortcut">{ex.shortcut}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedExerciseName && (
              <div className="selected-exercise">Selected: {selectedExerciseName}</div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Weight (lbs)</label>
              <input 
                type="number" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)}
                placeholder="225"
              />
            </div>

            <div className="form-group">
              <label>Reps</label>
              <input 
                type="number" 
                value={reps} 
                onChange={(e) => setReps(e.target.value)}
                placeholder="5"
              />
            </div>

            <div className="form-group">
              <label>Sets</label>
              <input 
                type="number" 
                value={sets} 
                onChange={(e) => setSets(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <input 
              type="text" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Felt heavy, used belt"
            />
          </div>

          <button 
            className="btn-primary" 
            onClick={handleAddSetForm}
            disabled={!selectedExercise || !weight || !reps}
          >
            Add Set
          </button>
        </div>
      ) : (
        <div className="workout-form">
          <div className="form-group">
            <label>Quick Entry</label>
            <input 
              type="text" 
              value={quickEntry} 
              onChange={(e) => setQuickEntry(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuickEntry()}
              placeholder="sq 225 3x5 !hard #belt"
              className="quick-entry-input"
            />
            <small className="help-text">
              Format: [shortcut] [weight] [sets]x[reps] [!flags] [#tags] [notes]
              <br />
              Examples: "sq 225 3x5", "bp 135 5x5 !hard", "dl 315 1x5 #belt felt heavy"
            </small>
          </div>

          {quickEntryError && (
            <div className="error-message">{quickEntryError}</div>
          )}

          <button 
            className="btn-primary" 
            onClick={handleQuickEntry}
            disabled={!quickEntry.trim()}
          >
            Add Sets
          </button>

          <div className="shortcuts-reference">
            <h4>Available Shortcuts:</h4>
            <div className="shortcuts-grid">
              {exercises.slice(0, 10).map(ex => (
                <span key={ex.id} className="shortcut-badge">
                  {ex.shortcut} = {ex.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="today-workout">
        <h2>Today's Workout</h2>
        {todaySets.length === 0 ? (
          <p className="empty-state">No sets logged yet. Add your first set above!</p>
        ) : (
          <div className="sets-list">
            {todaySets.map(set => (
              <div key={set.id} className="set-item">
                <span className="exercise-name">{getExerciseName(set.exercise_id)}</span>
                <span className="set-details">
                  {set.weight} lbs x {set.reps} reps
                </span>
                {set.notes && <span className="set-notes">{set.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Track
