#!/bin/bash
# Script d'installation des scripts de production sur le serveur
# Usage: ./install.sh [user@server]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -z "$1" ]; then
    echo "Usage: $0 user@server"
    echo "Exemple: $0 root@185.158.132.190"
    exit 1
fi

SERVER="$1"
REMOTE_DIR="~/calendraft/scripts/production"

echo "📦 Installation des scripts de production sur $SERVER..."
echo ""

# Créer le répertoire distant
ssh "$SERVER" "mkdir -p $REMOTE_DIR"

# Copier tous les scripts
echo "📋 Copie des scripts..."
scp "$SCRIPT_DIR"/*.sh "$SERVER:$REMOTE_DIR/"

# Rendre les scripts exécutables
echo "🔧 Rendre les scripts exécutables..."
ssh "$SERVER" "chmod +x $REMOTE_DIR/*.sh"

# Copier le guide de commandes
echo "📚 Copie du guide de commandes..."
scp "$PROJECT_DIR/PRODUCTION_COMMANDS.md" "$SERVER:~/calendraft/"

echo ""
echo "✅ Installation terminée !"
echo ""
echo "Les scripts sont disponibles dans: $REMOTE_DIR"
echo "Le guide est disponible dans: ~/calendraft/PRODUCTION_COMMANDS.md"
echo ""
echo "Exemple d'utilisation:"
echo "  ssh $SERVER"
echo "  cd ~/calendraft"
echo "  ./scripts/production/deploy.sh"

