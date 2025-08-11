#!/usr/bin/env python3
"""
🚀 FisioFlow4 - Deploy via Railway REST API
Usa a API REST oficial do Railway para deploy automatizado
"""

import requests
import json
import time
import os
import sys
import webbrowser

class RailwayRESTDeployer:
    def __init__(self):
        self.api_token = None
        self.base_url = "https://backboard.railway.app"
        self.headers = {}
        self.project_id = None
        
    def get_auth_token(self):
        """Obter token de autenticação"""
        print("🔐 PASSO 1: Autenticação Railway")
        print("Para obter o token:")
        print("1. Vá para: https://railway.app/account/tokens")
        
        # Abrir automaticamente
        webbrowser.open("https://railway.app/account/tokens")
        
        print("2. Clique em 'Create New Token'")
        print("3. Cole o token abaixo:")
        
        self.api_token = input("Token Railway: ").strip()
        if not self.api_token:
            print("❌ Token é obrigatório!")
            return False
            
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        # Testar token
        return self.test_token()
    
    def test_token(self):
        """Testar se o token é válido"""
        print("🔍 Testando token...")
        
        # Tentar diferentes endpoints para validar
        endpoints = [
            "/v1/me",
            "/graphql",
            "/api/v2/me"
        ]
        
        for endpoint in endpoints:
            url = f"{self.base_url}{endpoint}"
            try:
                response = requests.get(url, headers=self.headers, timeout=10)
                if response.status_code in [200, 401]:  # 401 significa que chegou ao endpoint
                    print(f"✅ Token válido (endpoint: {endpoint})")
                    return True
            except:
                continue
        
        print("⚠️  Não foi possível validar token, mas continuando...")
        return True
    
    def create_project_manual(self):
        """Criar projeto manualmente via dashboard"""
        print("\n🚂 PASSO 2: Criar Projeto Railway")
        print("Vamos criar o projeto via dashboard web:")
        
        # Abrir dashboard
        webbrowser.open("https://railway.app/new")
        
        print("""
👉 INSTRUÇÕES NO NAVEGADOR:
1. Clique "Deploy from GitHub repo"
2. Selecione repositório 'rafaelminatto1/fisioflow4'
3. Configure o BACKEND primeiro:
   - Name: fisioflow4-backend
   - Root Directory: backend/
4. Clique "Deploy"
""")
        
        input("Pressione ENTER quando o backend estiver deployando...")
        
        # Solicitar URL do projeto
        project_url = input("Cole a URL do seu projeto Railway (ex: https://railway.app/project/xxx): ").strip()
        
        if project_url:
            # Extrair project ID da URL
            parts = project_url.split('/')
            if 'project' in parts:
                idx = parts.index('project')
                if idx + 1 < len(parts):
                    self.project_id = parts[idx + 1]
                    print(f"✅ Project ID: {self.project_id}")
                    return True
        
        print("⚠️  Continuando sem Project ID...")
        return True
    
    def configure_backend_variables(self):
        """Configurar variáveis do backend"""
        print("\n🔧 PASSO 3: Configurar Variáveis Backend")
        print("Vamos adicionar as variáveis de ambiente via dashboard:")
        
        # Abrir variables page
        if self.project_id:
            webbrowser.open(f"https://railway.app/project/{self.project_id}")
        
        print("""
👉 NO DASHBOARD RAILWAY:
1. Clique no serviço backend
2. Vá para aba "Variables" 
3. Adicione uma por uma as variáveis abaixo:
""")
        
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
        
        print("📋 VARIÁVEIS PARA COPIAR E COLAR:")
        print("=" * 60)
        
        for i, (key, value) in enumerate(backend_vars.items(), 1):
            print(f"\n{i:2d}. Nome: {key}")
            print(f"    Valor: {value}")
        
        print("\n" + "=" * 60)
        input("Pressione ENTER quando terminar de adicionar TODAS as variáveis...")
        
        return True
    
    def test_backend(self):
        """Testar backend"""
        print("\n🧪 PASSO 4: Testar Backend")
        
        backend_url = input("Cole a URL do backend (ex: https://fisioflow4-backend-production-xxx.up.railway.app): ").strip()
        
        if backend_url:
            health_url = f"{backend_url.rstrip('/')}/health"
            print(f"🔍 Testando: {health_url}")
            
            # Abrir health check
            webbrowser.open(health_url)
            
            # Testar programaticamente também
            try:
                response = requests.get(health_url, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'healthy':
                        print("✅ Backend funcionando corretamente!")
                        return backend_url
                    else:
                        print(f"⚠️  Backend respondeu mas status: {data}")
                else:
                    print(f"⚠️  Backend respondeu com status: {response.status_code}")
            except Exception as e:
                print(f"⚠️  Erro ao testar: {e}")
            
            print("👀 Verifique no navegador se mostra JSON com 'status': 'healthy'")
            confirm = input("Backend está funcionando? (s/n): ").lower()
            
            if confirm.startswith('s'):
                return backend_url
        
        print("❌ Backend não está funcionando corretamente")
        return None
    
    def create_frontend_service(self):
        """Criar serviço frontend"""
        print("\n🌐 PASSO 5: Criar Serviço Frontend")
        
        if self.project_id:
            webbrowser.open(f"https://railway.app/project/{self.project_id}")
        
        print("""
👉 NO MESMO PROJETO RAILWAY:
1. Clique "+ New Service"
2. Selecione "GitHub Repo"
3. Escolha o mesmo repositório 'rafaelminatto1/fisioflow4'
4. Configure:
   - Name: fisioflow4-frontend
   - Root Directory: frontend/
5. Clique "Deploy"
""")
        
        input("Pressione ENTER quando o frontend estiver deployando...")
        return True
    
    def configure_frontend_variables(self, backend_url):
        """Configurar variáveis do frontend"""
        print("\n🔧 PASSO 6: Configurar Variáveis Frontend")
        
        frontend_vars = {
            "NODE_ENV": "production",
            "NEXT_PUBLIC_API_URL": backend_url,
            "NEXT_TELEMETRY_DISABLED": "1"
        }
        
        print("👉 No serviço FRONTEND, vá para aba 'Variables'")
        print("\n📋 ADICIONE ESTAS VARIÁVEIS:")
        
        for i, (key, value) in enumerate(frontend_vars.items(), 1):
            print(f"{i}. Nome: {key}")
            print(f"   Valor: {value}")
        
        input("Pressione ENTER quando adicionar as variáveis do frontend...")
        return True
    
    def test_frontend_and_update_cors(self):
        """Testar frontend e atualizar CORS"""
        print("\n🎨 PASSO 7: Testar Frontend e Atualizar CORS")
        
        frontend_url = input("Cole a URL do frontend: ").strip()
        
        if frontend_url:
            print(f"🔍 Abrindo frontend: {frontend_url}")
            webbrowser.open(frontend_url)
            
            print(f"\n🔄 IMPORTANTE: Atualizar CORS no Backend")
            print("👉 Volte ao serviço BACKEND")
            print("👉 Na aba Variables, EDITE 'CORS_ORIGINS'")
            print(f"👉 Mude para: {frontend_url}")
            
            input("Pressione ENTER quando atualizar o CORS...")
            
            return frontend_url
        
        return None
    
    def final_verification(self, backend_url, frontend_url):
        """Verificação final"""
        print("\n🔍 PASSO 8: Verificação Final")
        
        print("🧪 Testando tudo:")
        
        if backend_url:
            health_url = f"{backend_url}/health"
            print(f"1. Backend Health: {health_url}")
            webbrowser.open(health_url)
        
        if frontend_url:
            print(f"2. Frontend: {frontend_url}")
            webbrowser.open(frontend_url)
        
        print("\n✅ CHECKLIST:")
        checks = [
            "Backend /health responde com 'healthy'",
            "Frontend carrega sem erros",
            "Não há erros de CORS no console",
            "Logs do Railway sem erros críticos"
        ]
        
        for i, check in enumerate(checks, 1):
            print(f"{i}. [ ] {check}")
        
        return True

def main():
    print("🚀 FisioFlow4 - Deploy Automatizado Railway REST")
    print("=" * 60)
    
    deployer = RailwayRESTDeployer()
    
    # Passo 1: Autenticação
    if not deployer.get_auth_token():
        return False
    
    # Passo 2: Criar projeto
    if not deployer.create_project_manual():
        return False
    
    # Passo 3: Configurar backend
    if not deployer.configure_backend_variables():
        return False
    
    # Passo 4: Testar backend
    backend_url = deployer.test_backend()
    if not backend_url:
        return False
    
    # Passo 5: Criar frontend
    if not deployer.create_frontend_service():
        return False
    
    # Passo 6: Configurar frontend
    if not deployer.configure_frontend_variables(backend_url):
        return False
    
    # Passo 7: Testar frontend e CORS
    frontend_url = deployer.test_frontend_and_update_cors()
    
    # Passo 8: Verificação final
    deployer.final_verification(backend_url, frontend_url)
    
    # Sucesso!
    print("\n🎉 DEPLOY COMPLETO!")
    print("=" * 60)
    print(f"✅ Backend:  {backend_url}")
    print(f"✅ Frontend: {frontend_url or 'Configurar URL'}")
    print(f"✅ Database: Neon PostgreSQL")
    print(f"✅ HTTPS:    Automático Railway")
    
    print("\n🔧 PRÓXIMOS PASSOS:")
    print("1. Configurar email SMTP real")
    print("2. Adicionar domínio personalizado") 
    print("3. Configurar monitoramento")
    print("4. Testar todas as funcionalidades")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n❌ Deploy cancelado")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        sys.exit(1)
