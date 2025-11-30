# @calendraft/core

Logique métier et types pour la gestion de calendriers. Package sans dépendance framework.

## Installation

```bash
bun add @calendraft/core
```

## Usage rapide

```typescript
import {
  type EventFormData,
  initializeFormData,
  validateEventForm,
  transformEventFormData,
  FIELD_LIMITS,
  applyPreset,
} from '@calendraft/core';

// Initialiser un formulaire vide
const formData = initializeFormData();

// Appliquer un preset
const withPreset = applyPreset('meeting', { 
  startDate: '2024-01-15T10:00',
  title: 'Réunion équipe'
});

// Valider
const result = validateEventForm(formData);
if (!result.valid) {
  console.log(result.errors);
}

// Transformer pour l'API
const apiData = transformEventFormData(formData, 'calendar-id');
```

## API

### Types

| Type | Description |
|------|-------------|
| `EventFormData` | Données de formulaire d'événement |
| `EventEntity` | Entité événement persistée |
| `CalendarEntity` | Entité calendrier |
| `AttendeeData` | Données participant |
| `AlarmData` | Données alarme |

### Validation

```typescript
import { validateEventForm, isValidEmail, isValidUrl } from '@calendraft/core';

validateEventForm(data)     // Validation complète
isValidEmail('a@b.com')     // true
isValidUrl('https://...')   // true
isValidHexColor('#FF0000')  // true
```

### Utilitaires

```typescript
import { 
  parseTags, addTag, removeTag,      // Gestion tags
  deepEqual,                          // Comparaison
  normalizeDate, formatEventDuration, // Dates
  initializeFormData,                 // Init formulaire
  transformEventFormData,             // Transform API
} from '@calendraft/core';
```

### Constantes

```typescript
import { 
  FIELD_LIMITS,           // { TITLE: 255, DESCRIPTION: 10000, ... }
  EVENT_PRESETS,          // Presets: meeting, call, birthday, task...
  EVENT_STATUS_VALUES,    // ['CONFIRMED', 'TENTATIVE', 'CANCELLED']
  isValidEventStatus,     // Validator
} from '@calendraft/core';
```

### Récurrence (RRULE)

```typescript
import { parseRRule, buildRRule } from '@calendraft/core';

parseRRule('FREQ=WEEKLY;BYDAY=MO,WE')
// { frequency: 'WEEKLY', byDay: ['MO', 'WE'] }

buildRRule({ frequency: 'MONTHLY', count: 6 })
// 'FREQ=MONTHLY;COUNT=6'
```

## License

MIT
