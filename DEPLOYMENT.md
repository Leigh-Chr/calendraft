# Deployment Guide - Calendraft

This guide describes the steps to deploy Calendraft in production.

## Prerequisites

- Node.js 18+ or Bun 1.3.1+
- PostgreSQL database
- Web server (Nginx, Caddy, etc.) for reverse proxy (recommended)
- SSL/TLS certificate (Let's Encrypt recommended)

## Environment Variables

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
```

**Important**:
- `CORS_ORIGIN`: MUST be defined in production, do not use `*`
- `BETTER_AUTH_SECRET`: Generate a secure key (e.g., `openssl rand -base64 32`)
- `SENTRY_DSN`: Optional, retrieve it from your Sentry project
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

### 1. Configure Environment Variables

```bash
cp docker.env.example .env
```

Edit `.env` with your production values:

```env
# Database
POSTGRES_USER=calendraft
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=calendraft

# Backend
CORS_ORIGIN=https://your-domain.com
BETTER_AUTH_SECRET=your-secret-min-32-characters
BETTER_AUTH_URL=https://api.your-domain.com

# Frontend
VITE_SERVER_URL=https://api.your-domain.com
```

### 2. Build and Start

```bash
docker compose up -d --build
```

### 3. Verify Deployment

```bash
# View service status
docker compose ps

# View logs
docker compose logs -f

# Test health check
curl http://localhost:3000/health
```

### Update

```bash
git pull
docker compose up -d --build
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

## Useful Docker Commands

```bash
# View logs for a specific service
docker compose logs -f server

# Access PostgreSQL container
docker compose exec db psql -U calendraft -d calendraft

# Database backup
docker compose exec db pg_dump -U calendraft calendraft > backup.sql

# Restore database
docker compose exec -T db psql -U calendraft calendraft < backup.sql

# Restart a service
docker compose restart server

# Rebuild a service
docker compose up -d --build server

# Remove volumes (WARNING: deletes data)
docker compose down -v
```

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

- ✅ Rate limiting: 100 req/min general, 10 req/min for auth
- ✅ SSRF protection for external URL imports
- ✅ Content Security Policy (frontend and backend)
- ✅ HTTP security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Input validation with Zod
- ✅ High entropy anonymous IDs (192 bits)
- ✅ Limit of 10 sharing links per calendar
- ✅ Security event logging
- ✅ Sentry configured without PII

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

### 429 Too Many Requests errors
→ Normal if you exceed 100 requests/minute
→ Wait for the time window to end

## Support

For any questions or issues, consult the main README.md or open an issue.

## See Also

- [README.md](README.md) - Overview and quick start
- [ARCHITECTURE.md](ARCHITECTURE.md) - Package architecture
- [SECURITY.md](SECURITY.md) - Security policy
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guide

