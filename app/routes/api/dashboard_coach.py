from flask import Blueprint, request, jsonify
import os
import openai
from app.utils.auth import require_auth
from app.utils.logger import get_logger

# Get logger
logger = get_logger(__name__)

# Initialize blueprint
dashboard_coach_blueprint = Blueprint('dashboard_coach', __name__)

# Environment setup
openai.api_key = os.environ.get('OPENAI_API_KEY')

@dashboard_coach_blueprint.route('/api/dashboard/coach', methods=['POST'])
@require_auth
def dashboard_coach():
    """
    API endpoint to generate AI coach responses
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        message = data.get('message', '')
        context = data.get('context', {})
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        # Get the current stage and role from context
        current_stage = context.get('additional_context', {}).get('current_stage', 'product')
        role = context.get('role', 'coach')
        
        # Create a fallback response based on current stage
        fallback_responses = {
            'product': "That's interesting information about your product. Could you tell me more about what features make it unique compared to alternatives?",
            'market_and_buyer': "Thanks for sharing details about your target market. What specific pain points do these customers experience that your product addresses?",
            'sales_context': "Your sales approach makes sense. How do you typically handle objections related to pricing during your sales conversations?",
            'complete': "That's helpful context. Based on what you've shared, I'd recommend focusing on clearly articulating your unique value proposition when speaking with prospects."
        }
        
        fallback_response = fallback_responses.get(current_stage, "Thanks for sharing that information. What other aspects of your sales approach would you like to discuss?")
        
        try:
            # If OpenAI is available, use it to generate a more context-aware response
            if openai.api_key:
                # Create context summary
                context_summary = ""
                if context.get('additional_context'):
                    context_info = context.get('additional_context', {})
                    context_summary = f"""
Current stage: {context_info.get('current_stage', 'unknown')}
Product info: {context_info.get('product_info', 'Not provided')}
Market info: {context_info.get('market_info', 'Not provided')}
Sales context: {context_info.get('sales_context_info', 'Not provided')}
                    """
                
                # Format previous messages for context
                conversation_history = ""
                if context.get('messages'):
                    messages = context.get('messages', [])
                    conversation_history = "\n".join([
                        f"{'User' if msg.get('role') == 'user' else 'Coach'}: {msg.get('content', '')}"
                        for msg in messages[-3:]  # Only include the last 3 messages
                    ])
                
                # Create the prompt for the model
                prompt = f"""
You are a sales coach assistant helping a salesperson improve their skills. Respond to their latest message.

CONTEXT:
{context_summary}

RECENT CONVERSATION:
{conversation_history}

USER'S LATEST MESSAGE:
{message}

Provide a helpful, coach-like response that helps them improve their sales approach. Be concise and practical.
Your response:
"""
                
                # Use the OpenAI API to generate a response
                response = openai.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful sales coach assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=250
                )
                
                # Extract the content from response
                ai_response = response.choices[0].message.content.strip()
                
                # Determine if we need to update the stage
                next_stage = current_stage
                if current_stage != 'complete':
                    # Simple logic - if enough content has been collected in current stage,
                    # suggest moving to the next stage
                    stage_progression = ['product', 'market_and_buyer', 'sales_context', 'complete']
                    current_index = stage_progression.index(current_stage)
                    if len(message) > 100 and current_index < len(stage_progression) - 1:
                        next_stage = stage_progression[current_index + 1]
                
                # Extract topic based on content
                topic = None
                if 'product' in message.lower() or 'feature' in message.lower() or 'service' in message.lower():
                    topic = 'product'
                elif 'market' in message.lower() or 'customer' in message.lower() or 'buyer' in message.lower():
                    topic = 'market'
                elif 'sales' in message.lower() or 'objection' in message.lower() or 'process' in message.lower():
                    topic = 'sales'
                
                # Create a summary of the user's message for contextual tracking
                summary = message[:100] + "..." if len(message) > 100 else message
                
                return jsonify({
                    "content": ai_response,
                    "summary": summary,
                    "next_stage": next_stage,
                    "topic": topic
                })
            
            else:
                # If no OpenAI API key, return fallback response
                return jsonify({
                    "content": fallback_response,
                    "summary": message[:100] + "..." if len(message) > 100 else message,
                    "next_stage": current_stage,
                    "topic": None
                })
                
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            # Return fallback response if AI generation fails
            return jsonify({
                "content": fallback_response,
                "summary": message[:100] + "..." if len(message) > 100 else message,
                "next_stage": current_stage,
                "topic": None
            })
    
    except Exception as e:
        logger.error(f"Error in dashboard coach endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500 