#!/bin/bash
# Script de génération de rapport d'état pour Calendraft
# Usage: ./report.sh [--format=text|json] [--output=FILE]

set -e

# Configuration
# Utiliser le répertoire courant si docker-compose.yml est présent, sinon utiliser la variable d'environnement
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${PROJECT_DIR:-$HOME/calendraft}"
fi

cd "$PROJECT_DIR" || exit 1

FORMAT="text"
OUTPUT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --format=*)
            FORMAT="${1#*=}"
            shift
            ;;
        --output=*)
            OUTPUT="${1#*=}"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Fonction pour obtenir la sortie
get_output() {
    if [ -n "$OUTPUT" ]; then
        echo "$1" >> "$OUTPUT"
    else
        echo "$1"
    fi
}

generate_text_report() {
    get_output "📊 Rapport d'État - Calendraft"
    get_output "Date: $(date)"
    get_output "=================================="
    get_output ""
    
    get_output "🐳 Services Docker:"
    if [ -n "$OUTPUT" ]; then
        docker compose ps >> "$OUTPUT" 2>&1
    else
        docker compose ps
    fi
    get_output ""
    
    get_output "💻 Ressources:"
    if [ -n "$OUTPUT" ]; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" >> "$OUTPUT" 2>&1
    else
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    fi
    get_output ""
    
    get_output "💾 Disque:"
    if [ -n "$OUTPUT" ]; then
        df -h / >> "$OUTPUT" 2>&1
    else
        df -h /
    fi
    get_output ""
    
    get_output "🧠 Mémoire:"
    if [ -n "$OUTPUT" ]; then
        free -h >> "$OUTPUT" 2>&1
    else
        free -h
    fi
    get_output ""
    
    get_output "🔍 Health Checks:"
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        get_output "✅ Backend: OK"
    else
        get_output "❌ Backend: FAILED"
    fi
    
    if curl -f -s http://localhost:3001/nginx-health > /dev/null 2>&1; then
        get_output "✅ Frontend: OK"
    else
        get_output "❌ Frontend: FAILED"
    fi
    get_output ""
    
    get_output "💾 Sauvegardes récentes:"
    BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_LIST=$(ls -lht "$BACKUP_DIR"/db-backup-*.sql.gz 2>/dev/null | head -5 | awk '{print $9, "(" $5 ")"}')
        if [ -n "$OUTPUT" ]; then
            echo "$BACKUP_LIST" >> "$OUTPUT" 2>&1
        else
            echo "$BACKUP_LIST"
        fi
    else
        get_output "Aucune sauvegarde trouvée"
    fi
    get_output ""
    
    get_output "🚨 Erreurs récentes (20 dernières):"
    ERRORS=$(docker compose logs --tail=100 2>&1 | grep -i "error\|fail\|exception" | tail -20)
    if [ -n "$OUTPUT" ]; then
        echo "$ERRORS" >> "$OUTPUT" 2>&1
    else
        echo "$ERRORS"
    fi
}

generate_json_report() {
    BACKEND_HEALTH=$(curl -f -s http://localhost:3000/health > /dev/null 2>&1 && echo "ok" || echo "failed")
    FRONTEND_HEALTH=$(curl -f -s http://localhost:3001/nginx-health > /dev/null 2>&1 && echo "ok" || echo "failed")
    
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
    BACKUP_COUNT=0
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_COUNT=$(find "$BACKUP_DIR" -name "db-backup-*.sql.gz" | wc -l)
    fi
    
    cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "services": {
    "backend": "$BACKEND_HEALTH",
    "frontend": "$FRONTEND_HEALTH"
  },
  "resources": {
    "disk_usage_percent": $DISK_USAGE,
    "memory_usage_percent": $MEM_USAGE
  },
  "backups": {
    "count": $BACKUP_COUNT
  },
  "docker": {
    "containers": $(docker compose ps --format json 2>/dev/null | (command -v jq > /dev/null 2>&1 && jq -s '.' || echo "[]") || echo "[]")
  }
}
EOF
}

# Main
if [ "$FORMAT" = "json" ]; then
    if [ -n "$OUTPUT" ]; then
        generate_json_report > "$OUTPUT"
    else
        generate_json_report
    fi
else
    generate_text_report
fi

