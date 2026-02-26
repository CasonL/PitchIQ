"""Test if Deepgram API key is valid"""
import requests
import os
from dotenv import load_dotenv

load_dotenv('instance/.env')
api_key = os.getenv('DEEPGRAM_API_KEY')

print(f"Testing key: {api_key[:20]}...")

# Test 1: Check if key can access projects endpoint
try:
    response = requests.get(
        'https://api.deepgram.com/v1/projects',
        headers={'Authorization': f'Token {api_key}'},
        timeout=10
    )
    print(f"\nProjects API Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✓ Key is valid for basic API access")
        projects = response.json()
        print(f"  Found {len(projects.get('projects', []))} project(s)")
    elif response.status_code == 401:
        print("✗ Key is INVALID or EXPIRED")
        print("  Get a new key from: https://console.deepgram.com/")
    elif response.status_code == 403:
        print("✗ Key exists but lacks permissions")
    else:
        print(f"Unexpected response: {response.text[:200]}")
        
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*50)
print("If key is invalid, get a new one from:")
print("https://console.deepgram.com/signup")
print("="*50)
