# @calendraft/ics-utils

Utilitaires TypeScript pour parser et générer des fichiers ICS (iCalendar) selon RFC 5545.

## Installation

```bash
bun add @calendraft/ics-utils
```

## Usage rapide

```typescript
import { parseIcsFile, generateIcsFile } from '@calendraft/ics-utils';

// Parser un fichier ICS
const { events, errors } = parseIcsFile(icsContent);
console.log(events[0].title);

// Générer un fichier ICS
const ics = generateIcsFile({
  calendarName: 'Mon Calendrier',
  events: [{
    title: 'Réunion',
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

### Dates ICS

```typescript
import { formatDateToICS, parseDateFromICS } from '@calendraft/ics-utils';

formatDateToICS(new Date())           // '20240115T100000Z'
parseDateFromICS('20240115T100000Z')  // Date object
```

### Durées ISO 8601

```typescript
import { formatDuration, parseDuration } from '@calendraft/ics-utils';

formatDuration(15, 'minutes')  // 'PT15M'
parseDuration('PT15M')         // { value: 15, unit: 'minutes' }
```

### Alarmes

```typescript
import { parseAlarmTrigger, formatAlarmTrigger } from '@calendraft/ics-utils';

parseAlarmTrigger('-PT15M')              // { when: 'before', value: 15, unit: 'minutes' }
formatAlarmTrigger('before', 15, 'minutes')  // '-PT15M'
```

## Types exportés

- `ParsedEvent` - Événement parsé depuis ICS
- `ParsedAlarm` - Alarme parsée
- `ParsedAttendee` - Participant parsé
- `EventInput` - Input pour génération
- `GeneratorOptions` - Options du générateur

## Voir aussi

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture globale du projet
- [@calendraft/core](../core/README.md) - Logique métier et types

## License

MIT
