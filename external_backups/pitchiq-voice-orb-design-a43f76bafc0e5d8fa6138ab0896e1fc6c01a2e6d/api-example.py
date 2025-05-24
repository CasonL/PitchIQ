"""
Sample API endpoint for the Voice Orb Chat interface

This file provides an example of how to implement the backend API endpoint
that the Voice Orb component will communicate with. This code should be 
integrated into your existing Flask routes.
"""

from flask import Blueprint, request, jsonify
import time
import random

# This should be your actual AI service
from app.services.claude_service import generate_roleplay_response

# Create a blueprint for the chat API
chat_api = Blueprint('chat_api', __name__)

@chat_api.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages from the voice orb interface"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing message in request body'
            }), 400
        
        user_message = data['message']
        
        # Get conversation history if provided
        conversation_id = data.get('conversation_id')
        
        # TODO: Get the actual conversation history from your database
        conversation_history = []
        
        # Generate AI response using your existing service
        ai_response, completion_id = generate_roleplay_response(
            user_message=user_message,
            conversation_history=conversation_history
        )
        
        # Generate some example metrics
        # In a real implementation, these would come from your AI analysis
        metrics = generate_metrics(user_message)
        
        # Store the conversation in your database
        # TODO: Add your database code here
        
        return jsonify({
            'status': 'success',
            'response': ai_response,
            'metrics': metrics,
            'completion_id': completion_id
        })
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


def generate_metrics(message):
    """
    Generate metrics based on the user's message.
    This is a placeholder - your real implementation would do actual analysis.
    """
    # Placeholder logic - in reality, this would use NLP to analyze the message
    message_length = len(message)
    
    # Simple metrics based on message length and content
    has_greeting = any(word in message.lower() for word in ['hello', 'hi', 'hey'])
    has_question = '?' in message
    has_value_prop = any(word in message.lower() for word in ['value', 'benefit', 'advantage', 'solution', 'problem'])
    
    # Calculate simple scores
    clarity = min(message_length / 200, 1) * 0.8 + random.uniform(0, 0.2)
    confidence = 0.6 + random.uniform(0, 0.3)
    engagement = 0.5 + (0.1 if has_greeting else 0) + (0.2 if has_question else 0) + (0.2 if has_value_prop else 0)
    
    # Key points is an integer 0-5
    key_points = min(int(engagement * 5), 5)
    
    return {
        'clarity': round(clarity, 2),
        'confidence': round(confidence, 2),
        'engagement': round(engagement, 2),
        'keyPointsHit': key_points
    }


# To integrate into your main app:
# 
# from app import app
# from .api import chat_api
# 
# app.register_blueprint(chat_api) 