#!/usr/bin/env python3
"""
Test script for authentication endpoints
"""
import requests
import json

def test_auth_endpoints():
    base_url = "http://127.0.0.1:8080"
    
    print("Testing authentication endpoints...")
    
    # Test 1: Check auth status endpoint
    print("\n1. Testing auth status endpoint...")
    try:
        response = requests.get(f"{base_url}/api/auth/status")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Test login endpoint with invalid credentials
    print("\n2. Testing login endpoint with invalid credentials...")
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "wrongpassword"
            }
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Test registration endpoint
    print("\n3. Testing registration endpoint...")
    try:
        response = requests.post(
            f"{base_url}/api/auth/register",
            json={
                "name": "Test User",
                "email": "testuser@example.com",
                "password": "TestPassword123",
                "confirm_password": "TestPassword123"
            }
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auth_endpoints() 