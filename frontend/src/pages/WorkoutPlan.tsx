import { useState, useEffect } from 'react'
import axios from 'axios'
import './WorkoutPlan.css'

interface Exercise {
  id: number
  name: string
  shortcut: string
  category: string
  equipment: string
  description: string
  force?: string
}

type SplitType = 'ppl' | 'upper-lower' | 'full-body' | 'bro-split'
type DayType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'chest' | 'back' | 'shoulders' | 'arms'

interface WorkoutDay {
  name: string
  type: DayType
  exercises: Exercise[]
}

const SPLIT_CONFIGS: Record<SplitType, { name: string; days: { name: string; type: DayType }[] }> = {
  ppl: {
    name: 'Push/Pull/Legs',
    days: [
      { name: 'Push Day', type: 'push' },
      { name: 'Pull Day', type: 'pull' },
      { name: 'Leg Day', type: 'legs' },
    ],
  },
  'upper-lower': {
    name: 'Upper/Lower',
    days: [
      { name: 'Upper Body', type: 'upper' },
      { name: 'Lower Body', type: 'lower' },
    ],
  },
  'full-body': {
    name: 'Full Body',
    days: [{ name: 'Full Body Workout', type: 'full' }],
  },
  'bro-split': {
    name: 'Bro Split',
    days: [
      { name: 'Chest Day', type: 'chest' },
      { name: 'Back Day', type: 'back' },
      { name: 'Shoulder Day', type: 'shoulders' },
      { name: 'Leg Day', type: 'legs' },
      { name: 'Arm Day', type: 'arms' },
    ],
  },
}

function WorkoutPlan() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedSplit, setSelectedSplit] = useState<SplitType>('ppl')
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchExercises()
  }, [])

  useEffect(() => {
    if (exercises.length > 0) {
      generateWorkoutPlan()
    }
  }, [selectedSplit, exercises])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/exercises', {
        params: { limit: 200 },
      })
      setExercises(response.data.exercises || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch exercises:', err)
      setError('Failed to load exercises')
    } finally {
      setLoading(false)
    }
  }

  const filterExercisesByType = (type: DayType): Exercise[] => {
    switch (type) {
      case 'push':
        return exercises.filter((ex) => ex.force === 'push')
      case 'pull':
        return exercises.filter((ex) => ex.force === 'pull')
      case 'legs':
        return exercises.filter((ex) => ex.force === 'legs')
      case 'upper':
        return exercises.filter((ex) => ex.force === 'push' || ex.force === 'pull')
      case 'lower':
        return exercises.filter((ex) => ex.force === 'legs')
      case 'full':
        return exercises // All exercises for full body
      case 'chest':
        return exercises.filter((ex) => ex.category === 'chest' || (ex.force === 'push' && ex.category !== 'shoulders'))
      case 'back':
        return exercises.filter((ex) => ex.category === 'back')
      case 'shoulders':
        return exercises.filter((ex) => ex.category === 'shoulders')
      case 'arms':
        return exercises.filter((ex) => ex.category === 'arms')
      default:
        return []
    }
  }

  const selectRecommendedExercises = (type: DayType): Exercise[] => {
    const available = filterExercisesByType(type)

    // Priority exercises for different workout types
    const priorities: Record<string, string[]> = {
      push: ['Bench Press', 'Overhead Press', 'Incline Bench Press', 'Dip', 'Tricep Extension'],
      pull: ['Deadlift', 'Pull-up', 'Barbell Row', 'Lat Pulldown', 'Face Pull', 'Bicep Curl'],
      legs: ['Squat (Barbell)', 'Romanian Deadlift', 'Leg Press', 'Lunges', 'Leg Curl', 'Calf Raise'],
      upper: ['Bench Press', 'Pull-up', 'Overhead Press', 'Barbell Row', 'Incline Bench Press', 'Lat Pulldown'],
      lower: ['Squat (Barbell)', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'],
      chest: ['Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press', 'Dip'],
      back: ['Deadlift', 'Pull-up', 'Barbell Row', 'Lat Pulldown', 'Face Pull'],
      shoulders: ['Overhead Press', 'Face Pull'],
      arms: ['Bicep Curl', 'Tricep Extension'],
    }

    const priorityList = priorities[type] || []
    const recommended: Exercise[] = []

    // Add priority exercises first
    priorityList.forEach((name) => {
      const exercise = available.find((ex) => ex.name === name)
      if (exercise && !recommended.includes(exercise)) {
        recommended.push(exercise)
      }
    })

    // Add remaining exercises up to a reasonable limit
    const limit = type === 'full' ? 8 : 6
    available.forEach((exercise) => {
      if (recommended.length < limit && !recommended.includes(exercise)) {
        recommended.push(exercise)
      }
    })

    return recommended.slice(0, limit)
  }

  const generateWorkoutPlan = () => {
    const config = SPLIT_CONFIGS[selectedSplit]
    const plan: WorkoutDay[] = config.days.map((day) => ({
      name: day.name,
      type: day.type,
      exercises: selectRecommendedExercises(day.type),
    }))
    setWorkoutPlan(plan)
  }

  if (loading) {
    return (
      <div className="workout-plan-container">
        <div className="loading">Loading exercises...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="workout-plan-container">
        <div className="error">{error}</div>
      </div>
    )
  }

  return (
    <div className="workout-plan-container">
      <header className="workout-plan-header">
        <h1>Workout Plan</h1>
      </header>

      <div className="split-selector">
        <h2>Choose Your Split</h2>
        <div className="split-buttons">
          {Object.entries(SPLIT_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              className={`split-button ${selectedSplit === key ? 'active' : ''}`}
              onClick={() => setSelectedSplit(key as SplitType)}
            >
              <span className="split-name">{config.name}</span>
              <span className="split-days">{config.days.length} days/week</span>
            </button>
          ))}
        </div>
      </div>

      <div className="workout-days">
        {workoutPlan.map((day, index) => (
          <div key={index} className="workout-day">
            <div className="day-header">
              <h3>{day.name}</h3>
              <span className="exercise-count">{day.exercises.length} exercises</span>
            </div>
            <div className="exercise-list">
              {day.exercises.length === 0 ? (
                <p className="no-exercises">No exercises available for this workout type</p>
              ) : (
                day.exercises.map((exercise) => (
                  <div key={exercise.id} className="exercise-card">
                    <div className="exercise-info">
                      <h4>{exercise.name}</h4>
                      <div className="exercise-meta">
                        <span className="badge category">{exercise.category}</span>
                        <span className="badge equipment">{exercise.equipment}</span>
                        {exercise.shortcut && <span className="badge shortcut">{exercise.shortcut}</span>}
                      </div>
                      <p className="description">{exercise.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="workout-plan-notes">
        <h3>Training Tips</h3>
        <ul>
          <li>Perform 3-4 sets of 8-12 reps for each exercise</li>
          <li>Rest 2-3 minutes between compound exercises</li>
          <li>Rest 1-2 minutes between isolation exercises</li>
          <li>Progressively increase weight when you can complete all sets with good form</li>
          <li>Take at least one rest day between training the same muscle groups</li>
        </ul>
      </div>
    </div>
  )
}

export default WorkoutPlan
