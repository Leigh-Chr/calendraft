# @calendraft/auth

Configuration Better-Auth pour l'authentification Calendraft avec support des paiements Polar.

## Installation

```bash
bun add @calendraft/auth
```

## Usage rapide

```typescript
import { auth } from '@calendraft/auth';

// Dans un handler Hono
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});
```

## Configuration

### Variables d'environnement

```env
# Obligatoire
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# CORS (pour les cookies cross-origin)
CORS_ORIGIN=http://localhost:3001

# Polar (optionnel - pour les paiements)
POLAR_ACCESS_TOKEN=your-polar-token
POLAR_SUCCESS_URL=https://your-domain.com/success
```

## Fonctionnalités

### Authentification Email/Password

```typescript
// Côté client avec Better-Auth client
import { createAuthClient } from 'better-auth/client';

const authClient = createAuthClient({
  baseURL: 'http://localhost:3000'
});

// Inscription
await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
});

// Connexion
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123'
});

// Déconnexion
await authClient.signOut();
```

### Sessions

```typescript
import { auth } from '@calendraft/auth';

// Obtenir la session depuis les headers
const session = await auth.api.getSession({
  headers: request.headers
});

if (session) {
  console.log(session.user.id);
  console.log(session.user.email);
}
```

### Paiements Polar

L'intégration Polar permet de gérer les abonnements :

```typescript
// Configuration des produits
polar({
  products: [{
    productId: 'your-product-id',
    slug: 'pro'
  }],
  successUrl: process.env.POLAR_SUCCESS_URL,
  authenticatedUsersOnly: true
});

// Checkout
await authClient.polar.checkout({ productSlug: 'pro' });

// Portal client
await authClient.polar.customerPortal();
```

## Architecture

### Adapter Prisma

Utilise l'adapter Prisma pour Better-Auth avec PostgreSQL :

```typescript
prismaAdapter(prisma, {
  provider: 'sqlite'
});
```

### Configuration des cookies

| Environnement | SameSite | Secure | HttpOnly |
|---------------|----------|--------|----------|
| Développement | `lax`    | `false`| `true`   |
| Production    | `none`   | `true` | `true`   |

### Trusted Origins

Les origines autorisées sont configurées via `CORS_ORIGIN` :

```typescript
trustedOrigins: [process.env.CORS_ORIGIN || 'http://localhost:3001']
```

## Exports

```typescript
// Instance auth configurée
export { auth } from '@calendraft/auth';

// Client Polar (pour les paiements)
export { polarClient } from '@calendraft/auth/lib/payments';
```

## Schémas de base de données

Les tables suivantes sont créées par Better-Auth (voir `packages/db/prisma/schema/auth.prisma`) :

- `user` - Utilisateurs
- `session` - Sessions actives
- `account` - Comptes liés (OAuth)
- `verification` - Tokens de vérification

## Dépendances

- `better-auth` - Framework d'authentification
- `@polar-sh/better-auth` - Plugin Polar pour Better-Auth
- `@calendraft/db` - Client Prisma

## Voir aussi

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture globale du projet
- [@calendraft/db](../db/README.md) - Client Prisma et schémas
- [SECURITY.md](../../SECURITY.md) - Politique de sécurité

## License

MIT

