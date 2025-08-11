#!/usr/bin/env python3
"""
🚀 FisioFlow4 - Deploy via Navegador
Abre automaticamente as páginas necessárias e fornece instruções
"""

import webbrowser
import time
import sys

def print_header(title):
    print(f"\n{'='*60}")
    print(f"🚀 {title}")
    print(f"{'='*60}")

def print_step(step, title):
    print(f"\n{step}️⃣ {title}")
    print("-" * 50)

def wait_for_user(message="Pressione ENTER quando terminar..."):
    input(f"👆 {message}")

def main():
    print_header("FISIOFLOW4 - DEPLOY AUTOMATIZADO VIA NAVEGADOR")
    
    print("Este script irá:")
    print("✅ Abrir automaticamente as páginas necessárias")
    print("✅ Fornecer todas as configurações prontas")
    print("✅ Guiá-lo passo a passo")
    print("\nTempo estimado: 15-20 minutos")
    
    wait_for_user("Pressione ENTER para começar...")
    
    # PASSO 1: Login Railway
    print_step("1", "LOGIN RAILWAY")
    print("📂 Abrindo Railway Dashboard...")
    webbrowser.open("https://railway.app/dashboard")
    print("👉 Faça login com sua conta GitHub")
    wait_for_user()
    
    # PASSO 2: Criar Projeto Backend
    print_step("2", "CRIAR PROJETO BACKEND")
    print("📂 Abrindo página de novo projeto...")
    webbrowser.open("https://railway.app/new")
    print("""
👉 INSTRUÇÕES:
1. Clique em "Deploy from GitHub repo"
2. Selecione o repositório 'fisioflow4'
3. Configure:
   - Name: fisioflow4-backend
   - Root Directory: backend/
4. Clique "Deploy"
""")
    wait_for_user("Aguarde o deploy inicial e pressione ENTER...")
    
    # PASSO 3: Configurar Variáveis Backend
    print_step("3", "CONFIGURAR VARIÁVEIS BACKEND")
    print("👉 No dashboard do seu projeto, clique na aba 'Variables'")
    print("\n📋 COPIE E COLE ESTAS VARIÁVEIS (uma por vez):")
    
    backend_vars = {
        "DATABASE_URL": "postgresql://neondb_owner:npg_p7LXBZvaMF0f@ep-shiny-dawn-ae4085f3-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
        "SECRET_KEY": "N39I17G7fapmSkFzUtTOsecdiJJr1b81EQcJYTTBz24dhB0NU6emcQq_3GhapKdDO3PDwyGEEkA-7k6ZAw1UxQ",
        "JWT_SECRET_KEY": "-8kLcn65GTAZBwJ7IiDI7jgQw1YZmWsPu6tgYErqqc1g7WW4HwPX6l7PnMFOJGkWRuI6JJNzRXmKubJXuK-BMQ",
        "ENCRYPTION_KEY": "ZRBmmzKOfmBgtgLHMhPZ4ADpLqgZGUE53jQ3IzjQON0=",
        "CSRF_SECRET_KEY": "3b85d12b8700de892496686593d14e59b66573768790ac2cb62f90f5805602b3",
        "INTERNAL_API_KEY": "fisiflow_api_BxgEibj1oo30iIDCyZs7UPCYteU4-BN7i0uyIpTZXjc",
        "NODE_ENV": "production",
        "FLASK_ENV": "production",
        "DEBUG": "false",
        "JWT_ACCESS_TOKEN_EXPIRES": "3600",
        "JWT_REFRESH_TOKEN_EXPIRES": "2592000",
        "CORS_ORIGINS": "http://localhost:3000",
        "RATE_LIMIT_PER_MINUTE": "100",
        "RATE_LIMIT_PER_HOUR": "2000",
        "MAX_FILE_SIZE": "10485760",
        "SMTP_SERVER": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "your-email@gmail.com",
        "SMTP_PASSWORD": "your-app-password",
        "FROM_EMAIL": "noreply@fisioflow.com"
    }
    
    for i, (key, value) in enumerate(backend_vars.items(), 1):
        print(f"\n{i:2d}. {key}")
        print(f"    {value}")
    
    wait_for_user("Termine de adicionar TODAS as variáveis e pressione ENTER...")
    
    # PASSO 4: Testar Backend
    print_step("4", "TESTAR BACKEND")
    print("👉 Copie a URL do seu backend (ex: https://fisioflow4-backend-production-xxxx.up.railway.app)")
    backend_url = input("🔗 Cole a URL do backend aqui: ").strip()
    
    if backend_url:
        health_url = f"{backend_url}/health"
        print(f"📂 Abrindo health check: {health_url}")
        webbrowser.open(health_url)
        print("👉 Você deve ver uma resposta JSON com 'status': 'healthy'")
        wait_for_user("Confirme que o backend está funcionando...")
    
    # PASSO 5: Criar Serviço Frontend
    print_step("5", "CRIAR SERVIÇO FRONTEND")
    print("👉 No mesmo projeto Railway:")
    print("""
1. Clique "+ New Service"
2. Selecione "GitHub Repo"
3. Escolha o mesmo repositório 'fisioflow4'
4. Configure:
   - Name: fisioflow4-frontend
   - Root Directory: frontend/
5. Clique "Deploy"
""")
    wait_for_user("Aguarde o deploy do frontend e pressione ENTER...")
    
    # PASSO 6: Configurar Variáveis Frontend
    print_step("6", "CONFIGURAR VARIÁVEIS FRONTEND")
    print("👉 No serviço frontend, vá para aba 'Variables'")
    print("\n📋 ADICIONE ESTAS VARIÁVEIS:")
    
    frontend_vars = {
        "NODE_ENV": "production",
        "NEXT_PUBLIC_API_URL": backend_url if backend_url else "https://SEU-BACKEND-URL.up.railway.app",
        "NEXT_TELEMETRY_DISABLED": "1"
    }
    
    for i, (key, value) in enumerate(frontend_vars.items(), 1):
        print(f"{i}. {key} = {value}")
    
    wait_for_user("Adicione as variáveis do frontend...")
    
    # PASSO 7: Obter URL Frontend
    print_step("7", "OBTER URL FRONTEND")
    frontend_url = input("🔗 Cole a URL do frontend aqui: ").strip()
    
    if frontend_url:
        print(f"📂 Abrindo frontend: {frontend_url}")
        webbrowser.open(frontend_url)
    
    # PASSO 8: Atualizar CORS
    print_step("8", "ATUALIZAR CORS BACKEND")
    print("👉 IMPORTANTE: Volte ao serviço BACKEND")
    print("👉 Na aba Variables, EDITE a variável 'CORS_ORIGINS'")
    print(f"👉 Mude de 'http://localhost:3000' para: {frontend_url}")
    wait_for_user("Atualize o CORS e aguarde o redeploy automático...")
    
    # PASSO 9: Verificação Final
    print_step("9", "VERIFICAÇÃO FINAL")
    print("🔍 Vamos testar tudo:")
    
    if backend_url:
        print(f"1. Backend Health: {backend_url}/health")
        webbrowser.open(f"{backend_url}/health")
    
    if frontend_url:
        print(f"2. Frontend App: {frontend_url}")
        webbrowser.open(frontend_url)
    
    print("\n✅ CHECKLIST FINAL:")
    checks = [
        "Backend responde /health com status 'healthy'",
        "Frontend carrega sem erros",
        "Consegue fazer login (teste com usuário fictício)",
        "CORS configurado corretamente",
        "Não há erros nos logs do Railway"
    ]
    
    for i, check in enumerate(checks, 1):
        print(f"{i}. [ ] {check}")
    
    wait_for_user("Verifique todos os itens acima...")
    
    # SUCESSO!
    print_header("🎉 DEPLOY COMPLETO!")
    print(f"✅ Backend:  {backend_url}")
    print(f"✅ Frontend: {frontend_url}")
    print(f"✅ Database: Neon PostgreSQL")
    print(f"✅ HTTPS:    Automático Railway")
    
    print("\n🔧 PRÓXIMOS PASSOS:")
    print("1. Configure email SMTP real (Gmail App Password)")
    print("2. Adicione domínio personalizado")
    print("3. Configure monitoramento (Sentry)")
    print("4. Teste todas as funcionalidades")
    
    print("\n📊 MONITORAMENTO:")
    print("- Railway Dashboard: Logs, Metrics, Analytics")
    print("- Neon Dashboard: Database performance")
    print("- GitHub: Deploys automáticos em push")
    
    print("\n🎯 DEPLOY FINALIZADO COM SUCESSO!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Deploy cancelado pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        sys.exit(1)
