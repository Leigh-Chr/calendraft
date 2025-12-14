#!/bin/bash
# Script de démarrage de l'environnement de développement pour Calendraft
# Usage: ./scripts/dev/dev.sh [--no-db] [--no-apps]

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
START_DB=true
START_APPS=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-db)
            START_DB=false
            shift
            ;;
        --no-apps)
            START_APPS=false
            shift
            ;;
        *)
            error "Option inconnue: $1"
            ;;
    esac
done

log "🚀 Démarrage de l'environnement de développement Calendraft..."

# Vérifier les prérequis
if ! command -v bun &> /dev/null 2>&1; then
    error "Bun n'est pas installé ou n'est pas dans le PATH. Installez Bun: https://bun.sh"
fi

if ! command -v docker &> /dev/null 2>&1; then
    error "Docker n'est pas installé ou n'est pas dans le PATH"
fi

if ! docker info > /dev/null 2>&1; then
    error "Docker n'est pas en cours d'exécution. Démarrez le service Docker."
fi

# Démarrer les services Docker
if [ "$START_DB" = true ]; then
    log "📦 Démarrage des services Docker (PostgreSQL + Redis)..."
    
    if ! docker-compose -f docker-compose.dev.yml up -d; then
        error "Échec du démarrage des services Docker"
    fi
    
    log "⏳ Attente de la disponibilité de PostgreSQL..."
    until docker-compose -f docker-compose.dev.yml exec -T db pg_isready -U calendraft > /dev/null 2>&1; do
        sleep 1
    done
    
    log "⏳ Attente de la disponibilité de Redis..."
    until docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping > /dev/null 2>&1; do
        sleep 1
    done
    
    log "✅ Services Docker prêts"
fi

# Vérifier/créer packages/db/.env si nécessaire
ensure_db_env() {
    if [ ! -f "packages/db/.env" ]; then
        warning "packages/db/.env non trouvé. Création..."
        if [ -f "apps/server/.env" ]; then
            SERVER_DB_URL=$(grep "^DATABASE_URL=" apps/server/.env | cut -d'=' -f2- | tr -d '"' || echo "")
            if [ -n "$SERVER_DB_URL" ]; then
                echo "DATABASE_URL=\"$SERVER_DB_URL\"" > packages/db/.env
                log "✅ packages/db/.env créé avec DATABASE_URL depuis apps/server/.env"
            else
                echo 'DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"' > packages/db/.env
                log "✅ packages/db/.env créé avec valeurs par défaut"
            fi
        else
            echo 'DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"' > packages/db/.env
            log "✅ packages/db/.env créé avec valeurs par défaut"
        fi
    elif grep -q "placeholder" packages/db/.env 2>/dev/null; then
        warning "packages/db/.env contient des valeurs placeholder. Correction..."
        if [ -f "apps/server/.env" ]; then
            SERVER_DB_URL=$(grep "^DATABASE_URL=" apps/server/.env | cut -d'=' -f2- | tr -d '"' || echo "")
            if [ -n "$SERVER_DB_URL" ]; then
                echo "DATABASE_URL=\"$SERVER_DB_URL\"" > packages/db/.env
                log "✅ packages/db/.env corrigé"
            else
                echo 'DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"' > packages/db/.env
                log "✅ packages/db/.env corrigé avec valeurs par défaut"
            fi
        else
            echo 'DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"' > packages/db/.env
            log "✅ packages/db/.env corrigé avec valeurs par défaut"
        fi
    fi
}

# Vérifier l'initialisation de la base de données
if [ "$START_DB" = true ] && [ "$START_APPS" = true ]; then
    log "🔍 Vérification de l'initialisation de la base de données..."
    
    # S'assurer que packages/db/.env existe et est correct
    ensure_db_env
    
    # Vérifier si le client Prisma est généré
    if [ ! -d "packages/db/node_modules/.prisma" ]; then
        warning "Client Prisma non généré. Génération en cours..."
        bun run db:generate
    fi
    
    # Vérifier si la base de données a des tables
    TABLE_COUNT=$(docker-compose -f docker-compose.dev.yml exec -T db psql -U calendraft -d calendraft_dev -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
    if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" = "0" ]; then
        warning "Schéma de base de données non initialisé. Application du schéma..."
        bun run db:push
    else
        log "✅ Base de données initialisée (${TABLE_COUNT} tables trouvées)"
    fi
fi

# Démarrer les applications
if [ "$START_APPS" = true ]; then
    log "🎨 Démarrage des serveurs de développement..."
    echo ""
    echo -e "${GREEN}✅ Backend: http://localhost:3000${NC}"
    echo -e "${GREEN}✅ Frontend: http://localhost:3001${NC}"
    echo ""
    echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter tous les services${NC}"
    echo ""
    
    bun run dev
else
    log "✅ Services Docker en cours d'exécution"
    echo ""
    echo "Pour démarrer les applications, exécutez:"
    echo "  bun run dev"
fi

