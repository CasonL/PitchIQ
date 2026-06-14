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
        
        # Build analysis prompt for IN-DEPTH coaching data
        system_prompt = """You are an elite sales coach analyzing call transcripts. Generate DETAILED coaching moments with specific psychological insights.

Analyze the transcript and return this exact JSON structure:

{
    "readinessScore": number (0-100),
    "painPointsFound": number,
    "objectionsHandled": number,
    "objectionsTotal": number,
    "demoScheduled": boolean,
    "callDuration": number (estimated from word count at 150 words/min),
    "highlights": [{"text": "...", "type": "win|miss|tip"}],
    "sentimentAnalysis": "2-3 sentence buyer journey summary",
    "detailedMoments": [
        {
            "id": 1,
            "time": "0:31" (estimated timestamp),
            "label": "Objection|Discovery|Turn|Close|Win|Mistake",
            "type": "mistake|turning|win",
            "turnLabel": "Turn 1",
            "turnNumber": "1 / 3",
            "youSaid": "exact rep quote from transcript",
            "prospectSaid": "exact prospect quote from transcript",
            "youAnswer": "rep's follow-up (if applicable)",
            "prospectFinal": "prospect's final response (if applicable)",
            "talkRatio": "e.g., 60% you, 40% Marcus",
            "prospectTone": "e.g., skeptical, opening up, dismissive, curious",
            "sentiment": {
                "trust": {"value": 0-100, "label": "Low|Moderate|High|Rising", "color": "#D9382E|#D97706|#22A559|#2563EB"},
                "curiosity": {"value": 0-100, "label": "...", "color": "..."},
                "urgency": {"value": 0-100, "label": "...", "color": "..."}
            },
            "beforeSentiment": {
                "trust": {"value": 0-100, "label": "..."},
                "curiosity": {"value": 0-100, "label": "..."},
                "urgency": {"value": 0-100, "label": "..."}
            },
            "whatWorked": "Psychological analysis of what the rep did right - explain WHY it worked at a cognitive/behavioral level",
            "sharpenThis": "Setup sentence ending with...",
            "sharpenBold": "the key mistake or missed opportunity in bold terms",
            "quoteTag": "Try this instead|Even sharper|Do this",
            "quoteText": "Specific script they should have used",
            "beforeScore": 0-10 (how they performed),
            "beforeContext": "brief label of their technique",
            "afterScore": 0-10 (potential with fix),
            "afterContext": "brief label of improved technique",
            "quiz": {
                "question": "Psychology question about WHY something worked/failed",
                "options": [
                    {"text": "distractor - common wrong answer", "correct": false},
                    {"text": "CORRECT - deep psychological insight", "correct": true},
                    {"text": "distractor - surface-level answer", "correct": false}
                ],
                "explanation": "Detailed explanation of the psychology - why the correct answer is right and why wrong answers miss the point",
                "howResponse": "Actionable script: exactly what to say next time in this scenario"
            }
        }
    ]
}

GUIDELINES FOR IN-DEPTH ANALYSIS:

1. IDENTIFY 2-4 CRITICAL MOMENTS:
   - Where did the prospect's sentiment shift?
   - What objections were raised and how handled?
   - Where did the rep miss buying signals?
   - What psychological triggers were activated?

2. SENTIMENT SCORING:
   - Trust: 0-30 = Low (red), 31-50 = Moderate (orange), 51-70 = Rising (blue), 71-100 = High (green)
   - Track how trust/curiosity/urgency change moment to moment

3. WHAT WORKED ANALYSIS:
   - Don't just say "good job" - explain the PSYCHOLOGY
   - Example: "You asked about consequences instead of arguing. This worked because consequences bypass the logical defense system and activate emotional processing centers."

4. SHARPEN THIS:
   - Identify the specific behavioral mistake
   - Bold the key insight about what they should have done
   - Explain the micro-skill they're missing

5. QUIZ DESIGN:
   - Question must test DEEP understanding, not surface facts
   - Wrong answers should be PLAUSIBLE but psychologically incomplete
   - Explanation must teach something they can apply to other calls
   - howResponse must be an exact script they can practice

6. COACHING DEPTH LEVELS:
   - Level 1: What happened (observation)
   - Level 2: Why it mattered (tactical)  
   - Level 3: The psychology behind it (strategic)
   - Level 4: How to recognize it in other calls (transferable skill)

Generate moments that feel like a master coach sat with the rep and explained not just WHAT to fix, but WHY humans behave this way and HOW to operationalize it."""

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
            'detailedMoments': analysis.get('detailedMoments', [])
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
