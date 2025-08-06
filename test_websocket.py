import asyncio
import websockets
import json
import os

async def test_deepgram_websocket():
    # Get API key from environment
    api_key = os.getenv('DEEPGRAM_API_KEY')
    if not api_key:
        print('❌ DEEPGRAM_API_KEY not found in environment')
        return
    
    print(f'🔑 Using API key: {api_key[:8]}...')
    
    uri = 'wss://agent.deepgram.com/v1/agent/converse'
    headers = {'Authorization': f'Token {api_key}'}
    
    try:
        print(f'🌐 Connecting to {uri}...')
        async with websockets.connect(uri, extra_headers=headers) as websocket:
            print('✅ WebSocket connection successful!')
            
            # Try to send a simple message
            test_message = {
                'type': 'configure',
                'audio': {
                    'input': {'encoding': 'linear16', 'sample_rate': 48000},
                    'output': {'encoding': 'linear16', 'sample_rate': 48000}
                },
                'agent': {
                    'language': 'en',
                    'listen': {'provider': {'type': 'deepgram', 'model': 'nova-2'}},
                    'think': {'provider': {'type': 'open_ai', 'model': 'gpt-4o-mini'}},
                    'speak': {'provider': {'type': 'deepgram', 'model': 'aura-2-asteria-en'}}
                }
            }
            
            await websocket.send(json.dumps(test_message))
            print('✅ Configuration message sent')
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f'✅ Received response: {response}')
            except asyncio.TimeoutError:
                print('⏰ No response received within 5 seconds')
                
    except Exception as e:
        print(f'❌ WebSocket connection failed: {e}')
        print(f'❌ Error type: {type(e).__name__}')

if __name__ == '__main__':
    asyncio.run(test_deepgram_websocket()) 