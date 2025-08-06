"""
Dual Voice Agent Service

Orchestrates two Deepgram Voice Agents:
1. Buyer Persona Agent - Acts as sophisticated buyer with objections and personality
2. Sales Coach Agent - Provides real-time coaching and feedback

This service manages the interaction between both agents and the user.
"""

import logging
import json
import time
import asyncio
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from flask import current_app
from app.models import BuyerPersona, TrainingSession, Message, db
from app.services.gpt4o_service import get_gpt4o_service
from app.training.services import generate_buyer_persona

logger = logging.getLogger(__name__)

class DualVoiceAgentService:
    """Service for managing dual voice agents in sales training scenarios"""
    
    def __init__(self):
        self.active_sessions = {}  # session_id -> session_data
        self.gpt4o_service = get_gpt4o_service()
        
    def create_training_session(
        self, 
        user_id: int, 
        scenario_type: str = "cold_call",
        user_profile=None,
        product_description: str = None
    ) -> Dict[str, Any]:
        """
        Create a new dual voice agent training session
        
        Args:
            user_id: ID of the user starting the session
            scenario_type: Type of sales scenario (cold_call, demo, objection_handling, etc.)
            user_profile: User's profile for persona generation context
            product_description: What the user sells (from voice input)
            
        Returns:
            Session configuration for frontend
        """
        try:
            session_id = f"dual-voice-{user_id}-{int(time.time())}"
            
            # Create a temporary user profile with the product description if provided
            if product_description and not user_profile:
                # Enhanced parsing of voice input to extract business context
                parsed_info = self._parse_voice_business_info(product_description)
                
                # Generate personality traits for this persona
                from app.services.personality_traits import generate_personality_traits
                personality_data = generate_personality_traits()
                
                # Create a mock user profile with the spoken product
                class VoiceUserProfile:
                    def __init__(self, product_desc, parsed_info, personality_traits):
                        self.product_service = parsed_info.get('product', product_desc)
                        self.industry = parsed_info.get('industry', "Various industries")
                        self.target_market = parsed_info.get('target_market', "Various businesses")
                        self.experience_level = "Intermediate"
                        self.id = None
                        # Add personality traits
                        self.core_personality_trait = personality_traits['core_personality_trait']
                        self.supporting_personality_trait = personality_traits['supporting_personality_trait']
                        self.personality_blend_description = personality_traits['personality_blend_description']
                
                user_profile = VoiceUserProfile(product_description, parsed_info, personality_data)
            elif product_description and user_profile:
                # Update existing profile with spoken product
                user_profile.product_service = product_description
            
            # Generate sophisticated buyer persona
            logger.info(f"Generating buyer persona for session {session_id} with product: {product_description or 'default'}")
            buyer_persona = generate_buyer_persona(user_profile)
            
            if not buyer_persona:
                raise Exception("Failed to generate buyer persona")
            
            # Create training session record
            training_session = TrainingSession(
                user_profile_id=user_profile.id if user_profile else None,
                buyer_persona_id=buyer_persona.id,
                status='active',
                start_time=datetime.utcnow()
            )
            
            db.session.add(training_session)
            db.session.flush()  # Get ID without committing
            
            # Configure buyer persona agent
            persona_config = self._create_persona_agent_config(buyer_persona, scenario_type)
            
            # Configure sales coach agent  
            coach_config = self._create_coach_agent_config(user_profile, scenario_type)
            
            # Store session data
            session_data = {
                'session_id': session_id,
                'training_session_id': training_session.id,
                'user_id': user_id,
                'scenario_type': scenario_type,
                'buyer_persona': buyer_persona,
                'persona_config': persona_config,
                'coach_config': coach_config,
                'conversation_log': [],
                'coaching_interventions': [],
                'recording_snippets': [],  # New: Store coach-saved snippets
                'session_state': 'active',  # active, paused, coaching_only, timeout
                'pause_reason': None,
                'timeout_context': None,
                'start_time': datetime.utcnow(),
                'status': 'initialized'
            }
            
            self.active_sessions[session_id] = session_data
            
            db.session.commit()
            
            logger.info(f"Created dual voice session {session_id} with persona: {buyer_persona.name}")
            
            return {
                'success': True,
                'session_id': session_id,
                'training_session_id': training_session.id,
                'buyer_persona': {
                    'name': buyer_persona.name,
                    'description': buyer_persona.description,
                    'role': buyer_persona.role,
                    'industry_context': buyer_persona.industry_context,
                    'primary_concern': buyer_persona.primary_concern
                },
                'persona_agent_config': persona_config,
                'coach_agent_config': coach_config,
                'scenario_type': scenario_type
            }
            
        except Exception as e:
            logger.error(f"Error creating dual voice session: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def pause_session(self, session_id: str, reason: str = "learning_moment") -> Dict[str, Any]:
        """Pause the session for a learning moment"""
        try:
            if session_id not in self.active_sessions:
                return {'success': False, 'error': 'Session not found'}
            
            session_data = self.active_sessions[session_id]
            session_data['session_state'] = 'paused'
            session_data['pause_reason'] = reason
            session_data['pause_time'] = datetime.utcnow()
            
            logger.info(f"Paused session {session_id} for {reason}")
            
            return {
                'success': True,
                'session_state': 'paused',
                'pause_reason': reason,
                'message': 'Session paused for learning moment'
            }
            
        except Exception as e:
            logger.error(f"Error pausing session {session_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def resume_session(self, session_id: str) -> Dict[str, Any]:
        """Resume a paused session"""
        try:
            if session_id not in self.active_sessions:
                return {'success': False, 'error': 'Session not found'}
            
            session_data = self.active_sessions[session_id]
            session_data['session_state'] = 'active'
            session_data['pause_reason'] = None
            
            logger.info(f"Resumed session {session_id}")
            
            return {
                'success': True,
                'session_state': 'active',
                'message': 'Session resumed'
            }
            
        except Exception as e:
            logger.error(f"Error resuming session {session_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def activate_coaching_only_mode(self, session_id: str) -> Dict[str, Any]:
        """Activate coaching-only mode (disable buyer persona)"""
        try:
            if session_id not in self.active_sessions:
                return {'success': False, 'error': 'Session not found'}
            
            session_data = self.active_sessions[session_id]
            session_data['session_state'] = 'coaching_only'
            session_data['coaching_only_start'] = datetime.utcnow()
            
            logger.info(f"Activated coaching-only mode for session {session_id}")
            
            return {
                'success': True,
                'session_state': 'coaching_only',
                'message': 'Coaching-only mode activated. Buyer persona disabled.'
            }
            
        except Exception as e:
            logger.error(f"Error activating coaching-only mode for {session_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def request_timeout(self, session_id: str, context: str) -> Dict[str, Any]:
        """Coach requests a timeout for deeper discussion"""
        try:
            if session_id not in self.active_sessions:
                return {'success': False, 'error': 'Session not found'}
            
            session_data = self.active_sessions[session_id]
            session_data['session_state'] = 'timeout'
            session_data['timeout_context'] = context
            session_data['timeout_start'] = datetime.utcnow()
            
            # Log the timeout intervention
            intervention = {
                'timestamp': datetime.utcnow().isoformat(),
                'type': 'timeout_request',
                'context': context,
                'conversation_snapshot': session_data['conversation_log'][-5:]  # Last 5 turns
            }
            session_data['coaching_interventions'].append(intervention)
            
            logger.info(f"Timeout requested for session {session_id}: {context}")
            
            return {
                'success': True,
                'session_state': 'timeout',
                'context': context,
                'message': f'Timeout requested: {context}'
            }
            
        except Exception as e:
            logger.error(f"Error requesting timeout for {session_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def save_recording_snippet(self, session_id: str, snippet_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a recording snippet for later coaching review"""
        try:
            if session_id not in self.active_sessions:
                return {'success': False, 'error': 'Session not found'}
            
            session_data = self.active_sessions[session_id]
            
            # Create snippet record
            snippet = {
                'timestamp': datetime.utcnow().isoformat(),
                'start_time': snippet_data.get('start_time'),
                'end_time': snippet_data.get('end_time'),
                'duration': snippet_data.get('duration'),
                'context': snippet_data.get('context', 'Key moment for review'),
                'coaching_notes': snippet_data.get('coaching_notes', ''),
                'conversation_excerpt': snippet_data.get('conversation_excerpt', []),
                'snippet_id': f"snippet-{len(session_data['recording_snippets']) + 1}"
            }
            
            session_data['recording_snippets'].append(snippet)
            
            logger.info(f"Saved recording snippet for session {session_id}: {snippet['context']}")
            
            return {
                'success': True,
                'snippet_id': snippet['snippet_id'],
                'message': f'Recording snippet saved: {snippet["context"]}'
            }
            
        except Exception as e:
            logger.error(f"Error saving recording snippet for {session_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get current session status and state"""
        try:
            if session_id not in self.active_sessions:
                return {'success': False, 'error': 'Session not found'}
            
            session_data = self.active_sessions[session_id]
            
            return {
                'success': True,
                'session_id': session_id,
                'session_state': session_data.get('session_state', 'active'),
                'pause_reason': session_data.get('pause_reason'),
                'timeout_context': session_data.get('timeout_context'),
                'conversation_turns': len(session_data.get('conversation_log', [])),
                'coaching_interventions': len(session_data.get('coaching_interventions', [])),
                'recording_snippets': len(session_data.get('recording_snippets', [])),
                'buyer_persona_name': session_data['buyer_persona'].name if session_data.get('buyer_persona') else None
            }
            
        except Exception as e:
            logger.error(f"Error getting session status for {session_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _create_persona_agent_config(self, buyer_persona: BuyerPersona, scenario_type: str) -> Dict[str, Any]:
        """Create Deepgram agent configuration for buyer persona"""
        
        # Parse persona traits
        personality_traits = json.loads(buyer_persona.personality_traits) if buyer_persona.personality_traits else {}
        pain_points = json.loads(buyer_persona.pain_points) if buyer_persona.pain_points else []
        objections = json.loads(buyer_persona.objections) if buyer_persona.objections else []
        
        # Create persona system prompt
        persona_prompt = f"""You are {buyer_persona.name}, a {buyer_persona.role} in the {buyer_persona.industry_context} industry.

CRITICAL INSTRUCTION: You are a REAL HUMAN, not a robotic gatekeeper. You have genuine emotions, concerns, and can be influenced by skilled salespeople who demonstrate understanding and empathy.

PERSONALITY & BACKGROUND:
- Description: {buyer_persona.description}
- Primary Concern: {buyer_persona.primary_concern}
- Emotional State: {buyer_persona.emotional_state}
- Decision Authority: {buyer_persona.decision_authority}
- Intelligence Level: {buyer_persona.intelligence_level or 'average'}

PERSONALITY TRAITS:
{self._format_traits_for_prompt(personality_traits)}

PAIN POINTS YOU'RE EXPERIENCING:
{self._format_list_for_prompt(pain_points)}

COMMON OBJECTIONS YOU RAISE:
{self._format_list_for_prompt(objections)}

SCENARIO CONTEXT: {self._get_scenario_context(scenario_type)}

HUMAN EMOTIONAL BEHAVIOR:
1. **BE EMOTIONALLY RESPONSIVE**: When someone shows genuine understanding of your problems, you get excited and engaged
2. **SHOW VULNERABILITY**: You have real struggles and appreciate when someone "gets it"
3. **REACT TO EMPATHY**: When salespeople demonstrate genuine empathy, you become more open and trusting
4. **GET EXCITED ABOUT SOLUTIONS**: When you see how something could solve your real problems, show genuine enthusiasm
5. **HAVE MOMENTS OF DOUBT**: Question your current approach when presented with compelling alternatives
6. **BE INFLUENCED BY CONFIDENCE**: Respond positively to expertise and confidence
7. **CHANGE YOUR MIND**: Your objections can be overcome with the right approach
8. **SHOW EMOTIONAL RANGE**: Express frustration, hope, curiosity, excitement as appropriate

FORBIDDEN BEHAVIORS:
- DON'T be a robotic wall that always says "I appreciate that, but..."
- DON'T maintain the same thoughtful tone throughout
- DON'T resist every attempt at emotional connection
- DON'T ignore genuine empathy and understanding
- DON'T be impossible to convince or influence

BEHAVIORAL GUIDELINES:
1. Stay in character as {buyer_persona.name} throughout the conversation
2. Express your pain points with genuine emotion when relevant
3. Raise objections based on real concerns, not thoughtful walls
4. Let your emotional state drive your responses: {buyer_persona.emotional_state}
5. Make decisions that feel human and emotionally driven
6. Use natural language that shows personality
7. When someone demonstrates real understanding, show genuine appreciation and interest
8. Ask questions that reveal your real concerns and desires
9. Allow yourself to be influenced by good sales techniques
10. Show excitement when solutions align with your actual needs

CALL PROGRESSION AWARENESS:
- If the conversation seems to be wrapping up (closing attempts, next steps discussion), signal readiness to conclude
- When you sense the salesperson is trying to close, respond authentically based on how well they've addressed your concerns
- If the call is clearly ending, you may indicate you need to wrap up or move to next steps

Remember: You're helping train a salesperson, so be realistic and challenging while staying true to your character."""

        return {
            "audio": {
                "input": {
                    "encoding": "linear16",
                    "sample_rate": 48000,
                },
                "output": {
                    "encoding": "linear16", 
                    "sample_rate": 48000,
                },
            },
            "agent": {
                "language": "en",
                "listen": {
                    "provider": {
                        "type": "deepgram",
                        "model": "nova-2",
                    },
                },
                "think": {
                    "provider": {
                        "type": "open_ai",
                        "model": "gpt-4o-mini",
                    },
                    "instructions": persona_prompt
                },
                "speak": {
                    "provider": {
                        "type": "deepgram",
                        "model": self._select_voice_for_persona(buyer_persona),
                    },
                },
            },
        }
    
    def _create_coach_agent_config(self, user_profile, scenario_type: str) -> Dict[str, Any]:
        """Create Deepgram agent configuration for sales coach"""
        
        # Create coaching system prompt based on user profile and scenario
        coach_prompt = f"""You are an expert sales coach providing real-time guidance during a live sales conversation.

COACHING CONTEXT:
- Scenario Type: {scenario_type}
- User Experience Level: {getattr(user_profile, 'experience_level', 'intermediate') if user_profile else 'intermediate'}
- Product/Service: {getattr(user_profile, 'product_service', 'business solution') if user_profile else 'business solution'}
- Target Market: {getattr(user_profile, 'target_market', 'B2B') if user_profile else 'B2B'}

YOUR ROLE:
You provide strategic coaching during natural conversation pauses. You can:
1. Suggest better questions to ask
2. Recommend how to handle objections
3. Point out missed opportunities
4. Provide encouragement and confidence boosts
5. Suggest next steps or closing techniques
6. **REQUEST TIMEOUTS** for deeper learning moments
7. **SAVE RECORDING SNIPPETS** of key moments for review

COACHING STYLE:
- Be concise and actionable (30 seconds or less per intervention)
- Speak like a supportive but direct coach
- Use "you should..." or "try asking..." language
- Be specific, not generic
- Focus on immediate next moves
- Balance encouragement with constructive guidance

INTERVENTION TIMING:
- Only speak during natural pauses in conversation
- Don't interrupt active dialogue
- Provide guidance when the salesperson seems stuck
- Offer encouragement after good moves
- Suggest recovery strategies after mistakes

SPECIAL COACHING TOOLS:
- **TIMEOUT REQUEST**: If you identify a critical learning moment, you can request a timeout by saying "TIMEOUT REQUEST: [reason]"
- **SAVE SNIPPET**: To save a key moment for later review, say "SAVE SNIPPET: [context/reason]"
- **CALL WRAP DETECTION**: When you sense the call is ending (closing attempts, next steps), prepare to transition to coaching-only mode

COACHING PRIORITIES for {scenario_type}:
{self._get_coaching_priorities(scenario_type)}

COACHING-ONLY MODE:
When the buyer conversation is wrapping up, you'll automatically enter coaching-only mode where you can:
- Provide detailed feedback on the entire conversation
- Discuss what went well and what could be improved
- Role-play alternative approaches
- Answer questions about sales techniques
- Review any saved recording snippets

Remember: You're coaching in real-time, so be brief, specific, and immediately actionable. Your goal is to help the salesperson succeed in this conversation."""

        return {
            "audio": {
                "input": {
                    "encoding": "linear16",
                    "sample_rate": 48000,
                },
                "output": {
                    "encoding": "linear16",
                    "sample_rate": 24000,  # Higher quality for crystal clear coaching
                },
            },
            "agent": {
                "language": "en",
                "listen": {
                    "provider": {
                        "type": "deepgram", 
                        "model": "nova-2",
                    },
                },
                "think": {
                    "provider": {
                        "type": "open_ai",
                        "model": "gpt-4o-mini",
                    },
                    "prompt": coach_prompt  # Use 'prompt' not 'instructions'
                },
                "speak": {
                    "provider": {
                        "type": "deepgram",
                        "model": "aura-2-helios-en",  # Upgrade to highest quality voice
                    },
                },
            },
            "experimental": False
        }
    
    def _format_traits_for_prompt(self, traits: Dict[str, Any]) -> str:
        """Format personality traits for prompt"""
        if not traits:
            return "- Standard professional traits"
        
        formatted = []
        for trait, value in traits.items():
            if isinstance(value, (int, float)):
                level = "high" if value > 0.7 else "moderate" if value > 0.4 else "low"
                formatted.append(f"- {trait.title()}: {level} ({value})")
            else:
                formatted.append(f"- {trait.title()}: {value}")
        
        return "\n".join(formatted)
    
    def _format_list_for_prompt(self, items: List[str]) -> str:
        """Format list items for prompt"""
        if not items:
            return "- Standard concerns for this role"
        
        return "\n".join([f"- {item}" for item in items])
    
    def _get_scenario_context(self, scenario_type: str) -> str:
        """Get context description for scenario type"""
        contexts = {
            "cold_call": "This is a cold outreach call. You weren't expecting this call and are initially skeptical but open to hearing about solutions to your problems.",
            "demo": "You've agreed to see a product demonstration. You're interested but want to understand if this solution truly fits your needs.",
            "objection_handling": "You're in a sales conversation but have significant concerns and objections that need to be addressed.",
            "closing": "You're near the end of the sales process and need to make a decision. You have remaining questions and concerns.",
            "discovery": "You're in the early stages of exploring solutions. You want to share your challenges but need to feel comfortable first.",
            "follow_up": "This is a follow-up conversation after initial contact. You remember the previous discussion but need more information."
        }
        return contexts.get(scenario_type, "This is a general sales conversation where you're evaluating potential solutions.")
    
    def _get_coaching_priorities(self, scenario_type: str) -> str:
        """Get coaching priorities for scenario type"""
        priorities = {
            "cold_call": "1. Building rapport quickly\n2. Earning permission to continue\n3. Identifying pain points\n4. Setting next steps",
            "demo": "1. Asking discovery questions first\n2. Tailoring demo to their needs\n3. Handling technical questions\n4. Confirming value perception",
            "objection_handling": "1. Understanding root concerns\n2. Using feel-felt-found method\n3. Providing proof points\n4. Confirming objection resolution",
            "closing": "1. Summarizing value delivered\n2. Creating urgency appropriately\n3. Asking for commitment\n4. Handling final concerns",
            "discovery": "1. Asking open-ended questions\n2. Active listening and confirmation\n3. Uncovering emotional drivers\n4. Building trust and rapport",
            "follow_up": "1. Referencing previous conversation\n2. Advancing the sales process\n3. Addressing new concerns\n4. Confirming continued interest"
        }
        return priorities.get(scenario_type, "1. Building rapport\n2. Understanding needs\n3. Demonstrating value\n4. Moving process forward")
    
    def _parse_voice_business_info(self, product_description: str) -> Dict[str, Any]:
        """
        Parse voice input to extract product, target market, and industry information
        
        Args:
            product_description: Combined product and target description from voice
            
        Returns:
            Dictionary with parsed business information
        """
        try:
            # Initialize with defaults
            parsed_info = {
                'product': product_description,
                'target_market': 'Various businesses',
                'industry': 'Various industries'
            }
            
            # Convert to lowercase for analysis
            desc_lower = product_description.lower()
            
            # Extract target market information
            target_indicators = [
                'for large corporations', 'for financial institutions', 'for banks', 'for healthcare',
                'for small businesses', 'for enterprise', 'for startups', 'for teams',
                'for sales teams', 'for marketing teams', 'for it departments',
                'targeting large corporations', 'targeting financial institutions', 'targeting enterprise',
                'large corporations', 'financial institutions', 'corporations', 'institutions', 
                'companies', 'businesses', 'organizations', 'enterprise companies'
            ]
            
            for indicator in target_indicators:
                if indicator in desc_lower:
                    if 'large' in indicator or 'enterprise' in indicator or 'corporation' in indicator:
                        parsed_info['target_market'] = 'Large enterprises and corporations'
                        parsed_info['industry'] = 'Enterprise business services'
                    elif 'financial' in indicator or 'bank' in indicator:
                        parsed_info['target_market'] = 'Financial institutions'
                        parsed_info['industry'] = 'Financial services'
                    elif 'healthcare' in indicator or 'medical' in indicator:
                        parsed_info['target_market'] = 'Healthcare organizations'
                        parsed_info['industry'] = 'Healthcare'
                    elif 'small' in indicator:
                        parsed_info['target_market'] = 'Small to medium businesses'
                        parsed_info['industry'] = 'Business services'
                    elif 'sales teams' in indicator:
                        parsed_info['target_market'] = 'Sales professionals and teams'
                        parsed_info['industry'] = 'Sales training and development'
                    break
            
            # Extract product/service type
            if 'sales training' in desc_lower or 'training' in desc_lower:
                parsed_info['product'] = 'Sales training and development services'
                parsed_info['industry'] = 'Professional training and development'
            elif 'ai' in desc_lower and 'training' in desc_lower:
                parsed_info['product'] = 'AI-powered training solutions'
                parsed_info['industry'] = 'Educational technology'
            elif 'role play' in desc_lower or 'roleplay' in desc_lower:
                parsed_info['product'] = 'Interactive roleplay training platform'
                parsed_info['industry'] = 'Training and simulation technology'
            elif 'coaching' in desc_lower:
                parsed_info['product'] = 'Professional coaching services'
                parsed_info['industry'] = 'Professional development'
            elif 'software' in desc_lower or 'platform' in desc_lower:
                parsed_info['product'] = 'Software platform solutions'
                parsed_info['industry'] = 'Software and technology'
            
            # Log the parsing results
            logger.info(f"Parsed voice business info: {parsed_info}")
            
            return parsed_info
            
        except Exception as e:
            logger.error(f"Error parsing voice business info: {str(e)}")
            return {
                'product': product_description,
                'target_market': 'Various businesses',
                'industry': 'Various industries'
            }
    
    def _select_voice_for_persona(self, buyer_persona: BuyerPersona) -> str:
        """Select appropriate voice for buyer persona based on AI-determined business context and characteristics"""
        
        # Use AI-determined business context if available
        business_context = getattr(buyer_persona, 'business_context', None)
        
        # If business_context is not available, fall back to intelligent analysis
        if not business_context:
            # Analyze role and industry context for B2B vs B2C indicators
            role = (buyer_persona.role or "").lower()
            industry = (buyer_persona.industry_context or "").lower()
            description = (buyer_persona.description or "").lower()
            
            # B2B indicators: corporate roles, business contexts, professional terminology
            b2b_indicators = [
                'manager', 'director', 'executive', 'ceo', 'cto', 'cfo', 'vp', 'head of',
                'enterprise', 'corporate', 'business', 'company', 'organization', 'procurement',
                'saas', 'software', 'technology', 'professional services', 'consulting',
                'manufacturing', 'logistics', 'finance', 'healthcare', 'education'
            ]
            
            # B2C indicators: consumer roles, personal contexts, individual terminology
            b2c_indicators = [
                'consumer', 'customer', 'homeowner', 'parent', 'individual', 'personal',
                'retail', 'shopping', 'household', 'family', 'lifestyle', 'entertainment',
                'fitness', 'beauty', 'food', 'travel', 'automotive', 'real estate'
            ]
            
            combined_text = f"{role} {industry} {description}"
            
            b2b_score = sum(1 for indicator in b2b_indicators if indicator in combined_text)
            b2c_score = sum(1 for indicator in b2c_indicators if indicator in combined_text)
            
            business_context = "B2B" if b2b_score >= b2c_score else "B2C"
        
        # Get persona characteristics for voice selection
        personality_traits = buyer_persona.personality_traits_dict
        role = buyer_persona.role or ""
        emotional_state = buyer_persona.emotional_state or "neutral"
        
        # Voice selection based on business context and characteristics
        if business_context == "B2C":
            # B2C voices - more casual, friendly, approachable
            if "young" in role.lower() or "millennial" in role.lower():
                return "aura-2-luna-en"  # Youthful, energetic
            elif emotional_state.lower() in ["friendly", "enthusiastic", "optimistic"]:
                return "aura-2-stella-en"  # Warm, friendly
            elif personality_traits.get("confidence", 0) > 0.7:
                return "aura-2-zeus-en"  # Confident, assertive
            else:
                return "aura-2-luna-en"  # Default friendly B2C voice
        else:
            # B2B voices - more professional, authoritative, business-focused
            if "executive" in role.lower() or "ceo" in role.lower() or "director" in role.lower():
                return "aura-2-zeus-en"  # Authoritative, executive presence
            elif "technical" in role.lower() or "engineer" in role.lower() or "analyst" in role.lower():
                return "aura-2-arcas-en"  # Thoughtful, technical
            elif personality_traits.get("thoughtful", 0) > 0.7:
                return "aura-2-arcas-en"  # Thoughtful voice
            elif emotional_state.lower() in ["skeptical", "cautious", "guarded"]:
                return "aura-2-orion-en"  # Reserved, thoughtful
            else:
                return "aura-2-asteria-en"  # Professional, balanced B2B voice
    
    def log_conversation_turn(
        self, 
        session_id: str, 
        speaker: str, 
        content: str, 
        agent_type: str = None
    ):
        """Log a conversation turn for analysis"""
        if session_id in self.active_sessions:
            turn_data = {
                'timestamp': datetime.utcnow().isoformat(),
                'speaker': speaker,  # 'user', 'persona', 'coach'
                'content': content,
                'agent_type': agent_type  # 'buyer_persona' or 'sales_coach'
            }
            
            self.active_sessions[session_id]['conversation_log'].append(turn_data)
            
            # Check for coach tool calls in the content
            self._process_coach_tools(session_id, content, speaker)
            
            # Also save to database
            try:
                training_session_id = self.active_sessions[session_id]['training_session_id']
                message = Message(
                    training_session_id=training_session_id,
                    role=speaker,
                    content=content,
                    timestamp=datetime.utcnow()
                )
                db.session.add(message)
                db.session.commit()
            except Exception as e:
                logger.error(f"Error saving message to database: {str(e)}")
    
    def _process_coach_tools(self, session_id: str, content: str, speaker: str):
        """Process coach tool calls embedded in conversation"""
        if speaker != 'coach':
            return
            
        # Check for timeout request
        if "TIMEOUT REQUEST:" in content.upper():
            context = content.split("TIMEOUT REQUEST:")[-1].strip()
            self.request_timeout(session_id, context)
            
        # Check for snippet save request
        if "SAVE SNIPPET:" in content.upper():
            context = content.split("SAVE SNIPPET:")[-1].strip()
            # Get recent conversation for snippet
            session_data = self.active_sessions[session_id]
            recent_conversation = session_data['conversation_log'][-3:]  # Last 3 turns
            
            snippet_data = {
                'context': context,
                'coaching_notes': f'Coach flagged this moment: {context}',
                'conversation_excerpt': recent_conversation,
                'start_time': recent_conversation[0]['timestamp'] if recent_conversation else None,
                'end_time': recent_conversation[-1]['timestamp'] if recent_conversation else None
            }
            self.save_recording_snippet(session_id, snippet_data)
    
    def end_session(self, session_id: str) -> Dict[str, Any]:
        """End a dual voice agent session and generate feedback"""
        try:
            if session_id not in self.active_sessions:
                return {'success': False, 'error': 'Session not found'}
            
            session_data = self.active_sessions[session_id]
            
            # Update training session status
            training_session = TrainingSession.query.get(session_data['training_session_id'])
            if training_session:
                training_session.status = 'completed'
                training_session.end_time = datetime.utcnow()
                db.session.commit()
            
            # Generate comprehensive feedback (this could be async)
            feedback_summary = self._generate_session_feedback(session_data)
            
            # Clean up active session
            del self.active_sessions[session_id]
            
            logger.info(f"Ended dual voice session {session_id}")
            
            return {
                'success': True,
                'session_id': session_id,
                'feedback_summary': feedback_summary,
                'conversation_log': session_data['conversation_log'],
                'recording_snippets': session_data.get('recording_snippets', []),
                'coaching_interventions': session_data.get('coaching_interventions', [])
            }
            
        except Exception as e:
            logger.error(f"Error ending session {session_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _generate_session_feedback(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive feedback for the session"""
        
        conversation_log = session_data.get('conversation_log', [])
        buyer_persona = session_data.get('buyer_persona')
        scenario_type = session_data.get('scenario_type')
        recording_snippets = session_data.get('recording_snippets', [])
        coaching_interventions = session_data.get('coaching_interventions', [])
        
        if not conversation_log:
            return {'error': 'No conversation data to analyze'}
        
        try:
            # Create feedback prompt
            feedback_prompt = f"""Analyze this dual voice agent sales training session and provide comprehensive feedback.

SESSION DETAILS:
- Scenario: {scenario_type}
- Buyer Persona: {buyer_persona.name if buyer_persona else 'Unknown'} ({buyer_persona.role if buyer_persona else 'Unknown Role'})
- Duration: {len(conversation_log)} conversation turns
- Recording Snippets Saved: {len(recording_snippets)}
- Coaching Interventions: {len(coaching_interventions)}

CONVERSATION LOG:
{self._format_conversation_for_analysis(conversation_log)}

BUYER PERSONA CONTEXT:
- Primary Concern: {buyer_persona.primary_concern if buyer_persona else 'Unknown'}
- Emotional State: {buyer_persona.emotional_state if buyer_persona else 'Unknown'}
- Decision Authority: {buyer_persona.decision_authority if buyer_persona else 'Unknown'}

COACHING INTERVENTIONS:
{self._format_coaching_interventions(coaching_interventions)}

SAVED RECORDING SNIPPETS:
{self._format_recording_snippets(recording_snippets)}

Please provide feedback in the following JSON format:
{{
    "overall_performance": {{
        "score": 85,
        "summary": "Brief overall assessment"
    }},
    "key_strengths": [
        "Specific strengths demonstrated",
        "What the salesperson did well"
    ],
    "improvement_areas": [
        "Specific areas for improvement",
        "Missed opportunities"
    ],
    "persona_interaction_analysis": {{
        "rapport_building": "How well they built rapport with this specific persona",
        "objection_handling": "How they handled the persona's specific objections",
        "value_demonstration": "How effectively they demonstrated value for this persona's needs"
    }},
    "coaching_effectiveness": {{
        "coach_interventions_used": "Whether they seemed to benefit from coaching",
        "areas_where_coaching_helped": "Specific moments where coaching made a difference",
        "timeout_effectiveness": "How well timeouts were used for learning"
    }},
    "recording_snippets_analysis": {{
        "key_moments_identified": "Analysis of the moments the coach flagged for review",
        "learning_opportunities": "What can be learned from the saved snippets"
    }},
    "next_session_recommendations": [
        "Specific scenarios to practice next",
        "Skills to focus on in future sessions"
    ]
}}"""

            # Generate feedback using GPT-4o
            feedback_response = self.gpt4o_service.generate_response(
                messages=[{"role": "user", "content": feedback_prompt}],
                temperature=0.3,
                max_tokens=2000
            )
            
            # Try to parse as JSON, fallback to text if needed
            try:
                feedback_data = json.loads(feedback_response)
                return feedback_data
            except json.JSONDecodeError:
                return {
                    'error': 'Failed to parse feedback JSON',
                    'raw_feedback': feedback_response
                }
                
        except Exception as e:
            logger.error(f"Error generating session feedback: {str(e)}")
            return {'error': f'Failed to generate feedback: {str(e)}'}
    
    def _format_conversation_for_analysis(self, conversation_log: List[Dict]) -> str:
        """Format conversation log for AI analysis"""
        formatted = []
        for turn in conversation_log:
            speaker = turn.get('speaker', 'unknown')
            content = turn.get('content', '')
            timestamp = turn.get('timestamp', '')
            
            # Format speaker name
            speaker_name = {
                'user': 'SALESPERSON',
                'persona': 'BUYER PERSONA', 
                'coach': 'SALES COACH'
            }.get(speaker, speaker.upper())
            
            formatted.append(f"{speaker_name}: {content}")
        
        return "\n".join(formatted)
    
    def _format_coaching_interventions(self, interventions: List[Dict]) -> str:
        """Format coaching interventions for analysis"""
        if not interventions:
            return "No coaching interventions recorded"
        
        formatted = []
        for intervention in interventions:
            formatted.append(f"- {intervention.get('type', 'Unknown')}: {intervention.get('context', 'No context')}")
        
        return "\n".join(formatted)
    
    def _format_recording_snippets(self, snippets: List[Dict]) -> str:
        """Format recording snippets for analysis"""
        if not snippets:
            return "No recording snippets saved"
        
        formatted = []
        for snippet in snippets:
            formatted.append(f"- {snippet.get('context', 'No context')}: {snippet.get('coaching_notes', 'No notes')}")
        
        return "\n".join(formatted)


# Global service instance
dual_voice_service = DualVoiceAgentService()

def get_dual_voice_service() -> DualVoiceAgentService:
    """Get the dual voice agent service instance"""
    return dual_voice_service