#!/usr/bin/env python3
import requests
import json

def test_debug_endpoint():
    try:
        # Test POST to debug endpoint
        response = requests.post('http://localhost:8080/api/auth/debug', json={'test': 'data'}, timeout=10)
        print(f'Debug POST Status: {response.status_code}')
        if response.headers.get('content-type', '').startswith('application/json'):
            print(f'Debug POST Response: {response.json()}')
        else:
            print(f'Debug POST Response: {response.text[:200]}')
            
        # Test GET to debug endpoint
        response = requests.get('http://localhost:8080/api/auth/debug', timeout=10)
        print(f'Debug GET Status: {response.status_code}')
        if response.headers.get('content-type', '').startswith('application/json'):
            print(f'Debug GET Response: {response.json()}')
        else:
            print(f'Debug GET Response: {response.text[:200]}')
            
    except Exception as e:
        print(f'Error: {e}')

if __name__ == "__main__":
    test_debug_endpoint() 