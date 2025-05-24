from flask import Blueprint, request, jsonify
import os
import openai
from app.utils.auth import require_auth
from app.utils.logger import get_logger

# Get logger
logger = get_logger(__name__)

# Initialize blueprint
chat_api_blueprint = Blueprint('chat_api', __name__)

# Environment setup
openai.api_key = os.environ.get('OPENAI_API_KEY')

@chat_api_blueprint.route('/api/chat/initial-greeting', methods=['GET', 'POST'])
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