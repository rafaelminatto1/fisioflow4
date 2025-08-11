#!/usr/bin/env bash
set -e

echo "==> Starting FisioFlow Backend..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$NEON_DATABASE_URL" ]; then
    echo "ERROR: Neither DATABASE_URL nor NEON_DATABASE_URL is set!"
    exit 1
fi

# Set DATABASE_URL from NEON_DATABASE_URL if needed
if [ -z "$DATABASE_URL" ] && [ -n "$NEON_DATABASE_URL" ]; then
    export DATABASE_URL="$NEON_DATABASE_URL"
fi

echo "==> Running database migrations..."
# Run Alembic migrations directly
if command -v alembic >/dev/null 2>&1; then
    echo "Running: alembic upgrade head"
    alembic upgrade head || {
        echo "WARNING: Migration failed, continuing anyway..."
    }
else
    echo "WARNING: Alembic not found, skipping migrations"
fi

echo "==> Debug Info..."
echo "PORT: ${PORT}"
echo "DATABASE_URL: ${DATABASE_URL}"
echo "PWD: $(pwd)"
echo "Files: $(ls -la)"

echo "==> Testing simple Flask app..."
python test_simple.py