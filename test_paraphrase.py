#!/usr/bin/env python
"""
Test script for the paraphrase service

This script sends a test request to the paraphrase service and prints the response.
It's useful for debugging API connectivity issues.
"""

import json
import requests
import sys

def test_paraphrase_service(test_input="rub"):
    """Test the paraphrase service with a basic product input"""
    print("Testing paraphrase service...")
    
    # The URL should match what's configured in the frontend
    url = "http://localhost:8081/paraphrase"  # Port 8081 as defined in paraphrase_service.py
    
    # This is the exact payload format the frontend uses
    payload = {
        "userInput": test_input,
        "stage": "welcome"  # Test the first stage which should trigger business classification
    }
    
    try:
        print(f"Sending request to {url} with payload: {payload}")
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status code: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print("\nSuccess! Response data:")
            print(json.dumps(data, indent=2))
            
            # Check if needs_followup is present and true
            if data.get("needs_followup", False):
                print("\n✅ Working correctly! Service detected 'rub' is ambiguous and requested followup.")
                print(f"Follow-up question: {data.get('followup_question', 'None')}")
            else:
                print("\n⚠️ Warning: Service did not request a follow-up for ambiguous input 'rub'.")
                print("This suggests the business comparison logic might not be working correctly.")
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Exception: {str(e)}")
        print("\nIs the paraphrase service running? Start it with: python paraphrase_service.py")

if __name__ == "__main__":
    # Use command line argument if provided, otherwise default to "rub"
    test_input = sys.argv[1] if len(sys.argv) > 1 else "rub"
    test_paraphrase_service(test_input) 