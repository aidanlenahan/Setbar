# ExerciseDB Integration Guide

## Overview

NessFitness now integrates with [ExerciseDB.dev](https://exercisedb.dev), an open-source fitness exercise database with 1,500+ structured exercises featuring GIF demonstrations, target muscles, equipment, and instructions.

## License Compliance

**ExerciseDB License:** AGPL v3  
**NessFitness License:** AGPL v3 (already compliant)

✅ **You can legally use ExerciseDB data because:**
- Both projects use AGPL v3
- NessFitness is open source (GitHub)
- Personal homelab use is explicitly permitted
- Proper attribution is provided in the UI

⚠️ **AGPL v3 Requirements:**
- Keep NessFitness source code publicly available ✅ (GitHub)
- Include copyright notices ✅ (Preferences page)
- Provide source access to users who interact with your app ✅ (GitHub link)

## Importing Exercises

### Quick Start
```bash
cd /home/aidan/NessFitness/backend
source venv/bin/activate
python import_exercisedb.py
```

### What It Does
1. Fetches 10 pages (~250 exercises) from ExerciseDB API
2. Imports exercises with metadata into local SQLite database
3. Skips duplicates automatically
4. Handles rate limiting gracefully

### Rate Limiting
ExerciseDB has API rate limits. The script:
- Waits 3 seconds between requests
- Fetches 10 pages per run (~250 exercises)
- Shows helpful messages if rate limited

**If you hit rate limits:**
- Wait 5-10 minutes
- Run the script again to continue
- Already imported exercises are skipped

### Import All Exercises
To import the full database (1,500+ exercises):
```bash
# Run multiple times with 5-minute breaks
python import_exercisedb.py  # First 250
# Wait 5 minutes...
python import_exercisedb.py  # Next 250
# Wait 5 minutes...
python import_exercisedb.py  # Next 250
# Continue until all imported
```

### View Import Status
```bash
# Check total count
curl localhost:8000/api/exercises | jq 'length'

# View sample exercises
curl localhost:8000/api/exercises | jq '.[0:3]'
```

## Database Schema

### Updated Exercise Model
```python
class Exercise:
    # Original fields
    id: int
    name: str
    shortcut: str  # e.g., "sq"
    category: str
    equipment: str
    description: str
    is_default: bool
    created_by: int
    created_at: datetime
    
    # ExerciseDB fields
    exercisedb_id: str  # External ID
    gif_url: str  # Animation URL
    target_muscles: list[str]  # Primary muscles
    body_parts: list[str]  # Body parts
    secondary_muscles: list[str]  # Secondary muscles
    instructions: list[str]  # Step-by-step guide
```

## ExerciseDB Data Structure

### Example Exercise
```json
{
  "exerciseId": "ztAa1RK",
  "name": "Barbell Squat",
  "gifUrl": "https://exercisedb.dev/gifs/ztAa1RK.gif",
  "targetMuscles": ["quadriceps", "glutes"],
  "bodyParts": ["lower legs", "upper legs"],
  "equipments": ["barbell"],
  "secondaryMuscles": ["hamstrings", "calves"],
  "instructions": [
    "Stand with feet shoulder-width apart",
    "Lower your body by bending knees",
    "Push through heels to return to start"
  ]
}
```

## Frontend Integration

### Exercise Library (Exercises Page)
- Shows all exercises with GIFs
- Filterable by muscle group, equipment, body part
- Click exercise to view details and instructions
- GIFs can be toggled in Preferences

### Preferences Page
- **Dark Mode:** Toggle between light/dark themes
- **Default Entry Mode:** Choose Quick Entry or Form Mode
- **Weight Unit:** Display lbs or kg
- **Show Exercise GIFs:** Enable/disable animations
- **Attribution:** Links to ExerciseDB and license info

### Using Preferences
```tsx
// Getting preferences in any component
const storedPrefs = localStorage.getItem('nessfitness-preferences')
const prefs = storedPrefs ? JSON.parse(storedPrefs) : DEFAULT_PREFERENCES

// Preferences shape
interface PreferencesData {
  darkMode: boolean
  defaultEntryMode: 'form' | 'quick'
  weightUnit: 'lbs' | 'kg'
  autoSaveWorkout: boolean
  soundEffects: boolean
  showExerciseGifs: boolean
}
```

## API Endpoints

### ExerciseDB Proxy (Optional Future Feature)
If you want to avoid rate limits, you can proxy ExerciseDB:
```python
@app.get("/api/exercisedb/search")
async def search_exercisedb(q: str):
    """Proxy search requests to ExerciseDB"""
    # Cache results locally
    # Return from cache if available
    # Otherwise fetch from ExerciseDB
```

## Offline Usage

Since exercises are cached locally:
- ✅ App works without internet after initial import
- ✅ Faster than API calls
- ✅ No rate limit concerns
- ✅ Can work on LAN without WAN access

## Attribution Requirements

### In UI (Already Implemented)
Preferences page includes:
```
Exercise database powered by ExerciseDB (https://exercisedb.dev)
Licensed under AGPL v3
```

### In Source Code
All files include appropriate headers:
```python
"""
Attribution: ExerciseDB (https://exercisedb.dev) - AGPL v3 License
"""
```

## Advanced: Custom Exercises

You can still add custom exercises:
```bash
curl -X POST localhost:8000/api/exercises \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Exercise",
    "shortcut": "mce",
    "category": "custom",
    "equipment": "none",
    "is_default": false
  }'
```

Custom exercises:
- Don't have `exercisedb_id` (null)
- Have `is_default: false`
- Can be edited/deleted by users
- Show alongside ExerciseDB exercises

## Troubleshooting

### Import Failed
```bash
# Check internet connection
ping exercisedb.dev

# Check database exists
ls -lh /home/aidan/NessFitness/backend/nessfitness.db

# Check backend logs
journalctl --user -u nessfitness-backend -n 50
```

### Rate Limited
```bash
# Check how many exercises you have
curl localhost:8000/api/exercises | jq 'length'

# If < 250, wait 5 minutes and retry
# If >= 250, you're making progress!
```

### Database Reset
```bash
# Backup first!
cd /home/aidan/NessFitness/backend
cp nessfitness.db nessfitness.db.backup

# Delete and restart backend (recreates tables)
rm nessfitness.db
systemctl --user restart nessfitness-backend

# Recreate user
python create_default_user.py

# Re-import exercises
python import_exercisedb.py
```

## Future Enhancements

### Planned Features
- [ ] Exercise search with fuzzy matching
- [ ] Filter by muscle group, equipment, body part
- [ ] Exercise detail modal with GIF and instructions
- [ ] Favorite exercises
- [ ] Exercise history (track which exercises you do most)
- [ ] Progressive overload tracking per exercise
- [ ] Exercise recommendations based on workout history

### API v2 Integration
ExerciseDB offers a v2 API with enhanced features:
- Better categorization
- Video demonstrations
- Difficulty ratings
- More detailed instructions

When ready to upgrade:
```python
# Update EXERCISEDB_BASE_URL
EXERCISEDB_BASE_URL = "https://v2.exercisedb.dev/api"
```

## Legal Summary

✅ **You're fully compliant because:**
1. AGPL v3 allows personal use
2. AGPL v3 allows creating local copies
3. Your project is already open source (AGPL v3)
4. You provide attribution
5. Source code is publicly available on GitHub

❌ **You would violate the license if:**
- You made it proprietary/closed source
- You removed attribution
- You failed to provide source code to users
- You sublicensed under non-AGPL terms

**Since none of these apply, you're good! 🎉**

## Resources

- **ExerciseDB Website:** https://exercisedb.dev
- **ExerciseDB GitHub:** Check their docs for latest info
- **AGPL v3 License:** https://www.gnu.org/licenses/agpl-3.0.en.html
- **NessFitness GitHub:** Your repository (keep it public!)

---

**Built with ❤️ using ExerciseDB**
