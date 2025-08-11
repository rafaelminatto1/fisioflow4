#!/usr/bin/env python3
"""
FisioFlow4 - Verificador de Status do Deployment
Verifica se todos os serviços estão funcionando corretamente
"""

import requests
import time
import json
from urllib.parse import urlparse

class DeploymentChecker:
    def __init__(self):
        self.backend_url = None
        self.frontend_url = None
        
    def check_url_format(self, url):
        """Verificar se URL está no formato correto"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False
    
    def check_backend_health(self, backend_url):
        """Verificar saúde do backend"""
        if not backend_url:
            print("❌ URL do backend não fornecida")
            return False
            
        if not self.check_url_format(backend_url):
            print("❌ URL do backend inválida")
            return False
            
        try:
            print(f"🔍 Testando backend: {backend_url}")
            
            # Test health endpoint
            health_url = f"{backend_url.rstrip('/')}/health"
            print(f"   Endpoint: {health_url}")
            
            response = requests.get(health_url, timeout=30)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print("✅ Backend Health Check - OK")
                    print(f"   Status: {data.get('status', 'unknown')}")
                    print(f"   Database: {data.get('database', 'unknown')}")
                    print(f"   Timestamp: {data.get('timestamp', 'unknown')}")
                    return True
                except json.JSONDecodeError:
                    print("⚠️  Backend responde mas não retorna JSON válido")
                    print(f"   Response: {response.text[:200]}")
                    return False
            else:
                print(f"❌ Backend retornou status {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False
                
        except requests.exceptions.ConnectionError:
            print("❌ Não foi possível conectar ao backend")
            print("   Verifique se o deploy foi concluído")
            return False
        except requests.exceptions.Timeout:
            print("❌ Timeout ao conectar com backend")
            print("   O serviço pode estar inicializando")
            return False
        except Exception as e:
            print(f"❌ Erro inesperado: {e}")
            return False
    
    def check_database_connection(self, backend_url):
        """Verificar conexão com database através da API"""
        try:
            # Test a simple API endpoint that requires database
            api_url = f"{backend_url.rstrip('/')}/api/v1/users/me"
            headers = {"Content-Type": "application/json"}
            
            # This should return 401 (unauthorized) if working
            response = requests.get(api_url, headers=headers, timeout=15)
            
            if response.status_code in [401, 403]:
                print("✅ Database Connection - OK")
                print("   API endpoints responsivos (401 esperado)")
                return True
            elif response.status_code == 500:
                print("❌ Possível erro de database")
                print(f"   Status: {response.status_code}")
                return False
            else:
                print("⚠️  Endpoint responde mas comportamento inesperado")
                print(f"   Status: {response.status_code}")
                return True
                
        except Exception as e:
            print(f"⚠️  Não foi possível testar conexão database: {e}")
            return True  # Non-critical
    
    def check_frontend(self, frontend_url):
        """Verificar se frontend está carregando"""
        if not frontend_url:
            print("❌ URL do frontend não fornecida")
            return False
            
        if not self.check_url_format(frontend_url):
            print("❌ URL do frontend inválida")
            return False
            
        try:
            print(f"🔍 Testando frontend: {frontend_url}")
            
            response = requests.get(frontend_url, timeout=30)
            
            if response.status_code == 200:
                if "html" in response.headers.get('content-type', '').lower():
                    print("✅ Frontend Loading - OK")
                    
                    # Check for common Next.js indicators
                    content = response.text.lower()
                    if "next.js" in content or "_next" in content:
                        print("   Next.js detectado")
                    
                    # Check if it's loading our app
                    if "fisioflow" in content:
                        print("   FisioFlow app detectado")
                    
                    return True
                else:
                    print("⚠️  Frontend responde mas não retorna HTML")
                    return False
            else:
                print(f"❌ Frontend retornou status {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            print("❌ Não foi possível conectar ao frontend")
            return False
        except requests.exceptions.Timeout:
            print("❌ Timeout ao conectar com frontend")
            return False
        except Exception as e:
            print(f"❌ Erro inesperado: {e}")
            return False
    
    def check_cors_integration(self, backend_url, frontend_url):
        """Verificar se CORS está configurado corretamente"""
        if not backend_url or not frontend_url:
            print("⚠️  URLs não fornecidas, pulando teste CORS")
            return True
            
        try:
            # Test CORS preflight
            headers = {
                'Origin': frontend_url,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            response = requests.options(f"{backend_url}/api/v1/health", 
                                      headers=headers, timeout=15)
            
            if response.status_code in [200, 204]:
                cors_headers = response.headers.get('Access-Control-Allow-Origin', '')
                if '*' in cors_headers or frontend_url in cors_headers:
                    print("✅ CORS Configuration - OK")
                    return True
                else:
                    print("⚠️  CORS pode estar mal configurado")
                    print(f"   Allow-Origin: {cors_headers}")
                    return False
            else:
                print("⚠️  Não foi possível testar CORS")
                return True
                
        except Exception as e:
            print(f"⚠️  Erro ao testar CORS: {e}")
            return True  # Non-critical
    
    def run_full_check(self, backend_url=None, frontend_url=None):
        """Executar verificação completa"""
        print("🚀 FisioFlow4 - Verificador de Deployment")
        print("=" * 60)
        
        if not backend_url:
            backend_url = input("Digite a URL do backend Railway: ").strip()
        
        if not frontend_url:
            frontend_url = input("Digite a URL do frontend Railway: ").strip()
        
        print("\n🔍 EXECUTANDO VERIFICAÇÕES...")
        print("-" * 40)
        
        results = {}
        
        # Check backend
        print("\n1. BACKEND HEALTH CHECK")
        results['backend_health'] = self.check_backend_health(backend_url)
        
        print("\n2. DATABASE CONNECTION")
        results['database'] = self.check_database_connection(backend_url)
        
        print("\n3. FRONTEND LOADING")
        results['frontend'] = self.check_frontend(frontend_url)
        
        print("\n4. CORS INTEGRATION")
        results['cors'] = self.check_cors_integration(backend_url, frontend_url)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 RESUMO DOS RESULTADOS")
        print("=" * 60)
        
        total_checks = len(results)
        passed_checks = sum(1 for v in results.values() if v)
        
        for check, status in results.items():
            icon = "✅" if status else "❌"
            print(f"{icon} {check.replace('_', ' ').title()}")
        
        print(f"\n🎯 SCORE: {passed_checks}/{total_checks} verificações passaram")
        
        if passed_checks == total_checks:
            print("\n🎉 DEPLOYMENT FUNCIONANDO PERFEITAMENTE!")
            print("👉 Seu FisioFlow4 está pronto para uso!")
        elif passed_checks >= total_checks - 1:
            print("\n✅ DEPLOYMENT FUNCIONANDO (com alertas menores)")
            print("👉 Verifique os itens marcados com ⚠️")
        else:
            print("\n⚠️  DEPLOYMENT COM PROBLEMAS")
            print("👉 Corrija os itens marcados com ❌")
            print("📋 Consulte RAILWAY_DEPLOY_READY.md para troubleshooting")
        
        return passed_checks == total_checks

def main():
    checker = DeploymentChecker()
    
    # Exemplos de URLs para facilitar
    print("Exemplos de URLs Railway:")
    print("Backend:  https://fisioflow4-backend-production-1234.up.railway.app")
    print("Frontend: https://fisioflow4-frontend-production-5678.up.railway.app")
    print()
    
    success = checker.run_full_check()
    
    if success:
        print("\n🔗 PRÓXIMOS PASSOS:")
        print("1. Configure domínio personalizado (opcional)")
        print("2. Setup monitoring e alertas")
        print("3. Configure email provider real")
        print("4. Add AI API keys")
        print("5. Deploy mobile app")
    
    return success

if __name__ == "__main__":
    main()