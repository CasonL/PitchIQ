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

# Import the service functions
from app.chat.services import ( # Updated import
    generate_ai_response,
    parse_feedback_text, # Renamed from individual extractors
    update_user_profile_with_feedback,
    generate_buyer_persona
    # Removed unused imports:
    # handle_onboarding_message,
    # handle_session_setup,
    # handle_setup_message
)
from app.services.openai_service import openai_service, OpenAIService # Updated import
from app.extensions import db, limiter
from app.training.services import generate_buyer_persona, generate_ai_response as generate_training_ai_response, analyze_interaction, create_training_session, get_training_session
from app.training.emotional_response import EmotionalResponseSystem

# Import OpenAI for transcribing audio
import base64
import tempfile
import os
from app.services.voice_analysis_service import voice_analysis_service, get_voice_analysis_service
from app.services.eleven_labs_service import eleven_labs_service

# Create blueprint and logger
chat = Blueprint("chat", __name__, url_prefix="/chat")
logger = logging.getLogger(__name__)  # Initialize logger

# Initialize OpenAI Service
# openai_service = OpenAIService()
# voice_analysis_service = get_voice_analysis_service()

# Create a Socket.IO ASGI application
sio_asgi_app = socketio.ASGIApp(flask_socketio)

# Text preprocessing for more natural speech
def preprocess_text_for_speech(text):
    """
    Make AI text sound more conversational and natural for speech synthesis.
    Adds appropriate disfluencies based on psychological research to make speech sound authentic.
    """
    if not text:
        return text
        
    # Add contractions and make language more casual
    replacements = {
        r'\bI am\b': "I'm",
        r'\byou are\b': "you're",
        r'\bthey are\b': "they're",
        r'\bwe are\b': "we're",
        r'\bis not\b': "isn't",
        r'\bdoes not\b': "doesn't",
        r'\bdo not\b': "don't",
        r'\bcannot\b': "can't",
        r'\bwill not\b': "won't",
        r'\bwhat is\b': "what's",
        r'\bthat is\b': "that's",
        r'\bit is\b': "it's",
        r'\bhere is\b': "here's",
        r'\bthere is\b': "there's",
        r'\bhow is\b': "how's",
        r'\bwould have\b': "would've",
        r'\bcould have\b': "could've",
        r'\bshould have\b': "should've",
        r'\bmight have\b': "might've",
        r'\bwould not\b': "wouldn't",
        r'\bcould not\b': "couldn't",
        r'\bshould not\b': "shouldn't",
        # Remove transitions that add filler words
        # r'(\. )([A-Z])': r'. Alright, \2',  # Remove transitions between thoughts
        # r'(\? )([A-Z])': r'? Well, \2',  # Remove transitions after questions
        r'\b(However|Furthermore|Moreover)\b': r'Also',  # Simplify formal transitions
        r'\bin conclusion\b': r'So',  # More casual closing
    }
    
    # Apply replacements
    processed_text = text
    for pattern, replacement in replacements.items():
        processed_text = re.sub(pattern, replacement, processed_text, flags=re.IGNORECASE)
    
    # Break up very long sentences (over 20 words)
    sentences = re.split(r'([.!?])', processed_text)
    result_sentences = []
    for i in range(0, len(sentences), 2):
        if i+1 < len(sentences):
            sentence = sentences[i] + sentences[i+1]  # Combine with punctuation
            words = sentence.split()
            if len(words) > 20:  # If sentence is too long
                midpoint = len(words) // 2
                # Find a good breaking point near the middle (after a comma, if possible)
                comma_positions = [j for j, word in enumerate(words[:midpoint+5]) if ',' in word]
                if comma_positions:
                    # Use the last comma before or near the midpoint
                    break_point = max(pos for pos in comma_positions if pos <= midpoint+5)
                else:
                    break_point = midpoint
                    
                first_half = ' '.join(words[:break_point+1])
                second_half = ' '.join(words[break_point+1:])
                
                # Add a pause marker for better speech rhythm
                if not first_half.endswith(('.', '!', '?')):
                    first_half += '...'
                
                result_sentences.append(first_half)
                result_sentences.append(second_half)
            else:
                result_sentences.append(sentence)
        elif i < len(sentences):
            result_sentences.append(sentences[i])
    
    processed_text = ' '.join(result_sentences)
    
    # Add gentle pauses with commas
    processed_text = re.sub(r'(\w+) (but|and|or|so) (\w+)', r'\1, \2 \3', processed_text)
    
    # Add strategic disfluencies for authenticity (research shows 5% optimal rate)
    # Calculate total word count
    words = processed_text.split()
    word_count = len(words)
    
    # Research shows 5% disfluency rate sounds natural without being distracting
    # For complex responses and especially for uncertain statements or objection responses
    target_disfluency_count = max(1, int(word_count * 0.05))
    
    # Find potential positions for disfluencies at natural pause points
    # Especially before substantial statements or after punctuation
    candidates = []
    
    # After sentence starts (but not at the very beginning)
    for match in re.finditer(r'([.!?]\s+)([A-Z][a-z]+\s+)', processed_text):
        candidates.append(match.end())
    
    # Before important transition words or phrases
    for transition in ['but', 'actually', 'so', 'now', 'regarding', 'about', 'think', 'believe']:
        for match in re.finditer(r'\b(' + transition + r')\b', processed_text, re.IGNORECASE):
            candidates.append(match.start())
            
    # Before clauses following commas
    for match in re.finditer(r'(,\s+)([a-z]+)', processed_text):
        candidates.append(match.end(1))
    
    # If we don't have enough candidates, add more positions
    if len(candidates) < target_disfluency_count:
        # Add positions before some verbs or sentence subjects
        for match in re.finditer(r'\s+([A-Z][a-z]+\s+)', processed_text):
            if match.start() > 20:  # Not too close to beginning
                candidates.append(match.start())
                if len(candidates) >= target_disfluency_count * 3:  # Get 3x as many as needed for selection
                    break
    
    # Shuffle and select the needed number of positions
    import random
    random.shuffle(candidates)
    selected_positions = sorted(candidates[:target_disfluency_count])
    
    # Disfluency types to choose from (with their weights)
    disfluencies = {
        ' um ': 3,
        ' uh ': 3,
        ' hmm ': 1,
        ' you know ': 1, 
        ' I mean ': 1,
        ' like ': 1
    }
    
    # Apply disfluencies - work from end to beginning to keep positions valid
    for pos in reversed(selected_positions):
        # Randomly select a disfluency based on weights
        items = list(disfluencies.items())
        weights = [w for _, w in items]
        disfluency = random.choices([d for d, _ in items], weights=weights, k=1)[0]
        
        # Insert at position
        processed_text = processed_text[:pos] + disfluency + processed_text[pos:]
    
    # Remove repeated spaces and clean up
    processed_text = re.sub(r' +', ' ', processed_text).strip()
    
    return processed_text

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


# Keep API routes for voice/transcription
@chat.route('/api/transcribe', methods=['POST'])
@login_required
def transcribe_audio():
    # ... (Keep existing transcription logic) ...
    pass # Placeholder

@chat.route('/api/analyze-voice', methods=['POST'])
@login_required
def analyze_voice():
    # ... (Keep existing voice analysis logic) ...
     pass # Placeholder

@chat.route('/api/advanced-voice-metrics', methods=['POST'])
@login_required
def advanced_voice_metrics():
     # ... (Keep existing advanced metrics logic) ...
     pass # Placeholder

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
     pass # Placeholder

# REMOVED: register_routes function (Not standard Flask practice)

# --- ElevenLabs Helper Function ---
def _get_elevenlabs_audio_url(text: str, voice_id: str = None, model_id: str = "eleven_multilingual_v2") -> str | None:
    """Calls ElevenLabs API to generate TTS and returns audio URL (or None on failure)."""
    if not text:
        return None

    # Default voice if none provided
    voice_id = voice_id or "21m00Tcm4TlvDq8ikWAM" # Default Rachel
    logger.debug(f"Requesting TTS for voice_id: {voice_id}")

    # --- Get API Key (Copied from original /api/tts) ---
    api_key = current_app.config.get('ELEVEN_LABS_API_KEY')
    if not api_key:
        import os
        api_key = os.environ.get('ELEVEN_LABS_API_KEY')
        if not api_key:
            api_key = os.environ.get('ELEVENLABS_API_KEY')
            if api_key: logger.info("Found API key using ELEVENLABS_API_KEY env var")

    if not api_key:
        logger.error("Eleven Labs API key not configured for TTS helper")
        return None
    # --- End API Key Logic ---

    # API endpoint (non-streaming for getting URL)
    # NOTE: This assumes ElevenLabs returns a URL or allows retrieval. If not, we need to adapt.
    # For now, let's assume we need to call the non-streaming endpoint and maybe handle the binary?
    # A better approach would be to save the audio and return a local URL, but let's try the simplest first.
    # Trying the non-streaming endpoint first.
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    payload = {
        "text": preprocess_text_for_speech(text), # Preprocess here
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.65,
            "similarity_boost": 0.85,
            "style": 0.35,
            "use_speaker_boost": True
        }
    }

    try:
        logger.info(f"Making NON-STREAMING TTS API request to {url} for voice {voice_id}")
        response = requests.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            # TODO: Determine how to get a URL. For now, this function can't return one.
            # Option 1: Save the response.content to a file and return a local URL.
            # Option 2: Check if ElevenLabs API offers a way to get a temporary URL.
            # Option 3: Return the binary content directly (would require frontend changes).
            # FOR NOW: We cannot return a URL with this basic approach. Log and return None.
            logger.warning(f"TTS API call successful, but cannot return audio URL with current implementation. Need to save audio.")
            # Example: Save and return URL (requires file saving logic)
            # import uuid
            # filename = f"{uuid.uuid4()}.mp3"
            # filepath = os.path.join(current_app.static_folder, 'tts_audio', filename)
            # os.makedirs(os.path.dirname(filepath), exist_ok=True)
            # with open(filepath, 'wb') as f:
            #     f.write(response.content)
            # return url_for('static', filename=f'tts_audio/{filename}', _external=True)
            return None # Placeholder until saving/URL logic is implemented
        else:
            logger.error(f"Eleven Labs API error (non-streaming): {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Exception calling Eleven Labs API: {str(e)}", exc_info=True)
        return None

# --- Update /api/tts route to use the helper --- 
@chat.route('/api/tts', methods=['POST'])
@login_required
def text_to_speech():
    """
    Endpoint to convert text to speech using ElevenLabs API.
    Accepts POST requests with JSON payload containing 'text' and optional 'voice_id'.
    Streams the audio response back to the client.
    """
    # --- Add Logging ---
    logger.info("Entered text_to_speech endpoint")
    if not request.is_json:
        logger.error("TTS request is not JSON")
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()
    text_to_speak = data.get('text')
    voice_id = data.get('voice_id', '21m00Tcm4TlvDq8ikWAM') # Default voice if not provided
    stream = data.get('stream', True) # Default to streaming if not specified
    
    logger.info(f"TTS Request - Text: '{text_to_speak[:50]}...', Voice ID: {voice_id}, Stream: {stream}")
    # --- End Logging ---

    if not text_to_speak:
        logger.error("TTS request missing 'text' field")
        return jsonify({"error": "Missing 'text' field in request"}), 400

    try:
        # Call the ElevenLabs service function
        # Ensure the service uses the current_app's logger or its own configured logger
        audio_stream_generator = eleven_labs_service.generate_audio_stream(
            text=text_to_speak,
            voice_id=voice_id,
            # --- Specify Output Format based on previous findings ---
            # Using 64kbps as it seemed more reliable
            output_format="mp3_44100_64" 
            # --- End Output Format ---
        )
        
        # --- Add Logging ---
        logger.info("Successfully called eleven_labs_service.generate_audio_stream")
        # --- End Logging ---

        # Stream the audio data back
        # Use a generator function for the response
        def generate():
            logger.info("Starting audio stream generation...")
            try:
                for chunk in audio_stream_generator:
                    if chunk:
                        # logger.debug(f"Streaming audio chunk, size: {len(chunk)}")
                        yield chunk
                    else:
                        logger.warning("Received empty chunk from audio generator")
                logger.info("Finished streaming audio chunks.")
            except Exception as e:
                logger.error(f"Error during audio stream generation: {e}", exc_info=True)
                # Yield an empty byte string or handle error appropriately
                yield b''

        # Return Flask Response with the generator
        return Response(stream_with_context(generate()), mimetype='audio/mpeg')

    except Exception as e:
        logger.error(f"Error in text_to_speech: {e}", exc_info=True)
        return jsonify({"error": f"Failed to generate speech: {str(e)}"}), 500

# Also add the endpoint with /chat prefix
@chat.route('/chat/api/tts', methods=['POST'])
@login_required
def chat_text_to_speech():
    """
    Duplicate endpoint for Eleven Labs text-to-speech API with /chat prefix.
    """
    return text_to_speech()

@chat.route('/api/get_deepgram_token', methods=['GET'])
@login_required
def get_deepgram_token():
    """Provides a short-lived Deepgram token."""
    # Use the current_app logger
    logger.info("Attempting to get Deepgram token from /chat/api/get_deepgram_token route")
    api_key = current_app.config.get('DEEPGRAM_API_KEY')
    if not api_key:
        logger.error("DEEPGRAM_API_KEY not configured in the application.")
        return jsonify({"error": "Deepgram API Key not configured"}), 500

    try:
        # In a real application, you would use the Deepgram API to generate
        # a short-lived token here using the main API key.
        # For simplicity now, we return the main key (less secure)
        # or a placeholder if you prefer.
        logger.warning("Returning main DEEPGRAM_API_KEY as token - Replace with short-lived token generation for production!")
        return jsonify({"token": api_key, "apiKey": api_key}) # Providing both for compatibility
    except Exception as e:
        logger.error(f"Error generating Deepgram token (placeholder): {e}", exc_info=True)
        return jsonify({"error": "Failed to generate token"}), 500

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
@chat.route('/api/tts', methods=['POST'])
@login_required
def app_text_to_speech():
    """Direct API route for TTS, calling the main TTS function."""
    return text_to_speech()

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

