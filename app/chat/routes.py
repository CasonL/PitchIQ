"""
Chat routes for the Sales Training AI application.

This module provides routes for the chat interface, conversation management,
and interaction with the Claude AI service.
"""

from flask import (
    Blueprint,
    render_template,
    request,
    jsonify,
    redirect,
    url_for,
    flash,
    current_app,
    g,
    session,
    Response,
    stream_with_context
)
from flask_login import login_required, current_user
from app.models import db, Conversation, Message, UserProfile, Feedback, User, TrainingSession, BuyerPersona # Updated import
# Removed AI service imports, they are used in chat_services
# from claude_service import get_claude_service
# from openai_service import get_openai_service
from datetime import datetime, timedelta
# Removed typing imports if not directly used by routes
# from typing import List, Dict, Any, Optional
import json
import logging
import traceback
import socketio
from app import socketio as flask_socketio
import requests
import re
from deepgram import DeepgramClient

# Import the service functions
from app.chat.services import ( 
    generate_ai_response,
    parse_feedback_text, # Renamed from individual extractors
    update_user_profile_with_feedback,
    generate_buyer_persona
    # REMOVED: All old voice services - now using Deepgram voice-to-voice only
)
from app.services.openai_service import openai_service, OpenAIService # Updated import
from app.extensions import db, limiter
from app.training.services import generate_buyer_persona, generate_ai_response as generate_training_ai_response, analyze_interaction, create_training_session, get_training_session
from app.training.emotional_response import EmotionalResponseSystem

# REMOVED: Voice-related imports - now using Deepgram voice-to-voice only
# - voice_analysis_service (replaced by Deepgram analysis)
# - eleven_labs_service (replaced by Deepgram synthesis)
# - base64, tempfile, os for audio processing (handled by Deepgram)

# Create blueprint and logger
chat = Blueprint("chat", __name__, url_prefix="/chat")
logger = logging.getLogger(__name__)  # Initialize logger

# Initialize OpenAI Service
# openai_service = OpenAIService()
# voice_analysis_service = get_voice_analysis_service()

# Create a Socket.IO ASGI application
sio_asgi_app = socketio.ASGIApp(flask_socketio)

# REMOVED: Text preprocessing for ElevenLabs TTS - now using Deepgram voice synthesis

@chat.route("/")
@login_required
def chat_page():
    """Redirect to the React chat app."""
    # Update the URL to point to our frontend React app's chat page
    return redirect("/chat")

@chat.route("/<int:conversation_id>/message", methods=["POST"])
@login_required
def send_message(conversation_id):
    """Send a user message in a training session and get an AI response."""
    # 1. Validate Session
    try:
        # Fetch the session ensuring it belongs to the user and isn't completed
        session = TrainingSession.query.filter_by(
            id=conversation_id,
            user_profile_id=current_user.profile.id
        ).first()

        if not session:
            return jsonify({"error": "Conversation not found or access denied"}), 404
        if session.status == 'completed':
             return jsonify({"error": "This session has ended."}), 400

    except Exception as e:
        logger.error(f"Error retrieving session {conversation_id} in send_message: {str(e)}")
        return jsonify({"error": "Could not retrieve session"}), 500

    # 2. Get Message Content
    data = request.json
    if not data or not data.get("message"):
        return jsonify({"error": "No message provided"}), 400
    user_message_content = data.get("message")
    
    # Extract any conversation metadata if available
    conversation_metadata = data.get("conversation_metadata", None)
    
    # Get ElevenLabs flags from request
    use_elevenlabs = data.get("useElevenLabs", False) # Default to False if not provided
    selected_voice = data.get("selectedVoice", None)
    voice_id = selected_voice.get("id") if isinstance(selected_voice, dict) else None

    logger.info(f"Received message for session {conversation_id}. useElevenLabs: {use_elevenlabs}, voice_id: {voice_id}")

    # 3. Append User Message to Session History
    try:
        # Get current history (ensure it's a list)
        history = session.conversation_history_dict or []
        if not isinstance(history, list):
             logger.warning(f"History for session {session.id} was not a list, resetting.")
             history = []

        # Create user message dictionary
        user_message_dict = {
            "role": "user",
            "content": user_message_content,
            "timestamp": datetime.utcnow().isoformat() # Use ISO format string
        }
        history.append(user_message_dict)

        # Update the session object using the property setter (handles JSON conversion)
        session.conversation_history_dict = history
        session.updated_at = datetime.utcnow() # Update session timestamp

        # Commit the session object
        db.session.commit()
        logger.info(f"User message appended to history for session {session.id}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error appending user message to history for session {session.id}: {str(e)}\\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to save user message"}), 500

    # 4. Generate AI Response (using training service)
    try:
        # Use the AI response function from the training service
        # Adding log to verify session is a proper object not a string
        logger.info(f"Sending message to generate_training_ai_response. Session ID: {session.id if hasattr(session, 'id') else 'UNKNOWN'}")
        
        # Pass conversation_metadata if available
        if conversation_metadata:
            logger.info(f"Passing conversation metadata to AI response generator: {json.dumps(conversation_metadata)[:200]}...")
            ai_response_result = generate_training_ai_response(user_message_content, session, conversation_metadata)
        else:
            ai_response_result = generate_training_ai_response(user_message_content, session)
        
        # The function returns a tuple of (response, session_object)
        if isinstance(ai_response_result, tuple) and len(ai_response_result) == 2:
            ai_response, updated_session = ai_response_result
            # Ensure updated_session is a valid session object
            if hasattr(updated_session, 'id'):
                session = updated_session
        else:
            ai_response = ai_response_result
        
        # Handle different response formats
        ai_message_content = str(ai_response) # Ensure we have the text
        ai_response_data = {'content': ai_message_content}
        if isinstance(ai_response, dict): # Merge if dict
            ai_response_data = ai_response
            ai_message_content = ai_response_data.get('content') or ai_response_data.get('response') or ""
            ai_response_data['content'] = ai_message_content # Ensure content key is there
        
        if not ai_message_content:
            logger.error(f"Failed to generate AI response for session {session.id}")
            return jsonify({"error": "Failed to get AI response"}), 500

    except Exception as e:
        logger.error(f"Error generating AI response for session {conversation_id}: {str(e)}\\n{traceback.format_exc()}")
        return jsonify({"error": f"Error generating AI response: {str(e)}"}), 500

    # 5. Append AI Message to Session History (adjusted step number)
    ai_message_id = None
    ai_message_timestamp = datetime.utcnow()
    try:
        # Get current history again (ensure it's a list)
        history = session.conversation_history_dict or []
        if not isinstance(history, list):
             logger.warning(f"History for session {session.id} was not a list before AI msg, resetting.")
             history = [user_message_dict] # Include the user message we just added

        # Store AI message content as is
        
        # Update content in response data dictionary if it exists
        if isinstance(ai_response_data, dict) and 'content' in ai_response_data:
            ai_response_data['content'] = ai_message_content

        # Create AI message dictionary
        ai_message_dict = {
            "role": "assistant",
            "content": ai_message_content,
            "timestamp": ai_message_timestamp.isoformat()
        }
        ai_message_dict.update({k: v for k, v in ai_response_data.items() if k not in ['content', 'role', 'timestamp']})
        # --- NO audio_url added here --- 

        history.append(ai_message_dict)
        session.conversation_history_dict = history
        session.updated_at = ai_message_timestamp
        db.session.commit()
        logger.info(f"AI message appended to history for session {session.id}")
        import hashlib
        ai_message_id = hashlib.sha1(ai_message_timestamp.isoformat().encode()).hexdigest()[:8]
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error appending AI message to history for session {session.id}: {str(e)}\\\\n{traceback.format_exc()}")
        pass

    # 6. Return AI Response (adjusted step number)
    response_payload = {
        "role": "assistant",
        "content": ai_message_content,
        "timestamp": ai_message_timestamp.isoformat()
    }
    if ai_message_id:
        response_payload["message_id"] = ai_message_id
    response_payload.update({k: v for k, v in ai_response_data.items() if k not in ['content', 'role', 'timestamp']})
    # --- NO audio_url in final payload --- 
    logger.debug(f"Returning TEXT payload WITHOUT audio_url for session {session.id}")

    return jsonify(response_payload)

# REMOVED: get_feedback route (Likely handled by training blueprint's summary view)

# REMOVED: delete_conversation route (Keep general management routes for now)
# REMOVED: toggle_saved_conversation route
# REMOVED: delete_conversations_without_feedback route
# REMOVED: delete_selected_conversations route
# REMOVED: delete_all_conversations route
# REMOVED: delete_old_conversations route
# REMOVED: delete_new_conversations route

# REMOVED: debug_conversation route

# Keep /new for starting, but redirect to /start
@chat.route("/new", methods=["GET"])
@login_required
def new_conversation_redirect():
     """Redirects legacy /new route to the proper /start route."""
     logger.info("Redirecting from /chat/new to /chat/start")
     return redirect(url_for('chat.start'))

# REMOVED: /api/send route (Consolidated into /<id>/message)

# REMOVED: /show/<id> route (Handled by /chat/?conversation_id=)

# Reformatted end_conversation function for minimalism and clarity
@chat.route('/end/<int:conversation_id>', methods=['POST'])
@login_required
def end_conversation(conversation_id):
    """End session and redirect."""
    try:
        from app.training.services import end_training_session
        session = end_training_session(conversation_id, current_user.profile.id)
        if session:
            flash("Session ended and feedback generated.", "success")
            return jsonify({
                "status": "success",
                "message": "Session ended.",
                "redirect_url": url_for('training.show_session_summary', session_id=session.id)
            })
        flash("Could not end the session.", "warning")
        logger.warning(f"Session {conversation_id} not ended.")
        return jsonify({
            "status": "error",
            "message": "Could not end session.",
            "redirect_url": url_for('training.show_dashboard')
        }), 400
    except Exception as e:
        logger.error(f"Error ending session {conversation_id}: {e}")
        flash("Error ending session.", "error")
        return jsonify({
            "status": "error",
            "message": f"Server error: {e}",
            "redirect_url": url_for('training.show_dashboard')
        }), 500


# REMOVED: Old voice routes - now using Deepgram voice-to-voice only
# These routes are no longer needed:
# - /api/transcribe (replaced by Deepgram real-time transcription)
# - /api/analyze-voice (replaced by Deepgram voice analysis)  
# - /api/advanced-voice-metrics (replaced by Deepgram metrics)

# Keep SocketIO handlers
@flask_socketio.on('connect')
def handle_connect():
    # ... (Keep existing connect logic) ...
     pass # Placeholder

@flask_socketio.on('disconnect')
def handle_disconnect():
    # ... (Keep existing disconnect logic) ...
     pass # Placeholder

@flask_socketio.on('message')
def handle_message(data):
    # ... (Keep existing message handling logic - might need adjustment) ...
    pass # Placeholder

# REMOVED: /send route (Consolidated into /<id>/message)

# Reformatted start function for minimalism and clarity
@chat.route('/start')
@login_required
def start():
    """Redirect to the React chat app."""
    # Update the URL to point to our frontend React app's chat page
    return redirect("/chat")


# Keep manual profile setup API for now, but consider moving to auth/training
@chat.route('/api/profile/manual-setup', methods=['POST'])
@login_required
def manual_profile_setup():
    # ... (Keep existing logic) ...
    pass

@chat.route('/api/deepgram/token', methods=['GET'])
@login_required
def get_deepgram_token():
    """Generates a short-lived Deepgram API key for the client."""
    try:
        deepgram_client = DeepgramClient(current_app.config["DEEPGRAM_API_KEY"])
        
        project_id = current_app.config.get("DEEPGRAM_PROJECT_ID")
        if not project_id:
            logger.warning("DEEPGRAM_PROJECT_ID not found in config. Cannot create scoped key.")
            # As a fallback, maybe return an error or a master key if absolutely necessary for dev
            return jsonify({"error": "Deepgram project ID not configured on server."}), 500

        key_options = {
            "comment": f"Temporary key for user {current_user.id}",
            "scopes": ["usage:write"],
            "time_to_live_in_seconds": 600  # 10 minutes
        }
        
        response = deepgram_client.manage.v("1").projects.create_key(project_id, key_options)
        
        logger.info(f"Successfully created temporary Deepgram key for user {current_user.id}")
        return jsonify({"token": response.key})

    except Exception as e:
        logger.error(f"Error generating Deepgram token: {e}", exc_info=True)
        return jsonify({"error": "Failed to generate Deepgram token"}), 500

# Note: The old '/api/get_deepgram_token' and 'get_deepgram_token_alt' are now consolidated
# into the single correct endpoint above.

# Direct endpoint at /api/chat that the React frontend can call
@chat.route('/api/chat', methods=['POST'])
@login_required
def api_chat_endpoint():
    """Handle chat API requests from the React app."""
    # --- TEMPORARILY SIMPLIFIED FOR TESTING ---
    # logger.critical("--- CRITICAL: ENTERED SIMPLIFIED api_chat_endpoint ---")
    # try:
    #     # Directly return success without doing anything else
    #     return jsonify({"message": "Simplified endpoint reached successfully"}), 200
    # except Exception as e:
    #     # Keep the print/log for this simplified case too
    #     import sys
    #     print(f"--- PRINTED TO STDERR: Error in SIMPLIFIED API chat: {str(e)} ---", file=sys.stderr)
    #     print(f"--- PRINTED TO STDERR: Traceback follows ---", file=sys.stderr)
    #     import traceback
    #     traceback.print_exc(file=sys.stderr)
    #     print(f"--- PRINTED TO STDERR: End of Traceback ---", file=sys.stderr)
    #     sys.stderr.flush() # Force flush
    #     logger.error(f"Error in SIMPLIFIED API chat: {str(e)}", exc_info=True)
    #     logger.critical("--- CRITICAL: ENTERED SIMPLIFIED api_chat_endpoint EXCEPT --- ")
    #     return jsonify({
    #         'error': "Error in simplified endpoint",
    #         'original_error': str(e),
    #         'response': "Something went wrong even in the simplified endpoint."
    #     }), 500
    # --- END SIMPLIFIED CODE ---

    # --- ORIGINAL CODE RESTORED (with extra logging/prints) ---
    # ADDING VERY FIRST LOG
    logger.critical("--- CRITICAL: ENTERED api_chat_endpoint ---") # Log attempt 0
    try:
        # Log the request for debugging
        logger.info(f"Received request to /api/chat: {request.headers.get('Content-Type')} {request.method}") # LOG 1
        
        # Validate Content-Type
        if not request.is_json:
            logger.error(f"Request does not have JSON Content-Type: {request.headers.get('Content-Type')}") # LOG 2
            return jsonify({'error': 'Request must be JSON'}), 415
            
        # Parse JSON data
        data = request.json
        if data is None:
            logger.error("Failed to parse JSON data from request") # LOG 3
            return jsonify({'error': 'Invalid JSON in request body'}), 400
            
        # Get message from JSON
        message = data.get('message', '')
        logger.info(f"Received message: {message[:50]}...") # LOG 4
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Check if user is authenticated
        if not current_user.is_authenticated:
            logger.warning("Unauthenticated user attempting to use chat API") # LOG 5
            return jsonify({'error': 'Authentication required'}), 401
            
        # --- FORCE AN ERROR HERE FOR TESTING ---
        # raise ValueError("--- Deliberate error before inner try block ---") # Commented out
        # --- END FORCED ERROR ---
            
        # Try to get or create a session
        try:
            # Get or create active session
            active_session = TrainingSession.query.filter( # DB Query 1
                TrainingSession.user_profile_id == current_user.profile.id,
                TrainingSession.status != 'completed'
            ).order_by(TrainingSession.start_time.desc()).first()
            
            if not active_session:
                logger.info(f"No active session found for user {current_user.id}, creating new session") # LOG 6
                active_session = create_training_session(current_user.profile.id) # Call to another service
                if not active_session:
                    logger.error(f"Failed to create training session for user {current_user.id}") # LOG 7
                    return jsonify({'error': 'Failed to create training session'}), 500
            
            # Use the improved conversation service
            from app.services.conversation_service import process_user_message # Import
            logger.info(f"Calling process_user_message with session_id={active_session.id}")
            response = process_user_message(active_session.id, message, current_user.profile.id) # Call to our problematic service
            logger.info(f"Received response from conversation service: {response[:50]}...") # LOG 8
            
            # Return the response
            return jsonify({
                'session_id': active_session.id,
                'response': response,
            })
        except Exception as session_error:
            logger.error(f"Session error: {str(session_error)}", exc_info=True) # LOG 9 (Inner except)
            
            # Add more detailed error logging
            import traceback
            err_traceback = traceback.format_exc()
            logger.error(f"Full traceback for session error: {err_traceback}")
            
            # Check for specific error types
            if "OpenAI" in str(session_error) or "API" in str(session_error):
                logger.error("API service error detected")
            elif "database" in str(session_error).lower() or "db" in str(session_error).lower():
                logger.error("Database error detected")
            elif "state" in str(session_error).lower() or "conversation" in str(session_error).lower():
                logger.error("Conversation state error detected")
                
            return jsonify({
                'error': str(session_error),
                'response': "I'm having technical difficulties. Please try refreshing the page or starting a new conversation."
            }), 500
    except Exception as e:
        # ADD PRINT STATEMENT FOR DIAGNOSIS
        import sys
        print(f"--- PRINTED TO STDERR: Error in API chat: {str(e)} ---", file=sys.stderr)
        print(f"--- PRINTED TO STDERR: Traceback follows ---", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(f"--- PRINTED TO STDERR: End of Traceback ---", file=sys.stderr)
        sys.stderr.flush() # Force flush

        # Keep existing logs as well, just in case
        logger.error(f"Error in API chat: {str(e)}", exc_info=True) # LOG 10a
        logger.critical("--- CRITICAL: ENTERED api_chat_endpoint OUTER EXCEPT --- ") # LOG 10b
        return jsonify({
            'error': str(e),
            'response': "I apologize, but I'm experiencing a technical difficulties. Please try again later."
        }), 500
    # --- END ORIGINAL CODE ---

# Moved from app/__init__.py
# REMOVED: Duplicate TTS route - now using Deepgram voice-to-voice only

# Note: No need for a separate /api/chat route here, 
# the existing api_chat_endpoint above serves this purpose.

@chat.route('/api/initial-greeting', methods=['POST'])
@login_required
def get_initial_greeting():
    """Generate a personalized initial greeting for the user."""
    try:
        data = request.json or {}
        context = data.get('context', 'sales_coach')
        user_name = data.get('userName', '')
        
        # Get user profile for personalization
        user_profile = None
        if current_user.is_authenticated and hasattr(current_user, 'profile'):
            user_profile = current_user.profile
        
        # Log the request
        logger.info(f"Generating initial greeting for user {current_user.id} with context {context}")
        
        # Use the appropriate AI service based on your application design
        ai_service = openai_service
        
        # Build the prompt for the AI
        system_prompt = """You are a friendly, professional sales coach AI. 
        Generate a warm, welcoming initial greeting to start a conversation with a user.
        Keep it brief (under 50 words) and conversational.
        Ask the user to describe their product or service in 1-2 sentences.
        Add a touch of enthusiasm but remain professional."""
        
        # Add personalization if username is available
        if user_name:
            system_prompt += f"\nAddress the user by their name: {user_name}."
        
        # Previous conversation history if available
        conversation_history = []
        
        try:
            # Call the AI service to generate the greeting
            response = ai_service.generate_chat_completion(
                system_prompt=system_prompt,
                messages=conversation_history,
                user_message="Generate an initial greeting for a sales coaching session.",
                temperature=0.7,  # Slightly more creative
                max_tokens=100
            )
            
            greeting = response.get('content', "")
            
            # Fallback if empty response
            if not greeting:
                greeting = f"Hi{' ' + user_name if user_name else ''}! I'm your AI sales coach. To provide you with tailored coaching, could you describe your product or service in 1-2 sentences?"
                
            return jsonify({
                "status": "success",
                "message": greeting
            })
            
        except Exception as e:
            logger.error(f"Error generating greeting with AI service: {str(e)}")
            # Fallback greeting
            fallback = f"Hi{' ' + user_name if user_name else ''}! I'm your AI sales coach. To provide you with tailored coaching, could you describe your product or service in 1-2 sentences?"
            return jsonify({
                "status": "success",
                "message": fallback
            })
            
    except Exception as e:
        logger.error(f"Error in initial greeting endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Hi there! I'm your AI sales coach. How can I help you today?"
        }), 500

@chat.route('/api/chat/enhance-question', methods=['POST'])
@login_required
def enhance_question():
    """Enhance a base question with context from previous responses."""
    try:
        data = request.json or {}
        base_question = data.get('baseQuestion', '')
        previous_answers = data.get('previousAnswers', [])
        current_stage = data.get('currentStage', '')
        
        if not base_question:
            return jsonify({"error": "No base question provided"}), 400
            
        # Log the request
        logger.info(f"Enhancing question with context: {base_question[:50]}...")
        
        # Use OpenAI service to enhance the question
        system_prompt = """You are an AI sales coach having a conversation with a user about their business.
        Your task is to enhance a base question with context from their previous answers to make it more specific and relevant.
        Make the question conversational, natural, and tailored to what you know about their business.
        
        Guidelines:
        - Reference specific details from their previous answers
        - Make connections between different aspects of their business
        - Ask for elaboration on interesting points
        - Keep a friendly, coach-like tone
        - Keep the enhanced question concise (1-2 sentences)
        - Stay focused on the current conversational stage (product, market, or sales context)
        """
        
        # Prepare context from previous answers
        context = ""
        if previous_answers:
            context = "Previous responses:\n"
            for i, answer in enumerate(previous_answers):
                context += f"Question: {answer.get('question', 'Unknown')}\n"
                context += f"Answer: {answer.get('text', 'Unknown')}\n\n"
                
        # Prepare user message with the base question and context
        user_message = f"""
        Base Question: {base_question}
        Current Stage: {current_stage}
        
        {context}
        
        Please enhance this question to make it more contextual and specific to the user's business.
        """
        
        # Call the OpenAI API
        response = openai_service.chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=200
        )
        
        enhanced_question = response.get('content', base_question)
        
        # Log the result
        logger.info(f"Enhanced question: {enhanced_question[:50]}...")
        
        return jsonify({
            "enhancedQuestion": enhanced_question
        })
        
    except Exception as e:
        logger.error(f"Error enhancing question: {str(e)}")
        return jsonify({"error": str(e), "enhancedQuestion": base_question}), 500

@chat.route('/api/chat/followup-question', methods=['POST'])
@login_required
def followup_question():
    """Generate a contextual follow-up question based on user response."""
    try:
        data = request.json or {}
        user_response = data.get('userResponse', '')
        current_question = data.get('currentQuestion', '')
        previous_answers = data.get('previousAnswers', [])
        current_stage = data.get('currentStage', '')
        
        if not user_response:
            return jsonify({"error": "No user response provided"}), 400
            
        # Log the request
        logger.info(f"Generating follow-up for response: {user_response[:50]}...")
        
        # Use OpenAI service to generate a follow-up question
        system_prompt = """You are an AI sales coach having a conversation with a user about their business.
        Your task is to generate an insightful follow-up question based on their response.
        
        Guidelines:
        - Identify interesting details or gaps in their response to explore further
        - Ask for specific examples or elaboration when appropriate
        - Connect their response to broader sales or business concepts
        - Keep the question concise and focused (1 sentence)
        - Stay within the current conversational stage (product, market, or sales context)
        - Don't repeat previously asked questions
        - Focus on helping them uncover insights about their business
        """
        
        # Prepare context from previous answers
        context = ""
        if previous_answers:
            context = "Previous Q&A:\n"
            for i, answer in enumerate(previous_answers):
                context += f"Q: {answer.get('question', 'Unknown')}\n"
                context += f"A: {answer.get('text', 'Unknown')}\n\n"
                
        # Prepare user message with the response and context
        user_message = f"""
        Current Stage: {current_stage}
        Current Question: {current_question}
        User Response: {user_response}
        
        {context}
        
        Based on their response, what would be an insightful follow-up question that helps them think deeper about this aspect of their business?
        """
        
        # Call the OpenAI API
        response = openai_service.chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=100
        )
        
        followup_question = response.get('content', '')
        
        # Log the result
        logger.info(f"Generated follow-up question: {followup_question[:50]}...")
        
        return jsonify({
            "followUpQuestion": followup_question
        })
        
    except Exception as e:
        logger.error(f"Error generating follow-up question: {str(e)}")
        return jsonify({"error": str(e)}), 500

@chat.route('/api/embeddings', methods=['POST'])
@login_required
def generate_embeddings():
    """Generate embeddings for text using OpenAI's embedding model."""
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "Text is required"}), 400
            
        text = data.get('text')
        
        # Log the request (truncate long texts)
        display_text = text[:50] + "..." if len(text) > 50 else text
        logger.info(f"Generating embeddings for: {display_text}")
        
        # Call OpenAI to generate embeddings
        embedding_response = openai_service.create_embedding(text)
        
        # Extract the embedding vector
        embedding = embedding_response.get('embedding', [])
        
        if not embedding:
            logger.error("Failed to generate embedding: empty response")
            return jsonify({"error": "Failed to generate embedding"}), 500
            
        return jsonify({"embedding": embedding})
        
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        return jsonify({"error": str(e)}), 500

