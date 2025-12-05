# @calendraft/ics-utils

TypeScript utilities for parsing and generating ICS (iCalendar) files according to RFC 5545.

## Installation

```bash
bun add @calendraft/ics-utils
```

## Quick usage

```typescript
import { parseIcsFile, generateIcsFile } from '@calendraft/ics-utils';

// Parse an ICS file
const { events, errors } = parseIcsFile(icsContent);
console.log(events[0].title);

// Generate an ICS file
const ics = generateIcsFile({
  calendarName: 'My Calendar',
  events: [{
    title: 'Meeting',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
  }]
});
```

## API

### Parser / Generator

```typescript
parseIcsFile(content: string): { events: ParsedEvent[], errors: string[] }
generateIcsFile(options: GeneratorOptions): string
```

### ICS Dates

```typescript
import { formatDateToICS, parseDateFromICS } from '@calendraft/ics-utils';

formatDateToICS(new Date())           // '20240115T100000Z'
parseDateFromICS('20240115T100000Z')  // Date object
```

### ISO 8601 Durations

```typescript
import { formatDuration, parseDuration } from '@calendraft/ics-utils';

formatDuration(15, 'minutes')  // 'PT15M'
parseDuration('PT15M')         // { value: 15, unit: 'minutes' }
```

### Alarms

```typescript
import { parseAlarmTrigger, formatAlarmTrigger } from '@calendraft/ics-utils';

parseAlarmTrigger('-PT15M')              // { when: 'before', value: 15, unit: 'minutes' }
formatAlarmTrigger('before', 15, 'minutes')  // '-PT15M'
```

## Exported types

- `ParsedEvent` - Event parsed from ICS
- `ParsedAlarm` - Parsed alarm
- `ParsedAttendee` - Parsed attendee
- `EventInput` - Input for generation
- `GeneratorOptions` - Generator options

## See also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Global project architecture
- [@calendraft/core](../core/README.md) - Business logic and types

## License

MIT
