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
| `share` | Share links and bundles (create, list, update, delete, access) |
| `user` | User profile and preferences |

### Procedures

```typescript
import { publicProcedure, protectedProcedure, authOrAnonProcedure, router } from '@calendraft/api';

// Public procedure (accessible without auth)
const myRouter = router({
  getPublicData: publicProcedure.query(() => {
    return { data: 'public' };
  }),
  
  // Protected procedure (requires authentication)
  getPrivateData: protectedProcedure.query(({ ctx }) => {
    return { userId: ctx.session.user.id };
  }),
  
  // Auth or anonymous procedure (requires session OR anonymous ID)
  // Most endpoints use this - allows both authenticated and anonymous users
  getUserData: authOrAnonProcedure.query(({ ctx }) => {
    return { userId: ctx.userId }; // ctx.userId is guaranteed (session or anonymous)
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
trpc.calendar.list.query({ 
  filterGroups: ['group-id1', 'group-id2'] // optional: filter by group IDs
});

// Get calendar by ID
trpc.calendar.getById.query({ id: 'calendar-id' });

// Create empty calendar
trpc.calendar.create.mutate({ name: 'My Calendar' });

// Delete calendar
trpc.calendar.delete.mutate({ id: 'calendar-id' });

// Import ICS file (creates new calendar)
trpc.calendar.importIcs.mutate({ 
  fileContent: 'BEGIN:VCALENDAR...',
  name: 'Imported Calendar' // optional
});
// Returns: { calendar: Calendar, importedEvents: number, warnings: string[] }

// Export calendar as ICS
trpc.calendar.exportIcs.query({ 
  id: 'calendar-id',
  dateFrom: '2024-01-01T00:00:00Z', // optional: filter by start date
  dateTo: '2024-12-31T23:59:59Z',   // optional: filter by end date
  categories: ['Work', 'Personal'],  // optional: filter by categories
  futureOnly: true                   // optional: only future events
});
// Returns: { icsContent: string, eventCount: number }

// Import ICS into existing calendar
trpc.calendar.importIcsIntoCalendar.mutate({
  calendarId: 'calendar-id',
  fileContent: 'BEGIN:VCALENDAR...',
  removeDuplicates: true // optional: remove duplicates during import
});
// Returns: { importedEvents: number, skippedDuplicates: number, warnings: string[] }

// Import calendar from URL
trpc.calendar.importFromUrl.mutate({
  url: 'https://example.com/calendar.ics',
  name: 'Imported Calendar' // optional
});
// Returns: { calendar: Calendar, importedEvents: number, warnings: string[] }

// Refresh calendar from its source URL
trpc.calendar.refreshFromUrl.mutate({
  calendarId: 'calendar-id',
  replaceAll: false,        // optional: if true, removes all existing events first
  skipDuplicates: true      // optional: if true, skips events that already exist
});
// Returns: { importedEvents: number, deletedEvents: number, skippedDuplicates: number, warnings: string[] }
// Note: Calendar must have a sourceUrl (created via importFromUrl)

// Merge multiple calendars
trpc.calendar.merge.mutate({
  calendarIds: ['id1', 'id2'], // min 2 calendars
  name: 'Merged Calendar',
  removeDuplicates: true // optional: remove duplicates during merge
});
// Returns: { calendar: Calendar, mergedEvents: number, removedDuplicates: number }

// Clean duplicates from a calendar
trpc.calendar.cleanDuplicates.mutate({ calendarId: 'calendar-id' });
// Returns: { removedCount: number, remainingEvents: number }
```

### Event Router

```typescript
// List calendar events
trpc.event.list.query({ 
  calendarId: 'calendar-id',
  sortBy: 'date',           // optional: 'date' | 'name' | 'duration' (default: 'date')
  sortDirection: 'asc',      // optional: 'asc' | 'desc' (default: 'asc', only used for 'date')
  filterKeyword: 'meeting',  // optional: search in title, description, location
  filterDateFrom: new Date(), // optional: filter by start date
  filterDateTo: new Date(),   // optional: filter by end date
  limit: 50,                  // optional: pagination limit (1-100, default: 50)
  cursor: 'cursor-string'    // optional: pagination cursor
});
// Returns: { events: Event[], nextCursor?: string }

// Get event by ID
trpc.event.getById.query({ id: 'event-id' });
// Returns: Event with all relations (attendees, alarms, categories, resources, etc.)

// Create event
trpc.event.create.mutate({
  calendarId: 'calendar-id',
  title: 'Meeting',
  startDate: new Date(),
  endDate: new Date(),
  // ... other optional fields (description, location, attendees, alarms, etc.)
});

// Update event
trpc.event.update.mutate({
  id: 'event-id',
  title: 'New title',
  // ... other optional fields
});

// Delete event
trpc.event.delete.mutate({ id: 'event-id' });

// Duplicate event
trpc.event.duplicate.mutate({
  id: 'event-id',
  targetCalendarId: 'target-calendar-id', // optional: duplicate to different calendar
  dayOffset: 0 // optional: offset in days (default: 0 = same day)
});
// Returns: duplicated event with all relations (attendees, alarms, etc.)

// Bulk delete events
trpc.event.bulkDelete.mutate({
  eventIds: ['id1', 'id2', 'id3'] // max 100 events
});
// Returns: { deletedCount: number, requestedCount: number }

// Bulk move events to another calendar
trpc.event.bulkMove.mutate({
  eventIds: ['id1', 'id2', 'id3'], // max 100 events
  targetCalendarId: 'target-calendar-id'
});
// Returns: { movedCount: number, requestedCount: number, targetCalendarId: string, targetCalendarName: string }
```

### Share Router

The share router handles both single calendar share links and multi-calendar bundles.

#### Single Calendar Share Links

```typescript
// Detect share type by token (public)
trpc.share.detectType.query({ token: '...' });
// Returns: { type: 'single' | 'bundle' | null, reason?: string }

// Create a share link for a calendar
trpc.share.create.mutate({ 
  calendarId: 'calendar-id',
  name: 'My Share Link', // optional
  expiresAt: '2024-12-31T23:59:59Z' // optional ISO datetime
});

// List all share links for a calendar
trpc.share.list.query({ calendarId: 'calendar-id' });

// Update a share link
trpc.share.update.mutate({ 
  id: 'share-link-id',
  name: 'New Name', // optional
  isActive: true, // optional
  expiresAt: '2024-12-31T23:59:59Z' // optional, null to remove expiration
});

// Delete a share link
trpc.share.delete.mutate({ id: 'share-link-id' });

// PUBLIC: Get calendar by token (returns ICS content)
trpc.share.getByToken.query({ token: 'share-token' });
// Returns: { icsContent: string, calendarName: string, eventCount: number }

// PUBLIC: Get calendar info by token (without ICS)
trpc.share.getInfoByToken.query({ token: 'share-token' });
// Returns: { calendarName: string, calendarColor: string, eventCount: number, shareName: string | null }

// PUBLIC: Get calendar events by token (for display)
trpc.share.getEventsByToken.query({ token: 'share-token' });
// Returns: { calendarName: string, calendarColor: string, events: Event[] }
```

#### Share Bundles (Multiple Calendars)

```typescript
// Create a share bundle
trpc.share.bundle.create.mutate({ 
  calendarIds: ['id1', 'id2'], // or groupId: 'group-id'
  name: 'My Bundle', // optional
  expiresAt: '2024-12-31T23:59:59Z', // optional
  removeDuplicates: true // optional, default: false
});
// Limited to 20 bundles per user, 15 calendars per bundle

// List all share bundles
trpc.share.bundle.list.query();
// Returns bundles where ALL calendars belong to the user

// Update a share bundle
trpc.share.bundle.update.mutate({ 
  id: 'bundle-id',
  name: 'New Name', // optional
  isActive: true, // optional
  expiresAt: '2024-12-31T23:59:59Z', // optional, null to remove
  removeDuplicates: false // optional
});

// Delete a share bundle
trpc.share.bundle.delete.mutate({ id: 'bundle-id' });

// PUBLIC: Get bundle by token (returns merged ICS content)
trpc.share.bundle.getByToken.query({ token: 'bundle-token' });
// Returns: { icsContent: string, bundleName: string, eventCount: number, calendarCount: number, removedDuplicates: number, removedCalendars: number }

// PUBLIC: Get bundle info by token (without ICS)
trpc.share.bundle.getInfoByToken.query({ token: 'bundle-token' });
// Returns: { bundleName: string, calendarCount: number, totalEvents: number, removeDuplicates: boolean, removedCalendars: number, calendars: Array<{ id: string, name: string, color: string | null, eventCount: number }> }
```

**Limits:**
- Maximum 10 share links per calendar
- Maximum 20 share bundles per user
- Maximum 15 calendars per bundle

### User Router

```typescript
// Get current user's usage information (authenticated only)
trpc.user.getUsage.query();
// Returns: { 
//   isAuthenticated: boolean,
//   usage: { 
//     calendarCount: number,
//     maxCalendars: number,
//     maxEventsPerCalendar: number 
//   }
// }
```

### Calendar Groups

The calendar router includes a `group` sub-router for managing calendar groups:

```typescript
// Create a calendar group
trpc.calendar.group.create.mutate({
  name: 'My Group',
  description: 'Optional description', // optional
  color: '#FF0000', // optional, format: #RRGGBB
  calendarIds: ['id1', 'id2'] // required, min 1 calendar
});

// List all calendar groups
trpc.calendar.group.list.query();

// Get group by ID
trpc.calendar.group.getById.query({ id: 'group-id' });

// Get groups that contain a specific calendar
trpc.calendar.group.getByCalendarId.query({ calendarId: 'calendar-id' });
// Returns: Array of { id: string, name: string, color: string | null }

// Update a group
trpc.calendar.group.update.mutate({
  id: 'group-id',
  name: 'New Name', // optional
  description: 'New description', // optional
  color: '#00FF00' // optional
});

// Delete a group
trpc.calendar.group.delete.mutate({ id: 'group-id' });

// Add calendars to a group
trpc.calendar.group.addCalendars.mutate({
  id: 'group-id',
  calendarIds: ['id1', 'id2']
});

// Remove calendars from a group
trpc.calendar.group.removeCalendars.mutate({
  id: 'group-id',
  calendarIds: ['id1', 'id2']
});
```

**Group Limits:**
- Anonymous users: 50 groups, 15 calendars per group
- Authenticated users: 100 groups, 20 calendars per group

## Exports

```typescript
// Main router
export { appRouter, type AppRouter } from '@calendraft/api/routers';

// Context
export { createContext, type Context } from '@calendraft/api/context';

// Utilities
export { t, router, publicProcedure, protectedProcedure, authOrAnonProcedure } from '@calendraft/api';

// Middleware helpers
export { 
  buildOwnershipFilter,
  isAnonymousUser,
  isAuthenticatedUser,
  checkCalendarLimit,
  checkEventLimit,
  getUserUsage
} from '@calendraft/api/middleware';
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
