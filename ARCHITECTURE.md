# Architecture Calendraft

## Structure des packages

```
packages/
├── ics-utils/     # Parsing/génération ICS (aucune dépendance interne)
├── core/          # Logique métier pure (dépend de date-fns uniquement)
├── react-utils/   # Hooks et utilitaires React
├── schemas/       # Schémas Zod partagés
├── db/            # Couche données Prisma
├── api/           # API tRPC
└── auth/          # Authentification
```

## Diagramme de dépendances

```
apps/web ─────┬─────────────────────────────────────┐
              │                                     │
              ▼                                     ▼
        react-utils                               api
              │                                     │
              └──────────────┬──────────────────────┘
                             │
                             ▼
                           core
                             │
                             ▼
                        ics-utils  (0 dépendance interne)
```

## Packages externalisables

| Package | Publiable npm | Dépendances |
|---------|---------------|-------------|
| `@calendraft/ics-utils` | ✅ Oui | `ical.js` uniquement |
| `@calendraft/core` | ✅ Oui | `date-fns` uniquement |
| `@calendraft/react-utils` | ✅ Oui | Peer: `react`, `@tanstack/react-query` |

## Contenu des packages

### `@calendraft/ics-utils`
- `parseIcsFile()` - Parser fichiers ICS
- `generateIcsFile()` - Générer fichiers ICS
- `formatDateToICS()` / `parseDateFromICS()` - Conversion dates
- `formatDuration()` / `parseDuration()` - Durées ISO 8601
- `formatAlarmTrigger()` / `parseAlarmTrigger()` - Triggers alarmes

### `@calendraft/core`
- **Types**: `EventFormData`, `EventEntity`, `CalendarEntity`, `AttendeeData`, `AlarmData`
- **Validation**: `validateEventForm()`, `isValidEmail()`, `isValidUrl()`
- **Utils**: `deepEqual()`, `parseTags()`, `normalizeDate()`, `formatEventDuration()`
- **Form**: `initializeFormData()`, `transformEventFormData()`
- **Constants**: `FIELD_LIMITS`, `EVENT_PRESETS`, `EVENT_STATUS_VALUES`
- **Récurrence**: `parseRRule()`, `buildRRule()`

### `@calendraft/react-utils`
- **Hooks**: `useDebounce`, `useLocalStorage`, `useIsMobile`, `usePrevious`, `useMounted`
- **Query**: `createQueryKeys()`, `calendarKeys`, `eventKeys`
- **Error**: `getErrorMessage()`, `isNetworkError()`, `logErrorInDev()`
- **Style**: `cn()` (Tailwind class merge)

## Principes

1. **Single source of truth** - Types ICS dans `core/constants/ics-enums.ts`
2. **Pure functions** - Pas d'effets de bord dans `core` et `ics-utils`
3. **Pas d'over-engineering** - Une fonction par besoin, pas de converters inutiles
4. **Tree-shakeable** - Imports granulaires possibles

## Migration depuis apps/web

```typescript
// Avant
import { parseTags } from '@/lib/tag-utils';
import { FIELD_LIMITS } from '@/lib/field-limits';

// Après
import { parseTags, FIELD_LIMITS } from '@calendraft/core';
```
