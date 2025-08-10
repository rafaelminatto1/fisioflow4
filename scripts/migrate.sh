#!/usr/bin/env bash
set -e
# roda migrações no backend usando a DATABASE_URL do ambiente
cd backend
alembic upgrade head
echo "Migrações aplicadas com sucesso."