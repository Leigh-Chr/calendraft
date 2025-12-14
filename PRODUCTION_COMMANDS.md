# Guide des Commandes de Production - Calendraft

Guide complet et détaillé des commandes et scripts pour gérer Calendraft en production.

> 💡 **Démarrage rapide** : Consultez `scripts/production/README.md` pour une introduction rapide.

---

## 📋 Table des Matières

1. [Scripts de Production](#scripts-de-production)
2. [Commandes Docker](#commandes-docker)
3. [Gestion de la Base de Données](#gestion-de-la-base-de-données)
4. [Monitoring](#monitoring)
5. [Maintenance](#maintenance)
6. [Dépannage](#dépannage)
7. [Sécurité](#sécurité)
8. [Automatisation](#automatisation)

---

## 🚀 Scripts de Production

Tous les scripts se trouvent dans `scripts/production/`. Rendez-les exécutables :

```bash
chmod +x scripts/production/*.sh
```

### Déploiement

```bash
# Déploiement simple
./scripts/production/deploy.sh

# Déploiement avec sauvegarde
./scripts/production/deploy.sh --backup

# Déploiement avec migrations
./scripts/production/deploy.sh --migrate

# Déploiement d'un service spécifique
./scripts/production/deploy.sh --service=web

# Déploiement complet
./scripts/production/deploy.sh --backup --migrate
```

### Sauvegarde

```bash
# Créer une sauvegarde
./scripts/production/backup.sh

# Lister les sauvegardes
./scripts/production/backup.sh --list

# Restaurer une sauvegarde
./scripts/production/backup.sh --restore=~/backups/db-backup-20251213-120000.sql.gz
```

### Monitoring

```bash
# Monitoring complet
./scripts/production/monitor.sh --all

# Santé des services
./scripts/production/monitor.sh --health

# Statistiques de ressources
./scripts/production/monitor.sh --stats

# Logs récents
./scripts/production/monitor.sh --logs

# Erreurs récentes
./scripts/production/monitor.sh --errors
```

### Vérification de Santé

```bash
# Vérification rapide
./scripts/production/health-check.sh

# Vérification détaillée
./scripts/production/health-check.sh --verbose
```

### Nettoyage

```bash
# Nettoyage complet (sans volumes)
./scripts/production/cleanup.sh --all

# Nettoyer les images inutilisées
./scripts/production/cleanup.sh --images

# Nettoyer le cache de build
./scripts/production/cleanup.sh --build-cache

# Nettoyer les logs
./scripts/production/cleanup.sh --logs

# ⚠️ Nettoyage système complet (destructif)
./scripts/production/cleanup.sh --system
```

### Commandes Rapides

```bash
# Statut des services
./scripts/production/quick-commands.sh status

# Logs en temps réel
./scripts/production/quick-commands.sh logs
./scripts/production/quick-commands.sh logs server

# Redémarrer un service
./scripts/production/quick-commands.sh restart web

# Accéder à PostgreSQL
./scripts/production/quick-commands.sh shell-db

# Statistiques
./scripts/production/quick-commands.sh stats
```

### Rollback

```bash
# Rollback interactif (demande le commit)
./scripts/production/rollback.sh

# Rollback vers un commit spécifique
./scripts/production/rollback.sh --commit=abc123

# Rollback sans sauvegarde
./scripts/production/rollback.sh --commit=HEAD~1 --no-backup

# Rollback sans restaurer la base de données
./scripts/production/rollback.sh --commit=HEAD~1 --no-db
```

### Vérification de Sauvegarde

```bash
# Vérifier toutes les sauvegardes
./scripts/production/verify-backup.sh

# Vérifier un fichier spécifique
./scripts/production/verify-backup.sh ~/backups/db-backup-20251213.sql.gz
```

### Audit de Sécurité

```bash
# Audit rapide
./scripts/production/security-audit.sh

# Audit détaillé
./scripts/production/security-audit.sh --verbose
```

### Rapport d'État

```bash
# Rapport texte (affiché)
./scripts/production/report.sh

# Rapport JSON
./scripts/production/report.sh --format=json

# Rapport sauvegardé dans un fichier
./scripts/production/report.sh --format=text --output=report.txt
```

---

## 🐳 Commandes Docker

### Services

```bash
# Voir le statut
docker compose ps

# Démarrer tous les services
docker compose up -d

# Arrêter tous les services
docker compose down

# Redémarrer un service
docker compose restart server
docker compose restart web

# Reconstruire et redémarrer
docker compose up -d --build
docker compose up -d --build web
docker compose up -d --build server
```

### Logs

```bash
# Logs de tous les services
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f server
docker compose logs -f web
docker compose logs -f db
docker compose logs -f redis

# Dernières 100 lignes
docker compose logs --tail=100

# Logs depuis une date
docker compose logs --since 2025-12-13T10:00:00
```

### Statistiques

```bash
# Statistiques en temps réel
docker stats

# Statistiques d'un conteneur
docker stats calendraft-server
```

### Shell dans les Conteneurs

```bash
# Shell dans le backend
docker compose exec server sh

# Shell dans le frontend
docker compose exec web sh

# Shell PostgreSQL
docker compose exec db psql -U calendraft -d calendraft

# Shell Redis
docker compose exec redis redis-cli
```

---

## 🗄️ Gestion de la Base de Données

### Sauvegarde

```bash
# Sauvegarde manuelle
docker compose exec db pg_dump -U calendraft calendraft > backup.sql

# Sauvegarde compressée
docker compose exec db pg_dump -U calendraft calendraft | gzip > backup.sql.gz

# Sauvegarde avec timestamp
docker compose exec db pg_dump -U calendraft calendraft > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restauration

```bash
# Restaurer depuis un fichier
docker compose exec -T db psql -U calendraft calendraft < backup.sql

# Restaurer depuis un fichier compressé
gunzip -c backup.sql.gz | docker compose exec -T db psql -U calendraft calendraft
```

### Migrations

```bash
# Appliquer les migrations
docker compose run --rm server bun run db:push

# Générer le client Prisma
docker compose run --rm server bun run db:generate

# Ouvrir Prisma Studio
docker compose run --rm server bun run db:studio
```

### Requêtes SQL

```bash
# Exécuter une requête
docker compose exec db psql -U calendraft -d calendraft -c "SELECT COUNT(*) FROM calendars;"

# Ouvrir un shell SQL interactif
docker compose exec db psql -U calendraft -d calendraft
```

---

## 📊 Monitoring

### Health Checks

```bash
# Backend health check
curl http://localhost:3000/health

# Frontend health check
curl http://localhost:3001/nginx-health

# Health check HTTPS
curl https://api.calendraft.app/health
curl https://calendraft.app/nginx-health
```

### Vérifications Système

```bash
# Utilisation du disque
df -h

# Utilisation de la mémoire
free -h

# Processus en cours
htop
# ou
top

# Ports ouverts
netstat -tulpn | grep -E '3000|3001|5432|6379'
# ou
ss -tulpn | grep -E '3000|3001|5432|6379'
```

### Logs Système

```bash
# Logs système
journalctl -u docker -f

# Logs Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs Docker
journalctl -u docker.service -f
```

---

## 🔧 Maintenance

### Mise à Jour

```bash
# Mise à jour complète
cd ~/calendraft
git pull
docker compose down
DOCKER_BUILDKIT=1 docker compose up -d --build

# Mise à jour d'un service
git pull
docker compose up -d --build web
```

### Nettoyage

```bash
# Nettoyer les images inutilisées
docker image prune -a

# Nettoyer les volumes inutilisés (⚠️ destructif)
docker volume prune

# Nettoyer le système complet (⚠️ très destructif)
docker system prune -a --volumes

# Nettoyer le cache de build
docker builder prune -a
```

### Rotation des Logs

```bash
# Voir la configuration des logs
docker compose config | grep -A 5 logging

# Les logs sont automatiquement rotés (max 10MB, 3 fichiers)
# Voir: docker-compose.yml
```

---

## 🐛 Dépannage

### Services qui ne démarrent pas

```bash
# Vérifier les logs
docker compose logs server
docker compose logs web

# Vérifier la configuration
docker compose config

# Vérifier les variables d'environnement
docker compose exec server env | grep -E 'CORS|AUTH|DATABASE'

# Tester manuellement
docker compose run --rm server bun run dist/index.js
```

### Service "Unhealthy"

```bash
# Vérifier les logs du service
docker compose logs server | tail -50

# Tester le healthcheck manuellement
docker compose exec server curl -f http://localhost:3000/health

# Vérifier les ressources
docker stats calendraft-server
```

### Problèmes de Base de Données

```bash
# Vérifier la connexion
docker compose exec db pg_isready -U calendraft

# Vérifier les tables
docker compose exec db psql -U calendraft -d calendraft -c "\dt"

# Vérifier les connexions actives
docker compose exec db psql -U calendraft -d calendraft -c "SELECT count(*) FROM pg_stat_activity;"
```

### Problèmes de Réseau

```bash
# Vérifier les ports
netstat -tulpn | grep -E '3000|3001|5432|6379'

# Tester la connectivité
curl http://localhost:3000/health
curl http://localhost:3001/

# Vérifier les règles firewall
ufw status
iptables -L -n
```

### Problèmes SSL/HTTPS

```bash
# Vérifier les certificats
sudo certbot certificates

# Renouveler les certificats
sudo certbot renew

# Tester SSL
openssl s_client -connect calendraft.app:443

# Vérifier la configuration Nginx
sudo nginx -t
```

---

## 🔒 Sécurité

### Vérification des Headers

```bash
# Vérifier les headers de sécurité
curl -I https://calendraft.app | grep -E 'X-|Strict-|Content-Security'

# Vérifier HSTS
curl -I https://calendraft.app | grep Strict-Transport-Security

# Vérifier CSP
curl -I https://calendraft.app | grep Content-Security-Policy
```

### Audit de Sécurité

```bash
# Audit des dépendances (depuis le repo local)
bun audit

# Scanner les vulnérabilités
bunx bun-osv-scanner

# Vérifier les secrets exposés
docker compose config | grep -E 'password|secret|key' | grep -v '^#'
```

### Mise à Jour de Sécurité

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Mettre à jour Docker
sudo apt update && sudo apt install --only-upgrade docker-ce docker-ce-cli

# Vérifier les mises à jour de sécurité
sudo unattended-upgrades --dry-run
```

---

## 📝 Commandes Utiles Rapides

### Checklist de Déploiement

```bash
# 1. Sauvegarder
./scripts/production/backup.sh

# 2. Mettre à jour
git pull

# 3. Migrer (si nécessaire)
docker compose run --rm server bun run db:push

# 4. Déployer
DOCKER_BUILDKIT=1 docker compose up -d --build

# 5. Vérifier
./scripts/production/health-check.sh
```

### Commandes Quotidiennes

```bash
# Vérifier l'état
docker compose ps

# Voir les logs récents
docker compose logs --tail=50

# Vérifier les ressources
docker stats --no-stream

# Vérifier la santé
curl http://localhost:3000/health
```

### Commandes Hebdomadaires

```bash
# Nettoyer les images inutilisées
docker image prune -a

# Vérifier l'espace disque
df -h

# Vérifier les sauvegardes
ls -lh ~/backups/

# Audit de sécurité
bun audit
```

---

## 🔄 Automatisation

### Configuration Cron

Pour automatiser les tâches récurrentes, ajoutez des entrées dans votre crontab :

```bash
# Éditer le crontab
crontab -e
```

### Sauvegarde Quotidienne

```bash
# Sauvegarde à 2h du matin tous les jours
0 2 * * * cd ~/calendraft && ./scripts/production/backup.sh >> ~/backup.log 2>&1
```

### Health Check Quotidien

```bash
# Health check à 8h du matin
0 8 * * * cd ~/calendraft && ./scripts/production/health-check.sh >> ~/health.log 2>&1
```

### Nettoyage Hebdomadaire

```bash
# Nettoyage le dimanche à 3h du matin
0 3 * * 0 cd ~/calendraft && ./scripts/production/cleanup.sh --images --build-cache >> ~/cleanup.log 2>&1
```

### Rapport d'État Quotidien

```bash
# Rapport JSON à minuit pour monitoring externe
0 0 * * * cd ~/calendraft && ./scripts/production/report.sh --format=json --output=~/reports/status-$(date +\%Y\%m\%d).json
```

### Audit de Sécurité Hebdomadaire

```bash
# Audit de sécurité le lundi à 6h
0 6 * * 1 cd ~/calendraft && ./scripts/production/security-audit.sh >> ~/security-audit.log 2>&1
```

### Exemple de Crontab Complet

```bash
# Calendraft - Tâches automatisées
# Sauvegarde quotidienne à 2h
0 2 * * * cd ~/calendraft && ./scripts/production/backup.sh >> ~/backup.log 2>&1

# Health check quotidien à 8h
0 8 * * * cd ~/calendraft && ./scripts/production/health-check.sh >> ~/health.log 2>&1

# Rapport quotidien à minuit
0 0 * * * cd ~/calendraft && ./scripts/production/report.sh --format=json --output=~/reports/status-$(date +\%Y\%m\%d).json

# Audit de sécurité hebdomadaire (lundi 6h)
0 6 * * 1 cd ~/calendraft && ./scripts/production/security-audit.sh >> ~/security-audit.log 2>&1

# Nettoyage hebdomadaire (dimanche 3h)
0 3 * * 0 cd ~/calendraft && ./scripts/production/cleanup.sh --images --build-cache >> ~/cleanup.log 2>&1
```

### Alertes par Email (Optionnel)

Pour recevoir des alertes par email en cas d'échec :

```bash
# Health check avec envoi d'email en cas d'échec
0 8 * * * cd ~/calendraft && ./scripts/production/health-check.sh || echo "Health check failed" | mail -s "Calendraft Alert" admin@example.com
```

---

## 📞 Support et Dépannage

### Workflow de Dépannage

1. **Diagnostiquer le problème**
   ```bash
   ./scripts/production/monitor.sh --all
   ./scripts/production/health-check.sh --verbose
   ```

2. **Consulter les logs**
   ```bash
   ./scripts/production/monitor.sh --errors
   ./scripts/production/quick-commands.sh logs
   ```

3. **Vérifier les ressources**
   ```bash
   ./scripts/production/monitor.sh --stats
   df -h
   free -h
   ```

4. **Actions correctives**
   - Redémarrer un service : `./scripts/production/quick-commands.sh restart [service]`
   - Rollback : `./scripts/production/rollback.sh`
   - Restaurer depuis sauvegarde : `./scripts/production/backup.sh --restore=FILE`

### Informations à Collecter en Cas de Problème

```bash
# Version de Docker
docker --version
docker compose version

# Statut des services
docker compose ps

# Logs récents
docker compose logs --tail=100 > logs.txt

# Configuration
docker compose config > config.txt

# Ressources système
df -h > disk.txt
free -h > memory.txt
docker stats --no-stream > stats.txt
```

### Commandes de Diagnostic

```bash
# Diagnostic complet
./scripts/production/monitor.sh --all > diagnostic.txt

# Health check détaillé
./scripts/production/health-check.sh --verbose > health.txt

# Informations système
uname -a > system.txt
docker info > docker-info.txt
```

---

## 📚 Ressources

- [Documentation Docker](https://docs.docker.com/)
- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Guide de Déploiement VPS](./VPS_DEPLOYMENT.md)
- [Documentation de Sécurité](./SECURITY.md)

---

**Dernière mise à jour**: 13 décembre 2025

