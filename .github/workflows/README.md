# GitHub Actions Workflow - Neon Database Integration

Este workflow automatiza a criação e exclusão de branches do banco de dados Neon para cada Pull Request.

## Configuração Necessária

### 1. Variáveis de Repositório (Repository Variables)

Configure as seguintes variáveis em `Settings > Secrets and variables > Actions > Variables`:

- `NEON_PROJECT_ID`: ID do seu projeto Neon Database

### 2. Secrets do Repositório (Repository Secrets)

Configure os seguintes secrets em `Settings > Secrets and variables > Actions > Secrets`:

- `NEON_API_KEY`: Sua chave de API do Neon Database

## Como Funciona

### Quando um PR é aberto/reaberto/sincronizado:
1. Cria uma nova branch no banco Neon com nome `preview/pr-{numero}-{branch-name}`
2. Executa as migrações do Alembic na nova branch
3. Comenta no PR com as diferenças de schema (se houver)

### Quando um PR é fechado:
1. Remove automaticamente a branch do banco Neon

## Benefícios

- **Isolamento**: Cada PR tem seu próprio ambiente de banco de dados
- **Testes**: Pode executar testes com dados isolados
- **Migrações**: Valida mudanças de schema automaticamente
- **Limpeza**: Remove branches automaticamente quando não são mais necessárias

## Estrutura do Workflow

- **Setup**: Obtém o nome da branch atual
- **Create Neon Branch**: Cria branch no Neon e executa migrações
- **Delete Neon Branch**: Remove branch quando PR é fechado

## Personalização

Você pode descomentar e modificar as seções de:
- Execução de testes
- Deploy automático
- Validações adicionais

## Troubleshooting

Se o workflow falhar:
1. Verifique se `NEON_PROJECT_ID` e `NEON_API_KEY` estão configurados
2. Confirme se o projeto Neon existe e está ativo
3. Verifique os logs do workflow para detalhes do erro
