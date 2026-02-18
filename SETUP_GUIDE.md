# NessFitness Setup Guide

Complete guide to get the full stack running on a Linux VM with VS Code Remote development.

---

## Part 1: Proxmox VM Setup

### 1.1 Create Ubuntu VM
1. In Proxmox, click **Create VM**
2. Configure:
   - **OS:** Ubuntu Server 22.04 or 24.04 LTS
   - **CPU:** 2-4 cores
   - **RAM:** 4096 MB (4 GB)
   - **Storage:** 32 GB
   - **Network:** Bridge to your LAN
3. Start VM and complete Ubuntu installation
4. Note the VM's IP address: `ip addr show`

### 1.2 Initial Server Setup & Install All Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget vim build-essential

# Remove old Docker versions (if any)
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc | cut -f1)

# Add Docker's official GPG key
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository to Apt sources
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

# Install Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker $USER

# Reload shell environment
source ~/.bashrc

# Verify Docker installation
docker --version
docker compose version

# Install Python 3.11+ (for FastAPI)
sudo apt install -y python3 python3-pip python3-venv
python3 --version

# Install Node.js 22 LTS (for React/Vite)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs

# Verify Node installation
node --version
npm --version

# Check disk space
df -h
```

### 1.3 Configure SSH Access
```bash
# On VM: ensure SSH is running
sudo systemctl enable ssh
sudo systemctl start ssh

# Optional: Create SSH key
ssh-keygen -t ed25519 -C "nessfitness-vm"

# On Windows: test connection
ssh your-username@VM-IP-ADDRESS
```

**Note:** You may need to log out and back in for docker group changes to take effect if `source ~/.bashrc` doesn't work.

---

## Part 2: VS Code Remote SSH Setup

### 2.1 Install VS Code Extension (Windows)
1. Open VS Code on Windows
2. Install extension: **Remote - SSH** (ms-vscode-remote.remote-ssh)
3. Press `F1` → type "Remote-SSH: Connect to Host"
4. Enter: `username@VM-IP-ADDRESS`
5. Select Linux, enter password
6. VS Code opens connected to your VM

### 2.2 Install VS Code Extensions on Remote
Once connected, install these on the VM:
- **Python** (ms-python.python)
- **Pylance** (ms-python.vscode-pylance)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)
- **Docker** (ms-azuretools.vscode-docker)

---

## Part 3: Clone Repository & Initialize Projects

### 3.1 Clone from GitHub
```bash
# Clone to your home directory (NOT /var/www/html - we're not using Apache!)
cd ~
git clone https://github.com/YOUR-USERNAME/NessFitness.git
cd NessFitness

# Verify location
pwd
# Should show: /home/your-username/NessFitness
```

In VS Code: `File → Open Folder` → select `/home/username/NessFitness`

**Note:** We're using Docker containers with their own web servers (Uvicorn for backend, Nginx for frontend). You don't need Apache or `/var/www/html`.

### 3.2 Create Project Structure
```bash
# Create directories
mkdir -p backend frontend

# Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv
*.egg-info/
dist/
build/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Docker
docker-compose.override.yml

# Database
*.db
*.sqlite
*.sqlite3

# OS
.DS_Store
Thumbs.db
EOF

# Create .env.example
cat > .env.example << 'EOF'
# Backend
DATABASE_URL=sqlite:///./nessfitness.db
SECRET_KEY=your-secret-key-change-this
CORS_ORIGINS=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:8000
EOF

# Copy to actual .env
cp .env.example .env
```

---

## Part 4: Initialize Backend (FastAPI)

### 4.1 Setup Python Project
```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
pydantic==2.5.3
pydantic-settings==2.1.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
EOF

# Install dependencies
pip install -r requirements.txt
```

### 4.2 Create Basic FastAPI App
```bash
# Create main.py
cat > main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="NessFitness API")

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "NessFitness API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
EOF

# Test it
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Visit http://VM-IP:8000/docs
# Press Ctrl+C to stop
```

---

## Part 5: Initialize Frontend (React + Vite)

### 5.1 Create Vite Project
```bash
cd ../frontend

# Create Vite app with React + TypeScript
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install additional packages
npm install axios react-router-dom
```

### 5.2 Test Frontend
```bash
# Start dev server
npm run dev -- --host 0.0.0.0 --port 5173

# Visit http://VM-IP:5173
# Press Ctrl+C to stop
```

---

## Part 6: Docker Setup

### 6.1 Backend Dockerfile
```bash
cd ~/NessFitness/backend

cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
```

### 6.2 Frontend Dockerfile
```bash
cd ~/NessFitness/frontend

cat > Dockerfile << 'EOF'
FROM node:20-alpine as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build app
COPY . .
RUN npm run build

# Production serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
```

### 6.3 Docker Compose
```bash
cd ~/NessFitness

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: nessfitness-backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:///./data/nessfitness.db
      - CORS_ORIGINS=http://localhost:3000
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: nessfitness-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  data:
EOF
```

### 6.4 Test Docker Setup
```bash
# Build and run


# Visit http://VM-IP:3000 (frontend)
# Visit http://VM-IP:8000/docs (backend API)

# Stop with Ctrl+C, or in background:
docker compose up -d
docker compose down
```

---

## Part 7: Development Workflow

### 7.1 Daily Development
```bash
# Connect via VS Code Remote SSH
# Open /home/username/NessFitness

# Backend development (with hot reload)
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend development (in another terminal)
cd frontend
npm run dev -- --host 0.0.0.0
```

### 7.2 Git Workflow
```bash
# Create feature branch
git checkout -b feature/workout-logger

# Make changes, commit
git add .
git commit -m "Add workout logging feature"

# Push to GitHub
git push origin feature/workout-logger

# Merge via GitHub PR, then:
git checkout main
git pull
```

### 7.3 Systemd Services (Background Development)

For running the backend and frontend as background daemons, you can use systemd user services. This allows services to auto-start on login and run without keeping terminals open.

#### Service Overview

Two systemd user services:
- `nessfitness-backend.service` - FastAPI backend (port 8000)
- `nessfitness-frontend.service` - Vite React frontend (port 5173)

**Service files location:** `~/.config/systemd/user/`

#### Common Commands

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

#### Service Configuration

**Backend Service:**
- Working directory: `/home/aidan/NessFitness/backend`
- Command: `venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000`
- Auto-restarts on crash

**Frontend Service:**
- Working directory: `/home/aidan/NessFitness/frontend`
- Command: `npm run dev -- --host 0.0.0.0 --port 5173`
- Auto-restarts on crash

#### Access URLs

- Backend API: http://localhost:8000 or http://192.168.6.13:8000
- Backend Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173 or http://192.168.6.13:5173

#### Notes

- Services auto-start when you log in
- Services run in the background (don't need terminal open)
- Hot-reload is enabled for development
- Logs are managed by systemd

---

## Part 8: Production Deployment (Later)

### 8.1 Cloudflare Tunnel Setup
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create nessfitness

# Route traffic
cloudflared tunnel route dns nessfitness fitness.yourdomain.com

# Configure tunnel (create config.yml)
# Run: cloudflared tunnel run nessfitness
```

### 8.2 Systemd Service (auto-start)
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Quick Reference Commands

```bash
# Start development
cd ~/NessFitness
cd backend && source venv/bin/activate && uvicorn main:app --reload &
cd ../frontend && npm run dev

# Docker production mode
docker compose up -d
docker compose logs -f
docker compose down

# Update dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install

# Database migrations (later with Alembic)
alembic upgrade head
```

---

## Troubleshooting

### Can't connect via SSH
- Check firewall: `sudo ufw allow ssh`
- Verify SSH is running: `sudo systemctl status ssh`
- Check VM IP: `ip addr show`

### Docker permission denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### Port already in use
```bash
# Find process using port
sudo lsof -i :8000
# Kill it
kill -9 PID
```

### VS Code Remote disconnects
- Increase SSH timeout in `~/.ssh/config`:
```
Host *
  ServerAliveInterval 60
  ServerAliveCountMax 3
```

---

## Next Steps

1. ✅ Complete this setup guide
2. 📊 Design database schema
3. 🔨 Build REST API endpoints
4. 🎨 Create React components
5. 🔐 Add authentication
6. 📱 Implement PWA features
7. 🚀 Deploy with Cloudflare Tunnel

Happy coding! 🏋️
