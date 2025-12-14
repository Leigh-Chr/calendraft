#!/bin/bash
# Script de nettoyage de l'environnement de développement pour Calendraft
# Usage: ./scripts/dev/dev-clean.sh [--all] [--volumes] [--cache]

set -euo pipefail  # Arrêter en cas d'erreur, variable non définie, ou erreur dans un pipe

# Configuration
# Utiliser le répertoire courant si docker-compose.dev.yml est présent, sinon utiliser le chemin relatif au script
if [ -f "docker-compose.dev.yml" ] || [ -f "package.json" ]; then
    PROJECT_DIR="$(pwd)"
else
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

cd "$PROJECT_DIR" || exit 1

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Parse arguments
CLEAN_VOLUMES=false
CLEAN_CACHE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            CLEAN_VOLUMES=true
            CLEAN_CACHE=true
            shift
            ;;
        --volumes)
            CLEAN_VOLUMES=true
            shift
            ;;
        --cache)
            CLEAN_CACHE=true
            shift
            ;;
        *)
            error "Option inconnue: $1"
            ;;
    esac
done

log "🧹 Nettoyage de l'environnement de développement..."

# Arrêter les services Docker
log "🛑 Arrêt des services Docker..."
if [ "$CLEAN_VOLUMES" = true ]; then
    # Si nettoyage des volumes, utiliser down -v directement
    warning "Cette opération va supprimer toutes les données de la base de données !"
    read -p "Êtes-vous sûr ? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Nettoyage des volumes ignoré"
        docker compose -f docker-compose.dev.yml down
    else
        log "🗑️  Arrêt des services et suppression des volumes..."
        docker compose -f docker-compose.dev.yml down -v
        log "✅ Services arrêtés et volumes supprimés"
    fi
else
    docker compose -f docker-compose.dev.yml down
    log "✅ Services Docker arrêtés"
fi

# Nettoyer les caches
if [ "$CLEAN_CACHE" = true ]; then
    log "🗑️  Nettoyage des caches..."
    
    # Cache Turborepo
    if [ -d ".turbo" ]; then
        rm -rf .turbo
        log "✅ Cache Turborepo nettoyé"
    fi
    
    # Cache node_modules
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        log "✅ Cache node_modules nettoyé"
    fi
    
    # Artéfacts de build
    bun run clean 2>/dev/null || true
    log "✅ Artéfacts de build nettoyés"
fi

log "✅ Nettoyage terminé !"
echo ""
echo "Pour repartir de zéro:"
echo "  ./scripts/dev-setup.sh"

