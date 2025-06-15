from flask import Blueprint, request, jsonify, current_app
import os
import openai
from app.utils.auth import require_auth
from app.utils.logger import get_logger
from flask_login import login_required, current_user
from app.models import Conversation, db, User, Message
from app.services.openai_service import OpenAIService
import logging

chat_api_bp = Blueprint('chat_api', __name__)

# Get logger
logger = get_logger(__name__)

# Environment setup
openai.api_key = os.environ.get('OPENAI_API_KEY')

@chat_api_bp.route('/initial-greeting', methods=['GET', 'POST'])
@require_auth
def initial_greeting():
    """
    API endpoint to get the initial greeting message from the AI
    """
    try:
        # Get context data from request if available
        context = None
        user_name = None
        
        if request.method == 'POST':
            data = request.get_json()
            context = data.get('context') if data else None
            user_name = data.get('userName') if data else None
        
        # Generate a personalized greeting with proper spacing
        greeting = "Welcome to your Sales Training onboarding! "
        
        # Add personalization if name is provided
        if user_name:
            greeting = f"Welcome to your Sales Training onboarding, {user_name}! "
            
        # Complete the greeting with clear indication this is onboarding and proper spacing
        # Ensure proper spacing between all words by using space-separated words
        greeting_parts = [
            "I'll help you set up your personalized training experience.",
            "To get started, please tell me about the product or service you sell.",
            "This will help me tailor the training to your specific needs."
        ]
        
        # Join with spaces to ensure proper word separation
        greeting += " ".join(greeting_parts)
        
        return jsonify({
            "message": greeting
        })
    except Exception as e:
        logger.error(f"Error generating initial greeting: {str(e)}")
        return jsonify({"error": str(e)}), 500

@chat_api_bp.route('/history')
@login_required
def get_chat_history():
    """
    Returns the chat history for the current user.
    """
    conversations = Conversation.query.filter_by(user_id=current_user.id).all()
    return jsonify([conv.to_dict() for conv in conversations])

@chat_api_bp.route('/message', methods=['POST'])
@login_required
def post_chat_message():
    """
    Handles posting a new chat message.
    """
    # Placeholder
    return jsonify({'status': 'success'})

@chat_api_bp.route('/coaching-feedback', methods=['POST'])
def coaching_feedback():
    """
    Provide AI coaching feedback for sales conversations
    """
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        max_tokens = data.get('maxTokens', 200)
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        # Use the same pattern as dashboard.py for getting the OpenAI service
        from flask import g
        from app.services.api_manager import api_manager
        
        service_manager = getattr(g, 'api_manager', api_manager)
        
        if not service_manager or not hasattr(service_manager, 'openai_service'):
            logger.error("OpenAI service not found in API manager!")
            return jsonify({'error': 'AI service configuration error'}), 500
        
        # Create coaching system prompt
        system_prompt = """You are an expert sales coach providing feedback on sales conversations. 
        Your feedback should be:
        - Direct and actionable
        - Focus on emotional intelligence and reading between the lines
        - Point out what the salesperson missed
        - Suggest better questions or approaches
        - Use emojis like ⚠️ for warnings and 🎯 for insights
        - Keep responses under 150 words
        - Be encouraging but honest about mistakes"""
        
        # Use the same pattern as dashboard.py for generating responses
        messages_for_api = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        # Get AI response using the established pattern
        ai_response_content = service_manager.openai_service.generate_response(
            messages=messages_for_api,
            model="gpt-4o-mini",  # Use the same model as other endpoints
            temperature=0.7,
            max_tokens=max_tokens
        )
        
        return jsonify({
            'response': ai_response_content,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error in coaching feedback: {str(e)}")
        return jsonify({
            'error': 'Failed to generate coaching feedback',
            'success': False
        }), 500 