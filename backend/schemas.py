from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Exercise schemas
class ExerciseBase(BaseModel):
    name: str
    shortcut: Optional[str] = None
    category: Optional[str] = None
    equipment: Optional[str] = None
    description: Optional[str] = None

class ExerciseResponse(ExerciseBase):
    id: int
    is_default: bool
    created_at: datetime
    instructions: Optional[list[str]] = None
    
    class Config:
        from_attributes = True

class ExerciseShortcutUpdate(BaseModel):
    shortcut: str

class CustomExerciseCreate(BaseModel):
    name: str
    shortcut: str
    category: str
    equipment: str
    difficulty: str
    primary_muscles: list[str]
    secondary_muscles: Optional[list[str]] = None
    instructions: list[str]

class CustomExerciseUpdate(CustomExerciseCreate):
    pass

# Workout schemas
class WorkoutCreate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None

class WorkoutResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: Optional[str] = None
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    
    class Config:
        from_attributes = True

# Set schemas
class SetCreate(BaseModel):
    exercise_id: int
    weight: Optional[float] = None
    reps: Optional[int] = None
    set_number: int = 1
    rpe: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[str] = None

class SetResponse(BaseModel):
    id: int
    workout_id: int
    exercise_id: int
    set_number: int
    weight: Optional[float] = None
    reps: Optional[int] = None
    rpe: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    completed_at: datetime
    
    class Config:
        from_attributes = True

# Quick entry schema
class QuickEntryCreate(BaseModel):
    entry: str  # e.g., "sq 225 3x5 !hard" or "bp 135 5x5"

# Auth schemas
class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    name: str

class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    is_email_verified: bool

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    username: str


class PreferencesResponse(BaseModel):
    darkMode: bool
    defaultEntryMode: str
    weightUnit: str
    autoSaveWorkout: bool
    soundEffects: bool
    showExerciseGifs: bool
    exercisesPerPage: int


class PreferencesUpdateRequest(BaseModel):
    darkMode: Optional[bool] = None
    defaultEntryMode: Optional[str] = None
    weightUnit: Optional[str] = None
    autoSaveWorkout: Optional[bool] = None
    soundEffects: Optional[bool] = None
    showExerciseGifs: Optional[bool] = None
    exercisesPerPage: Optional[int] = None
