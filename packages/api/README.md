# @calendraft/api

API tRPC pour Calendraft avec routers, procedures et middleware d'authentification.

## Installation

```bash
bun add @calendraft/api
```

## Usage rapide

```typescript
import { appRouter, createContext } from '@calendraft/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

// Dans un handler Hono
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

### Routers disponibles

| Router | Description |
|--------|-------------|
| `calendar` | CRUD des calendriers (liste, création, import, export, fusion) |
| `event` | CRUD des événements (création, modification, suppression) |

### Procedures

```typescript
import { publicProcedure, protectedProcedure, router } from '@calendraft/api';

// Procedure publique (accessible sans auth)
const myRouter = router({
  getPublicData: publicProcedure.query(() => {
    return { data: 'public' };
  }),
  
  // Procedure protégée (nécessite authentification)
  getPrivateData: protectedProcedure.query(({ ctx }) => {
    return { userId: ctx.session.user.id };
  }),
});
```

### Contexte

Le contexte inclut :

```typescript
type Context = {
  session: Session | null;    // Session Better-Auth si authentifié
  anonymousId: string | null; // ID anonyme via header x-anonymous-id
  userId: string | null;      // session.user.id ou anonymousId
};
```

## Routers détaillés

### Calendar Router

```typescript
// Liste des calendriers de l'utilisateur
trpc.calendar.list.query();

// Obtenir un calendrier par ID
trpc.calendar.getById.query({ id: 'calendar-id' });

// Créer un calendrier vide
trpc.calendar.create.mutate({ name: 'Mon Calendrier' });

// Importer un fichier ICS
trpc.calendar.import.mutate({ 
  name: 'Imported',
  icsContent: '...'
});

// Exporter en ICS
trpc.calendar.export.query({ id: 'calendar-id' });

// Fusionner plusieurs calendriers
trpc.calendar.merge.mutate({
  calendarIds: ['id1', 'id2'],
  name: 'Merged'
});

// Supprimer un calendrier
trpc.calendar.delete.mutate({ id: 'calendar-id' });
```

### Event Router

```typescript
// Liste des événements d'un calendrier
trpc.event.list.query({ calendarId: 'calendar-id' });

// Créer un événement
trpc.event.create.mutate({
  calendarId: 'calendar-id',
  title: 'Réunion',
  startDate: new Date(),
  endDate: new Date(),
  // ... autres champs optionnels
});

// Modifier un événement
trpc.event.update.mutate({
  id: 'event-id',
  title: 'Nouveau titre'
});

// Supprimer un événement
trpc.event.delete.mutate({ id: 'event-id' });
```

## Exports

```typescript
// Router principal
export { appRouter, type AppRouter } from '@calendraft/api/routers';

// Context
export { createContext, type Context } from '@calendraft/api/context';

// Utilitaires
export { t, router, publicProcedure, protectedProcedure } from '@calendraft/api';

// Middleware
export { authMiddleware, createAuthMiddleware } from '@calendraft/api/middleware';
```

## Gestion des erreurs

Les erreurs tRPC sont automatiquement loggées avec contexte :

```typescript
// Erreurs INTERNAL_SERVER_ERROR et BAD_REQUEST sont loggées
{
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Error message',
  path: 'calendar.create',
  userId: 'user-id'
}
```

## Dépendances

- `@trpc/server` - Framework tRPC
- `@calendraft/auth` - Authentification
- `@calendraft/db` - Base de données
- `@calendraft/schemas` - Validation Zod
- `@calendraft/ics-utils` - Parsing/génération ICS

## Voir aussi

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture globale du projet
- [@calendraft/auth](../auth/README.md) - Configuration Better-Auth
- [@calendraft/db](../db/README.md) - Client Prisma
- [@calendraft/schemas](../schemas/README.md) - Schémas de validation

## License

MIT

