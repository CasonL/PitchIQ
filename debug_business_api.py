#!/usr/bin/env python3
"""
Debug script for business onboarding API.
"""

import requests
import json

# Base URL for the API
BASE_URL = 'http://localhost:8080'

def debug_api():
    """Debug the business onboarding API."""
    print("=== BUSINESS ONBOARDING API DEBUG ===\n")
    
    # Login first
    print("1. Logging in...")
    login_data = {
        'email': 'casonlamothe@gmail.com',
        'password': 'Theguitarguy24'
    }
    
    session = requests.Session()
    
    # Get CSRF token
    csrf_response = session.get(f'{BASE_URL}/api/auth/csrf-token')
    print(f"CSRF Response: {csrf_response.status_code}")
    
    # Login
    login_response = session.post(f'{BASE_URL}/api/auth/login', json=login_data)
    print(f"Login Response: {login_response.status_code}")
    
    # Test business profile endpoint
    print("\n2. Testing business profile endpoint...")
    profile_response = session.get(f'{BASE_URL}/api/business-onboarding/profile')
    print(f"Profile Response Status: {profile_response.status_code}")
    print(f"Profile Response Headers: {dict(profile_response.headers)}")
    print(f"Profile Response Content: {profile_response.text[:500]}")
    
    if profile_response.status_code == 200:
        try:
            profile_data = profile_response.json()
            print(f"Profile Data: {json.dumps(profile_data, indent=2)}")
        except Exception as e:
            print(f"JSON Parse Error: {e}")
    
    print("\n=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    debug_api() 