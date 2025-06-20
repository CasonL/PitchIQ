from flask import Blueprint, request, jsonify, Response
import asyncio
import json
import logging
import uuid
from datetime import datetime
from app.services.openai_realtime_service import OpenAIRealtimeService
from app.services.api_manager import api_manager
import time
from flask import current_app

logger = logging.getLogger(__name__)

# Create blueprint
openai_realtime_bp = Blueprint('openai_realtime', __name__)

# Global service instance
realtime_service = None

def get_realtime_service():
    """Get or create the OpenAI Real-Time service instance"""
    global realtime_service
    if realtime_service is None:
        api_key = api_manager.openai_service.api_key if api_manager.openai_service else None
        if not api_key:
            raise ValueError("OpenAI API key not configured")
        realtime_service = OpenAIRealtimeService(api_key)
    return realtime_service

@openai_realtime_bp.route('/start-session', methods=['POST'])
def start_realtime_session():
    """Start a new OpenAI Real-Time conversation session"""
    try:
        session_id = str(uuid.uuid4())
        service = get_realtime_service()
        
        # Start the session asynchronously
        async def start_session():
            return await service.start_conversation(session_id)
        
        # Run in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(start_session())
        loop.close()
        
        logger.info(f"🎬 Started OpenAI Real-Time session: {session_id}")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'Real-time session started successfully'
        })
        
    except Exception as e:
        logger.error(f"❌ Error starting real-time session: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@openai_realtime_bp.route('/stream-audio', methods=['POST'])
def stream_audio_realtime():
    """Stream audio to OpenAI Real-Time API and get responses"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        audio_data = data.get('audio')  # Base64 encoded audio
        
        if not session_id or not audio_data:
            return jsonify({
                'success': False,
                'error': 'Missing session_id or audio data'
            }), 400
        
        service = get_realtime_service()
        
        # Process audio with simplified approach
        async def process_audio():
            return await service.process_audio_simple(session_id, audio_data)
        
        # Run in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        responses = loop.run_until_complete(process_audio())
        loop.close()
        
        logger.info(f"🎵 Processed audio stream for session {session_id}, got {len(responses)} responses")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'responses': responses
        })
        
    except Exception as e:
        logger.error(f"❌ Error streaming audio: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@openai_realtime_bp.route('/stream-audio-fast', methods=['POST'])
def stream_audio_fast():
    """Ultra-fast OpenAI Real-Time API audio processing"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        request_id = data.get('request_id', f'req_{int(time.time())}')
        audio_data = data.get('audio')
        
        if not session_id or not audio_data:
            return jsonify({'error': 'Missing session_id or audio data'}), 400
        
        logger.info(f"⚡ Processing ultra-fast audio for session {session_id}, request {request_id}")
        
        # Get the service and process audio
        service = get_realtime_service()
        
        # Process audio using the ultra-fast method
        responses = asyncio.run(
            service.process_audio_ultra_fast(session_id, audio_data)
        )
        
        logger.info(f"⚡ Ultra-fast processed audio for session {session_id}, request {request_id}, got {len(responses)} responses")
        
        return jsonify({
            'session_id': session_id,
            'request_id': request_id,
            'responses': responses,
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"❌ Error in ultra-fast OpenAI audio processing: {e}")
        return jsonify({'error': str(e)}), 500

@openai_realtime_bp.route('/stream-audio-sse', methods=['POST'])
def stream_audio_sse():
    """Stream audio with Server-Sent Events for real-time responses"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        audio_data = data.get('audio')
        
        if not session_id or not audio_data:
            return jsonify({
                'success': False,
                'error': 'Missing session_id or audio data'
            }), 400
        
        service = get_realtime_service()
        
        def generate_sse_stream():
            """Generate Server-Sent Events stream"""
            
            async def stream_responses():
                # Stream audio chunk and yield responses in real-time
                async for response in service.stream_audio_chunk(session_id, audio_data):
                    yield f"data: {json.dumps(response)}\n\n"
                
                # Commit audio buffer
                await service.commit_audio_buffer(session_id)
                
                # Send completion event
                yield f"data: {json.dumps({'type': 'stream_complete'})}\n\n"
            
            # Run async generator in event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                async_gen = stream_responses()
                while True:
                    try:
                        response = loop.run_until_complete(async_gen.__anext__())
                        yield response
                    except StopAsyncIteration:
                        break
            finally:
                loop.close()
        
        return Response(
            generate_sse_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Error in SSE stream: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@openai_realtime_bp.route('/interrupt', methods=['POST'])
def interrupt_response():
    """Interrupt the current AI response"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'Missing session_id'
            }), 400
        
        service = get_realtime_service()
        
        async def interrupt():
            await service.interrupt_response(session_id)
        
        # Run in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(interrupt())
        loop.close()
        
        logger.info(f"⏹️ Interrupted response for session {session_id}")
        
        return jsonify({
            'success': True,
            'message': 'Response interrupted successfully'
        })
        
    except Exception as e:
        logger.error(f"❌ Error interrupting response: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@openai_realtime_bp.route('/end-session', methods=['POST'])
def end_realtime_session():
    """End a real-time conversation session"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'Missing session_id'
            }), 400
        
        service = get_realtime_service()
        
        async def end_session():
            await service.end_conversation(session_id)
        
        # Run in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(end_session())
        loop.close()
        
        logger.info(f"🔚 Ended real-time session {session_id}")
        
        return jsonify({
            'success': True,
            'message': 'Session ended successfully'
        })
        
    except Exception as e:
        logger.error(f"❌ Error ending session: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@openai_realtime_bp.route('/session-info/<session_id>', methods=['GET'])
def get_session_info(session_id):
    """Get information about a session"""
    try:
        service = get_realtime_service()
        session_info = service.get_session_info(session_id)
        
        if not session_info:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404
        
        return jsonify({
            'success': True,
            'session_info': {
                'session_id': session_id,
                'created_at': session_info['created_at'].isoformat(),
                'active': session_info['active']
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting session info: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@openai_realtime_bp.route('/status', methods=['GET'])
def get_realtime_status():
    """Get OpenAI Real-Time service status"""
    try:
        service = get_realtime_service()
        
        return jsonify({
            'success': True,
            'status': {
                'connected': service.is_connected,
                'active_sessions': service.active_sessions
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 