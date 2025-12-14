# Calendraft Project Rules

This is a Calendraft project - a web platform for managing, editing, and creating .ics calendar files.

## 📚 Documentation Reference

**IMPORTANT**: Always consult the following documentation files for complete project information:

### Core Documentation
- **`README.md`** - Project overview, features, getting started, stack, scripts
- **`ARCHITECTURE.md`** - Package structure, dependency diagram, package contents
- **`DEPLOYMENT.md`** - Production deployment guide, environment variables, monitoring
- **`PRODUCTION_COMMANDS.md`** - Complete production management guide, scripts usage, Docker commands, monitoring, troubleshooting
- **`VPS_DEPLOYMENT.md`** - VPS initial setup and deployment guide (first-time installation)
- **`CONTRIBUTING.md`** - Contribution guidelines, code standards, PR process
- **`SECURITY.md`** - Security policy, vulnerability reporting, security measures
- **`AUTHENTICATION.md`** - Authentication flow, anonymous users, Better-Auth configuration

### Package Documentation
Each package has its own README with detailed API documentation:
- **`packages/core/README.md`** - Business logic, types, validation, constants
- **`packages/ics-utils/README.md`** - ICS parsing and generation utilities
- **`packages/react-utils/README.md`** - React hooks and utilities
- **`packages/api/README.md`** - tRPC routers, procedures, context
- **`packages/auth/README.md`** - Better-Auth configuration, sessions, Polar payments
- **`packages/db/README.md`** - Prisma client, database schemas, relations
- **`packages/schemas/README.md`** - Zod validation schemas, RFC 5545 compliance

## Monorepo & Build System

This is a **Turborepo monorepo** managed with **Bun workspaces**:

### Package Manager
- **Bun 1.3.1+** - Runtime and package manager
- **Catalog System** - Shared dependencies defined in root `package.json` under `workspaces.catalog`
- Use `catalog:` prefix in package.json dependencies (e.g., `"zod": "catalog:"`)
- Common catalog dependencies: `zod`, `typescript`, `tsdown`, `@trpc/server`, `@trpc/client`, `hono`, `better-auth`, `@prisma/client`, `date-fns`, `ical.js`, `clsx`, `tailwind-merge`

### Turborepo Configuration
- **Remote Cache**: Enabled with signature verification (requires `TURBO_TOKEN` and `TURBO_TEAM` env vars)
- **Task Caching**: All tasks (build, test, lint, typecheck) are cached with granular inputs/outputs
- **Task Dependencies**: Proper `dependsOn` configured for parallel execution
- **Inputs/Outputs**: Granular cache invalidation based on file changes
- **Configuration**: See `turbo.json` for task definitions

### TypeScript Project References
- **Root Config**: `tsconfig.json` orchestrates all project references
- **Base Config**: `packages/config/tsconfig.base.json` - Shared configuration for all packages
- **Incremental Builds**: Each package has `composite: true` for 60-70% faster builds
- **Build Command**: Run `tsc --build` for incremental type checking
- **Package DB**: Skips typecheck (Prisma generated files), uses `skipLibCheck: true`

## Project Structure

This is a **Turborepo monorepo** with the following structure:

```
calendraft/
├── apps/
│   ├── web/           # Frontend application (React + TanStack Router)
│   └── server/        # Backend server (Hono + tRPC)
├── packages/
│   ├── api/           # tRPC routers (calendar, event, share, user)
│   ├── auth/          # Better-Auth configuration
│   ├── config/        # Shared TypeScript configuration (tsconfig.base.json)
│   ├── core/          # Business logic and shared types
│   ├── db/            # Prisma client and database schemas
│   ├── ics-utils/     # ICS parsing and generation
│   ├── react-utils/   # React hooks and utilities
│   └── schemas/       # Zod validation schemas
```

## Key Architecture Principles

1. **Single source of truth** - Types ICS in `core/constants/ics-enums.ts`
2. **Pure functions** - No side effects in `core` and `ics-utils`
3. **No over-engineering** - One function per need
4. **Tree-shakeable** - Granular imports possible

## Dependency Graph

```
apps/web → react-utils, schemas, api
apps/server → api
api → auth, db, schemas, ics-utils, core
auth → db
react-utils → core
core → ics-utils (0 internal dependencies)
```

## Available Scripts

### Development
- `bun run dev` - Start all apps in development mode
- `bun run dev:web` - Start only the web app
- `bun run dev:server` - Start only the server

### Development Scripts
Development scripts are located in `scripts/dev/` and provide automated tools for local development:
- **`dev-setup.sh`** - Initial development environment setup (first time)
- **`dev.sh`** - Start development environment (Docker + apps) with options (`--no-db`, `--no-apps`)
- **`dev-db.sh`** - Database management (`push`, `seed`, `studio`, `reset`, `status`)
- **`dev-clean.sh`** - Clean development environment (`--volumes`, `--cache`, `--all`)

📖 See [`scripts/dev/README.md`](../scripts/dev/README.md) for detailed usage.

### Build & Type Checking
- `bun run build` - Build all apps for production (uses Turborepo cache)
- `bun run typecheck` - Check TypeScript types across all packages (uses project references)
- `bun run check-types` - Alias for typecheck (legacy)
- `bun run check` - Run Biome linting and formatting
- `bun run clean` - Clean all build artifacts and caches

### Database Commands
All database operations run from the root:
- `bun run db:push` - Push schema changes to database (dev)
- `bun run db:studio` - Open Prisma Studio
- `bun run db:generate` - Generate Prisma client
- `bun run db:migrate` - Run database migrations

**Important**: Database schema is located in `packages/db/prisma/schema/` (not in apps/server)

### Production Management Scripts
Production scripts are located in `scripts/production/` and provide automated management tools:
- **`deploy.sh`** - Automated deployment with backup and migrations (`--backup`, `--migrate`, `--service=SERVICE`)
- **`backup.sh`** - Database backup and restoration (`--list`, `--restore=FILE`)
- **`rollback.sh`** - Revert to previous Git commit (`--commit=HASH`, `--no-backup`, `--no-db`)
- **`monitor.sh`** - Service health and resource monitoring (`--all`, `--health`, `--stats`, `--logs`, `--errors`)
- **`health-check.sh`** - Comprehensive health verification (`--verbose`)
- **`security-audit.sh`** - Security configuration audit (`--verbose`)
- **`verify-backup.sh`** - Backup integrity verification
- **`report.sh`** - Status report generation (`--format=text|json`, `--output=FILE`)
- **`cleanup.sh`** - Docker resource cleanup (`--all`, `--images`, `--volumes`, `--logs`, `--system`, `--build-cache`)
- **`quick-commands.sh`** - Quick Docker command shortcuts
- **`install.sh`** - Install scripts on remote server
- **`help.sh`** - Integrated help for all scripts

📖 **Complete guide**: See `PRODUCTION_COMMANDS.md` for detailed usage and `scripts/production/README.md` for quick start.

## Database Schema

The database uses **PostgreSQL** with Prisma. Schema files are in:
- `packages/db/prisma/schema/schema.prisma` - Main config (generator, datasource)
- `packages/db/prisma/schema/auth.prisma` - Better-Auth tables
- `packages/db/prisma/schema/calendar.prisma` - Business tables (Calendar, Event, Attendee, Alarm)

The Prisma client uses PostgreSQL adapter and is exported from `packages/db/src/index.ts`.

## API Structure

### tRPC Integration with Hono
- **Integration**: Uses `@hono/trpc-server` for Hono integration (see `packages/api/README.md`)
- **Mounting**: tRPC router mounted at `/trpc/*` in Hono app
- **Context**: Created from Hono context via `createContext({ context })`

### tRPC Routers
- **Location**: `packages/api/src/routers/`
- **Main router**: `packages/api/src/routers/index.ts` exports `appRouter`
- **Routers**:
  - `calendarRouter` - CRUD calendars, import/export ICS, merge, groups
  - `eventRouter` - CRUD events, bulk operations
  - `shareRouter` - Share links and bundles (public and private)
  - `userRouter` - User profile and preferences

### Procedures
- `publicProcedure` - Accessible without authentication (e.g., health check, public share links)
- `authOrAnonProcedure` - Requires either authentication OR anonymous ID (most calendar/event operations)
- `protectedProcedure` - Requires authentication (Better-Auth session only, e.g., user settings)

### Context
The tRPC context includes:
- `session` - Better-Auth session (null if anonymous)
- `anonymousId` - Anonymous user ID from header `x-anonymous-id`
- `userId` - `session.user.id` or `anonymousId`

## Authentication

Authentication is handled by **Better-Auth**:
- **Configuration**: `packages/auth/src/index.ts`
- **Adapter**: Prisma adapter with PostgreSQL
- **Features**: Email/password, anonymous users, Polar payments
- **Cookies**: Secure in production (HttpOnly, Secure, SameSite)

### Anonymous Users
- Anonymous users identified by `x-anonymous-id` header
- **Limitations**:
  - Maximum 10 calendars
  - Maximum 500 events per calendar
  - Maximum 50 groups
  - Maximum 15 calendars per group
- Auto-deleted after 60 days of inactivity

### Authenticated Users
- **Limitations**:
  - Maximum 100 calendars
  - Maximum 2,000 events per calendar
  - Maximum 100 groups
  - Maximum 20 calendars per group
- No automatic deletion

## Package Usage

### Import Patterns

```typescript
// Business logic and types
import { EventFormData, validateEventForm, FIELD_LIMITS } from '@calendraft/core';

// ICS utilities
import { parseIcsFile, generateIcsFile } from '@calendraft/ics-utils';

// React utilities
import { useDebounce, useLocalStorage, cn } from '@calendraft/react-utils';

// Validation schemas
import { eventCreateSchema, attendeeSchema } from '@calendraft/schemas';

// Database
import prisma from '@calendraft/db';

// API (tRPC)
import { appRouter, createContext } from '@calendraft/api';
// In Hono app, use @hono/trpc-server for integration (see packages/api/README.md)

// Auth
import { auth } from '@calendraft/auth';
```

## Docker

The project is fully dockerized. See `docker-compose.yml` for production and `docker-compose.dev.yml` for development.

### Development with Docker
```bash
# Start PostgreSQL only
docker compose -f docker-compose.dev.yml up -d

# Run apps locally with hot reload
bun run dev
```

### Production with Docker
```bash
cp docker.env.example .env
# Edit .env with production values
docker compose up -d --build
```

**For production management**, use the scripts in `scripts/production/`:
- `./scripts/production/deploy.sh --backup --migrate` - Deploy with backup and migrations
- `./scripts/production/monitor.sh --all` - Monitor all services
- `./scripts/production/health-check.sh` - Verify service health
- See `PRODUCTION_COMMANDS.md` for complete guide

## Environment Variables

### Backend (`apps/server/.env`)
```env
PORT=3000
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev
SENTRY_DSN=... (optional)
```

### Frontend (`apps/web/.env`)
```env
VITE_SERVER_URL=http://localhost:3000
VITE_SENTRY_DSN=... (optional)
```

## Code Standards

### Style & Linting
- Uses **Biome** for linting and formatting (replaces ESLint + Prettier)
- Auto-formatted on commit via Husky + lint-staged
- Run `bun run check` to verify and auto-fix
- **Knip** configured to detect unused code and dependencies

### Vite Configuration
- **Build Target**: ESNext (modern browsers only)
- **Minification**: esbuild (fast and efficient)
- **Code Splitting**: Manual chunks configured for optimal caching
- **CSS Splitting**: Enabled for better caching
- **Chunk Size Warning**: 1MB limit
- **Dev Server**: HMR configured with proxy for API routes
- **PWA**: Configured with Workbox for offline support
- **Source Maps**: Enabled for Sentry error tracking

### Naming Conventions
- **Files**: `kebab-case.ts` for files, `PascalCase.tsx` for React components
- **Variables/Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

### TypeScript
- **Strict Mode**: All strict options enabled including `exactOptionalPropertyTypes`
- **Project References**: Use TypeScript project references for incremental builds
- **Optional Properties**: Must explicitly include `| undefined` (e.g., `name?: string | undefined`)
- **Environment Variables**: Use bracket notation (`process.env["KEY"]`) not dot notation
- **Index Signatures**: Use bracket notation for properties from index signatures
- Use explicit types, avoid `any`
- Prefer `interface` over `type` for objects
- Use Zod schemas from `@calendraft/schemas` for validation
- All packages use `composite: true` for project references (except `db` which skips typecheck)

### Commits
Follow conventional commits:
```
type(scope): description

Body with details

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## CI/CD

### GitHub Actions Workflows
- **`.github/workflows/ci.yml`**: Main CI pipeline
  - Lint, typecheck, build, test jobs run in parallel
  - Dependency caching for faster runs
  - Build artifacts uploaded
  - Coverage uploaded to Codecov
- **`.github/workflows/code-quality.yml`**: Code quality checks
  - Biome check
  - Knip (unused code detection)
- **Concurrency**: In-progress runs are cancelled on new commits

### Local Development
- Use `bun run dev` for development with hot reload
- Turborepo cache speeds up subsequent builds
- TypeScript project references enable incremental type checking

## Testing

- **Framework**: Vitest (configured in packages that have tests)
- **Coverage Thresholds**: 80% for lines, functions, branches, statements (configured in `apps/web/vitest.config.ts`)
- **Test Scripts**: 
  - `bun run test` - Run all tests across packages
  - `bun run test:watch` - Watch mode
  - Individual packages: `cd packages/core && bun run test`
- **Coverage**: Reports generated in `coverage/` directory
- **CI Integration**: Tests run in GitHub Actions with coverage upload to Codecov
- **Packages with Tests**: `core`, `ics-utils`, `react-utils` (others may be added)

## Adding Features

When adding new features:
1. Check if functionality exists in packages (core, ics-utils, etc.)
2. Follow the dependency graph (don't create circular dependencies)
3. Update relevant package README if adding new exports
4. Add tests if applicable
5. Update documentation

## Important Notes

### TypeScript Configuration
- **Base Config**: `packages/config/tsconfig.base.json` - Shared configuration for all packages
- **Project References**: Root `tsconfig.json` references all packages for incremental builds
- **Strict Mode**: `exactOptionalPropertyTypes` requires explicit `| undefined` for optional properties
- **Package DB**: Skips typecheck (Prisma generated files), uses `skipLibCheck: true`

### Build & Performance
- **Turborepo Remote Cache**: Configured but requires `TURBO_TOKEN` and `TURBO_TEAM` env vars
- **Build Times**: 60-70% faster with project references and caching
- **Incremental Builds**: TypeScript project references enable incremental type checking

### Package Management
- **Catalog Dependencies**: Use `catalog:` prefix for shared dependencies
- **Workspace Protocol**: Use `workspace:*` for internal packages
- **Package Exports**: Check each package's README for available exports

### Database
- **Schema location**: `packages/db/prisma/schema/` (NOT `apps/server/prisma/`)
- **Prisma Client**: Generated to `packages/db/prisma/generated/`
- **Adapter**: Uses `@prisma/adapter-pg` for PostgreSQL

### Standards
- **RFC 5545 compliance**: ICS parsing/generation follows RFC 5545 standard
- **Tree-shakeable**: All packages support granular imports
- **Externalizable packages**: `ics-utils`, `core`, and `react-utils` can be published to npm

## When in Doubt

1. **Read the documentation** - Check the relevant README.md file
2. **Check ARCHITECTURE.md** - Understand package relationships
3. **Look at existing code** - Follow established patterns
4. **Ask questions** - Open an issue with label `question`

---

**Remember**: This project has comprehensive documentation. Always refer to the documentation files listed at the top of this file for complete and up-to-date information.
