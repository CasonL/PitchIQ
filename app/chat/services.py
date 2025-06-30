"""
Service layer for chat-related business logic.

This module contains functions extracted from chat_routes.py to handle
core logic like AI interactions, onboarding, session setup, feedback processing,
and persona generation.
"""

import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

# Import necessary components from the application context
# Assuming db, get_claude_service, get_openai_service are accessible
# You might need to adjust imports based on your final project structure (e.g., using current_app)
from app.extensions import db
# from app.services.openai_service import get_openai_service # Old import
from app.services.openai_service import openai_service # Corrected import
from app.services.gpt4o_service import get_gpt4o_service

# Import models (adjust path if needed based on final structure)
from app.models import UserProfile, Conversation, Message, Feedback, BuyerPersona, User, TrainingSession

logger = logging.getLogger(__name__)

# === NEW: Voice-Enabled Chat Services ===

class VoiceChatSession:
    """Manages voice-enabled chat sessions with Deepgram voice-to-voice integration."""
    
    def __init__(self, session_id: str, user_id: int, scenario: str = 'sales_training'):
        self.session_id = session_id
        self.user_id = user_id
        self.scenario = scenario
        self.conversation_history = []
        self.session_metadata = {
            'start_time': datetime.utcnow().isoformat(),
            'scenario': scenario,
            'voice_enabled': True,
            'deepgram_integration': True
        }
        
    def add_message(self, role: str, content: str, metadata: Dict = None):
        """Add a message to the conversation history."""
        message = {
            'role': role,
            'content': content,
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': metadata or {}
        }
        self.conversation_history.append(message)
        return message
    
    def get_conversation_context(self) -> str:
        """Get formatted conversation context for AI prompts."""
        if not self.conversation_history:
            return ""
        
        context_lines = []
        for msg in self.conversation_history[-10:]:  # Last 10 messages for context
            role = msg['role'].title()
            content = msg['content']
            context_lines.append(f"{role}: {content}")
        
        return "\n".join(context_lines)

def create_voice_chat_session(user_id: int, scenario: str = 'sales_training') -> VoiceChatSession:
    """Create a new voice-enabled chat session."""
    session_id = f"voice-chat-{user_id}-{int(datetime.utcnow().timestamp())}"
    session = VoiceChatSession(session_id, user_id, scenario)
    
    logger.info(f"Created voice chat session {session_id} for user {user_id}")
    return session

def generate_voice_optimized_response(
    session: VoiceChatSession,
    user_message: str,
    user_profile: UserProfile = None
) -> Dict[str, Any]:
    """
    Generate AI response optimized for voice interaction.
    
    Returns:
        Dict containing response text, voice settings, and metadata
    """
    try:
        # Add user message to session
        session.add_message('user', user_message)
        
        # Get user context
        context = _build_voice_context(session, user_profile)
        
        # Generate AI response using OpenAI
        ai_response = _generate_ai_voice_response(context, user_message, session.scenario)
        
        # Add AI response to session
        session.add_message('assistant', ai_response)
        
        # Optimize text for voice synthesis
        voice_optimized_text = _optimize_text_for_voice(ai_response)
        
        return {
            'response': ai_response,
            'voice_text': voice_optimized_text,
            'session_id': session.session_id,
            'voice_settings': _get_voice_settings_for_scenario(session.scenario),
            'metadata': {
                'optimized_for_voice': True,
                'scenario': session.scenario,
                'conversation_length': len(session.conversation_history)
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating voice response: {str(e)}")
        fallback_response = _generate_fallback_voice_response(user_message, session.scenario)
        return {
            'response': fallback_response,
            'voice_text': fallback_response,
            'session_id': session.session_id,
            'error': str(e),
            'fallback': True
        }

def _build_voice_context(session: VoiceChatSession, user_profile: UserProfile = None) -> str:
    """Build context for voice-optimized AI responses."""
    context_parts = [
        "You are an AI sales coach in a voice conversation.",
        "Keep responses conversational, natural, and under 100 words.",
        "Use contractions and casual language appropriate for spoken dialogue.",
        "Ask engaging follow-up questions to maintain conversation flow."
    ]
    
    if session.scenario == 'sales_training':
        context_parts.append("Focus on sales skills, techniques, and practical advice.")
    elif session.scenario == 'roleplay':
        context_parts.append("You are roleplaying as a potential customer or client.")
    elif session.scenario == 'cold_call':
        context_parts.append("Simulate a cold call scenario with realistic objections.")
    
    if user_profile:
        if user_profile.experience_level:
            context_parts.append(f"User experience level: {user_profile.experience_level}")
        if user_profile.product_service:
            context_parts.append(f"User's product/service: {user_profile.product_service}")
    
    # Add recent conversation context
    conversation_context = session.get_conversation_context()
    if conversation_context:
        context_parts.append("Recent conversation:")
        context_parts.append(conversation_context)
    
    return "\n".join(context_parts)

def _generate_ai_voice_response(context: str, user_message: str, scenario: str) -> str:
    """Generate AI response using OpenAI optimized for voice."""
    try:
        messages = [
            {"role": "system", "content": context},
            {"role": "user", "content": user_message}
        ]
        
        response = openai_service.chat_completion(
            messages=messages,
            max_tokens=150,  # Shorter responses for voice
            temperature=0.7,
            model="gpt-4o-mini"
        )
        
        return response.strip()
        
    except Exception as e:
        logger.error(f"Error in AI voice response generation: {str(e)}")
        return _generate_fallback_voice_response(user_message, scenario)

def _generate_fallback_voice_response(user_message: str, scenario: str) -> str:
    """Generate a simple fallback response for voice conversations."""
    fallback_responses = {
        'sales_training': [
            "That's a great question! Let me help you think through that.",
            "I understand what you're asking. Here's what I'd suggest...",
            "That's something many salespeople struggle with. Let's work on it together."
        ],
        'roleplay': [
            "Interesting point. Tell me more about that.",
            "I see what you mean. Can you explain how that would work?",
            "That sounds promising. What would be the next step?"
        ],
        'cold_call': [
            "I appreciate you calling, but I'm not sure this is right for us.",
            "We're pretty happy with our current solution. What makes yours different?",
            "I don't have much time right now. Can you give me the quick version?"
        ]
    }
    
    responses = fallback_responses.get(scenario, fallback_responses['sales_training'])
    import random
    return random.choice(responses)

def _optimize_text_for_voice(text: str) -> str:
    """Optimize text for natural voice synthesis."""
    if not text:
        return text
    
    # Apply voice optimizations similar to existing preprocess_text_for_speech
    optimizations = {
        r'\bI am\b': "I'm",
        r'\byou are\b': "you're",
        r'\bthey are\b': "they're",
        r'\bwe are\b': "we're",
        r'\bis not\b': "isn't",
        r'\bdoes not\b': "doesn't",
        r'\bdo not\b': "don't",
        r'\bcannot\b': "can't",
        r'\bwill not\b': "won't",
        r'\bthat is\b': "that's",
        r'\bit is\b': "it's",
        r'\bwould not\b': "wouldn't",
        r'\bcould not\b': "couldn't",
        r'\bshould not\b': "shouldn't",
        r'\b(However|Furthermore|Moreover)\b': r'Also',
        r'\bin conclusion\b': r'So'
    }
    
    optimized_text = text
    for pattern, replacement in optimizations.items():
        optimized_text = re.sub(pattern, replacement, optimized_text, flags=re.IGNORECASE)
    
    # Add natural pauses
    optimized_text = re.sub(r'(\w+) (but|and|or|so) (\w+)', r'\1, \2 \3', optimized_text)
    
    # Break up long sentences
    sentences = re.split(r'([.!?])', optimized_text)
    result_sentences = []
    
    for i in range(0, len(sentences), 2):
        if i+1 < len(sentences):
            sentence = sentences[i] + sentences[i+1]
            words = sentence.split()
            if len(words) > 20:  # Break long sentences
                midpoint = len(words) // 2
                first_half = ' '.join(words[:midpoint])
                second_half = ' '.join(words[midpoint:])
                if not first_half.endswith(('.', '!', '?')):
                    first_half += '...'
                result_sentences.extend([first_half, second_half])
            else:
                result_sentences.append(sentence)
        elif i < len(sentences):
            result_sentences.append(sentences[i])
    
    return ' '.join(result_sentences)

def _get_voice_settings_for_scenario(scenario: str) -> Dict[str, Any]:
    """Get voice synthesis settings optimized for different scenarios."""
    base_settings = {
        'stability': 0.65,
        'similarity_boost': 0.85,
        'style': 0.35,
        'use_speaker_boost': True,
        'speed': 1.0
    }
    
    scenario_adjustments = {
        'sales_training': {
            'style': 0.4,  # Slightly more expressive for coaching
            'speed': 0.95   # Slightly slower for learning
        },
        'roleplay': {
            'stability': 0.7,  # More stable for consistent character
            'style': 0.3       # Less dramatic for realistic customer
        },
        'cold_call': {
            'stability': 0.6,  # Slightly less stable for natural variation
            'style': 0.2,      # More neutral for realistic prospect
            'speed': 1.05      # Slightly faster for busy prospect feel
        }
    }
    
    settings = base_settings.copy()
    if scenario in scenario_adjustments:
        settings.update(scenario_adjustments[scenario])
    
    return settings

# === Voice Session Management ===

# In-memory storage for active voice sessions (in production, use Redis or database)
_active_voice_sessions: Dict[str, VoiceChatSession] = {}

def get_voice_session(session_id: str) -> Optional[VoiceChatSession]:
    """Get an active voice chat session."""
    return _active_voice_sessions.get(session_id)

def store_voice_session(session: VoiceChatSession):
    """Store a voice chat session."""
    _active_voice_sessions[session.session_id] = session

def end_voice_session(session_id: str) -> bool:
    """End and cleanup a voice chat session."""
    if session_id in _active_voice_sessions:
        session = _active_voice_sessions[session_id]
        # Log session end
        logger.info(f"Ending voice session {session_id} with {len(session.conversation_history)} messages")
        
        # TODO: Save session data to database for analytics
        
        # Remove from active sessions
        del _active_voice_sessions[session_id]
        return True
    return False

def cleanup_expired_voice_sessions():
    """Clean up expired voice sessions (call periodically)."""
    current_time = datetime.utcnow()
    expired_sessions = []
    
    for session_id, session in _active_voice_sessions.items():
        # Sessions expire after 1 hour of inactivity
        last_activity = datetime.fromisoformat(session.session_metadata['start_time'])
        if (current_time - last_activity).total_seconds() > 3600:
            expired_sessions.append(session_id)
    
    for session_id in expired_sessions:
        end_voice_session(session_id)
    
    if expired_sessions:
        logger.info(f"Cleaned up {len(expired_sessions)} expired voice sessions")

# === Integration with Existing Services ===

def integrate_voice_with_training_session(training_session: TrainingSession, voice_session: VoiceChatSession):
    """Integrate voice chat data with existing training session."""
    try:
        # Update training session with voice data
        if not training_session.metadata:
            training_session.metadata = {}
        
        training_session.metadata.update({
            'voice_session_id': voice_session.session_id,
            'voice_enabled': True,
            'voice_messages_count': len(voice_session.conversation_history),
            'voice_scenario': voice_session.scenario
        })
        
        # Save voice conversation as messages in the training session
        for msg in voice_session.conversation_history:
            message = Message(
                session_id=training_session.id,
                role=msg['role'],
                content=msg['content'],
                timestamp=datetime.fromisoformat(msg['timestamp']),
                metadata=msg.get('metadata', {})
            )
            db.session.add(message)
        
        db.session.commit()
        logger.info(f"Integrated voice session {voice_session.session_id} with training session {training_session.id}")
        
    except Exception as e:
        logger.error(f"Error integrating voice session with training: {str(e)}")
        db.session.rollback()

# --- Fallback Persona Generation ---
def generate_fallback_persona(sales_info: Dict[str, Any]) -> str:
    """Generates a simple, deterministic fallback persona text."""
    product = sales_info.get("product_service", "the product")
    market = sales_info.get("target_market", "average")
    experience = sales_info.get("sales_experience", "some")

    # Basic persona elements based on input
    name = "Alex Miller" # Simple default name
    role = "Potential Customer"
    goal = f"Interested in learning more about {product}."
    needs = [f"Understands {product}", "Value for money", "Good service"]
    personality = ["Inquisitive", "Cautious"]

    if market == "B2B":
        role = "Business Buyer"
        needs.append("Proven ROI")
        personality.append("Analytical")
    elif market == "B2C":
        role = "Individual Consumer"
        needs.append("Ease of use")
        personality.append("Friendly")

    persona_text = f"""Name: {name}
Role: {role}
Goal: {goal}
Key Needs: {', '.join(needs)}
Personality: {', '.join(personality)}"""
    logger.warning(f"Generated fallback persona for {product}")
    return persona_text

# --- Onboarding Logic ---
def handle_onboarding_message(profile: UserProfile, user_message: Message) -> str:
    """Handles the multi-step onboarding conversation with AI guidance."""
    current_step = profile.onboarding_step
    user_content = user_message.content.strip()

    # If first message or empty message, provide a welcoming start
    if not user_content or user_content.lower() in ['hi', 'hello', 'hey', 'start']:
        if current_step == "experience":
            return "Welcome to PitchIQ! I'm your AI sales coach. I'll help personalize your training experience. First, tell me about your sales experience - are you a beginner, intermediate, experienced, or an expert in sales?"
        elif current_step == "product_market_value":
            return "To help me create realistic scenarios, please tell me specifically about:\n\n1. Your primary product or service.\n2. The main problem you solve or the core value you provide to them.\n\nBeing specific will help me understand your context better."
        # Continue with normal flow for other steps if they exist or are added later (like pain_points, goals)

    if current_step == "experience":
        extracted = extract_sales_experience(user_content)
        if extracted:
            profile.experience_level = extracted
            profile.onboarding_step = "product_market_value" # Changed to new combined step
            db.session.commit()
            # Changed the transition message
            return f"Thanks for sharing that you're at the {extracted} level. I'll tailor your training accordingly. Next, I'll ask for specifics about what you sell, to whom, and the value you provide."
        else:
            # Provide more guidance if extraction fails
            return "I'd like to understand your sales experience better. Would you say you're a beginner, intermediate, experienced, or an expert in sales? This helps me customize your training path."

    elif current_step == "product_market_value": # New combined step
        if user_content:
            # Store the entire response in product_service for now.
            # A more sophisticated approach would parse this into separate fields for product, market, and value.
            profile.product_service = user_content # Stores combined product, market, value info
            
            # Attempt to extract target_market from the combined response
            extracted_market = extract_target_market(user_content)
            if extracted_market:
                profile.target_market = extracted_market
            
            profile.onboarding_step = "pain_points" # Next step after combined question
            db.session.commit()
            # Transition to pain_points question (existing prompt)
            return "Great, that gives me a good overview. Now, what are your biggest challenges or pain points in the sales process? For example: handling objections, closing deals, building trust, etc."
        else:
            # Re-ask the combined question if no content provided
            return "To help me create realistic scenarios, please tell me specifically about:\n\n1. Your primary product or service.\n2. The main problem you solve or the core value you provide to them.\n\nBeing specific will help me understand your context better."

    elif current_step == "pain_points":
        if user_content:
            # Store as JSON array
            profile.pain_points = json.dumps([p.strip() for p in user_content.split(',') if p.strip()])
            profile.onboarding_step = "goals"
            db.session.commit()
            return "Thanks for sharing those challenges. Now, what specific skills or goals would you like to focus on improving? For example: negotiation tactics, building rapport, handling price objections, etc."
        else:
            return "I'd like to understand your challenges better. What aspects of the sales process do you find most difficult?"
    
    elif current_step == "goals":
        if user_content:
            # Store as JSON array
            profile.improvement_goals = json.dumps([g.strip() for g in user_content.split(',') if g.strip()])
            profile.onboarding_complete = True
            db.session.commit()
            logger.info(
                f"Onboarding completed successfully for user {profile.user_id}. Profile context: Exp={profile.experience_level}, Prod={profile.product_service}, Mark={profile.target_market}"
            )
            return "Excellent! I've recorded your goals and customized your training plan. You're all set up and ready to start practicing. You can head to the dashboard to begin your first roleplay session, or update your preferences anytime in Settings."
        else:
            return "What specific sales skills would you like to improve? This helps me focus your training on areas that matter most to you."

    # Fallback if in an unexpected state
    logger.warning(
        f"Reached unexpected onboarding state '{profile.onboarding_step}' for user {profile.user_id}. Completing onboarding."
    )
    profile.onboarding_complete = True
    profile.onboarding_step = "complete"  # Set to final state
    db.session.commit()
    return "Thanks for the information! Your profile is now set up. You can start practicing by exploring the dashboard, or update your preferences anytime in Settings."

# --- AI Response Generation ---
def generate_fallback_response(user_message_content: str, persona: str, sales_info: Dict[str, Any]) -> str:
    """Generate a deterministic fallback AI response when the main API fails."""
    try:
        product = sales_info.get("product_service", "your product/service")
        persona_name = _extract_persona_name(persona) if persona else "Alex"

        user_message_lower = user_message_content.lower().strip()

        # Simple keyword matching for common openings
        if not user_message_lower: # Handle empty initial message case
             return f"Hi there, I'm {persona_name}. I'm interested in learning more about {product}. Can you tell me about it?"

        if any(term in user_message_lower for term in ["who are you", "your name", "speaking with"]):
            return f"I'm {persona_name}. I was looking into {product} and had a few questions."
        elif any(term in user_message_lower for term in ["hello", "hi", "hey", "good morning"]):
            if any(term in user_message_lower for term in ["how are you", "how's it going"]):
                 return f"Doing well, thanks! I'm {persona_name}. I'm interested in {product}. Can you tell me what makes it stand out?"
            else:
                 return f"Hello! I'm {persona_name}. I saw you offer {product} and wanted to learn more."
        elif any(term in user_message_lower for term in ["help you", "looking for", "interested in"]):
             return f"Yes, I'm {persona_name}. I'm exploring options for {product}. What can you tell me about yours?"

        # Generic fallback
        return f"Okay, thanks for reaching out. I'm {persona_name}. I'm interested in {product}. What should I know about it?"

    except Exception as e:
        logger.error(f"Error generating fallback response: {e}")
        # Absolute simplest fallback
        return "Okay, tell me more about your product."

def generate_ai_response(conversation: Conversation, user_message: Optional[Message]) -> str:
    """Generate an AI roleplay response using Claude or a fallback."""
    profile = UserProfile.query.filter_by(user_id=conversation.user_id).first()

    if not profile:
        logger.error(f"No profile found for user {conversation.user_id} in generate_ai_response")
        return "Sorry, there was an issue retrieving your profile."

    # This check should ideally be done before calling this function, but double-check
    if conversation.session_setup_step != "ready_for_roleplay":
        logger.error(
            f"generate_ai_response called prematurely. State: {conversation.session_setup_step}"
        )
        return "The roleplay setup isn't complete yet."

    # Ensure persona exists, generate fallback if needed
    if not conversation.persona:
        logger.warning(f"No persona found for conversation {conversation.id}, generating fallback.")
        sales_info_for_fallback = {
            "product_service": conversation.product_service or profile.product_service,
            "target_market": conversation.target_market or profile.target_market,
            "sales_experience": conversation.sales_experience or profile.experience_level,
        }
        conversation.persona = generate_fallback_persona(sales_info_for_fallback)
        # Commit this change immediately? Or expect caller to commit? Let's commit here for safety.
        try:
            db.session.add(conversation)
            db.session.commit()
            logger.info(f"Saved fallback persona for conversation {conversation.id}")
        except Exception as commit_error:
            db.session.rollback()
            logger.error(f"Failed to save fallback persona: {commit_error}")
            return "Sorry, I had trouble setting up the persona."


    # Prepare data for Claude
    user = User.query.get(conversation.user_id)
    user_name = user.name if user and user.name else "Salesperson"

    messages_query = (
        Message.query.filter_by(conversation_id=conversation.id)
        .order_by(Message.timestamp.asc()) # Ascending order for history
        .limit(20) # Limit history length
    )
    # Ensure user_message is included if provided, even if beyond limit 20
    all_messages = messages_query.all()
    if user_message and user_message not in all_messages:
         all_messages.append(user_message)
         # If adding the user message exceeds 20, remove the oldest
         if len(all_messages) > 20:
              all_messages.pop(0)

    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in all_messages]

    # Consolidate sales info from conversation or profile
    sales_info = {
        "product_service": conversation.product_service or profile.product_service,
        "target_market": conversation.target_market or profile.target_market,
        "sales_experience": conversation.sales_experience or profile.experience_level,
    }

    # Get Claude service instance
    gpt4o_svc = get_gpt4o_service()
    if not gpt4o_svc:
        logger.error("Claude service unavailable. Using fallback response.")
        user_message_content = user_message.content if user_message else ""
        return generate_fallback_response(user_message_content, conversation.persona, sales_info)

    # Call Claude API
    try:
        logger.info(
            f"Calling Claude API for roleplay response (Conv: {conversation.id}, User: {user_name})"
        )
        ai_response = gpt4o_svc.generate_roleplay_response(
            formatted_messages,
            conversation.persona,
            sales_info,
            user_name,
        )

        if not ai_response or not ai_response.strip():
            logger.warning(f"Empty response from Claude for conv {conversation.id}. Using fallback.")
            user_message_content = user_message.content if user_message else ""
            return generate_fallback_response(user_message_content, conversation.persona, sales_info)

        logger.info(f"Successfully received Claude response for conv {conversation.id}")
        return ai_response.strip()

    except Exception as e:
        logger.error(
            f"Error calling Claude API for conv {conversation.id}: {e}", exc_info=True
        )
        user_message_content = user_message.content if user_message else ""
        return generate_fallback_response(user_message_content, conversation.persona, sales_info)


# --- Context Extraction ---
def extract_sales_experience(message: str) -> Optional[str]:
    """Extract sales experience level (beginner, intermediate, experienced, expert) from text."""
    message_lower = message.lower()
    experience_level = None

    # Direct keyword matching (prioritized)
    if any(term in message_lower for term in ["expert", "master", "specialist", "guru", "authority", "professional", "advanced", "senior", "seasoned", "veteran"]):
        experience_level = "expert"
    elif any(term in message_lower for term in ["experienced", "several years"]):
         experience_level = "experienced"
    elif any(term in message_lower for term in ["intermediate", "some experience", "a few years", "couple years"]):
        experience_level = "intermediate"
    elif any(term in message_lower for term in ["beginner", "new", "novice", "starting", "just started", "no experience", "less than a year"]):
        experience_level = "beginner"

    # Numeric year matching (if no keyword match)
    if not experience_level:
        match = re.search(r"(\d+)\s+(year|yr)s?", message_lower)
        if match:
            years = int(match.group(1))
            if years >= 10:
                experience_level = "expert"
            elif years >= 6:
                experience_level = "experienced"
            elif years >= 2:
                experience_level = "intermediate"
            else: # 0 or 1 year
                experience_level = "beginner"

    if experience_level:
        logger.debug(f"Extracted experience level '{experience_level}' from: '{message}'")
    else:
        logger.debug(f"Could not extract experience level from: '{message}'")
    return experience_level


def extract_product_service(message: str) -> Optional[str]:
    """Attempt to extract a product/service description from a message."""
    message_lower = message.lower()
    # Look for phrases indicating the product
    patterns = [
        r"selling\s+(.+?)(?:\.|!|\?|,|\bbut\b|\band\b|\bso\b|$)",
        r"sell\s+(.+?)(?:\.|!|\?|,|\bbut\b|\band\b|\bso\b|$)",
        r"product is\s+(.+?)(?:\.|!|\?|,|\bbut\b|\band\b|\bso\b|$)",
        r"service is\s+(.+?)(?:\.|!|\?|,|\bbut\b|\band\b|\bso\b|$)",
        r"focusing on\s+(.+?)(?:\.|!|\?|,|\bbut\b|\band\b|\bso\b|$)",
        r"working with\s+(.+?)(?:\.|!|\?|,|\bbut\b|\band\b|\bso\b|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, message_lower)
        if match:
            product = match.group(1).strip()
            # Simple check to avoid extracting overly long/nonsensical text
            if product and len(product.split()) < 15:
                logger.debug(f"Extracted product/service '{product}' from: '{message}'")
                return product[:200] # Return capped length

    logger.debug(f"Could not extract product/service from: '{message}'")
    return None


def extract_target_market(message: str) -> Optional[str]:
    """Extract target market type (B2B, B2C, mixed) from text."""
    message_lower = message.lower()
    market_type = None

    # Prioritize explicit mentions
    if "b2b" in message_lower or "business to business" in message_lower:
        market_type = "B2B"
    elif "b2c" in message_lower or "business to consumer" in message_lower:
        market_type = "B2C"
    elif any(term in message_lower for term in ["both", "mix", "hybrid", "b2b and b2c", "business and consumer"]):
        market_type = "mixed"

    # Infer based on keywords if no explicit mention
    if not market_type:
        b2b_keywords = ["businesses", "companies", "corporations", "organizations", "enterprise", "firm", "industry"]
        b2c_keywords = ["consumers", "individuals", "people", "retail", "customer", "personal", "residential", "homeowner", "client"]

        has_b2b = any(kw in message_lower for kw in b2b_keywords)
        has_b2c = any(kw in message_lower for kw in b2c_keywords)

        if has_b2b and has_b2c:
            market_type = "mixed"
        elif has_b2b:
            market_type = "B2B"
        elif has_b2c:
            market_type = "B2C"

    if market_type:
        logger.debug(f"Extracted target market '{market_type}' from: '{message}'")
    else:
        logger.debug(f"Could not extract target market from: '{message}'")
    return market_type


# --- Profile/Stats Update Logic ---
def update_user_stats(user: User, feedback: Dict[str, Any]):
    """Update user profile stats based on parsed feedback. (Simplified Example)"""
    # This is a placeholder. The original logic was complex and relied on specific
    # feedback text structure. A robust implementation would require stable
    # structured feedback from the LLM or more sophisticated parsing.
    try:
        profile = user.profile
        if not profile:
            logger.warning(f"Attempted to update stats for user {user.id} without a profile.")
            return

        profile.total_roleplays = (profile.total_roleplays or 0) + 1
        profile.last_roleplay_date = datetime.utcnow()

        # Example: Update overall score history if available
        overall_score = feedback.get("skill_scores", {}).get("overall")
        if overall_score is not None:
             # Append score to a history list (ensure field exists in model)
             # current_history = profile.overall_score_history or []
             # current_history.append({"timestamp": datetime.utcnow().isoformat(), "score": overall_score})
             # profile.overall_score_history = current_history[-20:] # Keep last 20 scores
             pass # Placeholder until model field exists

        # Commit changes (assuming profile is already in session or attached)
        db.session.add(profile)
        # Let the calling function handle the commit

        logger.info(f"Updated basic stats for user {user.id}")

    except Exception as e:
        logger.error(f"Error updating user stats for user {user.id}: {e}", exc_info=True)
        # Avoid disrupting flow, rollback should be handled by caller if necessary


def update_user_profile_with_feedback(profile: UserProfile, feedback_data: Dict[str, Any], conversation: Conversation):
    """Update the UserProfile with detailed stats extracted from parsed feedback data."""
    try:
        # Increment counters
        profile.total_roleplays = (profile.total_roleplays or 0) + 1
        profile.total_feedback_received = (profile.total_feedback_received or 0) + 1
        profile.last_roleplay_date = datetime.utcnow()

        # Extract and store skill scores
        skill_scores = feedback_data.get("skill_scores", {}) # Use pre-parsed data
        if skill_scores:
            profile.update_skill_history(skill_scores) # Assume this method exists and handles history

        # Extract and update objection data
        objections = feedback_data.get("objections", []) # Use pre-parsed data
        if objections:
            # --- Simplified Objection Handling ---
            # Just store the list from this session? Or try to aggregate?
            # Aggregating requires more complex logic and potentially dedicated models.
            # For now, let's just store the most recent list (overwriting previous).
            # This needs refinement based on desired behavior.
            profile.common_objections_list = objections[:10] # Store last 10 encountered

            # Update simple handling scores (average)
            handling_scores = profile.objection_handling_scores_dict or {}
            for obj_data in objections:
                category = obj_data.get("category", "general")
                score = obj_data.get("handling_score")
                if score is not None:
                    if category in handling_scores:
                        # Running average - simplified
                        current_avg, count = handling_scores[category]
                        new_avg = ((current_avg * count) + score) / (count + 1)
                        handling_scores[category] = (new_avg, count + 1)
                    else:
                        handling_scores[category] = (score, 1)
            profile.objection_handling_scores_dict = handling_scores
            # --- End Simplified Objection Handling ---


        # Extract and update cognitive bias data
        biases = feedback_data.get("cognitive_biases", {}) # Use pre-parsed data
        if biases:
            # Add to lists, ensuring uniqueness (simple approach)
            current_used = set(profile.biases_used_list or [])
            current_used.update(biases.get("used", []))
            profile.biases_used_list = list(current_used)[:10] # Limit size

            current_missed = set(profile.biases_missed_list or [])
            current_missed.update(biases.get("missed", []))
            profile.biases_missed_list = list(current_missed)[:10] # Limit size

        # Update emotional intelligence metrics
        ei_score = feedback_data.get("emotional_intelligence") # Use pre-parsed data
        if ei_score is not None:
            # Simple running average
            current_ei = profile.emotional_intelligence_score or 0
            # Need a count or store history for proper averaging. Simplified for now:
            if current_ei > 0:
                 profile.emotional_intelligence_score = (current_ei + ei_score) / 2
            else:
                 profile.emotional_intelligence_score = ei_score

        # Commit should be handled by the caller (get_feedback route)
        logger.info(f"Updated profile stats for user {profile.user_id} based on feedback for conv {conversation.id}")

    except Exception as e:
        logger.error(f"Error updating user profile (user {profile.user_id}) with feedback: {e}", exc_info=True)
        # Don't re-raise, allow feedback process to continue


# --- Feedback Parsing Logic ---
# These functions parse the RAW feedback text (likely Markdown) from the LLM
# They need to be robust against formatting changes from the LLM.

def parse_feedback_text(feedback_text: str) -> Dict[str, Any]:
    """Parses raw feedback text (assuming Markdown sections) into a structured dictionary."""
    parsed_data = {
        "raw_feedback": feedback_text, # Always include raw text
        "summary": None,
        "skill_scores": {},
        "objections": [],
        "cognitive_biases": {"used": [], "missed": []},
        "emotional_intelligence": None,
        "strengths": [],
        "areas_for_improvement": [],
    }
    current_section_key = None
    current_section_content = ""

    # Define mappings from expected Markdown headers to dict keys
    section_map = {
        "OVERALL SUMMARY": "summary",
        "SKILL ANALYSIS": "skill_scores", # Handled specially below
        "OBJECTION ANALYSIS": "objections", # Handled specially below
        "COGNITIVE BIAS ASSESSMENT": "cognitive_biases", # Handled specially below
        "EMOTIONAL INTELLIGENCE": "emotional_intelligence", # Handled specially below
        "STRENGTHS": "strengths", # Handled specially below
        "AREAS FOR IMPROVEMENT": "areas_for_improvement", # Handled specially below
    }

    try:
        lines = feedback_text.strip().split('\n')
        for line in lines:
            stripped_line = line.strip()

            # Check for section headers (### Section Name)
            match = re.match(r"^###\s+(.+?)$", stripped_line)
            if match:
                # Store previous section content if any
                if current_section_key and current_section_content:
                     # Special handling for list-based sections
                     if current_section_key in ["strengths", "areas_for_improvement"]:
                          items = [item.strip() for item in current_section_content.split("-") if item.strip()]
                          parsed_data[current_section_key] = items[:5] # Limit list size
                     # General text content for summary
                     elif current_section_key == "summary":
                          parsed_data[current_section_key] = current_section_content.strip()
                     # Other sections require dedicated parsing functions called later
                     # else: pass # Handled by dedicated functions

                # Start new section
                section_title = match.group(1).strip().upper()
                current_section_key = section_map.get(section_title)
                current_section_content = ""
                # print(f"DEBUG PARSER: Found section: {section_title} -> Key: {current_section_key}") # Debug
            elif current_section_key:
                # Append content to the current section
                current_section_content += line + "\n"

        # Process the last section
        if current_section_key and current_section_content:
            if current_section_key in ["strengths", "areas_for_improvement"]:
                 items = [item.strip() for item in current_section_content.split("-") if item.strip()]
                 parsed_data[current_section_key] = items[:5]
            elif current_section_key == "summary":
                 parsed_data[current_section_key] = current_section_content.strip()
            # else: pass # Handled by dedicated functions

        # --- Call Dedicated Parsers for Complex Sections ---
        # These functions work on the *entire* raw text for robustness
        parsed_data["skill_scores"] = extract_skill_scores(feedback_text)
        parsed_data["objections"] = extract_objections(feedback_text)
        parsed_data["cognitive_biases"] = extract_cognitive_biases(feedback_text)
        parsed_data["emotional_intelligence"] = extract_emotional_intelligence(feedback_text)

        logger.info("Successfully parsed feedback text into structured data.")

    except Exception as e:
        logger.error(f"Error parsing feedback text: {e}", exc_info=True)
        # Return partially parsed data or just raw text in case of error
        # Fallback ensures raw_feedback is always present

    return parsed_data


def extract_skill_scores(feedback_text: str) -> Dict[str, Optional[int]]:
    """Extracts skill scores (e.g., 'Skill Name: 7/10') from the feedback text."""
    scores = {}
    # Define expected skills and patterns
    skill_patterns = {
        "rapport_building": r"Rapport Building:.*?(\d+)/10",
        "needs_discovery": r"Needs Discovery:.*?(\d+)/10",
        "objection_handling": r"Objection Handling:.*?(\d+)/10",
        "closing": r"Closing(?: Technique)?:.*?(\d+)/10", # Allow optional "Technique"
        "product_knowledge": r"Product Knowledge:.*?(\d+)/10",
        "overall": r"OVERALL SCORE:.*?(\d+)/10", # Look for overall score
    }
    try:
        for key, pattern in skill_patterns.items():
            match = re.search(pattern, feedback_text, re.IGNORECASE | re.DOTALL)
            if match:
                scores[key] = int(match.group(1))
            else:
                 scores[key] = None # Indicate if not found

        logger.debug(f"Extracted skill scores: {scores}")
    except Exception as e:
        logger.error(f"Error during skill score extraction: {e}")
        return {key: None for key in skill_patterns} # Return None for all on error
    return scores

def extract_objections(feedback_text: str) -> List[Dict[str, Any]]:
    """Extracts objection details (text, score, category) from feedback text."""
    objections = []
    try:
        # Find the OBJECTION ANALYSIS section
        match = re.search(r"###\s+OBJECTION ANALYSIS\s*(.*?)(?:###|\Z)", feedback_text, re.IGNORECASE | re.DOTALL)
        if not match:
            return []

        objection_section = match.group(1).strip()

        # Define categories and keywords
        categories = {
            "price": ["price", "cost", "expensive", "budget", "afford"],
            "timing": ["time", "timing", "when", "timeline", "deadline", "later", "ready"],
            "trust": ["trust", "credibility", "proof", "evidence", "believe"],
            "need": ["need", "necessity", "requirement", "essential", "value", "benefit"],
            "implementation": ["implement", "integration", "setup", "install", "difficult", "complex"],
            "competition": ["competitor", "alternative", "other solution", "compare"],
            "authority": ["authority", "decision maker", "permission", "ask"],
        }

        # Attempt to parse lines like "- Objection Text - Score/10" or "- Objection Text (Score/10)"
        # This regex tries to capture the text before the score pattern
        line_pattern = r"^\s*[-\*]?\s*(.+?)(?:\s*[-–—]\s*|\s*\()(\d+)/10"
        matches = re.finditer(line_pattern, objection_section, re.MULTILINE | re.IGNORECASE)

        for m in matches:
            objection_text = m.group(1).strip().rstrip(':-* ')
            score = int(m.group(2))

            # Determine category
            category = "general"
            for cat, keywords in categories.items():
                if any(keyword in objection_text.lower() for keyword in keywords):
                    category = cat
                    break

            objections.append({
                "objection": objection_text[:250], # Cap length
                "handling_score": score,
                "category": category,
            })

        if not objections:
             logger.warning("Objection section found but no objections parsed.")

        logger.debug(f"Extracted objections: {objections}")

    except Exception as e:
        logger.error(f"Error during objection extraction: {e}", exc_info=True)
        return [] # Return empty list on error
    return objections


def extract_cognitive_biases(feedback_text: str) -> Dict[str, List[str]]:
    """Extracts lists of used and missed cognitive biases from feedback text."""
    result = {"used": [], "missed": []}
    try:
        # Find the COGNITIVE BIAS ASSESSMENT section
        match = re.search(r"###\s+COGNITIVE BIAS ASSESSMENT\s*(.*?)(?:###|\Z)", feedback_text, re.IGNORECASE | re.DOTALL)
        if not match:
            return result

        bias_section = match.group(1).strip()

        # Define common biases (adjust as needed)
        biases_list = [
            "anchoring", "scarcity", "social proof", "authority", "reciprocity",
            "commitment & consistency", "liking", "loss aversion", "framing",
            "confirmation bias", "availability heuristic", "sunk cost fallacy",
            "bandwagon effect", "halo effect", "overconfidence",
        ]

        # Look for indicators of usage or missed opportunities
        for bias in biases_list:
            # Use word boundaries to avoid partial matches (e.g., 'liking' vs 'disliking')
            bias_pattern = r"\b" + re.escape(bias) + r"\b"

            # Search for the bias term itself
            if re.search(bias_pattern, bias_section, re.IGNORECASE):
                # Check context for 'used', 'applied', 'leveraged' vs 'missed', 'opportunity', 'could have'
                # Find the sentence containing the bias
                sentence_match = re.search(r"([^\.\!\?]*" + bias_pattern + r"[^\.\!\?]*[\.\!\?])", bias_section, re.IGNORECASE)
                sentence = sentence_match.group(1) if sentence_match else ""

                used_keywords = ["used", "applied", "leveraged", "effective", "successfully"]
                missed_keywords = ["missed", "opportunity", "could have", "failed to", "didn't"]

                if any(kw in sentence.lower() for kw in missed_keywords):
                    if bias not in result["missed"]: result["missed"].append(bias)
                # Assume used if found and not explicitly missed (can refine)
                elif any(kw in sentence.lower() for kw in used_keywords) or sentence:
                     if bias not in result["used"]: result["used"].append(bias)

        # Limit list sizes
        result["used"] = result["used"][:5]
        result["missed"] = result["missed"][:5]

        logger.debug(f"Extracted cognitive biases: {result}")

    except Exception as e:
        logger.error(f"Error during cognitive bias extraction: {e}", exc_info=True)
        return {"used": [], "missed": []} # Return empty on error
    return result


def extract_emotional_intelligence(feedback_text: str) -> Optional[int]:
    """Extracts the Emotional Intelligence (EI) score from feedback text."""
    score = None
    try:
        # Find the EMOTIONAL INTELLIGENCE section
        match = re.search(r"###\s+EMOTIONAL INTELLIGENCE\s*(.*?)(?:###|\Z)", feedback_text, re.IGNORECASE | re.DOTALL)
        if not match:
            return None

        ei_section = match.group(1)

        # Look for a score pattern like 'Score: 8/10' or just '8/10'
        score_match = re.search(r"(?:Score:)?\s*(\d+)/10", ei_section, re.IGNORECASE)
        if score_match:
            score = int(score_match.group(1))

        logger.debug(f"Extracted emotional intelligence score: {score}")

    except Exception as e:
        logger.error(f"Error during emotional intelligence extraction: {e}")
        return None # Return None on error
    return score


# --- Session Setup Logic ---
def _get_first_issue_field(reason: str) -> Optional[str]:
    """Parses the validation reason from Claude to find the first problematic field key."""
    reason_lower = reason.lower()
    if "product" in reason_lower or "service" in reason_lower:
        return "product_service"
    if "market" in reason_lower or "customer" in reason_lower or "audience" in reason_lower:
        return "target_market"
    if "experience" in reason_lower or "level" in reason_lower or "background" in reason_lower:
        return "sales_experience"
    logger.warning(f"Could not determine issue field from reason: '{reason}'")
    return None # Fallback if no clear field identified

def _extract_persona_name(persona_text: str) -> str:
    """Extracts the 'Name:' value from the generated persona text."""
    try:
        match = re.search(r"^Name:\s*(.+?)$", persona_text, re.MULTILINE | re.IGNORECASE)
        if match:
            return match.group(1).strip()
    except Exception:
        pass # Fallback if regex fails
    logger.warning("Could not extract persona name, using default.")
    return "the customer" # Default if name not found or error

def handle_session_setup(conversation: Conversation, profile: UserProfile, user_message: Message) -> str:
    """Handles the session setup steps (context confirmation, persona generation)."""
    user_input = user_message.content.strip()
    user_input_lower = user_input.lower()
    current_step = conversation.session_setup_step

    gpt4o_svc = get_gpt4o_service()
    if not gpt4o_svc:
        logger.error("Claude service unavailable during session setup.")
        return "Sorry, the AI setup service is unavailable. Please try again later."

    # --- Stage 3: Generate Persona (if ready) ---
    if current_step == "generate_persona":
        logger.info(f"Attempting to generate persona for Conv {conversation.id}")
        try:
            # Ensure context is complete before generating persona
            sales_info = {
                "product_service": conversation.product_service,
                "target_market": conversation.target_market,
                "sales_experience": conversation.sales_experience,
            }
            if not all(sales_info.values()):
                logger.error(
                    f"generate_persona called with incomplete context for Conv {conversation.id}: {sales_info}"
                )
                # Reset state to re-confirm context if incomplete
                conversation.session_setup_step = "confirm_context"
                db.session.add(conversation)
                db.session.commit()
                # Ask the user to provide missing info (or restart flow)
                # This ideally shouldn't happen if validation works correctly before this state.
                return "Sorry, some context is missing. Let's reconfirm. What product/service are you selling?"

            logger.info(f"Generating persona using context: {sales_info}")
            persona_text = ""
            try:
                # Call Claude to generate persona
                persona_text = gpt4o_svc.generate_customer_persona(sales_info)
                if not persona_text or len(persona_text.strip()) < 20:
                    logger.warning(f"Claude persona generation failed (short/empty). Using fallback. Conv {conversation.id}")
                    persona_text = generate_fallback_persona(sales_info)
            except Exception as api_error:
                 logger.error(f"Claude API error during persona generation: {api_error}. Using fallback. Conv {conversation.id}", exc_info=True)
                 persona_text = generate_fallback_persona(sales_info)

            # Save persona and update state
            conversation.persona = persona_text
            conversation.session_setup_step = "ready_for_roleplay"
            # Set title if still "New Conversation"
            if not conversation.title or conversation.title == "New Conversation":
                 if conversation.product_service:
                      product_word = conversation.product_service.split()[0].capitalize()
                      date_str = datetime.utcnow().strftime("%b %d") # e.g., Apr 03
                      conversation.title = f"{product_word} Roleplay ({date_str})"
                      logger.info(f"Set conversation title (on persona gen): {conversation.title}")

            db.session.add(conversation)
            db.session.commit()

            persona_name = _extract_persona_name(persona_text)
            logger.info(f"Generated persona '{persona_name}' for conv {conversation.id}. Ready for roleplay.")

            # Generate the first AI message to kick off the roleplay
            first_ai_message_content = generate_ai_response(conversation, None) # No user message yet

            combined_response = (
                f"Okay, I'll be roleplaying as {persona_name}."
            )
            return combined_response

        except Exception as e:
            db.session.rollback()
            logger.error(f"Unexpected error during persona generation phase: {e}", exc_info=True)
            # Reset state? Provide error message?
            conversation.session_setup_step = "confirm_context" # Go back to confirmation
            db.session.add(conversation)
            db.session.commit()
            return "Sorry, an internal error occurred while setting up the persona. Let's try confirming the details again. What product are you selling?"


    # --- Stages 1 & 2: Context Collection & Confirmation ---
    initial_context_from_profile = {
        "product_service": profile.product_service,
        "target_market": profile.target_market,
        "sales_experience": profile.experience_level,
    }

    # --- Initial Turn (State: confirm_context) ---
    if current_step == "confirm_context":
        welcome = "Welcome back to PitchIQ! " if profile.total_roleplays > 0 else "Welcome to PitchIQ! "

        # If profile has no context, start collecting immediately
        if not any(initial_context_from_profile.values()):
             conversation.session_setup_step = "collecting_product"
             db.session.add(conversation)
             db.session.commit()
             return welcome + "To get started, what Product/Service will you focus on for this session?"

        # Profile has context, validate it
        validation = gpt4o_svc.validate_sales_context(initial_context_from_profile)
        if validation["is_valid"]:
             # Store valid profile context in conversation and ask for confirmation
             conversation.product_service = initial_context_from_profile["product_service"]
             conversation.target_market = initial_context_from_profile["target_market"]
             conversation.sales_experience = initial_context_from_profile["sales_experience"]
             db.session.add(conversation)
             db.session.commit() # Commit the context copied from profile
             return (
                  welcome
                  + f"Let's set up this session. Based on your profile, I have:<br>"
                  + f"- Product: {conversation.product_service}<br>"
                  + f"- Market: {conversation.target_market}<br>"
                  + f"- Experience: {conversation.sales_experience}<br><br>"
                  + f"Sound right for this roleplay? (Say 'yes' or tell me any changes)."
             )
        else:
             # Profile context invalid, find first issue and ask
             reason = validation["reason"]
             logger.info(f"Initial profile context invalid: {reason}. Starting collection.")
             first_issue_field = _get_first_issue_field(reason) or "product_service" # Default to product if unknown

             # Store any valid parts from profile context
             if first_issue_field != "product_service": conversation.product_service = initial_context_from_profile["product_service"]
             if first_issue_field != "target_market": conversation.target_market = initial_context_from_profile["target_market"]
             if first_issue_field != "sales_experience": conversation.sales_experience = initial_context_from_profile["sales_experience"]

             next_state = f"collecting_{first_issue_field}"
             conversation.session_setup_step = next_state
             db.session.add(conversation)
             db.session.commit()

             # Ask the first question based on the issue field
             if first_issue_field == "product_service":
                  return welcome + f"To start setting up: {reason}. What Product/Service are we focusing on?"
             elif first_issue_field == "target_market":
                  product = conversation.product_service or "your product"
                  return welcome + f"Okay, focusing on {product}. Now, {reason}. Who is the Target Market for this session?"
             else: # sales_experience
                  product = conversation.product_service or "Not set"
                  market = conversation.target_market or "Not set"
                  return welcome + f"Got it (Product: {product}, Market: {market}). Lastly, {reason}. What's the Experience Level?"

    # --- Subsequent Turns (State: collecting_...) ---
    else: # State is collecting_product, collecting_market, or collecting_experience
        # Did user confirm with 'yes'? (Should only happen if user confirms *after* making changes)
        if user_input_lower in ["yes", "correct", "sounds good", "that's right", "ok", "okay"]:
            # Validate the currently stored context in the conversation object
            current_conv_context = {
                 "product_service": conversation.product_service,
                 "target_market": conversation.target_market,
                 "sales_experience": conversation.sales_experience,
            }
            if all(current_conv_context.values()): # Ensure all fields have values now
                 validation = gpt4o_svc.validate_sales_context(current_conv_context)
                 if validation["is_valid"]:
                      logger.info(f"User confirmed context: {current_conv_context}. Moving to persona gen.")
                      conversation.session_setup_step = "generate_persona"
                      db.session.add(conversation)
                      db.session.commit()
                      # Recurse to trigger persona generation immediately
                      return handle_session_setup(conversation, profile, user_message)
                 else:
                      # User said 'yes' but context is STILL invalid. Re-trigger collection for the issue.
                      reason = validation["reason"]
                      logger.warning(f"User said 'yes' but context still invalid: {reason}. Re-asking.")
                      first_issue_field = _get_first_issue_field(reason) or "product_service"
                      setattr(conversation, first_issue_field, None) # Clear invalid field
                      next_state = f"collecting_{first_issue_field}"
                      conversation.session_setup_step = next_state
                      db.session.add(conversation)
                      db.session.commit()
                      # Ask the question again based on the new state
                      if first_issue_field == "product_service": return f"Hmm, okay. {reason}. Could you describe the product differently?"
                      elif first_issue_field == "target_market": return f"Okay, regarding the market: {reason}. Can you clarify?"
                      else: return f"Got it. Experience level issue: {reason}. Can you clarify (e.g., beginner, X years)?"
            else:
                 # User said 'yes' but conversation context is incomplete. Find first missing and ask.
                 logger.warning("'Yes' received but context incomplete. Asking for missing field.")
                 if not conversation.product_service: field_to_ask = "product_service"
                 elif not conversation.target_market: field_to_ask = "target_market"
                 else: field_to_ask = "sales_experience"
                 next_state = f"collecting_{field_to_ask}"
                 conversation.session_setup_step = next_state
                 db.session.add(conversation)
                 db.session.commit()
                 if field_to_ask == "product_service": return "Okay, but I still need the Product/Service first."
                 elif field_to_ask == "target_market": return "Right, but what's the Target Market?"
                 else: return "Okay, and the Experience Level?"


        # User provided text, not 'yes'. Attempt to extract and validate.
        field_being_collected = current_step.split("collecting_")[-1]
        extracted_value = None

        # Use specific extractors first
        if field_being_collected == "product_service":
             extracted_value = extract_product_service(user_input)
        elif field_being_collected == "target_market":
             extracted_value = extract_target_market(user_input)
        elif field_being_collected == "sales_experience":
             extracted_value = extract_sales_experience(user_input)

        # If specific extractor failed, try generic Claude extraction as fallback
        if not extracted_value:
             logger.debug(f"Specific extractor failed for {field_being_collected}. Trying Claude general extraction.")
             extracted_all = gpt4o_svc.extract_context_details(user_input)
             extracted_value = extracted_all.get(field_being_collected)

        if extracted_value:
            logger.info(f"Extracted '{extracted_value}' for field '{field_being_collected}'. Storing.")
            setattr(conversation, field_being_collected, extracted_value)
            db.session.add(conversation)
            # Determine next step
            next_field_to_collect = None
            if field_being_collected == "product_service" and not conversation.target_market:
                 next_field_to_collect = "target_market"
            elif field_being_collected == "target_market" and not conversation.sales_experience:
                 next_field_to_collect = "sales_experience"
            # else: collected last field or next field already exists

            if next_field_to_collect:
                 # Ask for the next field
                 next_state = f"collecting_{next_field_to_collect}"
                 conversation.session_setup_step = next_state
                 db.session.commit() # Commit stored value and state change
                 product = conversation.product_service or "your product"
                 market = conversation.target_market or "their market"
                 if next_field_to_collect == "target_market":
                      return f"Okay, product is {product}. Now, what's the Target Market?"
                 else: # Asking for experience
                      return f"Great. Product: {product}, Market: {market}. And the Experience Level?"
            else:
                 # All fields seem to be collected now, validate the whole context
                 logger.info("All context fields potentially collected. Validating.")
                 full_context = {
                      "product_service": conversation.product_service,
                      "target_market": conversation.target_market,
                      "sales_experience": conversation.sales_experience,
                 }
                 if not all(full_context.values()):
                      # Should not happen if logic above is correct, but handle defensively
                      logger.error("Reached validation after collection, but context still incomplete!")
                      # Find first missing and reset state
                      if not full_context["product_service"]: field_to_ask = "product_service"
                      elif not full_context["target_market"]: field_to_ask = "target_market"
                      else: field_to_ask = "sales_experience"
                      next_state = f"collecting_{field_to_ask}"
                      conversation.session_setup_step = next_state
                      db.session.add(conversation)
                      db.session.commit()
                      if field_to_ask == "product_service": return "Apologies, let's restart with the Product/Service."
                      elif field_to_ask == "target_market": return "Sorry, I missed the Target Market. What is it?"
                      else: return "My mistake, what was the Experience Level?"

                 # Context looks complete, validate it
                 validation = gpt4o_svc.validate_sales_context(full_context)
                 if validation["is_valid"]:
                      logger.info(f"Collected context validated: {full_context}. Moving to persona gen.")
                      conversation.session_setup_step = "generate_persona"
                      db.session.add(conversation)
                      db.session.commit() # Commit final context
                      # Recurse to trigger persona generation
                      return handle_session_setup(conversation, profile, user_message)
                 else:
                      # Validation failed *after* collecting. Find issue and re-ask.
                      reason = validation["reason"]
                      logger.warning(f"Collected context failed validation: {reason}. Re-asking.")
                      first_issue_field = _get_first_issue_field(reason) or "product_service"
                      setattr(conversation, first_issue_field, None) # Clear invalid field
                      next_state = f"collecting_{first_issue_field}"
                      conversation.session_setup_step = next_state
                      db.session.add(conversation)
                      db.session.commit() # Commit cleared field and new state
                      # Ask the question again based on the new state
                      invalid_val = full_context.get(first_issue_field, 'that')
                      if first_issue_field == "product_service": return f"Hmm, okay. The product '{invalid_val}' wasn't quite right ({reason}). Could you describe it differently?"
                      elif first_issue_field == "target_market": return f"Okay, the market '{invalid_val}' needs clarification ({reason}). Can you specify it?"
                      else: return f"Got it. Experience level '{invalid_val}' issue ({reason}). Can you clarify (e.g., beginner, X years)?"

        else: # Could not extract anything useful for the field being collected
             logger.warning(f"Could not extract value for field '{field_being_collected}' from input: '{user_input}'. Re-asking.")
             # Just re-ask the same question for the current field
             product = conversation.product_service or "your product"
             market = conversation.target_market or "their market"
             if field_being_collected == "product_service":
                 return "Sorry, I still need the Product/Service for this session."
             elif field_being_collected == "target_market":
                 return f"Apologies, I need the specific Target Market for {product}."
             else: # Experience
                  return f"My mistake, what's the Experience Level for Product: {product}, Market: {market}? (e.g. beginner, 5 years)"


    # Fallback - should not be reached if logic is sound
    logger.error(f"Reached end of handle_session_setup unexpectedly. State: {current_step}. Resetting.")
    conversation.session_setup_step = "confirm_context"
    db.session.commit()
    return "Sorry, something went wrong with the setup. Let's try again. What product are you selling?"


# --- Buyer Persona Generation ---
def generate_buyer_persona(conversation: Conversation):
    """Generate and save a buyer persona for the conversation."""
    # This function seems overly simplistic and uses hardcoded defaults.
    # It should ideally use the AI service based on conversation context.
    # Keeping original logic for now, but marked for improvement.
    # TODO: Enhance this to use AI based on conversation context.
    try:
        if conversation.buyer_persona: # Check relationship
            logger.info(f"Buyer persona already exists for conversation {conversation.id}")
            return

        # Basic default persona - Consider using generate_fallback_persona or an LLM call
        persona = BuyerPersona(
            # --- Using more dynamic defaults based on context ---
            name="Alex Buyer", # Placeholder
            description=f"A potential buyer for {conversation.product_service or 'the product'} targeting the {conversation.target_market or 'general'} market.",
            personality_traits=json.dumps({"curious": 0.8, "cautious": 0.6} if conversation.target_market != 'B2B' else {"analytical": 0.8, "busy": 0.7}),
            emotional_state="neutral",
            buyer_type="evaluator",
            decision_authority="influencer", # Default, could vary
            pain_points=json.dumps(["finding_value", "ease_of_use"] if conversation.target_market != 'B2B' else ["efficiency", "roi", "integration"]),
            objections=json.dumps(["price", "timing"] if conversation.target_market != 'B2B' else ["price", "integration", "comparison"]),
            cognitive_biases=json.dumps({"anchoring": 0.5, "social_proof": 0.6}),
            conversation_id=conversation.id # Explicitly link
        )

        # --- End dynamic defaults ---

        db.session.add(persona)
        # Don't commit here - let the caller commit.
        # db.session.commit() # REMOVED
        logger.info(f"Generated default buyer persona object for conversation {conversation.id}")
    except Exception as e:
        db.session.rollback() # Rollback if add fails
        logger.error(f"Error generating buyer persona for conv {conversation.id}: {e}", exc_info=True)

        logger.info(f"Generated default buyer persona object for conversation {conversation.id}")
    except Exception as e:
        db.session.rollback() # Rollback if add fails
        logger.error(f"Error generating buyer persona for conv {conversation.id}: {e}", exc_info=True)

def get_cached_buyer_persona(training_session):
    """Retrieve the buyer persona associated with the training session."""
    # Eager load the relationship to avoid separate queries
    # session = db.session.query(TrainingSession).options(joinedload(TrainingSession.buyer_persona)).get(session_id)
    # return session.buyer_persona if session else None
    # Updated approach: Directly access from the passed object
    if training_session and training_session.buyer_persona:
        return training_session.buyer_persona
    elif training_session and training_session.buyer_persona_id:
        # Fallback if relationship wasn't loaded, though joinedload should handle this
        return db.session.get(BuyerPersona, training_session.buyer_persona_id)
    return None

def generate_initial_ai_message(training_session):
    """Generates the first message from the AI buyer persona."""
    try:
        gpt4o_service = get_gpt4o_service()
        buyer_persona = get_cached_buyer_persona(training_session)
        user_profile = training_session.user_profile # Assuming relationship is loaded

        if not buyer_persona or not user_profile:
            logger.error("Missing buyer persona or user profile for initial message generation.")
            return None

        # Use Claude to generate the initial greeting/opening statement
        initial_message_content = gpt4o_service.generate_initial_greeting(
            buyer_persona=buyer_persona,
            user_profile=user_profile
        )
        
        if not initial_message_content:
             logger.error("Claude service failed to generate initial greeting.")
             return None

        # Create and save the initial message
        initial_message = Message(
            training_session_id=training_session.id,
            role='assistant', 
            content=initial_message_content,
            timestamp=datetime.utcnow() 
        )
        db.session.add(initial_message)
        db.session.commit()
        
        logger.info(f"Generated initial AI message for session {training_session.id}")
        return initial_message

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error generating initial AI message: {e}", exc_info=True)
        return None

def message_to_dict(message):
    """Convert a Message object to a dictionary."""
    if not message:
        return None
    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "timestamp": message.timestamp.isoformat()
    }

def buyer_persona_to_dict(persona):
    """Converts a BuyerPersona object to a dictionary."""
    if not persona:
        return None
    return {
        "id": persona.id,
        "name": persona.name,
        "description": persona.description,
        "personality_traits": persona.personality_traits_dict, # Use property
        "emotional_state": persona.emotional_state,
        "buyer_type": persona.buyer_type,
        "decision_authority": persona.decision_authority,
        "industry_context": persona.industry_context,
        "pain_points": persona.pain_points_list, # Use property
        "objections": persona.objections_list, # Use property
        "cognitive_biases": persona.cognitive_biases_dict # Use property
    }

def handle_setup_message(conversation: Conversation, user_message: Message) -> str:
    """Handles messages during the initial conversational setup flow."""
    logger.info(f"Handling setup message for conv {conversation.id}, step: {conversation.session_setup_step}")
    profile = conversation.user.profile # Get profile via relationship
    user_input = user_message.content.strip()
    next_step = conversation.session_setup_step
    ai_response = "Sorry, I didn't quite understand that. Could you please rephrase?"

    try:
        # Process based on the current step
        if conversation.session_setup_step == 'ask_experience':
            # Try to parse experience level (simple number for now)
            try:
                # Basic parsing, could be enhanced with NLP later
                skill_rating = int(user_input.split()[0]) # Simplistic: takes first number
                profile.experience_level = f"Rated {skill_rating}/10" # Store descriptively
                logger.info(f"User {profile.user_id} rated experience: {skill_rating}/10")
                next_step = 'ask_product'
                ai_response = f"Got it, {skill_rating}/10. Now, tell me a bit about the main product or service you sell."
            except (ValueError, IndexError):
                ai_response = "Thanks! Could you give that as a number between 1 and 10?"
                next_step = 'ask_experience' # Ask again

        elif conversation.session_setup_step == 'ask_product':
            profile.product_service = user_input
            logger.info(f"User {profile.user_id} product/service: {user_input[:50]}...")
            next_step = 'ask_target_market'
            ai_response = "Okay, interesting! And who is your primary target customer? (e.g., B2B, B2C, specific industry?)"

        elif conversation.session_setup_step == 'ask_target_market':
            profile.target_market = user_input
            logger.info(f"User {profile.user_id} target market: {user_input}")
            next_step = 'ask_improvement_goal'
            ai_response = "Great. Finally, is there one specific skill you'd really like to focus on improving today? (e.g., handling objections, building rapport, closing the deal)"

        elif conversation.session_setup_step == 'ask_improvement_goal':
            # Store as the first goal in the list
            profile.improvement_goals_list = [user_input] 
            logger.info(f"User {profile.user_id} improvement goal: {user_input}")
            next_step = 'setup_complete'
            ai_response = "Perfect! That's all I need for now. I'll use this to set up your first assessment roleplay. Get ready!"
            
            # Mark setup as complete
            profile.initial_setup_complete = True
            logger.info(f"User {profile.user_id} initial setup marked complete.")
            # Optionally archive the setup conversation
            # conversation.is_archived = True 

        else:
            logger.warning(f"Unknown setup step '{conversation.session_setup_step}' for conv {conversation.id}")
            ai_response = "Something seems off with the setup flow. Let's try starting the roleplay." 
            next_step = 'setup_complete' # Try to recover
            profile.initial_setup_complete = True # Mark complete anyway?

        # Update conversation step and commit profile changes
        conversation.session_setup_step = next_step
        db.session.add(profile) 
        db.session.add(conversation)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing setup message for conv {conversation.id}: {e}", exc_info=True)
        ai_response = "Oops, something went wrong while saving that. Could you try saying that again?"
        # Don't change next_step on error, stay on current step

    return ai_response 