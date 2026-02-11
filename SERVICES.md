# NessFitness Services

## Service Overview

Two systemd user services run the backend and frontend as background daemons:

- `nessfitness-backend.service` - FastAPI backend (port 8000)
- `nessfitness-frontend.service` - Vite React frontend (port 5173)

**Service files location:** `~/.config/systemd/user/`

## Common Commands

```bash
# Check status
systemctl --user status nessfitness-backend nessfitness-frontend

# Start services
systemctl --user start nessfitness-backend nessfitness-frontend

# Stop services
systemctl --user stop nessfitness-backend nessfitness-frontend

# Restart services (after code changes)
systemctl --user restart nessfitness-backend nessfitness-frontend

# View logs (live)
journalctl --user -u nessfitness-backend -f
journalctl --user -u nessfitness-frontend -f

# View recent logs
journalctl --user -u nessfitness-backend -n 50
journalctl --user -u nessfitness-frontend -n 50

# Disable auto-start on login
systemctl --user disable nessfitness-backend nessfitness-frontend

# Enable auto-start on login
systemctl --user enable nessfitness-backend nessfitness-frontend

# Reload systemd after editing service files
systemctl --user daemon-reload
```

## Service Details

**Backend:**
- Working directory: `/home/aidan/NessFitness/backend`
- Command: `venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000`
- Auto-restarts on crash

**Frontend:**
- Working directory: `/home/aidan/NessFitness/frontend`
- Command: `npm run dev -- --host 0.0.0.0 --port 5173`
- Auto-restarts on crash

## Access URLs

- Backend API: http://localhost:8000 or http://192.168.6.13:8000
- Backend Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173 or http://192.168.6.13:5173

## Notes

- Services auto-start when you log in
- Services run in the background (don't need terminal open)
- Hot-reload is enabled for development
- Logs are managed by systemd
