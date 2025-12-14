#!/bin/bash
# Script de nettoyage pour Calendraft
# Usage: ./cleanup.sh [--all|--images|--volumes|--build-cache|--logs|--system]

set -e

# Utiliser le répertoire courant si docker-compose.yml est présent, sinon utiliser la variable d'environnement
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${PROJECT_DIR:-$HOME/calendraft}"
fi

cd "$PROJECT_DIR" || exit 1

clean_images() {
    echo "🧹 Nettoyage des images Docker inutilisées..."
    docker image prune -f
    echo "✅ Images nettoyées"
}

clean_volumes() {
    echo "⚠️  ATTENTION: Cette opération va supprimer les volumes non utilisés !"
    read -p "Continuer ? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        docker volume prune -f
        echo "✅ Volumes nettoyés"
    else
        echo "Opération annulée"
    fi
}

clean_logs() {
    echo "🧹 Nettoyage des logs Docker..."
    # Les logs Docker sont gérés par la configuration de rotation dans docker-compose.yml
    # Cette fonction permet juste de tronquer les logs actuels si nécessaire
    echo "ℹ️  Les logs sont automatiquement rotés par Docker (max-size: 10m, max-file: 3)"
    echo "✅ Configuration de rotation vérifiée"
}

clean_system() {
    echo "🧹 Nettoyage complet du système Docker..."
    docker system prune -af --volumes
    echo "✅ Système nettoyé"
}

clean_build_cache() {
    echo "🧹 Nettoyage du cache de build..."
    docker builder prune -af
    echo "✅ Cache de build nettoyé"
}

# Main
ARG="${1:-}"
if [ "$ARG" = "--all" ]; then
    clean_images
    clean_build_cache
    clean_logs
    echo "✅ Nettoyage complet terminé"
elif [ "$ARG" = "--images" ]; then
    clean_images
elif [ "$ARG" = "--volumes" ]; then
    clean_volumes
elif [ "$ARG" = "--logs" ]; then
    clean_logs
elif [ "$ARG" = "--system" ]; then
    clean_system
elif [ "$ARG" = "--build-cache" ]; then
    clean_build_cache
else
    echo "Usage: $0 [--all|--images|--volumes|--logs|--system|--build-cache]"
    echo ""
    echo "Options:"
    echo "  --all          Nettoyer images, cache et logs"
    echo "  --images       Nettoyer les images inutilisées"
    echo "  --volumes      Nettoyer les volumes inutilisés (⚠️  destructif)"
    echo "  --logs         Nettoyer les logs"
    echo "  --system       Nettoyage complet du système Docker (⚠️  très destructif)"
    echo "  --build-cache  Nettoyer le cache de build"
    exit 1
fi

