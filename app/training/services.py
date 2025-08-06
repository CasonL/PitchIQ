"""
Service layer for training module operations, including AI interactions.
"""

from app.extensions import db
from app.models import (
    UserProfile, BuyerPersona, TrainingSession, PerformanceMetrics, 
    FeedbackAnalysis, Message, NameUsageTracker, SessionMetrics
)
from app.services.gpt4o_service import get_gpt4o_service
from app.services.voice_analysis_service import get_voice_analysis_service
from app.services.openai_service import openai_service
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
from app.training.curated_personas_data import BEHAVIORAL_SHELLS, LEGENDARY_BEHAVIORAL_SHELLS # Import shells
from app.services.conversation_state_manager import ConversationStateManager # <-- ADDED Import

logger = logging.getLogger(__name__)

# Global variable to store the backup persona
_backup_persona = None

# Constants for shell selection
CHANCE_TO_USE_LEGENDARY_SHELL = 0.0 # Disabled for enterprise demos - enable via admin settings

# Helper functions for AI generation and analysis
def generate_buyer_persona(user_profile=None, use_previous_feedback=False, previous_feedback=None, session_id=None):
    """Generate a buyer persona using comprehensive bias prevention system. User profile is optional for testing."""
    
    try:
        # Try comprehensive bias prevention system first
        try:
            from app.services.comprehensive_bias_prevention import ComprehensiveBiasPrevention
            
            # Extract context from user profile or use defaults
            if user_profile:
                target_market = getattr(user_profile, 'target_market', '') or getattr(user_profile, 'p_audience', 'Business professionals')
                product_service = getattr(user_profile, 'product_service', '') or getattr(user_profile, 'p_product', 'Business solutions')
                industry_context = getattr(user_profile, 'industry', None)
            else:
                logger.info("No user profile provided to generate_buyer_persona, using defaults for comprehensive system.")
                target_market = "B2B Small to Medium Businesses"
                product_service = "General Software Solution"
                industry_context = "Technology"
            
            logger.info(f"Using comprehensive bias prevention for persona generation: product='{product_service}', target='{target_market}'")
            
            # Generate bias-free persona framework
            framework = ComprehensiveBiasPrevention.generate_bias_free_persona_framework(
                industry_context=industry_context,
                target_market=target_market,
                complexity_level="intermediate",
                product_service=product_service
            )
            
            # Transform framework to BuyerPersona format
            persona_data = {
                "name": framework['name'],
                "description": f"A {framework['cultural_background']} {framework['role']} with {', '.join(framework['personality_traits'][:2]).lower()} personality traits. {framework.get('contextual_fears', {}).get('authentic_objections', ['Looking for business solutions'])[0] if framework.get('contextual_fears') else 'Looking for business solutions'}",
                "role": framework['role'],
                "base_reaction_style": framework['communication_style']['tone'],
                "personality_traits": {trait: 0.7 for trait in framework['personality_traits'][:3]},
                "intelligence_level": "average",
                "emotional_state": framework['communication_style']['emotional_expression'],
                "buyer_type": framework['decision_authority'],
                "decision_authority": framework['decision_authority'],
                "pain_points": [fear['core_concern'] for fear in framework.get('contextual_fears', {}).get('contextual_fears', [])] or ['Efficiency challenges'],
                "primary_concern": framework.get('contextual_fears', {}).get('authentic_objections', ['Looking for business solutions'])[0] if framework.get('contextual_fears') else 'Looking for business solutions',
                "objections": framework.get('contextual_fears', {}).get('authentic_objections', ['Budget constraints']),
                "cognitive_biases": {"Loss aversion": 0.6, "Status quo bias": 0.5},
                "industry_context": framework['industry'],
                "business_description": f"{framework['role']} at a {framework['industry']} organization",
                "business_context": framework['business_context'],
                "chattiness_level": framework['communication_style']['chattiness'],
                "shell_id": f"comprehensive_bias_prevention_{session_id or 'default'}",
                "is_legendary_shell": False  # Comprehensive system generates standard personas
            }
            
            logger.info(f"Successfully generated persona using comprehensive bias prevention: {persona_data['name']}")
            
            # Create and save the persona
            persona = BuyerPersona(
                name=persona_data.get("name", "Alex Comprehensive"),
                description=persona_data.get("description", "Generated using comprehensive bias prevention."),
                base_reaction_style=persona_data.get("base_reaction_style"),
                personality_traits=json.dumps(persona_data.get("personality_traits", {})), 
                intelligence_level=persona_data.get("intelligence_level"),
                emotional_state=persona_data.get("emotional_state", "Neutral"),
                buyer_type=persona_data.get("buyer_type", "Thoughtful"),
                decision_authority=persona_data.get("decision_authority", "Medium"),
                pain_points=json.dumps(persona_data.get("pain_points", [])),
                objections=json.dumps(persona_data.get("objections", [])),
                cognitive_biases=json.dumps(persona_data.get("cognitive_biases", {})),
                primary_concern=persona_data.get("primary_concern", "Efficiency"),
                role=persona_data.get("role", "Business Professional"),
                industry_context=persona_data.get("industry_context") or (user_profile.industry if user_profile else "Technology"),
                business_description=persona_data.get("business_description"),
                business_context=persona_data.get("business_context", "B2B"),
                longterm_personal_description=json.dumps({}),
                shortterm_personal_description=json.dumps({}),
                demographic_description=json.dumps({}),
                linguistic_style_cue=persona_data.get("chattiness_level", "medium"),
                chattiness_level=persona_data.get("chattiness_level", "medium"),
                is_legendary=False,  # Comprehensive system generates standard personas
                is_cached=True,  # Mark for potential reuse
                cached_at=datetime.utcnow()
            )
            
            db.session.add(persona)
            db.session.commit()
            
            logger.info(f"Successfully saved comprehensive bias prevention persona: {persona.name}")
            return persona
            
        except Exception as comp_error:
            logger.warning(f"Comprehensive bias prevention failed, falling back to shell system: {str(comp_error)}")
            # Fall back to original shell system
            pass
        
        # FALLBACK: Original shell-based system
        from app.services.gpt4o_service import get_gpt4o_service
        
        # If no user_profile is provided (e.g., for testing), create a mock one for context
        if user_profile is None:
            logger.info("No user profile provided to generate_buyer_persona, using mock profile for context.")
            class MockUserProfile:
                def __init__(self):
                    self.product_service = "General Software Solution"
                    self.industry = "Technology"
                    self.target_market = "B2B Small to Medium Businesses"
                    self.experience_level = "Intermediate"
                    self.id = None # No real user ID for mock
            user_profile = MockUserProfile()

        selected_shell_data = None
        is_legendary_override = False

        # Try to select a legendary shell (only if user has access)
        user_has_legendary_access = (
            user_profile and 
            hasattr(user_profile, 'has_legendary_personas') and 
            user_profile.has_legendary_personas
        )
        
        if (LEGENDARY_BEHAVIORAL_SHELLS and 
            user_has_legendary_access and 
            random.random() < (CHANCE_TO_USE_LEGENDARY_SHELL or 0.05)):  # Use 5% if enabled
            selected_shell_data = random.choice(LEGENDARY_BEHAVIORAL_SHELLS)
            is_legendary_override = True # Mark that this persona should be treated as legendary
            logger.info(f"Selected a legendary behavioral shell: {selected_shell_data.get('shell_id')}")
        # Else, try to select a standard behavioral shell (prioritize emotionally responsive ones)
        elif BEHAVIORAL_SHELLS:
            # Prioritize emotionally responsive shells (85% chance)
            emotionally_responsive_shells = [
                shell for shell in BEHAVIORAL_SHELLS 
                if shell.get('shell_id') in ['emotionally_responsive_01', 'enthusiastic_early_adopter_01', 'busy_but_persuadable_01', 'standard_amiable_01']
            ]
            
            # Exclude thoughtful shells from the fallback pool to reduce their frequency
            non_thoughtful_shells = [
                shell for shell in BEHAVIORAL_SHELLS 
                if shell.get('shell_id') not in ['standard_thoughtful_01']
            ]
            
            if emotionally_responsive_shells and random.random() < 0.85:
                selected_shell_data = random.choice(emotionally_responsive_shells)
                logger.info(f"Selected an emotionally responsive shell: {selected_shell_data.get('shell_id')}")
            else:
                # Use non-thoughtful shells for the remaining 15%
                selected_shell_data = random.choice(non_thoughtful_shells if non_thoughtful_shells else BEHAVIORAL_SHELLS)
                logger.info(f"Selected a non-thoughtful behavioral shell: {selected_shell_data.get('shell_id')}")
        else:
            logger.warning("No behavioral shells (standard or legendary) are available. Proceeding with non-shell-guided generation.")
            # selected_shell_data will remain None, and gpt4o_service will generate a persona without a shell.

        # Check if we should use a cached persona from the database (70% chance after the first few)
        # This caching logic might need refinement with shells. For now, it's a general cache.
        # Perhaps we only cache non-legendary shell-generated personas.
        persona_count = BuyerPersona.query.count()
        # Only attempt to use cached if a real user_profile.id is available and it's not a legendary shell override
        use_cached = (not is_legendary_override) and (user_profile.id is not None) and (persona_count > 5) and (random.random() < 0.7)
        
        if use_cached:
            user_industry = user_profile.industry
            user_target_market = user_profile.target_market
            
            query = BuyerPersona.query.filter(BuyerPersona.is_cached == True, BuyerPersona.is_legendary == False) # Don't reuse legendary from cache
            
            if user_industry:
                query = query.filter(BuyerPersona.industry_context.like(f"%{user_industry}%"))
                
            used_persona_ids = db.session.query(TrainingSession.buyer_persona_id)\
                .filter(TrainingSession.user_profile_id == user_profile.id)\
                .distinct().all()
            used_persona_ids = [pid[0] for pid in used_persona_ids if pid[0]]
            
            if used_persona_ids:
                query = query.filter(~BuyerPersona.id.in_(used_persona_ids))
                
            available_cached_count = query.count()
            if available_cached_count > 0:
                offset = random.randint(0, available_cached_count - 1)
                cached_persona = query.offset(offset).first()
                
                if cached_persona:
                    logger.info(f"Using cached persona from database: {cached_persona.name}")
                    return cached_persona
        
        # If not using cached or legendary override, or if no shells were found, proceed to generation
        gpt4o_service = get_gpt4o_service()
        
        # Background backup persona generation (can remain as is)
        # Check if user_profile is a mock by checking if it has the mock attributes
        is_mock_profile = hasattr(user_profile, 'product_service') and user_profile.product_service == "Software Solutions"
        if not is_mock_profile:
            backup_thread = Thread(target=_generate_backup_persona, args=(user_profile, selected_shell_data)) # Pass shell to backup
            backup_thread.daemon = True
            backup_thread.start()
        
        context = {
            "product_service": user_profile.product_service or "Unknown product/service",
            "industry": user_profile.industry or "Various industries",
            "target_market": user_profile.target_market or "Various businesses",
            "experience_level": user_profile.experience_level or "Intermediate"
        }
        
        # Get persona description from GPT-4o mini, now potentially guided by a shell
        persona_description = gpt4o_service.generate_customer_persona(context, behavioral_shell_data=selected_shell_data)
        
        persona_data = parse_persona_description(persona_description)

        # Determine if the generated persona is legendary
        # is_legendary_shell is from the shell itself, persona_data might get an "is_legendary_shell" field if parsed.
        # We use is_legendary_override if a legendary shell was explicitly chosen for this generation instance.
        # Or, if the persona_data itself (from a non-shell generation that became legendary) indicates it.
        final_is_legendary = is_legendary_override or persona_data.get("is_legendary_shell", False)
        
        persona = BuyerPersona(
            name=persona_data.get("name", "Alex Shell Gen"),
            description=persona_data.get("description", "Default shell-guided description."),
            base_reaction_style=persona_data.get("base_reaction_style"),
            personality_traits=json.dumps(persona_data.get("personality_traits", {})), 
            intelligence_level=persona_data.get("intelligence_level"),
            emotional_state=persona_data.get("emotional_state", "Neutral"),
            buyer_type=persona_data.get("buyer_type", "Thoughtful"),
            decision_authority=persona_data.get("decision_authority", "Medium"),
            pain_points=json.dumps(persona_data.get("pain_points", [])),
            objections=json.dumps(persona_data.get("objections", [])),
            cognitive_biases=json.dumps(persona_data.get("cognitive_biases", {})),
            primary_concern=persona_data.get("primary_concern", "Efficiency"),
            role=persona_data.get("role", "Business Professional"),
            industry_context=persona_data.get("industry_context") or user_profile.industry, # Prefer persona's industry, fallback to user's
            business_description=persona_data.get("business_description"),
            business_context=persona_data.get("business_context", "B2B"),  # AI-determined B2B/B2C
            longterm_personal_description=json.dumps(persona_data.get("longterm_personal_description", {})),
            shortterm_personal_description=json.dumps(persona_data.get("shortterm_personal_description", {})),
            demographic_description=json.dumps(persona_data.get("demographic_description", {})),
            linguistic_style_cue=persona_data.get("linguistic_style_cue"),
            chattiness_level=persona_data.get("chattiness_level", "medium"),
            is_legendary=final_is_legendary, # Set based on shell or override
            is_cached=not final_is_legendary,  # Mark for potential reuse only if not legendary
            cached_at=datetime.utcnow() if not final_is_legendary else None
        )
        
        db.session.add(persona)
        db.session.commit()
        
        logger.info(f"Successfully generated buyer persona: {persona.name} (Legendary: {final_is_legendary})")
        
        return persona
        
    except Exception as e:
        logger.error(f"Error generating buyer persona: {str(e)}", exc_info=True) # exc_info for full traceback
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

def _generate_backup_persona(user_profile, selected_shell_data=None): # Added shell_data param
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
            
            from app.services.gpt4o_service import get_gpt4o_service
            
            # Get the GPT-4o mini service
            gpt4o_service = get_gpt4o_service()
            
            # Build context from user profile
            context = {
                "product_service": user_profile.product_service or "Unknown product/service",
                "industry": user_profile.industry or "Various industries",
                "target_market": user_profile.target_market or "Various businesses",
                "experience_level": user_profile.experience_level or "Intermediate"
            }
            
            # Get persona description from GPT-4o mini, potentially with a shell
            try:
                persona_description = gpt4o_service.generate_customer_persona(context, behavioral_shell_data=selected_shell_data)
                
                # Parse the persona description
                persona_data = parse_persona_description(persona_description)

                # Determine if legendary for backup (unlikely to be legendary for backup, but check shell)
                is_legendary_backup = selected_shell_data.get("is_legendary_shell", False) if selected_shell_data else False
                
                # Create the persona
                _backup_persona = BuyerPersona(
                    name=persona_data.get("name", "Backup Alex"), # Ensure backup has distinct name if needed
                    description=persona_data.get("description", "Default backup description."), # Use parsed description
                    base_reaction_style=persona_data.get("base_reaction_style"),
                    personality_traits=json.dumps(persona_data.get("personality_traits", {})),
                    intelligence_level=persona_data.get("intelligence_level"),
                    emotional_state=persona_data.get("emotional_state", "Neutral"),
                    buyer_type=persona_data.get("buyer_type", "Thoughtful"),
                    decision_authority=persona_data.get("decision_authority", "Medium"),
                    pain_points=json.dumps(persona_data.get("pain_points", [])),
                    objections=json.dumps(persona_data.get("objections", [])),
                    cognitive_biases=json.dumps(persona_data.get("cognitive_biases", {})),
                    primary_concern=persona_data.get("primary_concern", "Efficiency"),
                    role=persona_data.get("role", "Business Professional"),
                    industry_context=persona_data.get("industry_context") or user_profile.industry,
                    business_description=persona_data.get("business_description"),
                    business_context=persona_data.get("business_context", "B2B"),  # AI-determined B2B/B2C
                    longterm_personal_description=json.dumps(persona_data.get("longterm_personal_description", {})),
                    shortterm_personal_description=json.dumps(persona_data.get("shortterm_personal_description", {})),
                    demographic_description=json.dumps(persona_data.get("demographic_description", {})),
                    linguistic_style_cue=persona_data.get("linguistic_style_cue"),
                    chattiness_level=persona_data.get("chattiness_level", "medium"),
                    is_legendary=is_legendary_backup, # Set based on shell
                    # Backup personas are not meant to be "cached" in the same way for user reuse,
                    # they are for quick replacement if main generation fails.
                    is_cached=False 
                )
                
                logger.info(f"Successfully generated backup persona: {_backup_persona.name} (Legendary: {is_legendary_backup})")
            except Exception as inner_e:
                logger.error(f"Error generating persona with GPT-4o mini: {str(inner_e)}")
                # Fall back to default persona
                _backup_persona = create_default_persona(user_profile)
                logger.info(f"Using default backup persona: {_backup_persona.name}")
            
    except Exception as e:
        logger.error(f"Error generating backup persona: {str(e)}")
        _backup_persona = None

def parse_persona_description(persona_input_string: str) -> dict:
    """Parse the AI-generated persona (JSON string or fallback text) into structured data."""
    try:
        # Attempt to parse as JSON first
        if persona_input_string.strip().startswith('{') and persona_input_string.strip().endswith('}'):
            logger.info("Attempting to parse persona input as JSON.")
            parsed_data = json.loads(persona_input_string)
            logger.info("Successfully parsed persona input as JSON.")
            
            # Map JSON fields to the structure expected by BuyerPersona
            # Ensure all fields are present with defaults if necessary
            mapped_data = {
                "name": parsed_data.get("name", "Alex JSON Default"),
                "description": parsed_data.get("description_narrative", "Default description from JSON."), # This is the main narrative
                "role": parsed_data.get("role", "Business Professional"),
                "base_reaction_style": parsed_data.get("base_reaction_style", "Cautious_Pragmatist"),
                "personality_traits": parsed_data.get("trait_metrics", {"Thoughtful": 0.7}), # This is the trait_metrics object
                "intelligence_level": parsed_data.get("intelligence_level_generated", "average"),
                "emotional_state": parsed_data.get("emotional_state", "Neutral"),
                "buyer_type": parsed_data.get("buyer_type", "Thoughtful"),
                "decision_authority": parsed_data.get("decision_authority", "Medium"),
                "industry_context": parsed_data.get("industry_context", ""),
                "pain_points": parsed_data.get("pain_points", []),
                "primary_concern": parsed_data.get("primary_concern", "Efficiency"),
                "objections": parsed_data.get("objections", []),
                "cognitive_biases": parsed_data.get("cognitive_biases", {"Status_Quo_Bias": 0.6}),
                # New detailed fields from the rich persona JSON
                "business_description": parsed_data.get("business_description", "No specific business context provided."),
                "business_context": parsed_data.get("business_context", "B2B"),  # AI-determined B2B/B2C
                "longterm_personal_description": parsed_data.get("longterm_personal_description", {}),
                "shortterm_personal_description": parsed_data.get("shortterm_personal_description", {}),
                "demographic_description": parsed_data.get("demographic_description", {}),
                "linguistic_style_cue": parsed_data.get("linguistic_style_cue", "standard professional English."),
                "chattiness_level": parsed_data.get("chattiness_level", "medium") # Default to medium if not present
            }
            # Optionally, add the primary_personality_trait_generated to the personality_traits dict
            if "primary_personality_trait_generated" in parsed_data and isinstance(mapped_data["personality_traits"], dict):
                primary_trait_key = parsed_data["primary_personality_trait_generated"]
                if primary_trait_key not in mapped_data["personality_traits"]:
                     mapped_data["personality_traits"][primary_trait_key] = 0.8 # Default high score for primary

            # Include shell metadata if present in the JSON from gpt4o_service
            if "shell_id" in parsed_data:
                mapped_data["shell_id"] = parsed_data["shell_id"]
            if "is_legendary_shell" in parsed_data:
                mapped_data["is_legendary_shell"] = parsed_data["is_legendary_shell"]

            return mapped_data
        else:
            logger.info("Persona input does not appear to be JSON, attempting legacy text parsing.")
            # Fallback to legacy text parsing if not a JSON string
            # This reuses the old logic for maximum compatibility with old fallback format
            description = persona_input_string # The whole string is the description
            name = "Alex Text Fallback"
            if "Name:" in description:
                name_line = next((line for line in description.split('\n') if "Name:" in line), None)
                if name_line:
                    name = name_line.split("Name:")[1].strip().lstrip('*').strip()
            
            role = "Business Professional (Text Fallback)"
            if "Role:" in description:
                role_line = next((line for line in description.split('\n') if "Role:" in line), None)
                if role_line:
                    role = role_line.split("Role:")[1].strip().lstrip('*').strip()

            # For legacy text parsing, we might need to use the old extract_* functions
            # if the fallback string from gpt4o_service is purely text-based.
            # However, the _generate_fallback_text_persona in gpt4o_service now creates a more structured string
            # that we can attempt to parse directly here too for some fields.

            traits = extract_traits(description) # Old reliable for text
            emotional_state = extract_emotional_state(description)
            buyer_type = extract_buyer_type(description)
            decision_authority = extract_decision_authority(description)
            # Pain points might be structured in fallback text from _generate_fallback_text_persona
            pain_points_str_list = []
            if "Pain Points:" in description:
                try:
                    pain_section = description.split("Pain Points:")[1].split("Primary Concern:")[0]
                    pain_points_str_list = [line.strip().lstrip('- ') for line in pain_section.strip().split('\\n') if line.strip()]
                except Exception:
                    pain_points_str_list = ["Efficiency (fallback)", "Cost (fallback)"] # Default if parsing structured text fails

            pain_points = pain_points_str_list if pain_points_str_list else extract_pain_points(description)

            primary_concern = extract_primary_concern(description, pain_points)
            objections = extract_objections(description)
            biases = extract_biases(description)

            # Attempt to get new fields from the structured fallback string if possible
            base_reaction_style = "Cautious_Pragmatist (Text Fallback)"
            if "Base Reaction Style:" in description:
                style_line = next((line for line in description.split('\n') if "Base Reaction Style:" in line), None)
                if style_line: base_reaction_style = style_line.split("Base Reaction Style:")[1].strip()
            
            intelligence_level = "average (Text Fallback)"
            if "Intelligence Level Generated:" in description:
                intel_line = next((line for line in description.split('\n') if "Intelligence Level Generated:" in line), None)
                if intel_line: intelligence_level = intel_line.split("Intelligence Level Generated:")[1].strip()

            # If Trait Metrics are in the fallback string as a pseudo-JSON, try to parse them
            if "Trait Metrics:" in description and isinstance(traits, dict):
                try:
                    trait_metrics_str = description.split("Trait Metrics:")[1].split("\n")[0].strip()
                    # Basic pseudo-JSON to dict conversion (handle with care or improve)
                    if trait_metrics_str.startswith('{{') and trait_metrics_str.endswith('}}'): # Handle potential double braces
                        trait_metrics_str = trait_metrics_str[1:-1]
                    parsed_trait_metrics = json.loads(trait_metrics_str)
                    traits.update(parsed_trait_metrics) # Merge/update with more specific metrics
                except Exception as e_metrics:
                    logger.warning(f"Could not parse Trait Metrics from fallback string: {e_metrics}")

            return {
                "name": name,
                "description": description, # Full string as description for text fallback
                "role": role,
                "base_reaction_style": base_reaction_style,
                "personality_traits": traits,
                "intelligence_level": intelligence_level,
                "chattiness_level": "medium", # Default for text fallback
                "emotional_state": emotional_state,
                "buyer_type": buyer_type,
                "decision_authority": decision_authority,
                "pain_points": pain_points,
                "primary_concern": primary_concern,
                "objections": objections,
                "cognitive_biases": biases,
                # Add shell metadata if somehow present in text fallback (less likely but for completeness)
                "shell_id": "N/A_text_fallback",
                "is_legendary_shell": False
            }

    except json.JSONDecodeError as e_json:
        logger.error(f"Fatal JSONDecodeError parsing persona input: {str(e_json)}. Input: {persona_input_string[:500]}")
        # Fallback to the most basic default if JSON parsing itself fails catastrophically
    except Exception as e_general:
        logger.error(f"Unexpected error in parse_persona_description: {str(e_general)}. Input: {persona_input_string[:500]}")
        # Fallback for any other unexpected error

    # Universal fallback if all parsing attempts fail
    logger.warning("Using universal fallback in parse_persona_description due to previous errors.")
    return {
        "name": "Alex Super Fallback",
        "description": "Persona generation failed, using super fallback. Original input: " + persona_input_string[:200],
        "role": "Business Professional",
        "base_reaction_style": "Cautious_Pragmatist",
        "personality_traits": {"Thoughtful": 0.7, "Decisive": 0.6},
        "intelligence_level": "average",
        "chattiness_level": "medium", # Default for super fallback
        "emotional_state": "Neutral",
        "buyer_type": "Thoughtful",
        "decision_authority": "Medium",
        "pain_points": ["Efficiency", "Cost Management"],
        "primary_concern": "Efficiency",
        "objections": ["Price", "Implementation time"],
        "cognitive_biases": {"Loss aversion": 0.6, "Status quo bias": 0.5},
        "shell_id": "N/A_super_fallback", # Add shell_id for super fallback
        "is_legendary_shell": False # Add is_legendary_shell for super fallback
    }

def create_fallback_persona() -> BuyerPersona:
    """Create a fallback persona if AI generation fails."""
    # Use diverse names instead of hardcoded "Alex Rodriguez"
    from app.services.demographic_names import DemographicNameService
    import random
    
    try:
        first_name, last_name = DemographicNameService.get_name_by_demographics("mixed_american", random.choice(["male", "female"]))
        fallback_name = f"{first_name} {last_name}"
    except Exception as e:
        logger.error(f"Error generating diverse fallback name: {str(e)}")
        fallback_name = "Alex Morgan"
    
    return BuyerPersona(
        name=fallback_name,
        description="A business professional evaluating solutions.",
        personality_traits=json.dumps({"Thoughtful": 0.7, "Decisive": 0.6}),
        emotional_state="Neutral",
        buyer_type="Thoughtful",
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

def generate_ai_response(session_object, message, conversation_metadata=None):
    """Generate an AI response from the buyer persona for the provided user message.

    The original implementation expected the user ``message`` as the first
    argument which made calling the function error prone. Tests in the
    repository and some helper scripts pass the ``TrainingSession`` instance as
    the first argument.  To avoid confusion we now accept the session first and
    message second which aligns with the tests.  The internal logic remains the
    same.
    """
    try:
        from app.services.gpt4o_service import get_gpt4o_service
        
        # Check if session_object is a string (error state from previous call)
        if isinstance(session_object, str):
            logger.error(f"Session object is a string instead of a TrainingSession object: '{session_object}'")
            
            # Check if the string could be a session ID and try to retrieve the session
            if session_object.isdigit():
                try:
                    # Attempt to retrieve the session by ID (without user check for now)
                    potential_session_id = int(session_object)
                    logger.info(f"Attempting to retrieve session with ID {potential_session_id}")
                    retrieved_session = TrainingSession.query.get(potential_session_id)
                    
                    if retrieved_session:
                        logger.info(f"Successfully retrieved session {retrieved_session.id}")
                        session_object = retrieved_session
                    else:
                        logger.error(f"No session found with ID {potential_session_id}")
                        return "I'm interested in learning more about your product. Could you tell me about the main benefits or how it might help my business?", session_object
                except Exception as retrieve_error:
                    logger.error(f"Error retrieving session from string ID: {str(retrieve_error)}")
                    return "I'm interested in learning more about your product. Could you tell me about the main benefits or how it might help my business?", session_object
            else:
                # If it's a string but not a digit, it's an unusable session_object
                logger.error(f"Session object is a non-digit string: '{session_object}'. Cannot proceed.")
                return "I'm having trouble understanding the session context. Please try again.", session_object
        
        logger.info(f"Generating AI response for session {session_object.id}")
        logger.info(f"Received user message: '{message}'")
        
        if not message or len(message.strip()) < 2:
            logger.warning(f"User message too short or empty: '{message}'")
            return "I didn't quite catch that. Could you please repeat what you said?", session_object
        
        # Get the buyer persona
        buyer_persona = session_object.buyer_persona
        if not buyer_persona:
            logger.error(f"No buyer persona found for session {session_object.id}, attempting to create one")
            try:
                # Create a default buyer persona for the session
                buyer_persona = BuyerPersona(
                    name="Alex Rodriguez",
                    description="Marketing Director at a mid-sized tech company looking for solutions to improve efficiency. Thoughtful, data-driven, and somewhat skeptical of new vendors. Needs clear ROI and proven results before making decisions.",
                    personality_traits=json.dumps({
                        "thoughtful": 8,
                        "skeptical": 7,
                        "direct": 6
                    }),
                    emotional_state="neutral",
                    buyer_type="economic",
                    decision_authority="influencer"
                )
                db.session.add(buyer_persona)
                db.session.flush()  # Get ID without committing
                
                # Associate with the session
                session_object.buyer_persona_id = buyer_persona.id
                db.session.commit()
                logger.info(f"Created default buyer persona {buyer_persona.id} for session {session_object.id}")
            except Exception as persona_error:
                logger.error(f"Failed to create default persona: {str(persona_error)}")
                return "I'm sorry, but I'm having trouble accessing the buyer persona information. Please try again or start a new session.", session_object
            
            # Check if creation was successful
            if not session_object.buyer_persona:
                logger.error(f"Buyer persona still null after creation attempt for session {session_object.id}")
                return "I'm sorry, but I'm having trouble accessing the buyer persona information. Please try again or start a new session.", session_object
            else:
                buyer_persona = session_object.buyer_persona
                logger.info(f"Successfully created and associated persona {buyer_persona.id} with session {session_object.id}")
        
        # Ensure buyer persona has a name
        if not hasattr(buyer_persona, 'name') or not buyer_persona.name:
            logger.warning(f"Buyer persona has no name for session {session_object.id}. Setting default name.")
            buyer_persona.name = "Alex Rodriguez"
            db.session.add(buyer_persona)
            db.session.commit()
        
        # Get the conversation history
        conversation_history = session_object.conversation_history_dict
        if not conversation_history:
            conversation_history = []
            
        # Log conversation history (truncated)
        logger.info(f"Conversation history for session {session_object.id}: {len(conversation_history)} messages")
        if conversation_history:
            # Log the last message if available
            last_msg = conversation_history[-1] if conversation_history else None
            if last_msg:
                logger.info(f"Last message: role={last_msg.get('role')}, content preview='{last_msg.get('content', '')[:30]}...'")
            
        # Add the current message to the conversation history temporarily
        conversation_with_new_message = conversation_history + [{"role": "user", "content": message}]

        # --- NEW: Analyze Conversation State ---
        try:
            state_manager = ConversationStateManager(conversation_with_new_message)
            state_manager.update_state(conversation_with_new_message) # Analyze the history
            conversation_state = state_manager.get_conversation_state()
            logger.info(f"Generated conversation state for session {session_object.id}: {conversation_state}")
        except Exception as state_error:
            logger.error(f"Error analyzing conversation state for session {session_object.id}: {state_error}", exc_info=True)
            # Fallback to a default/empty state if analysis fails
            conversation_state = {
                "likely_phase": "unknown",
                "rapport_level": "Medium",
                "needs_identified": [],
                "objections_raised": [],
                "key_commitments": [],
                "salesperson_focus": None,
                "sentiment": "neutral",
                "message_count": len(conversation_with_new_message)
            }
        # --- END NEW STATE ANALYSIS ---

        # Get the GPT-4o mini service
        gpt4o_service = get_gpt4o_service()
        if not gpt4o_service:
            logger.error(f"GPT-4o mini service not available for session {session_object.id}")
            return "I'm sorry, but the AI service is temporarily unavailable. Please try again later.", session_object
        
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
        
        logger.info(f"Using product/service: {sales_info['product_service']}")
        
        # Use the specialized roleplay response method which has better prompting
        try:
            # First, log what persona we're sending to help with debugging
            logger.info(f"Using persona with name: {buyer_persona.name} for session {session_object.id}")
            
            # Create a proper persona dictionary
            persona_dict = {
                "name": buyer_persona.name,
                "description": buyer_persona.description, # This is the description_narrative
                "role": getattr(buyer_persona, 'role', "Business Professional"),
                "business_description": getattr(buyer_persona, 'business_description', "No specific business context provided."),
                
                # Assuming these _dict properties exist on the model or return dicts directly
                # If they are JSON strings, json.loads() would be needed here.
                "longterm_personal_description": getattr(buyer_persona, 'longterm_personal_description_dict', getattr(buyer_persona, 'longterm_personal_description', {})),
                "shortterm_personal_description": getattr(buyer_persona, 'shortterm_personal_description_dict', getattr(buyer_persona, 'shortterm_personal_description', {})),
                "demographic_description": getattr(buyer_persona, 'demographic_description_dict', getattr(buyer_persona, 'demographic_description', {})),
                
                "base_reaction_style": getattr(buyer_persona, 'base_reaction_style', "Neutral"),
                "intelligence_level": getattr(buyer_persona, 'intelligence_level', "average"),
                "personality_traits": buyer_persona.personality_traits_dict if hasattr(buyer_persona, 'personality_traits_dict') else {},
                "emotional_state": buyer_persona.emotional_state,
                "buyer_type": buyer_persona.buyer_type,
                "decision_authority": buyer_persona.decision_authority,
                "industry_context": getattr(buyer_persona, 'industry_context', "general"),
                
                # Assuming these _list properties exist or they return lists directly
                "pain_points": buyer_persona.pain_points_list if hasattr(buyer_persona, 'pain_points_list') else json.loads(buyer_persona.pain_points or '[]'),
                "primary_concern": getattr(buyer_persona, 'primary_concern', "finding a good solution."),
                "objections": buyer_persona.objections_list if hasattr(buyer_persona, 'objections_list') else json.loads(buyer_persona.objections or '[]'),
                
                "cognitive_biases": buyer_persona.cognitive_biases_dict if hasattr(buyer_persona, 'cognitive_biases_dict') else {},
                "linguistic_style_cue": getattr(buyer_persona, 'linguistic_style_cue', "standard professional English."),
                "chattiness_level": getattr(buyer_persona, 'chattiness_level', "medium"), # Add chattiness_level
                
                # Fields that might have been in persona_dict previously but are better sourced as above
                # "company": getattr(buyer_persona, 'company', ""), # company info likely in business_description
                # "business_context": getattr(buyer_persona, 'business_context', "B2B"), # Covered by more specific fields
            }
            
            # Generate a random conversation ID if needed
            conversation_id = f"conv_{random.randint(10000, 99999)}"
            
            # Generate the response
            ai_response = gpt4o_service.generate_roleplay_response(
                messages=conversation_with_new_message,
                persona=persona_dict,
                user_info={"name": user_name, "experience_level": sales_info.get("sales_experience", "intermediate")},
                conversation_id=conversation_id,
                conversation_state=conversation_state # Pass the generated conversation_state
            )
            
            # Log the response we received
            if ai_response:
                logger.info(f"Generated AI response (preview): '{str(ai_response)[:50]}...'")
            else:
                logger.warning("Received empty AI response")
            
            # Handle both string responses and split message responses (as dictionary)
            if isinstance(ai_response, dict) and 'response' in ai_response and 'follow_up' in ai_response:
                logger.info(f"Generated split message response for session {session_object.id}")
                # No need to apply punctuation spacing fix
                # Return the entire response dictionary
                return ai_response, session_object
            else:
                # Handle normal string responses
                return ai_response, session_object
        
        except Exception as e:
            logger.error(f"GPT-4o mini API error: {str(e)}", exc_info=True)
            return "Hi there! I noticed your question, but I'm having a momentary issue with my connection. Could you try asking me something about your product, or tell me what problems your solution helps solve?", session_object
    
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}", exc_info=True)
        return "I'm interested in learning more about your product. Could you tell me about the main benefits or how it might help my business?", session_object

def analyze_interaction(session: TrainingSession, user_message: str, ai_response: str, voice_data=None, voice_metrics=None):
    """
    Analyze an interaction during a training session, including voice metrics if available.
    
    Args:
        session: The training session object
        user_message: The user's message text
        ai_response: The AI's response text
        voice_data: Optional base64 encoded voice data
        voice_metrics: Optional pre-analyzed voice metrics
    """
    
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
        
        # Process voice data if available
        if voice_data or voice_metrics:
            # Get or create session metrics
            metrics = SessionMetrics.query.filter_by(training_session_id=session.id).first()
            if not metrics:
                metrics = SessionMetrics(training_session_id=session.id)
            
            # If we already have analyzed metrics, use them
            if voice_metrics:
                voice_data_json = voice_metrics
            # Otherwise if we have raw voice data, analyze it
            elif voice_data and current_app.config.get('VOICE_ANALYSIS_ENABLED', False):
                try:
                    voice_analysis_service = get_voice_analysis_service()
                    
                    # Check if Deepgram enhanced analysis is enabled
                    if current_app.config.get('DEEPGRAM_ENABLED', False) and current_app.config.get('ADVANCED_VOICE_METRICS', False):
                        logger.info(f"Using Deepgram for advanced voice analysis in session {session.id}")
                        # Process with Deepgram for advanced metrics
                        import base64
                        import tempfile
                        
                        # Decode base64 to binary
                        audio_binary = base64.b64decode(voice_data)
                        
                        # Create a temporary file
                        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_audio_file:
                            temp_audio_file.write(audio_binary)
                            temp_audio_path = temp_audio_file.name
                        
                        try:
                            # Analyze with Deepgram
                            voice_data_json = voice_analysis_service.analyze_with_deepgram(
                                audio_path=temp_audio_path,
                                audio_buffer=audio_binary,
                                transcript=user_message
                            )
                        finally:
                            # Clean up temp file
                            import os
                            if os.path.exists(temp_audio_path):
                                os.remove(temp_audio_path)
                    else:
                        # Use basic analysis
                        logger.info(f"Using basic voice analysis in session {session.id}")
                        voice_data_json = {"basic_analysis": True, "message": "Basic voice analysis only"}
                except Exception as voice_error:
                    logger.error(f"Error in voice analysis: {str(voice_error)}")
                    voice_data_json = {"error": str(voice_error)}
            else:
                voice_data_json = {}
            
            # Store voice metrics in session_metrics
            if voice_data_json:
                # Extract confidence score if available
                if isinstance(voice_data_json, dict) and "confidence" in voice_data_json:
                    confidence_score = voice_data_json["confidence"].get("score", 0)
                    
                    # Update confidence metrics
                    metrics.confidence_score = confidence_score
                    metrics.confidence_history = json.dumps(
                        json.loads(metrics.confidence_history or "[]") + [confidence_score]
                    )
                    
                    # Update session confidence score for quick access
                    session.confidence_score = confidence_score
                
                # Extract pace information if available
                if isinstance(voice_data_json, dict) and "pace" in voice_data_json:
                    pace_data = voice_data_json["pace"]
                    metrics.speaking_pace = pace_data.get("words_per_minute", 0)
                    metrics.pace_score = pace_data.get("score", 50)
                
                # Store full voice metrics data
                metrics.voice_metrics = json.dumps(voice_data_json)
                
                # Add metrics to session for commit
                db.session.add(metrics)
        
        # Commit changes
        db.session.add(session)
        db.session.commit()
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error analyzing interaction: {str(e)}")
        logger.error(traceback.format_exc())

def generate_performance_metrics(session: TrainingSession) -> PerformanceMetrics:
    """Generate performance metrics for the session."""
    logger.info(f"Generating performance metrics for session {session.id}")
    
    try:
        # Get GPT-4o mini service for analysis (optional for more sophisticated analysis)
        gpt4o_service = get_gpt4o_service()
        
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
        
        # In a real implementation, you would use GPT-4o mini for more sophisticated analysis
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
    """
    Generate feedback analysis using OpenAI including voice metrics if available.
    
    Args:
        session (TrainingSession): The training session object.
        
    Returns:
        FeedbackAnalysis: The generated feedback analysis object or None if failed.
    """
    logger.info(f"Starting feedback generation for session {session.id}")
    
    if not session or not session.messages:
        logger.warning(f"Session {session.id} has no messages to analyze.")
        return None
    
    try:
        # Retrieve conversation history from session messages
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in session.messages
        ]
        
        # Ensure conversation history is not empty
        if not conversation_history:
            logger.warning(f"No valid messages found for session {session.id} after processing.")
            return None
        
        # Get the OpenAI service instance
        if not openai_service.initialized:
             logger.error(f"OpenAI service not initialized. Cannot generate feedback for session {session.id}.")
             return None

        # Get user profile for context
        user_profile = session.user_profile
        if not user_profile:
            logger.error(f"User profile not found for session {session.id}. Cannot generate feedback.")
            return None
            
        user_profile_dict = {
            "experience_level": user_profile.experience_level,
            "product_service": user_profile.product_service,
            "industry": user_profile.industry,
            "target_market": user_profile.target_market,
            "struggles": user_profile.areas_of_struggle,
            "goals": user_profile.personal_goals
        }
        
        # Get voice metrics if available
        voice_metrics_data = None
        session_metrics = SessionMetrics.query.filter_by(training_session_id=session.id).first()
        if session_metrics and session_metrics.voice_metrics:
            try:
                voice_metrics_data = json.loads(session_metrics.voice_metrics)
                logger.info(f"Including voice metrics in feedback generation for session {session.id}")
            except json.JSONDecodeError:
                logger.warning(f"Could not parse voice metrics for session {session.id}")
                
        # Include voice metrics in the request to generate feedback
        generation_context = {
            "conversation": conversation_history,
            "user_profile": user_profile_dict,
            "voice_metrics": voice_metrics_data
        }

        # Generate feedback using the OpenAI service with additional voice metrics context
        logger.info(f"Calling OpenAI to generate feedback for session {session.id}")
        
        # If voice metrics exist, use the enhanced prompt that includes voice analysis
        if voice_metrics_data:
            # Create a summary of key voice metrics
            voice_summary = _create_voice_metrics_summary(voice_metrics_data)
            
            # Generate feedback with voice metrics included
            feedback_text = openai_service.get_completion(
                f"""Analyze this sales conversation and provide structured feedback. Include assessments of both the content and the voice delivery based on the provided metrics.

Conversation:
{json.dumps(conversation_history, indent=2)}

User Profile:
{json.dumps(user_profile_dict, indent=2)}

Voice Metrics Analysis:
{voice_summary}

Provide detailed, actionable feedback on:
1. Sales Skills (rapport building, needs discovery, objection handling, closing)
2. Voice Confidence (based on metrics like confidence score: {voice_metrics_data.get('confidence', {}).get('score', 0)})
3. Speech Patterns (pacing, filler words, hesitations)
4. Areas of Improvement with specific suggestions

Format your response as structured feedback with clear sections and scores (1-5 scale).
"""
            )
        else:
            # Use the standard feedback generation without voice metrics
            feedback_text = openai_service.generate_feedback(conversation_history, user_profile_dict)
        
        if not feedback_text or feedback_text.startswith("Error:"):
            logger.error(f"Failed to generate feedback from OpenAI for session {session.id}: {feedback_text}")
            return None

        # Parse the generated feedback text
        logger.info(f"Parsing feedback text for session {session.id}")
        parsed_feedback = parse_feedback_text(feedback_text)
        
        if not parsed_feedback:
            logger.error(f"Failed to parse feedback text for session {session.id}")
            # Store raw text if parsing fails but generation succeeded
            feedback_analysis = FeedbackAnalysis(
                session_id=session.id,
                raw_feedback=feedback_text,
                analysis_data=json.dumps({"error": "Failed to parse feedback", "raw_text": feedback_text}),
                analysis_timestamp=datetime.utcnow()
            )
            db.session.add(feedback_analysis)
            db.session.commit()
            return feedback_analysis
        
        # Create the feedback analysis object
        feedback_analysis = FeedbackAnalysis(
            session_id=session.id,
            raw_feedback=feedback_text,
            analysis_data=json.dumps(parsed_feedback),
            analysis_timestamp=datetime.utcnow()
        )
        
        # Check if voice metrics exist and add them to the feedback
        if voice_metrics_data:
            # Extract key voice metrics data to add to the feedback
            voice_data = {
                "confidence_score": voice_metrics_data.get("confidence", {}).get("score", 0),
                "speaking_pace": voice_metrics_data.get("pace", {}).get("words_per_minute", 0),
                "filler_words_count": voice_metrics_data.get("speech_patterns", {}).get("filler_words", {}).get("count", 0),
                "hesitations_count": voice_metrics_data.get("speech_patterns", {}).get("hesitations", {}).get("count", 0)
            }
            
            # Add voice metrics to the feedback analysis
            feedback_data = json.loads(feedback_analysis.analysis_data) if feedback_analysis.analysis_data else {}
            feedback_data["voice_metrics"] = voice_data
            feedback_analysis.analysis_data = json.dumps(feedback_data)
        
        # Save to database
        db.session.add(feedback_analysis)
        db.session.commit()
        
        # Update user profile with feedback
        if feedback_analysis and parsed_feedback:
            update_user_profile_with_feedback(user_profile, parsed_feedback, session)
        
        logger.info(f"Successfully generated feedback analysis for session {session.id}")
        return feedback_analysis
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error generating feedback analysis: {str(e)}", exc_info=True)
        return None

def _create_voice_metrics_summary(voice_metrics):
    """Create a human-readable summary of voice metrics for the AI prompt."""
    try:
        summary = "Voice Metrics Summary:\n"
        
        # Confidence metrics
        if "confidence" in voice_metrics:
            confidence = voice_metrics["confidence"]
            summary += f"- Confidence Score: {confidence.get('score', 'N/A')}/100 "
            summary += f"(Level: {confidence.get('level', 'N/A')})\n"
            
            # Add confidence factors if available
            if "factors" in confidence:
                factors = confidence["factors"]
                summary += "  Confidence Factors:\n"
                for factor, value in factors.items():
                    if isinstance(value, dict) and "score" in value:
                        summary += f"  - {factor.replace('_', ' ').title()}: {value['score']}/100\n"
        
        # Speech rate/pace metrics
        if "pace" in voice_metrics:
            pace = voice_metrics["pace"]
            summary += f"- Speaking Pace: {pace.get('words_per_minute', 'N/A')} words per minute "
            summary += f"(Level: {pace.get('level', 'N/A')})\n"
            if "variation" in pace:
                summary += f"  - Pace Variation: {pace['variation']:.2f}\n"
        
        # Speech patterns
        if "speech_patterns" in voice_metrics:
            patterns = voice_metrics["speech_patterns"]
            summary += "- Speech Patterns:\n"
            
            # Filler words
            if "filler_words" in patterns:
                filler = patterns["filler_words"]
                summary += f"  - Filler Words: {filler.get('count', 0)} instances "
                summary += f"({filler.get('percentage', 0):.1f}% of total words)\n"
            
            # Hesitations/pauses
            if "hesitations" in patterns:
                hesitations = patterns["hesitations"]
                summary += f"  - Hesitations: {hesitations.get('count', 0)} significant pauses\n"
        
        # Word analysis
        if "word_analysis" in voice_metrics and "low_confidence_words" in voice_metrics["word_analysis"]:
            low_conf_words = voice_metrics["word_analysis"]["low_confidence_words"]
            if low_conf_words:
                summary += f"- Low Confidence Words: {len(low_conf_words)} instances\n"
        
        return summary
    
    except Exception as e:
        logger.error(f"Error creating voice metrics summary: {str(e)}")
        return "Voice metrics available but could not be summarized."

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
        current_stage=initial_stage,
        reached_stages=json.dumps([initial_stage]) # Mark initial stage as reached
        # buyer_persona_id will be set later if needed
    )
    
    # Set conversation history AFTER object creation
    new_session.conversation_history_dict = []
    
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

def create_default_persona(user_profile=None):
    """Create a default persona if AI generation fails. User profile is optional."""
    # Use diverse names instead of hardcoded "Alex Rodriguez"
    from app.services.demographic_names import DemographicNameService
    import random
    
    try:
        first_name, last_name = DemographicNameService.get_name_by_demographics("mixed_american", random.choice(["male", "female"]))
        fallback_name = f"{first_name} {last_name} (Default)"
    except Exception as e:
        logger.error(f"Error generating diverse default name: {str(e)}")
        fallback_name = "Alex Morgan (Default)"
    
    # If no user_profile, use very generic defaults
    persona_role = "Business Professional"
    if user_profile and hasattr(user_profile, 'target_market') and user_profile.target_market:
        if 'B2C' in user_profile.target_market.upper():
            persona_role = "Consumer"
        elif 'B2B' in user_profile.target_market.upper():
            persona_role = "Business Manager"

    return BuyerPersona(
        name=fallback_name,
        description="A business professional evaluating solutions. Default persona generated due to an issue.",
        personality_traits=json.dumps({"Thoughtful": 0.7, "Decisive": 0.6}),
        emotional_state="Neutral",
        buyer_type="Thoughtful",
        decision_authority="Medium",
        pain_points=json.dumps(["Efficiency", "Cost Management"]),
        objections=json.dumps(["Price", "Implementation time", "ROI uncertainty"]),
        cognitive_biases=json.dumps({"Loss aversion": 0.6, "Status quo bias": 0.5}),
        primary_concern="Efficiency and cost management", # Added for consistency
        role=persona_role, # Use determined role
        industry_context=user_profile.industry if user_profile and hasattr(user_profile, 'industry') else "General Business" # Added
    )

def extract_traits(persona_description: str) -> dict:
    """Extract personality traits from persona description."""
    traits = {"Thoughtful": 0.7}
    
    if "Communication Style:" in persona_description:
        comm_section = persona_description.split("Communication Style:")[1].split("\n\n")[0].strip().lower()
        
        if "direct" in comm_section:
            traits["Direct"] = 0.8
        if "thoughtful" in comm_section:
            traits["Thoughtful"] = 0.9
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
        elif "thoughtful" in stance:
            return "Thoughtful"
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
    
    return "Thoughtful"

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
        extracted_name = "Alex Rodriguez"
        if "Name:" in persona_description:
            name_line = next((line for line in persona_description.split('\n') if "Name:" in line), None)
            if name_line:
                # Remove leading asterisks and strip whitespace
                raw_name = name_line.split("Name:")[1].strip()
                extracted_name = raw_name.lstrip('*').strip()
        
        return extracted_name
    except Exception as e:
        logger.error(f"Error extracting name: {str(e)}")
        return "Alex Rodriguez"

def extract_role(persona_description: str) -> str:
    """Extract role from persona description."""
    if "Role:" in persona_description:
        role_line = next((line for line in persona_description.split('\n') if "Role:" in line), None)
        if role_line:
            role = role_line.split("Role:")[1].strip()
            return role.lstrip('*').strip()
    return "Business Professional"

def sync_persona_name_from_conversation(session_id):
    """Update persona name in database based on what the AI has introduced itself as.
    
    This function analyzes the conversation history to find how the AI introduced itself,
    and updates the database record to match that name, ensuring consistency between
    displayed persona name and name used in conversation.
    
    Args:
        session_id: ID of the training session to analyze
        
    Returns:
        bool: True if name was updated, False otherwise
    """
    try:
        session = TrainingSession.query.get(session_id)
        if not session or not hasattr(session, 'conversation_history_dict') or not session.buyer_persona:
            logger.warning(f"No valid session, history, or persona found for ID {session_id}")
            return False
        
        conversation_history = session.conversation_history_dict
        if not conversation_history:
            logger.warning(f"Empty conversation history for session {session_id}")
            return False
            
        # More comprehensive introduction patterns to catch different ways the AI might introduce itself
        intro_patterns = [
            r"(?:I'm|I am|this is|my name is|name's|It's) ([A-Za-z\s\.]+)(?:[,\.\s]|from|with|at)",
            r"([A-Za-z\s\.]+) here(?:[,\.\s]|from|with|at)",
            r"Hi[,\.\s]+I'm ([A-Za-z\s\.]+)",
            r"Hello[,\.\s]+(?:I'm|I am|this is|my name is) ([A-Za-z\s\.]+)",
            r"([A-Za-z\s\.]+) speaking"
        ]
        
        # Check all AI messages in the conversation history
        ai_messages = [msg for msg in conversation_history if msg.get('role') == 'assistant']
        
        # Start with earlier messages first (where introductions usually happen)
        for msg in ai_messages[:3]:  # Focus on first 3 AI messages
            content = msg.get('content', '')
            
            # Try each pattern to find a name
            for pattern in intro_patterns:
                matches = re.search(pattern, content)
                if matches and len(matches.group(1).strip()) > 2:
                    actual_name = matches.group(1).strip()
                    
                    # Clean up the name - remove trailing punctuation
                    actual_name = re.sub(r'[,\.\s]+$', '', actual_name)
                    
                    logger.info(f"Found actual name '{actual_name}' used in conversation by AI")
                    
                    # Check if we need to update the persona name
                    current_name = session.buyer_persona.name
                    if current_name != actual_name:
                        logger.info(f"Updating persona name from '{current_name}' to '{actual_name}'")
                        session.buyer_persona.name = actual_name
                        db.session.add(session.buyer_persona)
                        db.session.commit()
                        return True
                    else:
                        logger.info(f"Persona name '{current_name}' already matches AI introduction")
                        return False
        
        logger.info(f"No name introduction found in first 3 AI messages for session {session_id}")
        return False
                    
    except Exception as e:
        logger.error(f"Error in sync_persona_name_from_conversation: {str(e)}")
        return False

def generate_roleplay_response(user_message, conversation_history, conversation_metadata=None):
    """
    Generate a roleplay response using GPT-4o mini service.
    
    Args:
        user_message: The latest message from the user
        conversation_history: List of message dictionaries with 'role' and 'content'
        conversation_metadata: Additional conversation context (optional)
        
    Returns:
        AI response text and completion ID
    """
    try:
        # Add detailed logging for debugging
        logger.info(f"Starting generate_roleplay_response with message: {user_message[:50]}..." if user_message else "None")
        logger.info(f"Conversation history has {len(conversation_history) if conversation_history else 0} messages")
        logger.info(f"Conversation metadata provided: {conversation_metadata is not None}")
        
        # Get the GPT-4o mini service
        try:
            gpt4o_service = get_gpt4o_service()
            logger.info("Successfully obtained GPT-4o service instance")
        except Exception as svc_err:
            logger.error(f"Error getting GPT-4o service: {str(svc_err)}")
            return "I apologize, but I'm having trouble connecting to the AI service.", "error_service"
        
        # Create a default persona dictionary
        persona_dict = {
            "name": "Alex Rodriguez",
            "description": "Marketing Director at a mid-sized tech company looking for solutions to improve efficiency. Thoughtful, data-driven, and somewhat skeptical of new vendors. Needs clear ROI and proven results before making decisions.",
            "personality_traits": {"thoughtful": 8, "skeptical": 7, "direct": 6},
            "emotional_state": "neutral",
            "buyer_type": "economic",
            "decision_authority": "influencer",
            "business_context": "B2B",
            "role": "Marketing Director",
            "company": "Tech Solutions Inc."
        }
        
        # Try to extract user ID from conversation metadata
        user_id = None
        user_name = "Salesperson"
        
        if conversation_metadata and isinstance(conversation_metadata, dict):
            user_id = conversation_metadata.get('user_id')
            user_name = conversation_metadata.get('user_name', 'Salesperson')
            
            # If we have detailed persona information in the metadata, use it
            if 'buyer_persona' in conversation_metadata:
                bp_data = conversation_metadata['buyer_persona']
                if isinstance(bp_data, dict):
                    # Override with the metadata persona
                    for key in bp_data:
                        if key in persona_dict:
                            persona_dict[key] = bp_data[key]
                    
                    logger.info(f"Using persona from metadata: {persona_dict['name']}")
                    
            # If we have formatting preferences, use them
            if 'formatting' in conversation_metadata:
                logger.info("Found formatting preferences in metadata")
            
            # Extract sales info
            if 'sales_info' in conversation_metadata:
                sales_info = conversation_metadata['sales_info']
            else:
                sales_info = {"sales_experience": "intermediate"}
        else:
            sales_info = {"sales_experience": "intermediate"}
            
        # Always add formatting requirements to the persona description
        if persona_dict and "description" in persona_dict:
            formatting_instructions = "\n\nIMPORTANT FORMATTING: Limit your responses to at most two questions per message."
            if not persona_dict["description"].endswith(formatting_instructions):
                persona_dict["description"] += formatting_instructions
        
        # ---- New rapport & passion handling ----
        from app.utils.conversation_utils import passion_trigger, cooperation_factor, detect_outcome

        # Detect if the user just mentioned a passion keyword
        user_hit_passion = False
        try:
            passions = persona_dict.get("passions") or []
            # Auto-generate passions if missing
            if not passions:
                GENERIC_PASSIONS = [
                    "hiking", "photography", "cooking", "traveling", "yoga", "road cycling",
                    "gardening", "sci-fi novels", "fantasy football", "snowboarding", "coffee roasting",
                    "running", "concerts", "craft beer", "gaming", "painting", "sailing", "wine tasting",
                    "kayaking", "basketball", "soccer"]
                passions = random.sample(GENERIC_PASSIONS, k=3)
                persona_dict["passions"] = passions
            
            user_hit_passion = passion_trigger(user_message or "", passions)
        except Exception as _e:
            user_hit_passion = False  # Fail-safe

        # ---- Time management ----
        MAX_CALL_MIN = 20
        elapsed_min = 0
        try:
            if session_object.start_time:
                elapsed_min = (datetime.utcnow() - session_object.start_time).total_seconds() / 60.0
        except Exception:
            pass
        time_warning = elapsed_min >= (MAX_CALL_MIN - 2)
        force_wrap_up = elapsed_min >= MAX_CALL_MIN
        
        # Retrieve previous rapport_score from metadata if provided
        prev_state = conversation_metadata.get("conversation_state") if isinstance(conversation_metadata, dict) else None
        rapport_score = prev_state.get("rapport_score", 0) if isinstance(prev_state, dict) else 0
        passion_shared = prev_state.get("passion_shared", False) if isinstance(prev_state, dict) else False
        # Decide if AI should hint passion this turn (20% chance)
        should_hint_passion = False
        # Determine call outcome using simple rules engine
        outcome, outcome_conf = detect_outcome(conversation_history, rapport_score)
        try:
            if not passion_shared and random.random() < 0.2:
                should_hint_passion = True
        except Exception:
            pass
        coop_factor = cooperation_factor(rapport_score)

        # Create conversation state dictionary 
        conversation_state = {
            "likely_phase": "discovery",  # Default phase
            "rapport_level": "Medium",
            "needs_identified": [],
            "objections_raised": [],
            "key_commitments": [],
            "salesperson_focus": None,
            "sentiment": "neutral",
            "rapport_score": rapport_score,
            "coop_factor": coop_factor,
            "user_hit_passion": user_hit_passion,
            "passion_shared": passion_shared,
            "should_hint_passion": should_hint_passion,
            "outcome": outcome,
            "outcome_confidence": outcome_conf,
            "elapsed_minutes": round(elapsed_min, 1),
            "time_warning": time_warning,
            "force_wrap_up": force_wrap_up
        }
        
        # Log key information before calling the service
        logger.info(f"Calling GPT-4o service with persona: {persona_dict['name']}")
        logger.info(f"Conversation state: {conversation_state}")
        logger.info(f"Conversation has {len(conversation_history)} messages")
        
        # Generate the response
        try:
            ai_response = gpt4o_service.generate_roleplay_response(
                persona=persona_dict,
                messages=conversation_history,
                conversation_state=conversation_state,
                user_info={"name": user_name, "experience_level": sales_info.get("sales_experience", "intermediate")},
                conversation_id=conversation_id
            )
            logger.info(f"Successfully received response from GPT-4o service: {ai_response[:50]}..." if ai_response else "None")
            
            # Return the response and a placeholder completion ID
            return ai_response, "completion_id"
        except Exception as gen_err:
            logger.error(f"Error during GPT-4o.generate_roleplay_response call: {str(gen_err)}", exc_info=True)
            return "I apologize, but I'm having trouble processing your request right now.", "error_id"
        
    except Exception as e:
        logger.error(f"Error generating roleplay response: {str(e)}", exc_info=True)
        return "I apologize, but I'm having trouble processing your request right now.", "error_id"
