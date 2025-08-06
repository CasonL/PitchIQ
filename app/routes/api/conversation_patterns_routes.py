"""
Conversation Patterns API Routes

This module provides API routes for generating natural conversation patterns
for AI prospect personas based on personality traits and engagement levels.
"""

from flask import Blueprint, request, jsonify
from app.services.conversation_patterns import generate_prompt_enhancement

# Create blueprint
conversation_patterns_bp = Blueprint('conversation_patterns', __name__)

@conversation_patterns_bp.route('/api/conversation-patterns', methods=['POST'])
def get_conversation_patterns():
    """
    Generate conversation pattern instructions for an AI prospect persona.
    
    Request body should contain persona details including:
    - personality_traits: List of personality traits
    - is_business_buyer: Boolean indicating if B2B (True) or B2C (False)
    - interest_level: Integer from 1-10 indicating prospect's interest level
    
    Returns:
        JSON with conversation pattern instructions
    """
    try:
        # Get persona data from request
        persona = request.json
        
        if not persona:
            return jsonify({'error': 'No persona data provided'}), 400
        
        # Generate conversation pattern instructions
        conversation_instructions = generate_prompt_enhancement(persona)
        
        return jsonify({
            'success': True,
            'conversation_instructions': conversation_instructions
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
