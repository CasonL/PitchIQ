"""Direct WebSocket test for Deepgram STT"""
import asyncio
import websockets
import os
from dotenv import load_dotenv
import json

load_dotenv('instance/.env')
api_key = os.getenv('DEEPGRAM_API_KEY')

async def test_deepgram_websocket():
    """Test Deepgram WebSocket connection with current API key"""
    
    print(f"Testing Deepgram WebSocket with key: {api_key[:20]}...")
    print("="*60)
    
    # Construct WebSocket URL (same params as frontend)
    ws_url = (
        "wss://api.deepgram.com/v1/listen"
        "?model=nova-2"
        "&language=en-US"
        "&encoding=linear16"
        "&sample_rate=16000"
        "&channels=1"
        "&punctuate=true"
        "&smart_format=true"
        "&interim_results=true"
    )
    
    print(f"\nConnecting to: {ws_url[:80]}...")
    print(f"Auth method: Sec-WebSocket-Protocol with 'token' and API key")
    
    try:
        # Connect with authentication via subprotocol (standard method)
        async with websockets.connect(
            ws_url,
            subprotocols=['token', api_key]
        ) as ws:
            print("\n✓ WebSocket connection SUCCESSFUL!")
            print("  Connection established to Deepgram STT")
            
            # Wait for initial response
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=2.0)
                data = json.loads(response)
                print(f"  Initial response: {json.dumps(data, indent=2)[:200]}")
            except asyncio.TimeoutError:
                print("  (No immediate response, but connection is open)")
            
            print("\n✓ Deepgram API key is valid for WebSocket STT")
            print("  The frontend should work with this key.")
            
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"\n✗ WebSocket connection REJECTED")
        print(f"  Status code: {e.status_code}")
        
        if e.status_code == 401:
            print("\n  Issue: AUTHENTICATION FAILED")
            print("  - API key is invalid, expired, or revoked")
            print("  - Get new key from: https://console.deepgram.com/")
        elif e.status_code == 403:
            print("\n  Issue: PERMISSION DENIED")
            print("  - API key lacks Speech-to-Text streaming permissions")
            print("  - Check key permissions in Deepgram console")
        else:
            print(f"\n  Unexpected status code: {e.status_code}")
            
    except websockets.exceptions.WebSocketException as e:
        print(f"\n✗ WebSocket error: {e}")
        print("  Connection failed during handshake")
        
    except Exception as e:
        print(f"\n✗ Unexpected error: {type(e).__name__}: {e}")
    
    print("="*60)

if __name__ == '__main__':
    asyncio.run(test_deepgram_websocket())
