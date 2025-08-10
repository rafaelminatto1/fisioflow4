# 🚀 Configuração do Neon Database com GitHub Actions

Este guia explica como configurar a integração entre o Neon Database e GitHub Actions para o projeto FisioFlow.

## ✅ O que foi configurado

### 1. Workflow do GitHub Actions
- **Arquivo**: `.github/workflows/neon_workflow.yml`
- **Funcionalidade**: Cria e remove branches do banco Neon automaticamente para cada PR

### 2. Documentação
- **Arquivo**: `.github/workflows/README.md`
- **Conteúdo**: Instruções detalhadas de configuração e uso

### 3. Arquivo de exemplo
- **Arquivo**: `backend/env.example`
- **Conteúdo**: Template para variáveis de ambiente

## 🔧 Configuração necessária

### Passo 1: Obter credenciais do Neon
1. Acesse [console.neon.tech](https://console.neon.tech)
2. Faça login na sua conta
3. Selecione ou crie um projeto
4. Vá para **Settings > API Keys**
5. Crie uma nova API Key

### Passo 2: Configurar variáveis no GitHub
1. Vá para seu repositório no GitHub
2. Clique em **Settings > Secrets and variables > Actions**
3. Configure as seguintes variáveis:

#### Repository Variables (públicas)
- `NEON_PROJECT_ID`: ID do seu projeto Neon

#### Repository Secrets (privadas)
- `NEON_API_KEY`: Sua chave de API do Neon

### Passo 3: Testar a configuração
1. Faça um Pull Request para qualquer branch
2. O workflow será executado automaticamente
3. Verifique na aba **Actions** do GitHub
4. Verifique no console do Neon se a branch foi criada

## 🎯 Como funciona

### Quando um PR é aberto:
1. ✅ Cria branch no Neon: `preview/pr-{numero}-{branch-name}`
2. ✅ Executa migrações do Alembic
3. ✅ Comenta no PR com diferenças de schema

### Quando um PR é fechado:
1. ✅ Remove automaticamente a branch do Neon

## 🔍 Verificação da configuração

### Estrutura de arquivos criada:
```
.github/
├── workflows/
│   ├── neon_workflow.yml      # Workflow principal
│   └── README.md             # Documentação
backend/
├── env.example               # Template de variáveis
scripts/
└── test-neon-workflow.py    # Script de validação
```

### Dependências verificadas:
- ✅ Flask-Migrate (Alembic)
- ✅ psycopg2-binary (PostgreSQL)
- ✅ SQLAlchemy
- ✅ Configuração do Alembic

## 🚨 Troubleshooting

### Problema: Workflow falha na criação da branch
**Solução**: Verifique se `NEON_PROJECT_ID` e `NEON_API_KEY` estão configurados corretamente

### Problema: Migrações falham
**Solução**: 
1. Verifique se o `DATABASE_URL` está correto
2. Confirme se o projeto Neon está ativo
3. Verifique os logs do workflow

### Problema: Schema diff não funciona
**Solução**: Verifique se as permissões `contents: read` e `pull-requests: write` estão configuradas

## 📋 Próximos passos

1. **Configure as variáveis** no GitHub conforme o Passo 2
2. **Teste com um PR** para verificar se tudo funciona
3. **Monitore os logs** na aba Actions do GitHub
4. **Verifique no console Neon** se as branches são criadas/removidas

## 🔗 Links úteis

- [Neon Database Console](https://console.neon.tech)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Neon GitHub Actions](https://github.com/neondatabase/create-branch-action)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

## 💡 Dicas

- **Branches temporárias**: Cada PR cria uma branch isolada no banco
- **Migrações automáticas**: Schema é atualizado automaticamente
- **Limpeza automática**: Branches são removidas quando PRs são fechados
- **Isolamento**: Cada PR tem seu próprio ambiente de banco de dados

---

🎉 **Configuração concluída!** Agora você tem um workflow automatizado que integra perfeitamente o Neon Database com seu fluxo de desenvolvimento no GitHub.
