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
        master_api_key = current_app.config.get('DEEPGRAM_API_KEY') or os.getenv('DEEPGRAM_API_KEY')
        
        if not master_api_key:
            logger.error("Deepgram API key not found in environment")
            return jsonify({
                'success': False,
                'error': 'Deepgram API key not configured'
            }), 500
        
        # Try to create a scoped token with both listen and speak permissions
        try:
            # Use the working project ID from the backup
            project_id = "578dcb8a-027d-4557-8867-92df3b4c8f27"
            url = f"https://api.deepgram.com/v1/projects/{project_id}/keys"
            
            headers = {
                "Authorization": f"Token {master_api_key}",
                "Content-Type": "application/json"
            }
            
            # Create token with both listen and speak scopes for Voice Agent
            payload = {
                "name": f"voice-agent-{current_user.id}-{int(time.time())}",
                "scopes": ["listen", "speak"],  # Both scopes for Voice Agent
                "time_to_live_in_seconds": 3600,  # 1 hour
                "comment": f"Voice Agent token for user {current_user.id}"
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                token_data = response.json()
                scoped_token = token_data.get('key')
                
                if scoped_token:
                    logger.info(f"Created scoped Deepgram token for user {current_user.id}")
                    return jsonify({'token': scoped_token})
                else:
                    logger.error("No token in Deepgram response")
                    # Fallback to master key
                    return jsonify({'token': master_api_key})
            else:
                logger.warning(f"Failed to create scoped token: {response.status_code} - {response.text}")
                # Fallback to master key
                return jsonify({'token': master_api_key})
                
        except Exception as token_error:
            logger.warning(f"Error creating scoped token: {token_error}")
            # Fallback to master key
            return jsonify({'token': master_api_key})
        
    except Exception as e:
        logger.error(f"Error getting Deepgram token: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get Deepgram token'
        }), 500