# todo

- make exercises clickable with description and such
- editable shortcuts for each exercise
- scaling on desktop
- scaling on mobile
- how many exercises on each page
  - sort by body part
  - sort by difficulty
  - search by shortcut functionality
  - search by category
  - filter by category
- home
  - remove workout func
- trial mode
  - before logging in, there is a trial mode that has a banner at the top warning user that it is trial mode and nothing will be saved. after user logs in, the message goes away, and user data is saved per account. 
- workout planner/workout suggester based off of variables from exercise.json




## 0) Project Foundation
- Choose project name
- Create GitHub repository
- Add:
  - README
  - `.gitignore`
  - `.env.example`
  - License (MIT)

---

## 1) Tech Stack Setup

**Recommended stack**
- Frontend: React + Vite (PWA-friendly)
- Backend: FastAPI (Python)  
- Database: SQLite → optional Postgres later
- Hosting: Docker on Linux VM/LXC in Proxmox

**Tasks**
- Initialize frontend and backend projects
- Confirm local development works
- Dockerize frontend + backend
- Create `docker-compose.yml`

---

## 2) Basic App Structure
- Design database schema:
  - users
  - exercises
  - workouts
  - sets
- Seed exercise library (JSON → database)
- Create REST API routes:
  - user/auth
  - exercises CRUD
  - workouts CRUD

---

## 3) Authentication

### Phase 1 – Testing
- Protect site with **Cloudflare Access**
- No internal login required yet

### Phase 2 – Real Auth
- Implement **Sign in with Google (OAuth)**
- Store user profile in database
- Add session/JWT authentication for API

---

## 4) Workout Logger (Core MVP)
- Create workout session
- Add exercises to workout
- Log:
  - weight
  - reps
  - sets
  - notes
- Edit and view past workouts

---

## 5) Todoist-Style Quick Entry Parser
Support inputs like:

```

sq 225 3x5 !hard
bp 135 5x5
dl 315 1x5 #belt

```

**Tasks**
- Build tokenizer/parser
- Map shortcuts → exercises
- Parse:
  - `3x5` → sets × reps
  - `!` → difficulty
  - `#` → tags
- Create quick-entry UI input

---

## 6) PWA Support
- Add service worker
- Enable offline caching
- Support “Add to Home Screen”
- Mobile UI polish

---

## 7) UI Dashboard + Charts
- Dashboard showing:
  - recent workouts
  - streak/consistency
  - quick start workout button
- Charts:
  - training volume over time
  - estimated 1RM
  - optional bodyweight tracking
- Use **Recharts** or **Chart.js**

---

## 8) Data Export
- Export workouts to:
  - CSV
  - JSON
- Per-user export endpoint
- Export button in settings

---

## 9) Homelab Deployment
- Run Docker stack inside **Proxmox VM/LXC**
- Expose via **Cloudflare Tunnel**
- Optional protection with **Cloudflare Access**
- HTTPS handled by Cloudflare

---

# Optional Features (Good Portfolio Value)

## High-Impact, Realistic
- Workout templates/routines
- Progressive overload weight suggestions
- Keyboard-first logging mode
- Dark/light theme
- CSV import (not just export)
- Mobile quick-log screen
- Backup and restore system

---

## Advanced / Later Phase
- Garmin API integration
- Social or shared workouts
- AI workout suggestions
- Offline sync conflict resolution
- Multi-device real-time sync

---

# Build Order

1. Logger + database  
2. Google login  
3. Quick-entry parser  
4. Charts/dashboard  
5. PWA support  
6. Cloudflare deployment  
7. Optional extras  
