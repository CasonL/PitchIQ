"""
API routes for warm-lead feedback generation

Provides LLM-powered feedback and quiz generation for sales call analysis.
"""

from flask import Blueprint, request, jsonify
from app.services.openai_service import get_openai_service
import json

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/api/generate-feedback', methods=['POST'])
def generate_feedback():
    """
    Generate practical, evidence-based feedback for a call moment
    
    Expected input:
    {
        "prompt": "LLM prompt with context and instructions",
        "moment": {
            "repUtterance": "...",
            "buyerUtterance": "...",
            "detectedMistakes": [...],
            "detectedStrengths": [...]
        }
    }
    
    Returns:
    {
        "feedback": {
            "whatHappened": "...",
            "whyItDidntWork": "...",
            "whatToDoInstead": "...",
            "tryThisLine": "...",
            "whyItWorks": "..."
        }
    }
    """
    try:
        data = request.json
        prompt = data.get('prompt')
        moment = data.get('moment', {})
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        # Get OpenAI service
        openai_service = get_openai_service()
        
        if not openai_service.initialized or not openai_service.client:
            return jsonify({'error': 'OpenAI service not initialized'}), 500
        
        # Generate feedback using GPT-4
        response = openai_service.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a sales coaching expert who provides practical, evidence-based feedback. Always respond with valid JSON matching the requested structure."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        feedback_text = response.choices[0].message.content
        feedback = json.loads(feedback_text)
        
        return jsonify({
            'feedback': feedback,
            'usage': {
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        })
        
    except json.JSONDecodeError as e:
        return jsonify({
            'error': 'Failed to parse LLM response as JSON',
            'details': str(e)
        }), 500
    except Exception as e:
        return jsonify({
            'error': 'Failed to generate feedback',
            'details': str(e)
        }), 500


@feedback_bp.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    """
    Generate a quiz question with equal-length, psychologically-grounded distractors
    
    Expected input:
    {
        "prompt": "LLM prompt with context and instructions",
        "moment": {...},
        "feedback": {...}
    }
    
    Returns:
    {
        "quiz": {
            "question": "...",
            "options": [
                {
                    "text": "...",
                    "correct": true/false,
                    "psychologyPrinciple": "..."
                }
            ],
            "explanation": "...",
            "howResponse": "..."
        }
    }
    """
    try:
        data = request.json
        prompt = data.get('prompt')
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        # Get OpenAI service
        openai_service = get_openai_service()
        
        if not openai_service.initialized or not openai_service.client:
            return jsonify({'error': 'OpenAI service not initialized'}), 500
        
        # Generate quiz using GPT-4
        response = openai_service.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a sales psychology expert who creates diagnostic quiz questions. Always respond with valid JSON matching the requested structure. Ensure all answer options are equal length (±3 words) and psychologically plausible."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.8,
            max_tokens=800,
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        quiz_text = response.choices[0].message.content
        quiz = json.loads(quiz_text)
        
        # Validate quiz structure
        if 'question' not in quiz or 'options' not in quiz:
            return jsonify({
                'error': 'Invalid quiz structure from LLM',
                'details': 'Missing required fields'
            }), 500
        
        # Validate answer lengths are similar
        if 'options' in quiz:
            lengths = [len(opt['text'].split()) for opt in quiz['options']]
            max_diff = max(lengths) - min(lengths)
            if max_diff > 5:
                print(f"Warning: Answer length variance too high: {lengths}")
        
        return jsonify({
            'quiz': quiz,
            'usage': {
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        })
        
    except json.JSONDecodeError as e:
        return jsonify({
            'error': 'Failed to parse LLM response as JSON',
            'details': str(e)
        }), 500
    except Exception as e:
        return jsonify({
            'error': 'Failed to generate quiz',
            'details': str(e)
        }), 500


@feedback_bp.route('/api/feedback/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'warm-lead-feedback'
    })
