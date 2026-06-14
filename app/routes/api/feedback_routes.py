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


@feedback_bp.route('/api/feedback/analyze-transcript', methods=['POST'])
def analyze_transcript():
    """
    Analyze a sales call transcript and generate AI feedback metrics
    
    Expected input:
    {
        "transcript": "Full call transcript with Rep: and Marcus: lines...",
        "context": "sales_call"
    }
    
    Returns:
    {
        "readinessScore": 68,
        "painPointsFound": 1,
        "objectionsHandled": 0,
        "objectionsTotal": 2,
        "demoScheduled": true,
        "callDuration": 145,
        "highlights": [...],
        "sentimentAnalysis": "...",
        "coachingMoments": [...]
    }
    """
    try:
        data = request.json
        transcript = data.get('transcript', '').strip()
        context = data.get('context', 'sales_call')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400
        
        if len(transcript) < 50:
            return jsonify({'error': 'Transcript too short. Please provide at least 50 characters.'}), 400
        
        # Get OpenAI service
        openai_service = get_openai_service()
        
        if not openai_service.initialized or not openai_service.client:
            return jsonify({'error': 'OpenAI service not initialized'}), 500
        
        # Build analysis prompt
        system_prompt = """You are an expert sales coach analyzing call transcripts. 
Analyze the sales call and return a JSON object with these exact fields:

{
    "readinessScore": number (0-100, overall sales readiness based on technique),
    "painPointsFound": number (count of unique pain points uncovered),
    "objectionsHandled": number (count of objections successfully addressed),
    "objectionsTotal": number (total objections raised),
    "demoScheduled": boolean (true if meeting/demo booked),
    "callDuration": number (estimated seconds based on transcript length),
    "highlights": [
        {"text": "brief highlight", "type": "win|miss|tip"}
    ],
    "sentimentAnalysis": "2-3 sentence summary of buyer sentiment journey",
    "coachingMoments": [
        {
            "timestamp": number (0-100 percentage through call),
            "title": "What happened",
            "insight": "Coaching insight",
            "sentimentBefore": number (0-100),
            "sentimentAfter": number (0-100)
        }
    ]
}

Scoring guidelines:
- readinessScore: 0-40 poor, 41-60 fair, 61-75 good, 76-90 very good, 91-100 excellent
- Count pain points mentioned by buyer that rep explored
- Count objections buyer raised and which were handled well
- Estimate duration based on typical speaking pace (150 words/minute)
- Create 2-4 highlights based on key moments
- Generate 2-3 coaching moments for pivotal interactions"""

        user_prompt = f"Analyze this sales call transcript:\n\n{transcript}\n\nReturn only the JSON object with the analysis."

        # Generate analysis using GPT-4o-mini for speed/cost
        response = openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        analysis_text = response.choices[0].message.content
        analysis = json.loads(analysis_text)
        
        # Ensure all required fields exist with defaults
        result = {
            'readinessScore': analysis.get('readinessScore', 65),
            'painPointsFound': analysis.get('painPointsFound', 0),
            'objectionsHandled': analysis.get('objectionsHandled', 0),
            'objectionsTotal': analysis.get('objectionsTotal', 1),
            'demoScheduled': analysis.get('demoScheduled', False),
            'callDuration': analysis.get('callDuration', max(60, len(transcript.split()) // 2)),
            'highlights': analysis.get('highlights', [
                {"text": "Analyzed transcript", "type": "win"}
            ]),
            'sentimentAnalysis': analysis.get('sentimentAnalysis', 'Analysis completed.'),
            'coachingMoments': analysis.get('coachingMoments', [])
        }
        
        return jsonify(result)
        
    except json.JSONDecodeError as e:
        return jsonify({
            'error': 'Failed to parse AI response as JSON',
            'details': str(e)
        }), 500
    except Exception as e:
        return jsonify({
            'error': 'Failed to analyze transcript',
            'details': str(e)
        }), 500


@feedback_bp.route('/api/feedback/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'warm-lead-feedback'
    })
