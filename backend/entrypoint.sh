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

echo "==> Starting Gunicorn server..."
echo "Port: ${PORT:-8080}"
echo "Workers: ${WEB_CONCURRENCY:-3}"

# Start Gunicorn with proper configuration for Railway
exec gunicorn \
    --bind 0.0.0.0:${PORT:-8080} \
    --workers ${WEB_CONCURRENCY:-3} \
    --worker-class gthread \
    --threads 2 \
    --timeout 120 \
    --keepalive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --preload \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    "app:create_app()"