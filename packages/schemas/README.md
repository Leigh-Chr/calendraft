# @calendraft/schemas

Zod validation schemas shared between frontend and backend.

## Installation

```bash
bun add @calendraft/schemas
```

## Quick usage

```typescript
import { 
  eventCreateSchema,
  eventUpdateSchema,
  attendeeSchema,
  alarmSchema,
  FIELD_LIMITS 
} from '@calendraft/schemas';

// Validate event data
const result = eventCreateSchema.safeParse(data);
if (!result.success) {
  console.log(result.error.issues);
}
```

## Available schemas

### Events

| Schema | Description |
|--------|-------------|
| `eventCreateSchema` | Event creation (complete validation) |
| `eventUpdateSchema` | Event update (optional fields) |
| `eventFormDataSchema` | Form data (dates as strings) |

### Related entities

| Schema | Description |
|--------|-------------|
| `attendeeSchema` | Attendee with role and RSVP status |
| `alarmSchema` | Alarm with trigger and action |

### Utilities

| Schema | Description |
|--------|-------------|
| `rruleSchema` | RFC 5545 recurrence rule |
| `geoCoordinatesSchema` | Geographic coordinates |
| `recurrenceIdSchema` | ICS recurrence ID |
| `uidSchema` | Unique event identifier |
| `colorSchema` | Hexadecimal color |

## Base schemas

### emailSchema

```typescript
import { emailSchema } from '@calendraft/schemas';

emailSchema.parse('user@example.com'); // OK
emailSchema.parse('invalid');          // Error
```

### urlSchema

```typescript
import { urlSchema } from '@calendraft/schemas';

urlSchema.parse('https://example.com'); // OK
urlSchema.parse('not-a-url');           // Error
```

### nullableTrimmedStringSchema

```typescript
import { nullableTrimmedStringSchema } from '@calendraft/schemas';

const schema = nullableTrimmedStringSchema(255);
schema.parse('  hello  '); // 'hello' (trimmed)
schema.parse('');          // null
schema.parse(null);        // null
```

## Field limits

```typescript
import { FIELD_LIMITS } from '@calendraft/schemas';

FIELD_LIMITS.TITLE            // 255
FIELD_LIMITS.DESCRIPTION      // 10000
FIELD_LIMITS.LOCATION         // 1000
FIELD_LIMITS.URL              // 2048
FIELD_LIMITS.CATEGORIES_STRING // 500
FIELD_LIMITS.RRULE            // 500
// ... etc
```

## RFC 5545 validation

### RRULE

```typescript
import { rruleSchema } from '@calendraft/schemas';

// Valid
rruleSchema.parse('FREQ=DAILY;COUNT=5');
rruleSchema.parse('FREQ=WEEKLY;BYDAY=MO,WE,FR');

// Invalid - UNTIL and COUNT are mutually exclusive
rruleSchema.parse('FREQ=DAILY;UNTIL=20240101;COUNT=5'); // Error
```

### Alarms

```typescript
import { alarmSchema } from '@calendraft/schemas';

// DISPLAY requires summary
alarmSchema.parse({
  trigger: '-PT15M',
  action: 'DISPLAY',
  summary: 'Reminder'
}); // OK

// EMAIL requires summary AND description
alarmSchema.parse({
  trigger: '-PT15M',
  action: 'EMAIL',
  summary: 'Subject',
  description: 'Message body'
}); // OK
```

### Attendees

```typescript
import { attendeeSchema } from '@calendraft/schemas';

attendeeSchema.parse({
  email: 'attendee@example.com',
  name: 'John Doe',
  role: 'REQ_PARTICIPANT',
  status: 'NEEDS_ACTION',
  rsvp: true
});
```

## Exported types

```typescript
import type {
  EventCreate,
  EventUpdate,
  EventFormData,
  Attendee,
  Alarm
} from '@calendraft/schemas';
```

## Custom refinements

Schemas include advanced validations:

```typescript
// eventCreateSchema checks:
// 1. endDate > startDate
// 2. geoLatitude and geoLongitude together or neither
// 3. recurrenceId requires rrule
```

## Complete examples

### Event creation

```typescript
import { eventCreateSchema } from '@calendraft/schemas';

const eventData = {
  calendarId: 'calendar-123',
  title: 'Team meeting',
  startDate: new Date('2024-01-15T10:00:00Z'),
  endDate: new Date('2024-01-15T11:00:00Z'),
  description: 'Weekly meeting',
  location: 'Room A',
  status: 'CONFIRMED',
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
  attendees: [
    { email: 'alice@example.com', role: 'REQ_PARTICIPANT' },
    { email: 'bob@example.com', role: 'OPT_PARTICIPANT' }
  ],
  alarms: [
    { trigger: '-PT15M', action: 'DISPLAY', summary: 'Meeting reminder' }
  ]
};

const result = eventCreateSchema.safeParse(eventData);
```

### Frontend form

```typescript
import { eventFormDataSchema } from '@calendraft/schemas';

// Dates are strings (datetime-local format)
const formData = {
  title: 'My event',
  startDate: '2024-01-15T10:00',
  endDate: '2024-01-15T11:00'
};

eventFormDataSchema.parse(formData);
```

## Exports

```typescript
// Main schemas
export { eventCreateSchema, eventUpdateSchema, eventFormDataSchema };
export { attendeeSchema, alarmSchema };
export { rruleSchema, geoCoordinatesSchema };

// Utility schemas
export { emailSchema, urlSchema, nullableTrimmedStringSchema };
export { recurrenceIdSchema, uidSchema, colorSchema };
export { jsonDateArraySchema };

// Constants
export { FIELD_LIMITS };

// Types
export type * from './validation-types';
```

## Dependencies

- `zod` - TypeScript-first schema validation

## See also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Global project architecture
- [@calendraft/core](../core/README.md) - Business logic and types
- [@calendraft/api](../api/README.md) - tRPC API

## License

MIT
