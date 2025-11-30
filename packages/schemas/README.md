# @calendraft/schemas

Schémas de validation Zod partagés entre le frontend et le backend.

## Installation

```bash
bun add @calendraft/schemas
```

## Usage rapide

```typescript
import { 
  eventCreateSchema,
  eventUpdateSchema,
  attendeeSchema,
  alarmSchema,
  FIELD_LIMITS 
} from '@calendraft/schemas';

// Valider des données d'événement
const result = eventCreateSchema.safeParse(data);
if (!result.success) {
  console.log(result.error.issues);
}
```

## Schémas disponibles

### Événements

| Schéma | Description |
|--------|-------------|
| `eventCreateSchema` | Création d'événement (validation complète) |
| `eventUpdateSchema` | Mise à jour d'événement (champs optionnels) |
| `eventFormDataSchema` | Données de formulaire (dates en string) |

### Entités liées

| Schéma | Description |
|--------|-------------|
| `attendeeSchema` | Participant avec rôle et statut RSVP |
| `alarmSchema` | Alarme avec trigger et action |

### Utilitaires

| Schéma | Description |
|--------|-------------|
| `rruleSchema` | Règle de récurrence RFC 5545 |
| `geoCoordinatesSchema` | Coordonnées géographiques |
| `recurrenceIdSchema` | ID de récurrence ICS |
| `uidSchema` | Identifiant unique d'événement |
| `colorSchema` | Couleur hexadécimale |

## Schémas de base

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

## Limites des champs

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

## Validation RFC 5545

### RRULE

```typescript
import { rruleSchema } from '@calendraft/schemas';

// Valide
rruleSchema.parse('FREQ=DAILY;COUNT=5');
rruleSchema.parse('FREQ=WEEKLY;BYDAY=MO,WE,FR');

// Invalide - UNTIL et COUNT sont mutuellement exclusifs
rruleSchema.parse('FREQ=DAILY;UNTIL=20240101;COUNT=5'); // Error
```

### Alarmes

```typescript
import { alarmSchema } from '@calendraft/schemas';

// DISPLAY requiert summary
alarmSchema.parse({
  trigger: '-PT15M',
  action: 'DISPLAY',
  summary: 'Rappel'
}); // OK

// EMAIL requiert summary ET description
alarmSchema.parse({
  trigger: '-PT15M',
  action: 'EMAIL',
  summary: 'Sujet',
  description: 'Corps du message'
}); // OK
```

### Participants

```typescript
import { attendeeSchema } from '@calendraft/schemas';

attendeeSchema.parse({
  email: 'participant@example.com',
  name: 'John Doe',
  role: 'REQ_PARTICIPANT',
  status: 'NEEDS_ACTION',
  rsvp: true
});
```

## Types exportés

```typescript
import type {
  EventCreate,
  EventUpdate,
  EventFormData,
  Attendee,
  Alarm
} from '@calendraft/schemas';
```

## Refinements personnalisés

Les schémas incluent des validations avancées :

```typescript
// eventCreateSchema vérifie :
// 1. endDate > startDate
// 2. geoLatitude et geoLongitude ensemble ou aucun
// 3. recurrenceId requiert rrule
```

## Exemples complets

### Création d'événement

```typescript
import { eventCreateSchema } from '@calendraft/schemas';

const eventData = {
  calendarId: 'calendar-123',
  title: 'Réunion d\'équipe',
  startDate: new Date('2024-01-15T10:00:00Z'),
  endDate: new Date('2024-01-15T11:00:00Z'),
  description: 'Réunion hebdomadaire',
  location: 'Salle A',
  status: 'CONFIRMED',
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
  attendees: [
    { email: 'alice@example.com', role: 'REQ_PARTICIPANT' },
    { email: 'bob@example.com', role: 'OPT_PARTICIPANT' }
  ],
  alarms: [
    { trigger: '-PT15M', action: 'DISPLAY', summary: 'Rappel réunion' }
  ]
};

const result = eventCreateSchema.safeParse(eventData);
```

### Formulaire frontend

```typescript
import { eventFormDataSchema } from '@calendraft/schemas';

// Les dates sont en string (format datetime-local)
const formData = {
  title: 'Mon événement',
  startDate: '2024-01-15T10:00',
  endDate: '2024-01-15T11:00'
};

eventFormDataSchema.parse(formData);
```

## Exports

```typescript
// Schémas principaux
export { eventCreateSchema, eventUpdateSchema, eventFormDataSchema };
export { attendeeSchema, alarmSchema };
export { rruleSchema, geoCoordinatesSchema };

// Schémas utilitaires
export { emailSchema, urlSchema, nullableTrimmedStringSchema };
export { recurrenceIdSchema, uidSchema, colorSchema };
export { jsonDateArraySchema };

// Constantes
export { FIELD_LIMITS };

// Types
export type * from './validation-types';
```

## Dépendances

- `zod` - Validation de schémas TypeScript-first

## Voir aussi

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture globale du projet
- [@calendraft/core](../core/README.md) - Logique métier et types
- [@calendraft/api](../api/README.md) - API tRPC

## License

MIT

