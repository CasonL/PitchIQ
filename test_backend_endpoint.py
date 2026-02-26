"""Test if backend is serving Deepgram key correctly"""
import requests
import json

try:
    response = requests.get('http://localhost:8080/api/deepgram/token')
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        key = data.get('key') or data.get('token')
        if key:
            print(f"\n✓ Key received: {key[:20]}...")
        else:
            print("\n✗ No key in response")
except Exception as e:
    print(f"Error: {e}")
