# @calendraft/auth

Better-Auth configuration for Calendraft authentication.

## Installation

```bash
bun add @calendraft/auth
```

## Quick usage

```typescript
import { auth } from '@calendraft/auth';

// In a Hono handler
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});
```

## Configuration

### Environment variables

```env
# Required
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# CORS (for cross-origin cookies)
CORS_ORIGIN=http://localhost:3001
```

## Features

### Email/Password authentication

```typescript
// Client-side with Better-Auth client
import { createAuthClient } from 'better-auth/client';

const authClient = createAuthClient({
  baseURL: 'http://localhost:3000'
});

// Sign up
await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
});

// Sign in
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await authClient.signOut();
```

### Sessions

```typescript
import { auth } from '@calendraft/auth';

// Get session from headers
const session = await auth.api.getSession({
  headers: request.headers
});

if (session) {
  console.log(session.user.id);
  console.log(session.user.email);
}
```

## Architecture

### Prisma adapter

Uses Prisma adapter for Better-Auth with PostgreSQL:

```typescript
prismaAdapter(prisma, {
  provider: 'postgresql'
});
```

### Cookie configuration

| Environment | SameSite | Secure | HttpOnly |
|-------------|----------|--------|----------|
| Development  | `lax`    | `false`| `true`   |
| Production  | `none`   | `true` | `true`   |

### Trusted Origins

Allowed origins are configured via `CORS_ORIGIN`:

```typescript
trustedOrigins: [process.env.CORS_ORIGIN || 'http://localhost:3001']
```

## Exports

```typescript
// Configured auth instance
export { auth } from '@calendraft/auth';
```

## Database schemas

The following tables are created by Better-Auth (see `packages/db/prisma/schema/auth.prisma`):

- `user` - Users
- `session` - Active sessions
- `account` - Linked accounts (OAuth)
- `verification` - Verification tokens

## Dependencies

- `better-auth` - Authentication framework
- `@calendraft/db` - Prisma client

## See also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Global project architecture
- [@calendraft/db](../db/README.md) - Prisma client and schemas
- [SECURITY.md](../../SECURITY.md) - Security policy

## License

MIT
