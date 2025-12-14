#!/bin/bash
# Script to initialize the database in Docker (Production)
# Note: For development, use ./scripts/dev/dev-db.sh push instead
#
# Usage: ./scripts/docker-init-db.sh

set -e

echo "🚀 Initializing Calendraft database..."

# Check that PostgreSQL is started
if ! docker compose ps db | grep -q "Up"; then
    echo "❌ PostgreSQL is not started. First run: docker compose up -d db"
    exit 1
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose exec -T db pg_isready -U ${POSTGRES_USER:-calendraft} > /dev/null 2>&1; do
    sleep 1
done

echo "✅ PostgreSQL is ready"

# Run db:push in the server container
echo "📦 Initializing schema..."
docker compose run --rm server bun run db:push

echo "✅ Database initialized successfully!"
