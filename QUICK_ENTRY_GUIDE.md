# Quick Entry Guide

## Format
```
shortcut weight setsxreps [flags] [#tags] [notes]
```

## Examples

### Basic Entry
```
sq 225 3x5
```
- Exercise: Squat (via "sq" shortcut)
- Weight: 225 lbs
- Sets: 3 sets of 5 reps each

### With Tags
```
bp 185 4x8 #chest
```
- Exercise: Bench Press
- Weight: 185 lbs
- Sets: 4 sets of 8 reps
- Tag: chest

### With Notes
```
dl 315 1x5 felt heavy today
```
- Exercise: Deadlift
- Weight: 315 lbs
- Sets: 1 set of 5 reps
- Notes: "felt heavy today"

### Complete Entry
```
sq 225 3x5 !hard #belt using new shoes
```
- Exercise: Squat
- Weight: 225 lbs
- Sets: 3 sets of 5 reps
- Difficulty flag: hard
- Tag: belt
- Notes: "using new shoes"

## Available Exercise Shortcuts

| Shortcut | Exercise |
|----------|----------|
| sq | Squat (Barbell) |
| bp | Bench Press |
| dl | Deadlift |
| ohp | Overhead Press |
| row | Bent-Over Row |
| pullup | Pull-Up |
| dip | Dips |
| lunge | Lunges |
| legpress | Leg Press |
| legcurl | Leg Curl |
| legext | Leg Extension |
| calfr | Calf Raise |
| latpd | Lat Pulldown |
| seatedrow | Seated Cable Row |
| pecfly | Pec Fly |
| shoulderpress | Shoulder Press (Dumbbell) |
| lateralraise | Lateral Raise |
| bicurlr | Bicep Curl |
| triext | Tricep Extension |
| plank | Plank |

## API Testing

### Quick Entry Endpoint
```bash
curl -X POST http://localhost:8000/api/quick-entry \
  -H "Content-Type: application/json" \
  -d '{"entry": "sq 225 3x5"}'
```

### View Today's Sets
```bash
curl http://localhost:8000/api/workouts/1/sets | jq
```

## Features

- **Auto-incrementing set numbers**: If you log "sq 225 3x5" then "sq 235 2x3", the second entry creates sets 4-5 automatically
- **Same-day workout tracking**: All entries go into today's workout
- **Exercise shortcut lookup**: Uses fuzzy matching on exercise shortcuts
- **Flexible parsing**: Handles tags (#), flags (!), and free-form notes

## Frontend Usage

1. Open http://192.168.6.13:5173 in browser
2. Click "Quick Entry" mode toggle
3. Type: `sq 225 3x5`
4. Press Add Set
5. View logged sets in "Today's Workout" section

## Troubleshooting

### "Exercise not found" error
- Check that shortcut exists in exercise library
- View available shortcuts: `curl http://localhost:8000/api/exercises | jq '.[] | {name, shortcut}'`

### Sets not incrementing
- Verify workout_id matches current workout
- Check set_number in database: `curl http://localhost:8000/api/workouts/1/sets | jq '.[] | {exercise_id, set_number}'`

### Quick entry not parsing
- Ensure format is: `shortcut weight setsxreps`
- Weight must be numeric (int or float)
- Sets/reps must have 'x' separator (e.g., "3x5" not "3 5")
