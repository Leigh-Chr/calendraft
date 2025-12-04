# Guide de contribution

Merci de votre intérêt pour contribuer à Calendraft ! Ce guide vous aidera à démarrer.

## Table des matières

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Configuration de l'environnement](#configuration-de-lenvironnement)
- [Standards de développement](#standards-de-développement)
- [Processus de Pull Request](#processus-de-pull-request)
- [Signaler des bugs](#signaler-des-bugs)
- [Proposer des fonctionnalités](#proposer-des-fonctionnalités)

## Code de conduite

En participant à ce projet, vous acceptez de maintenir un environnement respectueux et inclusif. Soyez bienveillant envers les autres contributeurs.

## Comment contribuer

### Types de contributions

- 🐛 **Corrections de bugs** - Corrigez un problème existant
- ✨ **Nouvelles fonctionnalités** - Ajoutez une nouvelle feature
- 📚 **Documentation** - Améliorez ou ajoutez de la documentation
- 🧪 **Tests** - Ajoutez ou améliorez les tests
- 🔧 **Maintenance** - Mises à jour de dépendances, refactoring

### Avant de commencer

1. Vérifiez qu'il n'existe pas déjà une issue ou PR pour votre contribution
2. Pour les changements majeurs, ouvrez d'abord une issue pour en discuter
3. Consultez le [README](README.md) et [ARCHITECTURE.md](ARCHITECTURE.md) pour comprendre le projet

## Configuration de l'environnement

### Prérequis

- [Bun](https://bun.sh) version 1.3.1 ou supérieure
- Git

### Installation

```bash
# Cloner le repository
git clone <url-du-repository>
cd calendraft

# Installer les dépendances
bun install

# Configurer la base de données
bun run db:push

# Lancer en mode développement
bun run dev
```

### Structure du projet

```
calendraft/
├── apps/
│   ├── web/              # Application frontend React
│   └── server/           # Serveur API Hono
├── packages/
│   ├── api/              # Routers tRPC
│   ├── auth/             # Configuration Better-Auth
│   ├── core/             # Logique métier et types
│   ├── db/               # Schémas Prisma
│   ├── ics-utils/        # Parsing/génération ICS
│   ├── react-utils/      # Hooks et utilitaires React
│   └── schemas/          # Schémas de validation Zod
```

## Standards de développement

### Style de code

Ce projet utilise [Biome](https://biomejs.dev/) pour le linting et le formatage. Le code est automatiquement formaté à chaque commit via Husky.

```bash
# Vérifier et corriger le style
bun run check
```

### Conventions de nommage

- **Fichiers** : `kebab-case.ts` pour les fichiers, `PascalCase.tsx` pour les composants React
- **Variables/Fonctions** : `camelCase`
- **Types/Interfaces** : `PascalCase`
- **Constantes** : `SCREAMING_SNAKE_CASE`

### Commits

Utilisez des messages de commit descriptifs :

```
type(scope): description courte

Corps optionnel avec plus de détails

Fixes #123
```

Types courants :
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage (pas de changement de code)
- `refactor` : Refactoring
- `test` : Ajout/modification de tests
- `chore` : Maintenance

### TypeScript

- Utilisez les types explicites, évitez `any`
- Préférez les `interface` aux `type` pour les objets
- Utilisez les schémas Zod du package `@calendraft/schemas` pour la validation

### React - Prévention des erreurs de hooks

**IMPORTANT** : Ce projet utilise plusieurs mesures pour prévenir les erreurs "Invalid hook call" et "dispatcher is null" :

1. **Configuration Vite** (`apps/web/vite.config.ts`) :
   - `resolve.dedupe: ["react", "react-dom"]` - Force une seule instance de React
   - `optimizeDeps.include: ["react", "react-dom"]` - Pré-bundle React
   - `manualChunks` - Garantit que React et ReactDOM sont dans le même chunk

2. **Package.json root** :
   - `overrides` pour forcer React 19.2.0 dans tout le workspace

3. **Peer Dependencies** :
   - Tous les packages avec React doivent déclarer `react` et `react-dom` en peerDependencies

4. **Règles Biome** :
   - `useHookAtTopLevel: "error"` - Empêche l'utilisation de hooks en dehors des composants

**Si vous rencontrez des erreurs de hooks** :
- Vérifiez que vous n'avez pas plusieurs versions de React installées
- Vérifiez que tous les imports React utilisent la même instance
- Redémarrez le serveur de développement après avoir modifié les dépendances

### Tests

```bash
# Lancer les tests
cd apps/web && bun run test
```

## Processus de Pull Request

### 1. Créer une branche

```bash
git checkout -b feat/ma-nouvelle-feature
# ou
git checkout -b fix/correction-bug
```

### 2. Développer

- Faites des commits atomiques et bien décrits
- Assurez-vous que le code compile : `bun run check-types`
- Vérifiez le style : `bun run check`

### 3. Créer la PR

1. Poussez votre branche sur GitHub
2. Créez une Pull Request vers `master`
3. Remplissez le template de PR
4. Attendez la review

### 4. Review

- Répondez aux commentaires de review
- Faites les modifications demandées
- Une fois approuvée, la PR sera mergée

### Checklist avant PR

- [ ] Le code compile sans erreurs (`bun run check-types`)
- [ ] Le linting passe (`bun run check`)
- [ ] Les tests passent (si applicable)
- [ ] La documentation est à jour (si changement d'API)
- [ ] Le message de commit est descriptif

## Signaler des bugs

Utilisez le [template de bug report](.github/ISSUE_TEMPLATE/bug_report.md) pour signaler un bug.

Incluez :
- Une description claire du problème
- Les étapes pour reproduire
- Le comportement attendu vs actuel
- Votre environnement (OS, navigateur, version de Bun)
- Des captures d'écran si pertinent

## Proposer des fonctionnalités

Utilisez le [template de feature request](.github/ISSUE_TEMPLATE/feature_request.md) pour proposer une fonctionnalité.

Incluez :
- Une description claire de la feature
- Le problème que ça résout
- Des exemples d'utilisation
- Des alternatives considérées

## Questions ?

Si vous avez des questions, ouvrez une issue avec le label `question`.

---

Merci de contribuer à Calendraft ! 🎉

