from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import os

from database import engine, get_db, Base
from models import User, Exercise, Workout, Set
from schemas import WorkoutCreate, WorkoutResponse, SetCreate, SetResponse, QuickEntryCreate
from parser import QuickEntryParser

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NessFitness API")

# CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "NessFitness API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Exercise endpoints

# Lightweight endpoint for dropdowns (only returns id, name, shortcut)
@app.get("/api/exercises/list")
def get_exercises_list(
    search: str = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get lightweight list of exercises for dropdowns (id, name, shortcut only)"""
    query = db.query(Exercise.id, Exercise.name, Exercise.shortcut, Exercise.equipment, Exercise.category)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Exercise.name.ilike(search_term)) |
            (Exercise.shortcut.ilike(search_term)) |
            (Exercise.category.ilike(search_term))
        )
    
    exercises = query.limit(limit).all()
    
    # Convert to dict format
    return [
        {
            "id": ex.id,
            "name": ex.name,
            "shortcut": ex.shortcut,
            "equipment": ex.equipment,
            "category": ex.category
        }
        for ex in exercises
    ]

# Full exercises with pagination
@app.get("/api/exercises")
def get_exercises(
    skip: int = 0,
    limit: int = 50,
    search: str = None,
    category: str = None,
    equipment: str = None,
    db: Session = Depends(get_db)
):
    """Get exercises with pagination and filtering"""
    query = db.query(Exercise)
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(Exercise.name.ilike(search_term))
    
    if category:
        query = query.filter(Exercise.category.ilike(f"%{category}%"))
    
    if equipment:
        query = query.filter(Exercise.equipment.ilike(f"%{equipment}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    exercises = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "exercises": exercises
    }

@app.get("/api/exercises/{exercise_id}")
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    return exercise

# Workout endpoints
@app.get("/api/workouts")
def get_workouts(db: Session = Depends(get_db)):
    # TODO: Filter by current user when auth is implemented
    workouts = db.query(Workout).all()
    return workouts

# Get or create today's workout (MUST be before /{workout_id} route)
@app.get("/api/workouts/today", response_model=WorkoutResponse)
def get_today_workout(db: Session = Depends(get_db)):
    """Get or create today's workout"""
    today = datetime.utcnow().date()
    
    # Find workout started today
    workout = db.query(Workout).filter(
        Workout.started_at >= datetime.combine(today, datetime.min.time())
    ).first()
    
    if not workout:
        # Create new workout for today
        workout = Workout(user_id=1, name=f"Workout {today}")
        db.add(workout)
        db.commit()
        db.refresh(workout)
    
    return workout

@app.get("/api/workouts/{workout_id}")
def get_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    return workout

# Create workout
@app.post("/api/workouts", response_model=WorkoutResponse)
def create_workout(workout_data: WorkoutCreate, db: Session = Depends(get_db)):
    workout = Workout(
        user_id=1,  # Default test user (TODO: Get from auth session)
        name=workout_data.name,
        notes=workout_data.notes
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout

# Add set to workout
@app.post("/api/workouts/{workout_id}/sets", response_model=SetResponse)
def add_set(workout_id: int, set_data: SetCreate, db: Session = Depends(get_db)):
    # Verify workout exists
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Verify exercise exists
    exercise = db.query(Exercise).filter(Exercise.id == set_data.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Create set
    new_set = Set(
        workout_id=workout_id,
        exercise_id=set_data.exercise_id,
        set_number=set_data.set_number,
        weight=set_data.weight,
        reps=set_data.reps,
        rpe=set_data.rpe,
        notes=set_data.notes,
        tags=set_data.tags
    )
    db.add(new_set)
    db.commit()
    db.refresh(new_set)
    return new_set

# Quick entry endpoint
@app.post("/api/quick-entry", response_model=dict)
def quick_entry(entry: QuickEntryCreate, db: Session = Depends(get_db)):
    """
    Parse quick entry and create sets.
    Example: "sq 225 3x5 !hard #belt"
    """
    try:
        # Parse entry
        parsed = QuickEntryParser.parse(entry.entry)
        
        # Find exercise by shortcut
        exercise = db.query(Exercise).filter(
            Exercise.shortcut == parsed['shortcut']
        ).first()
        
        if not exercise:
            raise HTTPException(
                status_code=404, 
                detail=f"Exercise with shortcut '{parsed['shortcut']}' not found"
            )
        
        # Get or create today's workout
        today = datetime.utcnow().date()
        workout = db.query(Workout).filter(
            Workout.started_at >= datetime.combine(today, datetime.min.time())
        ).first()
        
        if not workout:
            workout = Workout(user_id=1, name=f"Workout {today}")
            db.add(workout)
            db.commit()
            db.refresh(workout)
        
        # Get next set number for this exercise in today's workout
        last_set = db.query(Set).filter(
            Set.workout_id == workout.id,
            Set.exercise_id == exercise.id
        ).order_by(Set.set_number.desc()).first()
        
        start_set_number = last_set.set_number + 1 if last_set else 1
        
        # Create sets
        created_sets = []
        for i in range(parsed['sets']):
            new_set = Set(
                workout_id=workout.id,
                exercise_id=exercise.id,
                set_number=start_set_number + i,
                weight=parsed['weight'],
                reps=parsed['reps'],
                notes=parsed['notes'] if parsed['notes'] else None,
                tags=parsed['tags']
            )
            db.add(new_set)
            created_sets.append(new_set)
        
        db.commit()
        
        return {
            "success": True,
            "workout_id": workout.id,
            "exercise": exercise.name,
            "sets_created": len(created_sets),
            "parsed": parsed
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Get workout with sets
@app.get("/api/workouts/{workout_id}/sets")
def get_workout_sets(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    sets = db.query(Set).filter(Set.workout_id == workout_id).all()
    return sets
