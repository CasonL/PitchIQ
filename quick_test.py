#!/usr/bin/env python3
import requests
import json

def test_api():
    print("Testing API endpoints...")
    
    try:
        # Test GET endpoint
        print("1. Testing GET /api/email-signup/count")
        response = requests.get('http://127.0.0.1:8080/api/email-signup/count')
        print(f"   Status: {response.status_code}")
        print(f"   Content: {response.text}")
        print()
        
        # Test POST endpoint
        print("2. Testing POST /api/email-signup")
        data = {
            "email": "test@example.com",
            "early_access": True,
            "get_updates": False,
            "computer_fingerprint": "test123"
        }
        response = requests.post('http://127.0.0.1:8080/api/email-signup', 
                               json=data,
                               headers={'Content-Type': 'application/json'})
        print(f"   Status: {response.status_code}")
        print(f"   Content: {response.text}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api() 