"""
Seed básico: cria usuários e alguns dados demo.
Rode com: DATABASE_URL=... python scripts/seed.py
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("Defina DATABASE_URL no ambiente.")

engine = create_engine(DATABASE_URL, future=True)

with engine.begin() as conn:
    # Exemplo: inserir um admin se não existir (ajuste nomes de tabelas conforme seus models/migrations)
    conn.execute(text("""
        INSERT INTO users (email, password_hash, role, is_active, created_at)
        SELECT 'admin@fisioflow.app', '$2b$12$hashaqui', 'ADMIN', true, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@fisioflow.app');
    """))

print("Seed concluído.")