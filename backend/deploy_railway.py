#!/usr/bin/env python3
"""
Railway Deployment Script for FisioFlow
Handles database migrations and deployment verification
"""

import os
import sys
import subprocess
import requests
import time
from sqlalchemy import create_engine, text, inspect
from app.config import get_config


def check_environment_variables():
    """Check if all required environment variables are set"""
    required_vars = [
        'SECRET_KEY',
        'JWT_SECRET_KEY', 
        'ENCRYPTION_KEY',
    ]
    
    # Database URL (either one is fine)
    has_db_url = bool(os.getenv('DATABASE_URL') or os.getenv('NEON_DATABASE_URL'))
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if not has_db_url:
        missing_vars.append('DATABASE_URL or NEON_DATABASE_URL')
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ All required environment variables are set")
    return True


def test_database_connection():
    """Test database connection"""
    try:
        # Set DATABASE_URL from NEON_DATABASE_URL if needed
        if not os.getenv('DATABASE_URL') and os.getenv('NEON_DATABASE_URL'):
            os.environ['DATABASE_URL'] = os.getenv('NEON_DATABASE_URL')
        
        config = get_config()
        engine = create_engine(config.SQLALCHEMY_DATABASE_URI)
        
        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1 as test'))
            test_result = result.fetchone()
            
            if test_result and test_result[0] == 1:
                print("✅ Database connection successful")
                return True
            else:
                print("❌ Database connection test failed")
                return False
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def check_existing_schema():
    """Check existing database schema and detect conflicts"""
    try:
        config = get_config()
        engine = create_engine(config.SQLALCHEMY_DATABASE_URI)
        inspector = inspect(engine)
        
        existing_tables = inspector.get_table_names()
        print(f"📊 Found {len(existing_tables)} existing tables: {existing_tables}")
        
        # Check users table schema if it exists
        if 'users' in existing_tables:
            columns = inspector.get_columns('users')
            id_column = next((col for col in columns if col['name'] == 'id'), None)
            
            if id_column:
                col_type = str(id_column['type']).lower()
                print(f"🔍 Users table 'id' column type: {col_type}")
                
                if 'integer' in col_type:
                    print("⚠️  WARNING: Found users table with INTEGER id - migration 004 will fix this")
                    return 'needs_migration'
                elif 'varchar' in col_type or 'character varying' in col_type:
                    print("✅ Users table has correct VARCHAR id type")
                    return 'compatible'
        else:
            print("ℹ️  No users table found - will be created by migrations")
            return 'empty'
            
        return 'compatible'
        
    except Exception as e:
        print(f"❌ Schema check failed: {e}")
        return 'error'


def run_migrations():
    """Run Alembic migrations"""
    try:
        print("🚀 Running database migrations...")
        
        # Run alembic upgrade head
        result = subprocess.run(
            ['alembic', 'upgrade', 'head'], 
            capture_output=True, 
            text=True,
            cwd='.'
        )
        
        if result.returncode == 0:
            print("✅ Migrations completed successfully")
            print("Migration output:")
            print(result.stdout)
            return True
        else:
            print("❌ Migration failed")
            print("Error output:")
            print(result.stderr)
            return False
            
    except FileNotFoundError:
        print("❌ Alembic not found. Make sure it's installed.")
        return False
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False


def verify_deployment():
    """Verify the deployment is working"""
    try:
        port = os.getenv('PORT', '8080')
        health_url = f"http://localhost:{port}/health"
        
        print(f"🔍 Checking health endpoint: {health_url}")
        
        # Wait a bit for the server to start
        time.sleep(5)
        
        response = requests.get(health_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed")
            print(f"Response: {data}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False


def main():
    """Main deployment function"""
    print("🚂 FisioFlow Railway Deployment")
    print("=" * 40)
    
    # Step 1: Check environment variables
    if not check_environment_variables():
        sys.exit(1)
    
    # Step 2: Test database connection
    if not test_database_connection():
        sys.exit(1)
    
    # Step 3: Check existing schema
    schema_status = check_existing_schema()
    if schema_status == 'error':
        sys.exit(1)
    
    # Step 4: Run migrations
    if not run_migrations():
        sys.exit(1)
    
    print("\n✅ Deployment preparation completed successfully!")
    print("🚀 Ready to start the application")
    
    return True


if __name__ == '__main__':
    main()
