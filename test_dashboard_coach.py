import requests
import json

def test_coach_api():
    """Test the dashboard coach API endpoint."""
    # url = "http://localhost:8080/api/dashboard/coach"
    url = "http://localhost:8080/api/test_post" # <<< Change to the new test URL
    
    # Prepare a simple test message
    payload = {
        "message": "Hello, I'm selling a sales training platform",
        "context": {
            "role": "coach",
            "messages": []
        }
    }
    
    # Make the API call
    print(f"Calling API: {url}")
    try:
        response = requests.post(url, json=payload)
        
        # Print status code
        print(f"Status code: {response.status_code}")
        
        # Pretty print response
        if response.status_code == 200:
            print("Response:")
            try:
                json_response = response.json()
                print(json.dumps(json_response, indent=2))
            except:
                print(response.text)
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Exception occurred: {str(e)}")

if __name__ == "__main__":
    test_coach_api() 