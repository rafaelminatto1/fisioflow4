# 🚀 FisioFlow4 - Instruções de Deploy

## 🔑 1. Chaves Geradas (COPIADAS ACIMA)

As seguintes chaves foram geradas com segurança:

```bash
SECRET_KEY=N39I17G7fapmSkFzUtTOsecdiJJr1b81EQcJYTTBz24dhB0NU6emcQq_3GhapKdDO3PDwyGEEkA-7k6ZAw1UxQ
JWT_SECRET_KEY=-8kLcn65GTAZBwJ7IiDI7jgQw1YZmWsPu6tgYErqqc1g7WW4HwPX6l7PnMFOJGkWRuI6JJNzRXmKubJXuK-BMQ
ENCRYPTION_KEY=ZRBmmzKOfmBgtgLHMhPZ4ADpLqgZGUE53jQ3IzjQON0=
CSRF_SECRET_KEY=3b85d12b8700de892496686593d14e59b66573768790ac2cb62f90f5805602b3
INTERNAL_API_KEY=fisiflow_api_BxgEibj1oo30iIDCyZs7UPCYteU4-BN7i0uyIpTZXjc
```

## 🚂 2. Deploy Railway Backend

### Passo 1: Criar Projeto
1. Acesse: https://railway.app/dashboard
2. Clique **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório `fisioflow4`
5. **ROOT DIRECTORY**: `backend/`

### Passo 2: Configurar Environment Variables
No Railway Dashboard, vá em **Variables** e adicione:

```bash
# Database (Neon)
DATABASE_URL=postgresql://neondb_owner:npg_p7LXBZvaMF0f@ep-shiny-dawn-ae4085f3-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require

# Security Keys (GERADAS ACIMA)
SECRET_KEY=N39I17G7fapmSkFzUtTOsecdiJJr1b81EQcJYTTBz24dhB0NU6emcQq_3GhapKdDO3PDwyGEEkA-7k6ZAw1UxQ
JWT_SECRET_KEY=-8kLcn65GTAZBwJ7IiDI7jgQw1YZmWsPu6tgYErqqc1g7WW4HwPX6l7PnMFOJGkWRuI6JJNzRXmKubJXuK-BMQ
ENCRYPTION_KEY=ZRBmmzKOfmBgtgLHMhPZ4ADpLqgZGUE53jQ3IzjQON0=
CSRF_SECRET_KEY=3b85d12b8700de892496686593d14e59b66573768790ac2cb62f90f5805602b3
INTERNAL_API_KEY=fisiflow_api_BxgEibj1oo30iIDCyZs7UPCYteU4-BN7i0uyIpTZXjc

# App Configuration
NODE_ENV=production
FLASK_ENV=production
DEBUG=false
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# CORS (atualizar após frontend deploy)
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=2000
MAX_FILE_SIZE=10485760

# Email (CONFIGURE COM SEU EMAIL)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@fisioflow.com
```

### Passo 3: Verificar Deploy
Após o deploy, teste:
```bash
# Substitua pela URL do seu backend
curl https://fisioflow4-backend-production-XXXX.up.railway.app/health

# Esperado:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-08-11T..."
}
```

## 🌐 3. Deploy Railway Frontend

### Passo 1: Adicionar Serviço
1. No mesmo projeto Railway, clique **"+ New Service"**
2. Selecione **"GitHub Repo"** → mesmo repositório
3. **ROOT DIRECTORY**: `frontend/`

### Passo 2: Environment Variables Frontend
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://sua-backend-url.up.railway.app
NEXT_TELEMETRY_DISABLED=1
```

### Passo 3: Atualizar CORS no Backend
Após frontend deploy, volte no backend e atualize:
```bash
CORS_ORIGINS=https://sua-frontend-url.up.railway.app
```

## 📱 4. Status de Deploy

### ✅ Preparação Concluída:
- [x] Chaves de segurança geradas
- [x] Configurações de ambiente preparadas
- [x] Railway CLI instalado
- [x] Arquivos de configuração prontos

### 🔄 Próximos Passos (MANUAL):
1. **Login Railway**: Abra https://railway.app e faça login
2. **Deploy Backend**: Siga Passo 2 acima
3. **Deploy Frontend**: Siga Passo 3 acima
4. **Teste Integração**: Verificar API + Frontend
5. **Configurar Domínio**: (Opcional)

## 🔍 5. Troubleshooting

### Build Failures
- Verificar logs no Railway Dashboard
- Conferir se ROOT DIRECTORY está correto
- Validar se todas environment variables estão definidas

### Database Connection
- Verificar se DATABASE_URL está correta
- Testar conexão direta com Neon Dashboard
- Conferir se migrations rodaram (logs do deploy)

### CORS Issues
- Confirmar CORS_ORIGINS no backend
- Verificar se frontend está usando HTTPS
- Testar calls da API no Network tab

## 📞 6. Monitoramento

Após deploy bem-sucedido:

1. **Railway Metrics**: CPU, Memory, Response Times
2. **Neon Dashboard**: Database connections, query performance
3. **Health Checks**: /health endpoint
4. **Error Logs**: Railway logs tab

## 🎯 7. URLs de Deploy

Após completar o deploy, você terá:
- **Backend**: https://fisioflow4-backend-production-XXXX.up.railway.app
- **Frontend**: https://fisioflow4-frontend-production-YYYY.up.railway.app
- **Database**: Neon (já configurado)

## 🔐 8. Segurança Pós-Deploy

1. **Rotear chaves**: Trocar SECRET_KEY e JWT_SECRET_KEY periodicamente
2. **HTTPS Only**: Railway faz automaticamente
3. **Domain Setup**: Configurar domínio personalizado
4. **Backup**: Neon faz backup automático
5. **Monitoring**: Configurar alertas

---

**IMPORTANTE**: Guarde estas chaves em local seguro e NUNCA as commite no Git!

**Status**: ⚡ Pronto para deploy manual no Railway
**Tempo Estimado**: 15-30 minutos
**Dificuldade**: Intermediário