
# 📦 Pacote de Deploy – FisioFlow

Este documento contém todos os arquivos, configurações e passos necessários para você colocar o FisioFlow em produção usando **Docker**, **Railway** e **Neon DB**, mesmo que você nunca tenha usado essas ferramentas antes.

---
## 1) Backend – Dockerfile de produção
```dockerfile
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1     PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends     build-essential curl ca-certificates libpq-dev gcc  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt     && pip install --no-cache-dir gunicorn
COPY backend /app
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV PORT=8080
EXPOSE 8080
CMD ["/entrypoint.sh"]
```
---
## 2) Backend – entrypoint.sh
```bash
#!/usr/bin/env bash
set -e
echo "==> rodando migrações Alembic (se configurado)..."
alembic upgrade head || echo "Alembic não configurado agora - seguindo sem migrar."
echo "==> iniciando Gunicorn..."
exec gunicorn -k gthread -w ${WEB_CONCURRENCY:-3} -b 0.0.0.0:${PORT:-8080} "app:create_app()"
```
---
## 3) Frontend – Dockerfile.prod
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production     NEXT_TELEMETRY_DISABLED=1     PORT=3000
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
EXPOSE 3000
CMD ["node","node_modules/next/dist/bin/next","start","-p","3000"]
```
---
## 4) docker-compose.prod.yml
```yaml
version: "3.9"
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile.prod
    env_file: .env.prod
    environment:
      - PORT=8080
    ports:
      - "8080:8080"
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile.prod
    env_file: .env.prod
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080
      - PORT=3000
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```
---
## 5) Variáveis – .env.prod
```env
FLASK_ENV=production
SECRET_KEY=troque-por-uma-chave-bem-grande
JWT_SECRET=troque-por-outra-chave-bem-grande
DATABASE_URL=postgres://USER:PASSWORD@ep-XXXX-YYYY.aws.neon.tech/DBNAME?sslmode=require
CORS_ORIGINS=https://seu-front.up.railway.app,https://seu-dominio.com
NEXT_PUBLIC_API_URL=https://seu-backend.up.railway.app
```
---
## 6) GitHub Actions – CI
```yaml
name: CI (FisioFlow)
on:
  push:
    branches: [ "main" ]
jobs:
  build-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build backend
        run: docker build -f backend/Dockerfile.prod -t fisioflow-backend:ci .
  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build frontend
        run: docker build -f frontend/Dockerfile.prod -t fisioflow-frontend:ci .
```
---
## 7) Scripts úteis
```bash
# migrate.sh
#!/usr/bin/env bash
set -e
cd backend
alembic upgrade head
echo "Migrações aplicadas com sucesso."
```
---
## 8) Passos no Neon DB
1. Criar conta no **neon.tech**
2. Criar projeto
3. Copiar **connection string**
4. Colar no Railway e no `.env.prod` como `DATABASE_URL`
5. Rodar `bash scripts/migrate.sh` para aplicar migrações
---
## 9) Passos no Railway
1. Criar projeto → Deploy from GitHub
2. Configurar serviço backend com Dockerfile.prod do backend
3. Adicionar variáveis
4. Repetir para o frontend
5. Pegar URL pública e usar no NEXT_PUBLIC_API_URL
```
