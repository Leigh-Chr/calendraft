# Docker Guide - Calendraft

Complete guide to run Calendraft with Docker.

## 🚀 Quick Start

### Option 1: Development (PostgreSQL Docker + Local Apps)

```bash
# 1. Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# 2. Configure environment
echo 'DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"
PORT=3000
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=dev-secret-key-min-32-characters-long
BETTER_AUTH_URL=http://localhost:3000' > apps/server/.env

# 3. Initialize the database
bun run db:push

# 4. Launch apps locally (hot reload)
bun run dev
```

**Access:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

### Option 2: Full Production (Everything in Docker)

```bash
# 1. Configure environment variables
cp docker.env.example .env
# Edit .env with your values

# 2. Build and start all services
docker-compose up -d --build

# 3. Verify everything works
docker-compose ps
docker-compose logs -f
```

**Access:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

## 📋 Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# A specific service
docker-compose logs -f server
docker-compose logs -f web
docker-compose logs -f db
```

### Stop Services

```bash
# Stop (keep data)
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Restart a Service

```bash
docker-compose restart server
docker-compose restart web
```

### Rebuild a Service

```bash
docker-compose up -d --build server
docker-compose up -d --build web
```

### Access PostgreSQL

```bash
# Via Docker
docker-compose exec db psql -U calendraft -d calendraft

# From outside (if port exposed)
psql -h localhost -p 5432 -U calendraft -d calendraft
```

### Database Backup

```bash
# Create a backup
docker-compose exec db pg_dump -U calendraft calendraft > backup.sql

# Restore a backup
docker-compose exec -T db psql -U calendraft calendraft < backup.sql
```

## 🔧 Configuration

### Environment Variables

Copy `docker.env.example` to `.env` and configure:

```env
# Database
POSTGRES_USER=calendraft
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=calendraft

# Backend
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000

# Frontend
VITE_SERVER_URL=http://localhost:3000
```

### Ports

By default:
- **3000**: Backend API
- **3001**: Frontend Web
- **5432**: PostgreSQL

Modify in `.env` if necessary:
```env
SERVER_PORT=3000
WEB_PORT=3001
POSTGRES_PORT=5432
```

## 🐛 Troubleshooting

### Docker Build Fails

```bash
# Rebuild without cache
docker-compose build --no-cache

# Check logs
docker-compose logs
```

### Database Won't Start

```bash
# Check logs
docker-compose logs db

# Check that port is not already in use
lsof -i :5432
```

### Server Cannot Connect to Database

```bash
# Check that database is healthy
docker-compose ps

# Test connection
docker-compose exec server wget -O- http://localhost:3000/health
```

### Data Doesn't Persist

Check that the volume is created:
```bash
docker volume ls | grep postgres
```

## 📦 Service Structure

```
┌─────────────────────────────────────────┐
│         docker-compose.yml              │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │    db    │  │  server  │  │ web  │ │
│  │PostgreSQL│◄─│ Bun+Hono │◄─│Nginx │ │
│  │  :5432   │  │  :3000   │  │ :80  │ │
│  └──────────┘  └──────────┘  └──────┘ │
│       │                                │
│  postgres_data (volume)                │
└─────────────────────────────────────────┘
```

## 🔐 Production Security

1. **Change all passwords** in `.env`
2. **Generate a secure BETTER_AUTH_SECRET**: `openssl rand -base64 32`
3. **Configure CORS_ORIGIN** with your actual domain
4. **Use HTTPS** with a reverse proxy (Nginx, Traefik, Caddy)
5. **Never commit** the `.env` file

## 📚 See Also

- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide












