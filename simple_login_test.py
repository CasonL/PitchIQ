#!/usr/bin/env python3
"""
Simple test to see the exact login error response.
"""

import requests
import json

def simple_login_test():
    """Test the login endpoint directly"""
    
    base_url = "http://localhost:8080"
    
    print("🔧 Testing Login Endpoint")
    print("=" * 30)
    
    # Test login with valid credentials
    login_data = {
        "email": "test@test.com",
        "password": "test123",
        "remember": False
    }
    
    try:
        print(f"POST {base_url}/api/auth/login")
        print(f"Data: {json.dumps(login_data, indent=2)}")
        
        response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
        else:
            print("❌ Login failed!")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    simple_login_test() 