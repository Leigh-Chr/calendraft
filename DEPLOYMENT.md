# Deployment Guide - Calendraft

This guide describes the steps to deploy Calendraft in production.

## Prerequisites

- Node.js 18+ or Bun 1.3.1+
- PostgreSQL database
- Web server (Nginx, Caddy, etc.) for reverse proxy (recommended)
- SSL/TLS certificate (Let's Encrypt recommended)

## Environment Variables

### Docker Secrets Support

Calendraft supports Docker secrets for sensitive configuration (production best practice). Secrets are read from `/run/secrets/` with fallback to environment variables.

**Supported secrets** (can use Docker secrets or env vars):
- `BETTER_AUTH_SECRET`
- `RESEND_API_KEY`
- `SMTP_PASSWORD`

**Docker Compose example:**
```yaml
services:
  server:
    secrets:
      - better_auth_secret
      - resend_api_key
secrets:
  better_auth_secret:
    file: ./secrets/better_auth_secret.txt
  resend_api_key:
    file: ./secrets/resend_api_key.txt
```

### Backend (`apps/server/.env`)

Create a `.env` file in `apps/server/` with the following variables:

```env
NODE_ENV=production
PORT=3000

# PostgreSQL database (required)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

CORS_ORIGIN=https://your-domain.com
BETTER_AUTH_SECRET=your-secret-key-min-32-characters
BETTER_AUTH_URL=https://api.your-domain.com

# Sentry (optional - error monitoring)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Redis (optional - for distributed rate limiting)
# If not set, rate limiting falls back to in-memory (single instance only)
REDIS_URL=redis://redis:6379

# Email Service Configuration (required for email verification)
# Option A: Resend (Recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@your-domain.com

# Option B: SMTP (Alternative)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@example.com
# SMTP_PASSWORD=your-password
```

**Important**:
- `CORS_ORIGIN`: MUST be defined in production, do not use `*`
- `BETTER_AUTH_SECRET`: Generate a secure key (e.g., `openssl rand -base64 32`)
- `SENTRY_DSN`: Optional, retrieve it from your Sentry project
- `REDIS_URL`: Optional, but recommended for distributed rate limiting in production
- `RESEND_API_KEY` or SMTP config: Required for email verification
- Never commit the `.env` file to the repository

### Frontend (`apps/web/.env`)

Create a `.env` file in `apps/web/`:

```env
VITE_SERVER_URL=https://api.your-domain.com

# Sentry (optional - error monitoring)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Build Variables (CI/CD)

For uploading Sentry source maps during build:

```env
SENTRY_ORG=your-sentry-organization
SENTRY_PROJECT=calendraft-web
SENTRY_AUTH_TOKEN=sntrys_xxx
```

## Deployment with Docker (recommended)

The easiest way to deploy Calendraft is using Docker.

### Quick Start

#### Development (PostgreSQL Docker + Local Apps)

```bash
# 1. Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d

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

#### Production (Everything in Docker)

```bash
# 1. Configure environment variables
cp docker.env.example .env
# Edit .env with your production values

# 2. Build and start all services
docker compose up -d --build

# 3. Verify everything works
docker compose ps
docker compose logs -f
```

**Access:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 | PostgreSQL 16 |
| `redis` | 6379 | Redis (Rate limiting - optional, falls back to in-memory) |
| `server` | 3000 | Backend API (Bun + Hono) |
| `web` | 3001 | Frontend (Nginx) |

### Environment Variables

Copy `docker.env.example` to `.env` and configure:

```env
# Database
POSTGRES_USER=calendraft
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=calendraft

# Backend
CORS_ORIGIN=https://your-domain.com
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=https://api.your-domain.com

# Redis (optional - for distributed rate limiting)
REDIS_URL=redis://redis:6379

# Email Service (required for email verification)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@your-domain.com

# Frontend
VITE_SERVER_URL=https://api.your-domain.com
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

### Useful Docker Commands

```bash
# View logs
docker compose logs -f              # All services
docker compose logs -f server       # Specific service
docker compose logs -f web
docker compose logs -f db

# Stop services
docker compose down                  # Stop (keep data)
docker compose down -v               # Stop and remove volumes (⚠️ deletes data)

# Restart a service
docker compose restart server
docker compose restart web

# Rebuild a service
docker compose up -d --build server
docker compose up -d --build web

# Access PostgreSQL
docker compose exec db psql -U calendraft -d calendraft

# Database backup
docker compose exec db pg_dump -U calendraft calendraft > backup.sql

# Restore database
docker compose exec -T db psql -U calendraft calendraft < backup.sql

# Update
git pull
docker compose up -d --build
```

### Docker Troubleshooting

#### Docker Build Fails

```bash
# Rebuild without cache
docker compose build --no-cache

# Check logs
docker compose logs
```

#### Database Won't Start

```bash
# Check logs
docker compose logs db

# Check that port is not already in use
lsof -i :5432
```

#### Server Cannot Connect to Database

```bash
# Check that database is healthy
docker compose ps

# Test connection
docker compose exec server wget -O- http://localhost:3000/health
```

#### Data Doesn't Persist

Check that the volume is created:
```bash
docker volume ls | grep postgres
```

### Service Structure

```
┌─────────────────────────────────────────┐
│         docker-compose.yml              │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │    db    │  │  server  │  │ web  │ │
│  │PostgreSQL│◄─│ Bun+Hono │◄─│Nginx │ │
│  │  :5432   │  │  :3000   │  │ :80  │ │
│  └──────────┘  └──────────┘  └──────┘ │
│       │            │                    │
│  ┌────┴────────────┴────┐              │
│  │      redis           │              │
│  │   (Rate Limiting)    │              │
│  │      :6379           │              │
│  └──────────────────────┘              │
│       │                                  │
│  postgres_data, redis_data (volumes)    │
└─────────────────────────────────────────┘
```

---

## Manual Deployment (without Docker)

### 1. Install Dependencies

```bash
bun install
```

### 2. Generate Prisma Client

```bash
bun run db:generate
```

### 3. Push Database Schema

```bash
bun run db:push
```

### 4. Build Application

```bash
bun run build
```

This will:
- Build the frontend in `apps/web/dist/`
- Build the backend in `apps/server/dist/`

## Starting (without Docker)

### Backend

```bash
cd apps/server
bun run dist/index.js
```

Or with PM2 (recommended for production):

```bash
pm2 start apps/server/dist/index.js --name calendraft-api
```

### Frontend

The frontend can be served with any static web server:

- **Nginx**: Configure to serve `apps/web/dist/`
- **Vercel/Netlify**: Deploy the `apps/web/dist/` folder
- **Cloudflare Pages**: Deploy the `apps/web/dist/` folder

## Nginx Configuration (example)

```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/apps/web/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Pre-deployment Checklist

### Docker
- [ ] `.env` file created from `docker.env.example`
- [ ] `POSTGRES_PASSWORD` changed with a secure password
- [ ] `BETTER_AUTH_SECRET` generated (min 32 characters): `openssl rand -base64 32`
- [ ] `CORS_ORIGIN` defined with frontend URL
- [ ] Docker and Docker Compose installed
- [ ] Ports 3000 and 3001 available (or customized in `.env`)

### General
- [ ] Environment variables configured
- [ ] `CORS_ORIGIN` defined and does not contain `*` or `localhost`
- [ ] `BETTER_AUTH_SECRET` generated and secured (min 32 characters)
- [ ] Database initialized
- [ ] SSL/TLS certificate configured (HTTPS)
- [ ] Health check accessible (`/health`)
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] Logs configured and accessible
- [ ] Database backup configured
- [ ] Sentry configured (optional but recommended)


## Monitoring

### Sentry (Error Tracking & Performance)

Sentry is integrated for error and performance monitoring. Configuration:

1. **Create a Sentry project**: Go to [sentry.io](https://sentry.io) and create two projects:
   - A "React" project for the frontend (`calendraft-web`)
   - A "Node.js" project for the backend (`calendraft-api`)

2. **Retrieve DSNs**: In each project, go to Settings > Client Keys (DSN)

3. **Configure environment variables** (see section above)

4. **Upload source maps** (CI/CD):
   - Create an auth token in Sentry (Settings > Auth Tokens)
   - Configure `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` in your CI

Enabled features:
- ✅ Automatic error capture (frontend & backend)
- ✅ Performance monitoring with TanStack Router
- ✅ Session Replay (10% of sessions, 100% with errors)
- ✅ Distributed tracing between frontend and backend
- ✅ Source maps for readable stack traces

### Health Check

The `/health` endpoint checks:
- Database connection
- Returns `200 OK` if everything is OK
- Returns `503 Service Unavailable` if there's a problem

Use a monitoring service (UptimeRobot, Pingdom, etc.) to monitor this endpoint.

### Automatic Cleanup

The server automatically runs a cleanup job in production that:
- Deletes anonymous calendars not accessed for 60 days
- Runs every 24 hours
- Cleans up orphaned data to prevent database accumulation
- Note: `updatedAt` is updated on access (getById/list), so a regularly accessed calendar will not be deleted

**Note**: For a critical production environment, consider using an external scheduler (cron, Cloud Scheduler, etc.) instead of `setInterval`.

### Logs

Logs are displayed in the console. In production, redirect to a file:

```bash
bun run dist/src/index.js > logs/app.log 2>&1
```

Or with PM2:

```bash
pm2 logs calendraft-api
```

## Security

### Active Protections

- ✅ Rate limiting: 
  - General routes: 100 req/min
  - Authentication: 10 req/min
  - Sign-up: 5 req/min
  - Email verification resend: 1 req/30s
  - Password reset request: 3 req/hour
  - Password change: 10 req/hour
  - Profile update: 20 req/hour
  - Account deletion: 1 req/hour
  - Uses Redis for distributed rate limiting (falls back to in-memory if Redis unavailable)
- ✅ SSRF protection for external URL imports
- ✅ Content Security Policy (frontend and backend)
- ✅ HTTP security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Input validation with Zod
- ✅ High entropy anonymous IDs (192 bits)
- ✅ Limit of 10 sharing links per calendar
- ✅ Security event logging
- ✅ Sentry configured without PII
- ✅ Docker secrets support (with fallback to environment variables)

### Production Security Checklist

Before going to production, verify:

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` defined explicitly (no `*`)
- [ ] `CORS_ORIGIN` does not contain `localhost`
- [ ] `BETTER_AUTH_SECRET` generated with 32+ characters (`openssl rand -base64 32`)
- [ ] HTTPS enabled with valid certificate
- [ ] Reverse proxy configured (nginx/Caddy) with X-Forwarded-* headers
- [ ] Environment variables not committed
- [ ] Automatic database backup
- [ ] Log monitoring configured
- [ ] Alerts on critical errors (Sentry or other)

### Secret Rotation

It is recommended to perform periodic rotation:

| Secret | Frequency | Method |
|--------|-----------|--------|
| `BETTER_AUTH_SECRET` | 6 months | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | 6 months | Modify in `.env` and redeploy |

**Note**: Rotating `BETTER_AUTH_SECRET` will invalidate all existing sessions.

## Troubleshooting

### Error "CORS_ORIGIN is required"
→ Check that `CORS_ORIGIN` is defined in `apps/server/.env`

### Health check returns 503
→ Check database connection
→ Check that Prisma is properly configured

### Rate limiting too strict
→ Adjust limits in `apps/server/src/middleware/rate-limit.ts`
→ Note: Rate limiting uses Redis if `REDIS_URL` is set, otherwise falls back to in-memory (single instance only)

### 429 Too Many Requests errors
→ Normal if you exceed rate limits (see Security section for details)
→ Wait for the time window to end
→ Check Redis connection if using distributed rate limiting

### Redis connection issues
→ Rate limiting will automatically fall back to in-memory if Redis is unavailable
→ Check `REDIS_URL` configuration
→ Verify Redis service is running: `docker compose ps redis`

## Support

For any questions or issues, consult the main README.md or open an issue.

## See Also

- [README.md](README.md) - Overview and quick start
- [ARCHITECTURE.md](ARCHITECTURE.md) - Package architecture
- [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md) - VPS initial setup guide
- [PRODUCTION_COMMANDS.md](PRODUCTION_COMMANDS.md) - Production management scripts
- [SECURITY.md](SECURITY.md) - Security policy
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guide

