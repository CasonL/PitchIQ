from flask import Blueprint, request, jsonify
import os
import time
import openai
from app.utils.auth import require_auth
from app.utils.logger import get_logger

# Get logger
logger = get_logger(__name__)

# Initialize blueprint
generate_contextual_question_blueprint = Blueprint('generate_contextual_question', __name__)

# Environment setup
openai.api_key = os.environ.get('OPENAI_API_KEY')

@generate_contextual_question_blueprint.route('/api/generate-contextual-question', methods=['POST'])
@require_auth
def generate_contextual_question():
    """
    API endpoint to generate contextual questions based on previous conversation
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        base_question = data.get('baseQuestion', '')
        previous_answers = data.get('previousAnswers', [])
        stage = data.get('stage', 'unknown')
        
        if not base_question:
            return jsonify({"error": "Base question is required"}), 400
        
        # Create context string from previous answers
        context = ""
        if previous_answers:
            context = "Previous conversation:\n"
            for i, qa in enumerate(previous_answers[-3:]):  # Use last 3 QA pairs
                context += f"Q: {qa.get('question', '')}\n"
                context += f"A: {qa.get('text', '')}\n"
        
        # Define prompt based on stage
        stage_context = ""
        if stage == "product":
            stage_context = "The user is discussing their product or service. Focus on understanding what it does, its unique features, and its value proposition."
        elif stage == "market_and_buyer":
            stage_context = "The user is discussing their target market and ideal buyers. Focus on understanding who they sell to, their needs, and buying process."
        elif stage == "sales_context":
            stage_context = "The user is discussing their sales context. Focus on understanding their sales cycle, objections, and competitive landscape."
        else:
            stage_context = "The user is discussing general sales topics. Focus on understanding their overall sales approach and challenges."
        
        # For development purposes, simulate a delay and return an enhanced question
        time.sleep(0.5)  # Simulate processing time
        
        # Simple enhancement for now - in production, this would use the AI model
        enhanced_question = base_question
        
        # If we have context, try to make the question more specific
        if context:
            # This is a very simple enhancement - in production use OpenAI
            if "product" in base_question.lower() and "feature" in context.lower():
                enhanced_question = base_question + " Especially those features you mentioned earlier?"
            elif "customer" in base_question.lower() and "pain" in context.lower():
                enhanced_question = base_question + " Particularly related to the pain points you described?"
        
        return jsonify({
            "originalQuestion": base_question,
            "enhancedQuestion": enhanced_question,
            "stage": stage
        })
        
    except Exception as e:
        logger.error(f"Error generating contextual question: {str(e)}")
        return jsonify({"error": str(e)}), 500


@generate_contextual_question_blueprint.route('/api/generate-followup-question', methods=['POST'])
@require_auth
def generate_followup_question():
    """
    API endpoint to generate follow-up questions based on user answers
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        answer = data.get('answer', '')
        question = data.get('question', '')
        previous_answers = data.get('previousAnswers', [])
        stage = data.get('stage', 'unknown')
        
        if not answer or not question:
            return jsonify({"error": "Answer and question are required"}), 400
        
        # Create context string from previous answers
        context = ""
        if previous_answers:
            context = "Previous conversation:\n"
            for i, qa in enumerate(previous_answers[-2:]):  # Use last 2 QA pairs
                context += f"Q: {qa.get('question', '')}\n"
                context += f"A: {qa.get('text', '')}\n"
        
        # Define stage guidance
        stage_guidance = ""
        if stage == "product":
            stage_guidance = "Focus on learning more about product features, benefits, and differentiation."
        elif stage == "market_and_buyer":
            stage_guidance = "Focus on learning more about target customers, their needs, and buying process."
        elif stage == "sales_context":
            stage_guidance = "Focus on learning more about sales cycle, objections, and competitive positioning."
        else:
            stage_guidance = "Focus on learning more about general sales approach and strategies."
        
        # For development purposes, simulate a delay and return a follow-up question
        time.sleep(0.5)  # Simulate processing time
        
        # Simple follow-up generation - in production, this would use the AI model
        follow_up = "Could you tell me more about that?"
        
        # Basic keyword matching for follow-up questions
        lower_answer = answer.lower()
        if "competitor" in lower_answer or "alternative" in lower_answer:
            follow_up = "How do you typically position yourself against these competitors?"
        elif "feature" in lower_answer or "capability" in lower_answer:
            follow_up = "Which of these features do customers find most valuable?"
        elif "customer" in lower_answer or "client" in lower_answer:
            follow_up = "What are the key pain points these customers experience?"
        elif "objection" in lower_answer or "concern" in lower_answer:
            follow_up = "How do you typically handle these objections in your sales conversations?"
        
        return jsonify({
            "followUpQuestion": follow_up,
            "stage": stage
        })
        
    except Exception as e:
        logger.error(f"Error generating follow-up question: {str(e)}")
        return jsonify({"error": str(e)}), 500 