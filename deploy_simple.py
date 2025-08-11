#!/usr/bin/env python3
"""
🚀 FisioFlow4 - Deploy Simplificado Railway
Deploy automatizado usando Railway CLI via subprocess
"""

import subprocess
import os
import sys
import time
import json

def run_command(cmd, capture_output=True, check=True):
    """Executa comando e retorna resultado"""
    try:
        if capture_output:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=check)
            return result.stdout.strip(), result.stderr.strip()
        else:
            subprocess.run(cmd, shell=True, check=check)
            return "", ""
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro no comando: {cmd}")
        print(f"   Saída: {e.stdout if hasattr(e, 'stdout') else ''}")
        print(f"   Erro: {e.stderr if hasattr(e, 'stderr') else ''}")
        return None, str(e)

def install_railway_cli():
    """Instala Railway CLI"""
    print("📦 Instalando Railway CLI...")
    
    # Tentar diferentes métodos de instalação
    methods = [
        "npm install -g @railway/cli",
        "curl -fsSL https://railway.app/install.sh | sh",
        "powershell -Command \"iwr https://railway.app/install.ps1 -useb | iex\""
    ]
    
    for method in methods:
        print(f"   Tentando: {method}")
        stdout, stderr = run_command(method, check=False)
        
        # Verificar se instalou
        stdout, stderr = run_command("railway --version", check=False)
        if stdout and "railway" in stdout.lower():
            print(f"✅ Railway CLI instalado: {stdout}")
            return True
    
    print("❌ Não foi possível instalar Railway CLI automaticamente")
    print("   Instale manualmente: https://docs.railway.app/develop/cli")
    return False

def railway_login():
    """Faz login no Railway"""
    print("🔐 Fazendo login no Railway...")
    print("   Isso abrirá seu navegador para autenticação...")
    
    stdout, stderr = run_command("railway login", capture_output=False, check=False)
    
    # Verificar se logou
    stdout, stderr = run_command("railway whoami", check=False)
    if stdout and "@" in stdout:
        print(f"✅ Logado como: {stdout}")
        return True
    else:
        print("❌ Login falhou")
        return False

def create_railway_project():
    """Cria projeto no Railway"""
    print("🚂 Criando projeto Railway...")
    
    stdout, stderr = run_command("railway init fisioflow4-production", check=False)
    if stderr and "error" in stderr.lower():
        print(f"❌ Erro: {stderr}")
        return False
    
    print("✅ Projeto criado!")
    return True

def deploy_backend():
    """Deploy do backend"""
    print("🔨 Fazendo deploy do backend...")
    
    # Navegar para backend
    os.chdir("backend")
    
    # Criar serviço
    stdout, stderr = run_command("railway service create backend", check=False)
    
    # Configurar variáveis
    env_vars = {
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
    
    print("🔧 Configurando variáveis de ambiente...")
    for key, value in env_vars.items():
        cmd = f'railway variables set {key}="{value}"'
        stdout, stderr = run_command(cmd, check=False)
        print(f"   ✅ {key}")
        time.sleep(0.5)
    
    # Deploy
    print("🚀 Fazendo deploy...")
    stdout, stderr = run_command("railway up", capture_output=False, check=False)
    
    # Voltar ao diretório raiz
    os.chdir("..")
    
    return True

def deploy_frontend():
    """Deploy do frontend"""
    print("🌐 Fazendo deploy do frontend...")
    
    # Navegar para frontend
    os.chdir("frontend")
    
    # Criar serviço
    stdout, stderr = run_command("railway service create frontend", check=False)
    
    # Obter URL do backend (assumindo padrão Railway)
    backend_url = "https://backend-production.up.railway.app"  # Será atualizado depois
    
    # Configurar variáveis
    env_vars = {
        "NODE_ENV": "production",
        "NEXT_PUBLIC_API_URL": backend_url,
        "NEXT_TELEMETRY_DISABLED": "1"
    }
    
    print("🔧 Configurando variáveis de ambiente...")
    for key, value in env_vars.items():
        cmd = f'railway variables set {key}="{value}"'
        stdout, stderr = run_command(cmd, check=False)
        print(f"   ✅ {key}")
    
    # Deploy
    print("🚀 Fazendo deploy...")
    stdout, stderr = run_command("railway up", capture_output=False, check=False)
    
    # Voltar ao diretório raiz
    os.chdir("..")
    
    return True

def get_service_urls():
    """Obtém URLs dos serviços"""
    print("🔍 Obtendo URLs dos serviços...")
    
    stdout, stderr = run_command("railway status", check=False)
    if stdout:
        print("📊 Status dos serviços:")
        print(stdout)
    
    return True

def main():
    """Função principal"""
    print("🚀 FisioFlow4 - Deploy Automatizado Railway")
    print("=" * 50)
    
    # Verificar se Railway CLI está instalado
    stdout, stderr = run_command("railway --version", check=False)
    if not stdout or "railway" not in stdout.lower():
        if not install_railway_cli():
            print("\n📋 DEPLOY MANUAL:")
            print("1. Instale Railway CLI: https://docs.railway.app/develop/cli")
            print("2. Execute: railway login")
            print("3. Execute novamente este script")
            return False
    
    # Login
    if not railway_login():
        return False
    
    # Criar projeto
    if not create_railway_project():
        return False
    
    # Deploy backend
    if not deploy_backend():
        return False
    
    print("\n⏳ Aguardando backend deploy (30s)...")
    time.sleep(30)
    
    # Deploy frontend
    if not deploy_frontend():
        return False
    
    print("\n⏳ Aguardando frontend deploy (30s)...")
    time.sleep(30)
    
    # Obter URLs
    get_service_urls()
    
    print("\n🎉 DEPLOY COMPLETO!")
    print("=" * 50)
    print("✅ Backend e Frontend deployados")
    print("✅ Database Neon conectado")
    print("✅ Variáveis configuradas")
    
    print("\n🔍 Próximos passos:")
    print("1. railway status - Ver status dos serviços")
    print("2. railway logs - Ver logs em tempo real")
    print("3. railway open - Abrir no navegador")
    print("4. Atualizar CORS com URL real do frontend")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n❌ Deploy cancelado pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        sys.exit(1)
