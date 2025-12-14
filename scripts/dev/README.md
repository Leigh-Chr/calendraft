# Development Scripts

Scripts to simplify local development workflow.

## Quick Start

### First Time Setup

```bash
./scripts/dev/dev-setup.sh
```

This will:
- Check prerequisites (Bun, Docker, Git)
- Install dependencies
- Create `.env` files with templates
- Generate Prisma client
- Start Docker services (PostgreSQL + Redis)
- Initialize database schema

### Daily Development

```bash
./scripts/dev/dev.sh
```

This will:
- Start Docker services (if not running)
- Check database initialization
- Launch apps in development mode (hot reload)

## Available Scripts

### `dev.sh` - Start Development Environment

Main script to start everything for development.

```bash
./scripts/dev/dev.sh              # Start everything
./scripts/dev/dev.sh --no-db      # Don't start Docker (assumes already running)
./scripts/dev/dev.sh --no-apps    # Only start Docker services
```

**What it does:**
- Checks prerequisites (Bun, Docker)
- Starts PostgreSQL and Redis in Docker
- Waits for services to be ready
- Checks database initialization
- Launches apps with `bun run dev`

### `dev-setup.sh` - Initial Setup

One-time setup for new developers or fresh environments.

```bash
./scripts/dev/dev-setup.sh
```

**What it does:**
- Verifies prerequisites are installed
- Installs dependencies with `bun install`
- Creates `.env` file templates
- Generates Prisma client
- Starts Docker services
- Initializes database schema

### `dev-db.sh` - Database Management

Manage database operations during development.

```bash
./scripts/dev/dev-db.sh push      # Push schema changes
./scripts/dev/dev-db.sh seed      # Seed with test data
./scripts/dev/dev-db.sh studio    # Open Prisma Studio
./scripts/dev/dev-db.sh reset     # Drop and recreate database (⚠️ destructive)
./scripts/dev/dev-db.sh status    # Show database status
```

**Commands:**
- `push` - Apply schema changes to database
- `seed` - Populate database with test data
- `studio` - Open Prisma Studio GUI
- `reset` - Drop all data and recreate schema (asks for confirmation)
- `status` - Show database connection status and tables

### `dev-clean.sh` - Cleanup

Clean up development environment.

```bash
./scripts/dev/dev-clean.sh           # Stop Docker services
./scripts/dev/dev-clean.sh --volumes # Also remove Docker volumes (⚠️ deletes data)
./scripts/dev/dev-clean.sh --cache   # Also clean build caches
./scripts/dev/dev-clean.sh --all    # Everything (volumes + cache)
```

**Options:**
- `--volumes` - Remove Docker volumes (deletes all database data)
- `--cache` - Clean Turborepo and build caches
- `--all` - Clean everything (volumes + cache)

## Workflow Examples

### Starting Fresh

```bash
# 1. Initial setup
./scripts/dev/dev-setup.sh

# 2. Review and update .env files if needed
# Edit apps/server/.env and apps/web/.env

# 3. Start development
./scripts/dev/dev.sh
```

### Daily Workflow

```bash
# Start everything
./scripts/dev/dev.sh

# In another terminal, manage database
./scripts/dev/dev-db.sh studio    # Open Prisma Studio
./scripts/dev/dev-db.sh push      # Apply schema changes
```

### Resetting Database

```bash
# Stop apps first (Ctrl+C)
./scripts/dev/dev-db.sh reset
```

### Cleaning Up

```bash
# Stop services
./scripts/dev/dev-clean.sh

# Full cleanup (removes data and caches)
./scripts/dev/dev-clean.sh --all
```

## Manual Commands

If you prefer to run commands manually:

```bash
# Start Docker services
docker compose -f docker-compose.dev.yml up -d

# Initialize database
bun run db:push

# Start apps
bun run dev

# Or separately
bun run dev:server  # Backend only
bun run dev:web     # Frontend only
```

## Troubleshooting

### Docker services won't start

```bash
# Check Docker status
docker ps

# Check logs
docker compose -f docker-compose.dev.yml logs

# Restart services
docker compose -f docker-compose.dev.yml restart
```

### Database connection errors

```bash
# Check database status
./scripts/dev/dev-db.sh status

# Verify .env file
cat apps/server/.env | grep DATABASE_URL

# Restart database
docker compose -f docker-compose.dev.yml restart db
```

### Port already in use

```bash
# Check what's using the port
lsof -i :3000  # Backend
lsof -i :3001  # Frontend
lsof -i :5432  # PostgreSQL

# Stop conflicting services or change ports in .env
```

## Related Documentation

- [README.md](../../README.md) - Project overview and getting started
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Technical architecture
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines

