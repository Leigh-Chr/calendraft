# @calendraft/core

Business logic and types for calendar management. Framework-independent package.

## Installation

```bash
bun add @calendraft/core
```

## Quick usage

```typescript
import {
  type EventFormData,
  initializeFormData,
  validateEventForm,
  transformEventFormData,
  FIELD_LIMITS,
  applyPreset,
} from '@calendraft/core';

// Initialize an empty form
const formData = initializeFormData();

// Apply a preset
const withPreset = applyPreset('meeting', { 
  startDate: '2024-01-15T10:00',
  title: 'Team meeting'
});

// Validate
const result = validateEventForm(formData);
if (!result.valid) {
  console.log(result.errors);
}

// Transform for API
const apiData = transformEventFormData(formData, 'calendar-id');
```

## API

### Types

| Type | Description |
|------|-------------|
| `EventFormData` | Event form data |
| `EventEntity` | Persisted event entity |
| `CalendarEntity` | Calendar entity |
| `AttendeeData` | Attendee data |
| `AlarmData` | Alarm data |

### Validation

```typescript
import { validateEventForm, isValidEmail, isValidUrl } from '@calendraft/core';

validateEventForm(data)     // Complete validation
isValidEmail('a@b.com')     // true
isValidUrl('https://...')   // true
isValidHexColor('#FF0000')  // true
```

### Utilities

```typescript
import { 
  parseTags, addTag, removeTag,      // Tag management
  deepEqual,                          // Comparison
  normalizeDate, formatEventDuration, // Dates
  initializeFormData,                 // Form initialization
  transformEventFormData,             // API transformation
} from '@calendraft/core';
```

### Constants

```typescript
import { 
  FIELD_LIMITS,           // { TITLE: 255, DESCRIPTION: 10000, ... }
  EVENT_PRESETS,          // Presets: meeting, call, birthday, task...
  EVENT_STATUS_VALUES,    // ['CONFIRMED', 'TENTATIVE', 'CANCELLED']
  isValidEventStatus,     // Validator
} from '@calendraft/core';
```

### User limits

```typescript
import { 
  ANONYMOUS_LIMITS,       // { calendars: 10, eventsPerCalendar: 500, groups: 50, calendarsPerGroup: 15 }
  AUTHENTICATED_LIMITS,   // { calendars: 100, eventsPerCalendar: 2000, groups: 100, calendarsPerGroup: 20 }
  hasReachedCalendarLimit,
  hasReachedEventLimit,
  hasReachedGroupLimit,
  getMaxCalendars,
  getMaxEventsPerCalendar,
  getMaxGroups,
  getMaxCalendarsPerGroup,
} from '@calendraft/core';

// Check if limit reached
hasReachedCalendarLimit(isAuth, currentCount)  // boolean
hasReachedEventLimit(isAuth, currentCount)     // boolean
hasReachedGroupLimit(isAuth, currentCount)     // boolean

// Get limits
getMaxCalendars(isAuth)           // 10 or 100
getMaxEventsPerCalendar(isAuth)   // 500 or 2000
getMaxGroups(isAuth)              // 50 or 100
getMaxCalendarsPerGroup(isAuth)   // 15 or 20
```

### Recurrence (RRULE)

```typescript
import { parseRRule, buildRRule } from '@calendraft/core';

parseRRule('FREQ=WEEKLY;BYDAY=MO,WE')
// { frequency: 'WEEKLY', byDay: ['MO', 'WE'] }

buildRRule({ frequency: 'MONTHLY', count: 6 })
// 'FREQ=MONTHLY;COUNT=6'
```

## See also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Global project architecture
- [@calendraft/schemas](../schemas/README.md) - Zod validation schemas
- [@calendraft/ics-utils](../ics-utils/README.md) - ICS utilities

## License

MIT
