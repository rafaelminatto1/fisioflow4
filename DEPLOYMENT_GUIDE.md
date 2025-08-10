# 🚀 Guia de Deploy FisioFlow - Passo a Passo

## 📋 Pré-requisitos

- Conta no [Neon.tech](https://neon.tech) (PostgreSQL serverless)
- Conta no [Railway.app](https://railway.app) (hospedagem)
- Git configurado localmente

## 🗄️ PASSO 1: Configurar Neon Database

### 1.1 Criar Projeto no Neon
1. Acesse [neon.tech](https://neon.tech) e faça login
2. Clique em "**New Project**"
3. Configure:
   - **Name**: `fisioflow-db`
   - **PostgreSQL Version**: `15` (ou mais recente)
   - **Region**: Escolha a mais próxima (ex: `US East`)
4. Clique em "**Create Project**"

### 1.2 Obter Connection String
1. No dashboard do projeto, vá em "**Connection Details**"
2. Copie a **Connection String** completa:
   ```
   postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```
3. **GUARDE ESTA STRING** - você vai precisar dela!

### 1.3 Configurar Variáveis de Ambiente
```bash
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
ENCRYPTION_KEY="sua-chave-de-criptografia-base64"
JWT_SECRET_KEY="sua-jwt-secret-key-super-segura"
SECRET_KEY="sua-flask-secret-key-super-segura"
```

## 🚄 PASSO 2: Deploy do Backend no Railway

### 2.1 Preparar Repositório
```bash
# Clone ou navegue até o diretório do projeto
cd fisioflow4

# Certifique-se que todos os arquivos estão commitados
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2.2 Criar Serviço no Railway
1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em "**New Project**"
3. Selecione "**Deploy from GitHub repo**"
4. Escolha o repositório **fisioflow4**
5. Railway detectará automaticamente que é um projeto Python

### 2.3 Configurar Variáveis de Ambiente (Backend)
No painel do Railway, vá em "**Variables**" e adicione:

```bash
# Database
DATABASE_URL=sua-connection-string-do-neon
FLASK_ENV=production

# Security
ENCRYPTION_KEY=sua-chave-criptografia
JWT_SECRET_KEY=sua-jwt-secret
SECRET_KEY=sua-flask-secret

# CORS (será o domínio do frontend)
CORS_ORIGINS=https://seu-frontend.railway.app

# Email (opcional - para funcionalidades futuras)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua-senha-app

# Rate Limiting
RATELIMIT_STORAGE_URL=memory://
```

### 2.4 Configurar Build
1. No Railway, vá em "**Settings**" > "**Build**"
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `python -m gunicorn app:app --bind 0.0.0.0:$PORT --workers 2`

### 2.5 Deploy
1. Clique em "**Deploy**"
2. Aguarde o build completar (5-10 minutos)
3. **COPIE A URL** do backend (ex: `https://backend-production-abc.up.railway.app`)

## 🌐 PASSO 3: Deploy do Frontend no Railway

### 3.1 Criar Segundo Serviço
1. No mesmo projeto Railway, clique em "**+ New**" > "**GitHub Repo**"
2. Selecione novamente o repositório **fisioflow4**
3. Railway criará um segundo serviço

### 3.2 Configurar Build (Frontend)
1. No novo serviço, vá em "**Settings**" > "**Build**"
2. **Root Directory**: `frontend`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`

### 3.3 Configurar Variáveis de Ambiente (Frontend)
```bash
NEXT_PUBLIC_API_URL=https://sua-url-do-backend.railway.app
NODE_ENV=production
```

### 3.4 Deploy Frontend
1. Clique em "**Deploy**"
2. Aguarde o build (10-15 minutos)
3. **COPIE A URL** do frontend

## 🔄 PASSO 4: Executar Migrations

### 4.1 Via Railway CLI (Recomendado)
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Fazer login
railway login

# Conectar ao projeto
railway link

# Executar migrations no backend
railway run python -m alembic upgrade head
```

### 4.2 Via Web Console (Alternativo)
1. No painel do backend Railway, vá em "**Deploy**" > "**View Logs**"
2. Clique em "**Console**" 
3. Execute:
   ```bash
   python -m alembic upgrade head
   ```

## 🎯 PASSO 5: Configurar Domínio (Opcional)

### 5.1 Domínio Personalizado
1. No Railway, em cada serviço, vá em "**Settings**" > "**Domains**"
2. Adicione seu domínio customizado
3. Configure o DNS apontando para Railway

### 5.2 HTTPS Automático
O Railway configura HTTPS automaticamente com Let's Encrypt.

## ✅ PASSO 6: Validar Deploy

### 6.1 Testar Backend
```bash
curl https://sua-url-backend.railway.app/health
# Deve retornar: {"status": "healthy", ...}
```

### 6.2 Testar Frontend
1. Acesse a URL do frontend no navegador
2. Teste login/cadastro
3. Verifique se está conectando com a API

### 6.3 Testar Funcionalidades
- ✅ Autenticação (login/logout)
- ✅ Cadastro de pacientes  
- ✅ Sistema SOAP
- ✅ Mapa corporal
- ✅ Agendamentos

## 🔧 Comandos Úteis

### Gerar Chaves Seguras
```bash
# Encryption Key (Python)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# JWT Secret (bash)
openssl rand -base64 64

# Flask Secret (bash)
openssl rand -base64 32
```

### Logs e Debug
```bash
# Ver logs do backend
railway logs --service backend

# Ver logs do frontend  
railway logs --service frontend

# Console no backend
railway shell --service backend
```

## 🚨 Troubleshooting

### Erro de Conexão com Database
- Verifique se a `DATABASE_URL` está correta
- Certifique-se que inclui `?sslmode=require`
- Teste conexão: `railway run python -c "from app import db; print('OK')"`

### Build Failures
- Verifique se `requirements.txt` está correto
- Para frontend, certifique-se que `package.json` tem todas as dependências
- Check logs: `railway logs`

### CORS Errors
- Atualize `CORS_ORIGINS` com a URL real do frontend
- Redeploy o backend após alterar variáveis

## 📊 Monitoramento

### Health Checks
- Backend: `https://backend.railway.app/health`
- Database: Monitore via Neon dashboard
- Uptime: Use serviços como UptimeRobot

### Performance
- Railway fornece métricas básicas
- Para análise avançada, integre com ferramentas como Sentry

## 🔒 Segurança Pós-Deploy

1. **Atualize URLs**: Configure `CORS_ORIGINS` com domínio real
2. **Chaves Seguras**: Use geradores criptográficos para todas as chaves
3. **Backup Database**: Configure backups automáticos no Neon
4. **SSL/HTTPS**: Verifique se está funcionando corretamente
5. **Rate Limiting**: Monitor logs para ataques

## 🎉 Deploy Completo!

Parabéns! Seu FisioFlow está no ar com:

- ✅ **Backend Flask** com autenticação JWT
- ✅ **Frontend Next.js** responsivo
- ✅ **PostgreSQL** serverless (Neon)
- ✅ **HTTPS** automático
- ✅ **Escalabilidade** automática
- ✅ **Monitoramento** básico

### URLs Finais:
- **Frontend**: `https://fisioflow-frontend.railway.app`
- **Backend**: `https://fisioflow-backend.railway.app` 
- **API Health**: `https://fisioflow-backend.railway.app/health`

**Custo estimado**: $5-20/mês (Railway + Neon free tiers cobrem desenvolvimento/teste)

---

## 📱 Próximos Passos

1. **Mobile App**: Deploy via Expo EAS Build
2. **Analytics**: Integrar Google Analytics
3. **Monitoring**: Sentry para error tracking  
4. **Backup**: Configurar backups regulares
5. **Performance**: Otimizar queries e caching

🚀 **Seu FisioFlow está pronto para revolucionar a fisioterapia!**