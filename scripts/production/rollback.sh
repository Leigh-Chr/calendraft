#!/bin/bash
# Script de rollback pour Calendraft
# Usage: ./rollback.sh [--commit=HASH] [--no-backup] [--no-db]

set -euo pipefail  # Arrêter en cas d'erreur, variable non définie, ou erreur dans un pipe

# Configuration
# Utiliser le répertoire courant si docker-compose.yml est présent, sinon utiliser la variable d'environnement
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${PROJECT_DIR:-$HOME/calendraft}"
fi

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
LOG_FILE="${LOG_FILE:-$HOME/rollback.log}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Fonctions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

cd "$PROJECT_DIR" || error "Impossible d'accéder au répertoire du projet"

# Vérifier qu'on est dans un repo Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Ce répertoire n'est pas un dépôt Git"
fi

# Options
COMMIT_HASH=""
DO_BACKUP=true
SKIP_DB=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --commit=*)
            COMMIT_HASH="${1#*=}"
            shift
            ;;
        --no-backup)
            DO_BACKUP=false
            shift
            ;;
        --no-db)
            SKIP_DB=true
            shift
            ;;
        *)
            error "Option inconnue: $1"
            ;;
    esac
done

log "🔄 Démarrage du rollback..."

# Sauvegarde optionnelle
if [ "$DO_BACKUP" = true ]; then
    log "💾 Création d'une sauvegarde avant rollback..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        bash "$SCRIPT_DIR/backup.sh" || warning "Échec de la sauvegarde, continuation du rollback"
    fi
fi

# Obtenir le commit cible
if [ -z "$COMMIT_HASH" ]; then
    log "📋 Derniers commits disponibles:"
    git log --oneline -10
    echo ""
    read -p "Entrez le hash du commit (ou 'HEAD~1' pour le précédent): " COMMIT_HASH
    
    if [ -z "$COMMIT_HASH" ]; then
        error "Aucun commit spécifié"
    fi
fi

# Valider le format du commit (sécurité)
if [[ ! "$COMMIT_HASH" =~ ^[a-f0-9]{7,40}$|^HEAD(~[0-9]+)?$ ]]; then
    error "Format de commit invalide: $COMMIT_HASH"
fi

# Vérifier que le commit existe
if ! git rev-parse --verify "$COMMIT_HASH" > /dev/null 2>&1; then
    error "Commit '$COMMIT_HASH' introuvable"
fi

# Vérifier qu'il n'y a pas de modifications non commitées
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    warning "Des modifications non commitées sont présentes"
    warning "Elles seront perdues lors du rollback"
    read -p "Continuer quand même ? (yes/no): " confirm_unsaved
    if [ "$confirm_unsaved" != "yes" ]; then
        log "Rollback annulé"
        exit 0
    fi
fi

# Afficher les informations du commit
log "📌 Commit cible:"
git log -1 --oneline "$COMMIT_HASH"
echo ""

# Confirmation
echo "⚠️  ATTENTION: Cette opération va revenir au commit $COMMIT_HASH"
echo "   Les modifications non commitées seront perdues !"
read -p "Continuer ? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log "Rollback annulé"
    exit 0
fi

# Sauvegarder l'état actuel (optionnel, pour pouvoir revenir)
CURRENT_COMMIT=$(git rev-parse HEAD)
log "📍 Commit actuel sauvegardé: $CURRENT_COMMIT"

# Vérifier que docker-compose.yml existe dans le commit cible
TARGET_COMPOSE=$(git show "$COMMIT_HASH:docker-compose.yml" 2>/dev/null)
if [ -z "$TARGET_COMPOSE" ]; then
    error "Le commit $COMMIT_HASH ne contient pas de docker-compose.yml"
fi

# Rollback Git
log "🔄 Retour au commit $COMMIT_HASH..."
if ! git checkout "$COMMIT_HASH"; then
    error "Échec du checkout. Vérifiez les conflits ou les modifications non sauvegardées."
fi

# Rollback de la base de données (si nécessaire et si pas skip)
if [ "$SKIP_DB" = false ]; then
    log "🗄️  Vérification des migrations de base de données..."
    # Note: En production, on ne rollback généralement pas la DB automatiquement
    # car cela peut causer des pertes de données. On laisse l'admin décider.
    warning "Rollback de la base de données non effectué automatiquement pour des raisons de sécurité."
    warning "Si nécessaire, restaurez manuellement depuis une sauvegarde avec: ./backup.sh --restore=FILE"
fi

# Reconstruire et redémarrer
log "🔨 Reconstruction et redémarrage des services..."
docker compose down
DOCKER_BUILDKIT=1 docker compose up -d --build

# Attendre que les services soient prêts
log "⏳ Attente du démarrage des services..."
sleep 5

# Vérification de santé
log "🏥 Vérification de la santé des services..."
if docker compose ps | grep -q "unhealthy"; then
    error "Certains services sont unhealthy après le rollback. Vérifiez les logs."
fi

# Test du health check
log "🔍 Test du health check..."
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    log "✅ Health check OK"
else
    warning "Health check échoué après rollback"
fi

log "✅ Rollback terminé avec succès !"
log "📊 Statut des services:"
docker compose ps

echo ""
log "💡 Pour revenir au commit précédent ($CURRENT_COMMIT):"
log "   git checkout $CURRENT_COMMIT && ./deploy.sh"

