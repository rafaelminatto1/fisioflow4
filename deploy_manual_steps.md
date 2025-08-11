# 🚀 Deploy Manual FisioFlow4 - Passo a Passo

## 📋 PASSO A PASSO COMPLETO

### 1️⃣ Preparar Token Railway
```bash
# Vá para: https://railway.app/account/tokens
# Clique em "Create New Token"
# Copie o token gerado
```

### 2️⃣ Executar Script Automatizado
```bash
# Executar o script Python
python deploy_automated.py
```

**OU se preferir manual:**

### 3️⃣ Deploy Manual via Dashboard

#### A) Acessar Railway
- Vá para: https://railway.app/dashboard
- Faça login com GitHub

#### B) Criar Projeto Backend
1. Clique **"New Project"**
2. **"Deploy from GitHub repo"**
3. Selecione **`fisioflow4`**
4. Configure:
   - **Name**: `fisioflow4-backend`
   - **Root Directory**: `backend/`
5. Clique **"Deploy"**

#### C) Configurar Variáveis Backend
No dashboard → Variables → Add:

```env
# Database (Neon)
DATABASE_URL=postgresql://neondb_owner:npg_p7LXBZvaMF0f@ep-shiny-dawn-ae4085f3-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require

# Security Keys
SECRET_KEY=N39I17G7fapmSkFzUtTOsecdiJJr1b81EQcJYTTBz24dhB0NU6emcQq_3GhapKdDO3PDwyGEEkA-7k6ZAw1UxQ
JWT_SECRET_KEY=-8kLcn65GTAZBwJ7IiDI7jgQw1YZmWsPu6tgYErqqc1g7WW4HwPX6l7PnMFOJGkWRuI6JJNzRXmKubJXuK-BMQ
ENCRYPTION_KEY=ZRBmmzKOfmBgtgLHMhPZ4ADpLqgZGUE53jQ3IzjQON0=
CSRF_SECRET_KEY=3b85d12b8700de892496686593d14e59b66573768790ac2cb62f90f5805602b3
INTERNAL_API_KEY=fisiflow_api_BxgEibj1oo30iIDCyZs7UPCYteU4-BN7i0uyIpTZXjc

# App Config
NODE_ENV=production
FLASK_ENV=production
DEBUG=false
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# CORS (temporário)
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=2000
MAX_FILE_SIZE=10485760

# Email (configure depois)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@fisioflow.com
```

#### D) Aguardar Backend Deploy
- Aguarde o build completar (5-10 min)
- Copie a URL gerada: `https://fisioflow4-backend-production-xxxx.up.railway.app`

#### E) Testar Backend
```bash
curl https://SUA-BACKEND-URL.up.railway.app/health
```

#### F) Criar Projeto Frontend
1. No mesmo projeto, clique **"+ New Service"**
2. **"GitHub Repo"** → mesmo repositório
3. Configure:
   - **Name**: `fisioflow4-frontend`
   - **Root Directory**: `frontend/`

#### G) Configurar Variáveis Frontend
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://SUA-BACKEND-URL.up.railway.app
NEXT_TELEMETRY_DISABLED=1
```

#### H) Aguardar Frontend Deploy
- Aguarde build completar (5-10 min)
- Copie URL: `https://fisioflow4-frontend-production-yyyy.up.railway.app`

#### I) Atualizar CORS Backend
Volte no backend → Variables → Editar:
```env
CORS_ORIGINS=https://SUA-FRONTEND-URL.up.railway.app
```

### 4️⃣ Verificação Final

#### ✅ Checklist
- [ ] Backend URL respondendo `/health`
- [ ] Frontend carregando
- [ ] Login funcionando
- [ ] Database conectado
- [ ] CORS configurado

#### 🔗 URLs Finais
- **Frontend**: https://fisioflow4-frontend-production-yyyy.up.railway.app
- **Backend**: https://fisioflow4-backend-production-xxxx.up.railway.app
- **Database**: Neon (conectado)

### 5️⃣ Próximos Passos

1. **Configurar Email Real**
   - Gmail App Password
   - SendGrid
   - Ou outro provedor

2. **Domínio Personalizado**
   - Comprar domínio
   - Configurar DNS
   - SSL automático

3. **Monitoramento**
   - Railway Analytics
   - Sentry (erros)
   - Uptime monitoring

4. **Otimizações**
   - CDN para assets
   - Cache Redis
   - Database optimization

---

## 🚨 IMPORTANTE

### Segurança
- ✅ Chaves geradas aleatoriamente
- ✅ HTTPS automático Railway
- ✅ Environment variables seguras
- ⚠️  Configure email SMTP real
- ⚠️  Monitore logs de erro

### Performance
- ✅ Gunicorn para produção
- ✅ Next.js otimizado
- ✅ Database Neon escalável
- ⚠️  Configure CDN se necessário

### Backup
- ✅ Código no GitHub
- ✅ Database Neon com backup
- ⚠️  Configure backup schedule
