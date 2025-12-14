#!/bin/bash
# Script de gestion de la base de données pour Calendraft (développement)
# Usage: ./scripts/dev/dev-db.sh [push|seed|studio|reset|status]

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

# Parse command
COMMAND="${1:-help}"

case "$COMMAND" in
    push)
        ensure_db_env
        log "📦 Application des changements de schéma à la base de données..."
        bun run db:push
        log "✅ Schéma appliqué"
        ;;
    
    seed)
        ensure_db_env
        log "🌱 Remplissage de la base de données avec des données de test..."
        bun run db:seed
        log "✅ Base de données remplie"
        ;;
    
    studio)
        ensure_db_env
        log "🎨 Ouverture de Prisma Studio..."
        warning "Prisma Studio va s'ouvrir dans votre navigateur"
        bun run db:studio
        ;;
    
    reset)
        warning "Cette opération va supprimer toutes les données de la base de données de développement !"
        read -p "Êtes-vous sûr ? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo "Opération annulée"
            exit 0
        fi
        
        ensure_db_env
        log "🗑️  Réinitialisation de la base de données..."
        
        # Arrêter les apps si elles tournent (elles pourraient utiliser la DB)
        warning "Assurez-vous d'arrêter toutes les applications en cours d'exécution (Ctrl+C)"
        sleep 2
        
        # Supprimer et recréer la base de données
        docker-compose -f docker-compose.dev.yml exec -T db psql -U calendraft -d calendraft_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1 || true
        
        # Appliquer le schéma
        bun run db:push
        
        log "✅ Base de données réinitialisée"
        ;;
    
    status)
        log "📊 État de la base de données"
        echo ""
        
        # Vérifier si les services Docker sont en cours d'exécution
        if ! docker-compose -f docker-compose.dev.yml ps db | grep -q "Up"; then
            error "Le conteneur PostgreSQL n'est pas en cours d'exécution. Démarrez-le avec: docker-compose -f docker-compose.dev.yml up -d"
        fi
        
        # Vérifier la connexion
        if docker-compose -f docker-compose.dev.yml exec -T db pg_isready -U calendraft > /dev/null 2>&1; then
            log "✅ PostgreSQL est en cours d'exécution et accessible"
        else
            error "PostgreSQL n'est pas prêt"
        fi
        
        # Lister les tables
        echo ""
        echo -e "${BLUE}📋 Tables de la base de données:${NC}"
        docker-compose -f docker-compose.dev.yml exec -T db psql -U calendraft -d calendraft_dev -c "\dt" 2>/dev/null || echo "  Aucune table trouvée ou schéma non initialisé"
        ;;
    
    help|*)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commandes:"
        echo "  push     Appliquer les changements de schéma à la base de données"
        echo "  seed     Remplir la base de données avec des données de test"
        echo "  studio   Ouvrir Prisma Studio (interface graphique de la base de données)"
        echo "  reset    Supprimer et recréer la base de données (⚠️  destructif)"
        echo "  status   Afficher l'état de la base de données et les tables"
        echo ""
        echo "Exemples:"
        echo "  ./scripts/dev/dev-db.sh push"
        echo "  ./scripts/dev/dev-db.sh studio"
        echo "  ./scripts/dev/dev-db.sh status"
        ;;
esac

