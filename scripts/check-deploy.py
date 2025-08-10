#!/usr/bin/env python3
"""
Script para verificar se o deploy está funcionando corretamente
"""

import requests
import json
import sys
from urllib.parse import urljoin

def check_backend_health(backend_url):
    """Verifica se o backend está funcionando"""
    try:
        health_url = urljoin(backend_url, '/health')
        response = requests.get(health_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend Health: {data.get('status', 'unknown')}")
            return True
        else:
            print(f"❌ Backend Health Check Failed: {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"❌ Backend Connection Error: {e}")
        return False

def check_api_endpoints(backend_url):
    """Verifica endpoints principais da API"""
    endpoints = [
        '/api/v1',
        '/api/auth',
    ]
    
    results = []
    
    for endpoint in endpoints:
        try:
            url = urljoin(backend_url, endpoint)
            response = requests.get(url, timeout=5)
            
            if response.status_code in [200, 401, 403]:  # 401/403 são OK (sem auth)
                results.append(f"✅ {endpoint}: OK")
            else:
                results.append(f"❌ {endpoint}: Status {response.status_code}")
        except requests.RequestException as e:
            results.append(f"❌ {endpoint}: Error - {e}")
    
    return results

def check_frontend(frontend_url):
    """Verifica se o frontend está carregando"""
    try:
        response = requests.get(frontend_url, timeout=10)
        
        if response.status_code == 200:
            if 'FisioFlow' in response.text:
                print(f"✅ Frontend: Loading correctly")
                return True
            else:
                print(f"⚠️  Frontend: Loading but content might be wrong")
                return False
        else:
            print(f"❌ Frontend: Status {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"❌ Frontend Connection Error: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Uso: python check-deploy.py <backend_url> [frontend_url]")
        print("Exemplo: python check-deploy.py https://backend.railway.app https://frontend.railway.app")
        return
    
    backend_url = sys.argv[1]
    frontend_url = sys.argv[2] if len(sys.argv) > 2 else None
    
    print("🔍 Verificando Deploy do FisioFlow")
    print("=" * 40)
    
    # Check backend
    print("\n🔧 BACKEND:")
    backend_ok = check_backend_health(backend_url)
    
    if backend_ok:
        print("\n📡 API Endpoints:")
        api_results = check_api_endpoints(backend_url)
        for result in api_results:
            print(f"   {result}")
    
    # Check frontend
    if frontend_url:
        print(f"\n🌐 FRONTEND:")
        frontend_ok = check_frontend(frontend_url)
    else:
        frontend_ok = True  # Skip if not provided
    
    # Summary
    print("\n" + "=" * 40)
    if backend_ok and frontend_ok:
        print("🎉 Deploy Status: SUCESSO!")
        print("✅ Seu FisioFlow está funcionando corretamente")
    else:
        print("⚠️  Deploy Status: COM PROBLEMAS")
        print("❌ Verifique os erros acima e logs do Railway")
    
    print(f"\n📋 URLs:")
    print(f"   Backend: {backend_url}")
    if frontend_url:
        print(f"   Frontend: {frontend_url}")

if __name__ == "__main__":
    main()