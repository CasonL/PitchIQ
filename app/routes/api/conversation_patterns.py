"""
Conversation Patterns API Routes

This module provides API routes for generating natural conversation patterns
for AI prospect personas based on personality traits and engagement levels.
"""

from flask import Blueprint, request, jsonify
from app.services.conversation_patterns import generate_conversation_instructions

# Create blueprint
conversation_patterns_bp = Blueprint('conversation_patterns', __name__)

@conversation_patterns_bp.route('/conversation-patterns', methods=['POST'])
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
        
        # Extract relevant persona attributes
        personality_traits = persona.get('personality_traits', [])
        is_business_buyer = persona.get('is_business_buyer', False)
        interest_level = persona.get('interest_level', 5)
        
        # Generate conversation pattern instructions
        # Convert is_business_buyer to business_type parameter
        business_type = "b2b" if is_business_buyer else "b2c"
        
        # Map interest_level to engagement_level
        if interest_level >= 8:
            engagement_level = "highly_engaged"
        elif interest_level >= 5:
            engagement_level = "moderately_engaged"
        elif interest_level >= 3:
            engagement_level = "minimally_engaged"
        else:
            engagement_level = "disengaged"
        
        # Call the function with the correct parameters
        instructions_dict = generate_conversation_instructions(
            personality_traits=personality_traits,
            business_type=business_type,
            engagement_level=engagement_level
        )
        
        # Convert the dictionary to a string format for the prompt
        conversation_instructions = "\n".join([
            f"- Vary your response length from {instructions_dict['response_length']['min_sentences']} to {instructions_dict['response_length']['max_sentences']} sentences based on context.",
            f"- Use a {instructions_dict['speech_style']['formality']} formality level with a {instructions_dict['speech_style']['pacing']} conversation pace.",
            f"- {'Use technical terms when appropriate' if instructions_dict['speech_style']['technical_terms'] else 'Avoid technical jargon and use simple language'}.",
            f"- Ask questions in a {instructions_dict['interaction_patterns']['question_style']} manner when appropriate.",
            "- Don't volunteer all information at once - reveal details gradually.",
            "- Respond more fully to well-crafted open questions.",
            "- Use brief acknowledgments occasionally: 'I see', 'Interesting', 'Got it'.",
            "- Express appropriate emotions (relief, excitement, concern) based on context."
        ])
        
        return jsonify({
            'success': True,
            'conversation_instructions': conversation_instructions
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
