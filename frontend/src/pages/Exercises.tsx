import { useState, useEffect } from 'react'
import axios from 'axios'
import './Exercises.css'

interface Exercise {
  id: number
  name: string
  shortcut: string
  category: string
  equipment: string
  description: string
}

function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    fetchExercises()
  }, [page, search])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      setError(null) // Clear previous errors
      const skip = (page - 1) * pageSize
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
      const url = `/api/exercises?skip=${skip}&limit=${pageSize}${searchParam}`
      
      console.log('🔄 Fetching exercises from:', url)
      const response = await axios.get(url)
      console.log('✅ Response received:', {
        total: response.data.total,
        exercises: response.data.exercises?.length || 0,
        status: response.status
      })
      
      if (!response.data.exercises || !Array.isArray(response.data.exercises)) {
        throw new Error('Invalid response format: exercises array not found')
      }
      
      setExercises(response.data.exercises)
      setTotal(response.data.total || 0)
      console.log('✅ State updated successfully')
    } catch (err: any) {
      console.error('❌ Failed to fetch exercises:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
      setError(`Failed to load exercises: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1) // Reset to first page on search
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="exercises-page">
      <header className="exercises-header">
        <h1>Exercise Library</h1>
        <p className="exercise-count">{total} exercises available</p>
      </header>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search exercises by name..."
          value={search}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
      
      {loading && <p className="loading-message">Loading exercises...</p>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="exercise-grid">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="exercise-card">
            <h3>{exercise.name}</h3>
            <div className="exercise-details">
              {exercise.shortcut && <span className="shortcut">{exercise.shortcut}</span>}
              {exercise.category && <span className="category">{exercise.category}</span>}
              {exercise.equipment && <span className="equipment">{exercise.equipment}</span>}
            </div>
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default Exercises
