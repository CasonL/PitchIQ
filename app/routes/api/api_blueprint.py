"""
API Routes for React Dashboard

This module provides JSON API endpoints for the React dashboard frontend.
"""

from flask import Blueprint, jsonify, request, current_app
from flask_login import current_user, login_required
import logging
import json
from datetime import datetime, timedelta
from app.models import db, User, TrainingSession, Message
from app.routes.api.dashboard import dashboard_api
from app.extensions import csrf  # Import csrf extension

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprint
api_blueprint = Blueprint('api', __name__, url_prefix='/api')

# Create a separate blueprint for paraphrase endpoint with CSRF protection disabled
paraphrase_blueprint = Blueprint('paraphrase_api', __name__, url_prefix='/api')

# Add paraphrase endpoint for onboarding - on the separate blueprint
# --- COMMENTED OUT - CONFLICTS WITH /api/paraphrase IN app/__init__.py ---
# @paraphrase_blueprint.route('/paraphrase', methods=['POST'])
# def paraphrase():
#     """Process and paraphrase user onboarding input"""
#     try:
#         data = request.json
#         
#         if not data or 'userInput' not in data or 'stage' not in data:
#             return jsonify({'error': 'Missing required parameters'}), 400
#             
#         user_input = data['userInput']
#         stage = data['stage']
#         context = data.get('context', {})
#         
#         # Extract meaningful information based on the stage
#         response_content = ""
#         
#         if stage == 'welcome' or stage == 'core_q1':
#             # Process product/service information
#             # Use proper grammar for the response
#             product_terms = extract_product_terms(user_input)
#             response_content = f"Thanks for sharing details about {product_terms}. Who are your primary customers or target audience?"
#             
#         elif stage == 'core_q2':
#             # Process target audience information
#             audience_terms = extract_audience_terms(user_input)
#             response_content = f"I understand that you focus on {audience_terms}. What main problem do you solve, or what is the core value you provide?"
#             
#         elif stage == 'core_q3':
#             # Process value proposition information
#             value_terms = extract_value_terms(user_input)
#             response_content = f"Great! I see that your business provides {value_terms}. Thank you for sharing this information."
#             
#         logger.info(f"Paraphrased response for stage {stage}: {response_content}")
#         
#         return jsonify({
#             'content': response_content
#         })
#     except Exception as e:
#         logger.error(f"Error in paraphrase API: {str(e)}")
#         return jsonify({'error': 'Failed to process input'}), 500

# def extract_product_terms(text):
#     """Extract product/service terms from user input with proper grammar"""
#     # Remove filler phrases like "I sell" or "We offer"
#     cleaned_text = text.lower().replace("i sell", "").replace("we sell", "").replace("i offer", "").replace("we offer", "").strip()
#     
#     # If text starts with articles, remove them for better flow
#     if cleaned_text.startswith("a ") or cleaned_text.startswith("an ") or cleaned_text.startswith("the "):
#         cleaned_text = cleaned_text[cleaned_text.find(" ")+1:]
#     
#     # Ensure proper article usage
#     first_word = cleaned_text.split()[0] if cleaned_text else ""
#     if first_word and first_word[0].lower() in 'aeiou':
#         return f"an {cleaned_text}"
#     else:
#         return f"your {cleaned_text}"

# def extract_audience_terms(text):
#     """Extract audience terms from user input"""
#     # Look for patterns like "target X" or "focus on Y"
#     audience_patterns = [
#         r"(?:sell to|target|focus on|work with|serve)\\s+([^.]+?)(?:\\.|\\band\\b|,|$)",
#         r"(?:customers|clients|users) (?:are|include)\\s+([^.]+?)(?:\\.|\\band\\b|,|$)",
#         r"(?:primarily|mainly|mostly)\\s+([^.]+?)(?:\\.|\\band\\b|,|$)"
#     ]
#     
#     for pattern in audience_patterns:
#         import re
#         match = re.search(pattern, text, re.IGNORECASE)
#         if match:
#             return match.group(1).strip()
#     
#     # If no pattern matches, use the main part of the text
#     words = text.split()
#     return " ".join(words[:min(10, len(words))])

# def extract_value_terms(text):
#     """Extract value proposition from user input"""
#     # Look for phrases about value, benefits, or solving problems
#     value_patterns = [
#         r"(?:solve|provide|deliver|offer|help with)\\s+([^.]+?)(?:\\.|\\band\\b|,|$)",
#         r"(?:value|benefit|advantage) (?:is|in|of)\\s+([^.]+?)(?:\\.|\\band\\b|,|$)",
#         r"(?:enable|allow|empower) (?:clients|customers|users|them|people) to\\s+([^.]+?)(?:\\.|\\band\\b|,|$)"
#     ]
#     
#     for pattern in value_patterns:
#         import re
#         match = re.search(pattern, text, re.IGNORECASE)
#         if match:
#             return match.group(1).strip()
#     
#     # If no pattern matches, use the main part of the text
#     words = text.split()
#     return " ".join(words[:min(12, len(words))])
# --- END COMMENTED OUT SECTION ---

# Dashboard API routes
@api_blueprint.route('/dashboard', methods=['GET'])
@login_required
def dashboard_data():
    """Return all data needed for the dashboard"""
    try:
        # Get user data
        user_data = get_user_data(current_user.id)
        
        # Get recent training sessions
        recent_sessions = get_recent_sessions(current_user.id, limit=5)
        
        # Get metrics
        metrics = get_user_metrics(current_user.id)
        
        return jsonify({
            'user': user_data,
            'recent_sessions': recent_sessions,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in dashboard API: {str(e)}")
        return jsonify({'error': 'Failed to retrieve dashboard data'}), 500

@api_blueprint.route('/user/profile', methods=['GET'])
@login_required
def user_profile():
    """Return user profile information"""
    try:
        return jsonify({
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'member_since': current_user.member_since.isoformat() if hasattr(current_user, 'member_since') else None
        })
    except Exception as e:
        logger.error(f"Error in user profile API: {str(e)}")
        return jsonify({'error': 'Failed to retrieve user profile'}), 500

@api_blueprint.route('/user/metrics', methods=['GET'])
@login_required
def user_metrics():
    """Return user performance metrics"""
    try:
        metrics = get_user_metrics(current_user.id)
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error in user metrics API: {str(e)}")
        return jsonify({'error': 'Failed to retrieve user metrics'}), 500

@api_blueprint.route('/sessions', methods=['GET'])
@login_required
def get_sessions():
    """Return list of user's training sessions"""
    try:
        # Optional query parameters
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Get sessions from database
        sessions = get_recent_sessions(current_user.id, limit=limit, offset=offset)
        return jsonify(sessions)
    except Exception as e:
        logger.error(f"Error in sessions API: {str(e)}")
        return jsonify({'error': 'Failed to retrieve sessions'}), 500

@api_blueprint.route('/sessions/<int:session_id>', methods=['GET'])
@login_required
def get_session(session_id):
    """Return details for a specific session"""
    try:
        # Verify session belongs to current user
        session = TrainingSession.query.filter_by(id=session_id).first()
        if not session or session.user_id != current_user.id:
            return jsonify({'error': 'Session not found or unauthorized'}), 404
            
        # Get session details
        session_data = get_session_details(session_id)
        return jsonify(session_data)
    except Exception as e:
        logger.error(f"Error in session details API: {str(e)}")
        return jsonify({'error': 'Failed to retrieve session details'}), 500

@api_blueprint.route('/sessions/<int:session_id>/transcript', methods=['GET'])
@login_required
def get_transcript(session_id):
    """Return the transcript for a specific session"""
    try:
        # Verify session belongs to current user
        session = TrainingSession.query.filter_by(id=session_id).first()
        if not session or session.user_id != current_user.id:
            return jsonify({'error': 'Session not found or unauthorized'}), 404
            
        # Get messages for this session
        messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
        
        # Format transcript
        transcript = [
            {
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat() if hasattr(msg, 'timestamp') else None
            }
            for msg in messages
        ]
        
        return jsonify({
            'session_id': session_id,
            'transcript': transcript
        })
    except Exception as e:
        logger.error(f"Error in transcript API: {str(e)}")
        return jsonify({'error': 'Failed to retrieve transcript'}), 500

@api_blueprint.route('/insights/generate', methods=['GET'])
@login_required
def generate_insights():
    """Generate AI insights for dashboard cards"""
    try:
        # Get user data
        user_id = current_user.id
        
        # Generate insights
        skills_insights = generate_skills_insights(user_id)
        call_insights = generate_call_insights(user_id)
        challenge_insights = generate_challenge_insights(user_id)
        
        # Determine priority insights
        priority_card = determine_priority_card(skills_insights, call_insights, challenge_insights)
        
        return jsonify({
            'skills': skills_insights,
            'calls': call_insights,
            'challenges': challenge_insights,
            'priorityCard': priority_card
        })
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        return jsonify({'error': 'Failed to generate insights'}), 500

@api_blueprint.route('/insights/chat', methods=['POST'])
@login_required
def insight_chat():
    """Handle chat interaction with AI coach"""
    try:
        data = request.json
        
        # Validate request
        if not data or 'message' not in data:
            return jsonify({'error': 'Invalid request. Message is required.'}), 400
            
        # Extract parameters
        insight_type = data.get('insightType', 'general')
        insight_id = data.get('insightId')
        message = data.get('message')
        history = data.get('history', [])
        
        # Generate coaching response
        response = generate_coaching_response(
            user_id=current_user.id,
            insight_type=insight_type,
            insight_id=insight_id,
            message=message,
            history=history
        )
        
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error in coaching chat: {str(e)}")
        return jsonify({'error': 'Failed to generate coaching response'}), 500

# Helper functions
def get_user_data(user_id):
    """Get user data for dashboard"""
    user = User.query.get(user_id)
    if not user:
        return None
        
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'member_since': user.member_since.isoformat() if hasattr(user, 'member_since') else None
    }

def get_recent_sessions(user_id, limit=5, offset=0):
    """Get recent training sessions for a user"""
    sessions = TrainingSession.query.filter_by(user_id=user_id).order_by(
        TrainingSession.start_time.desc()
    ).offset(offset).limit(limit).all()
    
    return [
        {
            'id': session.id,
            'start_time': session.start_time.isoformat() if hasattr(session, 'start_time') else None,
            'end_time': session.end_time.isoformat() if hasattr(session, 'end_time') and session.end_time else None,
            'duration': (session.end_time - session.start_time).total_seconds() if hasattr(session, 'end_time') and session.end_time else None,
            'status': session.status
        }
        for session in sessions
    ]

def get_session_details(session_id):
    """Get detailed information about a session"""
    session = TrainingSession.query.get(session_id)
    if not session:
        return None
        
    # Count messages by role
    user_messages = Message.query.filter_by(session_id=session_id, role='user').count()
    ai_messages = Message.query.filter_by(session_id=session_id, role='assistant').count()
    
    return {
        'id': session.id,
        'start_time': session.start_time.isoformat() if hasattr(session, 'start_time') else None,
        'end_time': session.end_time.isoformat() if hasattr(session, 'end_time') and session.end_time else None,
        'duration': (session.end_time - session.start_time).total_seconds() if hasattr(session, 'end_time') and session.end_time else None,
        'status': session.status,
        'metrics': {
            'user_messages': user_messages,
            'ai_messages': ai_messages,
            'total_messages': user_messages + ai_messages
        }
    }

def get_user_metrics(user_id):
    """Calculate user performance metrics"""
    # This is a placeholder implementation
    # In a real implementation, you would calculate these metrics from actual user data
    
    # Count sessions in the last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_sessions = TrainingSession.query.filter_by(user_id=user_id).filter(
        TrainingSession.start_time >= thirty_days_ago
    ).count()
    
    # Calculate total training time
    sessions = TrainingSession.query.filter_by(user_id=user_id).all()
    total_duration = sum(
        (session.end_time - session.start_time).total_seconds() 
        for session in sessions 
        if hasattr(session, 'end_time') and session.end_time
    )
    
    # For now, return placeholder metrics
    return {
        'sessions_count': recent_sessions,
        'training_time_hours': round(total_duration / 3600, 1),
        'overall_score': 72,  # Placeholder
        'skills': {
            'rapport': 78,
            'discovery': 65,
            'presentation': 80,
            'objection_handling': 60,
            'closing': 55
        }
    }

def generate_skills_insights(user_id):
    """Generate insights about user skills"""
    # This is a placeholder implementation
    # In a real implementation, you would analyze user data and generate actual insights
    
    # For now, return placeholder data
    return {
        'id': 'skill-insight-1',
        'skillArea': 'discovery',
        'explanation': 'Your discovery questions have improved, but you could ask more open-ended questions to gather deeper information.',
        'detailedExplanation': 'I\'ve analyzed your recent calls and noticed that while your discovery questions have improved by 23%, you\'re still asking primarily closed-ended questions that result in simple yes/no answers. Open-ended questions would help you gather richer information about customer needs.',
        'score': 65,
        'trend': 'improving',
        'actions': [
            {
                'id': 'action-1',
                'label': 'View Examples',
                'icon': '📊'
            },
            {
                'id': 'action-2',
                'label': 'Practice Now',
                'icon': '🎙️'
            },
            {
                'id': 'action-3',
                'label': 'Learn Framework',
                'icon': '📚'
            }
        ]
    }

def generate_call_insights(user_id):
    """Generate insights about recent calls"""
    # Placeholder implementation
    return {
        'id': 'call-insight-1',
        'callId': 123,
        'explanation': 'In your last call, you handled the pricing objection effectively by focusing on ROI.',
        'detailedExplanation': 'During your last call with Acme Corp, you addressed their pricing concerns by clearly articulating the ROI timeline. This approach was 37% more effective than your previous calls where price was discussed.',
        'score': 82,
        'trend': 'improving',
        'callSegment': {
            'start': '12:45',
            'end': '15:30',
            'transcript': 'Customer: "Your solution seems expensive compared to others."\nYou: "I understand cost is important. Let me show you our ROI calculator that demonstrates how you\'ll recover the investment within 3 months."'
        },
        'actions': [
            {
                'id': 'action-1',
                'label': 'Review Call',
                'icon': '🔍'
            },
            {
                'id': 'action-2',
                'label': 'Similar Scenarios',
                'icon': '🔄'
            }
        ]
    }

def generate_challenge_insights(user_id):
    """Generate recommended practice challenges"""
    # Placeholder implementation
    return {
        'id': 'challenge-insight-1',
        'challengeType': 'objection_handling',
        'explanation': 'Practice handling budget objections with our interactive scenario.',
        'detailedExplanation': 'Based on your recent performance, I\'ve created a personalized practice scenario focused on budget objections, which is currently your lowest-scoring objection type at 62% effectiveness.',
        'difficulty': 'intermediate',
        'estimatedTime': '10 minutes',
        'actions': [
            {
                'id': 'action-1',
                'label': 'Start Challenge',
                'icon': '🚀'
            },
            {
                'id': 'action-2',
                'label': 'Schedule Later',
                'icon': '📅'
            }
        ]
    }

def determine_priority_card(skills_insights, call_insights, challenge_insights):
    """Determine which card should be prioritized"""
    # This is a placeholder implementation
    # In a real implementation, you would use more sophisticated logic
    
    # For now, just return a fixed card type
    return 'skills'

def generate_coaching_response(user_id, insight_type, insight_id, message, history):
    """Generate an AI coaching response"""
    # This is a placeholder implementation
    # In a real implementation, you would use a language model
    
    # For demonstration, just echo back a response based on the insight type
    if insight_type == 'skills':
        return {
            'content': 'To improve your discovery questions, try using the SPIN framework: Situation, Problem, Implication, and Need-payoff questions. Would you like me to explain with examples from your recent calls?',
            'additionalData': {
                'type': 'framework',
                'name': 'SPIN Selling'
            }
        }
    elif insight_type == 'calls':
        return {
            'content': 'Your handling of pricing objections has improved significantly. One thing to try next time is acknowledging the concern before presenting your ROI calculation. This builds trust by showing you understand their perspective.',
            'additionalData': {
                'type': 'example',
                'text': 'Instead of "Let me show you our ROI calculator", try "I understand that price is a significant factor in your decision. Many of our customers had similar concerns until they saw how quickly the ROI materializes. Let me show you..."'
            }
        }
    elif insight_type == 'challenges':
        return {
            'content': 'I\'ve created a custom practice scenario for budget objections. Would you like to start now or schedule it for later?',
            'additionalData': {
                'type': 'challenge',
                'id': 'budget_objection_101'
            }
        }
    else:
        return {
            'content': 'I\'m here to help with your sales training. What specific aspect would you like coaching on?'
        }

# Basic health check endpoint
@api_blueprint.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint for the API."""
    return {'status': 'ok'} 