#!/usr/bin/env python3
import requests
import json

def test_simple_endpoint():
    try:
        data = {'test': 'data'}
        response = requests.post('http://localhost:8080/api/auth/test-register', json=data, timeout=10)
        print(f'Status: {response.status_code}')
        if response.headers.get('content-type', '').startswith('application/json'):
            print(f'Response: {response.json()}')
        else:
            print(f'Response: {response.text}')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == "__main__":
    test_simple_endpoint() 