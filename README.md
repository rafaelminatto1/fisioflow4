# 🏥 FisioFlow - Sistema Completo de Gestão para Clínicas de Fisioterapia

Sistema completo e moderno de gestão para clínicas de fisioterapia com IA integrada, desenvolvido em monorepo com backend Flask, frontend Next.js, mobile React Native e deploy automatizado.

## 🎯 Status do Projeto: **30% COMPLETO** (10/33 fases implementadas)

## 🏗️ Arquitetura do Sistema

```
fisioflow4/
├── 🌐 frontend/          # Next.js 15 + TypeScript + shadcn/ui
├── 🔧 backend/           # Flask 3.0 + SQLAlchemy + PostgreSQL
├── 📱 mobile/            # React Native Expo (planejado)
├── 📋 scripts/           # Deploy, migrations e utilitários
├── 📄 docs/              # Documentação técnica completa
└── 🚀 deploy/            # Configs Railway + Neon DB
```

## ✅ Funcionalidades Implementadas

### 🔐 **FASE 2 - Sistema de Autenticação** [COMPLETO]
- ✅ JWT com refresh token rotation
- ✅ 5 Roles: ADMIN, FISIOTERAPEUTA, ESTAGIARIO, PACIENTE, PARCEIRO
- ✅ Rate limiting inteligente
- ✅ Hash bcrypt para senhas
- ✅ Middleware de autorização por role
- ✅ Frontend: Context, LoginForm, RegisterForm, PrivateRoute

### 👥 **FASE 3A - Gestão de Pacientes** [COMPLETO]
- ✅ CRUD completo com busca e paginação
- ✅ Criptografia LGPD (CPF, telefone, dados sensíveis)
- ✅ Prontuários eletrônicos com histórico
- ✅ Sistema SOAP (Subjective, Objective, Assessment, Plan)
- ✅ Upload seguro de documentos
- ✅ **BodyMap interativo SVG** para marcação anatômica
- ✅ Formulário evolução clínica integrado

### 📅 **FASE 3B - Sistema de Agendamentos** [COMPLETO]
- ✅ **Modelo Appointment** com detecção automática de conflitos
- ✅ **Sistema de recorrência** usando RRULE (diário, semanal, mensal)
- ✅ **Lembretes inteligentes** (WhatsApp, SMS, email)
- ✅ Status tracking: agendado, confirmado, em_andamento, concluído
- ✅ APIs REST completas para gestão da agenda
- ✅ Cálculo automático de horários disponíveis

### 🚀 **Deploy & Infraestrutura** [COMPLETO]
- ✅ **Railway.app** - configuração completa
- ✅ **Neon.tech** - PostgreSQL serverless
- ✅ Scripts de geração de chaves seguras
- ✅ Health checks e validação de deploy
- ✅ Guia passo-a-passo de deploy
- ✅ Configurações de produção

## 🔄 Em Desenvolvimento

### 📚 **FASE 3B-11 - Frontend da Agenda** [EM PROGRESSO]
- 🔄 Calendário interativo (mensal/semanal/diário)
- 🔄 Interface drag-and-drop para agendamentos
- 🔄 Dashboard de conflitos e horários livres

### 🎯 **Próximas Fases Planejadas**

#### 📋 **FASE 3C** - Biblioteca de Exercícios
- 📝 Catálogo com vídeos demonstrativos
- 📝 Prescrição personalizada por paciente
- 📝 Portal do paciente para execução
- 📝 Gamificação e progresso visual

#### 🎓 **FASE 4** - Mentoria & Protocolos Clínicos
- 📝 Sistema de mentoria para estagiários
- 📝 Protocolos baseados em evidência
- 📝 Gestão Kanban de projetos
- 📝 Dashboard executivo com KPIs

#### 🤖 **FASE 5** - Sistema de IA Integrado
- 📝 Orquestrador multi-IA (Claude, GPT-4, Gemini)
- 📝 Chat integrado e sugestões inteligentes
- 📝 Auto-completar evolução SOAP
- 📝 RAG com base de conhecimento

#### 📱 **FASE 6** - Portal do Paciente & Mobile
- 📝 Portal web para pacientes
- 📝 App mobile React Native
- 📝 Exercícios offline
- 📝 Push notifications e biometria

#### 💰 **FASE 7** - Parcerias & Financeiro
- 📝 Sistema de vouchers e comissões
- 📝 Dashboard para parceiros
- 📝 Dados bancários criptografados

#### 🧪 **FASE 8** - Testes & Documentação
- 📝 PyTest (backend), Jest+RTL (frontend), Cypress (E2E)
- 📝 Documentação técnica completa
- 📝 Compliance e auditoria

## 🛠️ Stack Tecnológica

### Frontend ⚡
- **Next.js 15** - Framework React com App Router
- **TypeScript** - Tipagem estática completa
- **Tailwind CSS** - Styling utilitário moderno
- **shadcn/ui** - Sistema de componentes premium
- **React Hook Form + Zod** - Validação robusta
- **Framer Motion** - Animações fluidas

### Backend 🔧
- **Flask 3.0** - Framework web Python moderno
- **SQLAlchemy 2.0** - ORM com sintaxe declarativa
- **PostgreSQL 15+** - Banco relacional principal
- **Alembic** - Migrations versionadas
- **JWT Extended** - Autenticação segura
- **Fernet** - Criptografia LGPD compliant
- **Flask-Limiter** - Rate limiting inteligente

### Mobile 📱 (Planejado)
- **React Native Expo** - Desenvolvimento multiplataforma
- **Expo Router** - Navegação nativa
- **SecureStore** - Armazenamento criptografado
- **LocalAuthentication** - Biometria nativa

### DevOps & Deploy 🚀
- **Railway.app** - Hospedagem serverless
- **Neon.tech** - PostgreSQL serverless
- **GitHub Actions** - CI/CD automatizado
- **Docker** - Containerização opcional

## 📋 Guia de Instalação Rápida

### 🛠️ Pré-requisitos
- **Node.js 18+** e npm/yarn
- **Python 3.11+** e pip 
- **PostgreSQL 15+** (local) ou conta [Neon.tech](https://neon.tech)
- **Git** configurado

### 🚀 1. Clone e Configuração Inicial

```bash
git clone https://github.com/seu-usuario/fisioflow4.git
cd fisioflow4

# Gerar chaves seguras para desenvolvimento
python scripts/generate-keys.py
```

### 🔧 2. Backend (Flask)

```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Configurar ambiente
cp .env.example .env
# Edite .env com DATABASE_URL e chaves geradas

# Executar migrations
python -m alembic upgrade head

# Seed dados iniciais (opcional)
python seed.py

# Iniciar servidor
python -m flask --app app run --debug
```
**Backend rodando em:** `http://localhost:5000`

### ⚡ 3. Frontend (Next.js)

```bash
cd frontend

# Instalar dependências  
npm install

# Configurar ambiente
cp .env.example .env.local
# Edite NEXT_PUBLIC_API_URL=http://localhost:5000

# Iniciar desenvolvimento
npm run dev
```
**Frontend rodando em:** `http://localhost:3000`

### ✅ 4. Verificar Funcionamento

1. **Health Check Backend:** `curl http://localhost:5000/health`
2. **Frontend:** Abra `http://localhost:3000`
3. **Teste Login:** Crie conta ou use credenciais de seed

## 🌐 Deploy em Produção

> **📖 Guia Completo:** Consulte [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) para deploy detalhado

### ⚡ Deploy Rápido Railway + Neon

```bash
# 1. Criar projeto no Neon.tech (PostgreSQL)
# 2. Copiar connection string

# 3. Deploy no Railway.app
# Backend: Root Directory = backend/
# Frontend: Root Directory = frontend/

# 4. Configurar variáveis (use generated-keys.txt)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SECRET_KEY=sua-chave-flask
JWT_SECRET_KEY=sua-chave-jwt  
ENCRYPTION_KEY=sua-chave-criptografia
```

### 🔍 Scripts de Validação

```bash
# Verificar deploy funcionando
python scripts/check-deploy.py https://seu-backend.railway.app

# Gerar chaves de produção
python scripts/generate-keys.py
```

## 🧪 Testes e Qualidade

```bash
# Backend - Testes unitários
cd backend && python -m pytest tests/ -v

# Frontend - Testes de componentes  
cd frontend && npm test

# Linting e formatação
npm run lint && npm run format

# Type checking
cd frontend && npm run type-check
```

## 📚 Documentação Técnica

### 📖 Guias Completos
- 📋 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Deploy passo-a-passo
- 🔒 **[SECURITY.md](docs/SECURITY.md)** - Segurança e LGPD
- 🏗️ **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitetura detalhada
- 📡 **[API.md](docs/API.md)** - Documentação da API REST

### 🔑 APIs Principais
- `POST /api/auth/login` - Autenticação JWT
- `GET /api/patients` - Lista pacientes
- `POST /api/patients/{id}/evolutions` - Nova evolução SOAP
- `GET /api/appointments` - Agenda do terapeuta
- `POST /api/appointments` - Novo agendamento

### 🗃️ Modelos Principais
- **User** - Usuários com 5 roles diferentes
- **Patient** - Pacientes com criptografia LGPD  
- **MedicalRecord** - Prontuários e evoluções SOAP
- **Appointment** - Agendamentos com recorrência RRULE

## 📊 Status do Desenvolvimento

### ✅ **Concluído (30% do projeto)**
- 🔐 **Autenticação completa** - JWT, roles, rate limiting
- 👥 **Gestão de pacientes** - CRUD, prontuários, criptografia
- 📋 **Sistema SOAP** - Evoluções clínicas + BodyMap SVG
- 📅 **Agendamentos** - Conflitos, recorrência, lembretes
- 🚀 **Deploy** - Railway + Neon configurados

### 🔄 **Em progresso**
- 📚 **Frontend da agenda** - Calendário interativo

### 📋 **Próximas fases**
1. **Biblioteca de exercícios** - Vídeos, prescrições
2. **Sistema de IA** - Claude, GPT-4, chat integrado  
3. **App mobile** - React Native + biometria
4. **Portal do paciente** - Web + exercícios
5. **Sistema financeiro** - Parcerias, vouchers

## 🎯 Como Contribuir

Este projeto segue um **roadmap estruturado de 33 fases**. Para contribuir:

1. **Fork** o repositório
2. **Escolha uma fase** da lista de issues
3. **Implemente** seguindo os padrões estabelecidos
4. **Teste** com os scripts disponíveis
5. **Envie PR** com descrição detalhada

### 🏆 Progresso Atual: **10/33 fases concluídas**

## 📄 Licença

**MIT License** - Veja [LICENSE](LICENSE) para detalhes completos.

---

## 🎉 **FisioFlow está transformando clínicas de fisioterapia!**

**🔗 Links Úteis:**
- 📖 [Documentação](docs/)  
- 🚀 [Deploy Guide](DEPLOYMENT_GUIDE.md)
- 🐛 [Report Issues](https://github.com/seu-usuario/fisioflow4/issues)
- 💬 [Discussões](https://github.com/seu-usuario/fisioflow4/discussions)

**🏥 Sistema completo. 🤖 IA integrada. ⚡ Deploy automático.**
