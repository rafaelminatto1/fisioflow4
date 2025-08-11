# 🚂 FisioFlow - Guia de Deploy Railway

## 📋 Pré-requisitos

1. **Conta Railway**: Criar conta em [railway.app](https://railway.app)
2. **GitHub Repository**: Código hospedado no GitHub
3. **Neon Database**: Já configurado ✅
4. **Variáveis de Ambiente**: Preparadas na seção abaixo

## 🎯 Deploy Backend (Flask API)

### 1. Conectar Railway ao GitHub

```bash
# Instalar Railway CLI (opcional)
npm install -g @railway/cli

# Login no Railway
railway login
```

### 2. Criar Projeto Railway

1. Acesse [railway.app/dashboard](https://railway.app/dashboard)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório `fisioflow4`
5. Selecione **"Deploy from subdirectory"** → `backend/`

### 3. Configurar Variáveis de Ambiente

**CRÍTICO**: Configure todas essas variáveis no Railway Dashboard:

```bash
# Database
NEON_DATABASE_URL="postgresql://neondb_owner:npg_p7LXBZvaMF0f@ep-shiny-dawn-ae4085f3-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

# App Config
NODE_ENV="production"
FLASK_ENV="production"
DEBUG="false"
PORT="8000"

# Security (GERAR VALORES ÚNICOS)
SECRET_KEY="your-super-secret-key-change-in-production-32-chars-min"
JWT_SECRET_KEY="your-jwt-secret-key-change-in-production-32-chars-min"
ENCRYPTION_KEY="your-32-byte-encryption-key-base64-encoded-change-this"

# JWT Settings
JWT_ACCESS_TOKEN_EXPIRES="3600"
JWT_REFRESH_TOKEN_EXPIRES="2592000"

# AI APIs (OPCIONAL - Configurar depois)
OPENAI_API_KEY="sk-your-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"
GOOGLE_AI_API_KEY="your-google-ai-key"

# Email (Configurar com seu provedor)
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
FROM_EMAIL="noreply@fisioflow.com"

# Rate Limiting
RATE_LIMIT_PER_MINUTE="60"
RATE_LIMIT_PER_HOUR="1000"

# File Upload
MAX_FILE_SIZE="10485760"
ALLOWED_FILE_TYPES="jpg,jpeg,png,pdf,mp4,mov,avi"

# CORS (Configurar depois com domínio frontend)
CORS_ORIGINS="https://your-frontend-domain.railway.app"
```

### 4. Build e Deploy Automático

Railway detectará automaticamente:
- ✅ `requirements.txt` → Instalação Python
- ✅ `Procfile` → Comando de start com Gunicorn
- ✅ `railway.toml` → Configurações específicas
- ✅ Build command incluindo migrations Alembic

### 5. Verificar Deploy

Após deploy bem-sucedido:

```bash
# Testar API
curl https://your-backend-url.railway.app/health

# Resposta esperada:
{
  "status": "healthy",
  "database": "connected", 
  "timestamp": "2024-07-15T..."
}
```

## 🌐 Deploy Frontend (Next.js)

### 1. Criar Segundo Serviço

1. No mesmo projeto Railway, clique **"+ New Service"**
2. Selecione **"GitHub Repo"** → mesmo repositório
3. **Root Directory**: `frontend/`

### 2. Configurar Variáveis Frontend

```bash
# Next.js Config
NODE_ENV="production"
NEXT_PUBLIC_API_URL="https://your-backend-url.railway.app"

# Build Config  
BUILD_COMMAND="npm run build"
START_COMMAND="npm start"
```

### 3. Build Automático

Railway detectará:
- ✅ `package.json` → Instalação Node.js
- ✅ `next.config.js` → Configuração Next.js
- ✅ Build SSR automático

## 📡 Configuração de Domínio

### 1. Domínio Personalizado (Opcional)

**Backend**:
- Railway Dashboard → Backend Service → Settings → Domains
- Adicionar: `api.fisioflow.com`

**Frontend**: 
- Railway Dashboard → Frontend Service → Settings → Domains  
- Adicionar: `fisioflow.com` ou `app.fisioflow.com`

### 2. Atualizar CORS

Após configurar domínio, atualizar variável:
```bash
CORS_ORIGINS="https://fisioflow.com,https://app.fisioflow.com"
```

## 🔧 Troubleshooting

### Build Failures

```bash
# Verificar logs
railway logs --follow

# Logs comuns:
# "Module not found" → Verificar requirements.txt
# "Database connection failed" → Verificar DATABASE_URL
# "Port binding failed" → Railway gerencia PORT automaticamente
```

### Database Issues

```bash
# Testar conexão direta
railway shell
python -c "import psycopg2; print('Connection OK')"
```

### Performance Issues

```bash
# Verificar métricas no Railway Dashboard
# CPU/Memory usage
# Response times
# Error rates
```

## 🚀 Deploy Checklist

### ✅ Backend Deploy
- [ ] Repository conectado ao Railway
- [ ] Build bem-sucedido (requirements.txt)
- [ ] Migrations executadas (Alembic)
- [ ] Variáveis de ambiente configuradas
- [ ] Health check respondendo
- [ ] Logs sem erros críticos
- [ ] Database conectado corretamente

### ✅ Frontend Deploy
- [ ] Build Next.js bem-sucedido
- [ ] NEXT_PUBLIC_API_URL configurado
- [ ] SSR funcionando
- [ ] Routing correto
- [ ] Assets loading (CSS, JS, images)

### ✅ Integração
- [ ] Frontend consegue chamar API
- [ ] Authentication funcionando
- [ ] CORS configurado corretamente
- [ ] HTTPS ativo (automático Railway)

## 📊 Monitoramento

### Railway Dashboard
- **Metrics**: CPU, Memory, Network
- **Logs**: Real-time application logs  
- **Deployments**: History and rollbacks
- **Analytics**: Request volumes

### Comandos CLI

```bash
# Ver status dos serviços
railway status

# Logs em tempo real
railway logs --follow --service backend
railway logs --follow --service frontend

# Deploy manual (se necessário)
railway up --service backend
```

## 💡 Dicas de Produção

### 1. Secrets Management
- NUNCA commitar secrets no código
- Usar Railway Environment Variables
- Rotacionar chaves periodicamente

### 2. Scaling
- Railway auto-scale baseado em uso
- Monitorar métricas para ajustar resources
- Considerar multiple regions para alta disponibilidade

### 3. Backup Strategy
- Neon DB faz backup automático
- Considerar backup de files/uploads
- Testar recovery procedures

### 4. CI/CD
- Railway deploy automático no push
- Configurar branch protection rules
- Implement staging environment

## 🆘 Suporte

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway  
- **Neon Support**: https://neon.tech/docs

---

## 🎯 Próximos Passos

Após deploy bem-sucedido:

1. **Configurar domínio personalizado**
2. **Setup monitoring (Sentry)**  
3. **Configure email provider**
4. **Add AI API keys**
5. **Run security audit**
6. **Performance optimization**
7. **Mobile app deployment**

**Status Atual**: 
- ✅ Neon Database configurado
- 🚧 Railway Backend (próximo passo)
- ⏳ Railway Frontend
- ⏳ Domínio personalizado