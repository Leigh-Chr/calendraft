# Scripts de Production - Calendraft

Collection de scripts pour gérer Calendraft en production de manière sécurisée et efficace.

> 📚 **Documentation complète** : Consultez `PRODUCTION_COMMANDS.md` à la racine du projet pour le guide de référence complet.

## 🚀 Démarrage Rapide

```bash
# 1. Rendre les scripts exécutables
chmod +x scripts/production/*.sh

# 2. Installer sur le serveur (optionnel)
./scripts/production/install.sh user@server

# 3. Vérifier la santé
./scripts/production/health-check.sh

# 4. Déployer
./scripts/production/deploy.sh --backup
```

## 📋 Scripts Disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `deploy.sh` | Déploiement avec sauvegarde et migrations | `./deploy.sh [--backup] [--migrate] [--service=SERVICE]` |
| `backup.sh` | Sauvegarde et restauration de la base de données | `./backup.sh [--list] [--restore=FILE]` |
| `rollback.sh` | Retour à une version précédente | `./rollback.sh [--commit=HASH] [--no-backup] [--no-db]` |
| `monitor.sh` | Monitoring des services et ressources | `./monitor.sh [--all\|--health\|--stats\|--logs\|--errors]` |
| `health-check.sh` | Vérification complète de santé | `./health-check.sh [--verbose]` |
| `security-audit.sh` | Audit de sécurité complet | `./security-audit.sh [--verbose]` |
| `verify-backup.sh` | Vérification d'intégrité des sauvegardes | `./verify-backup.sh [FILE]` |
| `report.sh` | Rapport d'état (texte ou JSON) | `./report.sh [--format=text\|json] [--output=FILE]` |
| `cleanup.sh` | Nettoyage des ressources Docker | `./cleanup.sh [--all\|--images\|--volumes\|--build-cache\|--logs\|--system]` |
| `quick-commands.sh` | Commandes Docker fréquentes | `./quick-commands.sh [command] [service]` |
| `install.sh` | Installation sur serveur distant | `./install.sh user@server` |
| `help.sh` | Aide intégrée | `./help.sh [script]` |

## 🔧 Configuration

Les scripts utilisent des variables d'environnement avec des valeurs par défaut :

```bash
PROJECT_DIR=~/calendraft      # Détecté automatiquement si docker-compose.yml présent
BACKUP_DIR=~/backups          # Répertoire des sauvegardes
LOG_FILE=~/deploy.log         # Fichier de log pour deploy.sh
RETENTION_DAYS=30             # Rétention des sauvegardes (jours)
```

Vous pouvez les surcharger avant d'exécuter les scripts :

```bash
export BACKUP_DIR=/mnt/backups
export RETENTION_DAYS=60
./backup.sh
```

## 🎯 Cas d'Usage Courants

### Déploiement Régulier

```bash
# Déploiement avec sauvegarde automatique
./deploy.sh --backup --migrate
```

### Sauvegarde Quotidienne

```bash
# Créer une sauvegarde (rotation automatique après 30 jours)
./backup.sh

# Vérifier l'intégrité
./verify-backup.sh
```

### Monitoring Quotidien

```bash
# Vue d'ensemble complète
./monitor.sh --all

# Vérification de santé rapide
./health-check.sh
```

### En Cas de Problème

```bash
# 1. Diagnostiquer
./monitor.sh --errors
./health-check.sh --verbose

# 2. Rollback si nécessaire
./rollback.sh --commit=HEAD~1

# 3. Restaurer depuis sauvegarde si nécessaire
./backup.sh --restore=~/backups/db-backup-20251213-120000.sql.gz

# Note: Le rollback ne restaure pas automatiquement la base de données
# pour des raisons de sécurité. Utilisez --no-db si vous voulez
# seulement revenir au code précédent sans toucher à la DB.
```

### Audit de Sécurité

```bash
# Audit complet
./security-audit.sh --verbose

# Rapport d'état pour documentation
./report.sh --format=json --output=status-report.json
```

## 🛠️ Prérequis

- Docker et Docker Compose v2
- Git
- Bash 4.0+
- `curl` (pour les health checks)
- `gzip` (pour les sauvegardes)

Les scripts vérifient automatiquement ces prérequis avant l'exécution.

## 🔒 Sécurité

Tous les scripts incluent :

- ✅ Validation des entrées utilisateur
- ✅ Vérification des prérequis (Docker, Git, etc.)
- ✅ Protection contre l'injection de commandes
- ✅ Gestion d'erreurs robuste
- ✅ Confirmations pour opérations destructives

## 📝 Notes

- Tous les scripts sont conçus pour être exécutés depuis le répertoire du projet
- Les scripts détectent automatiquement le répertoire si `docker-compose.yml` est présent
- Les logs sont sauvegardés dans `LOG_FILE` (par défaut `~/deploy.log` pour `deploy.sh`)
- Les sauvegardes sont automatiquement compressées et rotées après `RETENTION_DAYS`

## 🆘 Support

Pour obtenir de l'aide sur un script spécifique :

```bash
./help.sh deploy
./help.sh backup
# etc.
```

Pour la documentation complète avec tous les exemples et cas d'usage détaillés, consultez `PRODUCTION_COMMANDS.md` à la racine du projet.
