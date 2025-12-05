# Calendraft Architecture

This document describes the technical architecture of the project and the relationships between packages.

## Overview

Calendraft is a **monorepo** managed with Turborepo, composed of:
- **2 applications**: `apps/web` (frontend) and `apps/server` (backend)
- **7 packages** shared in `packages/`

## Package Structure

```
packages/
├── ics-utils/     # ICS parsing/generation (0 internal dependencies)
├── core/          # Pure business logic (depends on date-fns)
├── schemas/       # Shared Zod schemas
├── react-utils/   # React hooks and utilities
├── db/            # Prisma client and database schemas
├── auth/          # Better-Auth configuration
└── api/           # tRPC routers
```

## Dependency Diagram

```
                        ┌─────────────┐
                        │  apps/web   │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌───────────┐    ┌──────────┐    ┌──────────┐
        │react-utils│    │ schemas  │    │   api    │◄─── apps/server
        └─────┬─────┘    └────┬─────┘    └────┬─────┘
              │               │               │
              │               │    ┌──────────┼──────────┐
              │               │    │          │          │
              │               │    ▼          ▼          ▼
              │               │  ┌────┐   ┌──────┐   ┌──────┐
              │               │  │auth│   │  db  │   │ core │
              │               │  └──┬─┘   └───┬──┘   └───┬──┘
              │               │     │         │         │
              └───────────────┴─────┴─────────┴─────────┘
                                      │
                                      ▼
                              ┌─────────────┐
                              │  ics-utils  │ (0 dépendance interne)
                              └─────────────┘
```

## Publishable Packages

| Package | Publishable to npm | Dependencies |
|---------|-------------------|--------------|
| `@calendraft/ics-utils` | ✅ Yes | `ical.js` only |
| `@calendraft/core` | ✅ Yes | `date-fns` only |
| `@calendraft/react-utils` | ✅ Yes | Peer: `react`, `@tanstack/react-query` |

## Package Contents

### `@calendraft/ics-utils`
- `parseIcsFile()` - Parse ICS files
- `generateIcsFile()` - Generate ICS files
- `formatDateToICS()` / `parseDateFromICS()` - Date conversion
- `formatDuration()` / `parseDuration()` - ISO 8601 durations
- `formatAlarmTrigger()` / `parseAlarmTrigger()` - Alarm triggers

### `@calendraft/core`
- **Types**: `EventFormData`, `EventEntity`, `CalendarEntity`, `AttendeeData`, `AlarmData`
- **Validation**: `validateEventForm()`, `isValidEmail()`, `isValidUrl()`
- **Utils**: `deepEqual()`, `parseTags()`, `normalizeDate()`, `formatEventDuration()`
- **Form**: `initializeFormData()`, `transformEventFormData()`
- **Constants**: `FIELD_LIMITS`, `EVENT_PRESETS`, `EVENT_STATUS_VALUES`
- **Recurrence**: `parseRRule()`, `buildRRule()`

### `@calendraft/react-utils`
- **Hooks**: `useDebounce`, `useLocalStorage`, `useIsMobile`, `usePrevious`, `useMounted`
- **Query**: `createQueryKeys()` - Generic factory for query keys
- **Error**: `getErrorMessage()`, `isNetworkError()`, `logErrorInDev()`
- **Style**: `cn()` (Tailwind class merge)

## Principles

1. **Single source of truth** - ICS types in `core/constants/ics-enums.ts`
2. **Pure functions** - No side effects in `core` and `ics-utils`
3. **No over-engineering** - One function per need, no unnecessary converters
4. **Tree-shakeable** - Granular imports possible

## Authentication

The application supports two user modes:
- **Authenticated**: User with account (Better-Auth session)
- **Anonymous**: Unique ID stored client-side (`anon-xxx`)

tRPC procedures use the following pattern:
```typescript
// Public endpoints (health check, etc.)
publicProcedure.query(...)

// Endpoints requiring identification (session OR anonymous)
authOrAnonProcedure.query(...)  // ctx.userId guaranteed

// Endpoints requiring an account (session only)
protectedProcedure.query(...)   // ctx.session guaranteed
```

### `@calendraft/schemas`
- **Events**: `eventCreateSchema`, `eventUpdateSchema`, `eventFormDataSchema`
- **Entities**: `attendeeSchema`, `alarmSchema`
- **RFC 5545**: `rruleSchema`, `geoCoordinatesSchema`, `recurrenceIdSchema`
- **Constants**: `FIELD_LIMITS`

### `@calendraft/db`
- Prisma client configured with PostgreSQL adapter
- Models: `Calendar`, `Event`, `Attendee`, `Alarm`, `User`, `Session`

### `@calendraft/auth`
- Better-Auth configuration with Prisma adapter
- Secure cookie management

### `@calendraft/api`
- `calendarRouter`: Calendar CRUD, ICS import/export, merge
- `eventRouter`: Event CRUD
- **tRPC Procedures**:
  - `publicProcedure`: Truly public endpoints (health check)
  - `authOrAnonProcedure`: Requires session OR anonymous ID (majority of endpoints)
  - `protectedProcedure`: Requires authenticated session only

## Migration from apps/web

```typescript
// Before
import { parseTags } from '@/lib/tag-utils';
import { FIELD_LIMITS } from '@/lib/field-limits';

// After
import { parseTags, FIELD_LIMITS } from '@calendraft/core';
```

## See Also

- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- Package documentation in `packages/*/README.md`
