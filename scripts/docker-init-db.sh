#!/bin/bash
# Script pour initialiser la base de données dans Docker

set -e

echo "🚀 Initialisation de la base de données Calendraft..."

# Vérifier que PostgreSQL est démarré
if ! docker-compose ps db | grep -q "Up"; then
    echo "❌ PostgreSQL n'est pas démarré. Lancez d'abord: docker-compose up -d db"
    exit 1
fi

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente que PostgreSQL soit prêt..."
until docker-compose exec -T db pg_isready -U ${POSTGRES_USER:-calendraft} > /dev/null 2>&1; do
    sleep 1
done

echo "✅ PostgreSQL est prêt"

# Exécuter db:push dans le conteneur server
echo "📦 Initialisation du schéma..."
docker-compose run --rm server bun run db:push

echo "✅ Base de données initialisée avec succès!"










