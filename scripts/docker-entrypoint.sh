#!/bin/bash

# Docker entrypoint script for SecOps Dashboard
# Handles database initialization and application startup

set -e

echo "🚀 Starting SecOps Dashboard..."

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    until npx prisma db push --accept-data-loss > /dev/null 2>&1; do
        echo "Database not ready, retrying in 2 seconds..."
        sleep 2
    done
    echo "✅ Database connection established"
}

# Function to run migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    npx prisma migrate deploy || {
        echo "⚠️  Migration failed, attempting to reset and apply..."
        npx prisma migrate reset --force --skip-seed
        npx prisma migrate deploy
    }
    echo "✅ Migrations completed"
}

# Function to seed database (dev only)
seed_database() {
    echo "🌱 Seeding database with sample data..."
    npm run db:seed || {
        echo "⚠️  Seeding failed, but continuing..."
    }
    echo "✅ Database seeding completed"
}

# Main initialization
wait_for_db
run_migrations

# Only seed in development environment
if [ "$NODE_ENV" != "production" ]; then
    # Check if database is empty before seeding
    USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"User\";" | tail -1 | grep -o '[0-9]*' || echo "0")
    if [ "$USER_COUNT" = "0" ]; then
        echo "🔧 Development environment detected - seeding database"
        seed_database
    else
        echo "📊 Database already contains data, skipping seed"
    fi
else
    echo "🚀 Production environment - migrations only, no seeding"
fi

echo "🎯 Starting application..."
exec "$@"
