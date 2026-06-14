"""
API routes for warm-lead feedback generation

Provides LLM-powered feedback and quiz generation for sales call analysis.
"""

from flask import Blueprint, request, jsonify, g
from app.services.api_manager import api_manager
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
        
        # Get service manager from Flask context (proper pattern like dashboard.py)
        service_manager = getattr(g, 'api_manager', api_manager)
        
        if not service_manager or not hasattr(service_manager, 'openai_service'):
            return jsonify({'error': 'AI service configuration error'}), 500
        
        # Generate feedback using GPT-4
        response = service_manager.openai_service.client.chat.completions.create(
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
        
        # Get service manager from Flask context (proper pattern like dashboard.py)
        service_manager = getattr(g, 'api_manager', api_manager)
        
        if not service_manager or not hasattr(service_manager, 'openai_service'):
            return jsonify({'error': 'AI service configuration error'}), 500
        
        # Generate quiz using GPT-4
        response = service_manager.openai_service.client.chat.completions.create(
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
        
        # Get service manager from Flask context (proper pattern like dashboard.py)
        service_manager = getattr(g, 'api_manager', api_manager)
        
        if not service_manager or not hasattr(service_manager, 'openai_service'):
            return jsonify({'error': 'AI service configuration error'}), 500
        
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
            "whatWorked": "2-3 sentence explanation of what the rep did well, in plain English. Explain WHY it worked. Be specific about the technique. Example: 'You did well by asking about their biggest challenge instead of pitching features. This worked because when prospects brush you off with we don't need anything, a curiosity-based question can restart the conversation without feeling pushy.'",
            "sharpenThis": "2-3 sentence explanation of the key mistake. Identify exactly where the rep missed an opportunity or moved too fast. Use plain, conversational language. NO placeholder text like 'Setup sentence ending with...' - write actual coaching. Example: 'After Marcus revealed reps freeze on price objections, you moved straight to offering a demo. The missed opportunity was not exploring the pain first. You should find out how often this happens, what it costs them, and what they've already tried.'",
            "sharpenBold": "The single sharpest insight in 10 words or less, bolded naturally within the sharpenThis. Example: '**You pitched before quantifying the pain**'",
            "quoteTag": "Try this instead",
            "quoteText": "Specific script they should have used - 1-2 sentences max. Natural, conversational. Example: 'When price comes up, what usually happens? Do they discount, stall out, or lose the deal completely?'",
            "beforeScore": 0-10 (how they performed),
            "beforeContext": "brief label like 'Moved to pitch' or 'Good discovery'",
            "afterScore": 0-10 (potential with fix),
            "afterContext": "brief label like 'Quantified impact' or 'Probed deeper'",
            "quiz": {
                "question": "Question about WHY a technique works/fails, not WHAT happened",
                "options": [
                    {"text": "plausible distractor - surface-level reason", "correct": false},
                    {"text": "correct answer - the real reason this technique works", "correct": true},
                    {"text": "plausible distractor - common misconception", "correct": false}
                ],
                "explanation": "Clear explanation in plain English of why the right answer works. Avoid academic jargon like 'emotional processing' or 'cognitive centers'. Instead use real sales language. Example: 'Asking what happens when price comes up works because it gets the prospect talking about a real problem in their own words. Once they describe the pain, you can connect your solution to something they already care about.'",
                "howResponse": "Exact script for next time: 1-2 natural sentences"
            }
        }
    ]
}

CRITICAL RULES - DO NOT VIOLATE:

1. CONTEXT DETECTION IS MANDATORY - BE EXACT:
   - SCAN the transcript for ANY mention of: downloaded guide, filled out form, visited site, saw you on LinkedIn, email signup
   - If ANY of these appear → This is WARM LEAD FOLLOW-UP, NOT cold call
   - Set context: "You followed up with Marcus after he downloaded PitchIQ's sales training guide"
   - NEVER say "cold-called" if warm signals exist in transcript

2. sharpenThis MUST BE CONCISE (max 2-3 sentences):
   - ONE clear explanation of the mistake
   - NO repetition or filler
   - Bolded insight embedded naturally, not tacked on at end
   - NO double periods or punctuation errors
   - Example: "After Marcus revealed reps struggle with price objections, you moved to the demo too quickly. Before offering the solution, find out how often this happens and what it costs them."

3. quoteText MUST BE CONVERSATIONAL, NOT INTERROGATIVE:
   - DO NOT assume negative outcomes ("what deals have you lost")
   - Ask what HAPPENS, not what they LOST
   - Better: "How often are your reps running into price objections, and what usually happens when they do?"
   - Then follow: "Do they discount, stall out, or lose the deal completely?"
   - Let THEM reveal the pain, don't force it

4. QUIZ ANSWERS MUST BE PLAUSIBLE DISTRACTORS:
   - WRONG answers should be things a real salesperson might actually think
   - NO cartoonishly bad answers like "to fill time" or "to make the call longer"
   - Example wrong answers: "To prove your product has every feature they need" or "To avoid discussing price until the end"
   - Each option should teach something if examined closely

5. EXPLANATIONS FOCUS ON BUSINESS IMPACT, NOT EMOTIONS:
   - Avoid: "emotional connection to issues"
   - Use: "lost deals, discounting, slower rep ramp-up, revenue impact"
   - Connect to concrete business consequences
   - Example: "Exploring impact helps Marcus connect the problem to real business consequences. Once the cost is clear, PitchIQ becomes a direct answer to his problem instead of a generic product pitch."

6. FINAL QUALITY CHECKLIST:
   - [ ] Context accurately reflects warm vs cold (check transcript signals)
   - [ ] sharpenThis is 2-3 tight sentences with embedded bold insight
   - [ ] quoteText asks what happens, not assumes negative outcomes
   - [ ] Quiz distractors are plausible misconceptions, not jokes
   - [ ] Explanation ties to business impact (deals, revenue, time)
   - [ ] No punctuation errors, no repetition, no filler

Generate coaching that feels like a VP of Sales who has actually closed deals, not an AI reading from a sales training manual."""

        user_prompt = f"Analyze this sales call transcript:\n\n{transcript}\n\nReturn only the JSON object with the analysis."

        # Generate analysis using GPT-4o-mini for speed/cost
        response = service_manager.openai_service.client.chat.completions.create(
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
