"""
API routes for warm-lead feedback generation

Provides LLM-powered feedback and quiz generation for sales call analysis.
"""

from flask import Blueprint, request, jsonify, g
from app.services.api_manager import api_manager
import json
import logging

logger = logging.getLogger(__name__)

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
        
        if not service_manager:
            return jsonify({'error': 'API service manager not available'}), 500
            
        if not hasattr(service_manager, 'openai_service'):
            return jsonify({'error': 'OpenAI service not available in API manager'}), 500
        
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
            "whatWorked": "2-3 sentence explanation of what the rep did well. Example: You did well by asking about their biggest challenge instead of pitching features. This worked because when prospects brush you off, a curiosity-based question can restart the conversation.",
            "sharpenThis": "2-3 sentence explanation of the key mistake. The bold insight embedded naturally, not tacked on at end. Example: After Marcus revealed reps struggle with price objections, you moved to the demo too quickly. **You pitched before exploring the pain.** Before offering the solution, find out how often this happens and what it costs them.",
            "sharpenBold": "[DEPRECATED - embed bold naturally in sharpenThis]",
            "quoteTag": "Try this instead",
            "quoteText": "Specific script - 1-2 sentences max. Follow behavior-first sequence: what happens then how often then what does it lead to. Example: When reps struggle with price objections, what usually happens? Do they discount, stall out, or lose the deal? Then follow up with: How often does that happen?",
            "IMPORTANT": "When returning JSON, escape any quotes inside strings with backslash. Example: You did well by asking about \\"we don't need anything\\" situations.", 
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
                "explanation": "Clear explanation in plain English. Focus on business consequences, not vague emotions. Example: 'Exploring what happens when price comes up helps Marcus connect the problem to real consequences like stalled deals or forced discounts. Once he explains the cost, your solution becomes tied to a clear business pain instead of feeling like a generic demo.'",
                "howResponse": "Exact script for next time: 1-2 natural sentences following behavior-first sequence"
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

6. MOMENT SEQUENCING - BEHAVIOR FIRST, IMPACT SECOND:
   - When coaching discovery moments, suggest exploring WHAT HAPPENS before quantifying cost
   - Sequence: (1) What usually happens? (2) How often? (3) What does it lead to? (4) What has that cost?
   - Don't jump straight to "financial impact" - that's the destination, not the starting point
   - Example: "When reps freeze on price objections, does it usually lead to discounting, stalls, or lost deals?" THEN "How often does that happen?"

7. FINAL QUALITY CHECKLIST:
   - [ ] Context is EXACT: scanned transcript for "downloaded guide/visited site/filled form" and set correctly
   - [ ] sharpenThis is 2-3 tight sentences, NO duplicate bold text, insight embedded once naturally
   - [ ] quoteText follows behavior-first sequence: what happens → how often → what does it lead to
   - [ ] Quiz distractors are things a real salesperson might actually think (not "to fill time")
   - [ ] Explanation ties to business impact but doesn't jump there prematurely
   - [ ] NO double periods, NO repeated sentences, NO filler

Generate coaching that feels like a VP of Sales who has actually closed deals, not an AI reading from a sales training manual."""

        # Determine number of moments based on transcript length
        # Cap at 2-3 for very long transcripts to prevent timeouts
        word_count = len(transcript.split())
        if word_count < 200:
            target_moments = "1-2"
        elif word_count < 500:
            target_moments = "2-3"
        elif word_count < 1000:
            target_moments = "2-3"
        else:
            target_moments = "2"  # Very long transcripts - focus on just 2 key moments

        user_prompt = f"""Analyze this sales call transcript:

{transcript}

NUMBER OF MOMENTS TO ANALYZE: {target_moments}
- Based on word count ({word_count} words)
- Identify the most critical decision points
- Focus on: objections raised, discovery opportunities, premature pitching, strong turns

Return only the JSON object with the analysis."""

        # Generate analysis using GPT-4o-mini for speed/cost
        logger.info(f"Starting transcript analysis - word count: {word_count}, target moments: {target_moments}")
        response = service_manager.openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"},
            timeout=25  # 25 second timeout to stay under gunicorn's 30s limit
        )
        
        # Parse the response
        analysis_text = response.choices[0].message.content
        logger.info(f"AI response received, length: {len(analysis_text)} chars")
        
        try:
            analysis = json.loads(analysis_text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error. AI response snippet: {analysis_text[:500]}...")
            raise
        
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
        logger.error(f"JSON decode error in analyze_transcript: {str(e)}")
        return jsonify({
            'error': 'Failed to parse AI response as JSON',
            'details': str(e)
        }), 500
    except Exception as e:
        error_str = str(e).lower()
        if 'timeout' in error_str or 'timed out' in error_str:
            logger.error(f"OpenAI request timed out for transcript of {word_count} words")
            return jsonify({
                'error': 'Analysis timed out',
                'details': 'The transcript is too long for quick analysis. Try a shorter transcript or break it into sections.',
                'transcriptWordCount': word_count
            }), 504
        logger.exception(f"Error in analyze_transcript: {str(e)}")
        return jsonify({
            'error': 'Failed to analyze transcript',
            'details': str(e)
        }), 500


@feedback_bp.route('/api/feedback/analyze-moment', methods=['POST'])
def analyze_single_moment():  # v1.0 progressive loading
    """
    Progressive moment generation - analyze a single coaching moment
    
    Expected input:
    {
        "transcript": "full call transcript",
        "momentIndex": 0,  // which moment to generate (0, 1, 2...)
        "excludeIndices": [0]  // indices of moments already generated (optional)
    }
    
    Returns a single detailedMoment object for progressive loading
    """
    try:
        data = request.json
        transcript = data.get('transcript', '').strip()
        moment_index = data.get('momentIndex', 0)
        exclude_indices = data.get('excludeIndices', [])
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400
        
        # Get service manager from Flask context
        service_manager = getattr(g, 'api_manager', api_manager)
        
        if not service_manager:
            return jsonify({'error': 'API service manager not available'}), 500
            
        if not hasattr(service_manager, 'openai_service'):
            return jsonify({'error': 'OpenAI service not available in API manager'}), 500
        
        # Build exclusion context
        exclusion_text = ""
        if exclude_indices:
            exclusion_text = f"\nPreviously analyzed moments: {exclude_indices}\nFocus on a DIFFERENT critical decision point than those already covered."
        
        # Simplified system prompt for single moment
        single_moment_prompt = f"""You are an expert sales coach analyzing ONE specific moment from a sales call.

Analyze this transcript and identify the single most important coaching moment at index {moment_index}.

Return ONLY this JSON structure:
{{
    "turnLabel": "Turn X",
    "turnNumber": "X / Y",
    "type": "mistake|strength|turning",
    "youSaid": "exact rep quote",
    "prospectSaid": "exact prospect quote", 
    "talkRatio": "XX% you, XX% prospect",
    "prospectTone": "brief tone description",
    "beforeContext": "2-3 sentence scenario describing the actual call context. Be SPECIFIC: Was this cold outreach or warm follow-up? What triggered the call? Example: 'You followed up with Sarah after she downloaded your pricing guide. She mentioned struggling with rep onboarding time.'"
    "beforeScore": 4.5,
    "sharpenThis": "2-3 sentence coaching insight with **bold key point** embedded naturally",
    "quoteTag": "Try this instead",
    "quoteText": "1-2 sentence improved script",
    "afterScore": 7.5,
    "psychologyPrinciple": "brief principle name",
    "psychologyExplanation": "1-2 sentence business impact explanation",
    "quiz": {{
        "question": "What should you have done differently?",
        "options": [
            {{"text": "Correct answer", "correct": true}},
            {{"text": "Plausible distractor 1", "correct": false}},
            {{"text": "Plausible distractor 2", "correct": false}}
        ],
        "explanation": "Why the correct answer works - focus on business impact",
        "howResponse": "Exact script for next time"
    }}
}}

Be concise. No filler. Focus on actionable coaching.{exclusion_text}"""

        user_prompt = f"""Analyze this sales call transcript and generate moment {moment_index}:

{transcript}

Return only the JSON object for this single moment."""

        logger.info(f"Generating single moment {moment_index} for transcript of {len(transcript.split())} words")
        
        response = service_manager.openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": single_moment_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1200,
            response_format={"type": "json_object"},
            timeout=20
        )
        
        moment_text = response.choices[0].message.content
        logger.info(f"Moment {moment_index} received, length: {len(moment_text)} chars")
        
        try:
            moment = json.loads(moment_text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error for moment {moment_index}: {moment_text[:500]}...")
            raise
        
        return jsonify({
            'moment': moment,
            'momentIndex': moment_index,
            'totalWordCount': len(transcript.split())
        })
        
    except Exception as e:
        logger.exception(f"Error generating moment {moment_index}: {str(e)}")
        return jsonify({
            'error': f'Failed to generate moment {moment_index}',
            'details': str(e)
        }), 500


@feedback_bp.route('/api/feedback/analyze-summary', methods=['POST'])
def analyze_summary():
    """
    Lightweight summary analysis - extracts key metrics from transcript.
    Fast endpoint (~2-3s) to get stats while moments load in background.
    """
    try:
        data = request.json
        transcript = data.get('transcript', '').strip()
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400
        
        service_manager = getattr(g, 'api_manager', api_manager)
        if not service_manager or not hasattr(service_manager, 'openai_service'):
            return jsonify({'error': 'OpenAI service not available'}), 500
        
        word_count = len(transcript.split())
        
        summary_prompt = f"""Analyze this sales call transcript and extract key metrics.

Return ONLY this JSON structure:
{{
    "painPointsFound": 0,
    "objectionsHandled": 0,
    "objectionsTotal": 0,
    "demoScheduled": false,
    "readinessScore": 65,
    "highlights": [
        {{
            "turn": "Turn 1",
            "label": "Brief description",
            "type": "strength|mistake"
        }}
    ],
    "sentimentAnalysis": {{
        "trust": {{"value": 65, "label": "building"}},
        "curiosity": {{"value": 45, "label": "moderate"}},
        "urgency": {{"value": 30, "label": "low"}}
    }}
}}

Guidelines:
- painPointsFound: Count explicit problems/pains mentioned (budget issues, workflow problems, etc.)
- objectionsHandled: Count objections the rep successfully addressed
- objectionsTotal: Count total objections raised (handled + unhandled)
- demoScheduled: true if meeting/demo explicitly scheduled, false otherwise
- readinessScore: 0-100 based on call quality (60-70 average, 80+ excellent)
- highlights: 2-3 key moments with brief labels
- sentimentAnalysis: track trust, curiosity, urgency across the call (0-100)

Be concise. No filler."""

        user_prompt = f"Extract summary metrics from this call transcript ({word_count} words):\n\n{transcript}\n\nReturn only the JSON."
        
        logger.info(f"Analyzing summary for transcript of {word_count} words")
        
        response = service_manager.openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": summary_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.5,
            max_tokens=600,
            response_format={"type": "json_object"},
            timeout=15
        )
        
        summary_text = response.choices[0].message.content
        logger.info(f"Summary received, length: {len(summary_text)} chars")
        
        try:
            summary = json.loads(summary_text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error for summary: {summary_text[:500]}...")
            raise
        
        # Add calculated duration
        summary['callDuration'] = max(60, word_count / 2)
        summary['transcriptWordCount'] = word_count
        
        return jsonify(summary)
        
    except Exception as e:
        logger.exception(f"Error analyzing summary: {str(e)}")
        return jsonify({
            'error': 'Failed to analyze summary',
            'details': str(e)
        }), 500


@feedback_bp.route('/api/feedback/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'warm-lead-feedback'
    })
