# Calendraft Project Rules

This is a Calendraft project - a web platform for managing, editing, and creating .ics calendar files.

## 📚 Documentation Reference

**IMPORTANT**: Always consult the following documentation files for complete project information:

### Core Documentation
- **`README.md`** - Project overview, features, getting started, stack, scripts
- **`ARCHITECTURE.md`** - Package structure, dependency diagram, package contents
- **`DEPLOYMENT.md`** - Production deployment guide, environment variables, monitoring
- **`CONTRIBUTING.md`** - Contribution guidelines, code standards, PR process
- **`SECURITY.md`** - Security policy, vulnerability reporting, security measures

### Package Documentation
Each package has its own README with detailed API documentation:
- **`packages/core/README.md`** - Business logic, types, validation, constants
- **`packages/ics-utils/README.md`** - ICS parsing and generation utilities
- **`packages/react-utils/README.md`** - React hooks and utilities
- **`packages/api/README.md`** - tRPC routers, procedures, context
- **`packages/auth/README.md`** - Better-Auth configuration, sessions, Polar payments
- **`packages/db/README.md`** - Prisma client, database schemas, relations
- **`packages/schemas/README.md`** - Zod validation schemas, RFC 5545 compliance

## Project Structure

This is a **Turborepo monorepo** with the following structure:

```
calendraft/
├── apps/
│   ├── web/           # Frontend application (React + TanStack Router)
│   └── server/        # Backend server (Hono + tRPC)
├── packages/
│   ├── api/           # tRPC routers (calendar, event)
│   ├── auth/          # Better-Auth configuration
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

### Build & Type Checking
- `bun run build` - Build all apps for production
- `bun run check-types` - Check TypeScript types across all apps
- `bun run check` - Run Biome linting and formatting

### Database Commands
All database operations run from the root:
- `bun run db:push` - Push schema changes to database (dev)
- `bun run db:studio` - Open Prisma Studio
- `bun run db:generate` - Generate Prisma client
- `bun run db:migrate` - Run database migrations

**Important**: Database schema is located in `packages/db/prisma/schema/` (not in apps/server)

## Database Schema

The database uses **SQLite** with Prisma. Schema files are in:
- `packages/db/prisma/schema/schema.prisma` - Main config (generator, datasource)
- `packages/db/prisma/schema/auth.prisma` - Better-Auth tables
- `packages/db/prisma/schema/calendar.prisma` - Business tables (Calendar, Event, Attendee, Alarm)

The Prisma client uses LibSQL adapter and is exported from `packages/db/src/index.ts`.

## API Structure

### tRPC Routers
- **Location**: `packages/api/src/routers/`
- **Main router**: `packages/api/src/routers/index.ts` exports `appRouter`
- **Routers**:
  - `calendarRouter` - CRUD calendars, import/export ICS, merge
  - `eventRouter` - CRUD events

### Procedures
- `publicProcedure` - Accessible without authentication
- `protectedProcedure` - Requires authentication (Better-Auth session)

### Context
The tRPC context includes:
- `session` - Better-Auth session (null if anonymous)
- `anonymousId` - Anonymous user ID from header `x-anonymous-id`
- `userId` - `session.user.id` or `anonymousId`

## Authentication

Authentication is handled by **Better-Auth**:
- **Configuration**: `packages/auth/src/index.ts`
- **Adapter**: Prisma adapter with SQLite
- **Features**: Email/password, anonymous users, Polar payments
- **Cookies**: Secure in production (HttpOnly, Secure, SameSite)

### Anonymous Users
- Anonymous users identified by `x-anonymous-id` header
- Limitations: 5 calendars max, 100 events per calendar
- Auto-deleted after 60 days of inactivity

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

// API
import { appRouter, createContext } from '@calendraft/api';

// Auth
import { auth } from '@calendraft/auth';
```

## Environment Variables

### Backend (`apps/server/.env`)
```env
PORT=3000
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=file:./local.db
SENTRY_DSN=... (optional)
```

### Frontend (`apps/web/.env`)
```env
VITE_SERVER_URL=http://localhost:3000
VITE_SENTRY_DSN=... (optional)
```

## Code Standards

### Style
- Uses **Biome** for linting and formatting
- Auto-formatted on commit via Husky
- Run `bun run check` to verify

### Naming Conventions
- **Files**: `kebab-case.ts` for files, `PascalCase.tsx` for React components
- **Variables/Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

### TypeScript
- Use explicit types, avoid `any`
- Prefer `interface` over `type` for objects
- Use Zod schemas from `@calendraft/schemas` for validation

### Commits
Follow conventional commits:
```
type(scope): description

Body with details

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Security Considerations

- Rate limiting: 100 requests/minute per IP
- File size limit: 5 MB max
- CORS: Must be explicitly set in production (no `*`)
- Input validation: All inputs validated with Zod schemas
- Security headers: Automatically configured (X-Content-Type-Options, X-Frame-Options, etc.)

## Testing

```bash
# Run tests (if configured)
cd apps/web && bun run test
```

## Adding Features

When adding new features:
1. Check if functionality exists in packages (core, ics-utils, etc.)
2. Follow the dependency graph (don't create circular dependencies)
3. Update relevant package README if adding new exports
4. Add tests if applicable
5. Update documentation

## Important Notes

- **Database schema location**: `packages/db/prisma/schema/` (NOT `apps/server/prisma/`)
- **Package exports**: Check each package's README for available exports
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
