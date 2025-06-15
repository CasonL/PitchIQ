"""
Test route to verify API responsiveness
"""

from flask import jsonify
from . import api

@api.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint that returns immediately with minimal data"""
    return jsonify({
        "status": "success",
        "message": "API is working correctly",
        "timestamp": "immediate response"
    }) 