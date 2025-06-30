from flask import Blueprint, request, jsonify, Response, stream_template
from flask_login import login_required, current_user
import json
import asyncio
import logging
from app.services.nova_sonic_service import nova_sonic_service, sales_training_tools
import base64
import io
import os
from app.models.user import User

logger = logging.getLogger(__name__)

# Create blueprint
nova_sonic_bp = Blueprint('nova_sonic', __name__, url_prefix='/api/nova-sonic')

@nova_sonic_bp.route('/status', methods=['GET'])
def get_status():
    """Get Nova Sonic service status - public endpoint for demo purposes"""
    try:
        status = nova_sonic_service.get_status()
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Error getting Nova Sonic status: {str(e)}")
        # Return a safe fallback status instead of 500 error
        return jsonify({
            'available': False,
            'region': 'us-east-1',
            'model_id': 'amazon.nova-sonic-v1:0',
            'initialized': False,
            'voices': {},
            'error_message': f'Service error: {str(e)}'
        }), 200

@nova_sonic_bp.route('/demo-start-conversation', methods=['POST'])
def demo_start_conversation():
    """Start a new Nova Sonic conversation session - public demo endpoint"""
    try:
        data = request.get_json() or {}
        voice_type = data.get('voice_type', 'feminine')
        system_prompt = data.get('system_prompt', 
            "You are a helpful sales prospect in a role-playing scenario. "
            "You should respond naturally and briefly to sales pitches and questions. "
            "Be realistic but engaging, and help the salesperson practice their skills."
        )
        custom_prompt = data.get('custom_prompt')
        if custom_prompt:
            system_prompt = custom_prompt
        
        # Use the existing event loop or create one if needed
        try:
            # Try to get the current event loop
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Event loop is closed")
        except RuntimeError:
            # No event loop in current thread, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                nova_sonic_service.start_conversation(voice_type=voice_type, system_prompt=system_prompt)
            )
            
            return jsonify({
                'session_id': result.get('session_id'),
                'status': result.get('status'),
                'voice_type': voice_type,
                'message': result.get('message'),
                'sdk': 'experimental',
                'real_nova_sonic': True
            })
        except Exception as e:
            logger.error(f"Error in Nova Sonic start_conversation: {str(e)}")
            logger.exception("Full start_conversation error:")
            raise
            
    except Exception as e:
        logger.error(f"Error starting Nova Sonic conversation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/start-conversation', methods=['POST'])
@login_required
def start_conversation():
    """Start a new Nova Sonic conversation session"""
    try:
        data = request.get_json() or {}
        voice_type = data.get('voice_type', 'feminine')
        system_prompt = data.get('system_prompt', 
            "You are a helpful sales prospect in a role-playing scenario. "
            "You should respond naturally and briefly to sales pitches and questions. "
            "Be realistic but engaging, and help the salesperson practice their skills."
        )
        
        # Use the existing event loop or create one if needed
        try:
            # Try to get the current event loop
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Event loop is closed")
        except RuntimeError:
            # No event loop in current thread, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                nova_sonic_service.start_conversation(voice_type=voice_type, system_prompt=system_prompt)
            )
            
            return jsonify({
                'session_id': result.get('session_id'),
                'status': result.get('status'),
                'voice_type': voice_type,
                'message': result.get('message'),
                'sdk': 'experimental',
                'real_nova_sonic': True
            })
        except Exception as e:
            logger.error(f"Error in Nova Sonic start_conversation: {str(e)}")
            logger.exception("Full start_conversation error:")
            raise
            
    except Exception as e:
        logger.error(f"Error starting Nova Sonic conversation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/demo-stream-audio', methods=['POST'])
def demo_stream_audio():
    """Process audio with Nova Sonic - public demo endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        session_id = data.get('session_id')
        audio_b64 = data.get('audio')
        
        if not session_id or not audio_b64:
            return jsonify({'error': 'session_id and audio are required'}), 400
            
        # Validate base64 audio format
        try:
            # Just validate it's valid base64, but don't decode it
            base64.b64decode(audio_b64)
        except Exception as e:
            return jsonify({'error': 'Invalid base64 audio data'}), 400
            
        # Use the existing event loop or create one if needed
        try:
            # Try to get the current event loop
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Event loop is closed")
        except RuntimeError:
            # No event loop in current thread, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        try:
            result = loop.run_until_complete(
                nova_sonic_service.stream_audio(session_id, audio_b64)
            )
            
            if not result.get('success', False):
                return jsonify({'error': result.get('error', 'Unknown error'), 'success': False}), 400
            
            # Nova Sonic returns native audio and text responses
            responses = result.get('responses', [])
            logger.info(f"📨 Nova Sonic returned {len(responses)} responses for demo session {session_id}")
            
            return jsonify({
                'success': True,
                'responses': responses,
                'session_id': session_id,
                'real_nova_sonic': True,
                'status': result.get('status'),
                'collected_count': result.get('collected_count', 0),
                'response_types': result.get('response_types', [])
            })
        except Exception as e:
            logger.error(f"Error in Nova Sonic stream_audio: {str(e)}")
            logger.exception("Full stream_audio error:")
            raise
            
    except Exception as e:
        logger.error(f"Error in demo_stream_audio: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/stream-audio', methods=['POST'])
@login_required
def stream_audio():
    """Process audio with Nova Sonic bidirectional streaming"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        session_id = data.get('session_id')
        audio_b64 = data.get('audio')
        
        if not session_id or not audio_b64:
            return jsonify({'error': 'session_id and audio are required'}), 400
            
        # Validate base64 audio format
        try:
            # Just validate it's valid base64, but don't decode it
            base64.b64decode(audio_b64)
        except Exception as e:
            return jsonify({'error': 'Invalid base64 audio data'}), 400
            
        # Use the existing event loop or create one if needed
        try:
            # Try to get the current event loop
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Event loop is closed")
        except RuntimeError:
            # No event loop in current thread, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        try:
            result = loop.run_until_complete(
                nova_sonic_service.stream_audio(session_id, audio_b64)
            )
            
            if not result.get('success', False):
                return jsonify({'error': result.get('error', 'Unknown error'), 'success': False}), 400
            
            # Nova Sonic returns native audio and text responses
            responses = result.get('responses', [])
            logger.info(f"📨 Nova Sonic returned {len(responses)} responses for session {session_id}")
            
            return jsonify({
                'success': True,
                'responses': responses,
                'session_id': session_id,
                'real_nova_sonic': True,
                'status': result.get('status'),
                'collected_count': result.get('collected_count', 0)
            })
        except Exception as e:
            logger.error(f"Error in Nova Sonic stream_audio: {str(e)}")
            logger.exception("Full stream_audio error:")
            raise
            
    except Exception as e:
        logger.error(f"Error in stream_audio: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/process-audio', methods=['POST'])
def process_audio():
    """Process audio input and return response - public endpoint for demo"""
    try:
        # Check if audio file was uploaded
        if 'audio' in request.files:
            audio_file = request.files['audio']
            audio_data = audio_file.read()
        elif request.is_json:
            # Handle base64 encoded audio
            data = request.get_json()
            audio_b64 = data.get('audio')
            if not audio_b64:
                return jsonify({'error': 'No audio data provided'}), 400
            audio_data = base64.b64decode(audio_b64)
        else:
            return jsonify({'error': 'No audio data provided'}), 400
        
        session_id = request.form.get('session_id') or request.json.get('session_id', 'default')
        
                 # Process audio with Nova Sonic
        def generate_response():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                async def process_stream():
                    async_gen = nova_sonic_service.process_audio_stream(audio_data, session_id)
                    results = []
                    async for result in async_gen:
                        results.append(f"data: {json.dumps(result)}\n\n")
                    return results
                
                # Convert async generator to sync
                results = loop.run_until_complete(process_stream())
                for chunk in results:
                    yield chunk
                    
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            finally:
                loop.close()
        
        return Response(
            generate_response(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/text-to-speech', methods=['POST'])
@login_required
def text_to_speech():
    """Convert text to speech using Nova Sonic"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        
        text = data['text']
        voice_config = data.get('voice_config', {})
        
        # Use Nova Sonic for text-to-speech (not yet implemented)
        return jsonify({
            'error': 'Text-to-speech via Nova Sonic not yet implemented',
            'success': False
        })
        
    except Exception as e:
        logger.error(f"Error in text-to-speech: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/demo-text-to-speech', methods=['POST'])
def demo_text_to_speech():
    """Demo text-to-speech endpoint (fallback to ElevenLabs)"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
            
        text = data['text']
        voice_type = data.get('voice_type', 'feminine')
        
        # Use Nova Sonic for text-to-speech (when available)
        # For now, return an error since we're not using ElevenLabs anymore
        return jsonify({
            'error': 'Text-to-speech via Nova Sonic not yet implemented',
            'success': False,
            'demo_mode': True
        })
            
    except Exception as e:
        logger.error(f"Error in demo_text_to_speech: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ElevenLabs route removed - using Nova Sonic only

@nova_sonic_bp.route('/voices', methods=['GET'])
@login_required
def get_voices():
    """Get available voice options"""
    try:
        # Return Nova Sonic voice options
        voices = {
            'nova_sonic': [
                {
                    'id': 'nova_feminine',
                    'name': 'Nova Female',
                    'gender': 'female',
                    'description': 'Natural female voice via Nova Sonic'
                },
                {
                    'id': 'nova_masculine',
                    'name': 'Nova Male',
                    'gender': 'male',
                    'description': 'Natural male voice via Nova Sonic'
                }
            ]
        }
        return jsonify(voices)
        
    except Exception as e:
        logger.error(f"Error getting voices: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/end-session', methods=['POST'])
@login_required
def end_session():
    """End a Nova Sonic conversation session"""
    try:
        data = request.get_json()
        if not data or 'session_id' not in data:
            return jsonify({'error': 'session_id is required'}), 400
            
        session_id = data['session_id']
        service = get_nova_sonic_service()
        
        # End session
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            success = loop.run_until_complete(service.end_session(session_id))
            return jsonify({
                'success': success,
                'session_id': session_id,
                'message': 'Session ended successfully' if success else 'Failed to end session'
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/test-connection', methods=['POST'])
@login_required
def test_connection():
    """Test connection to Nova Sonic service"""
    try:
        # Check Nova Sonic service status
        status = nova_sonic_service.get_status()
        if not status.get('available', False):
            return jsonify({
                'success': False,
                'message': 'Nova Sonic service is not available. Check AWS credentials and region configuration.',
                'status': status
            }), 503
        
        # Test Nova Sonic service only
        test_text = "Hello, this is a test of the Nova Sonic service."
        
        return jsonify({
            'success': True,
            'message': 'Nova Sonic service is working correctly',
            'status': status,
            'test_completed': True
        })
        
    except Exception as e:
        logger.error(f"Error testing connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Connection test failed: {str(e)}'
        }), 500

# Sales Training Specific Routes

@nova_sonic_bp.route('/sales-scenarios', methods=['GET'])
def get_sales_scenarios():
    """Get predefined sales training scenarios for Nova Sonic - public endpoint for demo"""
    scenarios = [
        {
            'id': 'cold_call',
            'name': 'Cold Call Practice',
            'description': 'Practice making cold calls to potential customers',
            'system_prompt': """You are a potential customer receiving a cold call. 
            You are initially skeptical but can be convinced with good sales techniques. 
            Respond naturally and challenge the salesperson to improve their skills."""
        },
        {
            'id': 'objection_handling',
            'name': 'Objection Handling',
            'description': 'Practice handling common sales objections',
            'system_prompt': """You are a customer with specific objections about price, timing, or need. 
            Present realistic objections and see how well the salesperson handles them. 
            Be firm but fair in your responses."""
        },
        {
            'id': 'product_demo',
            'name': 'Product Demonstration',
            'description': 'Practice giving product demonstrations',
            'system_prompt': """You are a potential customer interested in learning about a product. 
            Ask relevant questions and show interest based on how well the salesperson explains features and benefits."""
        },
        {
            'id': 'closing_techniques',
            'name': 'Closing Techniques',
            'description': 'Practice different closing techniques',
            'system_prompt': """You are a customer who is interested but hesitant to make a decision. 
            Respond to different closing techniques and help the salesperson practice their closing skills."""
        }
    ]
    
    return jsonify({'scenarios': scenarios})

@nova_sonic_bp.route('/start-sales-session', methods=['POST'])
def start_sales_session():
    """Start a sales training session with a specific scenario - public endpoint for demo"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        scenario_id = data.get('scenario_id', 'cold_call')
        custom_prompt = data.get('custom_prompt')
        
        # Get scenario or use custom prompt
        if custom_prompt:
            system_prompt = custom_prompt
        else:
            scenario = sales_training_tools.get_scenario(scenario_id)
            system_prompt = scenario.get('prompt', scenario.get('description', ''))
        
        # Start conversation with Nova Sonic
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                nova_sonic_service.start_conversation(system_prompt=system_prompt, voice_type='feminine')
            )
            session_id = result.get('session_id')
            session_info = nova_sonic_service.get_session_info(session_id)
            
            return jsonify({
                'session_id': session_id,
                'scenario_id': scenario_id,
                'session_info': session_info,
                'demo_mode': True,
                'limitation_notice': 'Using demonstration mode - experimental SDK not yet available'
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error starting sales session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@nova_sonic_bp.route('/demo-get-initial-response', methods=['POST'])
def demo_get_initial_response():
    """Get Nova Sonic's initial response to start the conversation - public demo endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'session_id is required'}), 400
            
        # Use the existing event loop or create one if needed
        try:
            # Try to get the current event loop
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Event loop is closed")
        except RuntimeError:
            # No event loop in current thread, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        try:
            result = loop.run_until_complete(
                nova_sonic_service.get_initial_response(session_id)
            )
            
            if not result.get('success', False):
                return jsonify({'error': result.get('error', 'Unknown error'), 'success': False}), 400
            
            responses = result.get('responses', [])
            logger.info(f"📨 Nova Sonic returned {len(responses)} initial responses for session {session_id}")
            
            return jsonify({
                'success': True,
                'responses': responses,
                'session_id': session_id,
                'real_nova_sonic': True
            })
        except Exception as e:
            logger.error(f"Error in Nova Sonic get_initial_response: {str(e)}")
            logger.exception("Full get_initial_response error:")
            raise
            
    except Exception as e:
        logger.error(f"Error in demo_get_initial_response: {str(e)}")
        return jsonify({'error': str(e)}), 500



