from flask import Blueprint, request, jsonify
from flask_login import current_user
import json
from datetime import datetime
from app.utils.logger import get_smart_logger
from app.extensions import csrf  # Import the csrf object

logger = get_smart_logger(__name__)

call_metrics_bp = Blueprint('call_metrics', __name__)

# Exempt this blueprint from CSRF protection
csrf.exempt(call_metrics_bp)

@call_metrics_bp.route('/call-metrics', methods=['POST'])
def log_call_metrics():
    """Log call metrics from the frontend"""
    try:
        # Get data from the request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract metrics and events
        metrics = data.get('metrics', {})
        events = data.get('events', [])
        
        # Log who is sending the metrics if authenticated
        user_info = f"User ID: {current_user.id}" if current_user.is_authenticated else "Unauthenticated user"
        
        # Log the key metrics
        session_id = metrics.get('sessionId', 'unknown')
        persona = metrics.get('personaName', 'unknown')
        duration = metrics.get('duration', 0)
        
        logger.info(f"📊 CALL METRICS [{session_id}] Received from {user_info}")
        logger.info(f"📊 CALL METRICS [{session_id}] Persona: {persona}, Duration: {duration/1000:.1f}s")
        logger.info(f"📊 CALL METRICS [{session_id}] Details: {json.dumps(metrics, indent=2)}")
        
        # Log some key events if needed
        if len(events) > 0:
            logger.info(f"📊 CALL METRICS [{session_id}] Received {len(events)} events")
        
        # In the future, you could store these metrics in a database
        
        return jsonify({'status': 'logged'}), 200
        
    except Exception as e:
        logger.error(f"Error logging call metrics: {str(e)}")
        return jsonify({'error': 'Failed to log metrics'}), 500
