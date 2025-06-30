from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import os
import logging
import time
import requests

logger = logging.getLogger(__name__)

deepgram_bp = Blueprint('deepgram', __name__)

@deepgram_bp.route('/token', methods=['GET'])
@login_required
def get_deepgram_token():
    """Get Deepgram API token for Voice Agent integration with proper scopes"""
    try:
        # Get Deepgram API key from environment
        master_api_key = os.getenv('DEEPGRAM_API_KEY')
        
        if not master_api_key:
            logger.error("Deepgram API key not found in environment")
            return jsonify({
                'success': False,
                'error': 'Deepgram API key not configured'
            }), 500
        
        # Try to create a scoped token with both listen and speak permissions
        try:
            # Project ID - you may need to update this with your actual project ID
            project_id = "578dcb8a-027d-4557-8867-92df3b4c8f27"  # From voice routes
            url = f"https://api.deepgram.com/v1/projects/{project_id}/keys"
            
            headers = {
                "Authorization": f"Token {master_api_key}",
                "Content-Type": "application/json"
            }
            
            # Create token with both listen and speak scopes for Voice Agent
            payload = {
                "name": f"voice-agent-{current_user.id}-{int(time.time())}",
                "scopes": ["listen", "speak"],  # 🔑 Both scopes for Voice Agent
                "time_to_live_in_seconds": 3600,  # 1 hour
                "comment": f"Voice Agent token for user {current_user.id}"
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                token_data = response.json()
                scoped_token = token_data.get('key')
                
                if scoped_token:
                    logger.info(f"Created scoped Deepgram token for user {current_user.id}")
                    return jsonify({
                        'success': True,
                        'token': scoped_token,
                        'user_id': current_user.id
                    })
                else:
                    logger.error("No token in Deepgram response")
                    # Fallback to master key
                    return jsonify({
                        'success': True,
                        'token': master_api_key,
                        'user_id': current_user.id
                    })
            else:
                logger.warning(f"Failed to create scoped token: {response.status_code} - {response.text}")
                # Fallback to master key
                return jsonify({
                    'success': True,
                    'token': master_api_key,
                    'user_id': current_user.id
                })
                
        except Exception as token_error:
            logger.warning(f"Error creating scoped token: {token_error}")
            # Fallback to master key
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