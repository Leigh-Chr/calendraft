refactor: major codebase refactoring and infrastructure improvements

Comprehensive refactoring to improve code organization, performance, and
maintainability. This includes component extraction, backend modularization,
infrastructure enhancements, and code quality improvements.

## Breaking Changes

### API Changes
- `calendar.core.list` now returns `{ calendars, nextCursor }` instead of direct array
  - Added cursor-based pagination with `limit` and `cursor` parameters
- `calendar.group.getById` now returns calendars with full details (eventCount, sourceUrl, etc.)
- Removed middleware exports: `checkAnonymousCalendarLimit`, `checkAnonymousEventLimit`, `getAnonymousUsage`
  - Use `checkCalendarLimit`, `checkEventLimit`, `getUserUsage` instead

## Refactoring

### Frontend (apps/web)
- Extract calendar list components from `calendars.tsx` (1259 lines refactored)
  - New components: `CalendarsSection`, `GroupsSection`, `CalendarsListHeader`, `CalendarsListLoadingState`, `CalendarCard`, `TourAlertDialog`
  - New hooks: `use-calendar-dialogs`, `use-calendar-groups`, `use-calendar-search-sort`, `use-calendar-selection`, `use-calendraft-tour`
  - New utilities: `calendar-sort.ts`, `calendar-export.ts`, `tour-constants.ts`
- Refactor `share/$token.tsx` with extracted utilities and components
  - Extract error handling, download logic, and view components
  - New hook: `useShareData()` for share data management
- Refactor `groups/$groupId.tsx` with extracted utility functions
- Remove unnecessary `React.memo`, `useCallback`, and `useMemo` (React Compiler handles memoization)
- Clean up unused functions in `date-utils.ts`

### Backend (packages/api)
- Modularize event router into separate modules:
  - `event/access.ts` - Access verification functions
  - `event/queries.ts` - Optimized query builders
  - `event/updates.ts` - Event relation updates
  - `event/validation.ts` - Validation functions
- Refactor calendar routers to use `verifyCalendarAccess()` helper
  - Optimize queries (single query instead of multiple)
  - Improve error handling and type safety
- Add cursor-based pagination to `calendar.core.list`
- Enhance `calendar.group.getById` response with full calendar details
- Extract utility functions from `share.ts` router

## Infrastructure

### Logging
- Add structured logging with correlation IDs across all packages
  - New `logger.ts` in: server, api, auth, react-utils, web
  - JSON format in production, readable format in development
  - Support for request context (userId, ip, path, method)
  - Dedicated security event logging

### Rate Limiting
- Implement Redis-based rate limiting with in-memory fallback
  - Distributed rate limiting support
  - Graceful degradation when Redis is unavailable
  - Add Redis service to Docker Compose (dev and prod)

### Environment Management
- Centralize environment variable management with `env.ts` modules
  - Validation and type safety
  - Better error handling
  - New modules in: server, auth, db

### Configuration
- Improve Vite configuration with proper `loadEnv()` usage
- Update Biome configuration (add `useLiteralKeys` rule)
- Update Knip configuration (add config package, ignore seed dependencies)
- Improve Turbo configuration (better dependency chains)

## Performance

### Database
- Add composite indexes for better query performance:
  - `Calendar`: `[userId, updatedAt]` for sorted list queries
  - `Event`: `[calendarId, startDate]` for date filtering
  - `Event`: `[calendarId, endDate, startDate]` for duration sorting
  - `CalendarGroupMember`: `[groupId, calendarId]` for multi-group filtering

### Queries
- Optimize database queries (single query instead of multiple)
- Use `verifyCalendarAccess()` to avoid redundant queries
- Add cursor-based pagination for large lists

### React
- Remove unnecessary memoization (React Compiler handles it automatically)
- Improve component rendering performance

## Code Quality

### Cleanup
- Remove unused UI components (`scroll-area.tsx`, `slider.tsx`)
- Remove unused middleware (`security-headers.ts`)
- Remove unused dependencies (`@fontsource-variable/*`, `@radix-ui/react-scroll-area`, `@radix-ui/react-slider`, `babel-plugin-react-compiler`)
- Clean up unused date utility functions

### Testing
- Add test infrastructure with Vitest
  - Test configurations for server and api packages
  - Initial tests for rate limiting, calendar access, and components
  - Add `@testing-library/react` for React component tests

### TypeScript
- Improve type safety with explicit annotations
- Better null handling
- Use Prisma namespace for raw SQL queries

### Error Handling
- Use structured logger instead of `console.error`
- Improve error messages and context
- Better error handling in React utilities

## Dependencies

### Added
- `ioredis` (^5.4.1) - Redis client for rate limiting
- `@types/ioredis` (^5.0.0) - TypeScript types
- `@testing-library/react` (^16.1.0) - React testing utilities
- `vitest` (^4.0.15) - Test framework
- `@vitest/coverage-v8` (^4.0.15) - Code coverage

### Removed
- `@hono/trpc-server` - Moved to appropriate packages
- `hono` (root) - Moved to appropriate packages
- `tsdown` (root) - Moved to appropriate packages
- Unused font packages and UI components

Files changed: 78 files (3151 insertions, 3381 deletions)

