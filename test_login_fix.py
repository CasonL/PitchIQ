#!/usr/bin/env python3
"""
Test script to verify login functionality is working
"""
import requests
import json
import time

def test_auth_endpoints():
    base_url = "http://localhost:8080"
    
    print("Testing authentication endpoints...")
    
    # Wait a moment for server to be ready
    time.sleep(2)
    
    # Test 1: Auth status (should be unauthenticated)
    print("\n1. Testing auth status endpoint...")
    try:
        response = requests.get(f"{base_url}/api/auth/status", timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Registration
    print("\n2. Testing registration endpoint...")
    reg_data = {
        'name': 'Test User',
        'email': 'testuser123@example.com',
        'password': 'TestPassword123!',
        'confirm_password': 'TestPassword123!'
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/register", json=reg_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.headers.get('content-type', '').startswith('application/json'):
            print(f"Response: {response.json()}")
        else:
            print(f"HTML Response (first 200 chars): {response.text[:200]}...")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Login with the registered user
    print("\n3. Testing login endpoint...")
    login_data = {
        'email': 'testuser123@example.com',
        'password': 'TestPassword123!'
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.headers.get('content-type', '').startswith('application/json'):
            print(f"Response: {response.json()}")
        else:
            print(f"HTML Response (first 200 chars): {response.text[:200]}...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auth_endpoints() 