import re
from typing import Optional, List, Tuple

class QuickEntryParser:
    """
    Parse quick-entry workout logs like:
    - "sq 225 3x5" -> squat, 225 lbs, 3 sets, 5 reps
    - "bp 135 5x5 !hard" -> bench press, 135 lbs, 5 sets, 5 reps, difficulty flag
    - "dl 315 1x5 #belt" -> deadlift, 315 lbs, 1 set, 5 reps, belt tag
    """
    
    @staticmethod
    def parse(entry: str) -> dict:
        """
        Parse a quick entry string into structured data.
        
        Format: [shortcut] [weight] [sets]x[reps] [!flags] [#tags] [notes]
        
        Returns:
            dict with keys: shortcut, weight, sets, reps, difficulty, tags, notes
        """
        parts = entry.strip().split()
        
        if len(parts) < 3:
            raise ValueError("Entry must have at least: shortcut weight setsxreps")
        
        result = {
            'shortcut': None,
            'weight': None,
            'sets': 1,
            'reps': None,
            'difficulty': None,
            'tags': [],
            'notes': ""
        }
        
        # First part is always the exercise shortcut
        result['shortcut'] = parts[0].lower()
        
        # Second part is weight
        try:
            result['weight'] = float(parts[1])
        except ValueError:
            raise ValueError(f"Invalid weight: {parts[1]}")
        
        # Third part is SxR (sets x reps)
        sets_reps = parts[2]
        if 'x' in sets_reps:
            sets_str, reps_str = sets_reps.split('x')
            try:
                result['sets'] = int(sets_str)
                result['reps'] = int(reps_str)
            except ValueError:
                raise ValueError(f"Invalid sets/reps format: {sets_reps}")
        else:
            # Just reps, assume 1 set
            try:
                result['reps'] = int(sets_reps)
            except ValueError:
                raise ValueError(f"Invalid reps: {sets_reps}")
        
        # Parse remaining parts for flags, tags, and notes
        notes_parts = []
        for i in range(3, len(parts)):
            part = parts[i]
            
            if part.startswith('!'):
                # Difficulty flag
                result['difficulty'] = part[1:]
            elif part.startswith('#'):
                # Tag
                result['tags'].append(part[1:])
            else:
                # Regular notes
                notes_parts.append(part)
        
        if notes_parts:
            result['notes'] = ' '.join(notes_parts)
        
        if result['tags']:
            result['tags'] = ','.join(result['tags'])
        else:
            result['tags'] = None
        
        return result
    
    @staticmethod
    def validate_shortcut(shortcut: str, db_shortcuts: List[str]) -> bool:
        """Check if a shortcut exists in the database"""
        return shortcut.lower() in [s.lower() for s in db_shortcuts]
