"""Quick test to verify Deepgram API key"""
import os
from dotenv import load_dotenv

# Load from instance/.env
load_dotenv('instance/.env')

deepgram_key = os.getenv('DEEPGRAM_API_KEY')
cartesia_key = os.getenv('CARTESIA_API_KEY')

print("\n=== API Key Check ===")
print(f"Deepgram key exists: {bool(deepgram_key)}")
if deepgram_key:
    print(f"  Preview: {deepgram_key[:20]}...")
    
print(f"Cartesia key exists: {bool(cartesia_key)}")
if cartesia_key:
    print(f"  Preview: {cartesia_key[:20]}...")
print("=====================\n")
