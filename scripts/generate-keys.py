#!/usr/bin/env python3
"""
Script para gerar chaves seguras para o FisioFlow
Execute antes do primeiro deploy
"""

import secrets
import base64
from cryptography.fernet import Fernet

def generate_secure_key(length=32):
    """Gera uma chave segura"""
    return secrets.token_urlsafe(length)

def generate_encryption_key():
    """Gera chave de criptografia Fernet"""
    key = Fernet.generate_key()
    return base64.urlsafe_b64encode(key).decode()

def main():
    print("🔐 Gerador de Chaves Seguras - FisioFlow")
    print("=" * 50)
    
    # Gerar todas as chaves necessárias
    flask_secret = generate_secure_key(32)
    jwt_secret = generate_secure_key(64)
    encryption_key = generate_encryption_key()
    
    print("\n📋 VARIÁVEIS DE AMBIENTE PARA RAILWAY:")
    print("-" * 50)
    print(f"SECRET_KEY={flask_secret}")
    print(f"JWT_SECRET_KEY={jwt_secret}")
    print(f"ENCRYPTION_KEY={encryption_key}")
    
    print("\n💾 Salve estas chaves em local seguro!")
    print("📝 Copie e cole no Railway > Settings > Environment Variables")
    
    # Salvar em arquivo para backup
    with open('generated-keys.txt', 'w') as f:
        f.write("# CHAVES GERADAS - GUARDE EM LOCAL SEGURO!\n")
        f.write("# NÃO COMMITE ESTE ARQUIVO NO GIT!\n\n")
        f.write(f"SECRET_KEY={flask_secret}\n")
        f.write(f"JWT_SECRET_KEY={jwt_secret}\n")
        f.write(f"ENCRYPTION_KEY={encryption_key}\n")
    
    print(f"\n✅ Chaves salvas em: generated-keys.txt")
    print("⚠️  ATENÇÃO: NÃO commite este arquivo no Git!")

if __name__ == "__main__":
    main()