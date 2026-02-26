from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import os
import time
import requests
from app.utils.logger import get_smart_logger, log_api_call

logger = get_smart_logger(__name__)

deepgram_bp = Blueprint('deepgram', __name__)

@deepgram_bp.route('/token', methods=['GET'])
def get_deepgram_token():
    """Generate temporary JWT token for browser-side Deepgram WebSocket connections.
    Tokens expire in 30 seconds but WebSocket stays alive after connection.
    """
    try:
        # Get Deepgram API key from environment
        master_api_key = current_app.config.get('DEEPGRAM_API_KEY') or os.getenv('DEEPGRAM_API_KEY')
        
        if not master_api_key:
            logger.error("Deepgram API key not found in environment")
            return jsonify({
                'success': False,
                'error': 'Deepgram API key not configured'
            }), 500
        
        # Generate temporary JWT token via Deepgram API
        # This is required for browser security - raw API keys don't work from browsers
        try:
            response = requests.post(
                'https://api.deepgram.com/v1/auth/grant',
                headers={'Authorization': f'Token {master_api_key}'},
                timeout=5
            )
            
            if response.status_code == 200:
                token_data = response.json()
                jwt_token = token_data.get('access_token')
                expires_in = token_data.get('expires_in', 30)
                
                if current_user.is_authenticated:
                    logger.info(f"Generated temporary Deepgram token for user {current_user.id} (expires in {expires_in}s)")
                else:
                    logger.info(f"Generated temporary Deepgram token (demo mode, expires in {expires_in}s)")
                
                return jsonify({
                    'key': jwt_token,
                    'token': jwt_token,
                    'expires_in': expires_in
                })
            elif response.status_code == 403:
                # API key doesn't have permission to create temporary tokens
                # Fall back to returning the master key (works for development)
                logger.warning(f"API key lacks permission for JWT generation (403). Falling back to master key.")
                logger.info("For production, upgrade to a Deepgram API key with temporary token permissions")
                
                return jsonify({
                    'key': master_api_key,
                    'token': master_api_key,
                    'note': 'Using master API key (JWT generation not permitted)'
                })
            else:
                logger.error(f"Failed to generate Deepgram token: {response.status_code} - {response.text}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to generate token: {response.status_code}'
                }), 500
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling Deepgram API: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Failed to reach Deepgram API'
            }), 500
        
    except Exception as e:
        logger.error(f"Error getting Deepgram token: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get Deepgram token'
        }), 500

@deepgram_bp.route('/test-agent-access', methods=['GET'])
@login_required
def test_agent_access():
    """Test basic Deepgram API connectivity (Agent service is WebSocket-only)"""
    try:
        # Get Deepgram API key from environment
        master_api_key = current_app.config.get('DEEPGRAM_API_KEY') or os.getenv('DEEPGRAM_API_KEY')
        
        if not master_api_key:
            return jsonify({
                'success': False,
                'error': 'Deepgram API key not configured'
            }), 500
        
        # Since Deepgram Agent service is WebSocket-only, we'll test basic API access
        headers = {
            'Authorization': f'Token {master_api_key}',
            'Content-Type': 'application/json'
        }
        
        # Test basic Deepgram API access to validate the key
        try:
            response = requests.get(
                'https://api.deepgram.com/v1/projects',
                headers=headers,
                timeout=10
            )
            
            logger.info(f"Basic API test - Status: {response.status_code}")
            
            if response.status_code == 200:
                return jsonify({
                    'success': True,
                    'agent_access': True,
                    'message': 'API key is valid for basic Deepgram services.',
                    'note': 'Agent service uses WebSocket-only connection. Connection issues may be due to network/firewall restrictions or WebSocket handshake problems.',
                    'websocket_url': 'wss://agent.deepgram.com/v1/agent/converse',
                    'auth_method': 'WebSocket subprotocol with API key'
                })
            elif response.status_code == 401:
                return jsonify({
                    'success': False,
                    'agent_access': False,
                    'error': 'API key authentication failed',
                    'message': 'Invalid API key - this will also affect Agent WebSocket connections'
                })
            elif response.status_code == 403:
                return jsonify({
                    'success': False,
                    'agent_access': False,
                    'error': 'API key access denied',
                    'message': 'API key permissions issue - check if key has Agent service access'
                })
            else:
                return jsonify({
                    'success': False,
                    'agent_access': False,
                    'error': f'Unexpected response: {response.status_code}',
                    'message': response.text[:200] if response.text else 'No response body'
                })
                
        except requests.exceptions.Timeout:
            return jsonify({
                'success': False,
                'agent_access': False,
                'error': 'Request timeout',
                'message': 'Could not connect to Deepgram API within 10 seconds'
            })
        except requests.exceptions.ConnectionError:
            return jsonify({
                'success': False,
                'agent_access': False,
                'error': 'Connection error',
                'message': 'Could not connect to Deepgram API - check network connectivity'
            })
        except requests.exceptions.RequestException as e:
            return jsonify({
                'success': False,
                'agent_access': False,
                'error': f'Network error: {str(e)}',
                'message': 'Could not connect to Deepgram API'
            })
        
    except Exception as e:
        logger.error(f"Error testing Agent access: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to test Agent access: {str(e)}'
        }), 500