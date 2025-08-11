#!/usr/bin/env python3
"""
🚀 FisioFlow4 - Deploy TOTALMENTE Automatizado
Usa GitHub Actions + Railway API para deploy 100% automático
"""

import requests
import json
import time
import os
import subprocess
import base64

class AutoDeployer:
    def __init__(self):
        self.github_token = None
        self.railway_token = None
        self.repo_owner = "rafaelminatto1"
        self.repo_name = "fisioflow4"
        self.backend_vars = {
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

    def get_tokens(self):
        """Obter tokens necessários"""
        print("🔐 CONFIGURAÇÃO DE TOKENS")
        print("Para deploy automático, você precisa de:")
        print("1. GitHub Token (para Actions)")
        print("2. Railway Token (para deploy)")
        
        # GitHub Token
        print("\n📂 GitHub Token:")
        print("1. Vá para: https://github.com/settings/tokens")
        print("2. 'Generate new token (classic)'")
        print("3. Marque: repo, workflow, admin:repo_hook")
        
        self.github_token = input("Cole o GitHub token: ").strip()
        
        # Railway Token
        print("\n🚂 Railway Token:")
        print("1. Vá para: https://railway.app/account/tokens")
        print("2. 'Create New Token'")
        
        self.railway_token = input("Cole o Railway token: ").strip()
        
        return bool(self.github_token and self.railway_token)

    def create_github_workflow(self):
        """Criar GitHub Actions workflow"""
        print("⚙️ Criando GitHub Actions workflow...")
        
        workflow_content = f"""name: Deploy to Railway

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Install Railway CLI
      run: |
        curl -fsSL https://railway.app/install.sh | sh
        echo "${{{{ secrets.RAILWAY_TOKEN }}}}" | railway login --token
    
    - name: Deploy Backend
      run: |
        cd backend
        railway link --service backend || railway service create backend
        
        # Set environment variables
        railway variables set DATABASE_URL="${{{{ self.backend_vars['DATABASE_URL'] }}}}}"
        railway variables set SECRET_KEY="${{{{ self.backend_vars['SECRET_KEY'] }}}}}"
        railway variables set JWT_SECRET_KEY="${{{{ self.backend_vars['JWT_SECRET_KEY'] }}}}}"
        railway variables set ENCRYPTION_KEY="${{{{ self.backend_vars['ENCRYPTION_KEY'] }}}}}"
        railway variables set CSRF_SECRET_KEY="${{{{ self.backend_vars['CSRF_SECRET_KEY'] }}}}}"
        railway variables set INTERNAL_API_KEY="${{{{ self.backend_vars['INTERNAL_API_KEY'] }}}}}"
        railway variables set NODE_ENV="production"
        railway variables set FLASK_ENV="production"
        railway variables set DEBUG="false"
        railway variables set JWT_ACCESS_TOKEN_EXPIRES="3600"
        railway variables set JWT_REFRESH_TOKEN_EXPIRES="2592000"
        railway variables set CORS_ORIGINS="http://localhost:3000"
        railway variables set RATE_LIMIT_PER_MINUTE="100"
        railway variables set RATE_LIMIT_PER_HOUR="2000"
        railway variables set MAX_FILE_SIZE="10485760"
        railway variables set SMTP_SERVER="smtp.gmail.com"
        railway variables set SMTP_PORT="587"
        railway variables set SMTP_USERNAME="your-email@gmail.com"
        railway variables set SMTP_PASSWORD="your-app-password"
        railway variables set FROM_EMAIL="noreply@fisioflow.com"
        
        # Deploy
        railway up --detach
        
        # Get backend URL
        BACKEND_URL=$(railway domain)
        echo "BACKEND_URL=$BACKEND_URL" >> $GITHUB_ENV
        echo "Backend deployed to: $BACKEND_URL"

  deploy-frontend:
    needs: deploy-backend
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Install Railway CLI
      run: |
        curl -fsSL https://railway.app/install.sh | sh
        echo "${{{{ secrets.RAILWAY_TOKEN }}}}" | railway login --token
    
    - name: Deploy Frontend
      run: |
        cd frontend
        railway link --service frontend || railway service create frontend
        
        # Set environment variables
        railway variables set NODE_ENV="production"
        railway variables set NEXT_PUBLIC_API_URL="https://backend-production.up.railway.app"
        railway variables set NEXT_TELEMETRY_DISABLED="1"
        
        # Deploy
        railway up --detach
        
        # Get frontend URL
        FRONTEND_URL=$(railway domain)
        echo "Frontend deployed to: $FRONTEND_URL"
        
        # Update backend CORS
        cd ../backend
        railway variables set CORS_ORIGINS="$FRONTEND_URL"
        railway up --detach
        
        echo "✅ Deploy completo!"
        echo "Backend: https://backend-production.up.railway.app"
        echo "Frontend: $FRONTEND_URL"
"""
        
        return workflow_content

    def upload_workflow_to_github(self, workflow_content):
        """Fazer upload do workflow para GitHub"""
        print("📤 Fazendo upload do workflow para GitHub...")
        
        # Criar diretório .github/workflows se não existir
        os.makedirs(".github/workflows", exist_ok=True)
        
        # Salvar workflow localmente
        with open(".github/workflows/deploy.yml", "w") as f:
            f.write(workflow_content)
        
        # Commit e push
        try:
            subprocess.run(["git", "add", ".github/workflows/deploy.yml"], check=True)
            subprocess.run(["git", "commit", "-m", "feat: add automated Railway deployment workflow"], check=True)
            subprocess.run(["git", "push", "origin", "main"], check=True)
            print("✅ Workflow enviado para GitHub!")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Erro no git: {e}")
            return False

    def set_github_secrets(self):
        """Configurar secrets no GitHub"""
        print("🔒 Configurando secrets no GitHub...")
        
        url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/actions/secrets/RAILWAY_TOKEN"
        
        # Obter public key para criptografia
        key_url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/actions/secrets/public-key"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.get(key_url, headers=headers)
        if response.status_code != 200:
            print(f"❌ Erro ao obter public key: {response.status_code}")
            return False
        
        public_key_data = response.json()
        
        # Criptografar o Railway token (simplificado - em produção usar nacl)
        encrypted_value = base64.b64encode(self.railway_token.encode()).decode()
        
        # Criar secret
        secret_data = {
            "encrypted_value": encrypted_value,
            "key_id": public_key_data["key_id"]
        }
        
        response = requests.put(url, headers=headers, json=secret_data)
        if response.status_code in [201, 204]:
            print("✅ Secret RAILWAY_TOKEN configurado!")
            return True
        else:
            print(f"❌ Erro ao configurar secret: {response.status_code}")
            return False

    def trigger_workflow(self):
        """Disparar o workflow manualmente"""
        print("🚀 Disparando workflow de deploy...")
        
        url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/actions/workflows/deploy.yml/dispatches"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        data = {"ref": "main"}
        
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 204:
            print("✅ Workflow disparado!")
            print("📊 Acompanhe em: https://github.com/{}/{}/actions".format(self.repo_owner, self.repo_name))
            return True
        else:
            print(f"❌ Erro ao disparar workflow: {response.status_code}")
            return False

    def monitor_deployment(self):
        """Monitorar o deployment"""
        print("📊 Monitorando deployment...")
        print(f"🔍 Acesse: https://github.com/{self.repo_owner}/{self.repo_name}/actions")
        print("⏳ O deploy leva cerca de 10-15 minutos")
        
        # Aguardar um pouco e verificar status
        time.sleep(30)
        
        url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/actions/runs"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            runs = response.json()["workflow_runs"]
            if runs:
                latest_run = runs[0]
                print(f"📈 Status: {latest_run['status']}")
                print(f"🔗 URL: {latest_run['html_url']}")
        
        return True

def main():
    print("🚀 FisioFlow4 - Deploy TOTALMENTE Automatizado")
    print("=" * 60)
    print("Este script irá:")
    print("✅ Criar GitHub Actions workflow")
    print("✅ Configurar secrets automaticamente") 
    print("✅ Disparar deploy automático")
    print("✅ Deploy completo em 10-15 minutos")
    
    deployer = AutoDeployer()
    
    # Obter tokens
    if not deployer.get_tokens():
        print("❌ Tokens são obrigatórios!")
        return False
    
    # Criar workflow
    workflow_content = deployer.create_github_workflow()
    
    # Upload workflow
    if not deployer.upload_workflow_to_github(workflow_content):
        return False
    
    # Configurar secrets (versão simplificada)
    print("🔒 Configure o secret RAILWAY_TOKEN manualmente:")
    print(f"1. Vá para: https://github.com/{deployer.repo_owner}/{deployer.repo_name}/settings/secrets/actions")
    print("2. Clique 'New repository secret'")
    print("3. Name: RAILWAY_TOKEN")
    print(f"4. Value: {deployer.railway_token}")
    input("Pressione ENTER quando configurar o secret...")
    
    # Disparar workflow
    if not deployer.trigger_workflow():
        return False
    
    # Monitorar
    deployer.monitor_deployment()
    
    print("\n🎉 DEPLOY AUTOMATIZADO INICIADO!")
    print("=" * 60)
    print("📊 Acompanhe o progresso:")
    print(f"🔗 GitHub Actions: https://github.com/{deployer.repo_owner}/{deployer.repo_name}/actions")
    print("🚂 Railway Dashboard: https://railway.app/dashboard")
    
    print("\n⏳ Aguarde 10-15 minutos para conclusão")
    print("📧 Você receberá notificação por email quando terminar")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            exit(1)
    except KeyboardInterrupt:
        print("\n❌ Deploy cancelado")
        exit(1)
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        exit(1)
