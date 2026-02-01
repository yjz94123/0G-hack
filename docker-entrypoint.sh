#!/bin/sh

echo "Checking database schema..."
# Skip migration if tables already exist (created locally)
# Supabase Session pooler (port 6543) doesn't support DDL operations
# Tables should be created using Direct Connection locally via: npx prisma db push
echo "Note: Database tables should be created locally using Direct Connection"
echo "Skipping prisma db push to avoid timeout on Session pooler"

echo "Starting application..."
cd /app && node backend/dist/index.js
