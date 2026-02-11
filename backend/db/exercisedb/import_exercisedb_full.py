"""
Import full ExerciseDB dataset from GitHub
This bypasses API rate limits by downloading the complete dataset at once.

Attribution: ExerciseDB (https://exercisedb.dev) - AGPL v3 License
"""

import requests
import json
from database import SessionLocal
from models import Exercise

# ExerciseDB's GitHub repository with full dataset
DATASET_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"

def download_full_dataset():
    """Download the complete exercise dataset from GitHub"""
    print("🔄 Downloading full ExerciseDB dataset from GitHub...")
    print(f"📍 URL: {DATASET_URL}")
    
    try:
        response = requests.get(DATASET_URL, timeout=30)
        response.raise_for_status()
        exercises = response.json()
        print(f"✅ Downloaded {len(exercises)} exercises!")
        return exercises
    except requests.exceptions.RequestException as e:
        print(f"❌ Error downloading dataset: {e}")
        return None

def import_to_database(exercises_data):
    """Import exercises into the local database"""
    db = SessionLocal()
    imported_count = 0
    skipped_count = 0
    updated_count = 0
    
    try:
        print(f"\n💾 Importing {len(exercises_data)} exercises to database...")
        
        for ex_data in exercises_data:
            # ExerciseDB's free dataset structure is slightly different
            exercise_id = ex_data.get('id', ex_data.get('exerciseId'))
            
            # Check if exercise already exists
            existing = db.query(Exercise).filter(
                Exercise.exercisedb_id == exercise_id
            ).first()
            
            if existing:
                skipped_count += 1
                if skipped_count % 100 == 0:
                    print(f"⏭️  Skipped {skipped_count} existing exercises...")
                continue
            
            # Extract data with fallbacks for different JSON structures
            name = ex_data.get('name', 'Unknown Exercise')
            equipment = ex_data.get('equipment', ex_data.get('equipments', []))
            if isinstance(equipment, list):
                equipment = equipment[0] if equipment else None
            
            body_parts = ex_data.get('bodyParts', ex_data.get('bodyPart', []))
            if isinstance(body_parts, str):
                body_parts = [body_parts]
            
            target_muscles = ex_data.get('targetMuscles', ex_data.get('target', []))
            if isinstance(target_muscles, str):
                target_muscles = [target_muscles]
            
            secondary_muscles = ex_data.get('secondaryMuscles', [])
            if isinstance(secondary_muscles, str):
                secondary_muscles = [secondary_muscles]
            
            category = body_parts[0] if body_parts else None
            
            # Create exercise
            exercise = Exercise(
                name=name,
                exercisedb_id=exercise_id,
                gif_url=ex_data.get('gifUrl'),
                target_muscles=target_muscles if target_muscles else [],
                body_parts=body_parts if body_parts else [],
                equipment=equipment,
                category=category,
                secondary_muscles=secondary_muscles if secondary_muscles else [],
                instructions=ex_data.get('instructions', []),
                is_default=True,
                shortcut=None  # We'll assign shortcuts later
            )
            
            db.add(exercise)
            imported_count += 1
            
            if imported_count % 100 == 0:
                print(f"💾 Imported {imported_count} exercises...")
                db.commit()
        
        db.commit()
        print(f"\n✅ Import complete!")
        print(f"   📥 Imported: {imported_count}")
        print(f"   ⏭️  Skipped: {skipped_count}")
        
    except Exception as e:
        print(f"❌ Error during import: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def show_stats():
    """Show database statistics"""
    db = SessionLocal()
    try:
        total = db.query(Exercise).count()
        from_exercisedb = db.query(Exercise).filter(Exercise.exercisedb_id.isnot(None)).count()
        custom = total - from_exercisedb
        
        print(f"\n📊 Database Statistics:")
        print(f"   Total exercises: {total}")
        print(f"   From ExerciseDB: {from_exercisedb}")
        print(f"   Custom exercises: {custom}")
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("🏋️  ExerciseDB Full Dataset Importer")
    print("=" * 60)
    print("Attribution: ExerciseDB (https://exercisedb.dev)")
    print("License: AGPL v3")
    print("Source: GitHub - yuhonas/free-exercise-db")
    print("=" * 60)
    print()
    
    # Download full dataset
    exercises = download_full_dataset()
    
    if exercises:
        # Import to database
        import_to_database(exercises)
        
        # Show statistics
        show_stats()
        
        print("\n✅ Done! No rate limits - full dataset imported!")
    else:
        print("❌ Failed to download dataset.")
        print("💡 Try again or use import_exercisedb.py with API")
