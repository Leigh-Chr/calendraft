#!/bin/bash
# Script de vérification de santé pour Calendraft
# Usage: ./health-check.sh [--verbose]

set -e

# Utiliser le répertoire courant si docker-compose.yml est présent, sinon utiliser la variable d'environnement
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${PROJECT_DIR:-$HOME/calendraft}"
fi

VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

cd "$PROJECT_DIR" || exit 1

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Compteurs
PASSED=0
FAILED=0

check() {
    local name="$1"
    local command="$2"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $name"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌${NC} $name"
        ((FAILED++))
        if [ "$VERBOSE" = true ]; then
            echo "   Commande: $command"
        fi
        return 1
    fi
}

echo "🏥 Vérification de santé - Calendraft"
echo "======================================"
echo ""

# Vérifications Docker
echo "🐳 Services Docker:"
check "Conteneurs en cours d'exécution" "docker compose ps | grep -q 'Up'"
check "Aucun conteneur unhealthy" "! docker compose ps | grep -q 'unhealthy'"

# Vérifications de santé
echo ""
echo "🔍 Health Checks:"
check "Backend health endpoint" "curl -f -s --max-time 5 http://localhost:3000/health"
check "Frontend health endpoint" "curl -f -s --max-time 5 http://localhost:3001/nginx-health"

# Vérifications de base de données
echo ""
echo "🗄️  Base de données:"
check "PostgreSQL accessible" "docker compose exec -T db pg_isready -U calendraft"
check "Connexion à la base" "docker compose exec -T db psql -U calendraft -d calendraft -c 'SELECT 1' > /dev/null"

# Vérifications réseau (via Docker)
echo ""
echo "🌐 Réseau:"
check "Port 3000 (backend) accessible" "docker compose ps | grep -q '3000->3000'"
check "Port 3001 (frontend) accessible" "docker compose ps | grep -q '3001->8080'"
check "Port 5432 (database) accessible" "docker compose ps | grep -q '5432->5432'"

# Vérifications HTTPS (si configuré)
if [ -f "/etc/nginx/sites-available/calendraft" ]; then
    echo ""
    echo "🔒 HTTPS:"
    check "Certificat SSL valide" "curl -f -s https://calendraft.app > /dev/null"
    check "HSTS header présent" "curl -sI https://calendraft.app | grep -q 'Strict-Transport-Security'"
fi

# Vérifications de ressources
echo ""
echo "💻 Ressources:"
if command -v df > /dev/null 2>&1; then
    DISK_USAGE=$(df -h / 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
    if [ -n "$DISK_USAGE" ] && [ "$DISK_USAGE" -gt 0 ] 2>/dev/null; then
        if [ "$DISK_USAGE" -lt 80 ]; then
            echo -e "${GREEN}✅${NC} Espace disque OK (${DISK_USAGE}% utilisé)"
            ((PASSED++))
        else
            echo -e "${YELLOW}⚠️${NC}  Espace disque élevé (${DISK_USAGE}% utilisé)"
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠️${NC}  Impossible de vérifier l'espace disque"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Commande 'df' non disponible"
    ((FAILED++))
fi

if command -v free > /dev/null 2>&1; then
    MEM_USAGE=$(free 2>/dev/null | awk 'NR==2{printf "%.0f", $3*100/$2}' || echo "0")
    if [ -n "$MEM_USAGE" ] && [ "$MEM_USAGE" -gt 0 ] 2>/dev/null; then
        if [ "$MEM_USAGE" -lt 90 ]; then
            echo -e "${GREEN}✅${NC} Mémoire OK (${MEM_USAGE}% utilisée)"
            ((PASSED++))
        else
            echo -e "${YELLOW}⚠️${NC}  Mémoire élevée (${MEM_USAGE}% utilisée)"
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠️${NC}  Impossible de vérifier la mémoire"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Commande 'free' non disponible"
    ((FAILED++))
fi

# Résumé
echo ""
echo "======================================"
echo "Résumé: ${GREEN}$PASSED${NC} réussis, ${RED}$FAILED${NC} échecs"

if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi

