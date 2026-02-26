import os
from dotenv import load_dotenv
import requests

load_dotenv()
key = os.environ.get('OPENROUTER_API_KEY')

headers = {
    'Authorization': f'Bearer {key}',
    'HTTP-Referer': 'https://pitchiq.com',
    'X-Title': 'PitchIQ',
    'Content-Type': 'application/json'
}

data = {
    'model': 'openai/gpt-4o-mini',
    'messages': [{'role': 'user', 'content': 'Say hi in 2 words'}],
    'max_tokens': 10,
    'stream': True
}

print("Testing OpenRouter streaming...")
resp = requests.post('https://openrouter.ai/api/v1/chat/completions', headers=headers, json=data, stream=True, timeout=15)
print(f'Status: {resp.status_code}')
print(f'Content-Type: {resp.headers.get("Content-Type")}')
print(f'Transfer-Encoding: {resp.headers.get("Transfer-Encoding")}')
print('\nFirst 10 chunks:')
for i, line in enumerate(resp.iter_lines()):
    if i >= 10:
        break
    text = line.decode() if line else "EMPTY"
    print(f'{i}: {text[:100]}')
