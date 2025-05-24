import requests

# Make a request to the signup page
response = requests.get('http://127.0.0.1:5001/auth/signup')

# Print the status code
print("Status code:", response.status_code)
if response.status_code == 200:
    # Split the content by lines and display the first 10 with line numbers
    lines = response.text.split('\n')
    
    print("\nFirst 10 lines of the page (raw HTML):")
    for i, line in enumerate(lines[:10]):
        # Print with repr to show whitespace and special characters
        print(f"{i+1}: {repr(line)}") 