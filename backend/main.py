from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import func, text, asc, desc, String
from datetime import datetime
import os
from jose import jwt, JWTError
from passlib.context import CryptContext

from database import engine, get_db, Base
from models import User, Exercise, Workout, Set, UserPreferences
from schemas import (
    WorkoutCreate,
    WorkoutResponse,
    SetCreate,
    SetResponse,
    QuickEntryCreate,
    ExerciseShortcutUpdate,
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserProfileResponse,
    ProfileUpdateRequest,
    CustomExerciseCreate,
    CustomExerciseUpdate,
    PreferencesResponse,
    PreferencesUpdateRequest,
)
from parser import QuickEntryParser

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NessFitness API")

security = HTTPBearer()
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", str(60 * 60 * 24 * 7)))

DEFAULT_PREFERENCES = {
    "dark_mode": True,
    "default_entry_mode": "quick",
    "weight_unit": "lbs",
    "auto_save_workout": True,
    "sound_effects": False,
    "show_exercise_gifs": True,
    "exercises_per_page": 50,
}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(user: User) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "iat": int(now.timestamp()),
        "exp": int(now.timestamp()) + ACCESS_TOKEN_EXPIRE_SECONDS,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def ensure_user_auth_columns() -> None:
    """Add auth columns for existing SQLite DBs created before auth fields existed."""
    with engine.begin() as conn:
        result = conn.execute(text("PRAGMA table_info(users)"))
        existing_columns = {row[1] for row in result.fetchall()}

        if "password_hash" not in existing_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
        if "is_email_verified" not in existing_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0"))


ensure_user_auth_columns()


def get_or_create_preferences(db: Session, user: User) -> UserPreferences:
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user.id).first()
    if prefs:
        return prefs

    prefs = UserPreferences(user_id=user.id, **DEFAULT_PREFERENCES)
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    return prefs


def preferences_to_response(prefs: UserPreferences) -> PreferencesResponse:
    return PreferencesResponse(
        darkMode=prefs.dark_mode,
        defaultEntryMode=prefs.default_entry_mode,
        weightUnit=prefs.weight_unit,
        autoSaveWorkout=prefs.auto_save_workout,
        soundEffects=prefs.sound_effects,
        showExerciseGifs=prefs.show_exercise_gifs,
        exercisesPerPage=prefs.exercises_per_page,
    )

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


# Auth endpoints
@app.post("/api/auth/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    name = payload.username.strip()
    password = payload.password

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not name:
        raise HTTPException(status_code=400, detail="Username is required")
    if len(name) > 16:
        raise HTTPException(status_code=400, detail="Username must be 16 characters or fewer")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = User(
        email=email,
        name=name,
        password_hash=hash_password(password),
        is_email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        name=user.name,
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(User).filter(func.lower(User.email) == email).first()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user)
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        name=user.name,
    )


@app.get("/api/auth/me", response_model=UserProfileResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.patch("/api/auth/profile", response_model=UserProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if len(username) > 16:
        raise HTTPException(status_code=400, detail="Username must be 16 characters or fewer")

    current_user.name = username
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/api/preferences", response_model=PreferencesResponse)
def get_preferences(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prefs = get_or_create_preferences(db, current_user)
    return preferences_to_response(prefs)


@app.put("/api/preferences", response_model=PreferencesResponse)
def update_preferences(
    payload: PreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = get_or_create_preferences(db, current_user)

    if payload.defaultEntryMode is not None:
        if payload.defaultEntryMode not in {"form", "quick"}:
            raise HTTPException(status_code=400, detail="Invalid default entry mode")
        prefs.default_entry_mode = payload.defaultEntryMode

    if payload.weightUnit is not None:
        if payload.weightUnit not in {"lbs", "kg"}:
            raise HTTPException(status_code=400, detail="Invalid weight unit")
        prefs.weight_unit = payload.weightUnit

    if payload.exercisesPerPage is not None:
        if payload.exercisesPerPage not in {25, 50, 100}:
            raise HTTPException(status_code=400, detail="Invalid exercises per page")
        prefs.exercises_per_page = payload.exercisesPerPage

    if payload.darkMode is not None:
        prefs.dark_mode = payload.darkMode

    if payload.autoSaveWorkout is not None:
        prefs.auto_save_workout = payload.autoSaveWorkout

    if payload.soundEffects is not None:
        prefs.sound_effects = payload.soundEffects

    if payload.showExerciseGifs is not None:
        prefs.show_exercise_gifs = payload.showExerciseGifs

    db.commit()
    db.refresh(prefs)
    return preferences_to_response(prefs)

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
    body_part: str = None,
    exercise_type: str = "all",
    difficulty: str = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    db: Session = Depends(get_db)
):
    """Get exercises with pagination and filtering"""
    query = db.query(Exercise)
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        search_term_lower = f"%{search.strip().lower()}%"
        query = query.filter(
            (Exercise.name.ilike(search_term)) |
            (Exercise.shortcut.ilike(search_term)) |
            (func.lower(func.cast(Exercise.body_parts, String)).like(search_term_lower)) |
            (func.lower(func.cast(Exercise.target_muscles, String)).like(search_term_lower)) |
            (func.lower(func.cast(Exercise.secondary_muscles, String)).like(search_term_lower))
        )
    
    if category:
        query = query.filter(Exercise.category.ilike(f"%{category}%"))
    
    if equipment:
        query = query.filter(Exercise.equipment.ilike(f"%{equipment}%"))

    if body_part:
        body_part_term = f"%{body_part.strip().lower()}%"
        query = query.filter(
            func.lower(func.cast(Exercise.body_parts, String)).like(body_part_term)
        )

    if exercise_type == "custom":
        query = query.filter(Exercise.is_default == False)
    elif exercise_type == "default":
        query = query.filter(Exercise.is_default == True)

    if difficulty:
        difficulty_lower = difficulty.strip().lower()
        query = query.filter(func.lower(Exercise.description).like(f"{difficulty_lower}%"))

    sort_columns = {
        "name": Exercise.name,
        "shortcut": Exercise.shortcut,
        "category": Exercise.category,
        "equipment": Exercise.equipment,
    }
    selected_sort_column = sort_columns.get(sort_by, Exercise.name)
    if sort_order and sort_order.lower() == "desc":
        query = query.order_by(desc(selected_sort_column), asc(Exercise.id))
    else:
        query = query.order_by(asc(selected_sort_column), asc(Exercise.id))
    
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


@app.get("/api/exercises/filters")
def get_exercise_filters(db: Session = Depends(get_db)):
    """Return filter options for exercises page."""
    categories = [
        row[0] for row in db.query(Exercise.category)
        .filter(Exercise.category.isnot(None), Exercise.category != "")
        .distinct()
        .order_by(Exercise.category.asc())
        .all()
    ]

    equipment = [
        row[0] for row in db.query(Exercise.equipment)
        .filter(Exercise.equipment.isnot(None), Exercise.equipment != "")
        .distinct()
        .order_by(Exercise.equipment.asc())
        .all()
    ]

    difficulties = ["beginner", "intermediate", "expert"]

    body_parts = set()
    muscle_rows = db.query(Exercise.body_parts, Exercise.target_muscles).all()
    for body_parts_value, target_muscles_value in muscle_rows:
        if isinstance(body_parts_value, list):
            for part in body_parts_value:
                if part:
                    body_parts.add(part)
        if isinstance(target_muscles_value, list):
            for part in target_muscles_value:
                if part:
                    body_parts.add(part)

    return {
        "categories": categories,
        "equipment": equipment,
        "body_parts": sorted(body_parts),
        "difficulties": difficulties,
        "sort_by": ["name", "shortcut", "category", "equipment"],
        "sort_order": ["asc", "desc"],
    }

@app.get("/api/exercises/{exercise_id}")
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise

@app.patch("/api/exercises/{exercise_id}/shortcut")
def update_exercise_shortcut(
    exercise_id: int,
    payload: ExerciseShortcutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an exercise shortcut and ensure it remains unique."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    new_shortcut = payload.shortcut.strip().lower()
    if not new_shortcut:
        raise HTTPException(status_code=400, detail="Shortcut cannot be empty")
    if len(new_shortcut) > 20:
        raise HTTPException(status_code=400, detail="Shortcut must be 20 characters or fewer")

    existing = db.query(Exercise).filter(
        Exercise.id != exercise_id,
        func.lower(Exercise.shortcut) == new_shortcut
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Shortcut '{new_shortcut}' is already used by '{existing.name}'"
        )

    exercise.shortcut = new_shortcut
    db.commit()
    db.refresh(exercise)

    return {
        "success": True,
        "exercise": exercise
    }


@app.post("/api/exercises/custom")
def create_custom_exercise(
    payload: CustomExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    name = payload.name.strip()
    shortcut = payload.shortcut.strip().lower()
    category = payload.category.strip().lower()
    equipment = payload.equipment.strip().lower()
    difficulty = payload.difficulty.strip().lower()
    primary_muscles = [m.strip().lower() for m in payload.primary_muscles if m and m.strip()]
    secondary_muscles = [m.strip().lower() for m in (payload.secondary_muscles or []) if m and m.strip()]
    instructions = [step.strip() for step in payload.instructions if step and step.strip()]

    if not name:
        raise HTTPException(status_code=400, detail="Exercise name is required")
    if not shortcut:
        raise HTTPException(status_code=400, detail="Shortcut is required")
    if len(shortcut) > 20:
        raise HTTPException(status_code=400, detail="Shortcut must be 20 characters or fewer")
    if not category:
        raise HTTPException(status_code=400, detail="Category is required")
    if not equipment:
        raise HTTPException(status_code=400, detail="Equipment is required")
    if difficulty not in {"beginner", "intermediate", "expert"}:
        raise HTTPException(status_code=400, detail="Difficulty must be beginner, intermediate, or expert")
    if not primary_muscles:
        raise HTTPException(status_code=400, detail="At least one primary muscle is required")
    if not instructions:
        raise HTTPException(status_code=400, detail="At least one instruction step is required")

    existing_shortcut = db.query(Exercise).filter(func.lower(Exercise.shortcut) == shortcut).first()
    if existing_shortcut:
        raise HTTPException(status_code=409, detail=f"Shortcut '{shortcut}' is already in use")

    description = f"{difficulty} | custom | custom"

    exercise = Exercise(
        name=name,
        shortcut=shortcut,
        category=category,
        equipment=equipment,
        description=description,
        is_default=False,
        created_by=current_user.id,
        target_muscles=primary_muscles,
        body_parts=primary_muscles,
        secondary_muscles=secondary_muscles,
        instructions=instructions,
    )

    db.add(exercise)
    db.commit()
    db.refresh(exercise)

    return {
        "success": True,
        "exercise": exercise,
    }


@app.get("/api/custom-exercises")
def get_custom_exercises(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exercises = db.query(Exercise).filter(
        Exercise.is_default == False,
        Exercise.created_by == current_user.id
    ).order_by(Exercise.created_at.desc()).all()
    return exercises


@app.put("/api/exercises/custom/{exercise_id}")
def update_custom_exercise(
    exercise_id: int,
    payload: CustomExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exercise = db.query(Exercise).filter(
        Exercise.id == exercise_id,
        Exercise.is_default == False,
        Exercise.created_by == current_user.id
    ).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Custom exercise not found")

    name = payload.name.strip()
    shortcut = payload.shortcut.strip().lower()
    category = payload.category.strip().lower()
    equipment = payload.equipment.strip().lower()
    difficulty = payload.difficulty.strip().lower()
    primary_muscles = [m.strip().lower() for m in payload.primary_muscles if m and m.strip()]
    secondary_muscles = [m.strip().lower() for m in (payload.secondary_muscles or []) if m and m.strip()]
    instructions = [step.strip() for step in payload.instructions if step and step.strip()]

    if not name:
        raise HTTPException(status_code=400, detail="Exercise name is required")
    if not shortcut:
        raise HTTPException(status_code=400, detail="Shortcut is required")
    if len(shortcut) > 20:
        raise HTTPException(status_code=400, detail="Shortcut must be 20 characters or fewer")
    if not category:
        raise HTTPException(status_code=400, detail="Category is required")
    if not equipment:
        raise HTTPException(status_code=400, detail="Equipment is required")
    if difficulty not in {"beginner", "intermediate", "expert"}:
        raise HTTPException(status_code=400, detail="Difficulty must be beginner, intermediate, or expert")
    if not primary_muscles:
        raise HTTPException(status_code=400, detail="At least one primary muscle is required")
    if not instructions:
        raise HTTPException(status_code=400, detail="At least one instruction step is required")

    existing_shortcut = db.query(Exercise).filter(
        Exercise.id != exercise_id,
        func.lower(Exercise.shortcut) == shortcut
    ).first()
    if existing_shortcut:
        raise HTTPException(status_code=409, detail=f"Shortcut '{shortcut}' is already in use")

    exercise.name = name
    exercise.shortcut = shortcut
    exercise.category = category
    exercise.equipment = equipment
    exercise.description = f"{difficulty} | custom | custom"
    exercise.target_muscles = primary_muscles
    exercise.body_parts = primary_muscles
    exercise.secondary_muscles = secondary_muscles
    exercise.instructions = instructions

    db.commit()
    db.refresh(exercise)
    return {
        "success": True,
        "exercise": exercise,
    }


@app.delete("/api/exercises/custom/{exercise_id}")
def delete_custom_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exercise = db.query(Exercise).filter(
        Exercise.id == exercise_id,
        Exercise.is_default == False,
        Exercise.created_by == current_user.id
    ).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Custom exercise not found")

    db.delete(exercise)
    db.commit()
    return {"success": True}

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
