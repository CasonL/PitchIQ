"""
API Routes Package

This package contains API routes for the application.
"""

from flask import Blueprint, request, jsonify

api = Blueprint('api', __name__)
api_bp = api  # Alias for backward compatibility

# Import the API routes to register them with the blueprint
from . import personalization, auth, contact, email_signup, dashboard, chat, generate_contextual_question, embeddings, dashboard_coach, roleplay

# Test endpoint for persona service
@api.route('/test-persona', methods=['POST'])
def test_persona():
    """Test endpoint to verify persona service is working with consumer products."""
    try:
        from app.services.persona_service import generate_coach_persona
        
        data = request.get_json() if request.is_json else {}
        
        # Use test data if no data provided
        test_data = {
            'core_q1_product': data.get('core_q1_product', '3D outdoor TVs'),
            'core_q2_audience': data.get('core_q2_audience', 'wealthy homeowners looking to spruce up their backyards'),
            'core_q5_goal': data.get('core_q5_goal', 'better conversations')
        }
        
        persona = generate_coach_persona(test_data)
        
        return jsonify({
            'status': 'success',
            'input_data': test_data,
            'generated_persona': persona
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

__all__ = ['api', 'api_bp'] 