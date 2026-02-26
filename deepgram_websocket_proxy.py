"""
WebSocket proxy server for Deepgram connections.
Bypasses client-side firewall restrictions by proxying through localhost.
"""
import asyncio
import websockets
import json
import logging
from websockets.server import serve
from websockets.client import connect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEEPGRAM_API_KEY = None

async def proxy_deepgram_stt(client_ws):
    """Proxy WebSocket connection for Deepgram STT (nova-2 model)"""
    global DEEPGRAM_API_KEY
    
    if not DEEPGRAM_API_KEY:
        logger.error("No Deepgram API key configured")
        await client_ws.close(1008, "No API key")
        return
    
    # Extract query params from first message or use defaults
    params = {
        'model': 'nova-2',
        'language': 'en-US',
        'encoding': 'linear16',
        'sample_rate': '16000',
        'channels': '1',
        'punctuate': 'true',
        'smart_format': 'true',
        'interim_results': 'true',
        'utterance_end_ms': '3000',
        'vad_events': 'true',
        'vad_turnoff': '800',
        'endpointing': '600'
    }
    
    query_string = '&'.join(f"{k}={v}" for k, v in params.items())
    deepgram_url = f"wss://api.deepgram.com/v1/listen?{query_string}"
    
    logger.info(f"[Proxy] Connecting to Deepgram STT: {deepgram_url[:60]}...")
    
    try:
        async with connect(
            deepgram_url,
            extra_headers={
                "Authorization": f"Token {DEEPGRAM_API_KEY}"
            }
        ) as deepgram_ws:
            logger.info("[Proxy] ✅ Connected to Deepgram STT")
            
            # Forward messages bidirectionally
            async def forward_to_deepgram():
                try:
                    async for message in client_ws:
                        if isinstance(message, bytes):
                            await deepgram_ws.send(message)
                        else:
                            logger.info(f"[Proxy] Client → Deepgram: {message[:100]}")
                            await deepgram_ws.send(message)
                except websockets.exceptions.ConnectionClosed:
                    logger.info("[Proxy] Client disconnected")
            
            async def forward_to_client():
                try:
                    async for message in deepgram_ws:
                        if isinstance(message, bytes):
                            await client_ws.send(message)
                        else:
                            await client_ws.send(message)
                except websockets.exceptions.ConnectionClosed:
                    logger.info("[Proxy] Deepgram disconnected")
            
            # Run both forwarding tasks concurrently
            await asyncio.gather(
                forward_to_deepgram(),
                forward_to_client(),
                return_exceptions=True
            )
            
    except Exception as e:
        logger.error(f"[Proxy] Error: {e}")
        await client_ws.close(1011, str(e))

async def proxy_deepgram_agent(client_ws):
    """Proxy WebSocket connection for Deepgram Agent API"""
    global DEEPGRAM_API_KEY
    
    if not DEEPGRAM_API_KEY:
        logger.error("No Deepgram API key configured")
        await client_ws.close(1008, "No API key")
        return
    
    deepgram_url = "wss://agent.deepgram.com/v1/agent/converse"
    
    logger.info(f"[Proxy] Connecting to Deepgram Agent: {deepgram_url}")
    
    try:
        async with connect(
            deepgram_url,
            extra_headers={
                "Authorization": f"Token {DEEPGRAM_API_KEY}"
            }
        ) as deepgram_ws:
            logger.info("[Proxy] ✅ Connected to Deepgram Agent")
            
            # Forward messages bidirectionally
            async def forward_to_deepgram():
                try:
                    async for message in client_ws:
                        if isinstance(message, bytes):
                            await deepgram_ws.send(message)
                        else:
                            await deepgram_ws.send(message)
                except websockets.exceptions.ConnectionClosed:
                    logger.info("[Proxy] Client disconnected")
            
            async def forward_to_client():
                try:
                    async for message in deepgram_ws:
                        if isinstance(message, bytes):
                            await client_ws.send(message)
                        else:
                            await client_ws.send(message)
                except websockets.exceptions.ConnectionClosed:
                    logger.info("[Proxy] Deepgram disconnected")
            
            # Run both forwarding tasks concurrently
            await asyncio.gather(
                forward_to_deepgram(),
                forward_to_client(),
                return_exceptions=True
            )
            
    except Exception as e:
        logger.error(f"[Proxy] Error: {e}")
        await client_ws.close(1011, str(e))

async def handle_client(websocket, path):
    """Handle incoming WebSocket connections and route to appropriate proxy"""
    logger.info(f"[Proxy] New connection: {path}")
    
    if path == "/stt":
        await proxy_deepgram_stt(websocket)
    elif path == "/agent":
        await proxy_deepgram_agent(websocket)
    else:
        logger.warning(f"[Proxy] Unknown path: {path}")
        await websocket.close(1008, "Unknown endpoint")

async def main():
    global DEEPGRAM_API_KEY
    
    # Load API key from environment
    import os
    from dotenv import load_dotenv
    
    # Load from instance/.env
    env_path = os.path.join(os.path.dirname(__file__), 'instance', '.env')
    load_dotenv(env_path)
    
    DEEPGRAM_API_KEY = os.getenv('DEEPGRAM_API_KEY')
    
    if not DEEPGRAM_API_KEY:
        logger.error("❌ DEEPGRAM_API_KEY not found in instance/.env")
        return
    
    logger.info(f"✅ Loaded Deepgram API key: {DEEPGRAM_API_KEY[:10]}...")
    
    # Start WebSocket server on localhost:9090
    async with serve(handle_client, "localhost", 9090):
        logger.info("=" * 60)
        logger.info("🚀 Deepgram WebSocket Proxy Server Running")
        logger.info("   Listening on: ws://localhost:9090")
        logger.info("   Endpoints:")
        logger.info("     - ws://localhost:9090/stt (Deepgram STT)")
        logger.info("     - ws://localhost:9090/agent (Deepgram Agent)")
        logger.info("=" * 60)
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n👋 Proxy server stopped")
