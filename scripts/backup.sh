#!/usr/bin/env bash
set -e
# Faz backup simples do Neon DB usando pg_dump. Requer pg_dump instalado localmente.
# Uso: DATABASE_URL=postgres://... ./scripts/backup.sh
# Em Railway, você pode rodar manualmente como "Deploy Command" e baixar o arquivo dos logs/artifacts.

if [ -z "$DATABASE_URL" ]; then
  echo "Defina DATABASE_URL no ambiente."
  exit 1
fi

STAMP=$(date +"%Y%m%d_%H%M%S")
OUT="backup_${STAMP}.sql"

echo "Gerando backup em ${OUT}..."
pg_dump "$DATABASE_URL" > "$OUT"
echo "Feito: $OUT"