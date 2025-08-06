from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import json
from datetime import datetime
from app.utils.logger import get_smart_logger

logger = get_smart_logger(__name__)

websocket_logging_bp = Blueprint('websocket_logging', __name__)

@websocket_logging_bp.route('/log-websocket-message', methods=['POST'])
def log_websocket_message():
    """Log WebSocket messages from the frontend for debugging - available without authentication"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        direction = data.get('direction', 'UNKNOWN')
        persona = data.get('persona', 'Unknown')
        message = data.get('message', {})
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        # Format the log message for easy reading
        if direction == 'SENT':
            logger.info(f"🔥 WEBSOCKET [{persona}] SENT → {json.dumps(message, indent=2)}")
        else:
            logger.info(f"🔥 WEBSOCKET [{persona}] RECEIVED ← {json.dumps(message, indent=2)}")
        
        return jsonify({'status': 'logged'}), 200
        
    except Exception as e:
        logger.error(f"Error logging WebSocket message: {str(e)}")
        return jsonify({'error': 'Failed to log message'}), 500

@websocket_logging_bp.route('/log-conversation-text', methods=['POST'])
@login_required
def log_conversation_text():
    """Log conversation text specifically for easy transcript viewing"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        persona = data.get('persona', 'Unknown')
        role = data.get('role', 'unknown')
        text = data.get('text', '')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        # Format conversation text for easy reading
        if role == 'user':
            logger.info(f"🔥 CONVERSATION [{persona}] 🎤 USER: \"{text}\"")
        elif role == 'assistant':
            logger.info(f"🔥 CONVERSATION [{persona}] 🤖 {persona}: \"{text}\"")
        else:
            logger.info(f"🔥 CONVERSATION [{persona}] {role}: \"{text}\"")
        
        return jsonify({'status': 'logged'}), 200
        
    except Exception as e:
        logger.error(f"Error logging conversation text: {str(e)}")
        return jsonify({'error': 'Failed to log conversation'}), 500 