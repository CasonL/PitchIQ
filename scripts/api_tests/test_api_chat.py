#!/usr/bin/env python
import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8081"  # Update if your server runs on a different port
SESSION_COOKIE = ""  # Fill this with your session cookie from browser

def test_api_connectivity():
    """Test basic API connectivity"""
    headers = {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
    }
    
    cookies = {"session": SESSION_COOKIE} if SESSION_COOKIE else None
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/health",
            headers=headers,
            cookies=cookies
        )
        
        print(f"Status Code: {response.status_code}")
        
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return True
        except:
            print(f"Raw Response: {response.text[:200]}...")
            return False
    except Exception as e:
        print(f"Connection Error: {e}")
        return False

def send_test_message(message="Hello, this is a test message"):
    """Send a test message to the chat API"""
    if not SESSION_COOKIE:
        print("Error: No session cookie provided. Please add your session cookie.")
        return False
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
    }
    
    cookies = {"session": SESSION_COOKIE}
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/chat",
            headers=headers,
            cookies=cookies,
            json={"message": message}
        )
        
        print(f"Status Code: {response.status_code}")
        
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return response.status_code == 200
        except:
            print(f"Raw Response: {response.text[:200]}...")
            return False
    except Exception as e:
        print(f"Connection Error: {e}")
        return False

def print_help():
    print("""
Usage: python test_api_chat.py [command]

Commands:
  health       - Test API connectivity
  send MESSAGE - Send a message to the chat API
  help         - Show this help message

Before running, edit this script to add your session cookie from browser.
    """)

if __name__ == "__main__":
    print("API Test Runner")
    print("==============")
    
    if len(SESSION_COOKIE) == 0:
        print("WARNING: No session cookie provided. Authentication will likely fail.")
        print("Please edit this script to add your session cookie.")
        print()
    
    if len(sys.argv) < 2:
        # Default behavior - run health check
        print("Testing API connectivity...")
        test_api_connectivity()
        print("\nTo send a message, run: python test_api_chat.py send \"Your message here\"")
    elif sys.argv[1] == "health":
        test_api_connectivity()
    elif sys.argv[1] == "send" and len(sys.argv) >= 3:
        message = sys.argv[2]
        print(f"Sending message: {message}")
        send_test_message(message)
    elif sys.argv[1] == "help":
        print_help()
    else:
        print("Unknown command or missing arguments.")
        print_help() 