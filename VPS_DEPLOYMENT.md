# Guide de Déploiement VPS - Calendraft

> 📌 **Guide de première installation** : Ce document est destiné à la configuration initiale d'un nouveau serveur VPS.  
> Pour la gestion quotidienne en production, consultez [`PRODUCTION_COMMANDS.md`](./PRODUCTION_COMMANDS.md) et les scripts dans [`scripts/production/`](./scripts/production/).

Guide complet pas à pas pour déployer Calendraft sur un VPS avec Docker Compose.

**Temps estimé** : 2-3 heures (première fois)

---

## Étape 1 : Acheter et Préparer le VPS

### 1.1 Choisir un Fournisseur VPS

**Recommandations** :
- **Hetzner** : ~€4-5/mois (2 vCPU, 4GB RAM) - Excellent rapport qualité/prix
- **DigitalOcean** : ~$6/mois (1 vCPU, 1GB RAM) - Très populaire
- **OVH** : ~€3-5/mois - Bon marché
- **Scaleway** : ~€3-5/mois - Européen

**Spécifications minimales** :
- 2 vCPU
- 2 GB RAM (4 GB recommandé)
- 20 GB SSD
- Ubuntu 22.04 LTS ou Debian 12

### 1.2 Créer le VPS

1. Créer un compte chez le fournisseur
2. Créer un VPS Ubuntu 22.04 LTS
3. Noter l'adresse IP publique
4. Noter les identifiants root/SSH

### 1.3 Se Connecter au VPS

```bash
# Depuis votre machine locale
ssh root@VOTRE_IP_VPS

# Ou si vous avez créé un utilisateur
ssh utilisateur@VOTRE_IP_VPS
```

---

## Étape 2 : Configuration Initiale du Serveur

### 2.1 Mettre à Jour le Système

```bash
# Mettre à jour la liste des paquets
apt update && apt upgrade -y

# Installer les outils de base
apt install -y curl wget git ufw
```

### 2.2 Créer un Utilisateur Non-Root (Recommandé)

```bash
# Créer un nouvel utilisateur
adduser calendraft
usermod -aG sudo calendraft

# Se connecter avec ce nouvel utilisateur
su - calendraft
```

### 2.3 Configurer le Firewall

```bash
# Autoriser SSH (IMPORTANT : faites-le avant d'activer le firewall)
ufw allow 22/tcp

# Autoriser HTTP et HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Activer le firewall
ufw enable

# Vérifier le statut
ufw status
```

### 2.4 Installer Docker

```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Redémarrer la session (ou se déconnecter/reconnecter)
newgrp docker

# Vérifier l'installation
docker --version
```

### 2.5 Installer Docker Compose

```bash
# Installer Docker Compose Plugin
sudo apt install -y docker-compose-plugin

# Vérifier l'installation
docker compose version
```

---

## Étape 3 : Préparer l'Application

### 3.1 Transférer le Projet sur le VPS

**Option A : Cloner depuis Git (si le repository est public ou si vous avez configuré SSH)**

```bash
# Aller dans le répertoire home
cd ~

# Cloner votre repository
git clone https://github.com/VOTRE_USERNAME/calendraft.git
cd calendraft
```

**Option B : Transférer avec rsync (recommandé si le repository est privé)**

Depuis votre machine locale :

```bash
# Depuis le répertoire du projet local
cd /chemin/vers/calendraft

# Transférer les fichiers (exclut node_modules, .git, dist, etc.)
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '**/dist' \
  --exclude '**/*.db' \
  --exclude '.turbo' \
  --exclude 'turbod' \
  ./ root@VOTRE_IP_VPS:~/calendraft/
```

Puis sur le VPS :

```bash
cd ~/calendraft
```

### 3.2 Créer le Fichier .env

```bash
# Copier le template
cp docker.env.example .env

# Éditer le fichier
nano .env
```

### 3.3 Configurer les Variables d'Environnement

Éditer `.env` avec vos valeurs de production :

```env
# -----------------------------------
# PostgreSQL Database
# -----------------------------------
POSTGRES_USER=calendraft
POSTGRES_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE_ICI
POSTGRES_DB=calendraft
POSTGRES_PORT=5432

# -----------------------------------
# Backend Server
# -----------------------------------
SERVER_PORT=3000
# IMPORTANT : Mettez votre domaine frontend (sans slash final)
CORS_ORIGIN=https://calendraft.com

# Générez un secret fort (voir commande ci-dessous)
BETTER_AUTH_SECRET=VOTRE_SECRET_32_CARACTERES_ICI

# URL de votre backend (vous la configurerez après)
BETTER_AUTH_URL=https://api.calendraft.com

# Sentry (optionnel)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# -----------------------------------
# Redis (Rate Limiting)
# -----------------------------------
REDIS_URL=redis://redis:6379
REDIS_PORT=6379

# -----------------------------------
# Email Service Configuration
# -----------------------------------
# Option A: Resend (Recommandé)
RESEND_API_KEY=re_xxxxxxxxxxxxx
# IMPORTANT : Utilisez juste l'email, pas le format "Name <email>"
EMAIL_FROM=noreply@calendraft.com

# Option B: SMTP (Alternative)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@example.com
# SMTP_PASSWORD=your-password

# -----------------------------------
# Frontend Web
# -----------------------------------
WEB_PORT=3001
# IMPORTANT : URL accessible depuis le navigateur
VITE_SERVER_URL=https://api.calendraft.com

# Sentry (optionnel)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 3.4 Générer les Secrets Automatiquement

**Option A : Génération automatique (recommandé)**

```bash
cd ~/calendraft

# Générer BETTER_AUTH_SECRET
SECRET=$(openssl rand -base64 32)
sed -i "s|BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$SECRET|" .env

# Générer POSTGRES_PASSWORD
DB_PASS=$(openssl rand -base64 16 | tr -d '=+/')
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASS|" .env

# Vérifier (les valeurs seront masquées)
grep -E '^(BETTER_AUTH_SECRET|POSTGRES_PASSWORD)=' .env | sed 's/=.*/=***/'
```

**Option B : Génération manuelle**

```bash
# Générer un secret sécurisé
openssl rand -base64 32
```

Copier le résultat dans `BETTER_AUTH_SECRET` dans le fichier `.env`.

Faire de même pour `POSTGRES_PASSWORD` :

```bash
openssl rand -base64 16 | tr -d '=+/'
```

### 3.5 Sécuriser le Fichier .env

```bash
# S'assurer que .env n'est pas accessible par d'autres
chmod 600 .env
```

---

## Étape 4 : Démarrer les Services

### 4.1 Démarrer PostgreSQL et Redis

```bash
# Démarrer uniquement la base de données et Redis
docker compose up -d db redis

# Vérifier qu'ils sont démarrés
docker compose ps

# Vérifier les logs
docker compose logs db
docker compose logs redis
```

### 4.2 Attendre que PostgreSQL soit Prêt

```bash
# Vérifier que PostgreSQL est healthy
docker compose ps db

# Vous devriez voir "healthy" dans la colonne Status
# Si ce n'est pas le cas, attendre quelques secondes et réessayer
```

### 4.3 Initialiser le Schéma de Base de Données

**IMPORTANT** : Attendez que PostgreSQL soit "healthy" avant de continuer.

```bash
# Vérifier que PostgreSQL est prêt
docker compose ps db
# Vous devriez voir "healthy" dans la colonne Status

# Initialiser le schéma avec Prisma
# Note : Dans un monorepo, on utilise directement bunx prisma
docker compose run --rm -w /app/packages/db server sh -c 'bunx prisma db push'

# Vous devriez voir "Your database is now in sync with your Prisma schema"
```

**Alternative** : Si le script `scripts/docker-init-db.sh` existe, vous pouvez l'utiliser :

```bash
chmod +x scripts/docker-init-db.sh
./scripts/docker-init-db.sh
```

**Note** : Le script peut utiliser `docker-compose` (avec tiret) au lieu de `docker compose` (avec espace). Si c'est le cas, modifiez le script ou utilisez la commande manuelle ci-dessus.

### 4.4 Démarrer Tous les Services

```bash
# Construire et démarrer tous les services
DOCKER_BUILDKIT=1 docker compose up -d --build

# Vérifier que tous les services sont démarrés
docker compose ps

# Tous les services doivent afficher "Up" et "healthy" (pour db, redis, server, web)
```

**Note** : Si certains services ne démarrent pas ou sont "unhealthy" :

1. **Vérifier les logs** :
   ```bash
   docker compose logs server
   docker compose logs web
   ```

2. **Problèmes courants** :
   - **Variables d'environnement manquantes ou invalides** : Vérifiez que `EMAIL_FROM` est au format email simple (pas "Name <email>")
   - **Dépendances manquantes** : Si le build échoue, vérifiez que tous les `package.json` sont à jour
   - **Base de données non initialisée** : Assurez-vous d'avoir exécuté l'étape 4.3

3. **Reconstruire un service spécifique** :
   ```bash
   docker compose build --no-cache server
   docker compose up -d server
   ```

4. **Vérifier les logs en temps réel** :
   ```bash
   docker compose logs -f
   ```

### 4.5 Vérifier que Tout Fonctionne

```bash
# Tester le healthcheck du backend
curl http://localhost:3000/health

# Devrait retourner : {"status":"ok"}

# Tester le frontend
curl -I http://localhost:3001

# Devrait retourner : HTTP/1.1 200 OK
```

---

## Étape 5 : Configuration Nginx (Reverse Proxy)

### 5.1 Installer Nginx

```bash
sudo apt install -y nginx
```

### 5.2 Configuration Initiale (HTTP uniquement)

**IMPORTANT** : Commencez par une configuration HTTP simple. Vous configurerez HTTPS avec Certbot après avoir configuré votre domaine.

Créer le fichier de configuration :

```bash
sudo nano /etc/nginx/sites-available/calendraft
```

**Configuration initiale (HTTP) - Remplacez `VOTRE_IP_VPS` par votre IP ou votre domaine** :

```nginx
# Configuration HTTP (sera mis à jour avec HTTPS par Certbot)
server {
    listen 80;
    listen [::]:80;
    server_name VOTRE_IP_VPS ou votre-domaine.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Note** : Si vous n'avez pas encore de domaine, utilisez votre IP publique. Vous pourrez mettre à jour la configuration plus tard avec votre domaine et SSL.

### 5.3 Configuration pour l'API Backend (Optionnel)

**Note** : Pour un déploiement simple, vous pouvez laisser le backend accessible directement sur le port 3000. Si vous voulez le mettre derrière Nginx avec un sous-domaine, créez un fichier séparé :

```bash
sudo nano /etc/nginx/sites-available/calendraft-api
```

**Configuration HTTP initiale** :

```nginx
# Configuration HTTP pour l'API (sera mis à jour avec HTTPS par Certbot)
server {
    listen 80;
    listen [::]:80;
    server_name api.votre-domaine.com;

    # Proxy vers le conteneur serveur
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts pour les requêtes longues
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Augmenter la taille maximale des requêtes
        client_max_body_size 10M;
    }
}
```

**Alternative simple** : Si vous n'utilisez pas de sous-domaine pour l'API, vous pouvez l'ajouter dans le même fichier `calendraft` :

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name votre-domaine.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API (optionnel, si vous voulez /api sur le même domaine)
    # location /api {
    #     proxy_pass http://localhost:3000;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto $scheme;
    # }
}
```

### 5.4 Activer les Configurations

```bash
# Créer le lien symbolique pour le frontend
sudo ln -s /etc/nginx/sites-available/calendraft /etc/nginx/sites-enabled/

# Si vous avez créé un fichier séparé pour l'API
# sudo ln -s /etc/nginx/sites-available/calendraft-api /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Si tout est OK, redémarrer Nginx
sudo systemctl restart nginx

# Vérifier que Nginx fonctionne
sudo systemctl status nginx

# Tester l'accès
curl -I http://localhost
# Devrait retourner HTTP/1.1 200 OK
```

---

## Étape 6 : Configuration DNS

### 6.1 Chez Votre Registrar de Domaine

Ajouter ces enregistrements DNS :

```
Type    Name    Value              TTL
A       @       IP_DE_VOTRE_VPS    3600
A       www     IP_DE_VOTRE_VPS    3600
A       api     IP_DE_VOTRE_VPS    3600
```

### 6.2 Vérifier la Propagation DNS

```bash
# Attendre quelques minutes, puis vérifier
dig calendraft.com
dig api.calendraft.com

# Ou utiliser
nslookup calendraft.com
nslookup api.calendraft.com
```

---

## Étape 7 : Configuration SSL/TLS avec Let's Encrypt

### 7.1 Installer Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2 Obtenir les Certificats

```bash
# Pour le frontend
sudo certbot --nginx -d calendraft.com -d www.calendraft.com

# Pour l'API
sudo certbot --nginx -d api.calendraft.com

# Certbot va :
# 1. Demander votre email
# 2. Accepter les termes
# 3. Configurer automatiquement Nginx
# 4. Obtenir et installer les certificats
```

### 7.3 Vérifier le Renouvellement Automatique

```bash
# Tester le renouvellement (dry-run)
sudo certbot renew --dry-run

# Le renouvellement est automatique via un cron job
# Vérifier qu'il existe
sudo systemctl status certbot.timer
```

---

## Étape 8 : Mise à Jour des Variables d'Environnement

### 8.1 Mettre à Jour .env avec les URLs de Production

```bash
cd ~/calendraft
nano .env
```

Mettre à jour :

```env
# Backend
CORS_ORIGIN=https://calendraft.com
BETTER_AUTH_URL=https://api.calendraft.com

# Frontend
VITE_SERVER_URL=https://api.calendraft.com
```

### 8.2 Redémarrer les Services

```bash
# Arrêter les services
docker compose down

# Reconstruire avec les nouvelles variables
DOCKER_BUILDKIT=1 docker compose up -d --build

# Vérifier que tout fonctionne
docker compose ps
docker compose logs -f
```

---

## Étape 9 : Vérifications Finales

### 9.1 Vérifier les Services Docker

```bash
# Vérifier que tous les conteneurs sont en cours d'exécution
docker compose ps

# Tous doivent afficher "Up" et "healthy" (pour db, redis, server)

# Vérifier les logs
docker compose logs server
docker compose logs web
```

### 9.2 Tester les Endpoints

```bash
# Healthcheck backend (depuis le serveur)
curl https://api.calendraft.com/health

# Devrait retourner : {"status":"ok"}

# Frontend (depuis votre navigateur)
# Ouvrir https://calendraft.com
# Vérifier que la page charge correctement
```

### 9.3 Vérifier la Base de Données

```bash
# Se connecter à la base de données
docker compose exec db psql -U calendraft -d calendraft

# Vérifier les tables
\dt

# Quitter
\q
```

### 9.4 Tester l'Application Complète

1. Ouvrir https://calendraft.com dans un navigateur
2. Vérifier qu'il n'y a pas d'erreurs dans la console (F12)
3. Tester la création d'un compte (si l'authentification est configurée)
4. Vérifier les logs pour les erreurs

---

> 💡 **Sauvegarde, Monitoring et Maintenance** : Pour configurer les sauvegardes automatisées, le monitoring et la maintenance quotidienne, consultez [`PRODUCTION_COMMANDS.md`](./PRODUCTION_COMMANDS.md) et utilisez les scripts dans [`scripts/production/`](./scripts/production/).
>
> - **Sauvegarde** : Utilisez `./scripts/production/backup.sh` (plus robuste que le script manuel)
> - **Monitoring** : Utilisez `./scripts/production/monitor.sh` et `./scripts/production/health-check.sh`
> - **Mises à jour** : Utilisez `./scripts/production/deploy.sh --backup --migrate`
> - **Dépannage** : Consultez la section "Dépannage" dans [`PRODUCTION_COMMANDS.md`](./PRODUCTION_COMMANDS.md)

---

## Checklist Finale

### Infrastructure
- [ ] VPS acheté et configuré
- [ ] Utilisateur non-root créé
- [ ] Firewall configuré (ports 22, 80, 443)
- [ ] Docker installé
- [ ] Docker Compose installé

### Application
- [ ] Repository cloné sur le VPS
- [ ] Fichier `.env` créé et configuré
- [ ] `POSTGRES_PASSWORD` changé (mot de passe fort)
- [ ] `BETTER_AUTH_SECRET` généré (32+ caractères)
- [ ] Variables email configurées (Resend ou SMTP)
- [ ] Services Docker démarrés
- [ ] Schéma de base de données initialisé (`db:push`)

### Infrastructure Web
- [ ] Nginx installé et configuré
- [ ] DNS configuré (A records pour calendraft.com et api.calendraft.com)
- [ ] Certificats SSL obtenus avec Certbot
- [ ] Nginx redémarre correctement

### Configuration
- [ ] `CORS_ORIGIN` = `https://calendraft.com`
- [ ] `BETTER_AUTH_URL` = `https://api.calendraft.com`
- [ ] `VITE_SERVER_URL` = `https://api.calendraft.com`
- [ ] Services redéployés après modification des variables

### Vérifications
- [ ] Frontend accessible : `https://calendraft.com`
- [ ] API accessible : `https://api.calendraft.com/health`
- [ ] Base de données fonctionnelle
- [ ] Logs sans erreurs critiques
- [ ] Authentification testée (création de compte)

### Prochaines Étapes
- [ ] Scripts de production installés : `./scripts/production/install.sh`
- [ ] Documentation de production consultée : [`PRODUCTION_COMMANDS.md`](./PRODUCTION_COMMANDS.md)

---

> 💡 **Commandes de production** : Pour toutes les commandes de maintenance, monitoring et gestion quotidienne, consultez [`PRODUCTION_COMMANDS.md`](./PRODUCTION_COMMANDS.md) et utilisez les scripts automatisés dans [`scripts/production/`](./scripts/production/).

---

## Architecture Finale

```
Internet
   ↓
Nginx (Port 443 HTTPS)
   ↓
├─→ Frontend (calendraft.com) → Docker: web (port 3001)
└─→ Backend (api.calendraft.com) → Docker: server (port 3000)
                                      ↓
                              PostgreSQL (port 5432)
                              Redis (port 6379)
```

**URLs** :
- Frontend : `https://calendraft.com`
- API : `https://api.calendraft.com`
- Health Check : `https://api.calendraft.com/health`

---

## Résumé

Votre application est maintenant déployée en production ! 🎉

### Prochaines étapes

1. **Gestion quotidienne** : Utilisez les scripts de production
   ```bash
   cd ~/calendraft
   ./scripts/production/deploy.sh --backup
   ```

2. **Documentation complète** : Consultez [`PRODUCTION_COMMANDS.md`](./PRODUCTION_COMMANDS.md) pour :
   - Toutes les commandes de maintenance
   - Monitoring et dépannage
   - Sauvegardes automatisées
   - Scripts de production

3. **Aide rapide** : Utilisez `./scripts/production/help.sh` pour l'aide contextuelle

### Mise à jour simple

Pour les mises à jour futures, utilisez le script de déploiement :

```bash
cd ~/calendraft
./scripts/production/deploy.sh --backup --migrate
```

C'est tout ! 🚀

