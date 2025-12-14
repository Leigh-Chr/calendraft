#!/bin/bash
# Script d'audit de sécurité pour Calendraft
# Usage: ./security-audit.sh [--verbose]

set -e

# Configuration
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
WARNINGS=0

check() {
    local name="$1"
    local command="$2"
    local severity="${3:-error}"  # error ou warning
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $name"
        ((PASSED++))
        return 0
    else
        if [ "$severity" = "warning" ]; then
            echo -e "${YELLOW}⚠️${NC}  $name"
            ((WARNINGS++))
        else
            echo -e "${RED}❌${NC} $name"
            ((FAILED++))
        fi
        if [ "$VERBOSE" = true ]; then
            echo "   Commande: $command"
        fi
        return 1
    fi
}

echo "🔒 Audit de Sécurité - Calendraft"
echo "=================================="
echo ""

# Vérifications HTTPS
echo "🔐 HTTPS et Certificats:"
if [ -f "/etc/nginx/sites-available/calendraft" ]; then
    check "Certificat SSL valide" "curl -f -s https://calendraft.app > /dev/null"
    check "HSTS header présent" "curl -sI https://calendraft.app | grep -q 'Strict-Transport-Security'"
    check "Pas de redirection HTTP vers HTTPS manquante" "curl -sI http://calendraft.app | grep -q '301\|302'"
    
    # Vérifier la date d'expiration du certificat
    if command -v openssl > /dev/null 2>&1; then
        EXPIRY=$(echo | openssl s_client -servername calendraft.app -connect calendraft.app:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$EXPIRY" ]; then
            # Détecter le système (GNU vs BSD)
            if date -d "now" > /dev/null 2>&1; then
                # GNU date (Linux)
                EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null)
            elif date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" > /dev/null 2>&1; then
                # BSD date (macOS)
                EXPIRY_EPOCH=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" +%s 2>/dev/null)
            else
                EXPIRY_EPOCH=""
            fi
            
            if [ -n "$EXPIRY_EPOCH" ]; then
                NOW_EPOCH=$(date +%s)
                DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
                if [ $DAYS_LEFT -gt 30 ]; then
                    echo -e "${GREEN}✅${NC} Certificat valide (expire dans $DAYS_LEFT jours)"
                    ((PASSED++))
                elif [ $DAYS_LEFT -gt 0 ]; then
                    echo -e "${YELLOW}⚠️${NC}  Certificat expire bientôt (dans $DAYS_LEFT jours)"
                    ((WARNINGS++))
                else
                    echo -e "${RED}❌${NC} Certificat expiré"
                    ((FAILED++))
                fi
            fi
        fi
    else
        echo -e "${YELLOW}⚠️${NC}  OpenSSL non disponible, vérification de l'expiration ignorée"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Configuration Nginx non trouvée, vérifications HTTPS ignorées"
    ((WARNINGS++))
fi
echo ""

# Vérifications des Headers de Sécurité
echo "🛡️  Headers de Sécurité:"
if curl -sI https://calendraft.app > /dev/null 2>&1; then
    check "X-Frame-Options présent" "curl -sI https://calendraft.app | grep -q 'X-Frame-Options'"
    check "X-Content-Type-Options présent" "curl -sI https://calendraft.app | grep -q 'X-Content-Type-Options'"
    check "X-XSS-Protection présent" "curl -sI https://calendraft.app | grep -q 'X-XSS-Protection'"
    check "Content-Security-Policy présent" "curl -sI https://calendraft.app | grep -q 'Content-Security-Policy'"
    check "Permissions-Policy présent" "curl -sI https://calendraft.app | grep -q 'Permissions-Policy'"
    check "Referrer-Policy présent" "curl -sI https://calendraft.app | grep -q 'Referrer-Policy'"
else
    echo -e "${YELLOW}⚠️${NC}  Impossible de vérifier les headers (HTTPS non accessible)"
    ((WARNINGS++))
fi
echo ""

# Vérifications des Variables d'Environnement
echo "🔑 Variables d'Environnement:"
if [ -f ".env" ]; then
    # Vérifier que les mots de passe ne sont pas les valeurs par défaut
    if grep -q "POSTGRES_PASSWORD=calendraft_secret" .env 2>/dev/null; then
        echo -e "${RED}❌${NC} POSTGRES_PASSWORD utilise la valeur par défaut"
        ((FAILED++))
    else
        echo -e "${GREEN}✅${NC} POSTGRES_PASSWORD configuré"
        ((PASSED++))
    fi
    
    if grep -q "BETTER_AUTH_SECRET=change-me" .env 2>/dev/null; then
        echo -e "${RED}❌${NC} BETTER_AUTH_SECRET utilise la valeur par défaut"
        ((FAILED++))
    else
        echo -e "${GREEN}✅${NC} BETTER_AUTH_SECRET configuré"
        ((PASSED++))
    fi
    
    # Vérifier que CORS_ORIGIN ne contient pas de wildcard ou localhost en production
    if grep -q "CORS_ORIGIN=.*\*" .env 2>/dev/null; then
        echo -e "${RED}❌${NC} CORS_ORIGIN contient un wildcard (*)"
        ((FAILED++))
    elif grep -q "CORS_ORIGIN=.*localhost" .env 2>/dev/null && [ "${NODE_ENV:-production}" = "production" ]; then
        echo -e "${YELLOW}⚠️${NC}  CORS_ORIGIN contient localhost en production"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅${NC} CORS_ORIGIN correctement configuré"
        ((PASSED++))
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Fichier .env non trouvé"
    ((WARNINGS++))
fi
echo ""

# Vérifications Docker
echo "🐳 Sécurité Docker:"
check "Conteneurs en mode non-root" "docker compose ps | grep -q 'calendraft' && ! docker compose exec server id | grep -q 'uid=0'"
check "Aucun conteneur avec privilèges" "! docker compose ps | grep -q 'privileged'"
echo ""

# Vérifications des Ports
echo "🌐 Exposition des Ports:"
# Vérifier que seuls les ports nécessaires sont exposés
EXPOSED_PORTS=$(docker compose ps --format json 2>/dev/null | grep -o '"PublishedPort":"[^"]*"' | cut -d'"' -f4 | sort -u)
if echo "$EXPOSED_PORTS" | grep -qE '^(3000|3001|5432|6379)$'; then
    echo -e "${GREEN}✅${NC} Ports exposés corrects"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️${NC}  Ports exposés: $EXPOSED_PORTS"
    ((WARNINGS++))
fi
echo ""

# Vérifications des Secrets
echo "🔐 Secrets et Mots de Passe:"
# Vérifier qu'aucun secret n'est dans les logs
if docker compose logs 2>/dev/null | grep -qiE '(password|secret|key).*=.*[a-zA-Z0-9]{10,}'; then
    echo -e "${RED}❌${NC} Secrets potentiels trouvés dans les logs"
    ((FAILED++))
else
    echo -e "${GREEN}✅${NC} Aucun secret détecté dans les logs"
    ((PASSED++))
fi
echo ""

# Résumé
echo "=================================="
echo "Résumé:"
echo "  ${GREEN}$PASSED${NC} vérifications réussies"
echo "  ${YELLOW}$WARNINGS${NC} avertissements"
echo "  ${RED}$FAILED${NC} échecs"
echo ""

if [ $FAILED -gt 0 ]; then
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    exit 0
else
    exit 0
fi

