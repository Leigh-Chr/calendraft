# @calendraft/db

Client Prisma et schémas de base de données pour Calendraft.

## Installation

```bash
bun add @calendraft/db
```

## Usage rapide

```typescript
import prisma from '@calendraft/db';

// Requête exemple
const calendars = await prisma.calendar.findMany({
  where: { userId: 'user-id' },
  include: { events: true }
});
```

## Configuration

### Variables d'environnement

```env
# URL de la base de données SQLite
DATABASE_URL="file:./local.db"
```

## Scripts

```bash
# Générer le client Prisma
bun run db:generate

# Pousser le schéma vers la DB (dev)
bun run db:push

# Créer une migration
bun run db:migrate

# Ouvrir Prisma Studio
bun run db:studio
```

## Schémas

### Calendar

```prisma
model Calendar {
  id        String   @id @default(cuid())
  name      String
  userId    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  events    Event[]
}
```

### Event

```prisma
model Event {
  id          String    @id @default(cuid())
  calendarId  String
  title       String
  startDate   DateTime
  endDate     DateTime
  description String?
  location    String?
  // ... autres champs RFC 5545
  
  calendar    Calendar  @relation(fields: [calendarId], references: [id])
  attendees   Attendee[]
  alarms      Alarm[]
}
```

### Attendee

```prisma
model Attendee {
  id      String  @id @default(cuid())
  eventId String
  name    String?
  email   String
  role    String?
  status  String?
  rsvp    Boolean @default(false)
  
  event   Event   @relation(fields: [eventId], references: [id])
}
```

### Alarm

```prisma
model Alarm {
  id          String  @id @default(cuid())
  eventId     String
  trigger     String
  action      String
  summary     String?
  description String?
  duration    String?
  repeat      Int?
  
  event       Event   @relation(fields: [eventId], references: [id])
}
```

### Tables d'authentification (Better-Auth)

```prisma
model User {
  id            String    @id
  email         String    @unique
  name          String?
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  token     String   @unique
  // ... autres champs
}
```

## Architecture

### Structure des fichiers

```
packages/db/
├── prisma/
│   ├── schema/
│   │   ├── schema.prisma  # Config (generator, datasource)
│   │   ├── auth.prisma    # Tables Better-Auth
│   │   └── calendar.prisma # Tables métier
│   └── generated/         # Client généré
├── src/
│   └── index.ts           # Export du client
└── prisma.config.ts       # Config Prisma
```

### Adapter LibSQL

Le client utilise l'adapter LibSQL pour SQLite :

```typescript
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../prisma/generated/client';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./dev.db'
});

const prisma = new PrismaClient({ adapter });
```

## Relations

```
Calendar ─────< Event ─────< Attendee
                    └─────< Alarm

User ─────< Session
   └─────< Account
```

## Bonnes pratiques

### Requêtes avec relations

```typescript
// Inclure les événements
const calendar = await prisma.calendar.findUnique({
  where: { id },
  include: {
    events: {
      include: {
        attendees: true,
        alarms: true
      }
    }
  }
});
```

### Transactions

```typescript
await prisma.$transaction([
  prisma.event.deleteMany({ where: { calendarId: id } }),
  prisma.calendar.delete({ where: { id } })
]);
```

### Filtres

```typescript
// Événements futurs
const events = await prisma.event.findMany({
  where: {
    startDate: { gte: new Date() }
  },
  orderBy: { startDate: 'asc' }
});
```

## Exports

```typescript
// Client Prisma par défaut
export default prisma;

// Types générés
export type { Calendar, Event, Attendee, Alarm } from '../prisma/generated/client';
```

## Dépendances

- `@prisma/client` - Client Prisma
- `@prisma/adapter-libsql` - Adapter pour SQLite/LibSQL

## Voir aussi

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture globale du projet
- [@calendraft/auth](../auth/README.md) - Configuration Better-Auth
- [DEPLOYMENT.md](../../DEPLOYMENT.md) - Guide de déploiement

## License

MIT

