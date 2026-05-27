"""
Lightweight health check endpoint for Render cold start mitigation
"""
from flask import Blueprint, jsonify
import time

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Lightweight health check endpoint
    Used by frontend to wake up Render instance before user starts call
    Returns immediately without heavy database or API checks
    """
    return jsonify({
        'status': 'ok',
        'timestamp': time.time(),
        'message': 'Backend is awake'
    }), 200
