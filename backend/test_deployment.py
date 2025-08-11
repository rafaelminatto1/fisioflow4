#!/usr/bin/env python3
"""
Quick deployment test script
"""

import os
import sys
from app import create_app, db
from app.models.user import User, UserRole


def test_app_creation():
    """Test if app can be created"""
    try:
        app = create_app()
        print("✅ App creation successful")
        return app
    except Exception as e:
        print(f"❌ App creation failed: {e}")
        return None


def test_database_models():
    """Test if database models work"""
    try:
        app = create_app()
        with app.app_context():
            # Test model creation (without committing)
            user = User(
                email="test@example.com",
                password="testpass123",
                role=UserRole.ADMIN
            )
            print("✅ Model creation successful")
            return True
    except Exception as e:
        print(f"❌ Model creation failed: {e}")
        return False


def test_health_endpoint():
    """Test health endpoint"""
    try:
        app = create_app()
        with app.test_client() as client:
            response = client.get('/health')
            if response.status_code == 200:
                data = response.get_json()
                print(f"✅ Health endpoint working: {data}")
                return True
            else:
                print(f"❌ Health endpoint failed: {response.status_code}")
                return False
    except Exception as e:
        print(f"❌ Health endpoint test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🧪 FisioFlow Deployment Tests")
    print("=" * 30)
    
    tests_passed = 0
    total_tests = 3
    
    # Test 1: App creation
    if test_app_creation():
        tests_passed += 1
    
    # Test 2: Database models
    if test_database_models():
        tests_passed += 1
    
    # Test 3: Health endpoint
    if test_health_endpoint():
        tests_passed += 1
    
    print("\n" + "=" * 30)
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("✅ All tests passed! Ready for deployment")
        return True
    else:
        print("❌ Some tests failed. Check the errors above.")
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
