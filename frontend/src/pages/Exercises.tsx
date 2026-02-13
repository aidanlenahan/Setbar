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
  instructions?: string[]
  target_muscles?: string[]
  secondary_muscles?: string[]
  body_parts?: string[]
  exercisedb_id?: string | null
}

interface ExerciseFilterOptions {
  categories: string[]
  equipment: string[]
  body_parts: string[]
  difficulties: string[]
  sort_by: string[]
  sort_order: string[]
}

function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [cardImageAvailability, setCardImageAvailability] = useState<Record<number, boolean>>({})
  const [filterOptions, setFilterOptions] = useState<ExerciseFilterOptions>({
    categories: [],
    equipment: [],
    body_parts: [],
    difficulties: ['beginner', 'intermediate', 'expert'],
    sort_by: ['name', 'shortcut', 'category', 'equipment'],
    sort_order: ['asc', 'desc'],
  })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('auth_token'))
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [shortcutInput, setShortcutInput] = useState('')
  const [savingShortcut, setSavingShortcut] = useState(false)
  const [exerciseImages, setExerciseImages] = useState<string[]>([])
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null)
  const [shortcutError, setShortcutError] = useState<string | null>(null)
  const [shortcutSuccess, setShortcutSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [bodyPartFilter, setBodyPartFilter] = useState('')
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<'all' | 'custom' | 'default'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    fetchExercises()
  }, [page, search, categoryFilter, equipmentFilter, bodyPartFilter, exerciseTypeFilter, difficultyFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    if (!selectedExercise) {
      setExerciseImages([])
      setZoomedImageIndex(null)
      return
    }

    let isCancelled = false
    loadExerciseImagesForExercise(selectedExercise).then((urls) => {
      if (!isCancelled) {
        setExerciseImages(urls)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [selectedExercise])

  useEffect(() => {
    let cancelled = false

    const checkCardImages = async () => {
      const checks = await Promise.all(
        exercises.map(async (exercise) => {
          const base = buildExerciseImageBaseUrl(exercise.name)
          const exists = await checkImageExists(`${base}/0.jpg`)
          return { id: exercise.id, exists }
        })
      )

      if (!cancelled) {
        const next: Record<number, boolean> = {}
        checks.forEach((item) => {
          next[item.id] = item.exists
        })
        setCardImageAvailability(next)
      }
    }

    if (exercises.length > 0) {
      checkCardImages()
    } else {
      setCardImageAvailability({})
    }

    return () => {
      cancelled = true
    }
  }, [exercises])

  const buildExerciseImageKey = (name: string) => {
    return name
      .trim()
      .replace(/\s+/g, '_')
  }

  const buildExerciseImageBaseUrl = (name: string) => {
    const exerciseKey = buildExerciseImageKey(name)
    return `https://raw.githubusercontent.com/aidanlenahan/exercises.json/refs/heads/master/exercises/${exerciseKey}/images`
  }

  const checkImageExists = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }

  const loadExerciseImagesForExercise = async (exercise: Exercise): Promise<string[]> => {
    const base = buildExerciseImageBaseUrl(exercise.name)
    const candidates = [`${base}/0.jpg`, `${base}/1.jpg`]
    const checks = await Promise.all(
      candidates.map((url) => new Promise<string | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(url)
        img.onerror = () => resolve(null)
        img.src = url
      }))
    )
    return checks.filter((value): value is string => Boolean(value))
  }

  const handleCardImageOpen = async (exercise: Exercise) => {
    const urls = await loadExerciseImagesForExercise(exercise)
    if (urls.length === 0) return
    setExerciseImages(urls)
    setZoomedImageIndex(0)
  }

  const handleOpenImages = () => {
    if (exerciseImages.length > 0) {
      setZoomedImageIndex(0)
    }
  }

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get('/api/exercises/filters')
      setFilterOptions(response.data)
    } catch (err) {
      console.error('Failed to load exercise filters', err)
    }
  }

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(!!localStorage.getItem('auth_token'))
    }

    syncAuthState()
    window.addEventListener('storage', syncAuthState)
    window.addEventListener('auth-changed', syncAuthState)

    return () => {
      window.removeEventListener('storage', syncAuthState)
      window.removeEventListener('auth-changed', syncAuthState)
    }
  }, [])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      setError(null) // Clear previous errors
      const skip = (page - 1) * pageSize
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
      const categoryParam = categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : ''
      const equipmentParam = equipmentFilter ? `&equipment=${encodeURIComponent(equipmentFilter)}` : ''
      const bodyPartParam = bodyPartFilter ? `&body_part=${encodeURIComponent(bodyPartFilter)}` : ''
      const exerciseTypeParam = exerciseTypeFilter ? `&exercise_type=${encodeURIComponent(exerciseTypeFilter)}` : ''
      const difficultyParam = difficultyFilter ? `&difficulty=${encodeURIComponent(difficultyFilter)}` : ''
      const sortByParam = sortBy ? `&sort_by=${encodeURIComponent(sortBy)}` : ''
      const sortOrderParam = sortOrder ? `&sort_order=${encodeURIComponent(sortOrder)}` : ''
      const url = `/api/exercises?skip=${skip}&limit=${pageSize}${searchParam}${categoryParam}${equipmentParam}${bodyPartParam}${exerciseTypeParam}${difficultyParam}${sortByParam}${sortOrderParam}`
      
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

  const resetFilters = () => {
    setCategoryFilter('')
    setEquipmentFilter('')
    setBodyPartFilter('')
    setExerciseTypeFilter('all')
    setDifficultyFilter('')
    setSortBy('name')
    setSortOrder('asc')
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize)

  const handleExerciseClick = async (exerciseId: number) => {
    try {
      setLoadingDetails(true)
      setShortcutError(null)
      setShortcutSuccess(null)

      const response = await axios.get(`/api/exercises/${exerciseId}`)
      const exercise = response.data as Exercise
      setSelectedExercise(exercise)
      setShortcutInput(exercise.shortcut || '')
    } catch (err: any) {
      setShortcutError(err.response?.data?.detail || err.message || 'Failed to load exercise details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSaveShortcut = async () => {
    if (!selectedExercise) return
    if (!isAuthenticated) {
      setShortcutError('Log in to edit shortcuts')
      return
    }

    try {
      setSavingShortcut(true)
      setShortcutError(null)
      setShortcutSuccess(null)

      const normalizedShortcut = shortcutInput.trim().toLowerCase()
      if (!normalizedShortcut) {
        setShortcutError('Shortcut cannot be empty')
        return
      }

      const response = await axios.patch(`/api/exercises/${selectedExercise.id}/shortcut`, {
        shortcut: normalizedShortcut
      })

      const updatedExercise = response.data.exercise as Exercise
      setSelectedExercise(updatedExercise)
      setShortcutInput(updatedExercise.shortcut || '')
      setExercises((prev) => prev.map((ex) => ex.id === updatedExercise.id ? { ...ex, shortcut: updatedExercise.shortcut } : ex))
      setShortcutSuccess('Shortcut updated successfully')
    } catch (err: any) {
      setShortcutError(err.response?.data?.detail || err.message || 'Failed to update shortcut')
    } finally {
      setSavingShortcut(false)
    }
  }

  return (
    <div className="exercises-page">
      <header className="exercises-header">
        <h1>Exercise Library</h1>
        <p className="exercise-count">{total} exercises available</p>
      </header>
      
      <div className="search-bar">
        <div className="search-row">
          <input
            type="text"
            placeholder="Search exercises by name or shortcut..."
            value={search}
            onChange={handleSearchChange}
            className="search-input"
          />
          <button
            type="button"
            className="filter-toggle-btn"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-label="Toggle filters"
          >
            <img src="/img/filter.png" alt="" className="filter-icon" />
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-item">
              <label htmlFor="category-filter">Category</label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All</option>
                {filterOptions.categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="equipment-filter">Equipment</label>
              <select
                id="equipment-filter"
                value={equipmentFilter}
                onChange={(e) => {
                  setEquipmentFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All</option>
                {filterOptions.equipment.map((equipment) => (
                  <option key={equipment} value={equipment}>{equipment}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="body-part-filter">Body Part</label>
              <select
                id="body-part-filter"
                value={bodyPartFilter}
                onChange={(e) => {
                  setBodyPartFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All</option>
                {filterOptions.body_parts.map((bodyPart) => (
                  <option key={bodyPart} value={bodyPart}>{bodyPart}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="exercise-type-filter">Exercise Type</label>
              <select
                id="exercise-type-filter"
                value={exerciseTypeFilter}
                onChange={(e) => {
                  setExerciseTypeFilter(e.target.value as 'all' | 'custom' | 'default')
                  setPage(1)
                }}
              >
                <option value="all">All</option>
                <option value="custom">Custom</option>
                <option value="default">Default</option>
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="difficulty-filter">Difficulty</label>
              <select
                id="difficulty-filter"
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All</option>
                {filterOptions.difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="sort-by">Sort By</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {filterOptions.sort_by.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="sort-order">Order</label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                {filterOptions.sort_order.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="filter-actions">
              <button type="button" className="filter-reset-btn" onClick={resetFilters}>Reset</button>
            </div>
          </div>
        )}
      </div>
      
      {loading && <p className="loading-message">Loading exercises...</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="exercise-grid">
        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            className={`exercise-card ${selectedExercise?.id === exercise.id ? 'selected' : ''}`}
            onClick={() => handleExerciseClick(exercise.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleExerciseClick(exercise.id)
              }
            }}
          >
            {cardImageAvailability[exercise.id] && (
              <button
                type="button"
                className="card-photo-btn"
                aria-label={`Open ${exercise.name} photos`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleCardImageOpen(exercise)
                }}
              >
                <img src="/img/photo.png" alt="" className="card-photo-icon" />
              </button>
            )}
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

      {(selectedExercise || loadingDetails) && (
        <div
          className="exercise-modal-overlay"
          onClick={() => {
            if (!savingShortcut) {
              setSelectedExercise(null)
              setShortcutError(null)
              setShortcutSuccess(null)
            }
          }}
        >
          <section className="exercise-modal" onClick={(e) => e.stopPropagation()}>
            {loadingDetails && <p className="loading-message">Loading exercise details...</p>}

            {selectedExercise && !loadingDetails && (
              <>
                <div className="exercise-detail-header-row">
                  <h2>{selectedExercise.name}</h2>
                  <button
                    type="button"
                    className="close-detail-btn"
                    onClick={() => {
                      setSelectedExercise(null)
                      setShortcutError(null)
                      setShortcutSuccess(null)
                    }}
                  >
                    Close
                  </button>
                </div>

                <div className="exercise-details">
                  {selectedExercise.category && <span className="category">{selectedExercise.category}</span>}
                  {selectedExercise.equipment && <span className="equipment">{selectedExercise.equipment}</span>}
                </div>

                <div className="muscles-section">
                  <h3>Primary Muscles</h3>
                  {selectedExercise.target_muscles && selectedExercise.target_muscles.length > 0 ? (
                    <div className="muscle-badges">
                      {selectedExercise.target_muscles.map((muscle) => (
                        <span key={`primary-${muscle}`} className="muscle-badge primary">{muscle}</span>
                      ))}
                    </div>
                  ) : (
                    <p>No primary muscles listed.</p>
                  )}

                  <h3>Secondary Muscles</h3>
                  {selectedExercise.secondary_muscles && selectedExercise.secondary_muscles.length > 0 ? (
                    <div className="muscle-badges">
                      {selectedExercise.secondary_muscles.map((muscle) => (
                        <span key={`secondary-${muscle}`} className="muscle-badge secondary">{muscle}</span>
                      ))}
                    </div>
                  ) : (
                    <p>No secondary muscles listed.</p>
                  )}
                </div>

                <div className="shortcut-editor">
                  <label htmlFor="shortcut-input">Shortcut</label>
                  <div className="shortcut-editor-row">
                    <input
                      id="shortcut-input"
                      value={shortcutInput}
                      onChange={(e) => setShortcutInput(e.target.value)}
                      placeholder="e.g. sq"
                      maxLength={20}
                      disabled={!isAuthenticated || savingShortcut}
                    />
                    <button type="button" onClick={handleSaveShortcut} disabled={savingShortcut || !isAuthenticated}>
                      {savingShortcut ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {!isAuthenticated && <p className="shortcut-auth-note">Log in to edit shortcuts.</p>}
                  {shortcutError && <p className="error-message detail-error">{shortcutError}</p>}
                  {shortcutSuccess && <p className="success-message">{shortcutSuccess}</p>}
                </div>

                <div className="instructions-section">
                  <div className="instructions-header-row">
                    <h3>Instructions</h3>
                    {exerciseImages.length > 0 && (
                      <button type="button" className="instructions-photo-btn" onClick={handleOpenImages} aria-label="View exercise photos">
                        <img src="/img/photo.png" alt="" className="instructions-photo-icon" />
                      </button>
                    )}
                  </div>
                  {selectedExercise.instructions && selectedExercise.instructions.length > 0 ? (
                    <ol>
                      {selectedExercise.instructions.map((step, index) => (
                        <li key={`${selectedExercise.id}-step-${index}`}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>No instructions available for this exercise yet.</p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {zoomedImageIndex !== null && exerciseImages[zoomedImageIndex] && (
        <div className="image-zoom-overlay" onClick={() => setZoomedImageIndex(null)}>
          <div className="image-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="image-zoom-view">
              <button
                type="button"
                className="image-close-btn"
                onClick={() => setZoomedImageIndex(null)}
                aria-label="Close image preview"
              >
                [X]
              </button>
              {exerciseImages.length > 1 && (
                <button
                  type="button"
                  className="image-nav-btn left"
                  onClick={() => setZoomedImageIndex((prev) => (prev === null ? 0 : (prev === 0 ? exerciseImages.length - 1 : prev - 1)))}
                >
                  &lt;
                </button>
              )}
              <img src={exerciseImages[zoomedImageIndex]} alt="Exercise enlarged" className="image-zoomed" />
              {exerciseImages.length > 1 && (
                <button
                  type="button"
                  className="image-nav-btn right"
                  onClick={() => setZoomedImageIndex((prev) => (prev === null ? 0 : (prev + 1) % exerciseImages.length))}
                >
                  &gt;
                </button>
              )}
            </div>
            {exerciseImages.length > 1 && (
              <div className="image-zoom-controls">
                <span>{zoomedImageIndex + 1}/{exerciseImages.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Exercises
