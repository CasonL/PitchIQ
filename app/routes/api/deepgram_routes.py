from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import os
import logging
import time
import requests

logger = logging.getLogger(__name__)

deepgram_bp = Blueprint('deepgram', __name__)

@deepgram_bp.route('/test', methods=['GET'])
def test_deepgram_route():
    """Test endpoint to verify routing works (no auth required)"""
    return jsonify({
        'success': True,
        'message': 'Deepgram routes working',
        'authenticated': current_user.is_authenticated if hasattr(current_user, 'is_authenticated') else False,
        'env_vars': {
            'has_deepgram_key': bool(os.getenv('DEEPGRAM_API_KEY')),
            'has_project_id': bool(os.getenv('DEEPGRAM_PROJECT_ID'))
        }
    })

@deepgram_bp.route('/token-debug', methods=['GET'])
def debug_deepgram_token():
    """Debug endpoint to check Deepgram configuration (no auth required)"""
    master_api_key = os.getenv('DEEPGRAM_API_KEY')
    project_id = os.getenv('DEEPGRAM_PROJECT_ID')
    
    return jsonify({
        'success': True,
        'has_master_key': bool(master_api_key),
        'has_project_id': bool(project_id),
        'master_key_preview': master_api_key[:10] + '...' if master_api_key else None,
        'project_id_preview': project_id[:10] + '...' if project_id else None,
        'authenticated': current_user.is_authenticated if hasattr(current_user, 'is_authenticated') else False
    })

@deepgram_bp.route('/token', methods=['GET'])
@login_required
def get_deepgram_token():
    """Get scoped Deepgram API token for Voice Agent integration"""
    try:
        # Get Deepgram API key from environment
        master_api_key = os.getenv('DEEPGRAM_API_KEY')
        project_id = os.getenv('DEEPGRAM_PROJECT_ID')
        
        if not master_api_key:
            logger.error("Deepgram API key not found in environment")
            return jsonify({
                'success': False,
                'error': 'Deepgram API key not configured'
            }), 500
        
        if not project_id:
            logger.warning("Deepgram project ID not found - falling back to master key")
            return jsonify({
                'success': True,
                'token': master_api_key,
                'user_id': current_user.id,
                'note': 'Using master key (project ID not configured)'
            })
        
        # Create a scoped, time-limited token for Voice Agents
        try:
            resp = requests.post(
                f'https://api.deepgram.com/v1/projects/{project_id}/keys',
                headers={'Authorization': f'Token {master_api_key}'},
                json={
                    'time_to_live_in_seconds': 1800,  # 30 minutes
                    'scopes': ['voice.agent']
                },
                timeout=10
            )
            
            if resp.status_code == 200:
                scoped_key = resp.json()['key']
                logger.info(f"Created scoped DG token for user {current_user.id}")
                return jsonify({
                    'success': True,
                    'token': scoped_key,
                    'user_id': current_user.id
                })
            else:
                logger.error(f"Failed to create scoped token: {resp.status_code} {resp.text}")
                # Fallback to master key with warning
                logger.warning(f"Falling back to master key for user {current_user.id}")
                return jsonify({
                    'success': True,
                    'token': master_api_key,
                    'user_id': current_user.id
                })
                
        except requests.RequestException as e:
            logger.error(f"Network error creating scoped token: {e}")
            # Fallback to master key
            logger.warning(f"Network fallback to master key for user {current_user.id}")
        return jsonify({
            'success': True,
            'token': master_api_key,
            'user_id': current_user.id
        })
        
    except Exception as e:
        logger.error(f"Error getting Deepgram token: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get Deepgram token'
        }), 500

@deepgram_bp.route('/voice-agent/start', methods=['POST'])
@login_required
def start_voice_agent_session():
    """Start a new Deepgram Voice Agent session"""
    try:
        data = request.get_json()
        scenario = data.get('scenario', 'cold_call')
        
        # Here you could create session tracking, logging, etc.
        session_id = f"voice-agent-{current_user.id}-{int(time.time())}"
        
        logger.info(f"Starting Voice Agent session {session_id} for user {current_user.id} with scenario {scenario}")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'scenario': scenario,
            'user_id': current_user.id
        })
        
    except Exception as e:
        logger.error(f"Error starting voice agent session: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to start voice agent session'
        }), 500

@deepgram_bp.route('/voice-agent/end', methods=['POST'])
@login_required
def end_voice_agent_session():
    """End a Deepgram Voice Agent session"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'Session ID required'
            }), 400
        
        # Here you could save session analytics, conversation logs, etc.
        logger.info(f"Ending Voice Agent session {session_id} for user {current_user.id}")
        
        return jsonify({
            'success': True,
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"Error ending voice agent session: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to end voice agent session'
        }), 500 