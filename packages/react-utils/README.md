# @calendraft/react-utils

Utilitaires React : hooks, query keys, gestion d'erreurs.

## Installation

```bash
bun add @calendraft/react-utils
```

**Peer deps:** `react` >= 18, `@tanstack/react-query` >= 5

## Usage rapide

```typescript
import { 
  useDebounce, 
  useLocalStorage,
  useIsMobile,
  createQueryKeys,
  cn,
  getErrorMessage,
} from '@calendraft/react-utils';
```

## Hooks

```typescript
// Debounce
const debouncedValue = useDebounce(value, 300);

// localStorage avec sync
const [theme, setTheme] = useLocalStorage('theme', 'light');

// Responsive
const isMobile = useIsMobile();
const isDesktop = useIsDesktop();

// Valeur précédente
const prevCount = usePrevious(count);

// Check si monté (évite setState sur unmount)
const isMounted = useMounted();
```

## Query Keys

```typescript
import { createQueryKeys } from '@calendraft/react-utils';

// Factory pour créer des query keys par domaine
const userKeys = createQueryKeys('user');
// userKeys.all        => ['user']
// userKeys.list()     => ['user', 'list']
// userKeys.detail(id) => ['user', 'detail', id]

// Usage avec React Query
useQuery({ queryKey: userKeys.list() });
useQuery({ queryKey: userKeys.detail(id) });
```

## Gestion d'erreurs

```typescript
import { getErrorMessage, isNetworkError, logErrorInDev } from '@calendraft/react-utils';

try {
  await api();
} catch (error) {
  const message = getErrorMessage(error);
  if (isNetworkError(error)) { /* offline */ }
  logErrorInDev(error); // Log uniquement en dev
}
```

## Styling

```typescript
import { cn } from '@calendraft/react-utils';

// Merge Tailwind classes avec résolution de conflits
<div className={cn('px-4', isActive && 'bg-blue-500', className)} />
```

## Voir aussi

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture globale du projet
- [@calendraft/core](../core/README.md) - Logique métier et types

## License

MIT
