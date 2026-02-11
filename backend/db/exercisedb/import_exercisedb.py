"""
Import exercises from ExerciseDB API
https://exercisedb.dev

This script fetches exercises from ExerciseDB and stores them in the local database.
According to AGPL v3 license, we can use this data for personal/private use.

Attribution: ExerciseDB (https://exercisedb.dev) - AGPL v3 License
"""

import requests
import time
from database import SessionLocal
from models import Exercise

EXERCISEDB_BASE_URL = "https://exercisedb.dev/api/v1"

def fetch_all_exercises(limit=25, max_pages=None):
    """
    Fetch all exercises from ExerciseDB API with pagination
    
    Args:
        limit: Number of exercises per page (max 25)
        max_pages: Maximum number of pages to fetch (None = all pages)
    """
    exercises = []
    offset = 0
    page = 1
    
    print(f"🔄 Fetching exercises from ExerciseDB API...")
    
    while True:
        if max_pages and page > max_pages:
            break
            
        url = f"{EXERCISEDB_BASE_URL}/exercises?offset={offset}&limit={limit}"
        print(f"📥 Fetching page {page} (offset={offset}, limit={limit})...")
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data.get('success') or not data.get('data'):
                print(f"❌ No more data available")
                break
            
            page_exercises = data['data']
            exercises.extend(page_exercises)
            
            print(f"✅ Fetched {len(page_exercises)} exercises (total: {len(exercises)})")
            
            # Check if we've reached the end
            metadata = data.get('metadata', {})
            if not metadata.get('nextPage'):
                print(f"✅ Reached final page")
                break
            
            offset += limit
            page += 1
            
            # Be respectful - add longer delay to avoid rate limiting
            # ExerciseDB has rate limits, so we need to be patient
            print(f"⏳ Waiting 3 seconds before next request...")
            time.sleep(3)
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                print(f"⚠️  Rate limit hit! Please wait a few minutes before running again.")
                print(f"✅ Successfully fetched {len(exercises)} exercises so far.")
                break
            else:
                print(f"❌ HTTP Error fetching page {page}: {e}")
                break
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching page {page}: {e}")
            break
    
    print(f"✅ Total exercises fetched: {len(exercises)}")
    return exercises

def import_to_database(exercises_data):
    """
    Import exercises into the local database
    """
    db = SessionLocal()
    imported_count = 0
    skipped_count = 0
    
    try:
        print(f"\n💾 Importing {len(exercises_data)} exercises to database...")
        
        for ex_data in exercises_data:
            # Check if exercise already exists
            existing = db.query(Exercise).filter(
                Exercise.exercisedb_id == ex_data['exerciseId']
            ).first()
            
            if existing:
                print(f"⏭️  Skipping '{ex_data['name']}' (already exists)")
                skipped_count += 1
                continue
            
            # Extract equipment (use first one if multiple)
            equipment = ex_data.get('equipments', [])
            equipment_str = equipment[0] if equipment else None
            
            # Extract category (use first body part as category)
            body_parts = ex_data.get('bodyParts', [])
            category = body_parts[0] if body_parts else None
            
            # Create exercise
            exercise = Exercise(
                name=ex_data['name'],
                exercisedb_id=ex_data['exerciseId'],
                gif_url=ex_data.get('gifUrl'),
                target_muscles=ex_data.get('targetMuscles', []),
                body_parts=body_parts,
                equipment=equipment_str,
                category=category,
                secondary_muscles=ex_data.get('secondaryMuscles', []),
                instructions=ex_data.get('instructions', []),
                is_default=True,
                shortcut=None  # We'll assign shortcuts later
            )
            
            db.add(exercise)
            imported_count += 1
            
            if imported_count % 50 == 0:
                print(f"💾 Committed {imported_count} exercises...")
                db.commit()
        
        db.commit()
        print(f"\n✅ Import complete!")
        print(f"   📥 Imported: {imported_count}")
        print(f"   ⏭️  Skipped: {skipped_count}")
        
    except Exception as e:
        print(f"❌ Error during import: {e}")
        db.rollback()
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
    print("🏋️  ExerciseDB Importer")
    print("=" * 60)
    print("Attribution: ExerciseDB (https://exercisedb.dev)")
    print("License: AGPL v3")
    print("=" * 60)
    print()
    print("⚠️  Note: ExerciseDB has rate limits. Fetching 10 pages at a time.")
    print("   If you hit rate limits, wait a few minutes and run again.")
    print()
    
    # Fetch exercises from API (10 pages = ~250 exercises per run)
    exercises = fetch_all_exercises(limit=25, max_pages=10)
    
    if exercises:
        # Import to database
        import_to_database(exercises)
        
        # Show statistics
        show_stats()
    else:
        print("❌ No exercises fetched. Check your internet connection.")
    
    print("\n✅ Done!")
    print("💡 Tip: Run this script multiple times to import more exercises.")
