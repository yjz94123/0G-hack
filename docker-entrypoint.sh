#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/backend && npx prisma db push --accept-data-loss --skip-generate

echo "Starting application..."
cd /app && node backend/dist/index.js
