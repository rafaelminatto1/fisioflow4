#!/usr/bin/env python3
"""
Safe database migration script for Railway deployment
"""
import os
import sys
import subprocess
from sqlalchemy import create_engine, text
from app.config import Config

def check_database_exists():
    """Check if database tables already exist"""
    try:
        engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"))
            return result.fetchone()[0]
    except Exception as e:
        print(f"Error checking database: {e}")
        return False

def run_migrations():
    """Run Alembic migrations safely"""
    if check_database_exists():
        print("Database tables already exist. Stamping current state and running any pending migrations...")
        # Mark current database state as up to date
        subprocess.run(["python", "-m", "alembic", "stamp", "head"], check=True)
        # Run any new migrations
        subprocess.run(["python", "-m", "alembic", "upgrade", "head"], check=True)
    else:
        print("Fresh database detected. Running all migrations...")
        subprocess.run(["python", "-m", "alembic", "upgrade", "head"], check=True)

if __name__ == "__main__":
    try:
        run_migrations()
        print("Migrations completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)