"""
Import exercises from wrkout/exercises.json GitHub repository
Public domain exercise dataset - no licensing concerns!

Repository: https://github.com/wrkout/exercises.json
License: Public Domain (CC0)

This downloads all exercise.json files from the repo and stores them locally.
Once imported, you don't need internet access.
"""

import requests
import time
from database import SessionLocal
from models import Exercise

GITHUB_API_BASE = "https://api.github.com/repos/wrkout/exercises.json"
RAW_BASE = "https://raw.githubusercontent.com/wrkout/exercises.json/master"

def get_exercise_directories():
    """Fetch list of all exercise directories from GitHub"""
    print("Fetching exercise list from GitHub...")
    
    try:
        url = f"{GITHUB_API_BASE}/contents/exercises"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        directories = [
            item['name'] for item in response.json() 
            if item['type'] == 'dir'
        ]
        
        print(f"Found {len(directories)} exercises")
        return directories
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching exercise list: {e}")
        return []

def download_exercise(exercise_dir):
    """Download a single exercise.json file"""
    url = f"{RAW_BASE}/exercises/{exercise_dir}/exercise.json"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Warning: Failed to download {exercise_dir}: {e}")
        return None

def import_to_database(exercises_data):
    """Import exercises into the local database"""
    db = SessionLocal()
    imported_count = 0
    skipped_count = 0
    error_count = 0
    
    # Track used shortcuts to avoid duplicates
    used_shortcuts = set()
    
    # Get existing shortcuts from database
    existing_shortcuts = db.query(Exercise.shortcut).all()
    for (shortcut,) in existing_shortcuts:
        if shortcut:
            used_shortcuts.add(shortcut.lower())
    
    try:
        print(f"\nImporting {len(exercises_data)} exercises to database...")
        
        for exercise_name, ex_data in exercises_data.items():
            if not ex_data:
                error_count += 1
                continue
            
            try:
                # Check if exercise already exists by name
                existing = db.query(Exercise).filter(
                    Exercise.name == ex_data['name']
                ).first()
                
                if existing:
                    skipped_count += 1
                    if skipped_count % 50 == 0:
                        print(f"Skipped {skipped_count} existing exercises...")
                    continue
                
                # Map wrkout fields to our database structure
                primary_muscles = ex_data.get('primaryMuscles', [])
                secondary_muscles = ex_data.get('secondaryMuscles', [])
                body_parts = primary_muscles.copy() if primary_muscles else []
                
                # Create shortcut from name - make it unique
                name_parts = ex_data['name'].lower().split()
                # Try first letters of words
                shortcut = ''.join(word[0] for word in name_parts[:3] if word)
                
                # If too short or duplicate, use more letters
                if len(shortcut) < 2 or shortcut in used_shortcuts:
                    # Use first 2 letters of first word + first letter of rest
                    if name_parts:
                        shortcut = name_parts[0][:2]
                        if len(name_parts) > 1:
                            shortcut += ''.join(word[0] for word in name_parts[1:3])
                
                # If still duplicate, append number
                original_shortcut = shortcut[:8]
                counter = 2
                while shortcut in used_shortcuts:
                    shortcut = f"{original_shortcut}{counter}"[:10]
                    counter += 1
                
                shortcut = shortcut[:10]  # Limit to 10 chars
                used_shortcuts.add(shortcut)
                
                # Create exercise
                exercise = Exercise(
                    name=ex_data['name'],
                    shortcut=shortcut,
                    category=ex_data.get('category', 'strength'),
                    equipment=ex_data.get('equipment', 'bodyweight'),
                    description=f"{ex_data.get('level', 'intermediate')} | {ex_data.get('mechanic', 'compound')} | {ex_data.get('force', 'N/A')}",
                    is_default=True,
                    target_muscles=primary_muscles if primary_muscles else [],
                    body_parts=body_parts,
                    secondary_muscles=secondary_muscles if secondary_muscles else [],
                    instructions=ex_data.get('instructions', []),
                    exercisedb_id=None,
                    gif_url=None
                )
                
                db.add(exercise)
                imported_count += 1
                
                if imported_count % 50 == 0:
                    print(f"Imported {imported_count} exercises...")
                    db.commit()
                    
            except Exception as e:
                print(f"Error importing {exercise_name}: {e}")
                error_count += 1
                db.rollback()  # Roll back on error and continue
                continue
        
        db.commit()
        print("\nImport complete!")
        print(f"   Imported: {imported_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"   Errors: {error_count}")
        
    except Exception as e:
        print(f"Critical error during import: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def show_stats():
    """Show database statistics"""
    db = SessionLocal()
    try:
        total = db.query(Exercise).count()
        from_wrkout = db.query(Exercise).filter(
            Exercise.exercisedb_id.is_(None),
            Exercise.is_default == True
        ).count()
        custom = db.query(Exercise).filter(Exercise.is_default == False).count()
        
        print("\nDatabase Statistics:")
        print(f"   Total exercises: {total}")
        print(f"   From wrkout: {from_wrkout}")
        print(f"   Custom exercises: {custom}")
        
        # Show a sample
        sample = db.query(Exercise).filter(
            Exercise.exercisedb_id.is_(None)
        ).first()
        if sample:
            print("\nSample Exercise:")
            print(f"   Name: {sample.name}")
            print(f"   Shortcut: {sample.shortcut}")
            print(f"   Equipment: {sample.equipment}")
            print(f"   Category: {sample.category}")
            print(f"   Primary Muscles: {sample.target_muscles}")
            print(f"   Instructions: {len(sample.instructions) if sample.instructions else 0} steps")
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Wrkout Exercises.json Importer")
    print("=" * 60)
    print("Repository: https://github.com/wrkout/exercises.json")
    print("License: Public Domain (CC0)")
    print("=" * 60)
    print()
    print("Note: This will download 873 exercises from GitHub.")
    print("   Takes ~2 minutes with rate limiting.")
    print()
    
    # Get list of exercises
    exercise_dirs = get_exercise_directories()
    
    if not exercise_dirs:
        print("No exercises found. Check your internet connection.")
        exit(1)
    
    # Download all exercises
    print(f"\nDownloading {len(exercise_dirs)} exercises...")
    exercises_data = {}
    
    for i, exercise_dir in enumerate(exercise_dirs, 1):
        exercise_data = download_exercise(exercise_dir)
        if exercise_data:
            exercises_data[exercise_dir] = exercise_data
        
        # Progress indicator
        if i % 25 == 0:
            print(f"Downloaded {i}/{len(exercise_dirs)} exercises...")
        
        # Rate limiting - raw.githubusercontent.com is not rate-limited like API
        time.sleep(0.1)
    
    print(f"Downloaded {len(exercises_data)} exercises successfully")
    
    # Import to database
    if exercises_data:
        import_to_database(exercises_data)
        show_stats()
    
    print("\nDone!")
    print("Your exercises are now stored locally in the database.")
    print("No internet required for the app to work!")
