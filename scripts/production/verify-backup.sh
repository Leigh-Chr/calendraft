#!/bin/bash
# Script de vérification d'intégrité des sauvegardes
# Usage: ./verify-backup.sh [FILE]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-~/backups}"
PROJECT_DIR="${PROJECT_DIR:-~/calendraft}"

# Utiliser le répertoire courant si docker-compose.yml est présent
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
fi

cd "$PROJECT_DIR" || exit 1

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌${NC} Fichier non trouvé: $backup_file"
        return 1
    fi
    
    echo "🔍 Vérification de: $backup_file"
    echo "=================================="
    
    # Vérifier que le fichier n'est pas vide
    if [ ! -s "$backup_file" ]; then
        echo -e "${RED}❌${NC} Fichier vide"
        return 1
    fi
    
    # Vérifier la compression si .gz
    if [[ "$backup_file" == *.gz ]]; then
        echo "📦 Vérification de la compression..."
        if ! gzip -t "$backup_file" 2>/dev/null; then
            echo -e "${RED}❌${NC} Fichier compressé corrompu"
            return 1
        fi
        echo -e "${GREEN}✅${NC} Compression valide"
        
        # Vérifier le contenu SQL
        echo "📄 Vérification du contenu SQL..."
        if ! gunzip -c "$backup_file" | head -20 | grep -q "PostgreSQL\|COPY\|CREATE"; then
            echo -e "${YELLOW}⚠️${NC}  Le contenu ne semble pas être un dump PostgreSQL valide"
        else
            echo -e "${GREEN}✅${NC} Contenu SQL valide"
        fi
        
        # Taille
        SIZE=$(du -h "$backup_file" | cut -f1)
        echo "📊 Taille: $SIZE"
    else
        # Fichier non compressé
        echo "📄 Vérification du contenu SQL..."
        if ! head -20 "$backup_file" | grep -q "PostgreSQL\|COPY\|CREATE"; then
            echo -e "${YELLOW}⚠️${NC}  Le contenu ne semble pas être un dump PostgreSQL valide"
        else
            echo -e "${GREEN}✅${NC} Contenu SQL valide"
        fi
        
        SIZE=$(du -h "$backup_file" | cut -f1)
        echo "📊 Taille: $SIZE"
    fi
    
    # Vérifier la date de création
    if [ -f "$backup_file" ]; then
        DATE=$(stat -c %y "$backup_file" 2>/dev/null || stat -f "%Sm" "$backup_file" 2>/dev/null)
        echo "📅 Date: $DATE"
    fi
    
    echo ""
    echo -e "${GREEN}✅${NC} Vérification terminée"
    return 0
}

# Main
if [ $# -gt 0 ] && [ -n "${1:-}" ]; then
    # Vérifier un fichier spécifique
    # Validation de sécurité : s'assurer que le fichier est dans BACKUP_DIR ou chemin absolu valide
    backup_file="${1:-}"
    if [[ "$backup_file" != /* ]] && [[ "$backup_file" != ~* ]]; then
        # Chemin relatif - convertir en absolu
        backup_file="$(realpath "$backup_file" 2>/dev/null || echo "$backup_file")"
    fi
    
    # Vérifier que le fichier est dans BACKUP_DIR (sécurité)
    if [[ "$backup_file" != "$BACKUP_DIR"/* ]] && [[ "$backup_file" != "$(realpath "$BACKUP_DIR" 2>/dev/null)"/* ]]; then
        echo -e "${YELLOW}⚠️${NC}  Le fichier n'est pas dans BACKUP_DIR ($BACKUP_DIR)"
        echo -e "${YELLOW}⚠️${NC}  Vérification quand même..."
    fi
    
    verify_backup "$backup_file"
else
    # Vérifier toutes les sauvegardes
    echo "🔍 Vérification de toutes les sauvegardes..."
    echo "=========================================="
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}❌${NC} Répertoire de sauvegarde non trouvé: $BACKUP_DIR"
        exit 1
    fi
    
    BACKUPS=$(find "$BACKUP_DIR" -name "db-backup-*.sql.gz" -o -name "db-backup-*.sql" | sort -r)
    
    if [ -z "$BACKUPS" ]; then
        echo "Aucune sauvegarde trouvée dans $BACKUP_DIR"
        exit 0
    fi
    
    COUNT=0
    VALID=0
    INVALID=0
    
    while IFS= read -r backup; do
        ((COUNT++))
        echo "[$COUNT] $(basename "$backup")"
        if verify_backup "$backup"; then
            ((VALID++))
        else
            ((INVALID++))
        fi
        echo ""
    done <<< "$BACKUPS"
    
    echo "=========================================="
    echo "Résumé: $VALID valides, $INVALID invalides sur $COUNT sauvegardes"
fi

