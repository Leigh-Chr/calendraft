#!/bin/bash
# Script de sauvegarde pour Calendraft
# Usage: ./backup.sh [--list] [--restore=FILE]

set -euo pipefail  # Arrêter en cas d'erreur, variable non définie, ou erreur dans un pipe

# Configuration
# Utiliser le répertoire courant si docker-compose.yml est présent, sinon utiliser la variable d'environnement
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${PROJECT_DIR:-~/calendraft}"
fi
BACKUP_DIR="${BACKUP_DIR:-~/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Créer le répertoire de sauvegarde
mkdir -p "$BACKUP_DIR"

# Fonctions
backup_database() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/db-backup-$timestamp.sql"
    
    echo "💾 Sauvegarde de la base de données..."
    cd "$PROJECT_DIR" || exit 1
    
    if docker compose exec -T db pg_dump -U calendraft calendraft > "$backup_file"; then
        # Compresser la sauvegarde
        gzip "$backup_file"
        echo "✅ Sauvegarde créée: ${backup_file}.gz"
        
        # Nettoyer les anciennes sauvegardes
        find "$BACKUP_DIR" -name "db-backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete
        echo "🧹 Anciennes sauvegardes supprimées (> $RETENTION_DAYS jours)"
    else
        echo "❌ Échec de la sauvegarde"
        exit 1
    fi
}

restore_database() {
    local backup_file="$1"
    local non_interactive="${2:-false}"
    
    # Validation du chemin (sécurité)
    if [[ "$backup_file" != /* ]] && [[ "$backup_file" != ~* ]]; then
        # Chemin relatif - convertir en absolu
        backup_file="$(realpath "$backup_file" 2>/dev/null || echo "$backup_file")"
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo "❌ Fichier de sauvegarde non trouvé: $backup_file"
        return 1
    fi
    
    # Vérifier que le conteneur db est en cours d'exécution
    cd "$PROJECT_DIR" || return 1
    if ! docker compose ps db | grep -q "Up"; then
        echo "❌ Le conteneur de base de données n'est pas en cours d'exécution"
        return 1
    fi
    
    if [ "$non_interactive" != "true" ]; then
        echo "⚠️  ATTENTION: Cette opération va écraser la base de données actuelle !"
        read -p "Continuer ? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            echo "Opération annulée"
            return 0
        fi
    fi
    
    # Décompresser si nécessaire
    if [[ "$backup_file" == *.gz ]]; then
        echo "📦 Décompression de la sauvegarde..."
        if ! gunzip -c "$backup_file" | docker compose exec -T db psql -U calendraft calendraft; then
            echo "❌ Échec de la restauration"
            return 1
        fi
    else
        if ! docker compose exec -T db psql -U calendraft calendraft < "$backup_file"; then
            echo "❌ Échec de la restauration"
            return 1
        fi
    fi
    
    echo "✅ Base de données restaurée"
    return 0
}

list_backups() {
    echo "📋 Sauvegardes disponibles:"
    ls -lh "$BACKUP_DIR"/db-backup-*.sql.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'
}

# Main
if [ $# -eq 0 ]; then
    backup_database
elif [ "${1:-}" = "--list" ]; then
    list_backups
elif [[ "${1:-}" == --restore=* ]]; then
    restore_file="${1#*=}"
    if ! restore_database "$restore_file" "false"; then
        exit 1
    fi
else
    echo "Usage: $0 [--list] [--restore=FILE]"
    exit 1
fi

