#!/bin/bash
# Script de diagnostic pour l'authentification Calendraft

echo "🔍 Diagnostic du système d'authentification Calendraft"
echo "=================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour vérifier
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC} $1"
        return 0
    else
        echo -e "${RED}❌${NC} $1"
        return 1
    fi
}

warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# 1. Vérifier les fichiers .env
echo "1. Vérification des fichiers .env"
echo "-----------------------------------"
if [ -f "apps/server/.env" ]; then
    check "apps/server/.env existe"
else
    warn "apps/server/.env manquant - Créez-le avec les variables requises"
fi

if [ -f "apps/web/.env" ]; then
    check "apps/web/.env existe"
else
    warn "apps/web/.env manquant - Créez-le avec VITE_SERVER_URL"
fi
echo ""

# 2. Vérifier les variables d'environnement backend
echo "2. Vérification des variables backend (apps/server/.env)"
echo "--------------------------------------------------------"
if [ -f "apps/server/.env" ]; then
    if grep -q "^DATABASE_URL=" apps/server/.env; then
        check "DATABASE_URL défini"
        DB_URL=$(grep "^DATABASE_URL=" apps/server/.env | cut -d'=' -f2-)
        if [[ "$DB_URL" == *"localhost"* ]] || [[ "$DB_URL" == *"127.0.0.1"* ]]; then
            warn "DATABASE_URL pointe vers localhost - vérifiez que PostgreSQL est démarré"
        fi
    else
        warn "DATABASE_URL non défini"
    fi
    
    if grep -q "^BETTER_AUTH_SECRET=" apps/server/.env; then
        SECRET=$(grep "^BETTER_AUTH_SECRET=" apps/server/.env | cut -d'=' -f2-)
        if [ ${#SECRET} -ge 32 ]; then
            check "BETTER_AUTH_SECRET défini (${#SECRET} caractères)"
        else
            warn "BETTER_AUTH_SECRET trop court (${#SECRET} caractères, minimum 32 requis)"
        fi
    else
        warn "BETTER_AUTH_SECRET non défini"
    fi
    
    if grep -q "^CORS_ORIGIN=" apps/server/.env; then
        check "CORS_ORIGIN défini"
        CORS=$(grep "^CORS_ORIGIN=" apps/server/.env | cut -d'=' -f2-)
        echo "   Valeur: $CORS"
    else
        warn "CORS_ORIGIN non défini (utilisera http://localhost:3001 par défaut)"
    fi
    
    if grep -q "^BETTER_AUTH_URL=" apps/server/.env; then
        check "BETTER_AUTH_URL défini"
    else
        warn "BETTER_AUTH_URL non défini (optionnel mais recommandé)"
    fi
else
    warn "Impossible de vérifier - apps/server/.env n'existe pas"
fi
echo ""

# 3. Vérifier les variables d'environnement frontend
echo "3. Vérification des variables frontend (apps/web/.env)"
echo "-----------------------------------------------------"
if [ -f "apps/web/.env" ]; then
    if grep -q "^VITE_SERVER_URL=" apps/web/.env; then
        check "VITE_SERVER_URL défini"
        SERVER_URL=$(grep "^VITE_SERVER_URL=" apps/web/.env | cut -d'=' -f2-)
        echo "   Valeur: $SERVER_URL"
    else
        warn "VITE_SERVER_URL non défini (utilisera http://localhost:3000 par défaut)"
    fi
else
    warn "Impossible de vérifier - apps/web/.env n'existe pas"
fi
echo ""

# 4. Vérifier que le serveur répond
echo "4. Vérification du serveur backend"
echo "----------------------------------"
if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
    check "Serveur backend accessible sur http://localhost:3000"
    HEALTH=$(curl -s http://localhost:3000/health)
    echo "   Réponse: $HEALTH"
else
    warn "Serveur backend non accessible sur http://localhost:3000"
    echo "   Vérifiez que le serveur est démarré: bun run dev:server"
fi
echo ""

# 5. Vérifier les endpoints Better-Auth
echo "5. Vérification des endpoints Better-Auth"
echo "------------------------------------------"
if curl -s -f http://localhost:3000/api/auth/get-session > /dev/null 2>&1; then
    check "Endpoint /api/auth/get-session accessible"
    SESSION=$(curl -s http://localhost:3000/api/auth/get-session)
    echo "   Réponse: $SESSION"
else
    warn "Endpoint /api/auth/get-session non accessible"
    echo "   Vérifiez que le serveur est démarré et que la route est configurée"
fi
echo ""

# 6. Vérifier la base de données
echo "6. Vérification de la base de données"
echo "--------------------------------------"
if command -v psql &> /dev/null && [ -f "apps/server/.env" ]; then
    DB_URL=$(grep "^DATABASE_URL=" apps/server/.env | cut -d'=' -f2-)
    if [ -n "$DB_URL" ]; then
        # Extraire les informations de connexion (simplifié)
        if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            check "Connexion à la base de données réussie"
            
            # Vérifier les tables Better-Auth
            TABLES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user', 'session', 'account', 'verification');" 2>/dev/null | tr -d ' ')
            if [ "$TABLES" = "4" ]; then
                check "Tables Better-Auth présentes (user, session, account, verification)"
            else
                warn "Tables Better-Auth manquantes ou incomplètes (trouvé: $TABLES/4)"
                echo "   Exécutez: bun run db:push"
            fi
        else
            warn "Impossible de se connecter à la base de données"
            echo "   Vérifiez DATABASE_URL et que PostgreSQL est démarré"
        fi
    else
        warn "DATABASE_URL non défini"
    fi
else
    warn "psql non disponible ou DATABASE_URL non trouvé - impossible de vérifier la base de données"
    echo "   Vérifiez manuellement que PostgreSQL est démarré et accessible"
fi
echo ""

# 7. Résumé et recommandations
echo "=================================================="
echo "📋 Résumé et recommandations"
echo "=================================================="
echo ""
echo "Si vous rencontrez des problèmes de connexion/inscription:"
echo ""
echo "1. Vérifiez que toutes les variables d'environnement sont définies"
echo "2. Vérifiez que le serveur backend est démarré: bun run dev:server"
echo "3. Vérifiez que la base de données est accessible et initialisée: bun run db:push"
echo "4. Vérifiez la console du navigateur pour les erreurs CORS ou réseau"
echo "5. Vérifiez les logs du serveur pour les erreurs d'authentification"
echo ""
echo "Pour plus d'informations, consultez: AUTHENTICATION.md"

