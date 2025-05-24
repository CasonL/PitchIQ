"""
Conversation Service

This module handles processing user messages and generating AI responses
for conversations, ensuring persona consistency and context maintenance.
"""

import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import traceback

from app.models import TrainingSession, BuyerPersona, Message
from app.extensions import db
from app.services.openai_service import openai_service
from app.training.services import generate_roleplay_response, sync_persona_name_from_conversation

# Configure logger
logger = logging.getLogger(__name__)

def process_user_message(session_id: int, message_text: str, user_profile_id: int) -> str:
    """
    Process a user message and generate an AI response based on the buyer persona.
    
    Args:
        session_id: The ID of the training session
        message_text: The user's message text
        user_profile_id: The ID of the user's profile
        
    Returns:
        str: The AI's response
    """
    # ADDING ENTRY LOG
    logger.info(f"--- Entering process_user_message for session {session_id} ---")
    try:
        # Get the training session with buyer persona
        session = db.session.query(TrainingSession).filter_by(
            id=session_id,
            user_profile_id=user_profile_id
        ).first()
        
        if not session:
            logger.error(f"Training session {session_id} not found for user profile {user_profile_id}")
            return "Sorry, I couldn't find your training session. Please try starting a new conversation."
        
        # Get the buyer persona for this session
        buyer_persona = session.buyer_persona
        if not buyer_persona:
            logger.error(f"No buyer persona found for session {session_id}")
            return "I'm having trouble accessing your buyer persona. Please try restarting your conversation."
        
        # --- CORRECTED: Manipulate TrainingSession history directly ---
        try:
            # Get current history (ensure it's a list)
            history = session.conversation_history_dict or []
            if not isinstance(history, list):
                logger.warning(f"History for session {session.id} was not a list, resetting.")
                history = []

            # Create user message dictionary
            user_message_dict = {
                "role": "user",
                "content": message_text,
                "timestamp": datetime.utcnow().isoformat() # Use ISO format string
            }
            history.append(user_message_dict)

            # Update the session object using the property setter (handles JSON conversion)
            session.conversation_history_dict = history
            session.updated_at = datetime.utcnow() # Update session timestamp

            # Commit the session object to save user message
            db.session.commit()
            logger.info(f"User message appended to history for session {session.id}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error appending user message to history for session {session.id}: {str(e)}\n{traceback.format_exc()}")
            return "Failed to save your message. Please try again."
        
        # --- CORRECTED: Use the updated history list ---
        formatted_history = history # The history list IS the formatted history
        
        # Create metadata with persona information
        persona_traits = json.loads(buyer_persona.personality_traits) if buyer_persona.personality_traits else []
        persona_pain_points = json.loads(buyer_persona.pain_points) if buyer_persona.pain_points else []
        persona_objections = json.loads(buyer_persona.objections) if buyer_persona.objections else []
        
        conversation_metadata = {
            "buyer_persona": {
                "name": buyer_persona.name,
                "role": buyer_persona.role,
                "description": buyer_persona.description,
                "personality_traits": persona_traits,
                "emotional_state": buyer_persona.emotional_state,
                "buyer_type": buyer_persona.buyer_type,
                "decision_authority": buyer_persona.decision_authority,
                "pain_points": persona_pain_points,
                "objections": persona_objections,
                "cognitive_biases": json.loads(buyer_persona.cognitive_biases) if buyer_persona.cognitive_biases else {},
                "primary_concern": buyer_persona.primary_concern
            }
        }
        
        # Generate AI response using the roleplay function
        try:
            # --- NOTE: generate_roleplay_response expects the *full* history including the latest user message ---
            # --- We are passing the history *after* saving the user message, which is correct. ---
            logger.info(f"Calling generate_roleplay_response for session {session.id}")
            try:
                response, updated_session = generate_roleplay_response( 
                    message_text, # Pass the specific user message text here if needed by function signature
                    formatted_history, # Pass the full history list
                    conversation_metadata
                )
                logger.info(f"Response from generate_roleplay_response: {response[:50]}..." if response else "None")
                # Ensure session is updated if the function returns it
                if updated_session and hasattr(updated_session, 'id'):
                     session = updated_session
            except Exception as api_error:
                logger.error(f"Error generating AI response: {str(api_error)}")
                logger.error(f"Full exception details: {traceback.format_exc()}")
                
                # Log more details about the error
                if "api_key" in str(api_error).lower() or "key" in str(api_error).lower():
                    logger.error("Possible API key issue detected")
                elif "model" in str(api_error).lower():
                    logger.error("Possible model availability issue detected")
                
                # Fallback to direct OpenAI call with simpler prompt
                logger.info("Attempting fallback to direct OpenAI call")
                system_prompt = f"""You are roleplaying as {buyer_persona.name}, a {buyer_persona.role}.
                
{buyer_persona.description}

Your personality traits: {', '.join(persona_traits)}
Your current emotional state: {buyer_persona.emotional_state}
Your buyer type: {buyer_persona.buyer_type}
Your decision-making authority: {buyer_persona.decision_authority}
Your primary concern: {buyer_persona.primary_concern}

IMPORTANT: You must stay in character as {buyer_persona.name} at all times. Respond as this specific buyer persona would respond to a salesperson, not as a sales coach or assistant.
"""
                response = openai_service.generate_response( # Using openai_service.generate_response
                    messages=[
                        {"role": "system", "content": system_prompt},
                        # Pass only the most recent few messages from history for context
                        *formatted_history[-10:], 
                    ]
                )
            except Exception as outer_error:
                logger.error(f"Outer error in generate_ai_response block: {str(outer_error)}")
                logger.error(f"Full outer exception details: {traceback.format_exc()}")
                response = f"I apologize, but I'm experiencing technical difficulties right now. Error details: {str(outer_error)}"
        except Exception as outer_error:
            logger.error(f"Outer error in generate_ai_response block: {str(outer_error)}")
            logger.error(f"Full outer exception details: {traceback.format_exc()}")
            response = f"I apologize, but I'm experiencing technical difficulties right now. Error details: {str(outer_error)}"
        
        # Check if the response is valid
        if not response or not isinstance(response, str):
            logger.error(f"Invalid response from AI service: {response}")
            response = f"Hi, this is {buyer_persona.name}. I'm interested in learning more about your product, but I'm a bit busy right now. Could you tell me the key benefits briefly?"
        
        # --- CORRECTED: Append AI response to history list ---
        try:
            ai_message_timestamp = datetime.utcnow()
            # Get current history again (could have changed if generate_roleplay_response modified it)
            history = session.conversation_history_dict or [] 
            if not isinstance(history, list):
                 history = [] # Reset if corrupted
                 
            # Create AI message dictionary
            ai_message_dict = {
                "role": "assistant",
                "content": response,
                "timestamp": ai_message_timestamp.isoformat()
            }
            # Handle case where response itself might be a dict (split message)
            ai_response_content = response
            if isinstance(response, dict):
                ai_response_content = response.get('response') or response.get('content') or str(response)
                ai_message_dict['content'] = ai_response_content
                # Add any extra keys from the response dict
                ai_message_dict.update({k: v for k, v in response.items() if k not in ['role', 'content', 'timestamp']})

            history.append(ai_message_dict)
            session.conversation_history_dict = history
            session.updated_at = ai_message_timestamp
            db.session.commit()
            logger.info(f"AI message appended to history for session {session.id}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error appending AI message to history for session {session.id}: {str(e)}\n{traceback.format_exc()}")
            # Return the generated response even if saving fails, but log the error
            
        # Return the content of the AI response
        return response # Return the actual response string or dict
        
    except Exception as e:
        logger.error(f"Error in process_user_message: {str(e)}", exc_info=True)
        # ADDING A CRITICAL LOG FOR DIAGNOSIS
        logger.critical("--- CRITICAL: process_user_message caught an exception ---") 
        return "I apologize, but I'm experiencing a technical issue. Please try again or restart the conversation." 