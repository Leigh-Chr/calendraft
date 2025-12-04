# Architecture Calendraft

Ce document décrit l'architecture technique du projet et les relations entre les packages.

## Vue d'ensemble

Calendraft est un **monorepo** géré avec Turborepo, composé de :
- **2 applications** : `apps/web` (frontend) et `apps/server` (backend)
- **7 packages** partagés dans `packages/`

## Structure des packages

```
packages/
├── ics-utils/     # Parsing/génération ICS (0 dépendance interne)
├── core/          # Logique métier pure (dépend de date-fns)
├── schemas/       # Schémas Zod partagés
├── react-utils/   # Hooks et utilitaires React
├── db/            # Client Prisma et schémas de base de données
├── auth/          # Configuration Better-Auth
└── api/           # Routers tRPC
```

## Diagramme de dépendances

```
                        ┌─────────────┐
                        │  apps/web   │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌───────────┐    ┌──────────┐    ┌──────────┐
        │react-utils│    │ schemas  │    │   api    │◄─── apps/server
        └─────┬─────┘    └────┬─────┘    └────┬─────┘
              │               │               │
              │               │    ┌──────────┼──────────┐
              │               │    │          │          │
              │               │    ▼          ▼          ▼
              │               │  ┌────┐   ┌──────┐   ┌──────┐
              │               │  │auth│   │  db  │   │ core │
              │               │  └──┬─┘   └───┬──┘   └───┬──┘
              │               │     │         │         │
              └───────────────┴─────┴─────────┴─────────┘
                                      │
                                      ▼
                              ┌─────────────┐
                              │  ics-utils  │ (0 dépendance interne)
                              └─────────────┘
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
- **Query**: `createQueryKeys()` - Factory générique pour query keys
- **Error**: `getErrorMessage()`, `isNetworkError()`, `logErrorInDev()`
- **Style**: `cn()` (Tailwind class merge)

## Principes

1. **Single source of truth** - Types ICS dans `core/constants/ics-enums.ts`
2. **Pure functions** - Pas d'effets de bord dans `core` et `ics-utils`
3. **Pas d'over-engineering** - Une fonction par besoin, pas de converters inutiles
4. **Tree-shakeable** - Imports granulaires possibles

## Authentification

L'application supporte deux modes d'utilisateurs :
- **Authentifié** : Utilisateur avec compte (session Better-Auth)
- **Anonyme** : ID unique stocké côté client (`anon-xxx`)

Les procédures tRPC utilisent le pattern suivant :
```typescript
// Endpoints publics (health check, etc.)
publicProcedure.query(...)

// Endpoints nécessitant identification (session OU anonyme)
authOrAnonProcedure.query(...)  // ctx.userId garanti

// Endpoints nécessitant un compte (session uniquement)
protectedProcedure.query(...)   // ctx.session garanti
```

### `@calendraft/schemas`
- **Événements** : `eventCreateSchema`, `eventUpdateSchema`, `eventFormDataSchema`
- **Entités** : `attendeeSchema`, `alarmSchema`
- **RFC 5545** : `rruleSchema`, `geoCoordinatesSchema`, `recurrenceIdSchema`
- **Constantes** : `FIELD_LIMITS`

### `@calendraft/db`
- Client Prisma configuré avec adapter PostgreSQL
- Modèles : `Calendar`, `Event`, `Attendee`, `Alarm`, `User`, `Session`

### `@calendraft/auth`
- Configuration Better-Auth avec adapter Prisma
- Gestion des cookies sécurisés

### `@calendraft/api`
- `calendarRouter` : CRUD calendriers, import/export ICS, fusion
- `eventRouter` : CRUD événements
- **Procédures tRPC** :
  - `publicProcedure` : Endpoints vraiment publics (health check)
  - `authOrAnonProcedure` : Requiert session OU ID anonyme (majorité des endpoints)
  - `protectedProcedure` : Requiert session authentifiée uniquement

## Migration depuis apps/web

```typescript
// Avant
import { parseTags } from '@/lib/tag-utils';
import { FIELD_LIMITS } from '@/lib/field-limits';

// Après
import { parseTags, FIELD_LIMITS } from '@calendraft/core';
```

## Voir aussi

- [README.md](README.md) - Vue d'ensemble du projet
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de déploiement
- Documentation des packages dans `packages/*/README.md`
