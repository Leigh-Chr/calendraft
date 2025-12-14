#!/bin/bash
# Script de monitoring pour Calendraft
# Usage: ./monitor.sh [--all|--health|--stats|--logs|--errors]

set -e

# Utiliser le répertoire courant si docker-compose.yml est présent, sinon utiliser la variable d'environnement
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${PROJECT_DIR:-$HOME/calendraft}"
fi

cd "$PROJECT_DIR" || exit 1

show_health() {
    echo "🏥 État de santé des services:"
    echo "================================"
    docker compose ps
    echo ""
    
    echo "🔍 Health checks:"
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend: OK"
    else
        echo "❌ Backend: FAILED"
    fi
    
    if curl -f -s http://localhost:3001/nginx-health > /dev/null 2>&1; then
        echo "✅ Frontend: OK"
    else
        echo "❌ Frontend: FAILED"
    fi
    echo ""
}

show_stats() {
    echo "📊 Utilisation des ressources:"
    echo "=============================="
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
    
    echo "💾 Utilisation du disque:"
    df -h | grep -E "Filesystem|/dev/"
    echo ""
    
    echo "🧠 Utilisation de la mémoire:"
    free -h
    echo ""
}

show_logs() {
    echo "📋 Dernières lignes des logs (50 lignes par service):"
    echo "====================================================="
    
    echo "🔵 Backend:"
    docker compose logs --tail=50 server
    echo ""
    
    echo "🟢 Frontend:"
    docker compose logs --tail=50 web
    echo ""
    
    echo "🟡 Database:"
    docker compose logs --tail=50 db
    echo ""
    
    echo "🔴 Redis:"
    docker compose logs --tail=50 redis
    echo ""
}

show_errors() {
    echo "🚨 Erreurs récentes:"
    echo "===================="
    docker compose logs --tail=100 | grep -i "error\|fail\|exception" | tail -20
    echo ""
}

# Main
ARG="${1:-}"
if [ "$ARG" = "--all" ] || [ $# -eq 0 ]; then
    show_health
    show_stats
    show_errors
elif [ "$ARG" = "--health" ]; then
    show_health
elif [ "$ARG" = "--stats" ]; then
    show_stats
elif [ "$ARG" = "--logs" ]; then
    show_logs
elif [ "$ARG" = "--errors" ]; then
    show_errors
else
    echo "Usage: $0 [--health|--stats|--logs|--errors|--all]"
    exit 1
fi

