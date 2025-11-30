# Guide de déploiement - Calendraft

Ce guide décrit les étapes pour déployer Calendraft en production.

## Prérequis

- Node.js 18+ ou Bun 1.3.1+
- Base de données PostgreSQL
- Serveur web (Nginx, Caddy, etc.) pour reverse proxy (recommandé)
- Certificat SSL/TLS (Let's Encrypt recommandé)

## Variables d'environnement

### Backend (`apps/server/.env`)

Créez un fichier `.env` dans `apps/server/` avec les variables suivantes :

```env
NODE_ENV=production
PORT=3000

# Base de données PostgreSQL (obligatoire)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

CORS_ORIGIN=https://votre-domaine.com
BETTER_AUTH_SECRET=votre-secret-key-min-32-caracteres
BETTER_AUTH_URL=https://api.votre-domaine.com

# Sentry (optionnel - monitoring des erreurs)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

**Important** :
- `CORS_ORIGIN` : DOIT être défini en production, ne pas utiliser `*`
- `BETTER_AUTH_SECRET` : Générer une clé sécurisée (ex: `openssl rand -base64 32`)
- `SENTRY_DSN` : Optionnel, récupérez-le depuis votre projet Sentry
- Ne jamais commiter le fichier `.env` dans le repository

### Frontend (`apps/web/.env`)

Créez un fichier `.env` dans `apps/web/` :

```env
VITE_SERVER_URL=https://api.votre-domaine.com

# Sentry (optionnel - monitoring des erreurs)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Variables de build (CI/CD)

Pour l'upload des source maps Sentry lors du build :

```env
SENTRY_ORG=votre-organisation-sentry
SENTRY_PROJECT=calendraft-web
SENTRY_AUTH_TOKEN=sntrys_xxx
```

## Déploiement avec Docker (recommandé)

Le moyen le plus simple de déployer Calendraft est d'utiliser Docker.

### 1. Configurer les variables d'environnement

```bash
cp docker.env.example .env
```

Éditez `.env` avec vos valeurs de production :

```env
# Base de données
POSTGRES_USER=calendraft
POSTGRES_PASSWORD=votre_mot_de_passe_securise
POSTGRES_DB=calendraft

# Backend
CORS_ORIGIN=https://votre-domaine.com
BETTER_AUTH_SECRET=votre-secret-min-32-caracteres
BETTER_AUTH_URL=https://api.votre-domaine.com

# Frontend
VITE_SERVER_URL=https://api.votre-domaine.com
```

### 2. Construire et démarrer

```bash
docker compose up -d --build
```

### 3. Vérifier le déploiement

```bash
# Voir l'état des services
docker compose ps

# Voir les logs
docker compose logs -f

# Tester le health check
curl http://localhost:3000/health
```

### Mise à jour

```bash
git pull
docker compose up -d --build
```

---

## Déploiement manuel (sans Docker)

### 1. Installer les dépendances

```bash
bun install
```

### 2. Générer le client Prisma

```bash
bun run db:generate
```

### 3. Pousser le schéma de base de données

```bash
bun run db:push
```

### 4. Build de l'application

```bash
bun run build
```

Cela va :
- Build le frontend dans `apps/web/dist/`
- Build le backend dans `apps/server/dist/`

## Démarrage (sans Docker)

### Backend

```bash
cd apps/server
bun run dist/index.js
```

Ou avec PM2 (recommandé pour production) :

```bash
pm2 start apps/server/dist/index.js --name calendraft-api
```

### Frontend

Le frontend peut être servi avec n'importe quel serveur web statique :

- **Nginx** : Configurer pour servir `apps/web/dist/`
- **Vercel/Netlify** : Déployer le dossier `apps/web/dist/`
- **Cloudflare Pages** : Déployer le dossier `apps/web/dist/`

## Configuration Nginx (exemple)

```nginx
# Frontend
server {
    listen 80;
    server_name votre-domaine.com;
    
    root /chemin/vers/apps/web/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.votre-domaine.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Checklist pré-déploiement

### Docker
- [ ] Fichier `.env` créé à partir de `docker.env.example`
- [ ] `POSTGRES_PASSWORD` modifié avec un mot de passe sécurisé
- [ ] `BETTER_AUTH_SECRET` généré (min 32 caractères) : `openssl rand -base64 32`
- [ ] `CORS_ORIGIN` défini avec l'URL du frontend
- [ ] Docker et Docker Compose installés
- [ ] Ports 3000 et 3001 disponibles (ou personnalisés dans `.env`)

### Général
- [ ] Variables d'environnement configurées
- [ ] `CORS_ORIGIN` défini et ne contient pas `*` ou `localhost`
- [ ] `BETTER_AUTH_SECRET` généré et sécurisé (min 32 caractères)
- [ ] Base de données initialisée
- [ ] Certificat SSL/TLS configuré (HTTPS)
- [ ] Health check accessible (`/health`)
- [ ] Rate limiting testé
- [ ] Headers de sécurité vérifiés
- [ ] Logs configurés et accessibles
- [ ] Backup de la base de données configuré
- [ ] Sentry configuré (optionnel mais recommandé)

## Commandes Docker utiles

```bash
# Voir les logs d'un service spécifique
docker compose logs -f server

# Accéder au conteneur PostgreSQL
docker compose exec db psql -U calendraft -d calendraft

# Backup de la base de données
docker compose exec db pg_dump -U calendraft calendraft > backup.sql

# Restaurer la base de données
docker compose exec -T db psql -U calendraft calendraft < backup.sql

# Redémarrer un service
docker compose restart server

# Reconstruire un service
docker compose up -d --build server

# Supprimer les volumes (ATTENTION: supprime les données)
docker compose down -v
```

## Monitoring

### Sentry (Error Tracking & Performance)

Sentry est intégré pour le monitoring des erreurs et des performances. Configuration :

1. **Créer un projet Sentry** : Allez sur [sentry.io](https://sentry.io) et créez deux projets :
   - Un projet "React" pour le frontend (`calendraft-web`)
   - Un projet "Node.js" pour le backend (`calendraft-api`)

2. **Récupérer les DSN** : Dans chaque projet, allez dans Settings > Client Keys (DSN)

3. **Configurer les variables d'environnement** (voir section ci-dessus)

4. **Upload des source maps** (CI/CD) :
   - Créez un auth token dans Sentry (Settings > Auth Tokens)
   - Configurez `SENTRY_ORG`, `SENTRY_PROJECT`, et `SENTRY_AUTH_TOKEN` dans votre CI

Fonctionnalités activées :
- ✅ Capture automatique des erreurs (frontend & backend)
- ✅ Performance monitoring avec TanStack Router
- ✅ Session Replay (10% des sessions, 100% avec erreurs)
- ✅ Distributed tracing entre frontend et backend
- ✅ Source maps pour des stack traces lisibles

### Health Check

L'endpoint `/health` vérifie :
- Connexion à la base de données
- Retourne `200 OK` si tout est OK
- Retourne `503 Service Unavailable` si problème

Utilisez un service de monitoring (UptimeRobot, Pingdom, etc.) pour surveiller cet endpoint.

### Nettoyage automatique

Le serveur exécute automatiquement un job de nettoyage en production qui :
- Supprime les calendriers anonymes non consultés depuis 60 jours
- S'exécute toutes les 24 heures
- Nettoie les données orphelines pour éviter l'accumulation en base de données
- Note : `updatedAt` est mis à jour lors des consultations (getById/list), donc un calendrier consulté régulièrement ne sera pas supprimé

**Note** : Pour un environnement de production critique, considérez utiliser un scheduler externe (cron, Cloud Scheduler, etc.) au lieu de `setInterval`.

### Logs

Les logs sont affichés dans la console. En production, redirigez vers un fichier :

```bash
bun run dist/src/index.js > logs/app.log 2>&1
```

Ou avec PM2 :

```bash
pm2 logs calendraft-api
```

## Sécurité

- ✅ Rate limiting activé (100 req/min par IP)
- ✅ Headers de sécurité HTTP configurés
- ✅ Validation des inputs (taille max fichiers, longueurs)
- ✅ CORS configuré correctement
- ✅ Variables d'environnement sécurisées

## Troubleshooting

### Erreur "CORS_ORIGIN is required"
→ Vérifiez que `CORS_ORIGIN` est défini dans `apps/server/.env`

### Health check retourne 503
→ Vérifiez la connexion à la base de données
→ Vérifiez que Prisma est correctement configuré

### Rate limiting trop strict
→ Ajustez les limites dans `apps/server/src/middleware/rate-limit.ts`

### Erreurs 429 Too Many Requests
→ Normal si vous dépassez 100 requêtes/minute
→ Attendez la fin de la fenêtre de temps

## Support

Pour toute question ou problème, consultez le README.md principal ou ouvrez une issue.

## Voir aussi

- [README.md](README.md) - Vue d'ensemble et démarrage rapide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture des packages
- [SECURITY.md](SECURITY.md) - Politique de sécurité
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guide de contribution

