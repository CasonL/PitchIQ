"""
Service layer for training module operations, including AI interactions.
"""

from app.extensions import db
from app.models import (
    UserProfile, BuyerPersona, TrainingSession, PerformanceMetrics, 
    FeedbackAnalysis, Message, NameUsageTracker, SessionMetrics
)
from app.services.claude_service import get_claude_service, get_claude_completion
from app.services.voice_analysis_service import get_voice_analysis_service
from app.services.openai_service import get_openai_service
from app.training.emotional_response import EmotionalResponseSystem
from datetime import datetime
import json
import logging
import traceback
import random
import re
from threading import Thread
from flask import session as flask_session, current_app
from sqlalchemy.orm import joinedload # Added joinedload
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any, Optional # Added Optional
from sqlalchemy import func
from app.training.legendary_personas import should_use_legendary_persona, get_random_legendary_persona

logger = logging.getLogger(__name__)

# Global variable to store the backup persona
_backup_persona = None

# Helper functions for AI generation and analysis
def generate_buyer_persona(user_profile, use_previous_feedback=False, previous_feedback=None, session_id=None):
    """Generate a buyer persona for the given user profile."""
    
    try:
        from app.services.claude_service import get_claude_service
        from app.training.legendary_personas import should_use_legendary_persona, get_random_legendary_persona
        
        # Check if we should use a legendary persona (1% chance)
        if should_use_legendary_persona():
            logger.info("Using a legendary persona!")
            legendary_data = get_random_legendary_persona()
            
            # Create and return the legendary persona
            legendary_persona = BuyerPersona(
                name=legendary_data["name"],
                description=legendary_data["description"],
                personality_traits=legendary_data["personality_traits"],
                emotional_state=legendary_data["emotional_state"],
                buyer_type=legendary_data["buyer_type"],
                decision_authority=legendary_data["decision_authority"],
                pain_points=legendary_data["pain_points"],
                objections=legendary_data["objections"],
                cognitive_biases=legendary_data["cognitive_biases"],
                primary_concern=legendary_data["primary_concern"],
                role=legendary_data["role"],
                industry_context=legendary_data.get("industry_context", ""),
                is_legendary=True
            )
            
            # Save to database
            db.session.add(legendary_persona)
            db.session.commit()
            
            logger.info(f"Successfully generated legendary persona: {legendary_persona.name}")
            return legendary_persona
        
        # Check if we should use a cached persona from the database (70% chance after the first few)
        persona_count = BuyerPersona.query.count()
        use_cached = (persona_count > 5) and (random.random() < 0.7)
        
        if use_cached:
            # Get user's industry and target market for better matching
            user_industry = user_profile.industry
            user_target_market = user_profile.target_market
            
            # Try to find a relevant cached persona (not used before by this user)
            query = BuyerPersona.query.filter(BuyerPersona.is_cached == True)
            
            # Add some filters to make it more relevant
            if user_industry:
                query = query.filter(BuyerPersona.industry_context.like(f"%{user_industry}%"))
                
            # Get the used persona IDs for this user to avoid repeats
            used_persona_ids = db.session.query(TrainingSession.buyer_persona_id)\
                .filter(TrainingSession.user_profile_id == user_profile.id)\
                .distinct().all()
            used_persona_ids = [pid[0] for pid in used_persona_ids if pid[0]]
            
            if used_persona_ids:
                query = query.filter(~BuyerPersona.id.in_(used_persona_ids))
                
            # Try to get a random persona from the filtered set
            persona_count = query.count()
            if persona_count > 0:
                # Get a random one
                offset = random.randint(0, persona_count - 1)
                cached_persona = query.offset(offset).first()
                
                if cached_persona:
                    logger.info(f"Using cached persona from database: {cached_persona.name}")
                    return cached_persona
        
        # If we couldn't find a suitable cached persona, continue with generation
        # Get the Claude AI service
        claude_service = get_claude_service()
        
        # Start the backup persona generation in a background thread
        import threading
        backup_thread = threading.Thread(target=_generate_backup_persona, args=(user_profile,))
        backup_thread.daemon = True
        backup_thread.start()
        
        # Build context from user profile
        context = {
            "product_service": user_profile.product_service or "Unknown product/service",
            "industry": user_profile.industry or "Various industries",
            "target_market": user_profile.target_market or "Various businesses",
            "experience_level": user_profile.experience_level or "Intermediate"
        }
        
        # Get persona description from Claude
        persona_description = claude_service.generate_buyer_persona(context, use_previous_feedback, previous_feedback)
        
        # Parse the persona description
        persona_data = parse_persona_description(persona_description)
        
        # Create the persona
        persona = BuyerPersona(
            name=persona_data["name"],
            description=persona_description,
            personality_traits=json.dumps(persona_data["personality_traits"]),
            emotional_state=persona_data["emotional_state"],
            buyer_type=persona_data["buyer_type"],
            decision_authority=persona_data["decision_authority"],
            pain_points=json.dumps(persona_data["pain_points"]),
            objections=json.dumps(persona_data["objections"]),
            cognitive_biases=json.dumps(persona_data["cognitive_biases"]),
            primary_concern=persona_data["primary_concern"],
            role=persona_data["role"],
            industry_context=user_profile.industry or "",
            is_cached=True,  # Mark for potential reuse
            cached_at=datetime.utcnow()
        )
        
        # Save to database for caching
        db.session.add(persona)
        db.session.commit()
        
        # Log success
        logger.info(f"Successfully generated buyer persona: {persona.name}")
        
        return persona
        
    except Exception as e:
        # Log the error and fall back to the default persona
        logger.error(f"Error generating buyer persona: {str(e)}")
        return create_default_persona(user_profile)

def get_cached_persona(session_key):
    """
    Retrieve a cached persona from the Flask session if available.
    
    Args:
        session_key: The key used to store the persona in the session.
        
    Returns:
        BuyerPersona object if found, None otherwise.
    """
    try:
        if session_key in flask_session:
            logger.info(f"Found cached persona with key {session_key}")
            persona_data = flask_session[session_key]
            
            # Create a BuyerPersona object from the cached data
            persona = BuyerPersona(
                name=persona_data['name'],
                description=persona_data['description'],
                personality_traits=persona_data['personality_traits'],
                emotional_state=persona_data['emotional_state'],
                buyer_type=persona_data['buyer_type'],
                decision_authority=persona_data['decision_authority'],
                pain_points=persona_data['pain_points'],
                objections=persona_data['objections'],
                cognitive_biases=persona_data['cognitive_biases']
            )
            return persona
    except Exception as e:
        logger.error(f"Error retrieving cached persona: {str(e)}")
    
    return None

def cache_persona(session_key, persona):
    """
    Cache a persona in the Flask session.
    
    Args:
        session_key: The key to use for storing the persona.
        persona: The BuyerPersona object to cache.
    """
    try:
        flask_session[session_key] = {
            'name': persona.name,
            'description': persona.description,
            'personality_traits': persona.personality_traits,
            'emotional_state': persona.emotional_state,
            'buyer_type': persona.buyer_type,
            'decision_authority': persona.decision_authority,
            'pain_points': persona.pain_points,
            'objections': persona.objections,
            'cognitive_biases': persona.cognitive_biases
        }
        logger.info(f"Cached persona with key {session_key}")
    except Exception as e:
        logger.error(f"Error caching persona: {str(e)}")

def _generate_backup_persona(user_profile):
    """Generate a backup persona in the background to speed up future requests."""
    global _backup_persona
    
    try:
        # Import flask utilities
        from flask import current_app, Flask
        
        # Get the current app if we're already in an app context
        app = None
        try:
            app = current_app._get_current_object()
        except RuntimeError:
            # If we're not in an app context, create a new app context
            from app import create_app
            app = create_app()
        
        # Run with app context
        with app.app_context():
            logger.info("Generating backup persona in background")
            
            from app.services.claude_service import get_claude_service
            
            # Get the Claude service
            claude_service = get_claude_service()
            
            # Build context from user profile
            context = {
                "product_service": user_profile.product_service or "Unknown product/service",
                "industry": user_profile.industry or "Various industries",
                "target_market": user_profile.target_market or "Various businesses",
                "experience_level": user_profile.experience_level or "Intermediate"
            }
            
            # Get persona description from Claude
            try:
                persona_description = claude_service.generate_buyer_persona(context)
                
                # Parse the persona description
                persona_data = parse_persona_description(persona_description)
                
                # Create the persona
                _backup_persona = BuyerPersona(
                    name=persona_data["name"],
                    description=persona_description,
                    personality_traits=json.dumps(persona_data["personality_traits"]),
                    emotional_state=persona_data["emotional_state"],
                    buyer_type=persona_data["buyer_type"],
                    decision_authority=persona_data["decision_authority"],
                    pain_points=json.dumps(persona_data["pain_points"]),
                    objections=json.dumps(persona_data["objections"]),
                    cognitive_biases=json.dumps(persona_data["cognitive_biases"]),
                    primary_concern=persona_data["primary_concern"],
                    role=persona_data["role"]
                )
                
                logger.info(f"Successfully generated backup persona: {_backup_persona.name}")
            except Exception as inner_e:
                logger.error(f"Error generating persona with Claude: {str(inner_e)}")
                # Fall back to default persona
                _backup_persona = create_default_persona(user_profile)
                logger.info(f"Using default backup persona: {_backup_persona.name}")
            
    except Exception as e:
        logger.error(f"Error generating backup persona: {str(e)}")
        _backup_persona = None

def parse_persona_description(description: str) -> dict:
    """Parse the AI-generated persona description into structured data."""
    try:
        # Extract the name
        name = "Business Buyer"
        if "Name:" in description:
            name_line = next((line for line in description.split('\n') if "Name:" in line), None)
            if name_line:
                name = name_line.split("Name:")[1].strip()
                # Remove any asterisks or other formatting
                name = name.lstrip('*').strip()
        
        # Extract role
        role = "Business Professional"
        if "Role:" in description:
            role_line = next((line for line in description.split('\n') if "Role:" in line), None)
            if role_line:
                role = role_line.split("Role:")[1].strip()
                role = role.lstrip('*').strip()
        
        # Extract personality traits
        traits = extract_traits(description)
        
        # Extract emotional state
        emotional_state = extract_emotional_state(description)
        
        # Extract buyer type
        buyer_type = extract_buyer_type(description)
        
        # Extract decision authority
        decision_authority = extract_decision_authority(description)
        
        # Extract pain points
        pain_points = extract_pain_points(description)
        
        # Extract primary concern
        primary_concern = extract_primary_concern(description, pain_points)
        
        # Extract objections
        objections = extract_objections(description)
        
        # Extract cognitive biases
        biases = extract_biases(description)
        
        # Return the parsed data
        return {
            "name": name,
            "description": description,
            "role": role,
            "personality_traits": traits,
            "emotional_state": emotional_state,
            "buyer_type": buyer_type,
            "decision_authority": decision_authority,
            "pain_points": pain_points,
            "primary_concern": primary_concern,
            "objections": objections,
            "cognitive_biases": biases
        }
        
    except Exception as e:
        logger.error(f"Error parsing persona description: {str(e)}")
        # Return fallback data
        return {
            "name": "Business Buyer",
            "description": description,
            "role": "Business Professional",
            "personality_traits": {"Analytical": 0.7, "Decisive": 0.6},
            "emotional_state": "Neutral",
            "buyer_type": "Analytical",
            "decision_authority": "Medium",
            "pain_points": ["Efficiency", "Cost Management"],
            "primary_concern": "Efficiency",
            "objections": ["Price", "Implementation time", "ROI uncertainty"],
            "cognitive_biases": {"Loss aversion": 0.6, "Status quo bias": 0.5}
        }

def create_fallback_persona() -> BuyerPersona:
    """Create a fallback persona if AI generation fails."""
    return BuyerPersona(
        name="Business Buyer",
        description="A business professional evaluating solutions.",
        personality_traits=json.dumps({"Analytical": 0.7, "Decisive": 0.6}),
        emotional_state="Neutral",
        buyer_type="Analytical",
        decision_authority="Medium",
        pain_points=json.dumps(["Efficiency", "Cost Management"]),
        objections=json.dumps(["Price", "Implementation time", "ROI uncertainty"]),
        cognitive_biases=json.dumps({"Loss aversion": 0.6, "Status quo bias": 0.5})
    )

def create_fallback_feedback(error_message: str = "Feedback could not be processed.") -> Dict[str, Any]:
    """Creates a default/fallback feedback structure in case of parsing errors."""
    current_app.logger.error(f"Creating fallback feedback: {error_message}")
    
    # Create a dictionary with fallback feedback data
    return {
        "overall_assessment": f"Error: {error_message} We couldn't analyze your conversation in detail, but we can see you had a dialogue with the buyer persona. To get proper feedback, try having a longer conversation with more detailed exchanges.",
        "strengths_demonstrated": [],
        "areas_for_improvement": ["Could not analyze session due to feedback processing error."],
        "rapport_feedback": "We couldn't analyze your rapport building in this conversation.",
        "discovery_feedback": "We couldn't analyze your needs discovery approach in this conversation.",
        "objection_feedback": "We couldn't analyze your objection handling in this conversation.",
        "closing_feedback": "We couldn't analyze your closing techniques in this conversation.",
        "emotional_intelligence_feedback": "We couldn't analyze your emotional intelligence in this conversation.",
        "question_quality_feedback": "We couldn't analyze your questioning techniques in this conversation.",
        "mindset_insights": "We couldn't analyze your sales mindset in this conversation.",
        "limiting_beliefs_detected": [],
        "reframe_suggestions": [],
        "action_items": ["Try having a longer, more detailed conversation with the buyer persona.", 
                        "Make sure to ask open-ended questions to understand their needs.",
                        "Review the conversation yourself to identify what went well and what could be improved."],
        "error_message": error_message
    }

def get_training_session(session_id: int, user_profile_id: int) -> Optional[TrainingSession]:
    """Retrieve a specific training session, ensuring ownership."""
    # Eager load necessary relationships to prevent N+1 queries later
    session = TrainingSession.query.options(
        db.joinedload(TrainingSession.buyer_persona),
        db.joinedload(TrainingSession.performance_metrics),
        db.joinedload(TrainingSession.feedback_analysis)
    ).filter_by(id=session_id, user_profile_id=user_profile_id).first()
    
    return session

def generate_ai_response(message, session_object):
    """Generate an AI response from the buyer persona for the provided user message."""
    try:
        from app.services.claude_service import get_claude_service
        
        logger.info(f"Generating AI response for session {session_object.id}")
        
        # Get the buyer persona
        buyer_persona = session_object.buyer_persona
        if not buyer_persona:
            logger.error(f"No buyer persona found for session {session_object.id}")
            return "I'm sorry, but I'm having trouble accessing the buyer persona information. Please try again or start a new session.", session_object
        
        # Get the conversation history
        conversation_history = session_object.conversation_history_dict
        if not conversation_history:
            conversation_history = []
            
        # Add the current message to the conversation history temporarily
        conversation_with_new_message = conversation_history + [{"role": "user", "content": message}]

        # Get the Claude service
        claude_service = get_claude_service()
        
        # Get the user's profile to personalize the experience
        user_profile = UserProfile.query.get(session_object.user_profile_id)
        
        # Safely get user name - handle the case where user object may not have username
        user_name = "Salesperson"  # Default fallback
        try:
            if user_profile and hasattr(user_profile, 'user') and user_profile.user:
                if hasattr(user_profile.user, 'username') and user_profile.user.username:
                    user_name = user_profile.user.username
                elif hasattr(user_profile.user, 'email') and user_profile.user.email:
                    # Use part before @ in email as username
                    user_name = user_profile.user.email.split('@')[0]
        except Exception as name_error:
            logger.warning(f"Failed to get username: {name_error}")
            # Continue with default name
        
        # Prepare sales context for the roleplay
        sales_info = {
            "product_service": getattr(user_profile, 'product_service', "Unknown product"),
            "target_market": getattr(user_profile, 'target_market', "Unknown market"),
            "industry": getattr(user_profile, 'industry', "Various industries")
        }
        
        # Use the specialized roleplay response method which has better prompting
        try:
            ai_response = claude_service.generate_roleplay_response(
                conversation_history=conversation_with_new_message,
                persona=buyer_persona.description,
                sales_info=sales_info,
                user_name=user_name
            )
            
            # Handle both string responses and split message responses (as dictionary)
            if isinstance(ai_response, dict) and 'response' in ai_response and 'follow_up' in ai_response:
                logger.info(f"Generated split message response for session {session_object.id}")
                # Return the entire response dictionary
                return ai_response, session_object
            else:
                # Handle normal string responses
                return ai_response, session_object
        
        except Exception as e:
            logger.error(f"Claude API error: {str(e)}")
            return "I'm sorry, but I'm experiencing some technical difficulties. Could you please try again or rephrase your question?", session_object
    
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.", session_object

def analyze_interaction(session: TrainingSession, user_message: str, ai_response: str):
    """Analyze the interaction for key moments and objections."""
    logger.info(f"Analyzing interaction for session {session.id}")
    
    try:
        # Track the interaction in key moments
        key_moments = session.key_moments_list if hasattr(session, 'key_moments_list') else []
        
        # Check for objection handling
        objection_phrases = ["concerned about", "worried about", "issue with", "problem with", 
                            "don't understand", "too expensive", "not sure if"]
        
        if any(phrase in ai_response.lower() for phrase in objection_phrases):
            # AI raised an objection
            key_moments.append({
                "type": "objection_raised",
                "timestamp": datetime.utcnow().isoformat(),
                "content": ai_response[:100] + "..." if len(ai_response) > 100 else ai_response
            })
            
            # Add to objections handled list for tracking
            objections = session.objections_handled_list if hasattr(session, 'objections_handled_list') else []
            objection_summary = next((phrase for phrase in objection_phrases if phrase in ai_response.lower()), "general objection")
            objections.append(objection_summary)
            session.objections_handled_list = objections
        
        # Check for positive key moments in user response
        positive_phrases = ["great question", "excellent point", "that's exactly", "i understand", 
                           "let me explain", "the value is", "benefit"]
                           
        if any(phrase in user_message.lower() for phrase in positive_phrases):
            # User had a positive moment
            key_moments.append({
                "type": "positive_user_moment",
                "timestamp": datetime.utcnow().isoformat(),
                "content": user_message[:100] + "..." if len(user_message) > 100 else user_message
            })
        
        # Update the session
        session.key_moments_list = key_moments
        
        # In a production system, you would use the voice analysis service here
        # if session includes voice data
        
    except Exception as e:
        logger.error(f"Error analyzing interaction: {str(e)}")
        logger.error(traceback.format_exc())

def generate_performance_metrics(session: TrainingSession) -> PerformanceMetrics:
    """Generate performance metrics for the session."""
    logger.info(f"Generating performance metrics for session {session.id}")
    
    try:
        # Get Claude service for analysis (optional for more sophisticated analysis)
        claude_service = get_claude_service()
        
        # Calculate metrics based on the conversation history
        conversation = session.conversation_history_dict
        
        # Initialize basic metrics
        metrics = {
            'rapport_building': 3,
            'needs_discovery': 3,
            'objection_handling': 3,
            'closing_techniques': 3,
            'product_knowledge': 3,
            'emotional_awareness': 3,
            'tone_consistency': 3
        }
        
        # Simple metric calculations based on key moments and objections
        key_moments = session.key_moments_list if hasattr(session, 'key_moments_list') else []
        objections = session.objections_handled_list if hasattr(session, 'objections_handled_list') else []
        
        # Calculate rapport building score based on positive moments
        positive_moments = [m for m in key_moments if m.get('type') == 'positive_user_moment']
        metrics['rapport_building'] = min(5, 3 + len(positive_moments) // 2)
        
        # Calculate objection handling score
        metrics['objection_handling'] = min(5, 3 + len(objections) // 2)
        
        # In a real implementation, you would use Claude for more sophisticated analysis
        # of the entire conversation
        
        # Generate bias effectiveness data
        bias_effectiveness = {
            "Social proof": 0.7,
            "Anchoring": 0.6,
            "Scarcity": 0.5,
            "Consistency": 0.8,
            "Loss aversion": 0.6
        }
        
        # Create the metrics object
        performance_metrics = PerformanceMetrics(
            training_session_id=session.id,
            rapport_building=metrics['rapport_building'],
            needs_discovery=metrics['needs_discovery'],
            objection_handling=metrics['objection_handling'],
            closing_techniques=metrics['closing_techniques'],
            product_knowledge=metrics['product_knowledge'],
            bias_effectiveness=json.dumps(bias_effectiveness),
            emotional_awareness=metrics['emotional_awareness'],
            tone_consistency=metrics['tone_consistency']
        )
        
        # Update the session with some summary metrics
        session.trust_score = int(metrics['rapport_building'] * 20)  # Scale to 0-100
        session.persuasion_rating = int((metrics['needs_discovery'] + metrics['objection_handling']) * 10)
        session.confidence_score = int(metrics['tone_consistency'] * 20)
        
        return performance_metrics
        
    except Exception as e:
        logger.error(f"Error generating performance metrics: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return fallback metrics
        return PerformanceMetrics(
            training_session_id=session.id,
            rapport_building=3,
            needs_discovery=3,
            objection_handling=3,
            closing_techniques=3,
            product_knowledge=3,
            bias_effectiveness=json.dumps({"Anchoring": 0.5}),
            emotional_awareness=3,
            tone_consistency=3
        )

def generate_feedback_analysis(session: TrainingSession) -> Optional[FeedbackAnalysis]:
    """Generate an AI-powered feedback analysis for a training session.
    
    Args:
        session: The TrainingSession to analyze
        
    Returns:
        FeedbackAnalysis object or None if generation fails
    """
    try:
        # Parse the conversation history
        conversation_history = session.conversation_history_dict
        
        current_app.logger.info(f"[Feedback Gen] History for Session {session.id} has {len(conversation_history)} messages.")
        
        # Check if there's enough data for meaningful feedback
        if len(conversation_history) < 3:  # Require at least 3 exchanges for meaningful feedback
            current_app.logger.warning(f"Insufficient conversation data for session {session.id}. Only {len(conversation_history)} messages.")
            
            # Create a minimal feedback analysis with insufficient_data flag
            feedback = FeedbackAnalysis(
                session_id=session.id,
                user_profile_id=session.user_profile_id,
                overall_assessment="Insufficient data for meaningful feedback. The conversation was too short to provide detailed analysis.",
                insufficient_data=True  # Add this flag to the database
            )
            db.session.add(feedback)
            db.session.commit()
            return feedback
        
        # Continue with normal feedback generation for sufficient data...

        # Get OpenAI service instead of Claude
        openai_service = get_openai_service()
        
        # Format the conversation history for OpenAI
        conversation_history = []
        for entry in session.conversation_history_dict:
            conversation_history.append({
                'role': entry.get('role'),  # Keep the role field
                'content': entry.get('content')
            })
            
        # --- Log History Length Before Sending for Feedback ---
        logger.info(f"[Feedback Gen] History for Session {session.id} has {len(conversation_history)} messages.")
        # Estimate token count (simple approximation: 1 token ~= 4 chars)
        try:
            total_chars = sum(len(msg.get('content', '')) for msg in conversation_history)
            estimated_tokens = total_chars / 4 
            logger.info(f"[Feedback Gen] Estimated token count for history: {estimated_tokens:.0f}")
        except Exception as e_log:
            logger.warning(f"[Feedback Gen] Could not estimate token count: {e_log}")
        # --- End Log ---
            
        # Pass user profile and buyer persona to feedback generation
        if not session.user_profile:
            session = db.session.query(TrainingSession).options(joinedload(TrainingSession.user_profile)).get(session.id)
        if not session.buyer_persona:
            session = db.session.query(TrainingSession).options(joinedload(TrainingSession.buyer_persona)).get(session.id)
            
        if not session.user_profile or not session.buyer_persona:
            logger.error(f"Missing profile or persona for feedback generation on session {session.id}")
            return None
            
        # Get emotional intelligence and question quality scores
        emotional_awareness_score = getattr(session, 'emotional_awareness_score', 70.0)
        empathy_score = getattr(session, 'empathy_score', 70.0)
        rapport_score = getattr(session, 'rapport_score', 70.0)
        question_quality_score = getattr(session, 'question_quality_score', 75.0)
        
        # Add emotional intelligence metrics to the prompt for OpenAI
        emotional_intelligence_context = f"""
EMOTIONAL INTELLIGENCE METRICS:
- Emotional Awareness Score: {emotional_awareness_score:.1f}/100
- Empathy Score: {empathy_score:.1f}/100
- Rapport Building Score: {rapport_score:.1f}/100
- Question Quality Score: {question_quality_score:.1f}/100

Please incorporate these metrics into your feedback, especially addressing:
1. How well the salesperson recognized the buyer's emotional state
2. Whether they overwhelmed the buyer with too many questions at once
3. How effectively they built rapport and demonstrated empathy
"""
        
        # Create a system prompt for OpenAI that includes structured output instruction
        system_prompt = """
You are PitchIQ, an expert sales coach analyzing a sales conversation. 
Your task is to provide detailed, structured feedback on the salesperson's performance.

Analyze the conversation and provide feedback in the following JSON format:

{
  "overall_assessment": "A paragraph summarizing the overall performance",
  "strengths_demonstrated": ["strength1", "strength2", "strength3"],
  "areas_for_improvement": ["area1", "area2", "area3"],
  "rapport_feedback": "Analysis of rapport building skills",
  "discovery_feedback": "Analysis of needs discovery process",
  "objection_feedback": "Analysis of objection handling",
  "closing_feedback": "Analysis of closing techniques",
  "emotional_intelligence_feedback": "Analysis of emotional intelligence",
  "question_quality_feedback": "Analysis of question quality and strategy",
  "mindset_insights": "Insights about salesperson's mindset and beliefs",
  "limiting_beliefs_detected": ["belief1", "belief2"],
  "reframe_suggestions": ["reframe1", "reframe2"],
  "action_items": ["action1", "action2", "action3"]
}

IMPORTANT: Be concise but specific in your feedback. Include concrete examples from the conversation.
Be brutally honest when necessary but always constructive.
""" + emotional_intelligence_context
        
        # Use the OpenAI generate_response method
        try:
            response_text = openai_service.generate_response(
                messages=conversation_history,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=2000
            )
            
            logger.info(f"Generated OpenAI feedback for session {session.id}")
            
            # Parse the response - it should be JSON
            feedback_data = parse_feedback_text(response_text)
            
            # Ensure we have an overall assessment, even if parsing failed
            if not feedback_data.get('overall_assessment'):
                # If we have a response but couldn't parse a proper overall_assessment,
                # use the first 200 characters of the response as the overall assessment
                if response_text:
                    trimmed_text = response_text[:500] if len(response_text) > 500 else response_text
                    logger.warning(f"No overall_assessment found in parsed data, using text extract: {trimmed_text[:50]}...")
                    feedback_data['overall_assessment'] = trimmed_text
            
            logger.info(f"Feedback overall assessment: {feedback_data.get('overall_assessment', '')[:100]}...")
        except Exception as e:
            logger.error(f"Error generating feedback with OpenAI: {str(e)}")
            feedback_data = {"error": f"OpenAI feedback generation failed: {str(e)}"}
        
        # Check for feedback generation failure
        if not feedback_data:
            current_app.logger.warning(f"No feedback data generated for session {session.id}")
            return None # Indicate failure or return minimal feedback
        
        # Initialize variables for feedback fields
        overall_assessment = "Feedback analysis pending."
        strengths = []
        improvements = []
        rapport_feedback = "N/A"
        discovery_feedback = "N/A"
        objection_feedback = "N/A"
        closing_feedback = "N/A"
        emotional_intelligence_feedback = "N/A"  # New field for emotional intelligence
        question_quality_feedback = "N/A"  # New field for question quality
        mindset_insights = "N/A"
        limiting_beliefs_detected = []
        reframe_suggestions = []
        action_items = []
        error_message = None # Store potential errors

        # Check if parsing failed or generation returned an error structure
        if isinstance(feedback_data, dict) and feedback_data.get("error"):
            error_message = feedback_data["error"]
            current_app.logger.error(f"Feedback processing failed for session {session.id}: {error_message}")
            overall_assessment = f"Feedback generation failed: {error_message}"
            # Keep other fields as default error/empty values
        elif isinstance(feedback_data, dict):
            # Successfully parsed or generated feedback data
            overall_assessment = feedback_data.get('overall_assessment', overall_assessment)
            strengths = feedback_data.get('strengths_demonstrated', strengths)
            improvements = feedback_data.get('areas_for_improvement', improvements)
            rapport_feedback = feedback_data.get('rapport_feedback', rapport_feedback)
            discovery_feedback = feedback_data.get('discovery_feedback', discovery_feedback)
            objection_feedback = feedback_data.get('objection_feedback', objection_feedback)
            closing_feedback = feedback_data.get('closing_feedback', closing_feedback)
            emotional_intelligence_feedback = feedback_data.get('emotional_intelligence_feedback', 
                f"The salesperson scored {emotional_awareness_score:.1f}/100 on emotional awareness, {empathy_score:.1f}/100 on empathy, and {rapport_score:.1f}/100 on rapport building.")
            question_quality_feedback = feedback_data.get('question_quality_feedback', 
                f"The salesperson scored {question_quality_score:.1f}/100 on question quality.")
            mindset_insights = feedback_data.get('mindset_insights', mindset_insights)
            limiting_beliefs_detected = feedback_data.get('limiting_beliefs_detected', limiting_beliefs_detected)
            reframe_suggestions = feedback_data.get('reframe_suggestions', reframe_suggestions)
            action_items = feedback_data.get('action_items', action_items)
            
            # IMPORTANT: Calculate scores using the same formula as in generate_performance_metrics
            # Instead of random values, use the actual metrics consistently
            
            # Extract metrics from feedback or use default baseline metrics
            rapport_building = getattr(session, 'rapport_score', rapport_score) / 100 * 5  # Convert 0-100 to 0-5 scale
            needs_discovery = getattr(session, 'question_quality_score', question_quality_score) / 100 * 5
            objection_handling = getattr(session, 'empathy_score', empathy_score) / 100 * 5
            tone_consistency = getattr(session, 'emotional_awareness_score', emotional_awareness_score) / 100 * 5
            
            # Calculate scores using same formulas as in generate_performance_metrics
            session.trust_score = int(rapport_building * 20)  # Scale to 0-100
            session.persuasion_rating = int((needs_discovery + objection_handling) * 10)
            session.confidence_score = int(tone_consistency * 20)
            
            logger.info(f"Updated session scores based on emotional metrics: trust={session.trust_score}, " +
                        f"persuasion={session.persuasion_rating}, confidence={session.confidence_score}")
            
            # Update emotional intelligence feedback text to match scores
            emotional_intelligence_feedback = feedback_data.get('emotional_intelligence_feedback',
                f"The salesperson scored {emotional_awareness_score:.1f}/100 on emotional awareness, {empathy_score:.1f}/100 on empathy, and {rapport_score:.1f}/100 on rapport building.")
        else:
            # Should not happen if parse_feedback_text always returns a dict
            current_app.logger.error(f"Unexpected feedback_data type for session {session.id}: {type(feedback_data)}")
            error_message = "Unexpected feedback data format"
            overall_assessment = f"Feedback generation failed: {error_message}"

        # Create or update FeedbackAnalysis record
        feedback = FeedbackAnalysis.query.filter_by(session_id=session.id).first()
        if not feedback:
            feedback = FeedbackAnalysis(session_id=session.id, user_profile_id=session.user_profile_id)
            db.session.add(feedback)
        
        # Populate feedback fields from extracted/default data
        feedback.overall_assessment = overall_assessment
        feedback.strengths_demonstrated = json.dumps(strengths)
        feedback.areas_for_improvement = json.dumps(improvements)
        feedback.rapport_feedback = rapport_feedback
        feedback.discovery_feedback = discovery_feedback
        feedback.objection_feedback = objection_feedback
        feedback.closing_feedback = closing_feedback
        feedback.emotional_intelligence_feedback = emotional_intelligence_feedback  # New field
        feedback.question_quality_feedback = question_quality_feedback  # New field
        feedback.mindset_insights = mindset_insights
        feedback.limiting_beliefs_detected = json.dumps(limiting_beliefs_detected)
        feedback.reframe_suggestions = json.dumps(reframe_suggestions)
        feedback.action_items = json.dumps(action_items)
        feedback.error_message = error_message # Store potential parsing/generation errors
        feedback.updated_at = datetime.utcnow()
        
        # Store the actual scores in the feedback record
        feedback.emotional_awareness_score = emotional_awareness_score
        feedback.empathy_score = empathy_score
        feedback.rapport_score = rapport_score
        feedback.question_quality_score = question_quality_score

        try:
            db.session.commit()
            logger.info(f"Successfully generated and stored feedback analysis for session {session.id}")
            return feedback
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving feedback analysis for session {session.id}: {e}")
            logger.error(traceback.format_exc())
            return None

    except Exception as e:
        # This outer except handles errors *before* feedback_data is processed
        logger.error(f"Error during feedback generation process for session {session.id}: {e}") 
        logger.error(traceback.format_exc())
        # Optionally, still try to save a minimal error record
        try:
            feedback = FeedbackAnalysis.query.filter_by(session_id=session.id).first()
            if not feedback:
                feedback = FeedbackAnalysis(session_id=session.id, user_profile_id=session.user_profile_id)
                db.session.add(feedback)
            feedback.overall_assessment = f"Feedback generation failed: {e}"
            feedback.error_message = str(e)
            feedback.updated_at = datetime.utcnow()
            db.session.commit()
        except Exception as save_err:
            db.session.rollback()
            logger.error(f"Failed to save minimal error feedback for session {session.id}: {save_err}")
        return None # Indicate failure

def parse_feedback_text(feedback_text: str) -> Dict[str, Any]:
    """Parses raw feedback text (expected to be JSON) into a dictionary."""
    if not feedback_text:
        return create_fallback_feedback("Input feedback text was empty.")
        
    cleaned_text = feedback_text.strip()
    
    # Attempt to strip markdown code fences if present
    if cleaned_text.startswith("```json") and cleaned_text.endswith("```"):
        cleaned_text = cleaned_text[7:-3].strip() # Remove ```json and ```
    elif cleaned_text.startswith("```") and cleaned_text.endswith("```"):
         cleaned_text = cleaned_text[3:-3].strip() # Remove ``` and ```
         
    try:
        # Attempt to load the potentially cleaned text
        feedback_data = json.loads(cleaned_text)
        if isinstance(feedback_data, dict):
            return feedback_data
        else:
            current_app.logger.warning(f"Parsed feedback is not a dictionary: {type(feedback_data)}")
            return create_fallback_feedback("Parsed feedback structure was invalid.")
            
    except json.JSONDecodeError:
        # If direct parsing (even after cleaning) fails, log it and try regex extraction
        current_app.logger.warning("Failed to decode cleaned feedback text as JSON. Attempting regex extraction from original text.")
        # Fallback: Try to extract JSON object from the *original* potentially mixed text
        match = re.search(r'{\s*.*\s*}', feedback_text, re.DOTALL)
        if match:
            extracted_json = match.group(0)
            try:
                feedback_data = json.loads(extracted_json)
                if isinstance(feedback_data, dict):
                    current_app.logger.info("Successfully extracted JSON feedback from text using regex.")
                    return feedback_data
                else:
                     current_app.logger.warning("Extracted JSON feedback (regex) is not a dictionary.")
                     return create_fallback_feedback("Extracted feedback structure was invalid.")
            except json.JSONDecodeError as e_inner:
                current_app.logger.error(f"Failed to parse regex-extracted JSON fragment: {e_inner}")
                return create_fallback_feedback(f"Could not parse extracted feedback fragment: {e_inner}")
        else:
            current_app.logger.error("Could not find or parse JSON object within the feedback text using direct parse or regex.")
            return create_fallback_feedback("Feedback format was unparsable.")
            
    except Exception as e:
        current_app.logger.error(f"Unexpected error parsing feedback text: {e}", exc_info=True)
        return create_fallback_feedback(f"An unexpected error occurred during parsing: {e}")

def create_training_session(user_profile: UserProfile) -> TrainingSession:
    """Creates a new training session record."""
    
    # Determine initial stage based on user settings or default
    initial_stage = "rapport" # TODO: Make this configurable?
    
    new_session = TrainingSession(
        user_profile_id=user_profile.id,
        start_time=datetime.utcnow(),
        status='active',
        conversation_history=json.dumps([]), # Start with empty history
        current_stage=initial_stage,
        reached_stages=json.dumps([initial_stage]) # Mark initial stage as reached
        # buyer_persona_id will be set later if needed
    )
    db.session.add(new_session)
    try:
        db.session.commit()
        logger.info(f"Created new training session {new_session.id} for user {user_profile.id}")
        return new_session
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating training session for user {user_profile.id}: {e}", exc_info=True)
        raise # Re-raise the exception to be handled by the caller

def calculate_and_store_metrics(session: TrainingSession) -> Optional[PerformanceMetrics]:
    """Analyzes session data and stores performance metrics."""
    # Fetch conversation messages
    messages = Message.query.filter_by(training_session_id=session.id).order_by(Message.timestamp).all()
    conversation_log = session.conversation_history_dict # Use the JSON log

    if not conversation_log:
        logger.warning(f"No conversation history found to calculate metrics for session {session.id}")
        return None

    # Example: Call analyzer functions
    try:
        # Get basic metrics
        metrics_data = analyze_metrics(conversation_log, session.buyer_persona, session.user_profile)
        
        # Create or update PerformanceMetrics
        metrics_record = PerformanceMetrics.query.filter_by(training_session_id=session.id).first()
        if not metrics_record:
            metrics_record = PerformanceMetrics(training_session_id=session.id, user_profile_id=session.user_profile_id)
            db.session.add(metrics_record)
            
        # Populate fields from calculated data
        metrics_record.rapport_building = metrics_data.get('rapport_building', 0.0)
        metrics_record.needs_discovery = metrics_data.get('needs_discovery', 0.0)
        metrics_record.objection_handling = metrics_data.get('objection_handling', 0.0)
        metrics_record.closing_techniques = metrics_data.get('closing_techniques', 0.0)
        metrics_record.product_knowledge = metrics_data.get('product_knowledge', 0.0)
        metrics_record.bias_effectiveness_dict = metrics_data.get('bias_effectiveness', {})
        metrics_record.emotional_awareness = metrics_data.get('emotional_awareness', 0.0)
        metrics_record.tone_consistency = metrics_data.get('tone_consistency', 0.0)
        
        # Also update SessionMetrics if needed
        session_metrics_record = SessionMetrics.query.filter_by(training_session_id=session.id).first()
        if not session_metrics_record:
             session_metrics_record = SessionMetrics(training_session_id=session.id)
             db.session.add(session_metrics_record)
             
        session_metrics_record.talk_ratio = metrics_data.get('talk_ratio')
        session_metrics_record.avg_response_time = metrics_data.get('avg_response_time')
        session_metrics_record.pain_point_details_dict = metrics_data.get('pain_point_details', {})
        session_metrics_record.updated_at = datetime.utcnow()

        db.session.commit()
        logger.info(f"Calculated and stored metrics for session {session.id}")
        return metrics_record

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error calculating/storing metrics for session {session.id}: {e}", exc_info=True)
        return None

def analyze_metrics(conversation_history, buyer_persona, user_profile):
    """
    Analyze conversation to calculate various performance metrics.
    Returns a dictionary of metrics that can be stored.
    """
    # Default metrics
    metrics = {
        'rapport_building': 70.0,
        'needs_discovery': 65.0,
        'objection_handling': 70.0,
        'closing_techniques': 60.0,
        'product_knowledge': 75.0,
        'emotional_awareness': 65.0,
        'tone_consistency': 80.0,
        'talk_ratio': 0.6,
        'avg_response_time': 15.0,
        'bias_effectiveness': {},
        'pain_point_details': {}
    }
    
    # If no conversation data is present, return defaults
    if not conversation_history or len(conversation_history) < 3:
        return metrics
        
    # TODO: Add actual analysis logic here based on conversation content
    # Placeholder for now - would implement NLP or LLM-based analysis
    
    return metrics

def extract_pain_points(persona_description: str) -> list:
    """Extract pain points from persona description."""
    pain_points = []
    
    if "Needs & Pain Points:" in persona_description:
        pain_section = persona_description.split("Needs & Pain Points:")[1]
        
        # Handle different formats
        if "\n\n" in pain_section:
            pain_section = pain_section.split("\n\n")[0]
        
        lines = pain_section.split("\n")
        for line in lines:
            line = line.strip()
            if line and (line.startswith("-") or line.startswith("*") or line.startswith("•") or line[0].isdigit()):
                # Remove leading markers and whitespace
                clean_line = line.lstrip("- *•").strip()
                if clean_line.startswith(". "):  # For numbered lists
                    clean_line = clean_line[2:].strip()
                if clean_line.startswith(") "):  # For parenthetical numbering
                    clean_line = clean_line[2:].strip()
                
                if clean_line:
                    pain_points.append(clean_line)
    
    if not pain_points:
        return ["Efficiency", "Cost Management"]
    
    return pain_points

def create_default_persona(user_profile):
    """Create a default persona if AI generation fails."""
    return BuyerPersona(
        name="Business Buyer",
        description="A business professional evaluating solutions.",
        personality_traits=json.dumps({"Analytical": 0.7, "Decisive": 0.6}),
        emotional_state="Neutral",
        buyer_type="Analytical",
        decision_authority="Medium",
        pain_points=json.dumps(["Efficiency", "Cost Management"]),
        objections=json.dumps(["Price", "Implementation time", "ROI uncertainty"]),
        cognitive_biases=json.dumps({"Loss aversion": 0.6, "Status quo bias": 0.5}),
        role="Business Professional"
    )

def extract_traits(persona_description: str) -> dict:
    """Extract personality traits from persona description."""
    traits = {"Analytical": 0.7}
    
    if "Communication Style:" in persona_description:
        comm_section = persona_description.split("Communication Style:")[1].split("\n\n")[0].strip().lower()
        
        if "direct" in comm_section:
            traits["Direct"] = 0.8
        if "analytical" in comm_section:
            traits["Analytical"] = 0.9
        if "detail" in comm_section:
            traits["Detail-oriented"] = 0.8
        if "question" in comm_section:
            traits["Inquisitive"] = 0.7
        if "skeptical" in comm_section:
            traits["Skeptical"] = 0.8
        if "friendly" in comm_section:
            traits["Friendly"] = 0.7
        if "relationship" in comm_section:
            traits["Relationship-focused"] = 0.8
    
    return traits

def extract_emotional_state(persona_description: str) -> str:
    """Extract emotional state from persona description."""
    if "Initial Sales Stance:" in persona_description:
        stance = persona_description.split("Initial Sales Stance:")[1].split("\n\n")[0].strip().lower()
        
        if "skeptical" in stance:
            return "Skeptical"
        elif "curious" in stance:
            return "Curious"
        elif "open" in stance:
            return "Open"
        elif "resistant" in stance:
            return "Resistant"
        elif "analytical" in stance:
            return "Analytical"
        elif "friendly" in stance:
            return "Friendly"
    
    return "Neutral"

def extract_buyer_type(persona_description: str) -> str:
    """Extract buyer type from persona description."""
    description_lower = persona_description.lower()
    
    if "technical" in description_lower and "role:" in description_lower:
        return "Technical"
    elif "cto" in description_lower or "technical" in description_lower:
        return "Technical"
    elif "cfo" in description_lower or "financial" in description_lower:
        return "Economic"
    elif "ceo" in description_lower or "director" in description_lower:
        return "Decision Maker"
    elif "user" in description_lower:
        return "End User"
    
    return "Analytical"

def extract_decision_authority(persona_description: str) -> str:
    """Extract decision authority from persona description."""
    description_lower = persona_description.lower()
    
    if "ceo" in description_lower or "decision maker" in description_lower:
        return "High"
    elif "director" in description_lower or "vp" in description_lower:
        return "High"
    elif "manager" in description_lower:
        return "Medium"
    elif "specialist" in description_lower or "individual contributor" in description_lower:
        return "Low"
    
    return "Medium"

def extract_objections(persona_description: str) -> list:
    """Extract objections from persona description."""
    objections = []
    
    if "Potential Objections:" in persona_description:
        obj_section = persona_description.split("Potential Objections:")[1]
        
        # Handle different formats
        if "\n\n" in obj_section:
            obj_section = obj_section.split("\n\n")[0]
        
        lines = obj_section.split("\n")
        for line in lines:
            line = line.strip()
            if line and (line.startswith("-") or line.startswith("*") or line.startswith("•") or line[0].isdigit()):
                # Remove leading markers and whitespace
                clean_line = line.lstrip("- *•").strip()
                if clean_line.startswith(". "):  # For numbered lists
                    clean_line = clean_line[2:].strip()
                if clean_line.startswith(") "):  # For parenthetical numbering
                    clean_line = clean_line[2:].strip()
                
                if clean_line:
                    objections.append(clean_line)
    
    if not objections:
        return ["Price", "Implementation time"]
    
    return objections

def extract_primary_concern(persona_description: str, pain_points: list) -> str:
    """
    Extract the primary concern from the persona description.
    
    Args:
        persona_description: The textual description of the persona
        pain_points: List of pain points already extracted
        
    Returns:
        The primary concern as a string
    """
    try:
        # First, try to find a dedicated PRIMARY CONCERN section
        if "PRIMARY CONCERN" in persona_description.upper():
            # Split by the heading and get the content
            primary_section = persona_description.upper().split("PRIMARY CONCERN")[1]
            # Find the end of this section (next heading or end of text)
            next_heading = re.search(r'##|^\s*\*\*', primary_section, re.MULTILINE)
            if next_heading:
                primary_section = primary_section[:next_heading.start()]
            
            # Clean up the text
            primary_concern = primary_section.strip()
            # Remove any markdown formatting
            primary_concern = re.sub(r'^\s*[-*]\s*', '', primary_concern, flags=re.MULTILINE)
            primary_concern = re.sub(r'^\s*\[\s*|\s*\]\s*$', '', primary_concern)
            
            # Get the first paragraph/line as the main concern
            lines = [line.strip() for line in primary_section.split('\n') if line.strip()]
            if lines:
                return lines[0]
        
        # If no dedicated section or it's empty, look for explicit mention in the pain points section
        if "Needs & Pain Points" in persona_description:
            pain_points_section = persona_description.split("Needs & Pain Points")[1]
            next_heading = re.search(r'##|^\s*\*\*', pain_points_section, re.MULTILINE)
            if next_heading:
                pain_points_section = pain_points_section[:next_heading.start()]
                
            # Look for keywords indicating a priority/critical issue
            priority_keywords = [
                "most important", "critical", "urgent", "biggest", "primary", 
                "main concern", "key issue", "priority", "crucial", "significant"
            ]
            
            for line in pain_points_section.split('\n'):
                if any(keyword in line.lower() for keyword in priority_keywords):
                    # Clean up the line
                    concern = re.sub(r'^\s*[-*]\s*', '', line.strip())
                    return concern
        
        # If still no primary concern, use the first pain point from the list
        if pain_points and len(pain_points) > 0:
            return pain_points[0]
            
        # Last resort fallback
        return "Efficiency and cost management"
            
    except Exception as e:
        logger.error(f"Error extracting primary concern: {str(e)}")
        # Fallback
        if pain_points and len(pain_points) > 0:
            return pain_points[0]
        return "Efficiency and cost management"

def extract_biases(persona_description: str) -> dict:
    """Extract cognitive biases from persona description."""
    # Default biases
    biases = {
        "Loss aversion": 0.6,
        "Status quo bias": 0.5
    }
    
    description_lower = persona_description.lower()
    
    # Check for bias indicators in the description
    if "social proof" in description_lower:
        biases["Social proof"] = 0.7
    if "decision factor" in description_lower and "price" in description_lower:
        biases["Anchoring"] = 0.8
    if "limited time" in description_lower or "urgent" in description_lower:
        biases["Scarcity"] = 0.7
    if "consistent" in description_lower:
        biases["Consistency"] = 0.6
    if "previous experience" in description_lower:
        biases["Availability"] = 0.6
    
    return biases

def extract_name(persona_description: str) -> str:
    """Extract name from persona description."""
    try:
        # First extract the name from the description
        extracted_name = "Business Buyer"
        if "Name:" in persona_description:
            name_line = next((line for line in persona_description.split('\n') if "Name:" in line), None)
            if name_line:
                # Remove leading asterisks and strip whitespace
                raw_name = name_line.split("Name:")[1].strip()
                extracted_name = raw_name.lstrip('*').strip()
        
        return extracted_name
    except Exception as e:
        logger.error(f"Error extracting name: {str(e)}")
        return "Business Buyer"

def extract_role(persona_description: str) -> str:
    """Extract role from persona description."""
    if "Role:" in persona_description:
        role_line = next((line for line in persona_description.split('\n') if "Role:" in line), None)
        if role_line:
            role = role_line.split("Role:")[1].strip()
            return role.lstrip('*').strip()
    return "Business Professional"
