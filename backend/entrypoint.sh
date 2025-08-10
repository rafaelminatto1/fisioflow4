#!/usr/bin/env bash
set -e

echo "==> rodando migrações Alembic (se configurado)..."
# tenta migrar; se não houver alembic, segue
alembic upgrade head || echo "Alembic não configurado agora - seguindo sem migrar."

echo "==> iniciando Gunicorn..."
# WEB_CONCURRENCY opcional no Railway; default 3
exec gunicorn -k gthread -w ${WEB_CONCURRENCY:-3} -b 0.0.0.0:${PORT:-8080} "app:create_app()"