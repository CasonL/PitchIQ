#!/usr/bin/env python3
"""
Direct test of registration endpoint with better error handling
"""
import requests
import json

def test_registration():
    base_url = "http://127.0.0.1:8080"
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/register",
            json={
                "name": "Test User",
                "email": "testuser2@example.com",
                "password": "TestPassword123",
                "confirm_password": "TestPassword123"
            },
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {response.headers}")
        print(f"Raw Response: {response.text}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            try:
                print(f"JSON Response: {response.json()}")
            except:
                print("Failed to parse as JSON")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_registration() 