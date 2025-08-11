#!/usr/bin/env python3
"""
🚀 FisioFlow4 - Deploy Automatizado via APIs
Faz deploy completo no Railway usando APIs REST
"""

import requests
import json
import time
import os
import sys
from urllib.parse import urlparse

class RailwayDeployer:
    def __init__(self, api_token=None):
        self.api_token = api_token
        self.base_url = "https://backboard.railway.app/graphql"
        self.headers = {
            "Authorization": f"Bearer {api_token}" if api_token else "",
            "Content-Type": "application/json"
        }
        self.project_id = None
        self.backend_service_id = None
        self.frontend_service_id = None

    def get_auth_token(self):
        """Passo 1: Obter token de autenticação"""
        print("🔐 PASSO 1: Autenticação Railway")
        print("Você precisa obter um token de API do Railway:")
        print("1. Vá para: https://railway.app/account/tokens")
        print("2. Clique em 'Create New Token'")
        print("3. Cole o token abaixo:")
        
        token = input("Token Railway: ").strip()
        if not token:
            print("❌ Token é obrigatório!")
            sys.exit(1)
            
        self.api_token = token
        self.headers["Authorization"] = f"Bearer {token}"
        return token

    def create_project(self):
        """Passo 2: Criar projeto Railway"""
        print("\n🚂 PASSO 2: Criando projeto Railway...")
        
        query = """
        mutation {
          projectCreate(input: {
            name: "fisioflow4-production"
            description: "FisioFlow4 - Sistema de Fisioterapia"
            isPublic: false
          }) {
            id
            name
          }
        }
        """
        
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json={"query": query}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                print(f"❌ Erro: {data['errors']}")
                return False
                
            self.project_id = data['data']['projectCreate']['id']
            print(f"✅ Projeto criado: {data['data']['projectCreate']['name']}")
            print(f"   ID: {self.project_id}")
            return True
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            return False

    def connect_github_repo(self):
        """Passo 3: Conectar repositório GitHub"""
        print("\n📂 PASSO 3: Conectando repositório GitHub...")
        
        query = """
        mutation {
          serviceCreate(input: {
            projectId: "%s"
            source: {
              repo: "rafaelminatto1/fisioflow4"
              rootDirectory: "backend"
            }
          }) {
            id
            name
          }
        }
        """ % self.project_id
        
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json={"query": query}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                print(f"❌ Erro: {data['errors']}")
                return False
                
            self.backend_service_id = data['data']['serviceCreate']['id']
            print(f"✅ Backend service criado: {self.backend_service_id}")
            return True
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            return False

    def set_environment_variables(self, service_id, variables):
        """Configurar variáveis de ambiente"""
        print(f"\n🔧 Configurando variáveis de ambiente...")
        
        for key, value in variables.items():
            query = """
            mutation {
              variableUpsert(input: {
                projectId: "%s"
                serviceId: "%s"
                name: "%s"
                value: "%s"
              }) {
                id
                name
              }
            }
            """ % (self.project_id, service_id, key, value)
            
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json={"query": query}
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'errors' not in data:
                    print(f"   ✅ {key}")
                else:
                    print(f"   ❌ {key}: {data['errors']}")
            else:
                print(f"   ❌ {key}: HTTP {response.status_code}")
            
            time.sleep(0.5)  # Rate limiting

    def deploy_backend(self):
        """Passo 4: Deploy do Backend"""
        print("\n🔨 PASSO 4: Deploy do Backend...")
        
        # Variáveis do backend (do RAILWAY_DEPLOY_READY.md)
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
        
        self.set_environment_variables(self.backend_service_id, backend_vars)
        
        # Trigger deploy
        query = """
        mutation {
          serviceInstanceRedeploy(serviceId: "%s") {
            id
          }
        }
        """ % self.backend_service_id
        
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json={"query": query}
        )
        
        if response.status_code == 200:
            print("✅ Deploy do backend iniciado!")
            return True
        else:
            print(f"❌ Erro no deploy: {response.status_code}")
            return False

    def create_frontend_service(self):
        """Passo 5: Criar serviço do Frontend"""
        print("\n🌐 PASSO 5: Criando serviço Frontend...")
        
        query = """
        mutation {
          serviceCreate(input: {
            projectId: "%s"
            source: {
              repo: "rafaelminatto1/fisioflow4"
              rootDirectory: "frontend"
            }
          }) {
            id
            name
          }
        }
        """ % self.project_id
        
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json={"query": query}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                print(f"❌ Erro: {data['errors']}")
                return False
                
            self.frontend_service_id = data['data']['serviceCreate']['id']
            print(f"✅ Frontend service criado: {self.frontend_service_id}")
            return True
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            return False

    def deploy_frontend(self, backend_url):
        """Passo 6: Deploy do Frontend"""
        print("\n🎨 PASSO 6: Deploy do Frontend...")
        
        frontend_vars = {
            "NODE_ENV": "production",
            "NEXT_PUBLIC_API_URL": backend_url,
            "NEXT_TELEMETRY_DISABLED": "1"
        }
        
        self.set_environment_variables(self.frontend_service_id, frontend_vars)
        
        # Trigger deploy
        query = """
        mutation {
          serviceInstanceRedeploy(serviceId: "%s") {
            id
          }
        }
        """ % self.frontend_service_id
        
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json={"query": query}
        )
        
        if response.status_code == 200:
            print("✅ Deploy do frontend iniciado!")
            return True
        else:
            print(f"❌ Erro no deploy: {response.status_code}")
            return False

    def get_service_urls(self):
        """Passo 7: Obter URLs dos serviços"""
        print("\n🔍 PASSO 7: Obtendo URLs dos serviços...")
        
        query = """
        query {
          project(id: "%s") {
            services {
              edges {
                node {
                  id
                  name
                  domains {
                    domain
                  }
                }
              }
            }
          }
        }
        """ % self.project_id
        
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json={"query": query}
        )
        
        if response.status_code == 200:
            data = response.json()
            services = data['data']['project']['services']['edges']
            
            urls = {}
            for service in services:
                node = service['node']
                if node['domains']:
                    domain = node['domains'][0]['domain']
                    urls[node['id']] = f"https://{domain}"
            
            return urls
        
        return {}

    def update_cors(self, frontend_url):
        """Passo 8: Atualizar CORS do backend"""
        print(f"\n🔄 PASSO 8: Atualizando CORS com frontend URL: {frontend_url}")
        
        query = """
        mutation {
          variableUpsert(input: {
            projectId: "%s"
            serviceId: "%s"
            name: "CORS_ORIGINS"
            value: "%s"
          }) {
            id
            name
          }
        }
        """ % (self.project_id, self.backend_service_id, frontend_url)
        
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json={"query": query}
        )
        
        if response.status_code == 200:
            print("✅ CORS atualizado!")
            
            # Redeploy backend
            query = """
            mutation {
              serviceInstanceRedeploy(serviceId: "%s") {
                id
              }
            }
            """ % self.backend_service_id
            
            requests.post(self.base_url, headers=self.headers, json={"query": query})
            print("✅ Backend redeployado com novo CORS!")
            return True
        
        return False

def main():
    print("🚀 FisioFlow4 - Deploy Automatizado Railway")
    print("=" * 50)
    
    deployer = RailwayDeployer()
    
    # Passo 1: Autenticação
    deployer.get_auth_token()
    
    # Passo 2: Criar projeto
    if not deployer.create_project():
        sys.exit(1)
    
    # Passo 3: Criar backend service
    if not deployer.connect_github_repo():
        sys.exit(1)
    
    # Passo 4: Deploy backend
    if not deployer.deploy_backend():
        sys.exit(1)
    
    # Aguardar backend deploy
    print("\n⏳ Aguardando backend deploy (60s)...")
    time.sleep(60)
    
    # Passo 5: Criar frontend service
    if not deployer.create_frontend_service():
        sys.exit(1)
    
    # Obter URLs
    urls = deployer.get_service_urls()
    backend_url = urls.get(deployer.backend_service_id, "")
    
    if backend_url:
        print(f"🔗 Backend URL: {backend_url}")
        
        # Passo 6: Deploy frontend
        if deployer.deploy_frontend(backend_url):
            # Aguardar frontend deploy
            print("\n⏳ Aguardando frontend deploy (60s)...")
            time.sleep(60)
            
            # Obter URL do frontend
            urls = deployer.get_service_urls()
            frontend_url = urls.get(deployer.frontend_service_id, "")
            
            if frontend_url:
                print(f"🔗 Frontend URL: {frontend_url}")
                
                # Passo 8: Atualizar CORS
                deployer.update_cors(frontend_url)
                
                print("\n🎉 DEPLOY COMPLETO!")
                print("=" * 50)
                print(f"✅ Backend:  {backend_url}")
                print(f"✅ Frontend: {frontend_url}")
                print(f"✅ Database: Neon (conectado)")
                print("\n🔍 Próximos passos:")
                print("1. Teste o health check: {}/health".format(backend_url))
                print("2. Configure email SMTP real")
                print("3. Adicione domínio personalizado")
            else:
                print("❌ Não foi possível obter URL do frontend")
        else:
            print("❌ Falha no deploy do frontend")
    else:
        print("❌ Não foi possível obter URL do backend")

if __name__ == "__main__":
    main()
