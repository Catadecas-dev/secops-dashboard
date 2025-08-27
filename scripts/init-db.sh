#!/bin/bash

# Database initialization script for SecOps Dashboard
# This script ensures proper Prisma migration and seeding

set -e

echo "🚀 Starting database initialization..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until npx prisma db push --accept-data-loss > /dev/null 2>&1; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "✅ Database connection established"

# Reset and apply migrations
echo "🔄 Resetting database and applying migrations..."
npx prisma migrate reset --force --skip-seed

echo "🌱 Running database seed..."
npm run db:seed

echo "✅ Database initialization completed successfully!"
