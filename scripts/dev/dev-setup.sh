#!/bin/bash
# Script de configuration initiale de l'environnement de développement pour Calendraft
# Usage: ./scripts/dev/dev-setup.sh

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

log "🔧 Configuration initiale de l'environnement de développement Calendraft..."

# Vérifier les prérequis
log "📋 Vérification des prérequis..."

MISSING_DEPS=()

if ! command -v bun &> /dev/null 2>&1; then
    MISSING_DEPS+=("bun")
fi

if ! command -v docker &> /dev/null 2>&1; then
    MISSING_DEPS+=("docker")
fi

if ! command -v git &> /dev/null 2>&1; then
    MISSING_DEPS+=("git")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    error "Dépendances manquantes: ${MISSING_DEPS[*]}. Installez-les: Bun (https://bun.sh), Docker (https://docs.docker.com/get-docker/), Git (https://git-scm.com/)"
fi

log "✅ Tous les prérequis sont installés"

# Installer les dépendances
log "📦 Installation des dépendances..."
bun install
log "✅ Dépendances installées"

# Vérifier/créer les fichiers .env
log "🔐 Vérification de la configuration de l'environnement..."

# Server .env
if [ ! -f "apps/server/.env" ]; then
    warning "apps/server/.env non trouvé. Création du template..."
    
    # Générer BETTER_AUTH_SECRET si openssl est disponible
    if command -v openssl &> /dev/null 2>&1; then
        AUTH_SECRET=$(openssl rand -hex 32)
    else
        AUTH_SECRET="change-me-in-production-min-32-characters-long"
        warning "openssl non trouvé, utilisation d'un secret placeholder. Veuillez le mettre à jour !"
    fi
    
    cat > apps/server/.env << EOF
# PostgreSQL database (required)
DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"

# Backend server port (default: 3000)
PORT=3000

# Frontend URL for CORS (default: http://localhost:3001)
CORS_ORIGIN=http://localhost:3001

# Better-Auth configuration
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=http://localhost:3000
EOF
    log "✅ apps/server/.env créé"
    warning "Veuillez examiner et mettre à jour apps/server/.env avec vos valeurs"
else
    log "✅ apps/server/.env existe"
fi

# Web .env
if [ ! -f "apps/web/.env" ]; then
    warning "apps/web/.env non trouvé. Création du template..."
    cat > apps/web/.env << 'EOF'
# Backend server URL (default: http://localhost:3000)
VITE_SERVER_URL=http://localhost:3000
EOF
    log "✅ apps/web/.env créé"
else
    log "✅ apps/web/.env existe"
fi

# DB package .env (nécessaire pour Prisma)
# Ce fichier doit pointer vers la même DATABASE_URL que apps/server/.env
if [ ! -f "packages/db/.env" ]; then
    warning "packages/db/.env non trouvé. Création du template..."
    # Lire DATABASE_URL depuis apps/server/.env si disponible
    if [ -f "apps/server/.env" ]; then
        SERVER_DB_URL=$(grep "^DATABASE_URL=" apps/server/.env | cut -d'=' -f2- | tr -d '"' || echo "")
        if [ -n "$SERVER_DB_URL" ]; then
            echo "DATABASE_URL=\"$SERVER_DB_URL\"" > packages/db/.env
            log "✅ packages/db/.env créé avec DATABASE_URL depuis apps/server/.env"
        else
            cat > packages/db/.env << 'EOF'
DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"
EOF
            log "✅ packages/db/.env créé avec valeurs par défaut"
        fi
    else
        cat > packages/db/.env << 'EOF'
DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"
EOF
        log "✅ packages/db/.env créé avec valeurs par défaut"
    fi
else
    # Vérifier si le fichier contient des valeurs placeholder
    if grep -q "placeholder" packages/db/.env 2>/dev/null; then
        warning "packages/db/.env contient des valeurs placeholder. Correction..."
        if [ -f "apps/server/.env" ]; then
            SERVER_DB_URL=$(grep "^DATABASE_URL=" apps/server/.env | cut -d'=' -f2- | tr -d '"' || echo "")
            if [ -n "$SERVER_DB_URL" ]; then
                echo "DATABASE_URL=\"$SERVER_DB_URL\"" > packages/db/.env
                log "✅ packages/db/.env corrigé avec DATABASE_URL depuis apps/server/.env"
            else
                cat > packages/db/.env << 'EOF'
DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"
EOF
                log "✅ packages/db/.env corrigé avec valeurs par défaut"
            fi
        else
            cat > packages/db/.env << 'EOF'
DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"
EOF
            log "✅ packages/db/.env corrigé avec valeurs par défaut"
        fi
    else
        log "✅ packages/db/.env existe et semble correct"
    fi
fi

# Générer le client Prisma
log "🗄️  Génération du client Prisma..."
bun run db:generate
log "✅ Client Prisma généré"

# Démarrer les services Docker
log "🐳 Démarrage des services Docker..."
docker-compose -f docker-compose.dev.yml up -d

log "⏳ Attente de la disponibilité des services..."
until docker-compose -f docker-compose.dev.yml exec -T db pg_isready -U calendraft > /dev/null 2>&1; do
    sleep 1
done

until docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping > /dev/null 2>&1; do
    sleep 1
done

log "✅ Services Docker prêts"

# Initialiser la base de données
log "🗄️  Initialisation du schéma de base de données..."
bun run db:push
log "✅ Base de données initialisée"

# Résumé
log "✅ Configuration terminée !"
echo ""
echo "Prochaines étapes:"
echo "  1. Examiner et mettre à jour les fichiers .env si nécessaire:"
echo "     - apps/server/.env"
echo "     - apps/web/.env"
echo "     - packages/db/.env (généré automatiquement depuis apps/server/.env)"
echo ""
echo "  2. Démarrer le développement:"
echo "     ./scripts/dev.sh"
echo ""
echo "  3. Ou démarrer manuellement:"
echo "     bun run dev"
echo ""

