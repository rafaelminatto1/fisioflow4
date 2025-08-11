#!/usr/bin/env python3
"""
FisioFlow4 - Script de Deploy Automático Railway
Automatiza o processo de deploy no Railway com verificações
"""

import json
import subprocess
import sys
import time
import requests
from pathlib import Path

class RailwayDeployer:
    def __init__(self):
        self.backend_vars = {
            "DATABASE_URL": "postgresql://neondb_owner:npg_p7LXBZvaMF0f@ep-shiny-dawn-ae4085f3-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
            "SECRET_KEY": "heBjDRgC34A7x8wZOyUyDgCKzbLRMhyOW1R6wPFiIxYehht1GZN6DTeaoG6ymVZ1_AbqAkXeYEzRxEG0Hqj1xQ",
            "JWT_SECRET_KEY": "msZkQoqAMxwntH3165kRZvG5uxd3iSF5NCm8ElpmOEa_xWa9Z_W0iWX95KznZ20sjvDvv0eA4usrO4wcm9EVog",
            "ENCRYPTION_KEY": "InLok05QMKs1sa6/nejNSaUm42acvRPo9B8hF4iHU48=",
            "CSRF_SECRET_KEY": "57b1a63a65e1fb2c51fa0f7baee510dca02087420186b052d5413ed7d431bfad",
            "INTERNAL_API_KEY": "fisiflow_api_4bxmcH9yrRpk4tsSgZeLizl6bH6dpdWbw5Oo0WGajB0",
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
        
    def check_railway_cli(self):
        """Verificar se Railway CLI está instalado"""
        try:
            result = subprocess.run(['railway', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"Railway CLI instalado: {result.stdout.strip()}")
                return True
        except FileNotFoundError:
            print("Railway CLI nao encontrado")
            return False
        
    def check_git_status(self):
        """Verificar status do Git"""
        try:
            result = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True)
            if result.stdout.strip():
                print("Ha mudancas nao commitadas no Git:")
                print(result.stdout)
                return False
            else:
                print("Git status limpo")
                return True
        except:
            print("Erro ao verificar Git status")
            return False
            
    def get_railway_projects(self):
        """Listar projetos Railway"""
        try:
            result = subprocess.run(['railway', 'list'], capture_output=True, text=True)
            if result.returncode == 0:
                print("Projetos Railway disponiveis:")
                print(result.stdout)
                return True
        except:
            print("Erro ao listar projetos Railway")
            return False
    
    def deploy_backend(self):
        """Deploy do backend"""
        print("\nIniciando deploy do backend...")
        
        # Ir para diretório backend
        backend_path = Path("backend")
        if not backend_path.exists():
            print("Diretorio backend/ nao encontrado")
            return False
            
        try:
            # Criar novo projeto ou usar existente
            print("1. Criando/Conectando projeto Railway...")
            
            # Para Railway CLI, seria necessário fazer login interativo
            print("ACAO MANUAL NECESSARIA:")
            print("1. Acesse: https://railway.app/dashboard")
            print("2. Clique 'New Project' -> 'Deploy from GitHub repo'")
            print("3. Selecione o repositorio fisioflow4")
            print("4. Root Directory: 'backend/'")
            print("5. Aguarde o build automatico")
            
            return True
            
        except Exception as e:
            print(f"Erro no deploy backend: {e}")
            return False
    
    def deploy_frontend(self):
        """Deploy do frontend"""
        print("\nIniciando deploy do frontend...")
        
        frontend_path = Path("frontend")
        if not frontend_path.exists():
            print("Diretorio frontend/ nao encontrado")
            return False
            
        try:
            print("ACAO MANUAL NECESSARIA:")
            print("1. No mesmo projeto Railway, clique '+ New Service'")
            print("2. 'GitHub Repo' -> mesmo repositorio")
            print("3. Root Directory: 'frontend/'")
            print("4. Aguarde o build automatico")
            
            return True
            
        except Exception as e:
            print(f"Erro no deploy frontend: {e}")
            return False
    
    def verify_backend_health(self, url):
        """Verificar saúde do backend"""
        try:
            print(f"\nTestando backend: {url}/health")
            response = requests.get(f"{url}/health", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                print("Backend respondendo corretamente:")
                print(f"   Status: {data.get('status')}")
                print(f"   Database: {data.get('database')}")
                print(f"   Timestamp: {data.get('timestamp')}")
                return True
            else:
                print(f"Backend retornou status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"Erro ao testar backend: {e}")
            return False
    
    def print_environment_variables(self):
        """Imprimir variáveis de ambiente para copiar"""
        print("\nVARIAVEIS DE AMBIENTE PARA RAILWAY BACKEND:")
        print("=" * 60)
        
        for key, value in self.backend_vars.items():
            print(f"{key}={value}")
            
        print("\nVARIAVEIS DE AMBIENTE PARA RAILWAY FRONTEND:")
        print("=" * 60)
        print("NODE_ENV=production")
        print("NEXT_PUBLIC_API_URL=https://sua-backend-url.up.railway.app")
        print("NEXT_TELEMETRY_DISABLED=1")
        
    def run_deployment(self):
        """Executar processo completo de deploy"""
        print("FisioFlow4 - Deploy Railway Automatico")
        print("=" * 60)
        
        # Verificações preliminares
        if not self.check_railway_cli():
            print("Instale o Railway CLI: npm install -g @railway/cli")
            return False
            
        if not self.check_git_status():
            print("Commit suas mudancas antes de fazer deploy")
            return False
        
        # Imprimir variáveis
        self.print_environment_variables()
        
        # Deploy (manual via Railway Dashboard)
        print("\nPROCESSO DE DEPLOY:")
        print("=" * 60)
        
        print("1. BACKEND DEPLOY:")
        self.deploy_backend()
        
        print("\n2. FRONTEND DEPLOY:")  
        self.deploy_frontend()
        
        print("\n3. CONFIGURAR VARIAVEIS:")
        print("   - Cole as variaveis acima no Railway Dashboard")
        print("   - Backend: Variables tab do servico backend")
        print("   - Frontend: Variables tab do servico frontend")
        
        print("\n4. TESTAR DEPLOY:")
        print("   - Aguarde builds completarem")
        print("   - Teste /health endpoint do backend")
        print("   - Acesse frontend URL")
        print("   - Atualize CORS_ORIGINS no backend")
        
        print("\nDEPLOY PREPARADO!")
        print("Acesse: https://railway.app/dashboard")
        
        return True

def main():
    deployer = RailwayDeployer()
    success = deployer.run_deployment()
    
    if success:
        print("\nScript executado com sucesso!")
        print("Siga as instrucoes manuais acima")
        print("Railway Dashboard: https://railway.app/dashboard")
    else:
        print("\nFalha na execucao do script")
        sys.exit(1)

if __name__ == "__main__":
    main()