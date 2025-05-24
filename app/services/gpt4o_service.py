"""
GPT-4o-mini API Service

This module provides a unified interface for interacting with the GPT-4.1-mini API
for the Sales Training AI application.
"""
import logging
import time
import os
import json
import random
import re
import traceback
from typing import List, Dict, Any, Optional, Union
import openai # Import the base library
from flask import current_app
from app.models import Conversation, Message, User, db
from app.services.openai_service import OpenAIService, get_openai_service
from app.services.conversation_state_manager import ConversationStateManager, ConversationPhase
from app.services.eleven_labs_service import ElevenLabsService, get_eleven_labs_service
from app.utils.logging_utils import setup_logger

# Configure logging
logger = logging.getLogger(__name__)

# Define Custom Exception
class GPT4oServiceError(Exception):
    """Custom exception for errors originating from the GPT4oService."""
    pass

# Constants
DEFAULT_MODEL = "gpt-4.1-mini"
DEFAULT_TEMPERATURE = 0.7
MAX_TOKENS = 4000
DEFAULT_TIMEOUT = 90  # seconds
DEFAULT_RETRIES = 3
DEFAULT_BACKOFF = 2
TEMPERATURE_RANGES = {
    "low": (0.1, 0.3),
    "medium": (0.4, 0.6),
    "high": (0.7, 0.9)
}

class GPT4oService:
    """Service for interacting with GPT-4.1-mini API."""
    
    _instance = None
    
    def __new__(cls, api_key=None):
        """Implement as singleton to ensure consistent client usage."""
        if cls._instance is None:
            cls._instance = super(GPT4oService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, api_key=None):
        """Initialize the OpenAI API client."""
        if getattr(self, '_initialized', False):
            logger.debug("GPT4oService already initialized, skipping initialization")
            return
            
        # Initialize phase_managers dictionary for conversation tracking
        self.phase_managers = {}
        logger.debug("Initialized empty phase_managers dictionary")
        
        # First try the provided API key
        current_api_key = api_key
        if current_api_key:
            logger.info("Using provided API key")
        
        # If no key provided, try to get from Flask app config or environment
        if not current_api_key:
            try:
                # Try to get from Flask app config
                logger.debug("Attempting to get API key from Flask config")
                current_api_key = current_app.config.get('OPENAI_API_KEY')
                if current_api_key:
                    logger.info("Using API key from Flask app config")
            except RuntimeError:
                # No Flask app context available
                logger.debug("No Flask app context available")
                pass
                
            # If still no key, try environment variable
            if not current_api_key:
                logger.debug("Trying to get API key from environment variable")
                current_api_key = os.environ.get('OPENAI_API_KEY')
                if current_api_key:
                    logger.info("Using API key from environment variable")
        
        # Log API key status (masked)
        if current_api_key:
            masked_key = f"{current_api_key[:4]}...{current_api_key[-4:]}" if len(current_api_key) > 8 else "[INVALID KEY]"
            logger.info(f"API key configured: {masked_key}")
        else:
            logger.error("No OpenAI API key found in any location")
            self.api_available = False
            self.client = None
            self._initialized = True
            return
            
        try:
            # Instantiate the OpenAI client with the API key
            self.client = openai.OpenAI(api_key=current_api_key)
            
            # Test the API key with a minimal API call
            logger.info("Testing API key with minimal request using new SDK client")
            test_response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # Use a known model for testing instead of DEFAULT_MODEL
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            
            # If we get here, the API key is valid
            logger.info("API key successfully validated")
            self.api_available = True
        except Exception as e:
            logger.error(f"Failed to initialize GPT4o API service with new SDK: {str(e)}")
            logger.error(f"Full exception details: {traceback.format_exc()}")
            self.api_available = False
            self.client = None
    
    def generate_response(
        self, 
        messages: List[Dict[str, str]],
        system_prompt: str = "",
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = MAX_TOKENS
    ) -> str:
        """
        Generate a response from GPT-4.1-mini based on conversation history.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: System prompt for the model
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        logger.info("📣 Generating response with GPT-4.1-mini")
        
        # Check if API is available
        if not hasattr(self, 'api_available') or not self.api_available:
            logger.error("GPT-4.1-mini API is not available. Cannot generate response.")
            logger.debug(f"api_available attribute check: hasattr={hasattr(self, 'api_available')}, value={getattr(self, 'api_available', None)}")
            raise GPT4oServiceError("GPT-4.1-mini API is not properly configured. Please check your API key.")
        
        try:
            # Format messages for OpenAI API
            formatted_messages = []
            has_non_empty_message = False
            
            # Add system prompt if provided
            if system_prompt:
                formatted_messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            for msg in messages:
                if msg.get('role') and msg.get('content') is not None:
                    # Only add non-empty messages or replace empty content with a placeholder
                    role = msg['role']
                    content = msg['content'].strip() if isinstance(msg['content'], str) else msg['content']
                    
                    if content:  # If content is not empty
                        formatted_messages.append({
                            "role": role,
                            "content": content
                        })
                        has_non_empty_message = True
            
            # If no valid messages found, add a placeholder message
            if not has_non_empty_message:
                logger.warning("No non-empty messages found, adding placeholder message")
                formatted_messages.append({
                    "role": "user",
                    "content": "Hello, I'm interested in learning more."
                })
            
            # Call the API with retry logic
            max_retries = DEFAULT_RETRIES
            backoff_factor = DEFAULT_BACKOFF
            
            for attempt in range(max_retries):
                try:
                    start_time = time.time()
                    logger.info(f"Sending request to GPT-4.1-mini API (attempt {attempt+1}/{max_retries})")
                    
                    # Log request details at debug level
                    logger.debug(f"System prompt (if in messages): {formatted_messages[0]['content'][:30] if formatted_messages and formatted_messages[0]['role'] == 'system' else 'No system prompt'}")
                    logger.debug(f"Number of messages: {len(formatted_messages)}")
                    
                    response = self.client.chat.completions.create(
                        model=DEFAULT_MODEL,
                        messages=formatted_messages,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                    
                    duration = time.time() - start_time
                    logger.info(f"GPT-4.1-mini API request completed in {duration:.2f}s")
                    
                    # Extract the assistant's response
                    if response and response.choices and len(response.choices) > 0:
                        return response.choices[0].message.content
                    else:
                        logger.error("Empty or invalid content received from GPT-4.1-mini API")
                        if attempt < max_retries - 1:
                            wait_time = backoff_factor ** attempt
                            logger.warning(f"Empty response, retrying in {wait_time}s")
                            time.sleep(wait_time)
                        else:
                            # Return fallback response instead of raising exception on final attempt
                            logger.warning("Returning fallback response after empty GPT-4.1-mini API responses")
                            return "I apologize, but I'm having trouble generating a response at the moment. Could you please try again or rephrase your message?"
                        
                except Exception as e:
                    if "rate_limit" in str(e).lower():
                        if attempt < max_retries - 1:
                            wait_time = backoff_factor ** attempt
                            logger.warning(f"Rate limit exceeded, retrying in {wait_time}s. Error: {e}")
                            time.sleep(wait_time)
                        else:
                            logger.error(f"Final rate limit error after {max_retries} attempts: {str(e)}")
                            raise GPT4oServiceError(f"GPT-4.1-mini API rate limit exceeded after {max_retries} attempts: {e}") from e
                    elif "api" in str(e).lower():
                        if attempt < max_retries - 1:
                            wait_time = backoff_factor ** attempt
                            logger.warning(f"API error, retrying in {wait_time}s. Error: {e}")
                            time.sleep(wait_time)
                        else:
                            logger.error(f"Final API error after {max_retries} attempts: {str(e)}")
                            raise GPT4oServiceError(f"GPT-4.1-mini API connection failed after {max_retries} attempts: {e}") from e
                    else:
                        if attempt < max_retries - 1:
                            wait_time = backoff_factor ** attempt
                            logger.warning(f"Unknown error, retrying in {wait_time}s. Error: {e}")
                            time.sleep(wait_time)
                        else:
                            logger.error(f"Final unknown error after {max_retries} attempts: {str(e)}")
                            raise GPT4oServiceError(f"GPT-4.1-mini API error after {max_retries} attempts: {e}") from e
            
            # If we get here, all retries failed
            logger.error(f"GPT-4.1-mini API failed to respond properly after {max_retries} attempts, using fallback response")
            return "I apologize, but I'm having trouble processing your request right now."
                
        except GPT4oServiceError:
             raise
        except Exception as e:
            error_details = str(e)
            logger.error(f"Unexpected error during GPT-4.1-mini API call: {error_details}")

            # Return a fallback response instead of raising an exception
            logger.error(f"Using fallback response for error: {error_details}")
            return "I apologize, but I'm experiencing a technical issue. Please try again or contact support if the problem persists."
    
    def _create_persona_generation_prompt(
        self, 
        user_profile_context: Dict[str, Any], 
        behavioral_shell_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Creates the prompt for the LLM to generate a customer persona.
        If behavioral_shell_data is provided, it instructs the LLM to use the shell
        and generate the remaining contextual details. Otherwise, it asks for a full persona.
        """
        product_service = user_profile_context.get("product_service", "a product/service")
        industry = user_profile_context.get("industry", "various industries")
        target_market = user_profile_context.get("target_market", "various businesses")
        experience = user_profile_context.get("experience_level", "intermediate")

        if behavioral_shell_data:
            shell_id = behavioral_shell_data.get("shell_id", "unknown_shell")
            
            prompt = f"""You are an AI assistant that creates detailed customer personas for sales roleplay.
You will be given:
1. Sales Context: The salesperson is selling '{product_service}' to the '{industry}' industry, targeting '{target_market}'. Their experience level is '{experience}'.
2. A "Behavioral Shell" defining the core personality, communication style, and various cues.

Your task is to:
A. STRICTLY ADHERE to ALL characteristics, styles, and cues defined in the provided Behavioral Shell.
   Shell ID: {shell_id}
   Key Shell Attributes to embody (from the provided Behavioral Shell):
    - Description Shell Narrative: {behavioral_shell_data.get("description_shell_narrative", "A standard persona.")}
    - Demographic Description Cues: {json.dumps(behavioral_shell_data.get("demographic_description_cues", {}))}
    - Linguistic Style Cue: {behavioral_shell_data.get("linguistic_style_cue", "standard professional English")}
    - Chattiness Level: {behavioral_shell_data.get("chattiness_level", "medium")}
    - Base Reaction Style: {behavioral_shell_data.get("base_reaction_style", "Neutral")}
    - Intelligence Level Cue: {behavioral_shell_data.get("intelligence_level_cue", "average")}
    - Trait Metrics Template: {json.dumps(behavioral_shell_data.get("trait_metrics_template", {"Balanced": 0.5}))}
    - Cognitive Biases Suggestions: {json.dumps(behavioral_shell_data.get("cognitive_biases_suggestions", {"Standard_Bias": True}))}
    - Buyer Archetype Cue: {behavioral_shell_data.get("buyer_type_archetype_cue", "standard buyer")}
    - Decision Authority Style Cue: {behavioral_shell_data.get("decision_authority_style_cue", "standard decision maker")}
    - Initial Emotional State Range: {json.dumps(behavioral_shell_data.get("initial_emotional_state_range", ["Neutral"]))}

B. Based on the Sales Context AND the Behavioral Shell, GENERATE the following SPECIFIC contextual details and FINALIZE attributes for the persona:
   - name: (string, e.g., 'Sarah Chen', 'David Miller')
   - role: (string, e.g., 'Marketing Manager at a {industry} company')
   - company_name: (string, a plausible company name for the '{industry}' sector)
   - business_description: (string, A detailed paragraph of 3-4 sentences. MUST include: what the company's main products/services are, who its typical customers are, its approximate size [e.g., startup, mid-sized (specify employee range like 50-200 if mid-sized), enterprise], and its market position or a key differentiator [e.g., innovator, cost leader, niche specialist]. Make this descriptive and specific.)
   - mission_statement: (string, A concise 1-2 sentence mission statement for the company.)
   - strategic_goals: (list of 2-3 strings, key strategic goals for the company for the next 1-2 years. e.g., 'Expand into the European market', 'Improve customer retention by 20%', 'Launch a flagship AI-powered analytics platform.')
   - longterm_personal_description: (object, with keys like "family_relationships_specifics", "education_specifics", "hobbies_interests_specifics", "dreams_ambitions_specifics". Generate plausible, brief details consistent with the shell's 'demographic_description_cues'.)
   - shortterm_personal_description: (object, with keys like "recent_life_events_specifics", "current_mood_influencers_specifics". Generate plausible, brief details.)
   - industry_context: (string, the specific industry they operate in, derived from '{industry}')
   - pain_points: (list of 3-4 strings, specific pain points this persona would have RELATED TO '{product_service}', considering their shell traits and the Sales Context.)
   - primary_concern: (string, their main worry/goal RELATED TO '{product_service}')
   - objections: (list of 2-3 strings, specific objections they would raise against '{product_service}', consistent with their shell traits and Sales Context.)
   - description_narrative: (string, a brief 2-3 sentence narrative overview combining key shell traits and the generated specifics, highlighting their main motivation regarding '{product_service}'.)
   
   Derived/Finalized attributes (based on Shell cues):
   - demographic_description: (object, with "age_group", "cultural_background", "communication_style_notes". Generate specific details inspired by the Shell's 'demographic_description_cues'.)
   - intelligence_level: (string, select/finalize from 'low', 'average', 'high' based on Shell's 'intelligence_level_cue'.)
   - trait_metrics: (object, finalize trait metrics based on the Shell's 'trait_metrics_template'. Adhere closely to the template, adjusting scores minimally if needed for coherence.) This will be used as 'personality_traits'.
   - emotional_state: (string, select a specific state from the Shell's 'initial_emotional_state_range', e.g., 'Focused' or 'Neutral'.)
   - buyer_type: (string, determine the final buyer type, e.g., 'Analytical', 'Economic', based on the Shell's 'buyer_type_archetype_cue'.)
   - decision_authority: (string, determine final decision authority, e.g., 'Final_Decision_Maker', 'Influencer_Recommender', based on the Shell's 'decision_authority_style_cue'.)
   - cognitive_biases: (object, select a few relevant biases based on the Shell's 'cognitive_biases_suggestions' and assign a strength (0.1-1.0) if applicable, e.g., {{"Status_Quo_Bias": 0.7}}.)

C. Output a single, valid JSON object. This object should be a MERGE of:
   1. Copied metadata and direct stylistic attributes from the provided Behavioral Shell (e.g., `shell_id`, `is_legendary_shell`, `special_rules_identifier`, `linguistic_style_cue`, `chattiness_level`, `base_reaction_style`).
   2. The new contextual details you generated in Section B (e.g., `name`, `role`, `company_name`, `business_description`, etc.).
   3. Attributes you derived/finalized in Section B based on cues from the Behavioral Shell (e.g., `demographic_description` (final object), `intelligence_level` (final value), `trait_metrics` (final object), `emotional_state` (final value), `buyer_type` (final value), `decision_authority` (final value), `cognitive_biases` (final object)).
   The final JSON structure should look like the example below and include all necessary fields for a complete persona that can be parsed by the system.

   Example JSON Structure:
   {{
     "shell_id": "{shell_id}", // Copied from input shell
     "is_legendary_shell": {behavioral_shell_data.get("is_legendary_shell", False)}, // Copied
     "special_rules_identifier": "{behavioral_shell_data.get("special_rules_identifier", "None")}", // Copied
     "linguistic_style_cue": "{behavioral_shell_data.get("linguistic_style_cue", "standard professional English")}", // Copied
     "chattiness_level": "{behavioral_shell_data.get("chattiness_level", "medium")}", // Copied
     "base_reaction_style": "{behavioral_shell_data.get("base_reaction_style", "Neutral")}", // Copied
     // Description shell narrative from shell is mainly for your guidance, the primary output is description_narrative below.

     // Generated contextual specifics (Section B):
     "name": "...",
     "role": "...",
     "company_name": "...",
     "business_description": "...",
     "mission_statement": "...",
     "strategic_goals": ["...", "..."],
     "longterm_personal_description": {{ "family_relationships_specifics": "...", "education_specifics": "...", ... }},
     "shortterm_personal_description": {{ "recent_life_events_specifics": "...", "current_mood_influencers_specifics": "..." }},
     "industry_context": "...", // Specific industry, derived from context
     "pain_points": ["...", "..."],
     "primary_concern": "...",
     "objections": ["...", "..."],
     "description_narrative": "...", // The NEW synthesized narrative based on shell and specifics

     // Derived/Finalized attributes based on Shell cues (Section B):
     "demographic_description": {{ "age_group": "...", "cultural_background": "...", "communication_style_notes": "..." }},
     "intelligence_level": "...", // e.g., "average" or "high"
     "trait_metrics": {{ "Analytical": 0.8, "Skeptical": 0.6, ... }}, // This will be used as 'personality_traits'
     "emotional_state": "...", // e.g., "Neutral" or "Focused"
     "buyer_type": "...", // e.g., "Analytical"
     "decision_authority": "...", // e.g., "Influencer_Recommender"
     "cognitive_biases": {{ "Status_Quo_Bias": 0.7, ... }}
   }}
Ensure the output is ONLY the JSON object. No other text before or after.
"""
        else:
            # Fallback to original full persona generation prompt (simplified)
            # This part needs to be the same detailed prompt we had before for generating a full persona from scratch
            # For now, this is a placeholder. We need to ensure it requests ALL fields, including the new detailed ones.
            prompt = f"""You are an expert AI assistant that generates detailed and realistic customer personas for sales roleplay simulations.
The persona should behave like a potential buyer evaluating a product/service.

Sales Context:
- Product/Service of Interest: {product_service}
- Sales Environment (B2B/B2C): Target is '{target_market}'
- Target Salesperson Experience Level: {experience}

Output a single, valid JSON object representing the persona. The JSON object MUST conform to the following structure. Strive for realism and provide rich detail for all fields:
{{
  "name": "string (e.g., 'Sarah Chen', 'David Miller')",
  "role": "string (e.g., 'Marketing Manager at a {industry} company', 'Small Business Owner in {industry}')",
  "company_name": "string (a plausible company name)",
  "description_narrative": "string (A brief 2-3 sentence narrative overview of the persona, their company, their primary motivation for considering the product/service. This should incorporate their role and general situation.)",
  "business_description": "string (A detailed paragraph of 3-4 sentences. MUST include: what the company's main products/services are, who its typical customers are, its approximate size [e.g., startup, mid-sized (specify employee range like 50-200 if mid-sized), enterprise], and its market position or a key differentiator [e.g., innovator, cost leader, niche specialist]. Make this descriptive and specific.)",
  "mission_statement": "string (A concise 1-2 sentence mission statement for the company.)",
  "strategic_goals": ["string (List 2-3 key strategic goals for the company for the next 1-2 years. e.g., 'Expand into the European market', 'Improve customer retention by 20%', 'Launch a flagship AI-powered analytics platform'.)"],
  
  "longterm_personal_description": {{
    "family_relationships_specifics": "string (e.g., 'Married, two young children', 'Single, focused on career')",
    "education_specifics": "string (e.g., 'MBA in Marketing', 'Learned on the job')",
    "hobbies_interests_specifics": "string (e.g., 'Enjoys hiking and reading tech blogs', 'Passionate about local community events')",
    "dreams_ambitions_specifics": "string (e.g., 'Aspires to be CMO', 'Wants to see their small business thrive')"
  }},
  "shortterm_personal_description": {{
    "recent_life_events_specifics": "string (e.g., 'Recently promoted', 'Dealing with a supplier issue')",
    "current_mood_influencers_specifics": "string (e.g., 'Slightly stressed due to deadlines but optimistic', 'Feeling cautious due to budget reviews')"
  }},
  
  "demographic_description": {{
    "age_group_suggestion": "string (e.g., '30-40', '50-60')",
    "cultural_background_cue": "string (e.g., 'Prefers direct communication', 'Values building rapport first')",
    "communication_style_preference_cue": "string (e.g., 'Likes data and facts', 'Responds well to stories and examples')"
  }},
  
  "linguistic_style_cue": "string (Describe their typical language style, e.g., 'Professional and articulate', 'Casual and friendly', 'Speaks with some regional dialect cues like occasional y'all')",
  "chattiness_level": "string (Enum: 'low', 'medium', 'high')",
  "base_reaction_style": "string (e.g., 'Skeptical_Challenger', 'Enthusiastic_EarlyAdopter', 'Cautious_Pragmatist', 'Relationship_Focused_Amiable')",
  "intelligence_level": "string (Enum: 'low', 'average', 'high')", // Corrected key name
  "trait_metrics": {{ // This object will be used as 'personality_traits'
    "Analytical": "float (0.1-1.0)", "Skeptical": "float (0.1-1.0)", "Openness_to_New_Ideas": "float (0.1-1.0)", 
    "Risk_Aversion": "float (0.1-1.0)", "Patience": "float (0.1-1.0)", "Confidence": "float (0.1-1.0)",
    "Detail_Oriented": "float (0.1-1.0)", "Impulsiveness": "float (0.1-1.0)", "Tech_Savviness_Impression": "float (0.1-1.0, how tech-savvy they seem)"
    // Add other relevant traits, aim for 7-10 diverse traits
  }},
  "emotional_state": "string (e.g., 'Neutral', 'Focused', 'Curious', 'Skeptical', 'Hurried', 'Optimistic', 'Guarded')", // Corrected key name
  "buyer_type": "string (e.g., 'Economic', 'User', 'Technical', 'Coach', 'Strategic', 'Innovator')",
  "decision_authority": "string (e.g., 'Final_Decision_Maker', 'Influencer_Recommender', 'Gatekeeper', 'User_With_Input')",
  "industry_context": "string (The specific industry they operate in, derived from '{industry}')", // Corrected key name
  
  "pain_points": ["string (List 3-5 significant challenges or pain points. Designate ONE as the 'True Core Pain Point' - genuinely significant and potentially solvable by '{product_service}'. Designate ONE or TWO others as 'Red Herring Pain Points' - issues the persona will initially emphasize as very problematic or urgent, even if they are ultimately less critical or not directly solvable by '{product_service}'. The remaining can be general business challenges. Ensure variety and make the red herrings sound convincing.)"],
  "primary_concern": "string (This should initially align with one of the 'Red Herring Pain Points' to make the misdirection more effective. However, the persona's deeper, underlying motivation and the problem that ultimately needs solving for a successful 'sale' in the simulation is the 'True Core Pain Point'. The persona should only reveal this true core pain after significant probing and trust-building from the salesperson.)",
  "objections": ["string (List 2-3 specific objections they would raise against '{product_service}')"],
  "cognitive_biases": {{ // Provide suggestions for common biases, AI should pick a few relevant ones and assign a strength (0.1-1.0)
    "Anchoring": "float (0.1-1.0, if relevant)", "Status_Quo_Bias": "float (0.1-1.0, if relevant)", 
    "Loss_Aversion": "float (0.1-1.0, if relevant)", "Confirmation_Bias": "float (0.1-1.0, if relevant)",
    "Availability_Heuristic": "float (0.1-1.0, if relevant)"
  }},
  
  "shell_id": "N/A_full_generation", // Indicate this was not from a shell
  "is_legendary_shell": false,
  "special_rules_identifier": "None"
}}
Ensure the output is ONLY the JSON object. No other text before or after.
"""
        return prompt

    def generate_customer_persona(
        self, 
        user_profile_context: Dict[str, Any],
        behavioral_shell_data: Optional[Dict[str, Any]] = None # Added new optional arg
    ) -> str:
        """
        Generates a detailed customer persona as a JSON string using GPT-4o.
        Can either fill in a behavioral shell or generate a full persona.
        """
        # Ensure client is initialized (though __init__ should handle it)
        if not hasattr(self, 'client') or not self.client:
             logger.error("OpenAI client not initialized in GPT4oService for generate_customer_persona.")
             return self._generate_fallback_text_persona(user_profile_context, behavioral_shell_data, is_error=True, error_message="OpenAI client not initialized.")

        prompt_text = self._create_persona_generation_prompt(user_profile_context, behavioral_shell_data)
        
        logger.info(f"Generating customer persona with shell: {bool(behavioral_shell_data)}. Prompt (first 200 chars): {prompt_text[:200]}")

        try:
            chat_completion = self.client.chat.completions.create(
                model=DEFAULT_MODEL, # Use DEFAULT_MODEL explicitly
                messages=[
                    {"role": "system", "content": "You are an AI assistant that generates detailed customer personas in JSON format."},
                    {"role": "user", "content": prompt_text}
                ],
                response_format={"type": "json_object"}, # Ensure JSON output
                temperature=0.8, # Allow for some creativity
                max_tokens=2500 # Increased to allow for detailed JSON, especially with shells
            )
            
            response_content = chat_completion.choices[0].message.content
            logger.info(f"Successfully received persona JSON from API (first 200 chars): {response_content[:200]}")
            
            # Basic validation: does it look like JSON?
            if response_content and response_content.strip().startswith("{") and response_content.strip().endswith("}"):
                # Further validation could be added here (e.g., trying to parse it)
                return response_content
            else:
                logger.error(f"API did not return valid JSON. Response: {response_content}")
                return self._generate_fallback_text_persona(user_profile_context, behavioral_shell_data, is_error=True, error_message="API did not return valid JSON.")

        except Exception as e:
            logger.error(f"Error calling OpenAI API for persona generation: {str(e)}", exc_info=True)
            # Fallback to a simpler text-based persona if JSON generation fails
            return self._generate_fallback_text_persona(user_profile_context, behavioral_shell_data, is_error=True, error_message=str(e))

    def _generate_fallback_text_persona(
        self, 
        user_profile_context: Dict[str, Any], 
        behavioral_shell_data: Optional[Dict[str, Any]] = None,
        is_error: bool = False, 
        error_message: Optional[str] = None
    ) -> str:
        """
        Generates a fallback persona as a structured text string if JSON generation fails or is not used.
        This text format should be parsable by the legacy text parsing in parse_persona_description.
        It now also tries to incorporate shell data if provided.
        """
        logger.warning(f"Generating fallback text persona. Error: {is_error}, Message: {error_message}")
        
        # Start with shell data if available, otherwise use defaults
        name = "Alex Fallback"
        # Role is generated contextually, so for fallback, it must be generic.
        role = "Business Professional (Fallback)" 
        base_reaction_style = behavioral_shell_data.get("base_reaction_style", "Cautious_Pragmatist") if behavioral_shell_data else "Cautious_Pragmatist"
        # Use intelligence_level_cue from shell, or default for full fallback
        intelligence_level_cue = behavioral_shell_data.get("intelligence_level_cue", "average") if behavioral_shell_data else "average"
        # Map cue to a simple value for the text string
        intelligence_level = intelligence_level_cue # simple mapping for fallback text
        
        chattiness = behavioral_shell_data.get("chattiness_level", "medium") if behavioral_shell_data else "medium"
        
        # Simplified trait metrics from shell's template or default
        traits_dict = {"Analytical": 0.7, "Skeptical": 0.6}
        if behavioral_shell_data and "trait_metrics_template" in behavioral_shell_data:
            traits_dict = behavioral_shell_data["trait_metrics_template"]
        
        trait_metrics_str = json.dumps(traits_dict)

        # Contextual details (very generic for fallback)
        product = user_profile_context.get("product_service", "your product")
        industry_ctx = user_profile_context.get("industry", "their industry")

        # Constructing a more structured text string that parse_persona_description can handle
        # This aims to provide enough keywords for the existing extract_* functions to work.
        fallback_persona_str = f"""Name: {name}
Role: {role} in the {industry_ctx}
Description Narrative: A fallback persona. Interested in {product} but needs more information.
Base Reaction Style: {base_reaction_style}
Intelligence Level Generated: {intelligence_level} 
Chattiness Level: {chattiness}
Trait Metrics: {trait_metrics_str}
Emotional State: Neutral
Buyer Type: Analytical
Decision Authority: Medium
Industry Context: {industry_ctx}
Pain Points:
- General efficiency concerns
- Understanding the value of {product}
Primary Concern: Making a good decision for their company.
Objections:
- "Is this the best option?"
- "How does it compare to others?"
Cognitive Biases: {{ "Status_Quo_Bias": 0.6 }}
Shell ID: {behavioral_shell_data.get("shell_id", "N/A_fallback") if behavioral_shell_data else "N/A_fallback"}
Is Legendary Shell: {behavioral_shell_data.get("is_legendary_shell", False) if behavioral_shell_data else False}
"""
        if is_error:
            logger.error(f"Fallback persona generated due to error: {error_message}")
            fallback_persona_str += f"\nError Info: Generation failed - {error_message}"
            
        return fallback_persona_str
    
    def generate_roleplay_response(
        self,
        persona: Dict[str, Any], 
        messages: List[Dict[str, str]], 
        conversation_state: Dict[str, Any] = None,
        user_info: Dict[str, Any] = None,
        conversation_id: str = None
    ) -> str:
        """
        Generate a roleplay response based on the conversation history, persona, and current state.
        
        Args:
            persona: Dictionary containing the customer persona information
            messages: List of message dictionaries with 'role' and 'content' keys
            conversation_state: Dictionary representing the current state analysis (optional)
            user_info: Additional information about the user (optional)
            conversation_id: Unique ID for the conversation (optional, mainly for tracking)
            
        Returns:
            Generated text response from the API
        """
        logger.info("🎭 Generating roleplay response for conversation")
        logger.debug(f"Using persona: {persona.get('name', 'Unknown')} - {persona.get('role', 'Unknown role')}")
        logger.debug(f"Conversation state: {conversation_state}")
        logger.debug(f"Conversation ID: {conversation_id}")
        
        # If messages is None or empty, return a generic greeting
        if not messages:
            logger.warning("Empty messages list passed to generate_roleplay_response")
            return "Hello! I'm ready to discuss your needs. How can I help you today?"
        
        try:
            # Create the system prompt that includes persona and conversation state information
            system_prompt = self._create_roleplay_system_prompt(persona, user_info, conversation_state)
            logger.debug(f"Created system prompt with {len(system_prompt)} characters")
            
            # Implement a sliding window for messages for voice MVP
            MAX_RECENT_TURNS_FOR_VOICE_MVP = 8 # Configurable, increased slightly for more immediate context
            if len(messages) > MAX_RECENT_TURNS_FOR_VOICE_MVP:
                logger.debug(f"Voice MVP: Truncating message history from {len(messages)} to last {MAX_RECENT_TURNS_FOR_VOICE_MVP} turns.")
                processed_messages = messages[-MAX_RECENT_TURNS_FOR_VOICE_MVP:]
            else:
                processed_messages = messages
            
            # Get generated response using the system prompt and message history
            response = self.generate_response(
                messages=processed_messages, # Use the potentially truncated history
                system_prompt=system_prompt,
                temperature=0.8  # Slightly higher temperature for more creative roleplay responses
            )
            
            logger.info(f"Generated roleplay response: {response[:50]}...\" if response else \"None\"")
            return response or "I apologize, but I'm having trouble processing your request right now."
            
        except Exception as e:
            logger.error(f"Error in generate_roleplay_response: {str(e)}", exc_info=True)
            # Return a generic error message
            return "I apologize, but I'm having trouble processing your request right now."
            
    def _create_roleplay_system_prompt(
        self,
        persona: Dict[str, Any],
        user_info: Dict[str, Any],
        conversation_state: Dict[str, Any] = None,
        conversation_id: str = None # Keep for potential future use
    ) -> str:
        salesperson_name = user_info.get("name", "Salesperson")
        
        # --- Persona Details Extraction ---
        # Basic Info
        persona_name = persona.get("name", "Customer")
        persona_role = persona.get("role", "Potential Customer")
        
        # Detailed Descriptions (NEW)
        business_desc = persona.get("business_description", "No specific business context provided.")
        
        longterm_personal_desc = persona.get("longterm_personal_description", {})
        longterm_family = longterm_personal_desc.get("family_relationships", "N/A")
        longterm_education = longterm_personal_desc.get("education", "N/A")
        longterm_hobbies = longterm_personal_desc.get("hobbies_interests", "N/A")
        longterm_dreams = longterm_personal_desc.get("dreams_ambitions", "N/A")
        
        shortterm_personal_desc = persona.get("shortterm_personal_description", {})
        shortterm_events = shortterm_personal_desc.get("recent_life_events", "N/A")
        shortterm_mood_impact = shortterm_personal_desc.get("current_mood_impact", "N/A")
        
        demographic_desc = persona.get("demographic_description", {})
        demographic_age = demographic_desc.get("age_group", "N/A")
        demographic_region = demographic_desc.get("region_cultural_background", "N/A")
        demographic_comm_style = demographic_desc.get("communication_style_notes", "N/A")

        # Core Persona Attributes
        base_reaction_style = persona.get("base_reaction_style", "Neutral")
        intelligence_level = persona.get("intelligence_level", "average")
        personality_traits = persona.get("personality_traits", {})
        emotional_state = persona.get("emotional_state", "Neutral")
        buyer_type = persona.get("buyer_type", "Unknown")
        decision_authority = persona.get("decision_authority", "Unknown")
        industry_context = persona.get("industry_context", "general")
        pain_points = persona.get("pain_points", [])
        primary_concern = persona.get("primary_concern", "finding a good solution.")
        objections = persona.get("objections", [])
        cognitive_biases = persona.get("cognitive_biases", {})
        linguistic_style_cue = persona.get("linguistic_style_cue", "standard professional English.")
        chattiness_level = persona.get("chattiness_level", "medium") # Get chattiness level

        # --- Conversation State Insights (if available) ---
        current_phase_val = "rapport" # Default if no state
        rapport_level = "Medium"
        if conversation_state:
            # Assuming conversation_state["likely_phase"] might be an Enum object or a string
            raw_phase = conversation_state.get("likely_phase", "rapport")
            if hasattr(raw_phase, 'value'): # Check if it's an Enum and has a .value attribute
                current_phase_val = raw_phase.value
            else: # Otherwise, assume it's already a string
                current_phase_val = str(raw_phase) 
            rapport_level = conversation_state.get("rapport_level", "Medium")

        # --- MVP Scenario Definition (Consistent) ---
        call_objective = "This is a 10-minute voice-to-voice discovery call. Your main goal is to understand the salesperson's offering and see if it addresses your primary concern. The salesperson (Cason) will likely try to build rapport and then uncover your needs."
        time_awareness_cue = "Be mindful that this is a relatively short call, so while natural conversation is good, discussions should be reasonably focused."
        voice_dynamics_cue = f"Communicate as if in a natural, real-time voice conversation. Use engaging language suitable for voice. Your linguistic style should be: {linguistic_style_cue}."

        # --- Chattiness Instructions --- (NEW SECTION)
        chattiness_instructions = ""
        if chattiness_level == "low":
            chattiness_instructions = "Keep initial small talk very brief and general (e.g., 'Hey Cason! It's been pretty busy recently, but good. How are you?'). Avoid sharing specific personal details unless directly and persistently asked. Transition to business topics more quickly or let the salesperson do so promptly."
        elif chattiness_level == "medium":
            chattiness_instructions = "Engage in polite, brief small talk. You can share a very light, general personal detail if it feels natural, but quickly steer back to the purpose of the call or let the salesperson guide. A typical professional interaction."
        elif chattiness_level == "high":
            chattiness_instructions = "Feel free to share a bit more about your day or a minor, relatable personal anecdote (e.g., 'Hey Cason! It's been a bit of a busy one, to be honest. Been having issues with my house this week, but I'm managing. Anyways, how are you doing?') if it feels natural in the flow of rapport building. You're more open to a slightly longer rapport phase but still aim to be respectful of the call's purpose."

        # --- System Prompt Construction ---
        prompt = f"""
You are an AI roleplaying as a customer named {persona_name}, a {persona_role}.
The salesperson's name is {salesperson_name}.

**YOUR CORE INSTRUCTIONS:**
1.  **Embody Persona Deeply:** Fully adopt the characteristics, background, and motivations defined below. Your responses should be consistent with this persona.
2.  **Natural Conversation:** Engage in a natural, flowing conversation. Avoid sounding robotic or just listing facts. Use language appropriate for a spoken, voice-to-voice interaction.
    - **Chattiness Note:** {chattiness_instructions} This primarily applies to rapport building and initial greetings.
3.  **Scenario Adherence:** Remember the context: {call_objective} {time_awareness_cue} {voice_dynamics_cue}
4.  **Objective-Driven Responses:** Your primary goal is to evaluate if the salesperson's solution can address your `primary_concern`. You are also looking to see if they understand your `pain_points`.
5.  **Dynamic Interaction:** React realistically to the salesperson's approach, questions, and statements based on your persona's traits and the current `conversation_state`.

**PERSONA PROFILE: {persona_name}**

**1. Business Context:**
   - Role & Company: You are {persona_name}, {persona_role}.
   - Business Description: {business_desc}
   - Industry: {industry_context}
   - Primary Business Concern: Your main professional challenge right now is {primary_concern}.
   - Key Pain Points: {json.dumps(pain_points)}

**2. Personal Background & Demographics (Draw from these for rapport and subtle cues):**
   - Long-term Details:
     - Family/Relationships: {longterm_family}
     - Education: {longterm_education}
     - Hobbies/Interests: {longterm_hobbies}
     - Dreams/Ambitions: {longterm_dreams}
   - Short-term Details:
     - Recent Life Events: {shortterm_events}
     - Impact on Current Mood/Focus: {shortterm_mood_impact}
   - Demographic Profile:
     - Age Group: {demographic_age}
     - Regional/Cultural Background: {demographic_region}
     - General Communication Style Notes: {demographic_comm_style}

**3. Behavioral Profile:**
   - Overall Emotional State: You are currently feeling: {emotional_state}. This might be influenced by your `shortterm_mood_impact`.
   - Base Reaction Style to New Ideas/Sales Pitches: {base_reaction_style}.
   - Intelligence Level (influences understanding and questions): {intelligence_level}.
   - Key Personality Traits (scores 0-1, higher means more prominent): {json.dumps(personality_traits)}. Let these subtly influence your responses. For example, high skepticism means you'll ask more probing questions or express doubt more readily.
   - Buyer Type: {buyer_type}.
   - Decision-Making Authority: {decision_authority}.
   - Potential Objections You Might Raise (if relevant): {json.dumps(objections)}.
   - Cognitive Biases That Might Affect Your Judgment: {json.dumps(cognitive_biases)}.

**4. Linguistic Style:**
   - Adopt the style: {linguistic_style_cue}. For instance, if it mentions Southern US English, you might occasionally use "y'all" if the context feels relaxed, or adopt a generally polite and slightly anecdotal way of speaking.

**INTERACTION GUIDELINES BASED ON CONVERSATION STATE:**

*   **Current Sales Phase:** The conversation is likely in the '{current_phase_val}' phase.
*   **Rapport Level:** Your current rapport with {salesperson_name} is '{rapport_level}'.

*   **If Phase is 'Rapport' or 'rapport':**
    *   Focus on building a connection if the salesperson initiates it.
    *   Your chattiness level ('{chattiness_level}') will guide how much personal detail you share. {chattiness_instructions}
    *   You can share small, relevant details from your `longterm_personal_description` or `shortterm_personal_description` if it feels natural and the salesperson is building trust. Don't overshare or dump information, especially if your chattiness is low.
    *   **Crucially, AVOID discussing or hinting at your `primary_concern` or `pain_points` during this rapport phase unless the salesperson asks a very direct and specific business-related question that forces a brief, high-level business-contextual answer. Your main goal here is to establish a comfortable, human connection. Keep the conversation general and light.**
    *   Respond to their attempts to build rapport in a way that aligns with your `demographic_description`'s communication style and `emotional_state`.
    *   If your `shortterm_mood_impact` is significant, it might subtly color your initial interactions.

*   **If Phase is 'Discovery' or 'discovery':**
    *   The salesperson will try to understand your needs. Answer their questions based on your `business_description`, `primary_concern`, and `pain_points`.
    *   **Do NOT proactively reveal your `primary_concern` or detailed `pain_points` early in this phase. When first asked about your business, challenges, or what you're looking for, respond with general statements about your role, company goals, or broad areas of operational focus (e.g., 'My main goal is to ensure my team is efficient,' or 'We're always looking to improve our project delivery.'). Do not mention specific problems or needs solvable by a product at this stage. If the salesperson asks a follow-up question drilling down, you can then mention a slightly more specific area of challenge (e.g., 'Ensuring smooth collaboration across departments requires ongoing attention'), but still avoid pinpointing your `primary_concern` or a key `pain_point`. It should typically take at least 2-3 increasingly specific questions from the salesperson for you to start revealing your true `primary_concern` or a significant, solvable `pain_point`. Only provide these deep details when their questions demonstrate genuine understanding and skillful, persistent probing.**
    *   **Subtle Misdirection (Red Herring): Your persona profile may contain 'Red Herring Pain Points' and a 'True Core Pain Point'. You might initially emphasize one of the 'Red Herring' issues as your main problem. Be convincing about this. Only if the salesperson skillfully probes past this, builds trust, and asks insightful questions that get to the heart of your underlying challenges, should you gradually start to reveal your 'True Core Pain Point'. This requires the salesperson to not just take your initial statements at face value but to dig deeper.**
    *   Your `personality_traits` (e.g., skepticism, detail-orientation) should influence the types of questions you ask back and the level of detail you require.
    *   If you have `cognitive_biases` like 'Status Quo Bias', you might express hesitation about change.

*   **If Phase is 'Presentation' or 'presentation':**
    *   Listen to how their solution addresses your stated `pain_points` and `primary_concern`.
    *   React based on your `base_reaction_style` and `personality_traits`. If skeptical, you might ask for proof or specific examples.
    *   This is where your `objections` might start to surface if the presentation doesn't align with your needs or raises concerns.

*   **If Phase is 'Objection Handling' or 'objection_handling':**
    *   If you've raised an `objection` (or one from your profile is triggered), express it clearly but politely, consistent with your communication style.
    *   Listen to their responses. Your `persuadability` (if defined in traits) or `skepticism` will influence how easily you are convinced.

*   **If Phase is 'Closing' or 'closing':**
    *   Your willingness to move forward will depend on how well your `primary_concern` and `pain_points` have been addressed, and your `decision_authority`.
    *   Refer to your `decision_authority` if they press for a decision you can't make alone.

**General Conversational Rules (Revised):**
-   **Engage Interactively & Vary Responses:** Engage in a natural, flowing conversation. While asking relevant questions is part of this, vary your responses. It's natural to sometimes offer a statement, an observation, an agreement, or an acknowledgement without an immediate follow-up question. Avoid ending every single turn with a question, especially if your persona's `chattiness_level` is 'low' or 'medium', or your `base_reaction_style` is more reserved. Let the conversation breathe.
-   **Maintain Consistency:** Once you state something or react in a certain way, try to remain consistent with that, unless the salesperson gives you a very good reason to change your mind.
-   **Handling Minor Gaffes/Misunderstandings:** If there's a minor conversational misunderstanding or if you use a phrase that's questioned (like an uncommon regionalism), react naturally based on your overall persona. For example:
    -   A 'Skeptical_Challenger' or someone with low 'agreeableness' might clarify directly and perhaps a bit bluntly.
    -   A persona with high 'agreeableness', a 'playful' trait (if defined), or 'high' chattiness might offer a lighthearted explanation, a playful deflection (e.g., jokingly blaming it on 'not enough coffee'), or feign mild, relatable embarrassment before smoothly continuing.
    -   A more 'Cautious_Pragmatist' or 'introverted' persona might offer a simple clarification without much elaboration.
    -   Consider your `emotional_state` and `demographic_comm_style` as well. The goal is a realistic and varied human-like recovery, not a scripted one.
-   **Reacting to Misaligned Sales Approaches:** If the salesperson makes a statement that seems to ignore your previously stated core needs, or makes a claim about their solution that feels like a stretch or doesn't address your primary concerns, your response should reflect this. Your `emotional_state` might shift (e.g., from 'Optimistic' to more 'Reserved' or 'Skeptical'). Your word choice should subtly signal this. For example:
    -   Instead of enthusiastic agreement, you might say, "Okay, I understand that works for some situations..." or "I see. And how does that specifically address [your core problem you already mentioned]?"
    -   If their claim feels overly boastful or dismissive of your concerns, a slight pause in your response or a more measured tone (which you'll imply through word choice like 'Hmm, interesting.' or 'Right.') would be appropriate before you try to steer the conversation back to your needs or ask a clarifying question. Your goal is to be a realistic buyer who needs to be convinced, not to be overtly confrontational unless your persona dictates that (e.g., a 'Skeptical_Challenger').
-   Pacing: Your goal is a natural conversational flow.
    -   **Initiating Rapport:** If the salesperson starts with rapport-building, engage genuinely according to your persona's chattiness and style.
    -   **Guiding the Transition:** Be patient and primarily let the salesperson guide the transition to business topics. If the rapport phase seems to be extending excessively (e.g., after 3-4 conversational exchanges from both sides with no move towards business from the salesperson), you can then make a gentle, natural segue. For example: "Well, it's been good chatting. Was there something specific you wanted to discuss regarding [your company/their product area] today?" or "I'm enjoying our conversation. To make sure we cover what you had in mind, what were you hoping to discuss?"
    -   **Avoid Abruptness:** Avoid sudden shifts to business unless your persona's `shortterm_mood_impact` or `demographic_comm_style` strongly dictates a very direct, no-nonsense approach from the outset. Even then, a brief acknowledgment of the social context is good (e.g., "Thanks for taking the time. I'm keen to discuss X...").
    -   **Time Awareness:** While building rapport is important, remember the overall 10-minute timeframe. The rapport phase should not consume an excessive portion of this time.
-   **Honesty (within role):** Be honest about your (persona's) needs and concerns.
-   **Formatting:** Your responses should be plain text, suitable for a voice interaction. Do not use markdown. Keep sentences relatively concise. Limit your responses to 1-3 sentences typically, unless elaborating on a key point. Avoid asking more than one, or at most two, explicit questions per turn.
-   **Focus:** Your primary goal is to determine if the salesperson's solution can genuinely help with your `primary_concern` and `pain_points`.
-   **Handling Persistent Mismatches:** If you have clearly stated your `primary_concern` and `pain_points`, and the salesperson, after 2-3 attempts from you to clarify or redirect, continues to offer solutions or features that do not address these core needs, you should begin to disengage. 
    -   Politely reiterate that you don't see a direct fit for your main challenges (e.g., "I appreciate the explanation, but I'm still not seeing how this directly helps with [your primary concern].").
    -   If they persist without addressing this fundamental mismatch, you can then more firmly but politely move to conclude the conversation (e.g., "Thank you for your time and the information. While it sounds interesting, I don't think this is the right solution for our core needs at this moment." or "I understand what you're offering now, but it doesn't seem to align with our immediate priorities. I appreciate your time today."). 
    -   Avoid getting drawn into endless loops of questioning about a clearly mismatched product. Your goal is a realistic interaction, and a real buyer would eventually end a call that isn't meeting their needs.

Remember, {salesperson_name} is practicing their sales skills. Your role is to be a realistic, consistent, and engaging customer based on this detailed profile.
"""
        return prompt
    
    def generate_initial_greeting(
        self, 
        persona: Dict[str, Any], 
        sales_info: Dict[str, Any] = None,
        conversation_id: str = None
    ) -> str:
        """
        Generate an initial greeting from the customer persona.
        
        Args:
            persona: Dictionary containing the customer persona information
            sales_info: Additional information about the sales context
            conversation_id: Unique ID for the conversation
            
        Returns:
            str: The generated greeting
        """
        try:
            # Create a new conversation ID if not provided
            if not conversation_id:
                conversation_id = f"init_{random.randint(1000, 9999)}"
            
            # Initialize phase manager if it doesn't exist for this conversation
            if conversation_id not in self.phase_managers:
                business_context = persona.get("business_context", "B2C")
                self.phase_managers[conversation_id] = ConversationStateManager(business_context)
            
            # Format persona for the prompt
            persona_description = self._format_persona_for_prompt(persona)
            
            # Get system prompt for initial greeting (always in RAPPORT phase for initial greeting)
            # The phase manager will be in RAPPORT phase by default
            phase_manager = self.phase_managers[conversation_id]
            
            # If provided, get the user's name
            user_name = sales_info.get("salesperson_name", "User") if sales_info else "User"
            
            # Get appropriate system prompt for the rapport phase
            system_prompt = phase_manager.get_system_prompt(
                persona=persona_description,
                sales_info=sales_info,
                user_name=user_name
            )
            
            # Add specific instructions for the initial greeting
            greeting_instruction = "\n\nADDITIONAL GUIDANCE: Create a brief, natural opening greeting as the customer. Your greeting must be simple and professional. IMPORTANT RULES: (1) NEVER use the salesperson's name unless they've already introduced themselves, (2) DO NOT ask personal questions in your initial greeting, (3) Respond with 1 brief sentence only, and (4) DO NOT ask multiple questions. Example appropriate responses: 'Hello there.' or 'Good morning, how are you?'"
            
            system_prompt += greeting_instruction
            
            # Prepare messages
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Hello, thanks for taking the time to speak with me today."}
            ]
            
            # Generate response with slightly higher temperature for creative greeting
            response = self.generate_response(
                messages=messages,
                temperature=0.7,
                max_tokens=100
            )
            
            # Process the response
            if response.choices:
                greeting = response.choices[0].message.content
                
                # Post-process to remove any artifacts
                greeting = self._post_process_response(greeting)
                
                return greeting
            else:
                logger.warning("Empty initial greeting response")
                return "Hi there. What can I help you with today?"
                
        except Exception as e:
            logger.error(f"Error generating initial greeting: {str(e)}")
            return "Hello. How can I help you today?"
    
    def _format_persona_for_prompt(self, persona: Dict[str, Any]) -> str:
        """Format the persona dictionary into a string description for the prompt."""
        # Extract core persona fields
        name = persona.get("name", "Customer")
        age = persona.get("age", "Unknown")
        gender = persona.get("gender", "Not specified")
        occupation = persona.get("occupation", "Not specified")
        background = persona.get("background", "")
        personality = persona.get("personality", "")
        
        # Format the description
        description = f"""Name: {name}
Age: {age}
Gender: {gender}
Occupation: {occupation}
Background: {background}
Personality: {personality}"""

        # Add additional fields if present
        if "pain_points" in persona:
            description += f"\nPain Points: {persona['pain_points']}"
            
        if "goals" in persona:
            description += f"\nGoals: {persona['goals']}"
            
        if "communication_style" in persona:
            description += f"\nCommunication Style: {persona['communication_style']}"
            
        if "decision_factors" in persona:
            description += f"\nDecision Factors: {persona['decision_factors']}"
            
        return description

    def get_completion(self, prompt, temperature=0.7, max_tokens=2000):
        """
        Get a completion from the GPT-4o mini API for a raw text prompt.
        
        Args:
            prompt: The text prompt to send
            temperature: Controls randomness (0-1)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text
        """
        try:
            if not self.api_available:
                logger.error("GPT-4o mini API is not available")
                return "Error: GPT-4o mini service not available"
            
            # Create chat completion
            response = self.client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that provides well-formatted responses."},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract text
            if response.choices and len(response.choices) > 0:
                text = response.choices[0].message.content
                # No need for punctuation spacing fix - the model already formats text correctly
                return text
            else:
                return "Error: No response generated"
            
        except Exception as e:
            logger.error(f"Error in get_completion: {str(e)}")
            return f"Error: {str(e)}"

# Create a singleton instance
_gpt4o_service = None

def get_gpt4o_service() -> GPT4oService:
    """
    Get the GPT-4.1-mini service singleton instance.
    
    Returns:
        GPT4oService: An instance of the GPT-4.1-mini service
    """
    global _gpt4o_service
    if _gpt4o_service is None:
        _gpt4o_service = GPT4oService()
    return _gpt4o_service

def get_completion(
    prompt: str, 
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = MAX_TOKENS
) -> str:
    """
    Simple helper to get a completion from GPT-4.1-mini.
    
    Args:
        prompt: The user's prompt text
        temperature: Sampling temperature (0.0 to 1.0)
        max_tokens: Maximum tokens to generate
        
    Returns:
        Generated text response
    """
    service = get_gpt4o_service()
    return service.generate_response(
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens
    ) 