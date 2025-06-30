#!/usr/bin/env python3
"""
Debug script to test registration endpoint with detailed error reporting
"""
import requests
import json
import time

def debug_registration():
    base_url = "http://localhost:8080"
    
    print("🔧 Debug Registration Endpoint")
    print("=" * 40)
    
    # Test registration
    reg_data = {
        'name': 'Debug User',
        'email': 'debug123@example.com',
        'password': 'DebugPass123!',
        'confirm_password': 'DebugPass123!'
    }
    
    print(f"POST {base_url}/api/auth/register")
    print(f"Data: {json.dumps(reg_data, indent=2)}")
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/register",
            json=reg_data,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        print(f"Content-Type: {content_type}")
        
        if content_type.startswith('application/json'):
            try:
                json_response = response.json()
                print(f"JSON Response: {json.dumps(json_response, indent=2)}")
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON: {e}")
                print(f"Raw response: {response.text}")
        else:
            print(f"Non-JSON Response: {response.text}")
            
        if response.status_code == 201:
            print("✅ Registration successful!")
        else:
            print("❌ Registration failed!")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - is the server running?")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    debug_registration() 