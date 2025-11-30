# Guide Docker - Calendraft

Guide complet pour lancer Calendraft avec Docker.

## 🚀 Démarrage rapide

### Option 1 : Développement (PostgreSQL Docker + Apps locales)

```bash
# 1. Démarrer PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# 2. Configurer l'environnement
echo 'DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"
PORT=3000
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=dev-secret-key-min-32-characters-long
BETTER_AUTH_URL=http://localhost:3000' > apps/server/.env

# 3. Initialiser la base de données
bun run db:push

# 4. Lancer les apps en local (hot reload)
bun run dev
```

**Accès :**
- Frontend : http://localhost:3001
- Backend : http://localhost:3000
- PostgreSQL : localhost:5432

### Option 2 : Production complète (tout en Docker)

```bash
# 1. Configurer les variables d'environnement
cp docker.env.example .env
# Éditer .env avec vos valeurs

# 2. Construire et démarrer tous les services
docker-compose up -d --build

# 3. Vérifier que tout fonctionne
docker-compose ps
docker-compose logs -f
```

**Accès :**
- Frontend : http://localhost:3001
- Backend : http://localhost:3000
- PostgreSQL : localhost:5432

## 📋 Commandes utiles

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f server
docker-compose logs -f web
docker-compose logs -f db
```

### Arrêter les services

```bash
# Arrêter (garder les données)
docker-compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données)
docker-compose down -v
```

### Redémarrer un service

```bash
docker-compose restart server
docker-compose restart web
```

### Reconstruire un service

```bash
docker-compose up -d --build server
docker-compose up -d --build web
```

### Accéder à PostgreSQL

```bash
# Via Docker
docker-compose exec db psql -U calendraft -d calendraft

# Depuis l'extérieur (si port exposé)
psql -h localhost -p 5432 -U calendraft -d calendraft
```

### Backup de la base de données

```bash
# Créer un backup
docker-compose exec db pg_dump -U calendraft calendraft > backup.sql

# Restaurer un backup
docker-compose exec -T db psql -U calendraft calendraft < backup.sql
```

## 🔧 Configuration

### Variables d'environnement

Copiez `docker.env.example` vers `.env` et configurez :

```env
# Base de données
POSTGRES_USER=calendraft
POSTGRES_PASSWORD=votre_mot_de_passe_securise
POSTGRES_DB=calendraft

# Backend
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000

# Frontend
VITE_SERVER_URL=http://localhost:3000
```

### Ports

Par défaut :
- **3000** : Backend API
- **3001** : Frontend Web
- **5432** : PostgreSQL

Modifiez dans `.env` si nécessaire :
```env
SERVER_PORT=3000
WEB_PORT=3001
POSTGRES_PORT=5432
```

## 🐛 Dépannage

### Le build Docker échoue

```bash
# Reconstruire sans cache
docker-compose build --no-cache

# Vérifier les logs
docker-compose logs
```

### La base de données ne démarre pas

```bash
# Vérifier les logs
docker-compose logs db

# Vérifier que le port n'est pas déjà utilisé
lsof -i :5432
```

### Le serveur ne peut pas se connecter à la base

```bash
# Vérifier que la base est healthy
docker-compose ps

# Tester la connexion
docker-compose exec server wget -O- http://localhost:3000/health
```

### Les données ne persistent pas

Vérifiez que le volume est bien créé :
```bash
docker volume ls | grep postgres
```

## 📦 Structure des services

```
┌─────────────────────────────────────────┐
│         docker-compose.yml              │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │    db    │  │  server  │  │ web  │ │
│  │PostgreSQL│◄─│ Bun+Hono │◄─│Nginx │ │
│  │  :5432   │  │  :3000   │  │ :80  │ │
│  └──────────┘  └──────────┘  └──────┘ │
│       │                                │
│  postgres_data (volume)                │
└─────────────────────────────────────────┘
```

## 🔐 Sécurité en production

1. **Changez tous les mots de passe** dans `.env`
2. **Générez un BETTER_AUTH_SECRET** sécurisé : `openssl rand -base64 32`
3. **Configurez CORS_ORIGIN** avec votre domaine réel
4. **Utilisez HTTPS** avec un reverse proxy (Nginx, Traefik, Caddy)
5. **Ne commitez jamais** le fichier `.env`

## 📚 Voir aussi

- [README.md](README.md) - Vue d'ensemble du projet
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de déploiement détaillé

