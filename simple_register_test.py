#!/usr/bin/env python3
"""
Simple test to check registration endpoint.
"""

import requests
import json

def test_register():
    """Test the registration endpoint"""
    
    base_url = "http://localhost:8080"
    
    print("🔧 Testing Registration Endpoint")
    print("=" * 30)
    
    # Simple registration test
    register_data = {
        "name": "Test User",
        "email": "simple_test@example.com",
        "password": "TestPassword123!",
        "confirm_password": "TestPassword123!"
    }
    
    try:
        print(f"POST {base_url}/api/auth/register")
        print(f"Data: {json.dumps(register_data, indent=2)}")
        
        response = requests.post(
            f"{base_url}/api/auth/register",
            json=register_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Registration successful!")
        else:
            print("❌ Registration failed!")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_register() 