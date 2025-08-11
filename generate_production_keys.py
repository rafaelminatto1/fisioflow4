#!/usr/bin/env python3
"""
FisioFlow4 - Gerador de Chaves de Segurança para Produção
Gera todas as chaves necessárias para deploy em produção
"""

import secrets
import base64
import os
from datetime import datetime

def generate_secret_key(length=64):
    """Gera uma chave secreta segura"""
    return secrets.token_urlsafe(length)

def generate_jwt_key(length=64):
    """Gera uma chave JWT segura"""
    return secrets.token_urlsafe(length)

def generate_encryption_key():
    """Gera uma chave de encriptação AES-256 (32 bytes)"""
    key = secrets.token_bytes(32)
    return base64.b64encode(key).decode('utf-8')

def generate_csrf_key():
    """Gera uma chave CSRF"""
    return secrets.token_hex(32)

def generate_api_key():
    """Gera uma chave de API interna"""
    return f"fisiflow_api_{secrets.token_urlsafe(32)}"

def main():
    print("FisioFlow4 - Gerador de Chaves de Producao")
    print("=" * 60)
    print()
    
    # Gerar todas as chaves
    secret_key = generate_secret_key()
    jwt_secret = generate_jwt_key()
    encryption_key = generate_encryption_key()
    csrf_key = generate_csrf_key()
    api_key = generate_api_key()
    
    # Timestamp para referência
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print("CHAVES GERADAS - COPIE PARA O RAILWAY:")
    print("=" * 60)
    print()
    
    print("# Backend Environment Variables")
    print(f"SECRET_KEY={secret_key}")
    print(f"JWT_SECRET_KEY={jwt_secret}")
    print(f"ENCRYPTION_KEY={encryption_key}")
    print(f"CSRF_SECRET_KEY={csrf_key}")
    print(f"INTERNAL_API_KEY={api_key}")
    print()
    
    print("# Database (usar a do Neon existente)")
    print('DATABASE_URL="postgresql://neondb_owner:npg_p7LXBZvaMF0f@ep-shiny-dawn-ae4085f3-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"')
    print()
    
    print("# App Configuration")
    print("NODE_ENV=production")
    print("FLASK_ENV=production") 
    print("DEBUG=false")
    print("JWT_ACCESS_TOKEN_EXPIRES=3600")
    print("JWT_REFRESH_TOKEN_EXPIRES=2592000")
    print()
    
    print("# Security Settings")
    print("CORS_ORIGINS=https://your-frontend-url.railway.app")
    print("RATE_LIMIT_PER_MINUTE=100")
    print("RATE_LIMIT_PER_HOUR=2000")
    print("MAX_FILE_SIZE=10485760")
    print()
    
    print("# Email (configurar com seu provedor)")
    print("SMTP_SERVER=smtp.gmail.com")
    print("SMTP_PORT=587")
    print("SMTP_USERNAME=your-email@gmail.com")
    print("SMTP_PASSWORD=your-app-password")
    print("FROM_EMAIL=noreply@fisioflow.com")
    print()
    
    print("=" * 60)
    print(f"Gerado em: {timestamp}")
    print("IMPORTANTE: Salve estas chaves em local seguro!")
    print("NUNCA committar essas chaves no GitHub!")
    print("=" * 60)
    
    # Salvar em arquivo .env.production para referência local
    env_content = f"""# FisioFlow4 Production Environment Variables
# Generated on: {timestamp}
# DO NOT COMMIT THIS FILE TO GIT!

# Security Keys
SECRET_KEY={secret_key}
JWT_SECRET_KEY={jwt_secret}
ENCRYPTION_KEY={encryption_key}
CSRF_SECRET_KEY={csrf_key}
INTERNAL_API_KEY={api_key}

# Database (Neon)
DATABASE_URL="postgresql://neondb_owner:npg_p7LXBZvaMF0f@ep-shiny-dawn-ae4085f3-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

# App Config
NODE_ENV=production
FLASK_ENV=production
DEBUG=false
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# CORS (update after frontend deploy)
CORS_ORIGINS=https://your-frontend-url.railway.app

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=2000

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,mp4,mov,avi

# Email Configuration (UPDATE WITH YOUR SETTINGS)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@fisioflow.com

# AI APIs (Optional - configure later)
# OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# GOOGLE_AI_API_KEY=your-google-key-here
"""
    
    # Salvar arquivo de produção
    with open('.env.production', 'w') as f:
        f.write(env_content)
    
    print()
    print("Arquivo '.env.production' criado para referencia local")
    print("   (ja incluido no .gitignore)")
    print()

if __name__ == "__main__":
    main()