# Calendraft

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-black?logo=bun&logoColor=white)](https://bun.sh/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Calendraft** est une plateforme web conçue pour simplifier la gestion, la modification et la création de calendriers au format **.ics**.

L'objectif est d'offrir une expérience moderne et intuitive permettant aux utilisateurs de travailler facilement avec des fichiers calendrier — sans outils complexes, sans configuration, et sans compétences techniques particulières.

## Fonctionnalités

### Gestion de calendriers
- **Import de fichiers .ics** - Importez vos calendriers depuis n'importe quelle source
- **Import dans un calendrier existant** - Ajoutez des événements d'un fichier .ics à un calendrier existant
- **Création de calendriers vides** - Créez de nouveaux calendriers pour organiser vos événements
- **Fusion de calendriers** - Combinez plusieurs calendriers en un seul avec détection automatique des doublons
- **Export .ics** - Exportez vos calendriers modifiés au format .ics compatible (Google Calendar, Apple Calendar, Outlook, etc.)
- **Nettoyage de doublons** - Supprimez automatiquement les événements en double dans un calendrier

### Visualisation et navigation
- **Vue liste** - Affichez tous vos événements dans une liste avec tri et filtres
- **Vue calendrier** - Visualisez vos événements dans une vue mensuelle interactive (react-big-calendar)
- **Filtres par date** - Filtrez rapidement par : Aujourd'hui, Cette semaine, Ce mois, ou Tout
- **Recherche** - Recherchez des événements par mot-clé dans le titre
- **Tri** - Triez par date, nom ou durée

### Gestion d'événements
- **Création d'événements** - Ajoutez de nouveaux événements avec titre, dates, description et localisation
- **Modification d'événements** - Éditez tous les détails d'un événement existant
- **Suppression d'événements** - Supprimez des événements individuellement
- **Création depuis la vue calendrier** - Cliquez sur un créneau pour créer un événement avec les dates pré-remplies

### Authentification et stockage
- **Mode anonyme** - Utilisez l'application sans créer de compte (données stockées localement dans le navigateur)
- **Authentification** - Option de compte pour sauvegarder dans le cloud (Better-Auth)
- **Synchronisation** - Les utilisateurs authentifiés peuvent accéder à leurs calendriers depuis n'importe quel appareil

## Stack technique

- **TypeScript** - Type safety end-to-end
- **TanStack Router** - Routing avec type safety
- **TailwindCSS** - UI moderne et responsive
- **shadcn/ui** - Composants UI réutilisables
- **Hono** - Framework serveur léger et performant
- **tRPC** - APIs type-safe end-to-end
- **Bun** - Runtime et gestionnaire de paquets
- **Prisma** - ORM TypeScript-first
- **PostgreSQL** - Base de données
- **Better-Auth** - Authentification
- **Biome** - Linting et formatting
- **PWA** - Support Progressive Web App
- **Turborepo** - Monorepo optimisé
- **Sentry** - Monitoring des erreurs et performances

## Getting Started

### Prérequis

- [Bun](https://bun.sh) (version 1.3.1 ou supérieure)
- [Docker](https://www.docker.com/) (optionnel, pour PostgreSQL en local)

### Installation

1. Clonez le repository et installez les dépendances :

```bash
bun install
```

### Configuration de la base de données

Ce projet utilise PostgreSQL avec Prisma.

#### Option 1 : PostgreSQL avec Docker (recommandé)

```bash
# Démarrer PostgreSQL en local
docker compose -f docker-compose.dev.yml up -d

# Configurer la variable d'environnement dans apps/server/.env
DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"
```

#### Option 2 : PostgreSQL existant

```env
# Dans apps/server/.env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

#### Initialiser la base de données

```bash
# Générer le client Prisma et pousser le schéma
bun run db:push

# (Optionnel) Ouvrir Prisma Studio
bun run db:studio
```

### Configuration de l'environnement

Créez un fichier `.env` dans `apps/server` :

```env
# Base de données PostgreSQL (obligatoire)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Port du serveur backend (défaut: 3000)
PORT=3000

# URL du frontend pour CORS (défaut: http://localhost:3001)
CORS_ORIGIN=http://localhost:3001

# Configuration Better-Auth (optionnel pour le mode anonyme)
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Configuration Polar (optionnel - pour les abonnements)
POLAR_ACCESS_TOKEN=your-polar-access-token
POLAR_WEBHOOK_SECRET=your-polar-webhook-secret
POLAR_SUCCESS_URL=http://localhost:3001/success
POLAR_PRODUCT_PERSONAL_ID=your-personal-product-id
POLAR_PRODUCT_PRO_ID=your-pro-product-id
```

Créez un fichier `.env` dans `apps/web` :

```env
# URL du serveur backend (défaut: http://localhost:3000)
VITE_SERVER_URL=http://localhost:3000
```

### Démarrage

Lancez l'application en mode développement :

```bash
bun run dev
```

Cela démarre :
- Le serveur backend sur [http://localhost:3000](http://localhost:3000)
- L'application web sur [http://localhost:3001](http://localhost:3001)

Ou lancez-les séparément :

```bash
# Backend uniquement
bun run dev:server

# Frontend uniquement
bun run dev:web
```

## Docker

Le projet est entièrement dockerisé pour faciliter le déploiement.

### 🚀 Démarrage rapide

#### Option 1 : Développement (PostgreSQL Docker + Apps locales)

```bash
# 1. Démarrer PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# 2. Initialiser la base de données
bun run db:push

# 3. Lancer les apps en local (hot reload)
bun run dev
```

#### Option 2 : Production complète (tout en Docker)

```bash
# 1. Configurer l'environnement
cp docker.env.example .env
# Éditer .env avec vos valeurs

# 2. Construire et démarrer
docker-compose up -d --build

# 3. Voir les logs
docker-compose logs -f
```

### Services Docker

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 | PostgreSQL 16 |
| `server` | 3000 | Backend API (Bun + Hono) |
| `web` | 3001 | Frontend (Nginx) |

📖 **Guide complet** : Voir [DOCKER.md](./DOCKER.md) pour toutes les commandes et le dépannage.

## Production

Pour déployer en production, consultez le guide complet : [DEPLOYMENT.md](./DEPLOYMENT.md)

### Checklist rapide production

- [ ] Variables d'environnement configurées (voir `apps/server/.env.example`)
- [ ] `CORS_ORIGIN` défini (obligatoire, ne pas utiliser `*`)
- [ ] `BETTER_AUTH_SECRET` généré (min 32 caractères)
- [ ] Base de données initialisée
- [ ] Build effectué (`bun run build`)
- [ ] Certificat SSL/TLS configuré
- [ ] Health check accessible (`/health`)

### Variables d'environnement critiques

**Backend** (`apps/server/.env`) :
- `CORS_ORIGIN` : URL du frontend (obligatoire en production)
- `BETTER_AUTH_SECRET` : Clé secrète pour l'authentification (obligatoire)
- `NODE_ENV=production` : Mode production

**Frontend** (`apps/web/.env`) :
- `VITE_SERVER_URL` : URL de l'API backend

### Sécurité

- Rate limiting : 100 requêtes/minute par IP
- Headers de sécurité HTTP configurés automatiquement
- Validation des inputs (taille max fichiers : 5MB)
- Limitations utilisateurs anonymes : 5 calendriers, 100 événements/calendrier




## Structure du projet

```
calendraft/
├── apps/
│   ├── web/           # Application frontend (React + TanStack Router)
│   └── server/        # Serveur API (Hono)
├── packages/
│   ├── api/           # Routers tRPC
│   ├── auth/          # Configuration Better-Auth
│   ├── core/          # Logique métier et types partagés
│   ├── db/            # Client Prisma et schémas
│   ├── ics-utils/     # Parsing et génération ICS
│   ├── react-utils/   # Hooks et utilitaires React
│   └── schemas/       # Schémas de validation Zod
```

## Guide d'utilisation

### Mode anonyme (sans compte)

1. Ouvrez l'application dans votre navigateur
2. Un ID anonyme est automatiquement généré et stocké dans le localStorage
3. Vos calendriers sont sauvegardés sur le serveur mais liés à votre ID anonyme
4. Vous pouvez utiliser toutes les fonctionnalités sans créer de compte

**⚠️ Important - Limitations du mode anonyme :**
- Vos calendriers sont liés à votre navigateur via un ID anonyme stocké dans le localStorage
- Si vous effacez les données du navigateur ou utilisez la navigation privée, vous perdrez l'accès à vos calendriers
- Les calendriers anonymes non consultés depuis 60 jours sont automatiquement supprimés
- Pour une sauvegarde permanente et un accès multi-appareils, créez un compte

### Mode authentifié (avec compte)

1. Créez un compte via la page de connexion
2. Vos calendriers sont sauvegardés sur le serveur
3. Vous pouvez accéder à vos calendriers depuis n'importe quel appareil

### Workflow typique

1. **Importer un calendrier** : Cliquez sur "Importer un fichier .ics" depuis la page d'accueil
2. **Créer un calendrier vide** : Cliquez sur "Créer un calendrier" pour commencer de zéro
3. **Ajouter des événements** : Dans la vue calendrier, cliquez sur "Ajouter un événement" ou cliquez directement sur un créneau dans la vue mois
4. **Modifier/Supprimer** : Utilisez les boutons d'édition et de suppression dans la vue liste
5. **Fusionner** : Sélectionnez plusieurs calendriers et fusionnez-les en un seul
6. **Nettoyer** : Supprimez les doublons d'un calendrier avec le bouton "Nettoyer"
7. **Exporter** : Téléchargez votre calendrier modifié au format .ics

## Available Scripts

- `bun run dev` - Démarre toutes les applications en mode développement
- `bun run build` - Compile toutes les applications pour la production
- `bun run dev:web` - Démarre uniquement l'application web
- `bun run dev:server` - Démarre uniquement le serveur backend
- `bun run check-types` - Vérifie les types TypeScript dans toutes les applications
- `bun run db:push` - Pousse les changements de schéma vers la base de données
- `bun run db:studio` - Ouvre Prisma Studio pour visualiser la base de données
- `bun run db:generate` - Génère le client Prisma
- `bun run db:migrate` - Applique les migrations de base de données
- `bun run check` - Exécute le formatage et le linting avec Biome
- `cd apps/web && bun run generate-pwa-assets` - Génère les assets PWA

## Dépannage

### Le serveur backend ne démarre pas

- Vérifiez que le port 3000 n'est pas déjà utilisé
- Assurez-vous que la base de données est correctement configurée : `bun run db:push`
- Vérifiez les logs dans le terminal pour les erreurs

### Le frontend ne peut pas se connecter au backend

- Vérifiez que `VITE_SERVER_URL` dans `apps/web/.env` pointe vers `http://localhost:3000`
- Assurez-vous que le serveur backend est démarré (`bun run dev:server`)
- Vérifiez la console du navigateur pour les erreurs CORS

### Les données ne persistent pas (mode anonyme)

- Vérifiez que le localStorage est activé dans votre navigateur
- Les données sont stockées localement, elles ne seront pas disponibles sur un autre navigateur ou appareil
- Pour la persistance multi-appareils, créez un compte

### Erreurs de parsing ICS

- Vérifiez que le fichier .ics est valide et conforme au format RFC 5545
- Certains champs optionnels peuvent être ignorés, mais les dates de début et de fin sont requises

## Sentry MCP (Model Context Protocol)

Pour une intégration avancée avec des assistants IA (comme Cursor, Claude, etc.), vous pouvez ajouter le serveur MCP officiel de Sentry. Cela permet à l'IA d'accéder directement aux erreurs Sentry pour vous aider à les débugger.

### Configuration du MCP Sentry

Ajoutez cette configuration dans votre fichier de configuration MCP (par exemple `.cursor/mcp.json` ou équivalent) :

```json
{
  "mcpServers": {
    "sentry": {
      "url": "https://mcp.sentry.dev/sse"
    }
  }
}
```

Ou pour une configuration avec authentification :

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server-stdio"]
    }
  }
}
```

### Fonctionnalités du MCP Sentry

Une fois configuré, l'assistant IA pourra :
- Lister les issues Sentry de votre projet
- Analyser les stack traces et erreurs
- Proposer des corrections basées sur les erreurs réelles
- Corréler les erreurs avec le code source

Pour plus d'informations : [github.com/getsentry/sentry-mcp](https://github.com/getsentry/sentry-mcp)

## Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Ce fichier - Vue d'ensemble et démarrage rapide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture des packages et diagramme de dépendances |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Guide complet de déploiement en production |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guide de contribution au projet |
| [SECURITY.md](SECURITY.md) | Politique de sécurité et signalement de vulnérabilités |

### Documentation des packages

| Package | Description |
|---------|-------------|
| [@calendraft/core](packages/core/README.md) | Logique métier et types partagés |
| [@calendraft/ics-utils](packages/ics-utils/README.md) | Parsing et génération de fichiers ICS |
| [@calendraft/react-utils](packages/react-utils/README.md) | Hooks et utilitaires React |
| [@calendraft/api](packages/api/README.md) | API tRPC et routers |
| [@calendraft/auth](packages/auth/README.md) | Configuration Better-Auth |
| [@calendraft/db](packages/db/README.md) | Client Prisma et schémas DB |
| [@calendraft/schemas](packages/schemas/README.md) | Schémas de validation Zod |

## Contribuer

Les contributions sont les bienvenues ! Consultez le [guide de contribution](CONTRIBUTING.md) pour commencer.

## Licence

Ce projet est sous licence AGPL v3 - voir le fichier [LICENSE](LICENSE) pour plus de détails.
