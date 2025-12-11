# Résumé des changements - Refactoring majeur

## Statistiques
- **78 fichiers modifiés**
- **3 fichiers supprimés** (security-headers.ts, scroll-area.tsx, slider.tsx)
- **~30 nouveaux fichiers** (composants, hooks, utilitaires, tests, configurations)
- **3151 insertions, 3381 suppressions** (net: -230 lignes)

## Breaking Changes

### API Changes
1. **`calendar.core.list`** - Retourne maintenant `{ calendars, nextCursor }` au lieu d'un array direct
   - Ajout de la pagination avec cursor
   - Support des paramètres `limit` et `cursor`

2. **`calendar.group.getById`** - Retourne maintenant des calendriers avec détails complets
   - Inclut `eventCount`, `sourceUrl`, `lastSyncedAt`, etc.
   - Structure de retour enrichie

3. **Middleware exports supprimés** - Les fonctions suivantes ont été supprimées:
   - `checkAnonymousCalendarLimit` → remplacé par `checkCalendarLimit`
   - `checkAnonymousEventLimit` → remplacé par `checkEventLimit`
   - `getAnonymousUsage` → remplacé par `getUserUsage`

## Refactoring des composants React (apps/web)

### Extraction de composants depuis `calendars.tsx` (1259 lignes → refactorisé)
- **Nouveaux composants:**
  - `calendar-list/calendars-section.tsx` - Section des calendriers
  - `calendar-list/groups-section.tsx` - Section des groupes
  - `calendar-list/header.tsx` - En-tête de la liste
  - `calendar-list/loading-state.tsx` - État de chargement
  - `calendar-list/calendar-card.tsx` - Carte de calendrier
  - `tour.tsx` - Composant de tour guidé

- **Nouveaux hooks:**
  - `use-calendar-dialogs.ts` - Gestion des dialogs (delete, edit)
  - `use-calendar-groups.ts` - Gestion des groupes
  - `use-calendar-search-sort.ts` - Recherche et tri
  - `use-calendar-selection.ts` - Sélection multiple
  - `use-calendraft-tour.ts` - Tour guidé

- **Nouvelles utilitaires:**
  - `lib/calendar-sort.ts` - Tri et filtrage des calendriers
  - `lib/calendar-export.ts` - Export de calendriers
  - `lib/tour-constants.ts` - Constantes pour le tour

### Refactoring de `share/$token.tsx` (878 lignes → refactorisé)
- Extraction de fonctions utilitaires:
  - `getErrorMessageForReason()` - Messages d'erreur
  - `downloadShareAsICS()` - Téléchargement ICS
  - `computeShareError()` - Calcul des erreurs
- Extraction de composants:
  - `ShareErrorView` - Vue d'erreur
  - `ShareLoadingView` - Vue de chargement
- Nouveau hook: `useShareData()` - Gestion des données de partage

### Refactoring de `groups/$groupId.tsx` (320 lignes modifiées)
- Extraction de fonctions utilitaires:
  - `filterGroupCalendarsByKeyword()` - Filtrage par mot-clé
  - `sortGroupCalendars()` - Tri des calendriers
  - `exportGroupAsICS()` - Export du groupe
- Extraction de composant: `renderCalendarsGrid()` - Rendu de la grille

### Autres refactorings React
- Suppression de `React.memo` inutiles (React Compiler gère la mémorisation)
- Suppression de `useCallback`/`useMemo` inutiles (React Compiler)
- Amélioration des types TypeScript avec annotations explicites
- Nettoyage de `date-utils.ts` (suppression de fonctions non utilisées)

## Modularisation du backend (packages/api)

### Extraction de modules depuis `event.ts` (555 lignes modifiées)
- **`event/access.ts`** - Vérification d'accès aux événements
  - `verifyEventAccess()` - Vérification d'accès à un événement
  - `verifyCalendarAccess()` - Vérification d'accès à un calendrier
  - `verifyCalendarAccessForList()` - Vérification pour une liste

- **`event/queries.ts`** - Requêtes optimisées
  - `buildEventWhereClause()` - Construction de clauses WHERE
  - `buildEventOrderBy()` - Construction de ORDER BY
  - `getEventsSortedByDuration()` - Tri par durée avec SQL brut

- **`event/updates.ts`** - Mises à jour
  - `updateEventAlarms()` - Mise à jour des alarmes
  - `updateEventAttendees()` - Mise à jour des participants
  - `updateEventCategories()` - Mise à jour des catégories
  - `updateEventResources()` - Mise à jour des ressources
  - `updateEventRecurrenceDates()` - Mise à jour des dates de récurrence

- **`event/validation.ts`** - Validation
  - `validateUidChange()` - Validation du changement d'UID
  - `validateRelatedToChange()` - Validation de RELATED-TO

### Refactoring de `calendar/core.ts` (169 lignes modifiées)
- Ajout de pagination avec cursor
- Optimisation des requêtes (single query au lieu de multiples)
- Amélioration de la vérification d'accès

### Refactoring de `share.ts` (193 lignes modifiées)
- Extraction de fonctions utilitaires:
  - `getCalendarIdsForBundle()` - Récupération des IDs de calendriers
  - `checkBundleLimit()` - Vérification de la limite de bundles
- Amélioration de la gestion d'erreurs avec logger

### Refactoring de `calendar/import-export.ts` (129 lignes modifiées)
- Utilisation de `verifyCalendarAccess()` au lieu de vérifications multiples
- Optimisation des requêtes (single query)
- Amélioration des types TypeScript

### Refactoring de `calendar/import-url.ts` (80 lignes modifiées)
- Utilisation de `verifyCalendarAccess()` et `checkCalendarLimit()`
- Optimisation des requêtes
- Amélioration de la gestion des valeurs nulles

### Refactoring de `calendar/merge-duplicates.ts` (25 lignes modifiées)
- Utilisation de `verifyCalendarAccess()`

### Refactoring de `calendar/group/crud.ts` (41 lignes modifiées)
- Enrichissement de la réponse `getById` avec détails complets des calendriers

## Amélioration de l'infrastructure

### Logging structuré avec correlation IDs
- **Nouveaux fichiers `logger.ts` dans:**
  - `apps/server/src/lib/logger.ts` (126 lignes modifiées)
  - `packages/api/src/lib/logger.ts` (nouveau)
  - `packages/auth/src/lib/logger.ts` (nouveau)
  - `packages/react-utils/src/logger.ts` (nouveau)
  - `apps/web/src/lib/logger.ts` (nouveau)

- **Fonctionnalités:**
  - Génération de correlation IDs pour le suivi des requêtes
  - Logging structuré (JSON en production, format lisible en dev)
  - Support du contexte (userId, ip, path, method)
  - Logging de sécurité dédié

### Rate limiting avec Redis et fallback
- **`apps/server/src/middleware/rate-limit.ts`** (271 lignes modifiées)
  - Support Redis pour le rate limiting distribué
  - Fallback en mémoire si Redis n'est pas disponible
  - Gestion d'erreurs améliorée
  - Configuration via variables d'environnement

- **Docker:**
  - Ajout de Redis dans `docker-compose.yml` et `docker-compose.dev.yml`
  - Configuration de santé et volumes persistants

### Gestion centralisée des variables d'environnement
- **Nouveaux fichiers `env.ts` dans:**
  - `apps/server/src/middleware/env.ts` (nouveau)
  - `packages/auth/src/lib/env.ts` (nouveau)
  - `packages/db/src/env.ts` (nouveau)

- **Avantages:**
  - Validation centralisée des variables d'environnement
  - Meilleure gestion des erreurs
  - Type safety amélioré

### Configuration Vite améliorée (427 lignes modifiées)
- Utilisation de `loadEnv()` pour charger les variables d'environnement
- Support du mode (dev/prod)
- Configuration améliorée du proxy

## Optimisations de performance

### Base de données
- **Ajout d'index composites dans Prisma:**
  - `Calendar`: `@@index([userId, updatedAt])` - Pour les listes avec tri
  - `Event`: `@@index([calendarId, startDate])` - Pour les filtres de date
  - `Event`: `@@index([calendarId, endDate, startDate])` - Pour le tri par durée
  - `CalendarGroupMember`: `@@index([groupId, calendarId])` - Pour les filtres multiples

### Requêtes optimisées
- Remplacement de multiples requêtes par une seule requête optimisée
- Utilisation de `verifyCalendarAccess()` pour éviter les requêtes redondantes
- Pagination avec cursor pour les grandes listes

### React Compiler
- Suppression de `useCallback`/`useMemo` inutiles
- Suppression de `React.memo` inutiles
- Le React Compiler gère automatiquement la mémorisation

## Nettoyage et suppression

### Composants UI supprimés
- `apps/web/src/components/ui/scroll-area.tsx` (56 lignes) - Non utilisé
- `apps/web/src/components/ui/slider.tsx` (61 lignes) - Non utilisé

### Middleware supprimé
- `apps/server/src/middleware/security-headers.ts` (40 lignes) - Non utilisé

### Code mort supprimé
- Fonctions non utilisées dans `date-utils.ts`:
  - `formatDateTime()`
  - `formatDate()`
  - `formatDateTimeLocal()`
  - `formatIcsDate()`
  - `parseIcsDate()`
  - `formatDateTimeShort()`

### Dépendances supprimées
- `@fontsource-variable/jetbrains-mono` - Non utilisé
- `@fontsource-variable/sora` - Non utilisé
- `@radix-ui/react-scroll-area` - Non utilisé
- `@radix-ui/react-slider` - Non utilisé
- `babel-plugin-react-compiler` - Remplacé par React Compiler intégré

## Tests et qualité

### Infrastructure de tests
- **Nouveaux fichiers de test:**
  - `apps/server/src/middleware/__tests__/rate-limit.test.ts`
  - `apps/web/src/components/__tests__/event-card.test.tsx`
  - `packages/api/src/middleware/__tests__/verify-calendar-access.test.ts`
  - `packages/api/src/routers/__tests__/calendar-core.test.ts`

- **Configurations Vitest:**
  - `apps/server/vitest.config.ts` (nouveau)
  - `packages/api/vitest.config.ts` (nouveau)

- **Scripts de test ajoutés:**
  - `apps/server/package.json`: `test`, `test:watch`
  - `packages/api/package.json`: `test`, `test:watch`

### Amélioration des configurations
- **Biome:**
  - Ajout de la règle `useLiteralKeys` avec niveau `warn`
  - Amélioration de la configuration des règles

- **Knip:**
  - Ajout de `packages/config` dans la configuration
  - Ajout de `@noble/hashes` dans les dépendances ignorées (utilisé dans seed)

- **Turbo:**
  - Amélioration des dépendances pour `check-types` et `typecheck`
  - Ajout de `^build` dans les dépendances

## Améliorations de code quality

### TypeScript
- Amélioration des types avec annotations explicites
- Meilleure gestion des valeurs nulles
- Utilisation de `Prisma` namespace pour les requêtes SQL

### Gestion d'erreurs
- Utilisation de logger au lieu de `console.error`
- Amélioration des messages d'erreur
- Meilleure gestion des erreurs dans `react-utils/src/error/helpers.ts`

### Code style
- Ajout de commentaires `biome-ignore` pour les accès dynamiques nécessaires
- Amélioration de la documentation des fonctions
- Commentaires explicatifs pour React Compiler

## Dépendances ajoutées

- `ioredis` (^5.4.1) - Pour le rate limiting Redis
- `@types/ioredis` (^5.0.0) - Types pour ioredis
- `@testing-library/react` (^16.1.0) - Pour les tests React
- `vitest` (^4.0.15) - Framework de test
- `@vitest/coverage-v8` (^4.0.15) - Couverture de code

## Dépendances supprimées

- `@hono/trpc-server` - Déplacé ailleurs ou non utilisé
- `hono` (root) - Déplacé dans les packages appropriés
- `tsdown` (root) - Déplacé dans les packages appropriés

