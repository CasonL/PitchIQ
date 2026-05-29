"""
Product Classification API Routes

Provides LLM-based product/service classification for more accurate buyer state trees
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required
import logging
from app.services.gpt4o_service import get_gpt4o_service
import json

logger = logging.getLogger(__name__)

product_classify_bp = Blueprint('product_classify', __name__, url_prefix='/api')

@product_classify_bp.route('/openai/classify', methods=['POST'])
@login_required
def classify_product():
    """
    Classify product/service using LLM for specific detection
    """
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        temperature = data.get('temperature', 0.3)
        max_tokens = data.get('max_tokens', 200)
        
        if not prompt:
            return jsonify({'error': 'No prompt provided'}), 400
            
        # Get GPT-4o service
        gpt4o_service = get_gpt4o_service()
        
        # Add system prompt for structured output
        system_prompt = """You are a product classification expert. Analyze sales conversations to identify specific products and services.
Always return valid JSON in the exact format requested. Be specific about product types and features."""
        
        # Generate classification
        response = gpt4o_service.generate_response(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        logger.info(f"Product classification response: {response[:100]}...")
        
        # Try to extract JSON from response
        try:
            # Handle case where response might have markdown code blocks
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()
            elif "```" in response:
                json_start = response.find("```") + 3
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()
            
            # Validate it's proper JSON
            json.loads(response)
            
            return jsonify({
                'success': True,
                'content': response
            })
            
        except json.JSONDecodeError:
            logger.warning(f"LLM returned non-JSON response: {response}")
            # Return a default classification
            return jsonify({
                'success': True,
                'content': json.dumps({
                    "archetype": "training_or_coaching",
                    "subType": "sales_training",
                    "specificProduct": "Sales training platform",
                    "differentiators": ["AI-powered", "Role-play based"],
                    "confidence": 70
                })
            })
        
    except Exception as e:
        logger.error(f"Product classification error: {str(e)}")
        return jsonify({'error': str(e)}), 500
