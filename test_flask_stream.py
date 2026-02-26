import requests
import time

print("Testing Flask streaming endpoint...")
print("-" * 50)

response = requests.post(
    'http://localhost:8080/api/openai/chat',
    json={
        'model': 'openai/gpt-4o-mini',
        'messages': [{'role': 'user', 'content': 'Count to 3'}],
        'max_tokens': 20,
        'stream': True
    },
    stream=True,
    timeout=15
)

print(f"Status: {response.status_code}")
print(f"Content-Type: {response.headers.get('Content-Type')}")
print(f"Transfer-Encoding: {response.headers.get('Transfer-Encoding')}")
print("\nResponse chunks:")

chunk_count = 0
for i, line in enumerate(response.iter_lines()):
    if i >= 15:  # Only show first 15 lines
        break
    text = line.decode() if line else "[EMPTY]"
    print(f"{i}: {text[:100]}")
    chunk_count += 1

print(f"\nTotal chunks received: {chunk_count}")
print("\n⚠️ Now check the Flask terminal for debug logs!")
