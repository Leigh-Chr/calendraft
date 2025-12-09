# @calendraft/db

Prisma client and database schemas for Calendraft.

## Installation

```bash
bun add @calendraft/db
```

## Quick usage

```typescript
import prisma from '@calendraft/db';

// Example query
const calendars = await prisma.calendar.findMany({
  where: { userId: 'user-id' },
  include: { events: true }
});
```

## Configuration

### Environment variables

```env
# PostgreSQL database URL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

## Scripts

```bash
# Generate Prisma client
bun run db:generate

# Push schema to DB (dev)
bun run db:push

# Create a migration
bun run db:migrate

# Open Prisma Studio
bun run db:studio

# Seed database with test data (development only)
bun run db:seed
```

### Database Seeding

The project includes a seed script that populates the database with realistic test data for development. This includes:

- **Users**: 3 test users (authenticated)
- **Calendars**: 5 calendars with different colors and sources
- **Events**: 10+ events with various types:
  - Regular meetings with attendees
  - Recurring events (daily, weekly)
  - Events with alarms (single and multiple)
  - Events with categories and resources
  - Events with location coordinates
  - Cancelled and tentative events
- **Share links**: 2 public share links
- **Share bundles**: 1 bundle with multiple calendars
- **Accounts and sessions**: Authentication data

**⚠️ Warning**: The seed script will **delete all existing data** before seeding. Only use this in development environments!

**Usage**:

```bash
# From the root of the project
bun run db:seed

# Or from the db package
cd packages/db
bun run db:seed
```

The seed script is automatically configured in `package.json` with the `prisma.seed` field, so it can also be run via Prisma CLI:

```bash
bunx prisma db seed
```

## Schemas

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
  // ... other RFC 5545 fields
  
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

### Authentication tables (Better-Auth)

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
  // ... other fields
}
```

## Architecture

### File structure

```
packages/db/
├── prisma/
│   ├── schema/
│   │   ├── schema.prisma  # Config (generator, datasource)
│   │   ├── auth.prisma    # Better-Auth tables
│   │   └── calendar.prisma # Business tables
│   └── generated/         # Generated client
├── src/
│   └── index.ts           # Client export
└── prisma.config.ts       # Prisma config
```

### PostgreSQL adapter

The client uses the PostgreSQL adapter:

```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });
```

## Relations

```
Calendar ─────< Event ─────< Attendee
                    └─────< Alarm

User ─────< Session
   └─────< Account
```

## Best practices

### Queries with relations

```typescript
// Include events
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

### Filters

```typescript
// Future events
const events = await prisma.event.findMany({
  where: {
    startDate: { gte: new Date() }
  },
  orderBy: { startDate: 'asc' }
});
```

## Exports

```typescript
// Default Prisma client
export default prisma;

// Generated types
export type { Calendar, Event, Attendee, Alarm } from '../prisma/generated/client';
```

## Dependencies

- `@prisma/client` - Prisma client
- `@prisma/adapter-pg` - PostgreSQL adapter

## See also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Global project architecture
- [@calendraft/auth](../auth/README.md) - Better-Auth configuration
- [DEPLOYMENT.md](../../DEPLOYMENT.md) - Deployment guide

## License

MIT
