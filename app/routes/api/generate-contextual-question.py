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
            stage_context = "We're discussing the user's product or service."
        elif stage == "market_and_buyer":
            stage_context = "We're discussing the user's target market and buyers."
        elif stage == "sales_context":
            stage_context = "We're discussing the user's sales process and objections."
        else:
            stage_context = "We're having a general sales coaching conversation."
        
        # Create the prompt for the model
        prompt = f"""
You are a sales coach assistant. Your task is to enhance the following question with context from previous conversation to make it feel more natural and connected.

{stage_context}

{context}

Original question: {base_question}

Enhance this question by referencing relevant information from the previous conversation. Keep the enhanced question concise and natural-sounding. Maintain the original intent of the question.

Enhanced question:
"""
        
        # Start timer for performance monitoring
        start_time = time.time()
        
        try:
            # Use the OpenAI API to generate the enhanced question
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful sales coach assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            
            # Extract the enhanced question from response
            enhanced_question = response.choices[0].message.content.strip()
            
            # Log generation time
            generation_time = time.time() - start_time
            logger.info(f"Generated contextual question in {generation_time:.2f}s")
            
            return jsonify({
                "enhancedQuestion": enhanced_question,
                "originalQuestion": base_question,
                "generationTime": generation_time
            })
            
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {str(e)}")
            # Return original question if API call fails
            return jsonify({
                "enhancedQuestion": base_question,
                "error": "Error generating enhanced question, falling back to original"
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
        
        # Create the prompt for the model
        prompt = f"""
You are a sales coach assistant. Your task is to generate a natural follow-up question based on the user's answer.

{stage_guidance}

{context}

Recent exchange:
Q: {question}
A: {answer}

Generate a single follow-up question that digs deeper into an interesting aspect of their answer. The question should be specific, conversational, and help the user reflect more deeply on their sales approach. Don't repeat questions already asked.

Follow-up question:
"""
        
        # Start timer for performance monitoring
        start_time = time.time()
        
        try:
            # Use the OpenAI API to generate the follow-up question
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful sales coach assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=100
            )
            
            # Extract the follow-up question from response
            follow_up_question = response.choices[0].message.content.strip()
            
            # Log generation time
            generation_time = time.time() - start_time
            logger.info(f"Generated follow-up question in {generation_time:.2f}s")
            
            return jsonify({
                "followUpQuestion": follow_up_question,
                "relatedTo": question,
                "generationTime": generation_time
            })
            
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {str(e)}")
            # Return a generic follow-up if API call fails
            generic_followups = {
                "product": "Could you tell me more about that aspect of your product?",
                "market_and_buyer": "How do your customers typically respond to that?",
                "sales_context": "How does that affect your sales approach?",
                "complete": "Would you like to explore that area further in our coaching?"
            }
            
            return jsonify({
                "followUpQuestion": generic_followups.get(stage, "Could you elaborate more on that?"),
                "error": "Error generating follow-up, falling back to generic question"
            })
    
    except Exception as e:
        logger.error(f"Error generating follow-up question: {str(e)}")
        return jsonify({"error": str(e)}), 500 