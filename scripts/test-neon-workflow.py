#!/usr/bin/env python3
"""
Script de teste para validar a configuração do workflow do Neon Database
"""

import os
import sys
from pathlib import Path

def check_environment():
    """Verifica se as variáveis de ambiente necessárias estão configuradas"""
    print("🔍 Verificando configuração do ambiente...")
    
    required_vars = ['DATABASE_URL']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Variáveis de ambiente faltando: {', '.join(missing_vars)}")
        print("   Configure estas variáveis no seu arquivo .env ou ambiente")
        return False
    
    print("✅ Todas as variáveis de ambiente estão configuradas")
    return True

def check_alembic_config():
    """Verifica se a configuração do Alembic está correta"""
    print("\n🔍 Verificando configuração do Alembic...")
    
    alembic_dir = Path("backend/alembic")
    if not alembic_dir.exists():
        print("❌ Diretório alembic não encontrado")
        return False
    
    env_file = alembic_dir / "env.py"
    if not env_file.exists():
        print("❌ Arquivo env.py do Alembic não encontrado")
        return False
    
    print("✅ Configuração do Alembic encontrada")
    return True

def check_github_workflow():
    """Verifica se o workflow do GitHub Actions está configurado"""
    print("\n🔍 Verificando workflow do GitHub Actions...")
    
    workflow_dir = Path(".github/workflows")
    if not workflow_dir.exists():
        print("❌ Diretório .github/workflows não encontrado")
        return False
    
    neon_workflow = workflow_dir / "neon_workflow.yml"
    if not neon_workflow.exists():
        print("❌ Arquivo neon_workflow.yml não encontrado")
        return False
    
    print("✅ Workflow do GitHub Actions encontrado")
    return True

def check_dependencies():
    """Verifica se as dependências necessárias estão no requirements.txt"""
    print("\n🔍 Verificando dependências...")
    
    requirements_file = Path("backend/requirements.txt")
    if not requirements_file.exists():
        print("❌ Arquivo requirements.txt não encontrado")
        return False
    
    with open(requirements_file, 'r') as f:
        content = f.read()
    
    required_deps = ['Flask-Migrate', 'psycopg2-binary', 'SQLAlchemy']
    missing_deps = []
    
    for dep in required_deps:
        if dep not in content:
            missing_deps.append(dep)
    
    if missing_deps:
        print(f"❌ Dependências faltando: {', '.join(missing_deps)}")
        return False
    
    print("✅ Todas as dependências necessárias estão presentes")
    return True

def main():
    """Função principal"""
    print("🚀 Testando configuração do workflow Neon Database\n")
    
    checks = [
        check_environment,
        check_alembic_config,
        check_github_workflow,
        check_dependencies
    ]
    
    passed = 0
    total = len(checks)
    
    for check in checks:
        if check():
            passed += 1
    
    print(f"\n📊 Resultado: {passed}/{total} verificações passaram")
    
    if passed == total:
        print("🎉 Configuração está pronta para uso!")
        print("\n📋 Próximos passos:")
        print("1. Configure NEON_PROJECT_ID nas variáveis do repositório")
        print("2. Configure NEON_API_KEY nos secrets do repositório")
        print("3. Faça um Pull Request para testar o workflow")
    else:
        print("⚠️  Algumas verificações falharam. Corrija os problemas antes de continuar.")
        sys.exit(1)

if __name__ == "__main__":
    main()
