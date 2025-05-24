"""
Test script for the voice chat functionality.
Run this script to verify the installation.
"""

import os
import sys
import requests

print("Testing Voice Chat Integration")
print("=" * 50)

# Test API endpoint
print("Testing API endpoint...")

try:
    response = requests.post(
        "http://localhost:5000/api/voice/chat",
        json={"message": "Hello, this is a test message"},
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ API endpoint is working!")
        print(f"Status: {data.get('status')}")
        print(f"Response: {data.get('response')[:100]}...")
        
        if 'metrics' in data:
            print("Metrics received:")
            for key, value in data.get('metrics', {}).items():
                print(f"- {key}: {value}")
        
        print(f"Conversation ID: {data.get('conversation_id')}")
    else:
        print(f"❌ API endpoint returned status code {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error testing API: {str(e)}")

print()
print("Testing voice chat route...")
try:
    response = requests.get("http://localhost:5000/voice-chat")
    
    if response.status_code == 200:
        print("✅ Voice chat route is working!")
        html_preview = response.text[:100] + "..."
        print(f"HTML response: {html_preview}")
    else:
        print(f"❌ Voice chat route returned status code {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error testing voice chat route: {str(e)}")

print()
print("Installation verification complete.")
print("=" * 50)
print("If you see any errors, please check the troubleshooting section in INTEGRATION-STEPS.md")
print("To test manually, go to http://localhost:5000/voice-chat in your browser") 