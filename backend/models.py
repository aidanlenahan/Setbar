from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    google_id = Column(String, unique=True, nullable=True)  # For OAuth later
    password_hash = Column(String, nullable=True)
    is_email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan")

class Exercise(Base):
    __tablename__ = "exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    shortcut = Column(String, unique=True, nullable=True)  # e.g., "sq" for squat
    category = Column(String, nullable=True)  # chest, legs, back, etc.
    equipment = Column(String, nullable=True)  # barbell, dumbbell, bodyweight
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=True)  # System exercises vs user-created
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Exercise database fields (from wrkout/exercises.json - Public Domain)
    # Note: exercisedb_id is deprecated - kept for backwards compatibility
    exercisedb_id = Column(String, unique=True, nullable=True)  # Deprecated: Previously used for ExerciseDB
    gif_url = Column(String, nullable=True)  # URL to exercise GIF (not available in wrkout)
    target_muscles = Column(JSON, nullable=True)  # List of primary target muscles
    body_parts = Column(JSON, nullable=True)  # List of body parts
    secondary_muscles = Column(JSON, nullable=True)  # List of secondary muscles
    instructions = Column(JSON, nullable=True)  # List of instruction steps
    
    # Relationships
    sets = relationship("Set", back_populates="exercise")

class Workout(Base):
    __tablename__ = "workouts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=True)  # Optional workout name
    notes = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="workouts")
    sets = relationship("Set", back_populates="workout", cascade="all, delete-orphan")

class Set(Base):
    __tablename__ = "sets"
    
    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    set_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    weight = Column(Float, nullable=True)  # Weight used (lbs or kg)
    reps = Column(Integer, nullable=True)  # Reps completed
    rpe = Column(Float, nullable=True)  # Rate of Perceived Exertion (1-10)
    notes = Column(Text, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated: "belt,pr,heavy"
    completed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workout = relationship("Workout", back_populates="sets")
    exercise = relationship("Exercise", back_populates="sets")
