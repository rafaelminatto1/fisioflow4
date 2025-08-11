# 🚀 FisioFlow4 - Deploy Railway PRONTO!

## ✅ STATUS: TUDO PREPARADO PARA DEPLOY

### 🔑 Chaves Geradas (Salve em local seguro!):
```
SECRET_KEY=N39I17G7fapmSkFzUtTOsecdiJJr1b81EQcJYTTBz24dhB0NU6emcQq_3GhapKdDO3PDwyGEEkA-7k6ZAw1UxQ
JWT_SECRET_KEY=-8kLcn65GTAZBwJ7IiDI7jgQw1YZmWsPu6tgYErqqc1g7WW4HwPX6l7PnMFOJGkWRuI6JJNzRXmKubJXuK-BMQ
ENCRYPTION_KEY=ZRBmmzKOfmBgtgLHMhPZ4ADpLqgZGUE53jQ3IzjQON0=
CSRF_SECRET_KEY=3b85d12b8700de892496686593d14e59b66573768790ac2cb62f90f5805602b3
INTERNAL_API_KEY=fisiflow_api_BxgEibj1oo30iIDCyZs7UPCYteU4-BN7i0uyIpTZXjc
```

---

## 🚂 PASSO 1: DEPLOY BACKEND

### 1.1 Acesse Railway
👉 **URL**: https://railway.app/dashboard
- Faça login com sua conta GitHub

### 1.2 Criar Projeto
1. Clique **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Escolha o repositório **`fisioflow4`**
4. Configure:
   - **Root Directory**: `backend/`
   - **Build Command**: (detectado automaticamente)
   - **Start Command**: (detectado automaticamente via Procfile)

### 1.3 Configurar Variables (CRÍTICO!)
No Railway Dashboard → Seu projeto → **Variables**, adicione:

```bash
# Database (Neon - JÁ CONFIGURADO)
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

# CORS (atualizar após frontend)
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

### 1.4 Aguardar Build
- Railway detectará automaticamente:
  - ✅ `requirements.txt` → Instalação Python
  - ✅ `Procfile` → Comando Gunicorn
  - ✅ `railway.toml` → Configurações
  - ✅ Migrations Alembic automáticas

### 1.5 Testar Backend
Após deploy, copie a URL do backend e teste:
```bash
# Substitua pela sua URL
curl https://fisioflow4-backend-production-XXXX.up.railway.app/health

# Resposta esperada:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-08-11T..."
}
```

---

## 🌐 PASSO 2: DEPLOY FRONTEND

### 2.1 Adicionar Serviço
No **mesmo projeto Railway**:
1. Clique **"+ New Service"**
2. Selecione **"GitHub Repo"** → mesmo repositório
3. Configure:
   - **Root Directory**: `frontend/`

### 2.2 Variables Frontend
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://SUA-BACKEND-URL.up.railway.app
NEXT_TELEMETRY_DISABLED=1
```

### 2.3 Atualizar CORS Backend
Após frontend deploy, **VOLTE NO BACKEND** e atualize:
```bash
CORS_ORIGINS=https://sua-frontend-url.up.railway.app
```

---

## 🔍 PASSO 3: VERIFICAÇÃO

### ✅ Checklist Backend:
- [ ] Build concluído sem erros
- [ ] Variables configuradas (27 variáveis)
- [ ] Health check respondendo `/health`
- [ ] Database conectado (Neon)
- [ ] Logs sem erros críticos

### ✅ Checklist Frontend:
- [ ] Build Next.js concluído
- [ ] `NEXT_PUBLIC_API_URL` configurado
- [ ] Site carregando corretamente
- [ ] API calls funcionando

### ✅ Checklist Integração:
- [ ] Frontend consegue chamar backend
- [ ] CORS configurado corretamente
- [ ] Login/Authentication funcionando
- [ ] HTTPS ativo (automático Railway)

---

## 📊 MONITORAMENTO

### Railway Dashboard
- **Metrics**: CPU, Memory, Network
- **Logs**: Real-time logs
- **Deployments**: Histórico
- **Analytics**: Request volume

### URLs Finais
Após deploy você terá:
- **Backend API**: `https://fisioflow4-backend-production-XXXX.up.railway.app`
- **Frontend App**: `https://fisioflow4-frontend-production-YYYY.up.railway.app`
- **Database**: Neon (já configurado)

---

## 🛠 TROUBLESHOOTING

### Build Falha:
1. Verificar **Logs** no Railway Dashboard
2. Conferir **ROOT DIRECTORY** correto
3. Validar **Environment Variables**

### Database Erro:
1. Testar `DATABASE_URL` no Neon Dashboard
2. Verificar conexões ativas
3. Checar logs de migration

### CORS Issues:
1. Confirmar `CORS_ORIGINS` no backend
2. Verificar URLs HTTPs vs HTTP
3. Testar chamadas no Network tab

---

## 🎯 PRÓXIMOS PASSOS PÓS-DEPLOY

1. **Configurar domínio personalizado** (opcional)
2. **Setup monitoring** (Sentry)
3. **Configure email provider** real
4. **Add AI API keys** (OpenAI, Anthropic)
5. **Security audit** completo
6. **Performance optimization**
7. **Mobile app deployment** (EAS)

---

## 🎉 RESUMO

**Status**: ⚡ **PRONTO PARA DEPLOY AGORA!**

**O que foi preparado:**
- ✅ Chaves de segurança geradas
- ✅ Environment variables configuradas  
- ✅ Railway configs otimizadas
- ✅ Database Neon conectado
- ✅ Build configs prontos

**Tempo estimado**: 15-30 minutos
**Dificuldade**: Fácil (process manual)

👉 **Comece agora**: https://railway.app/dashboard

🔐 **LEMBRE-SE**: Nunca commite as chaves no Git!