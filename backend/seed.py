import json
from database import SessionLocal, engine, Base
from models import Exercise

def seed_exercises():
    """Load default exercises from exercises.json into the database"""
    db = SessionLocal()
    
    try:
        # Check if exercises already exist
        existing_count = db.query(Exercise).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} exercises. Skipping seed.")
            return
        
        # Load exercises from JSON
        with open('exercises.json', 'r') as f:
            exercises_data = json.load(f)
        
        # Create Exercise objects
        for ex_data in exercises_data:
            exercise = Exercise(
                name=ex_data['name'],
                shortcut=ex_data['shortcut'],
                category=ex_data['category'],
                equipment=ex_data['equipment'],
                description=ex_data.get('description'),
                is_default=True
            )
            db.add(exercise)
        
        db.commit()
        print(f"Successfully seeded {len(exercises_data)} exercises!")
        
    except Exception as e:
        print(f"Error seeding exercises: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Seed exercises
    seed_exercises()
