"""
Standalone Paraphrase Microservice

This microservice provides a CSRF-free endpoint for paraphrasing onboarding responses
using OpenAI. It runs on port 8081 to avoid conflicts with the main application.
"""

import json
import uuid
import re
import os
import sys
import logging
import openai
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import dotenv

# Load environment variables
dotenv.load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable or disable detail logging
logging_enabled = True  # Set to False to reduce log output in production

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for this microservice

# Configure OpenAI
openai_api_key = os.environ.get("OPENAI_API_KEY")
if not openai_api_key:
    logger.warning("No OpenAI API key found in environment variables. Using demo mode.")

client = openai.OpenAI(api_key=openai_api_key) if openai_api_key else None

# Database of business types for comparison
BUSINESS_DATABASE = {
    "software": {
        "keywords": ["software", "app", "platform", "system", "saas", "application"],
        "examples": ["CRM software", "project management tool", "email marketing platform"]
    },
    "physical_products": {
        "keywords": ["product", "device", "hardware", "equipment", "gadget", "item"],
        "examples": ["furniture", "electronics", "clothing", "appliances"]
    },
    "services": {
        "keywords": ["service", "consulting", "support", "assistance", "help"],
        "examples": ["consulting", "marketing agency", "legal services", "accounting"]
    },
    "education": {
        "keywords": ["training", "course", "education", "learning", "teaching"],
        "examples": ["online courses", "coaching", "training programs", "workshops"]
    },
    "healthcare": {
        "keywords": ["health", "medical", "wellness", "therapy", "treatment"],
        "examples": ["medical devices", "healthcare services", "wellness programs"]
    },
    "retail": {
        "keywords": ["store", "shop", "retail", "sell", "merchandise"],
        "examples": ["ecommerce", "brick and mortar store", "direct sales"]
    },
    "food": {
        "keywords": ["food", "restaurant", "meal", "catering", "beverage"],
        "examples": ["restaurant", "food delivery", "catering service"]
    },
    "finance": {
        "keywords": ["finance", "financial", "money", "investment", "banking"],
        "examples": ["financial advisory", "banking services", "investment platform"]
    }
}

# Define a helper function to get the current onboarding question text
ONBOARDING_QUESTIONS_TEXT = {
    "core_q1_product_value": "To help create realistic scenarios, please tell me specifically about:\n\n1. Your primary product or service.\n2. The main problem you solve or the core value you provide to them.\n\nBeing specific will help the AI understand your context better.",
    "core_q2_audience": "Who are your primary customers or target audience?",
    "core_q4_style": """1. Do you primarily sell to other businesses (B2B), directly to consumers (B2C), or a mix of both?

2. What's your average sales cycle length (e.g., a few days, several weeks, multiple months)?

3. How long is a typical sales call or main interaction (e.g., 15-30 minutes, 1 hour, multiple meetings)?""",
    "core_q4_methodology": """Thanks for that info. Now, which sales methodology or style would you like to focus on? Some common examples include:

1. Consultative: Acting as a trusted advisor.
2. Challenger: Teaching, tailoring the message, and taking control.
3. SPIN: Guiding via Situation, Problem, Implication, and Need-payoff questions.
4. General Practice: A mix of approaches.

You can choose one, mention another, or just say 'General Practice' or 'Not Sure' – we can help suggest one based on your previous answers!""",
    "core_q4_confirm": "Confirmation step after user responds to the methodology question.",
    "core_q5_goal": "What's one key area or skill you're hoping to improve with PitchIQ Ascend right now?",
    "welcome": "This stage should ideally not be directly requested by frontend for a question."
}

STAGE_ORDER = [
    "welcome",
    "core_q1_product_value",
    "core_q2_audience",
    "core_q4_style",
    "core_q4_methodology",
    "core_q5_goal",
    "complete"
]

def get_question_text_for_stage(stage_key):
    return ONBOARDING_QUESTIONS_TEXT.get(stage_key, "the current topic")

# --- NEW HELPER: Extract Initial Business Details ---
def _extract_initial_business_details_llm(user_input: str, client_instance) -> dict:
    """
    Uses an LLM to extract initial business details from the user's input
    provided at the core_q1_product_value stage.
    """
    if not client_instance:
        logger.warning("OpenAI client not configured. Skipping initial business details extraction.")
        return {}

    prompt = f"""
Analyze the following user's business description. The user was asked:
"To help create realistic scenarios, please tell me specifically about:
1. Your primary product or service.
2. The main problem you solve or the core value you provide to them."

User's business description:
"{user_input}"

Extract the following information and return it as a valid JSON object with these exact keys:
- "business_name": (string, if clearly stated or inferable, otherwise null)
- "product_service_summary": (string, a concise summary of what they sell/do)
- "primary_value_proposition": (string, the main problem solved or value provided)
- "initial_target_audience_keywords": (list of strings, keywords related to their likely target audience, if mentioned or strongly implied, otherwise an empty list)
- "business_model_guess": (string, make a preliminary guess from choices: "B2B", "B2C", "SaaS", "Service", "Retail", "Manufacturing", "Consulting", "Education", "Healthcare", "Finance", "E-commerce", "Other", "Unknown")

Focus on extracting information directly present or very strongly implied in the text.
If a piece of information is not present, use null for strings or an empty list for lists.
Ensure your entire output is ONLY the valid JSON object. Do not include any other text before or after it.
JSON Output:
"""
    details = {}
    try:
        completion = client_instance.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=[
                {"role": "system", "content": "You are an expert at extracting structured data from text and outputting it as a single, valid JSON object. Do not include any explanatory text before or after the JSON object."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2, # Low temperature for factual extraction
            response_format={"type": "json_object"}
        )
        extracted_json_str = completion.choices[0].message.content
        extracted_data = json.loads(extracted_json_str)
        
        # Validate expected keys and types, provide defaults if necessary
        details = {
            "business_name": extracted_data.get("business_name"),
            "product_service_summary": extracted_data.get("product_service_summary", "Not specified"),
            "primary_value_proposition": extracted_data.get("primary_value_proposition", "Not specified"),
            "initial_target_audience_keywords": extracted_data.get("initial_target_audience_keywords", []),
            "business_model_guess": extracted_data.get("business_model_guess", "Unknown"),
        }
        logger.info(f"Initial business details extracted: {details}")
    except json.JSONDecodeError as e:
        logger.error(f"JSONDecodeError in _extract_initial_business_details_llm: {e}. Raw response: '{extracted_json_str if 'extracted_json_str' in locals() else 'Response not captured'}'")
        details = {"error": "Failed to parse LLM response for initial details", "raw_response": extracted_json_str if 'extracted_json_str' in locals() else 'Response not captured'}
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in _extract_initial_business_details_llm: {str(e)}\\n{error_trace}")
        details = {"error": str(e)}
    return details

# MODIFIED HELPER FUNCTION for extracting sales environment details
def _extract_sales_environment_details_llm(sales_env_text: str, client_instance, existing_details: dict = None, previous_ai_question_with_suggestions: str = None) -> dict:
    logger.info(f"Attempting to extract structured sales environment details from: {sales_env_text[:100]}...")
    if previous_ai_question_with_suggestions:
        logger.info(f"With context from previous AI question: {previous_ai_question_with_suggestions[:100]}...")

    # Pre-parse AI Suggestions from the previous AI question text
    parsed_suggested_mix = "Unclear"
    parsed_suggested_cycle = "Unclear"
    parsed_suggested_interaction = "Unclear"

    # --- NEW: Affirmation check ---
    affirmation_phrases = [
        "yes", "yeah", "yep", "yup", "sure", "ok", "okay", "sounds good", 
        "that's good", "that is good", "looks good", "that looks good",
        "sounds great", "that sounds great", "looks great", "that looks great",
        "perfect", "that's perfect", "that is perfect", "all perfect",
        "correct", "that's correct", "that is correct",
        "accurate", "that's accurate", "that is accurate",
        "great", "awesome", "excellent", "wonderful",
        "these sound good", "those sound good", "they sound good",
        "these look good", "those look good", "they look good",
        "these sound great", "those sound great", "they sound great",
        "these look great", "those look great", "they look great",
        "these are good", "those are good", "they are good",
        "these are great", "those are great", "they are great",
        "these are perfect", "those are perfect", "they are perfect",
        "these work", "those work", "they work",
        "these all sound good", "those all sound good",
        "these all look good", "those all look good",
        "these all sound great", "those all sound great",
        "these all look great", "those all look great",
        "these all are good", "those all are good",
        "these all are great", "those all are great",
        "these all are perfect", "those all are perfect",
        "these all work", "those all work"
    ]
    user_input_lower_stripped = sales_env_text.strip().lower().rstrip('.!')
    is_affirmation = any(phrase == user_input_lower_stripped for phrase in affirmation_phrases)
    # --- END NEW ---

    # --- Parsed suggestions from the immediately preceding AI message ---
    parsed_suggested_mix_immediate = "Unclear"
    parsed_suggested_cycle_immediate = "Unclear"
    parsed_suggested_interaction_immediate = "Unclear"

    if previous_ai_question_with_suggestions:
        suggestion_pattern = r"^\s*(?:\*\s*)?(?:`)?AI Suggestion:\s*([^`\n]+)(?:`)?" 
        all_suggestion_lines = re.findall(suggestion_pattern, previous_ai_question_with_suggestions, re.MULTILINE | re.IGNORECASE)
        logger.info(f"Found suggestion lines via regex from immediate previous AI message: {all_suggestion_lines}")
        if len(all_suggestion_lines) >= 1: parsed_suggested_mix_immediate = all_suggestion_lines[0].strip()
        if len(all_suggestion_lines) >= 2: parsed_suggested_cycle_immediate = all_suggestion_lines[1].strip()
        if len(all_suggestion_lines) >= 3: parsed_suggested_interaction_immediate = all_suggestion_lines[2].strip()
        # Fallback logic for potentially out-of-order or missing suggestions from regex (simplified for brevity)
        # This part is more about extracting from *explicit* `AI Suggestion:` lines if present.

    # --- Determine the true source of AI suggestions for the LLM prompt context ---
    # These will be used if the user affirms something or doesn't mention it.
    effective_ai_sugg_mix = parsed_suggested_mix_immediate
    effective_ai_sugg_cycle = parsed_suggested_cycle_immediate
    effective_ai_sugg_interaction = parsed_suggested_interaction_immediate
    ai_suggestions_source_for_llm_context = previous_ai_question_with_suggestions

    logger.info(f"[DEBUG PRE-UNSURE CHECK] Initial effective suggestions: Mix='{effective_ai_sugg_mix}', Cycle='{effective_ai_sugg_cycle}', Interaction='{effective_ai_sugg_interaction}'")
    logger.info(f"[DEBUG PRE-UNSURE CHECK] existing_details: {existing_details}")

    if existing_details and existing_details.get('user_input_was_unsure'):
        logger.info("User was previously unsure. Prioritizing stored original AI suggestions for LLM context.")
        effective_ai_sugg_mix = existing_details.get('b2b_b2c_mix_suggestion', parsed_suggested_mix_immediate)
        effective_ai_sugg_cycle = existing_details.get('sales_cycle_length_suggestion', parsed_suggested_cycle_immediate)
        effective_ai_sugg_interaction = existing_details.get('typical_interaction_time_suggestion', parsed_suggested_interaction_immediate)
        logger.info(f"[DEBUG C_UNSURE recovery INSIDE IF] Updated effective suggestions: Mix='{effective_ai_sugg_mix}', Cycle='{effective_ai_sugg_cycle}', Interaction='{effective_ai_sugg_interaction}'")
        ai_suggestions_source_for_llm_context = (
            f"Context: The user was previously unsure. The AI's relevant prior suggestions were: "
            f"B2B/B2C Mix: '{effective_ai_sugg_mix}', "
            f"Sales Cycle: '{effective_ai_sugg_cycle}', "
            f"Interaction Time: '{effective_ai_sugg_interaction}'. "
            f"The user is now responding to a clarifying question: '{previous_ai_question_with_suggestions}'"
        )
        logger.info(f"Constructed AI suggestion context for LLM (due to prior user uncertainty): {ai_suggestions_source_for_llm_context}")
        logger.info(f"[DEBUG C_UNSURE recovery] Effective suggestions before LLM: Mix='{effective_ai_sugg_mix}', Cycle='{effective_ai_sugg_cycle}', Interaction='{effective_ai_sugg_interaction}'")
    # --- END Determine effective AI suggestions ---

    # --- Bypass LLM for clear affirmations IF NOT in the C_UNSURE recovery flow ---
    # We want the LLM to process the response to the C_UNSURE clarifying question.
    can_bypass_llm = not (existing_details and existing_details.get('user_input_was_unsure'))
    if can_bypass_llm and is_affirmation and effective_ai_sugg_mix != "Unclear" and effective_ai_sugg_cycle != "Unclear" and effective_ai_sugg_interaction != "Unclear":
        logger.info("User input is a clear affirmation and suggestions were successfully pre-parsed (and not in C_UNSURE recovery). Bypassing LLM intent detection.")
        extracted_q4_data = {
            "b2b_b2c_mix": effective_ai_sugg_mix,
            "sales_cycle_length": effective_ai_sugg_cycle,
            "typical_interaction_time": effective_ai_sugg_interaction,
            "key_sales_activities_implied": [], 
            "primary_focus_confirmation": f"{effective_ai_sugg_mix} focus confirmed" if effective_ai_sugg_mix not in ["Unclear", "Not specified", None] else "N/A"
        }
        # Ensure existing details are merged correctly when bypassing
        if existing_details is None:
            existing_details = {}
        final_details_structure = {
            "business_name": existing_details.get("business_name"),
            "product_service_summary": existing_details.get("product_service_summary", "Not specified"),
            "primary_value_proposition": existing_details.get("primary_value_proposition", "Not specified"),
            "initial_target_audience_keywords": existing_details.get("initial_target_audience_keywords", []),
            "business_model_guess": existing_details.get("business_model_guess", "Unknown"),
            **extracted_q4_data, # Add the bypassed data
            "error": existing_details.get("error"), 
            "error_q4_extraction": None, 
            "raw_response_q4": "Bypassed LLM for Q4 intent/extraction due to clear affirmation."
        }
        logger.info(f"Final merged sales environment details (LLM bypass): {final_details_structure}")
        return final_details_structure
    # --- END NEW ---

    if not client_instance:
        logger.warning("OpenAI client not configured. Skipping sales environment extraction.")
        if existing_details:
            existing_details.setdefault("extraction_error_q4", "OpenAI client not configured for Q4 extraction")
            # Also populate with pre-parsed details if available, as a last resort
            existing_details.setdefault("b2b_b2c_mix", parsed_suggested_mix_immediate if parsed_suggested_mix_immediate != "Unclear" else existing_details.get("b2b_b2c_mix", "Unclear"))
            existing_details.setdefault("sales_cycle_length", parsed_suggested_cycle_immediate if parsed_suggested_cycle_immediate != "Unclear" else existing_details.get("sales_cycle_length", "Unclear"))
            existing_details.setdefault("typical_interaction_time", parsed_suggested_interaction_immediate if parsed_suggested_interaction_immediate != "Unclear" else existing_details.get("typical_interaction_time", "Unclear"))
            return existing_details
        return {
            "b2b_b2c_mix": parsed_suggested_mix_immediate, 
            "sales_cycle_length": parsed_suggested_cycle_immediate, 
            "typical_interaction_time": parsed_suggested_interaction_immediate,
            "error": "OpenAI client not configured."
        }

    extraction_prompt = f"""
Your primary task is to determine the user's intent based on their USER RESPONSE ("{sales_env_text}") given the AI QUESTION CONTEXT ('''{previous_ai_question_with_suggestions}''' ). The AI QUESTION CONTEXT contains the AI's previous suggestions for "b2b_b2c_mix", "sales_cycle_length", and "typical_interaction_time".

Possible Intents:
  A) User provides EXPLICIT new details/corrections for one or more sales environment aspects. They might also affirm other aspects or not mention them.
  B) User gives a GENERAL AFFIRMATION of ALL of AI's previous suggestions (e.g., "yes", "sounds good", "that's correct", "all sounds perfect", "that works").
  C) User's response is unclear, provides no information about these specific details, or asks an unrelated question.

Output your determination for the User Intent (A, B, or C) AND the corresponding JSON.

If User Intent is A:
  Carefully analyze the USER RESPONSE.
  For EACH of the three aspects ("b2b_b2c_mix", "sales_cycle_length", "typical_interaction_time"):
    - FIRST, check if the USER RESPONSE EXPLICITLY states a new value or correction for this specific aspect.
    - IF IT DOES, you MUST use the user's new value for this aspect in your extracted details. The user's explicit statement for an aspect takes absolute precedence.
    - IF THE USER RESPONSE DOES NOT explicitly state a new value for this specific aspect (i.e., they don't mention it, or they affirm the AI's suggestion for it, e.g., by saying "the mix is fine but change the cycle to 2 weeks"):
        THEN, you MUST use the corresponding AI SUGGESTION for this aspect from the AI QUESTION CONTEXT.
        If an AI suggestion for such an unmentioned/affirmed aspect cannot be clearly identified in the AI QUESTION CONTEXT, use "User Confirmed AI Suggestion (Unspecified)" for that field.
  Also extract "key_sales_activities_implied" (list of strings, from user response if any, otherwise empty) and "primary_focus_confirmation" (string, a brief summary of what was confirmed/changed, e.g., "User specified B2C, confirmed AI's suggestion for cycle, and updated interaction to 30 mins") from the USER RESPONSE and your analysis.
  Return JSON: {{""intent"": "A", ""details"": {{""b2b_b2c_mix"": "...", ""sales_cycle_length"": "...", ""typical_interaction_time"": "...", ""key_sales_activities_implied"": [], ""primary_focus_confirmation"": "..."}} }}
  Example: AI QUESTION CONTEXT suggests Mix: B2B, Cycle: Weeks, Interaction: 1hr. USER RESPONSE is "Actually, it's B2C. The cycle you suggested is fine. Interactions are typically 30 minutes.".
  Output: {{""intent"": "A", ""details"": {{""b2b_b2c_mix"": "B2C" (from user), ""sales_cycle_length"": "Weeks" (from AI context as user affirmed), ""typical_interaction_time"": "30 minutes" (from user), ...}} }}

If User Intent is B:
  Return JSON: {{""intent"": "B"}}

If User Intent is C:
  Return JSON: {{""intent"": "C", ""details"": {{""b2b_b2c_mix"": "Unclear", ""sales_cycle_length"": "Unclear", ""typical_interaction_time"": "Unclear", ""key_sales_activities_implied"": [], ""primary_focus_confirmation"": "N/A"}} }}

AI QUESTION CONTEXT was:
---
{previous_ai_question_with_suggestions}
---
The USER RESPONSE is:
---
{sales_env_text}
---

Your output MUST be a single valid JSON object containing the 'intent' and, if applicable, 'details'.
Example for Intent A (user provides new info): {{""intent"": "A", ""details"": {{""b2b_b2c_mix"": "B2B", ""sales_cycle_length"": "Several Months", ""typical_interaction_time"": "1 hour", ""key_sales_activities_implied"": [""demos""], ""primary_focus_confirmation"": "B2B focus confirmed, cycle is several months, interaction 1 hour"}} }}
Example for Intent B (affirmation): {{""intent"": "B"}}
Example for Intent C (unclear): {{""intent"": "C", ""details"": {{""b2b_b2c_mix"": "Unclear", ""sales_cycle_length"": "Unclear", ""typical_interaction_time"": "Unclear", ""key_sales_activities_implied"": [], ""primary_focus_confirmation"": "N/A"}} }}
"""

    extracted_q4_data = {}
    raw_llm_response = "Not captured"
    try:
        completion = client_instance.chat.completions.create(
            model="gpt-4o-mini", # Changed from gpt-3.5-turbo-0125
            messages=[
                {"role": "system", "content": "You are an expert at determining user intent and extracting structured data into JSON as per instructions."},
                {"role": "user", "content": extraction_prompt}
            ],
            temperature=0.3, # Slightly lower temperature for more deterministic paraphrasing
            max_tokens=600 # Added max_tokens
        )
        raw_llm_response = completion.choices[0].message.content
        logger.info(f"RAW LLM Response for Sales Environment Intent/Extraction:\n{raw_llm_response}")
        
        llm_output_data = json.loads(raw_llm_response) 
        intent = llm_output_data.get("intent")

        if intent == "C":
            uncertain_keywords = ["not sure", "don't know", "dont know", "no idea", "haven't sold", "havent sold", "clueless"]
            if any(keyword in sales_env_text.lower() for keyword in uncertain_keywords):
                logger.info("User input indicates uncertainty and LLM classified as Intent C. Overriding to C_UNSURE.")
                c_unsure_specific_details = {
                    "intent": "C_UNSURE",
                    "b2b_b2c_mix_suggestion": effective_ai_sugg_mix, # Store the suggestions that were in play
                    "sales_cycle_length_suggestion": effective_ai_sugg_cycle,
                    "typical_interaction_time_suggestion": effective_ai_sugg_interaction,
                    "user_input_was_unsure": True,
                    "error_q4_extraction": None, 
                    "raw_response_q4": raw_llm_response + " (Interpreted as C_UNSURE)"
                }
                if existing_details is None: existing_details = {}
                final_details_structure = {
                    **existing_details,
                    **c_unsure_specific_details 
                }
                logger.info(f"Final merged sales environment details (C_UNSURE): {final_details_structure}")
                return final_details_structure

        if intent == "B":
            logger.info("User Intent is B (Affirmation). Using system pre-parsed AI suggestions.")
            
            final_mix_to_use = effective_ai_sugg_mix
            final_cycle_to_use = effective_ai_sugg_cycle
            final_interaction_to_use = effective_ai_sugg_interaction

            if existing_details and existing_details.get('user_input_was_unsure'):
                logger.info("Intent B after C_UNSURE recovery: Using stored original suggestions.")
                final_mix_to_use = existing_details.get('b2b_b2c_mix_suggestion', effective_ai_sugg_mix)
                final_cycle_to_use = existing_details.get('sales_cycle_length_suggestion', effective_ai_sugg_cycle)
                final_interaction_to_use = existing_details.get('typical_interaction_time_suggestion', effective_ai_sugg_interaction)
            
            logger.info(f"[DEBUG Intent B Path] Using suggestions: Mix='{final_mix_to_use}', Cycle='{final_cycle_to_use}', Interaction='{final_interaction_to_use}'")
            extracted_q4_data = {
                "b2b_b2c_mix": final_mix_to_use,
                "sales_cycle_length": final_cycle_to_use,
                "typical_interaction_time": final_interaction_to_use,
                "key_sales_activities_implied": [], 
                "primary_focus_confirmation": f"{final_mix_to_use} focus confirmed" if final_mix_to_use not in ["Unclear", "Not specified", None] else "N/A"
            }
        elif intent == "A" or intent == "C": # Intent C here means non-unsure C
            logger.info(f"User Intent is {intent}. Using details from LLM JSON.")
            extracted_q4_data = llm_output_data.get("details", { 
                "b2b_b2c_mix": "Unclear", "sales_cycle_length": "Unclear", 
                "typical_interaction_time": "Unclear", "key_sales_activities_implied": [], "primary_focus_confirmation": "N/A"
            }) # Default to unclear structure if details somehow missing
        else:
            logger.error(f"Unknown or missing intent from LLM: '{intent}'. Raw response: {raw_llm_response}. Falling back to Unclear.")
            extracted_q4_data = { # Fallback to unclear
                "b2b_b2c_mix": "Unclear", "sales_cycle_length": "Unclear", 
                "typical_interaction_time": "Unclear", "key_sales_activities_implied": [], "primary_focus_confirmation": "N/A"
            }
        logger.info(f"Final extracted_q4_data after Python logic: {extracted_q4_data}")

    except json.JSONDecodeError as e:
        logger.error(f"JSONDecodeError in _extract_sales_environment_details_llm (Q4 extraction): {e}. Raw response was: {raw_llm_response}")
        extracted_q4_data = {"error_q4_extraction": "Failed to parse LLM response for Q4 details", "raw_response_q4": raw_llm_response}
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in _extract_sales_environment_details_llm (Q4 extraction): {str(e)}\n{error_trace}")
        extracted_q4_data = {"error_q4_extraction": str(e)}

    # --- REVISED MERGING AND CLEANUP LOGIC ---
    current_turn_intent_value = llm_output_data.get("intent") if 'llm_output_data' in locals() and isinstance(llm_output_data, dict) else None

    if existing_details is None: # Should not happen if called from _handle_core_q4_style_response_handling
        existing_details = {}
    
    # Start with a base structure primarily from existing_details (which contains Q1 info + potentially C_UNSURE state)
    # Then overlay with extracted_q4_data from the current turn's processing.
    # extracted_q4_data contains the actual b2b_b2c_mix etc. determined for this turn.
    final_details = {
        "business_name": existing_details.get("business_name"),
        "product_service_summary": existing_details.get("product_service_summary", "Not specified"),
        "primary_value_proposition": existing_details.get("primary_value_proposition", "Not specified"),
        "initial_target_audience_keywords": existing_details.get("initial_target_audience_keywords", []),
        "business_model_guess": existing_details.get("business_model_guess", "Unknown"),
        "error": existing_details.get("error"), # Preserve original error if any
        # Overlay with this turn's specific Q4 extractions/errors
        **extracted_q4_data,
        "intent": current_turn_intent_value # Set intent from THIS turn's LLM call
    }

    # If we just processed a response to the "unsure" clarification, clean up helper fields.
    if existing_details.get('user_input_was_unsure'):
        logger.info("Clearing C_UNSURE helper fields as user has responded to clarification.")
        for key_to_remove in ['user_input_was_unsure', 'b2b_b2c_mix_suggestion', 
                              'sales_cycle_length_suggestion', 'typical_interaction_time_suggestion']:
            if key_to_remove in final_details:
                del final_details[key_to_remove]
        # Ensure the 'intent' is from the current turn, not a stale 'C_UNSURE' from existing_details
        # The line `final_details['intent'] = current_turn_intent_value` above should handle this.
        # If intent was C_UNSURE due to previous turn, and this turn is B or A, it gets updated.
        if final_details.get('intent') == 'C_UNSURE' and current_turn_intent_value in ['A', 'B']:
             final_details['intent'] = current_turn_intent_value

    # Ensure raw_response_q4 and error_q4_extraction are correctly set from the current turn if an error occurred now
    if "error_q4_extraction" in extracted_q4_data:
        final_details["error_q4_extraction"] = extracted_q4_data["error_q4_extraction"]
    if "raw_response_q4" in extracted_q4_data: # If error, extracted_q4_data has it
        final_details["raw_response_q4"] = extracted_q4_data["raw_response_q4"]
    elif 'raw_llm_response' in locals(): # If no error, use current raw_llm_response
        final_details["raw_response_q4"] = raw_llm_response
    elif existing_details.get("raw_response_q4"): # Fallback to existing if no new one
        final_details["raw_response_q4"] = existing_details.get("raw_response_q4")

    logger.info(f"Final merged sales environment details after cleanup: {final_details}")
    return final_details

# --- Placeholder for _determine_suggested_methodology ---
def _determine_suggested_methodology(ai_analysis_text: str, sales_environment: dict) -> str:
    """
    Determines the AI's primary suggested methodology based on AI analysis text
    and structured sales environment data.
    Placeholder - to be properly implemented later.
    """
    logger.info(f"Placeholder: _determine_suggested_methodology called. AI text: '{ai_analysis_text[:50]}...', Env: {sales_environment}")
    # Basic keyword search for now, or use sales_environment
    text_lower = ai_analysis_text.lower()
    if "solution selling" in text_lower: return "Solution Selling"
    if "consultative selling" in text_lower: return "Consultative Selling"
    if "challenger sale" in text_lower: return "Challenger Sale" # Ensure consistency
    if "spin selling" in text_lower: return "SPIN Selling"
    if "value selling" in text_lower: return "Value Selling"
    
    # Fallback based on environment (very simplistic)
    if sales_environment:
        if sales_environment.get("business_model_guess") == "SaaS" or "B2B" in sales_environment.get("b2b_b2c_mix", ""):
            return "Solution Selling"
        if "Consulting" in sales_environment.get("business_model_guess", ""):
            return "Consultative Selling"
            
    return "General Practice"

@app.route('/paraphrase', methods=['POST'])
def paraphrase():
    print("--- PARAPHRASE ROUTE HIT ---", flush=True)
    logger.info("--- PARAPHRASE ROUTE HIT (logger) ---")
    try:
        data = request.json
        logger.info(f"[RAW REQUEST DATA /paraphrase]: {data}") 
        logger.info(f"[DEBUG /paraphrase] Value of data.get('context') before assignment: {data.get('context')}") 

        user_input = data.get('userInput', '')
        stage = data.get('stage', STAGE_ORDER[0])  
        context_data = data['context'] if 'context' in data else {} # New way
        logger.info(f"[DEBUG /paraphrase] 'context' in data: {'context' in data}, value of context_data: {context_data}")
        
        if data.get('answer_q1_product_value'):
            context_data['answer_q1_product_value'] = data.get('answer_q1_product_value')
        if data.get('answer_q2_audience'):
            context_data['answer_q2_audience'] = data.get('answer_q2_audience')
        if data.get('previous_ai_message_text'):
            context_data['previous_ai_message_text'] = data.get('previous_ai_message_text')
            logger.info("Successfully copied 'previous_ai_message_text' from data to context_data.")
        
        # Retrieve any existing extracted environment details from context
        current_extracted_env_details = context_data.get('extracted_sales_environment_details', {})
        logger.info(f"[DEBUG /paraphrase] context_data.get('extracted_sales_environment_details') resulted in current_extracted_env_details: {current_extracted_env_details}")


        logger.info(f"Received paraphrase request for stage: {stage}, input: '{user_input[:50]}...'")
        if logging_enabled:
            logger.info(f"Full context_data received: {context_data}")
            logger.info(f"Current extracted_sales_environment_details from context: {current_extracted_env_details}")


        response_content = "Could you please rephrase that?"
        business_type = None
        business_description = None
        needs_followup = False
        followup_question = ""
        is_clarification_response = False
        next_stage_override = None # For backend to dictate next stage
        final_style_from_backend = None # For methodology confirmation
        validation_failed = False
        extracted_details_for_response = None # To send back q4 extracted details


        effective_stage_for_processing = stage # Default

        # --- Stage specific logic before calling OpenAI ---
        if stage == 'welcome':
            # Frontend should directly ask Q1, backend just prepares for Q1 answer.
            # Or, if frontend expects a welcome message + Q1, handle here.
            # For now, assume frontend handles initial display of Q1 question.
            # Backend will expect to process answer for 'core_q1_product_value' next.
            response_content = get_question_text_for_stage('core_q1_product_value')
            next_stage_override = 'core_q1_product_value' # Ensure frontend knows the active question's stage
            # No OpenAI call needed for just sending the question
            return jsonify({
                'id': str(uuid.uuid4()),
                'content': response_content,
                'next_stage': next_stage_override,
                'isDirectQuestion': True
            })

        elif stage == 'core_q1_product_value':
            # User is *answering* Q1. Backend processes this answer.
            effective_stage_for_processing = 'core_q1_product_value_response_handling'
            # The response from this handling will set next_stage to core_q2_audience
            # and the AI message will be the transition.

        elif stage == 'core_q2_audience':
            if not user_input or not user_input.strip(): # Frontend requests Q2 question
                effective_stage_for_processing = 'core_q2_audience_question_generation'
                # OpenAI will generate the question with suggestions.
                # next_stage will remain core_q2_audience for user to answer.
            else: # User is *answering* Q2. Backend processes this answer.
                effective_stage_for_processing = 'core_q2_audience_response_handling'
                # The response from this handling will set next_stage to core_q4_style
                # and the AI message will be ack + Q4_style question.
        
        elif stage == 'core_q1_combined':
            # This stage is deprecated. If called, redirect or map to core_q1_product_value.
            # For simplicity, we'll log a warning and treat as core_q1_product_value processing.
            logger.warning("Deprecated stage 'core_q1_combined' was called. Processing as 'core_q1_product_value'.")
            effective_stage_for_processing = 'core_q1_product_value_response_handling'


        elif stage == 'core_q4_style':
            # User is *answering* Q4 (Sales Environment). Backend processes this.
            effective_stage_for_processing = 'core_q4_style_response_handling'

        elif stage == 'core_q4_methodology':
            # User is *answering* Q4 (Methodology). Backend processes this.
            effective_stage_for_processing = 'core_q4_methodology_response_handling'

        elif stage == 'core_q5_goal':
            # User is *answering* Q5 (Goal). Backend processes this.
            effective_stage_for_processing = 'core_q5_goal_response_handling'

        else:
            logger.error(f"Route: Unknown stage from frontend: {stage}")
            return jsonify({'error': f"Unknown stage: {stage}"}), 400

        if effective_stage_for_processing:
            logger.info(f"Calling process_with_openai for effective_stage: {effective_stage_for_processing}")
            if client:
                # Pass the client instance and current_extracted_env_details
                response_payload = process_with_openai(
                    effective_stage_for_processing, 
                    user_input, 
                    context_data, 
                    client, 
                    current_extracted_env_details # Pass current state
                )
                # current_extracted_env_details is updated within process_with_openai or its return value
                # Ensure the latest version is used for the final response payload
                if 'extracted_sales_environment_details' in response_payload:
                     current_extracted_env_details = response_payload['extracted_sales_environment_details']
                else:
                    logger.warning(f"'extracted_sales_environment_details' key missing from process_with_openai response for {effective_stage_for_processing}")
                    # current_extracted_env_details will retain its state from before the call or be an empty dict
            else:
                logger.warning(f"OpenAI client not configured. Using fallback for {effective_stage_for_processing}.")
                next_stage_in_sequence = 'complete'
                try:
                    current_idx = STAGE_ORDER.index(stage)
                    if current_idx + 1 < len(STAGE_ORDER):
                        next_stage_in_sequence = STAGE_ORDER[current_idx + 1]
                except ValueError:
                    pass 

                fallback_content = f"(Fallback) Processing for {effective_stage_for_processing}. Next question."
                if effective_stage_for_processing == 'core_q1_combined_response_handling':
                    fallback_content = f"(Fallback) Thanks for the info. {ONBOARDING_QUESTIONS_TEXT.get('core_q4_style', 'Next question about sales environment.')}"
                elif effective_stage_for_processing == 'core_q4_style_response_handling':
                    fallback_content = f"(Fallback) Understood. {ONBOARDING_QUESTIONS_TEXT.get('core_q4_methodology', 'Next question about methodology.')}"
                
                response_payload = {
                    'id': str(uuid.uuid4()), 
                    'content': fallback_content, 
                    'next_stage': next_stage_in_sequence
                }
        
        final_response = {
            'id': response_payload.get('id', str(uuid.uuid4())),
            'content': response_payload.get('content', "Error: No content generated."),
            'next_stage': response_payload.get('next_stage', stage),
            'is_clarification_response': response_payload.get('is_clarification_response', False),
            'needs_followup': response_payload.get('needs_followup', False),
            'followup_question': response_payload.get('followup_question', ""),
            'error': response_payload.get('error', None),
            'business_type': response_payload.get('business_type', None),
            'business_description': response_payload.get('business_description', None),
            'suggested_style': response_payload.get('suggested_style', None),
            'final_style': response_payload.get('final_style', None),
            'extracted_sales_environment_details': current_extracted_env_details # Use the potentially updated dict
        }
        logger.info(f"Sending final response: {final_response}")
        return jsonify(final_response)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Critical error in /paraphrase endpoint: {str(e)}\n{error_trace}")
        return jsonify({
            'id': str(uuid.uuid4()), 
            'content': 'Sorry, a critical server error occurred. Please try again or refresh.',
            'error': f'Server error: {str(e)}',
            'next_stage': 'welcome' 
        }), 500

def classify_business(user_input):
    try:
        logger.info(f"Attempting to classify business from input: {user_input[:100]}...")
        lower_input = user_input.lower()
        biz_type = "General Business"
        description = f"A business offering {user_input[:50]}..."
        needs_followup = len(user_input.split()) < 7
        followup_question = "Could you tell me a bit more about what makes your offering unique or who your typical customers are?" if needs_followup else ""

        if any(kw in lower_input for kw in BUSINESS_DATABASE["software"]["keywords"]): biz_type = "Software/Technology"
        elif any(kw in lower_input for kw in BUSINESS_DATABASE["education"]["keywords"]): biz_type = "Education/Training"
        elif any(kw in lower_input for kw in BUSINESS_DATABASE["services"]["keywords"]): biz_type = "Professional Services"
        
        classification = {
            "business_type": biz_type, "confidence": 0.5, "description": description,
            "key_attributes": [kw for db_type in BUSINESS_DATABASE.values() for kw in db_type["keywords"] if kw in lower_input],
            "estimated_similar_businesses": 100, "needs_followup": needs_followup,
            "followup_question": followup_question,
            "response": followup_question if needs_followup else f"Thanks for sharing about your {biz_type.lower()}. Who are your primary customers or target audience?"
        }
        logger.info(f"Business classification result: {classification}")
        return classification
    except Exception as e:
        logger.error(f"Error in classify_business: {str(e)}")
        return {  # This line and dict below should be at this indentation level
            "business_type": "Unknown", "confidence": 0.1, "description": "Could not classify business.",
            "needs_followup": True, "followup_question": "Could you describe your business in a bit more detail?",
            "response": "Thanks for your input. Could you describe your business in a bit more detail?"
        }


# --- Helper function for core_q1_product_value_response_handling ---
def _handle_core_q1_product_value_response(user_input, client_instance, response_payload):
    logger.info("Processing: core_q1_product_value_response_handling")
    # This function no longer sets response_payload['content'] directly.
    # It processes Q1 and sets up for Q2 question generation.
    response_payload['next_stage'] = 'core_q2_audience'
    # isDirectQuestion for the overall response_payload from process_with_openai will be determined
    # by the helper that *actually* sets the content (i.e., _handle_core_q2_audience_question_generation)
    # For this transitional step, the payload itself isn't a direct question to the user.
    response_payload['isDirectQuestion'] = False 
    response_payload['has_no_direct_content'] = True # Mark that this stage doesn't produce direct chat content

    if client_instance and user_input: # user_input is the Q1 answer
        logger.info("Attempting to extract initial business details for Q1.")
        extracted_details = _extract_initial_business_details_llm(user_input, client_instance)
        if extracted_details and not extracted_details.get("error"):
            response_payload['business_type'] = extracted_details.get('business_model_guess', 'Unknown')
            response_payload['business_description'] = extracted_details.get('product_service_summary', 'Not specified')
            response_payload['extracted_business_details'] = extracted_details # Pass all extracted details
            logger.info(f"Successfully extracted initial business details: {extracted_details}")
        else:
            logger.warning(f"Failed to extract initial business details or error occurred: {extracted_details}")
    return response_payload # Only returns the payload with Q1 processing results and next_stage

# --- Helper function for core_q2_audience_question_generation ---
def _handle_core_q2_audience_question_generation(context_data, client_instance, response_payload, llm_messages):
    logger.info("Processing: core_q2_audience_question_generation")
    answer_q1_product_value = context_data.get('answer_q1_product_value', '') # Q1 answer from context_data
    # This value is present in response_payload['extracted_business_details'] if extraction was successful in Q1 handler
    # However, answer_q1_product_value is the raw user input for Q1 which is what we need for the prompt summary.
    
    perform_llm_call_for_stage = False
    response_payload['isDirectQuestion'] = True # This helper *will* set content that is a question

    if not answer_q1_product_value: # Should ideally not happen if Q1 is mandatory before Q2 question gen
        logger.warning("Q1 answer not found in context for core_q2_audience_question_generation. Using generic Q2 question.")
        response_payload['content'] = ONBOARDING_QUESTIONS_TEXT['core_q2_audience'] # Fallback, no prefix
    elif client_instance:
        logger.info(f"Generating Q2 audience question with suggestions based on Q1: {answer_q1_product_value[:100]}...")
        max_q1_len = 250
        answer_q1_summary = answer_q1_product_value[:max_q1_len] + "..." if len(answer_q1_product_value) > max_q1_len else answer_q1_product_value

        prompt = f'''The user has described their product/service and value as: "{answer_q1_summary}".
Your task is to formulate a combined response.

1.  Start with a brief, professional compliment about their business (1 sentence only) that is broad and enthusiastic, ending with an exclamation mark. Then add a paragraph break (two newlines) and say "Next, we'll define your target audience." followed by another paragraph break (two newlines).
2.  Then, ask them about their primary customers or target audience, incorporating a brief summary of their product/service ("{answer_q1_summary}"). This main question should be plain text and must end with a paragraph break (two newlines).
3.  Immediately following the main question's paragraph break, on a new line, write the phrase "From what I understand, it could be:" (without bolding).
4.  Then, provide 3-4 suggestions for their target audience. Please make this section highly readable using a numbered list format. Apply bolding to emphasize the key aspects of each audience segment. Include relevant demographics (age ranges, income levels, lifestyle characteristics, etc.) where appropriate. Ensure each suggestion clearly stands out.
5.  Conclude by asking if your suggestions are accurate or if they would describe their audience differently.

Your entire output should generally follow this kind of structure, ensuring the suggestions are clear and well-formatted for readability:
[Professional compliment about their business - 1 sentence with exclamation mark]

Next, we'll define your target audience.

Based on your focus on [summary of user's product/service], who are your primary customers or target audience?

From what I understand, it could be:
1.  **Audience Segment A** - with demographics and details
2.  **Audience Segment B** - with demographics and details
3.  **Audience Segment C** - with demographics and details
4.  **Audience Segment D** - with demographics and details

Or would you describe them differently?

User's product/service context for the main question: "{answer_q1_summary}"
'''
        llm_messages.append({"role": "user", "content": prompt})
        perform_llm_call_for_stage = True
    else: # No OpenAI client, but Q1 answer is available
        logger.warning("OpenAI client not configured for core_q2_audience_question_generation. Using structured fallback.")
        q1_summary_for_fallback = answer_q1_product_value.split('.')[0] 
        if len(q1_summary_for_fallback) > 70: q1_summary_for_fallback = q1_summary_for_fallback[:67] + "..."
        
        response_payload['content'] = (
            f"Next, we'll define your target audience.\\n\\n"
            f"Based on your focus on {q1_summary_for_fallback}, who are your primary customers or target audience?\\n\\n"
            f"From what I understand, it could be:\\n\\n"
            f"1. Specific types of businesses (e.g., B2B startups, established enterprises)\\n"
            f"2. Individual consumers (e.g., B2C tech enthusiasts, specific demographics)\\n"
            f"3. Niche markets or specialized roles\\n\\n"
            f"Or would you describe them differently?"
        )
    response_payload['next_stage'] = 'core_q2_audience' # Stays on this stage for user to answer
    return response_payload, perform_llm_call_for_stage

# --- Helper function for core_q2_audience_response_handling ---
def _handle_core_q2_audience_response_handling(user_input, context_data, client_instance, response_payload, llm_messages):
    logger.info("Processing: core_q2_audience_response_handling with context-aware suggestions for Q4")
    user_q1_ans_raw = context_data.get('answer_q1_product_value', 'their product/service')
    q1_extracted_details = context_data.get('extracted_business_details', {})
    perform_llm_call_for_stage = False
    
    # Prefer extracted summary, fallback to raw Q1 answer if summary is generic or missing
    product_summary_from_q1 = q1_extracted_details.get('product_service_summary', user_q1_ans_raw)
    if product_summary_from_q1 == 'Not specified' or not product_summary_from_q1:
        product_summary_from_q1 = user_q1_ans_raw
    
    user_q2_audience_ans = user_input # This is the user's answer to the audience question
    
    full_sales_env_q_text = get_question_text_for_stage('core_q4_style')
    previous_ai_audience_suggestions = context_data.get('previous_ai_message_text', 'AI previously suggested some audience types.') # Get the AI's previous message with suggestions

    prompt = f'''The user has provided the following information:
- Product/Service (Q1): "{product_summary_from_q1}"
- User\'s full response to the audience question (Q2): """{user_q2_audience_ans}"""
- The AI\'s previous message which contained audience suggestions was: """{previous_ai_audience_suggestions}"""

Your task is to generate a response that does the following in sequence:

1.  **Acknowledge Audience Confirmation/Update Naturally:**
    Analyze the User\'s response ("""{user_q2_audience_ans}""") in conjunction with "The AI\'s previous message" to understand which of the AI\'s suggestions were affirmed, which were negated or ignored, and what new information was added.

    *   **If the user affirms some/all previous suggestions AND/OR adds new details:**
        *   Start by listing the audience segments you now understand to be relevant using bullet points (•). This list should be based on:
            a) The AI\'s previously suggested items (from """{previous_ai_audience_suggestions}""") that the user has clearly affirmed or agreed to.
            b) Any NEW audience segments explicitly stated by the user in """{user_q2_audience_ans}""".
        *   Be precise: if the user says "not X" or implies X is not a fit, DO NOT include X from the AI\'s previous suggestions.
        *   Format the audience list with bullet points like: "• **Audience Type** - description"
        *   Phrase this acknowledgment naturally. For example: "Okay, so your target audience now includes:" followed by the bullet point list.
        *   Conclude with a positive sentiment, for example: "This detailed understanding will help us create highly relevant scenarios!"

    *   **If the user provides a completely new description, mostly disregarding previous suggestions:**
        *   Naturally summarize their new description using bullet points for any list items (e.g., 'Okay, so you\'re focusing on [bullet point list of new audience segments]. That\'s very clear, thank you!').

    *   **If the user makes a simple affirmation of ALL previous suggestions without additions:**
        *   Respond with a confirmation acknowledging the *specific types* previously suggested using bullet points (e.g., 'Great, so focusing on: • **Type 1** • **Type 2** • **Type 3** sounds like a good plan! Thanks.').

    *   **Overall Tone:** Be natural, concise, and confirm understanding. Avoid overly generic phrases.

2.  **Visual Divider:** Add a visual divider using three dashes on their own line: "---"

3.  **Transition:** Provide a brief transition (e.g., "Now, to further refine our practice scenarios, let's explore your sales environment:").

4.  **Sales Environment Questions with Structured Suggestions:** Ask about their sales environment using bullet points (•). For EACH of the three aspects below (Sales Model, Sales Cycle Length, Interaction Time):
        *   ALWAYS start with a bullet point (•) instead of numbers
        *   First, ask the main question with a bullet point prefix (e.g., "• Do you primarily sell to businesses (B2B), consumers (B2C), or a mix of both?").
        *   Immediately on the next line, provide your plausible suggestion as an indented bullet point. Format it like this:
            *   `   • AI Suggestion: [Your derived suggestion value, e.g., Mix, Few weeks, 30-45 minutes]`
        *   Derive your suggestion value specifically from their Q1 (`{product_summary_from_q1}`) and Q2 (`{user_q2_audience_ans}`) input.

CRITICAL: You MUST use this exact format with bullet points. Example of the desired output structure for point 4 (Sales Environment Questions):

---

• Do you primarily sell to businesses (B2B), consumers (B2C), or a mix of both?
   • AI Suggestion: Mix

• What's your average sales cycle length (e.g., a few days, several weeks, multiple months)?
   • AI Suggestion: Several weeks

• How long is a typical sales call or main interaction?
   • AI Suggestion: 45 minutes

Do NOT use numbered questions. Every question MUST start with a bullet point "•" and every AI suggestion MUST be an indented bullet point "   • AI Suggestion:".

Generate the response now.
IMPORTANT: Your generated response must be purely conversational. Do NOT include any instructional text, meta-commentary, or any labels like 'Scenario 1', 'Point 1', 'Overall Tone', etc., from this prompt in your output. Just provide the natural language response as if you were a helpful AI assistant.
'''
    if client_instance:
        llm_messages.append({"role": "user", "content": prompt})
        perform_llm_call_for_stage = True
    else:
        response_payload['content'] = f"Thanks for sharing your target audience. Now, {full_sales_env_q_text}"
    response_payload['next_stage'] = 'core_q4_style'
    # Pass through extracted business details from Q1 if available in context
    if context_data.get('extracted_business_details'):
        response_payload['extracted_business_details'] = context_data.get('extracted_business_details')
    return response_payload, perform_llm_call_for_stage

# --- Helper function for core_q4_style_response_handling ---
def _handle_core_q4_style_response_handling(user_input, context_data, client_instance, response_payload, llm_messages, current_extracted_env_details):
    logger.info("Processing: core_q4_style_response_handling (Sales Context) with extraction.")
    answer_q1 = context_data.get('answer_q1_product_value', 'Not provided') 
    answer_q2 = context_data.get('answer_q2_audience', 'Not provided')
    user_q4_sales_env_answer = user_input
    previous_ai_question_with_suggestions = context_data.get('previous_ai_message_text', '') # Get previous AI question
    if not previous_ai_question_with_suggestions:
        logger.warning("CONTEXT_WARNING: 'previous_ai_message_text' not found in context_data for core_q4_style_response_handling. AI suggestions for sales environment cannot be pre-parsed.")
    else:
        logger.info(f"Context 'previous_ai_message_text' found for pre-parsing: {previous_ai_question_with_suggestions[:100]}...")
    perform_llm_call_for_stage = False

    if client_instance and user_q4_sales_env_answer:
        env_details_for_extraction = current_extracted_env_details if isinstance(current_extracted_env_details, dict) else {}
        # Pass previous_ai_question_with_suggestions to the extraction function
        merged_details_after_q4 = _extract_sales_environment_details_llm(
            user_q4_sales_env_answer, 
            client_instance, 
            existing_details=env_details_for_extraction.copy(),
            previous_ai_question_with_suggestions=previous_ai_question_with_suggestions
        )
        current_extracted_env_details.update(merged_details_after_q4)
        response_payload['extracted_sales_environment_details'] = current_extracted_env_details
        logger.info(f"Updated current_extracted_env_details after Q4 extraction: {current_extracted_env_details}")
    
    # --- NEW: Handle C_UNSURE intent from extraction ---
    if current_extracted_env_details.get('intent') == 'C_UNSURE':
        logger.info("Handling C_UNSURE intent: Re-prompting user with AI's previous suggestions.")
        # Retrieve the AI's own suggestions that were stored
        ai_sugg_mix = current_extracted_env_details.get('b2b_b2c_mix_suggestion', 'a mix')
        ai_sugg_cycle = current_extracted_env_details.get('sales_cycle_length_suggestion', 'several weeks')
        ai_sugg_interaction = current_extracted_env_details.get('typical_interaction_time_suggestion', '30-45 minutes')

        unsure_user_prompt = f"""No problem at all that you're unsure about these sales details right now - we can figure out some good starting points together!

Earlier, based on your business, I had suggested:

1. For B2B/B2C mix: **{ai_sugg_mix}**
2. For average sales cycle: **{ai_sugg_cycle}**
3. For typical interaction time: **{ai_sugg_interaction}**

How do these sound as a starting point for our practice scenarios? Or would you like to provide different details for any of them?"""
        llm_messages.append({"role": "system", "content": "You are SalesSpark. Your goal is to gently guide the user to confirm or adjust the sales environment details you previously suggested. Be encouraging and clear."})
        llm_messages.append({"role": "user", "content": unsure_user_prompt})
        # We still need to set perform_llm_call_for_stage = True if we want this to go to OpenAI
        # However, this is a direct formulation of the question to the user.
        # We can bypass LLM for this specific re-prompt if we want to directly use `unsure_user_prompt` as the content.
        # For now, let's assume we want the LLM to phrase this helpfully.
        # If we decide to make this a direct non-LLM response:
        # response_payload['content'] = unsure_user_prompt
        # perform_llm_call_for_stage = False 
        # else, if we want LLM to rephrase/deliver it:
        # perform_llm_call_for_stage = True # Old way, LLM rephrases

        # NEW: Directly use the constructed prompt as the AI's content
        response_payload['content'] = unsure_user_prompt
        perform_llm_call_for_stage = False # Bypass LLM for this specific re-prompt
        
        response_payload['next_stage'] = 'core_q4_style' # Stay on this stage to get their answer
        response_payload['isDirectQuestion'] = True
        # No need to update 'extracted_business_details' here as it's from Q1
        # Return early as this is a different conversational path
        return response_payload, perform_llm_call_for_stage, current_extracted_env_details
    # --- END NEW --- 

    extracted_env_details_str = json.dumps(current_extracted_env_details, indent=2)

    def get_current_extracted_detail(key, default_text): # Helper local to this stage
        if current_extracted_env_details and isinstance(current_extracted_env_details, dict):
            return current_extracted_env_details.get(key, default_text)
        return default_text
    
    extracted_b2b_b2c_mix = get_current_extracted_detail('b2b_b2c_mix', 'Unclear')
    primary_model_for_prompt = extracted_b2b_b2c_mix if extracted_b2b_b2c_mix.lower() not in ['unclear', 'unclear if not clear.', 'not specified', ''] else 'the sales details you confirmed'
    ack_env_detail_example = f"Thanks for detailing your sales environment, particularly your focus on {primary_model_for_prompt}."
    
    lead_in_analysis_detail = primary_model_for_prompt
    if primary_model_for_prompt == 'the sales details you confirmed':
        q1_business_model_guess = get_current_extracted_detail('business_model_guess', '')
        if q1_business_model_guess and q1_business_model_guess.lower() not in ['unknown', 'other', 'unclear']:
            lead_in_analysis_detail = f"your {q1_business_model_guess} model and the confirmed sales details"
        else:
            lead_in_analysis_detail = "your overall sales approach"
    
    sales_cycle_detail = get_current_extracted_detail('sales_cycle_length', 'N/A')
    if sales_cycle_detail.lower() not in ['n/a', 'unclear', 'not specified', '']:
        lead_in_analysis_detail += f" and typical sales cycle of {sales_cycle_detail}"
    else: 
        lead_in_analysis_detail += " and typical sales cycle"

    # --- NEW: Pre-construct the acknowledgment preamble --- 
    b2b_b2c_mix_val = get_current_extracted_detail('b2b_b2c_mix', 'your defined')
    sales_cycle_length_val = get_current_extracted_detail('sales_cycle_length', 'a defined')
    typical_interaction_time_val = get_current_extracted_detail('typical_interaction_time', 'a defined')

    acknowledged_details_sentence = f"Understood. So your sales environment involves a {b2b_b2c_mix_val} approach, a sales cycle of about {sales_cycle_length_val}, and typical interactions lasting {typical_interaction_time_val}."
    fixed_pitchiq_sentence = "By the way, PitchIQ is currently best equipped for practicing interactions around 10-15 minutes in length, but we can certainly work with the context you've provided."
    full_acknowledgment_preamble = f"{acknowledged_details_sentence} {fixed_pitchiq_sentence}"
    # --- END NEW --- 

    # Construct the detailed prompt for methodology suggestion
    prompt_template = '''User\'s Product/Service: "{answer_q1_val}"
User\'s Target Audience: "{answer_q2_val}"
User\'s Raw Sales Environment Description for Q4: "{user_q4_sales_env_answer_val}"
Fully Extracted & Merged Structured Sales Environment Details (JSON):
```json
{extracted_env_details_str_val}
```
Your task is to analyze this context and recommend sales methodologies.
IMPORTANT: The section descriptions that follow are for your guidance ONLY. Your generated response text MUST NOT contain these descriptive phrases or any similar section labels. Strictly follow the content requirements for each part.

Response Preamble (Start your entire response with this exact text):
{full_acknowledgment_preamble_val}

Transition to Sales Methodologies (Immediately after the Preamble, on a new line if appropriate, state exactly):
Now, let\'s shift focus to Sales Methodologies.

List 5 Main Methodologies (After the Transition, on a new line, state exactly):
There are several effective methodologies. The main ones include:
*   Consultative Selling
*   Solution Selling
*   Challenger Sales
*   SPIN Selling
*   Value Selling

Here's a brief on each to help your analysis:
*   Consultative Selling: Focuses on building deep trust and understanding specific customer needs to act as a trusted advisor.
*   Solution Selling: Focuses on identifying and solving defined customer pain points with your product/service as the clear solution.
*   Challenger Sales: Focuses on teaching customers new perspectives or insights, tailoring the sales message to resonate, and confidently taking control of the conversation.
*   SPIN Selling: A question-based approach to guide customers through their Situation, Problems, Implications of those problems, and the Need-payoff of a solution.
*   Value Selling: Focuses on quantifying and proving the tangible economic and business value (e.g., ROI, cost savings, efficiency gains) of your offering to the customer.

Lead-in to Analysis (After listing methodologies, on a new line, state exactly):
Based on your sales context, especially the {lead_in_analysis_detail_val}, here are my thoughts on what might fit best:
Detailed Recommendations (Present ONLY your top 2 choices from the list above):
For EACH of your TWO chosen recommendations (and only two):
**Methodology Name (e.g., Consultative Selling)**
*   Why? Explain in one sentence its fit. EXPLICITLY reference specific details from the `Fully Extracted & Merged Structured Sales Environment Details` (e.g., `b2b_b2c_mix`, `sales_cycle_length`) OR from their `Product/Service` or `Target Audience`. Be insightful.
*   Core strength: Explain how a specific aspect of *their situation* (drawing from extracted details, product, or audience) allows this methodology to leverage its core strength.
AI\'s Lean: State exactly: "Based on this, I\'m leaning towards **[Name of the Methodology you think is the single best fit from your two recommendations]**, as it seems to best address [specific aspect of their context, e.g., \'your {get_b2b_b2c_mix_val} focus with a {get_sales_cycle_length_val} sales cycle\'." ]
Closing Question: Ask exactly: "What do you think? You can always change this later. Which methodology would you like to select for now?"
IMPORTANT: After your full textual response, add `|||` and a JSON object like: {{"suggested_methodology_for_practice": "PrimarySuggestedMethodology"}}. This `PrimarySuggestedMethodology` MUST be the one you stated you are leaning towards.'''
    prompt = prompt_template.format(
        answer_q1_val=answer_q1, answer_q2_val=answer_q2,
        user_q4_sales_env_answer_val=user_q4_sales_env_answer,
        extracted_env_details_str_val=extracted_env_details_str,
        full_acknowledgment_preamble_val=full_acknowledgment_preamble, # Pass the pre-built preamble
        lead_in_analysis_detail_val=lead_in_analysis_detail,
        get_b2b_b2c_mix_val=b2b_b2c_mix_val, # Use the already fetched value
        get_sales_cycle_length_val=sales_cycle_length_val, # Use the already fetched value
        get_typical_interaction_time_val=typical_interaction_time_val # Use the already fetched value
    )
    if client_instance:
        llm_messages.append({"role": "user", "content": prompt})
        perform_llm_call_for_stage = True
    else:
        response_payload['content'] = f"Thanks for that information. Now, {get_question_text_for_stage('core_q4_methodology')}"
    
    response_payload['next_stage'] = 'core_q4_methodology'
    if context_data.get('extracted_business_details'):
        response_payload['extracted_business_details'] = context_data.get('extracted_business_details')
    return response_payload, perform_llm_call_for_stage, current_extracted_env_details

# --- Helper function for core_q4_methodology_response_handling ---
def _handle_core_q4_methodology_response_handling(user_input, context_data, client_instance, response_payload, llm_messages, current_extracted_env_details):
    logger.info("Processing: core_q4_methodology_response_handling")
    answer_q1 = context_data.get('answer_q1_product_value', 'Not provided')
    perform_llm_call_for_stage = False
    env_details_for_prompt = current_extracted_env_details if isinstance(current_extracted_env_details, dict) else {}
    extracted_env_details_str = json.dumps(env_details_for_prompt, indent=2)

    suggested_by_ai = context_data.get('suggested_style', '').lower()
    user_choice_input = user_input.strip().lower()

    final_methodology = "General Practice" 
    if "solution selling" in user_choice_input or ("solution" in user_choice_input and "consult" not in user_choice_input): final_methodology = "Solution Selling"
    elif "spin" in user_choice_input: final_methodology = "SPIN"
    elif "consultative" in user_choice_input or "consult" in user_choice_input: final_methodology = "Consultative"
    elif "challenger" in user_choice_input: final_methodology = "Challenger"
    elif "value selling" in user_choice_input: final_methodology = "Value Selling"
    elif any(affirm in user_choice_input for affirm in ["sounds good", "okay", "yes", "sure", "agree", "that one", "go with that"]) and suggested_by_ai:
        final_methodology = context_data.get('suggested_style', 'General Practice') 
    
    greeting = "Good choice!" if final_methodology.lower() == suggested_by_ai else "Sounds good!"

    prompt_template = '''User\'s Product/Service: "{answer_q1_val}"
User has now indicated they want to focus on: "{final_methodology_val}"
AI had previously suggested: "{suggested_by_ai_val}"
Full user input for this turn: "{user_input_val}"
This is the structured information we have about their business and sales environment:
```json
{extracted_env_details_str_val}
```
Your primary task is to process their selection ("{final_methodology_val}") and guide them to the next step. 
FIRST, analyze the `Full user input for this turn` to see if they ALSO asked a question about methodologies (e.g., "what\'s X?"; "explain Y"; "is X better than Y?").

IF they asked such a question:
    A. Briefly answer their specific question about methodologies in 1-2 clear sentences. Make this distinct before proceeding.
    B. THEN, proceed to the standard response structure below, using their chosen methodology ("{final_methodology_val}") and "{greeting_val}".

Standard response structure (use directly if no question, or after A & B):
1.  **Greeting:** Start with "{greeting_val}".
2.  **Personalized Explanation (1 sentence):** Immediately follow with a brief explanation of why "{final_methodology_val}" is suitable. This explanation MUST be highly personalized by specifically referencing key details from the `structured information` (e.g., `product_service_summary`, `b2b_b2c_mix`, `sales_cycle_length`) AND their `Product/Service` ("{answer_q1_val}").
    *Example (DO NOT include asterisks or 'Example...'):* If `product_service_summary` is 'AI software', `b2b_b2c_mix` is 'B2B', `sales_cycle_length` is 'long', a good explanation for Consultative might be: "{greeting_val} Consultative Selling is a great fit for your AI software targeting B2B clients with a long sales cycle, allowing for in-depth discovery."
3.  **Transitional Question (New Line):** On a NEW LINE, ask the goal question:
    "Excellent. Now that we\'ve clarified the methodology, what key sales skill or area would you like to focus on practicing using the **{final_methodology_val}** approach? Some common responses include: objection handling, perfecting your pitch, building rapport, or closing."

Ensure your output is only the raw text as per these instructions. The explanation in step 2 is critical. Do not add extra formatting.'''
    prompt = prompt_template.format(
        answer_q1_val=answer_q1, final_methodology_val=final_methodology,
        suggested_by_ai_val=suggested_by_ai.title() if suggested_by_ai else 'N/A',
        user_input_val=user_input, extracted_env_details_str_val=extracted_env_details_str,
        greeting_val=greeting
    )
    if client_instance:
        llm_messages.append({"role": "user", "content": prompt})
        perform_llm_call_for_stage = True
    else:
        response_payload['content'] = f"{greeting} We'll focus on {final_methodology}. Now, what key sales skill or area would you like to focus on practicing?"
    
    response_payload['final_style'] = final_methodology 
    response_payload['next_stage'] = 'core_q5_goal'
    if context_data.get('extracted_business_details'):
        response_payload['extracted_business_details'] = context_data.get('extracted_business_details')
    # current_extracted_env_details is passed through implicitly in response_payload if this helper modifies it.
    return response_payload, perform_llm_call_for_stage

# --- Helper function for core_q5_goal_response_handling ---
def _handle_core_q5_goal_response_handling(user_input, context_data, client_instance, response_payload, llm_messages):
    logger.info("Processing: core_q5_goal_response_handling. Completing onboarding.")
    user_goal = user_input
    final_methodology = context_data.get('answer_q4_methodology', 'their chosen methodology') # Changed key here
    perform_llm_call_for_stage = False

    prompt_template = '''User\'s chosen sales improvement goal: "{user_goal_val}"
They are focusing on improving this with {final_methodology_val}.
Create a brief, encouraging closing message (1-2 sentences). 
Mention that their onboarding is complete and they\'ll be redirected.
Example: "Great, focusing on {user_goal_val} with {final_methodology_val} is a solid plan! Your onboarding is now complete, and you\'ll be redirected to your personalized dashboard shortly."'''
    prompt = prompt_template.format(user_goal_val=user_goal, final_methodology_val=final_methodology)
    if client_instance:
        llm_messages.append({"role": "user", "content": prompt})
        perform_llm_call_for_stage = True
    else:
        response_payload['content'] = f"Great, focusing on {user_goal} with {final_methodology} is a solid plan! Your onboarding is now complete."
    
    response_payload['next_stage'] = 'complete'
    response_payload['isDirectQuestion'] = False # This is a concluding statement
    if context_data.get('extracted_business_details'):
        response_payload['extracted_business_details'] = context_data.get('extracted_business_details')
    # current_extracted_env_details is already in response_payload from previous stages if needed
    return response_payload, perform_llm_call_for_stage

# MODIFIED process_with_openai to accept and use the client for extraction
# and to manage current_extracted_env_details
def process_with_openai(stage, user_input, context_data=None, client_instance=None, current_extracted_env_details=None):
    response_payload = {
        'id': str(uuid.uuid4()), 'content': '', 'is_clarification_response': False,
        'needs_followup': False, 'followup_question': '', 'error': None,
        'business_type': None, 'business_description': None, 'suggested_style': None,
        'final_style': None, 'next_stage': stage, # Default next_stage to current stage
        'extracted_sales_environment_details': current_extracted_env_details if current_extracted_env_details is not None else {},
        'extracted_business_details': None, # For Q1 extraction results
        'isDirectQuestion': True # Default to true, specific handlers can set to false
    }
    if context_data is None: context_data = {}
    if current_extracted_env_details is None: current_extracted_env_details = {}

    logger.info(f"PROCESS_WITH_OPENAI: Stage='{stage}', Input='{user_input[:50] if user_input else 'None'}', ContextKeys='{list(context_data.keys())}', Initial EnvDetails: {current_extracted_env_details}")
    system_message = "You are SalesSpark, an AI assistant guiding a sales professional through onboarding for a sales training application. Be concise, friendly, and focused on the current task. When generating sales environment questions, you MUST use bullet points (•) for each question."
    model_to_use = "gpt-3.5-turbo-0125" # Preferred model
    temperature = 0.6 # Slightly adjusted for a balance of creativity and consistency
    max_tokens_for_call = 600 # Define max_tokens

    # This variable will hold the messages for the LLM call if one is made.
    llm_messages = [{"role": "system", "content": system_message}]
    perform_llm_call = False # Flag to determine if an LLM call should be made for the main content

    try:
        if stage == 'core_q1_product_value_response_handling':
            response_payload = _handle_core_q1_product_value_response(user_input, client_instance, response_payload)
        
        elif stage == 'core_q2_audience_question_generation':
            response_payload, perform_llm_call = _handle_core_q2_audience_question_generation(context_data, client_instance, response_payload, llm_messages)

        elif stage == 'core_q2_audience_response_handling':
            response_payload, perform_llm_call = _handle_core_q2_audience_response_handling(user_input, context_data, client_instance, response_payload, llm_messages)

        elif stage == 'core_q4_style_response_handling':
            response_payload, perform_llm_call, current_extracted_env_details = _handle_core_q4_style_response_handling(user_input, context_data, client_instance, response_payload, llm_messages, current_extracted_env_details)

        elif stage == 'core_q4_methodology_response_handling':
            response_payload, perform_llm_call = _handle_core_q4_methodology_response_handling(user_input, context_data, client_instance, response_payload, llm_messages, current_extracted_env_details)

        elif stage == 'core_q5_goal_response_handling':
            response_payload, perform_llm_call = _handle_core_q5_goal_response_handling(user_input, context_data, client_instance, response_payload, llm_messages)
        
        else: 
            logger.warning(f"Processing: No specific handling defined for stage: {stage}. Providing a generic placeholder.")
            response_payload['content'] = f"Thank you. We are processing your information for stage '{stage}'. Please wait."
            current_idx = STAGE_ORDER.index(stage) if stage in STAGE_ORDER else -1
            if current_idx != -1 and current_idx + 1 < len(STAGE_ORDER):
                response_payload['next_stage'] = STAGE_ORDER[current_idx + 1]
            else: 
                response_payload['next_stage'] = 'complete' 
                logger.warning(f"Stage {stage} is last or not found; setting next_stage to complete.")
            response_payload['isDirectQuestion'] = True # Assume it's asking for next step if not specified

        # If perform_llm_call is true, make the API call
        if perform_llm_call and client_instance:
            try:
                logger.info(f"Making LLM call for stage: {stage} with model: {model_to_use}")
                completion = client_instance.chat.completions.create(
                    model="gpt-4o-mini",  # Changed from gpt-3.5-turbo-0125
                    messages=llm_messages,
                    temperature=temperature,
                    max_tokens=max_tokens_for_call, # Added max_tokens
                    # stream=True # Consider streaming for better UX later if applicable
                )
                generated_content = completion.choices[0].message.content.strip() if completion.choices and completion.choices[0].message.content else ""
                
                if not generated_content:
                    logger.warning(f"LLM returned empty content for stage: {stage}. Input was: {user_input[:100] if user_input else 'N/A'}")
                    response_payload['content'] = "Sorry, something went wrong while generating a response. Let's try to proceed with the next standard question."
                    response_payload['error'] = "No content generated by LLM."
                    # Determine next logical stage if current one failed to produce content
                    if stage == 'core_q2_audience_question_generation':
                        response_payload['content'] = ONBOARDING_QUESTIONS_TEXT['core_q2_audience'] # Fallback to generic static Q2
                        response_payload['next_stage'] = 'core_q2_audience'
                    elif stage == 'core_q2_audience_response_handling':
                        response_payload['content'] = ONBOARDING_QUESTIONS_TEXT['core_q4_style']
                        response_payload['next_stage'] = 'core_q4_style'
                    # Add other specific fallbacks as needed
                    else: # Generic fallback
                        current_idx = STAGE_ORDER.index(response_payload['next_stage']) if response_payload['next_stage'] in STAGE_ORDER else -1
                        if current_idx != -1 and current_idx + 1 < len(STAGE_ORDER):
                            response_payload['next_stage'] = STAGE_ORDER[current_idx + 1]
                            question_text_for_next_stage = get_question_text_for_stage(response_payload['next_stage'])
                            response_payload['content'] = f"Let's move to the next step. {question_text_for_next_stage}"
                        else:
                            response_payload['content'] = "Let's try moving to the next step."
                            response_payload['next_stage'] = 'complete' # Or some error/reset stage
                else:
                    # Handle potential ||| separator for suggested_methodology (specific to core_q4_style_response_handling)
                    if stage == 'core_q4_style_response_handling' and '|||' in generated_content:
                        parts = generated_content.split('|||', 1)
                        response_payload['content'] = parts[0].strip()
                        try:
                            json_part = json.loads(parts[1].strip())
                            response_payload['suggested_style'] = json_part.get('suggested_methodology_for_practice')
                            logger.info(f"Extracted suggested_style: {response_payload['suggested_style']}")
                        except json.JSONDecodeError as e:
                            logger.error(f"Error decoding JSON part for suggested_style: {e} - Raw JSON part: {parts[1].strip()}")
                    else:
                        response_payload['content'] = generated_content

                    logger.info(f"LLM generated content for stage {stage} (first 100 chars): {response_payload['content'][:100]}")
                    # >>> ADD DETAILED LOGGING FOR RAW Q2 AUDIENCE QUESTION GENERATION <<<
                    if stage == 'core_q2_audience_question_generation':
                        logger.info("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
                        logger.info(f"RAW MARKDOWN for core_q2_audience_question_generation:\\n{generated_content}")
                        logger.info("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            except openai.APIError as e:
                logger.error(f"OpenAI APIError for stage {stage}: {e}")
                response_payload['error'] = f"OpenAI API Error: {e}"
                response_payload['content'] = "There was an issue contacting the AI. Please try again shortly."
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                logger.error(f"Generic error during LLM call for stage {stage}: {e}\\\\n{error_trace}")
                response_payload['error'] = f"Error: {e}"
                response_payload['content'] = "An unexpected error occurred. Please try again."
    except openai.APIError as e:  # Catch API errors from stage handlers if any, or LLM call if it were outside its own try-except
        logger.error(f"OpenAI APIError in process_with_openai for stage {stage}: {e}")
        response_payload['content'] = "Sorry, there was an issue communicating with the AI. Please try again."
        response_payload['error'] = str(e)
    except Exception as e:  # Catch any other exceptions from stage handlers
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"General error in process_with_openai for stage {stage}: {str(e)}\\\\n{error_trace}")
        response_payload['content'] = "Sorry, an unexpected error occurred while processing your request. Please try again."
        response_payload['error'] = str(e)
            
    if not response_payload.get('content') and not response_payload.get('has_no_direct_content'): 
        logger.error(f"CRITICAL FALLBACK: No content in response_payload for stage {stage} after try-except. Setting error message.")
        response_payload['content'] = "Error: Could not generate a response for this step. Please try again or contact support."
        response_payload['error'] = "Empty content fallback triggered in process_with_openai after all processing attempts."
    
    # Ensure extracted_sales_environment_details is always part of the payload, even if empty
    response_payload['extracted_sales_environment_details'] = current_extracted_env_details if current_extracted_env_details is not None else {}
    
    logger.info(f"Final response payload for stage {stage}: {json.dumps(response_payload, indent=2)}")
    return response_payload

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8081))
    logger.info(f"Starting paraphrase microservice on port {port}...")
    flask_debug_mode = os.environ.get("FLASK_DEBUG", "True").lower() == "true"
    app.run(host='0.0.0.0', port=port, debug=flask_debug_mode)
