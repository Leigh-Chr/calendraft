# @calendraft/api

tRPC API for Calendraft with routers, procedures, and authentication middleware.

## Installation

```bash
bun add @calendraft/api
```

## Quick usage

```typescript
import { appRouter, createContext } from '@calendraft/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

// In a Hono handler
app.use('/trpc/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext({ context: c }),
  });
});
```

## Architecture

### Available routers

| Router | Description |
|--------|-------------|
| `calendar` | Calendar CRUD (list, create, import, export, merge) |
| `event` | Event CRUD (create, update, delete) |

### Procedures

```typescript
import { publicProcedure, protectedProcedure, router } from '@calendraft/api';

// Public procedure (accessible without auth)
const myRouter = router({
  getPublicData: publicProcedure.query(() => {
    return { data: 'public' };
  }),
  
  // Protected procedure (requires authentication)
  getPrivateData: protectedProcedure.query(({ ctx }) => {
    return { userId: ctx.session.user.id };
  }),
});
```

### Context

The context includes:

```typescript
type Context = {
  session: Session | null;    // Better-Auth session if authenticated
  anonymousId: string | null; // Anonymous ID via x-anonymous-id header
  userId: string | null;      // session.user.id or anonymousId
};
```

## Detailed routers

### Calendar Router

```typescript
// List user's calendars
trpc.calendar.list.query();

// Get calendar by ID
trpc.calendar.getById.query({ id: 'calendar-id' });

// Create empty calendar
trpc.calendar.create.mutate({ name: 'My Calendar' });

// Import ICS file
trpc.calendar.import.mutate({ 
  name: 'Imported',
  icsContent: '...'
});

// Export as ICS
trpc.calendar.export.query({ id: 'calendar-id' });

// Merge multiple calendars
trpc.calendar.merge.mutate({
  calendarIds: ['id1', 'id2'],
  name: 'Merged'
});

// Delete calendar
trpc.calendar.delete.mutate({ id: 'calendar-id' });
```

### Event Router

```typescript
// List calendar events
trpc.event.list.query({ calendarId: 'calendar-id' });

// Create event
trpc.event.create.mutate({
  calendarId: 'calendar-id',
  title: 'Meeting',
  startDate: new Date(),
  endDate: new Date(),
  // ... other optional fields
});

// Update event
trpc.event.update.mutate({
  id: 'event-id',
  title: 'New title'
});

// Delete event
trpc.event.delete.mutate({ id: 'event-id' });
```

## Exports

```typescript
// Main router
export { appRouter, type AppRouter } from '@calendraft/api/routers';

// Context
export { createContext, type Context } from '@calendraft/api/context';

// Utilities
export { t, router, publicProcedure, protectedProcedure } from '@calendraft/api';

// Middleware
export { authMiddleware, createAuthMiddleware } from '@calendraft/api/middleware';
```

## Error handling

tRPC errors are automatically logged with context:

```typescript
// INTERNAL_SERVER_ERROR and BAD_REQUEST errors are logged
{
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Error message',
  path: 'calendar.create',
  userId: 'user-id'
}
```

## Dependencies

- `@trpc/server` - tRPC framework
- `@calendraft/auth` - Authentication
- `@calendraft/db` - Database
- `@calendraft/schemas` - Zod validation
- `@calendraft/ics-utils` - ICS parsing/generation

## See also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Global project architecture
- [@calendraft/auth](../auth/README.md) - Better-Auth configuration
- [@calendraft/db](../db/README.md) - Prisma client
- [@calendraft/schemas](../schemas/README.md) - Validation schemas

## License

MIT
