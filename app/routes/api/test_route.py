"""
Test route to verify API responsiveness
"""

from flask import Blueprint, jsonify

test_api = Blueprint('test_api', __name__)

@test_api.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint that returns immediately with minimal data"""
    return jsonify({
        "status": "success",
        "message": "API is working correctly",
        "timestamp": "immediate response"
    }) 