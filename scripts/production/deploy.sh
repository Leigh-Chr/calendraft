#!/bin/bash
# Script de déploiement pour Calendraft
# Usage: ./deploy.sh [--backup] [--migrate] [--service=SERVICE]

set -euo pipefail  # Arrêter en cas d'erreur, variable non définie, ou erreur dans un pipe

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
# Utiliser le répertoire courant si docker-compose.yml est présent, sinon utiliser la variable d'environnement
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${PROJECT_DIR:-$HOME/calendraft}"
fi
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
LOG_FILE="${LOG_FILE:-$HOME/deploy.log}"

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

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml non trouvé. Êtes-vous dans le répertoire du projet ?"
fi

# Vérifier les prérequis
if ! command -v docker > /dev/null 2>&1; then
    error "Docker n'est pas installé ou n'est pas dans le PATH"
fi

if ! docker info > /dev/null 2>&1; then
    error "Docker n'est pas en cours d'exécution. Démarrez le service Docker."
fi

if ! command -v git > /dev/null 2>&1; then
    error "Git n'est pas installé ou n'est pas dans le PATH"
fi

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Ce répertoire n'est pas un dépôt Git valide"
fi

# Options
DO_BACKUP=false
DO_MIGRATE=false
SERVICE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --backup)
            DO_BACKUP=true
            shift
            ;;
        --migrate)
            DO_MIGRATE=true
            shift
            ;;
        --service=*)
            SERVICE="${1#*=}"
            # Valider que le service est valide (sécurité)
            if [[ ! "$SERVICE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
                error "Nom de service invalide: $SERVICE (caractères alphanumériques, tirets et underscores uniquement)"
            fi
            shift
            ;;
        *)
            error "Option inconnue: $1"
            ;;
    esac
done

log "🚀 Démarrage du déploiement..."

# Sauvegarde optionnelle
if [ "$DO_BACKUP" = true ]; then
    log "💾 Création d'une sauvegarde..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        bash "$SCRIPT_DIR/backup.sh"
    else
        warning "Script de sauvegarde non trouvé, passage de la sauvegarde"
    fi
fi

# Récupérer les dernières modifications
log "📥 Récupération des modifications Git..."
if ! git pull; then
    error "Échec du git pull"
fi

# Migrations optionnelles
if [ "$DO_MIGRATE" = true ]; then
    log "🗄️  Application des migrations de base de données..."
    docker compose run --rm server bun run db:push || warning "Échec des migrations"
fi

# Déploiement
log "🔨 Construction et démarrage des services..."

if [ -n "$SERVICE" ]; then
    log "Déploiement du service: $SERVICE"
    DOCKER_BUILDKIT=1 docker compose up -d --build "$SERVICE"
else
    log "Déploiement de tous les services"
    docker compose down
    DOCKER_BUILDKIT=1 docker compose up -d --build
fi

# Attendre que les services soient prêts
log "⏳ Attente du démarrage des services..."
sleep 5

# Vérification de santé
log "🏥 Vérification de la santé des services..."
if docker compose ps | grep -q "unhealthy"; then
    error "Certains services sont unhealthy. Vérifiez les logs: docker compose logs"
fi

# Test du health check
log "🔍 Test du health check..."
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    log "✅ Health check OK"
else
    warning "Health check échoué, mais le déploiement continue"
fi

log "✅ Déploiement terminé avec succès !"
log "📊 Statut des services:"
docker compose ps

