from flask import Blueprint, render_template, redirect, url_for, flash, current_app, request, jsonify, Response, session
from flask_login import current_user, login_required
import logging
import time
from app.models import TrainingSession, BuyerPersona
import requests
import os
import traceback
import json
import base64
import random
from app.models import db
from app.services.openai_service import openai_service
from app.services.gpt4o_service import get_gpt4o_service
from app.services.conversation_state_manager import ConversationStateManager, ConversationPhase
from app.services.eleven_labs_service import get_eleven_labs_service
import re

# Create the blueprint
voice = Blueprint('voice', __name__, url_prefix='/voice')

# Set up logging
logger = logging.getLogger(__name__)

# In-memory storage for conversations
# This is a temporary solution for demo purposes
# In production, these would be stored in a database
voice_conversations = {}
voice_phase_managers = {}

@voice.route('/chat')
@login_required
def chat():
    """Redirect to the React chat app."""
    return redirect("/chat")

@voice.route('/api/conversation', methods=['POST'])
@login_required
def voice_conversation():
    """API endpoint for voice conversation."""
    try:
        # Get request data
        data = request.json
        message = data.get('message', '')
        conversation_id = data.get('conversation_id')
        persona = data.get('persona')
        
        # Log the request
        logger.info(f"Voice conversation request from user {current_user.id}: {message[:50]}...")
        
        # Here you would typically send the message to your LLM service
        # For demo purposes, we'll return a simple response
        if not message:
            return jsonify({'error': 'No message provided'}), 400
            
        # In a real implementation, you would:
        # 1. Send the message to your AI service
        # 2. Get the response
        # 3. Log the interaction
        # 4. Return the response
        
        # Mock response for testing
        if "hello" in message.lower() or "hi" in message.lower():
            response = "Hello! I'm your AI sales coach. How can I help you today?"
        elif "who are you" in message.lower():
            response = "I'm your PitchIQ AI sales coach, designed to help you improve your sales skills through practice and feedback."
        elif "product" in message.lower() or "offering" in message.lower():
            response = "Tell me more about your product. What specific features or benefits would you like to highlight?"
        elif "price" in message.lower() or "cost" in message.lower():
            response = "That's an important consideration. The price point should be positioned in terms of value rather than just cost. How do you usually handle pricing objections?"
        elif "competitor" in message.lower() or "alternative" in message.lower():
            response = "Knowing your competition is crucial. When comparing with competitors, focus on your unique value proposition rather than just features."
        elif "thank" in message.lower():
            response = "You're welcome! Is there anything else you'd like to discuss or practice?"
        else:
            response = "That's an interesting point. As a sales professional, consider how this approach aligns with your customer's needs and pain points. Would you like to expand on that?"
        
        # Return response
        return jsonify({
            'response': response,
            'conversation_id': conversation_id or f"convo-{current_user.id}-{int(time.time())}"
        })
        
    except Exception as e:
        logger.error(f"Error in voice conversation API: {str(e)}")
        return jsonify({'error': 'An error occurred processing your request'}), 500

@voice.route('/api/get_deepgram_token', methods=['GET'])
@login_required
def get_deepgram_token():
    """
    Creates and provides a temporary Deepgram API key for client-side use.
    
    This implementation creates a temporary key with:
    1. Limited scope (only speech:write for streaming audio)
    2. Short expiration time (10 minutes)
    3. Time-to-live limitation
    """
    try:
        # Get the main Deepgram API key from environment
        deepgram_api_key = current_app.config.get('DEEPGRAM_API_KEY')
        
        # If not in app config, check environment directly as fallback
        if not deepgram_api_key:
            deepgram_api_key = os.environ.get('DEEPGRAM_API_KEY')
        
        if not deepgram_api_key:
            logger.error("Deepgram API key not found in configuration or environment")
            return jsonify({'error': 'API key not configured'}), 500
            
        # Log this access (important for security monitoring)
        logger.info(f"Deepgram token requested by user {current_user.id}")
        
        # Use requests to create a temporary key
        # Create temporary key using Deepgram Management API
        # Documentation: https://developers.deepgram.com/reference/create-key
        project_id = "578dcb8a-027d-4557-8867-92df3b4c8f27"  # Your Deepgram project ID
        url = f"https://api.deepgram.com/v1/projects/{project_id}/keys"
        
        headers = {
            "Authorization": f"Token {deepgram_api_key}",
            "Content-Type": "application/json"
        }
        
        # Set up key parameters with minimal permissions
        payload = {
            "name": f"temp-browser-key-{current_user.id}",
            "scopes": ["speech:write"],  # Only allow sending speech (minimal permissions needed)
            "time_to_live_in_seconds": 600,  # 10 minutes
            "comment": f"Temporary browser key for user {current_user.id}"
        }
        
        # Make the request to create a temporary key
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            logger.error(f"Failed to create temporary Deepgram key: {response.text}")
            # For debugging only - in production, don't expose internal API responses
            logger.error(f"Request headers: {headers} (API key partially redacted)")
            logger.error(f"Request payload: {payload}")
            
            # Fallback to returning the main API key if temp key creation fails
            # In production, you might want to return an error instead
            logger.warning("Using fallback: returning main API key instead of temp key")
            return jsonify({'key': deepgram_api_key})
        
        # Extract the temporary key from the response
        try:
            temp_key = response.json().get('key')
            
            if not temp_key:
                logger.error("Temporary key not found in Deepgram response")
                logger.error(f"Response JSON: {response.json()}")
                # Fallback to main key
                return jsonify({'key': deepgram_api_key})
            
            # Return the temporary key
            logger.info(f"Successfully created temporary Deepgram key for user {current_user.id}")
            return jsonify({'key': temp_key})
            
        except (ValueError, KeyError) as e:
            logger.error(f"Error parsing Deepgram response: {str(e)}")
            logger.error(f"Response text: {response.text}")
            # Fallback to main key
            return jsonify({'key': deepgram_api_key})
        
    except Exception as e:
        logger.error(f"Error generating Deepgram token: {str(e)}")
        return jsonify({'error': 'Failed to generate token'}), 500

@voice.route('/api/tts', methods=['POST'])
@login_required
def text_to_speech():
    """Convert text to speech using ElevenLabs API.
    
    This endpoint receives text and optional voice parameters,
    then returns audio data from ElevenLabs.
    """
    try:
        # Get request data
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
            
        text = data.get('text')
        voice_id = data.get('voice_id', '9BWtsMINqrJLrRacOk9x')  # Default to 'Aria' voice
        
        # Log the request (without the full text for brevity)
        text_preview = text[:50] + '...' if len(text) > 50 else text
        logger.info(f"TTS request from user {current_user.id}: {text_preview}")
        
        # Get ElevenLabs API key
        eleven_labs_api_key = current_app.config.get('ELEVEN_LABS_API_KEY')
        
        if not eleven_labs_api_key:
            eleven_labs_api_key = os.environ.get('ELEVEN_LABS_API_KEY')
            
        if not eleven_labs_api_key:
            logger.error("ElevenLabs API key not found in configuration")
            return jsonify({'error': 'TTS service not configured'}), 500
        
        # ElevenLabs API endpoint
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        
        # Set headers with API key
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": eleven_labs_api_key
        }
        
        # Set up request data
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        # Make request to ElevenLabs
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
            return jsonify({'error': f'TTS service error: {response.status_code}'}), 500
            
        # Return the audio data with appropriate content type
        return Response(
            response.content,
            mimetype="audio/mpeg",
            headers={"Content-Type": "audio/mpeg"}
        )
        
    except Exception as e:
        logger.error(f"Error in TTS API: {str(e)}")
        return jsonify({'error': 'An error occurred processing TTS request'}), 500

@voice.route('/api/debug-tts', methods=['POST'])
@login_required
def debug_tts():
    """Debug endpoint for ElevenLabs TTS.
    
    This endpoint provides more detailed error information and 
    doesn't modify the response from ElevenLabs.
    """
    try:
        # Get request data
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
            
        text = data.get('text')
        voice_id = data.get('voice_id', '9BWtsMINqrJLrRacOk9x')  # Default to 'Aria' voice
        
        # Log the request
        text_preview = text[:50] + '...' if len(text) > 50 else text
        logger.info(f"Debug TTS request from user {current_user.id}: {text_preview}")
        
        # Get ElevenLabs API key
        eleven_labs_api_key = current_app.config.get('ELEVEN_LABS_API_KEY')
        
        if not eleven_labs_api_key:
            eleven_labs_api_key = os.environ.get('ELEVEN_LABS_API_KEY')
            
        if not eleven_labs_api_key:
            logger.error("ElevenLabs API key not found in configuration")
            return jsonify({
                'error': 'TTS service not configured',
                'details': {
                    'config_key': current_app.config.get('ELEVEN_LABS_API_KEY') is not None,
                    'env_key': os.environ.get('ELEVEN_LABS_API_KEY') is not None,
                    'env_key_alt': os.environ.get('ELEVENLABS_API_KEY') is not None
                }
            }), 500
        
        # ElevenLabs API endpoint
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        
        # Set headers with API key
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": eleven_labs_api_key
        }
        
        # Set up request data
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        # Make request to ElevenLabs
        logger.info(f"Sending request to ElevenLabs API: {url}")
        response = requests.post(url, json=payload, headers=headers)
        
        # Log response details
        logger.info(f"ElevenLabs response status: {response.status_code}")
        logger.info(f"ElevenLabs response headers: {dict(response.headers)}")
        
        if response.status_code != 200:
            error_text = response.text
            try:
                # Try to parse as JSON for better error reporting
                error_json = response.json()
                logger.error(f"ElevenLabs API error JSON: {error_json}")
                return jsonify({
                    'error': f'TTS service error: {response.status_code}',
                    'details': error_json
                }), 500
            except:
                # Fallback to text response
                logger.error(f"ElevenLabs API error text: {error_text}")
                return jsonify({
                    'error': f'TTS service error: {response.status_code}',
                    'details': error_text
                }), 500
        
        # Get content type from response
        content_type = response.headers.get('Content-Type', 'audio/mpeg')
        logger.info(f"Response Content-Type: {content_type}, Content length: {len(response.content)} bytes")
        
        # Return the audio data with detailed headers
        return Response(
            response.content,
            mimetype=content_type,
            headers={
                "Content-Type": content_type,
                "X-ElevenLabs-Voice-ID": voice_id,
                "X-Content-Length": str(len(response.content))
            }
        )
        
    except Exception as e:
        logger.exception(f"Error in debug TTS API: {str(e)}")
        return jsonify({
            'error': 'An error occurred processing TTS request',
            'exception': str(e),
            'traceback': str(traceback.format_exc())
        }), 500

@voice.route('/api/roleplay', methods=['POST'])
@login_required
def voice_roleplay_api():
    """Process voice chat messages in roleplay mode.
    
    This endpoint:
    1. Receives a text transcript from the frontend
    2. Simulates a buyer persona using GPT-4.1-mini
    3. Returns the AI response mimicking the buyer
    
    The frontend will separately call the TTS endpoint with the response.
    """
    try:
        # Get request data
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
            
        message = data.get('message')
        conversation_id = data.get('conversation_id')
        
        # Log the request (without the full message for brevity)
        message_preview = message[:50] + '...' if len(message) > 50 else message
        logger.info(f"Voice roleplay API request from user {current_user.id}: {message_preview}")
        
        # Get or create a conversation ID
        if not conversation_id:
            conversation_id = f"roleplay-{current_user.id}-{int(time.time())}"
        
        # Get or initialize conversation history
        user_conv_key = f"user_{current_user.id}"
        
        # Initialize conversations dictionary for this user if it doesn't exist
        if user_conv_key not in voice_conversations:
            voice_conversations[user_conv_key] = {}
            
        # Get or create a phase manager for this conversation
        if conversation_id not in voice_phase_managers:
            voice_phase_managers[conversation_id] = ConversationStateManager()
            
        phase_manager = voice_phase_managers[conversation_id]
        
        # Get the gpt4o service for persona generation and responses
        gpt4o_service = get_gpt4o_service()
        if not gpt4o_service:
            logger.error("Could not initialize GPT4o service")
            return jsonify({'error': 'AI service unavailable'}), 500
        
        # Create or get a persona for this conversation
        persona_dict_key = f"{conversation_id}_persona"
        
        # If first time in this conversation, generate a new persona
        if persona_dict_key not in voice_conversations[user_conv_key]:
            try:
                # Define sales info context for persona generation
                sales_info = {
                    "product_service": "sales training software",
                    "target_market": random.choice(["B2B SaaS", "B2B Tech", "Enterprise Software"]),
                    "sales_experience": random.choice(["beginner", "intermediate", "experienced"])
                }
                
                # Generate a dynamic persona using GPT-4.1-mini
                logger.info(f"Generating new persona for conversation {conversation_id}")
                persona_text = gpt4o_service.generate_customer_persona(sales_info)
                
                # Parse the persona text into a structured dictionary
                # Extract key details using regex or simple parsing
                name_match = re.search(r"Name:\s*(.*?)(?:\n|$)", persona_text, re.I)
                role_match = re.search(r"(?:Title|Role|Position):\s*(.*?)(?:\n|$)", persona_text, re.I)
                company_match = re.search(r"Company:\s*(.*?)(?:\n|$)", persona_text, re.I)
                
                # Create the persona dictionary
                persona_dict = {
                    "name": name_match.group(1).strip() if name_match else f"Buyer {random.randint(1000, 9999)}",
                    "role": role_match.group(1).strip() if role_match else "Decision Maker",
                    "company": company_match.group(1).strip() if company_match else "Acme Corporation",
                    "description": persona_text,
                    "personality_traits": {
                        "analytical": random.randint(3, 9),
                        "professional": random.randint(5, 9),
                        "direct": random.randint(3, 8),
                        "skeptical": random.randint(3, 8)
                    },
                    "emotional_state": random.choice(["neutral", "curious", "cautious", "interested"]),
                    "business_context": sales_info["target_market"].split()[0],  # B2B or B2C
                    "decision_authority": random.choice(["Decision Maker", "Influencer", "Recommender"]),
                    "buyer_type": random.choice(["economic", "technical", "user", "coach", "champion"]),
                    "behavior_instructions": """
IMPORTANT BEHAVIOR GUIDELINES:
1. START in pure rapport phase - focus ONLY on small talk, never mention business first
2. NEVER ask about products/services unless the salesperson mentions them first
3. Respond briefly and naturally like a real person in a casual conversation
4. Be mildly distracted at first - people are busy and not fully engaged initially
5. Only gradually become interested as rapport builds
6. Ask about the salesperson's day/week before business topics
7. Maintain human-like conversation patterns with occasional hesitations
8. Never drive the sales process - let the salesperson lead the way
9. Use varied, natural language - avoid robotic or overly eager responses
10. Be realistic about your time and attention - don't seem too available
"""
                }
                logger.info(f"Generated persona: {persona_dict['name']}, {persona_dict['role']} at {persona_dict['company']}")
                
                # Store the persona for future messages in this conversation
                voice_conversations[user_conv_key][persona_dict_key] = persona_dict
            except Exception as e:
                logger.error(f"Error generating persona: {str(e)}")
                # Fallback to default persona if generation fails
                voice_conversations[user_conv_key][persona_dict_key] = {
                    "name": "Sarah Johnson",
                    "role": "Marketing Director",
                    "company": "TechSolutions Inc.",
                    "description": "Experienced marketing professional looking for sales training software to upskill her team.",
                    "personality_traits": {"analytical": 7, "professional": 7, "direct": 6, "skeptical": 5},
                    "emotional_state": "neutral",
                    "business_context": "B2B",
                    "decision_authority": "Decision Maker",
                    "buyer_type": "economic",
                    "behavior_instructions": """
IMPORTANT BEHAVIOR GUIDELINES:
1. START in pure rapport phase - focus ONLY on small talk, never mention business first
2. NEVER ask about products/services unless the salesperson mentions them first
3. Respond briefly and naturally like a real person in a casual conversation
4. Be mildly distracted at first - people are busy and not fully engaged initially
5. Only gradually become interested as rapport builds
6. Ask about the salesperson's day/week before business topics
7. Maintain human-like conversation patterns with occasional hesitations
8. Never drive the sales process - let the salesperson lead the way
9. Use varied, natural language - avoid robotic or overly eager responses
10. Be realistic about your time and attention - don't seem too available
"""
                }
        
        # Get the stored persona for this conversation
        persona_dict = voice_conversations[user_conv_key][persona_dict_key]
        
        # Check if we need to initialize a new conversation
        if conversation_id not in voice_conversations[user_conv_key]:
            # Initialize new conversation
            conv_history = []
            voice_conversations[user_conv_key][conversation_id] = conv_history
            
            # Generate initial greeting if this is the first message
            try:
                # Enhanced initial greeting instructions
                initial_greeting_instructions = """
Generate a brief, natural initial greeting as if you're just meeting someone new in a business context. 
CRITICAL RULES:
1. NEVER mention business, products, or sales in your first message
2. Keep it very brief - just 4-8 words
3. Stick to simple greetings like "Hello" or "Hi there"
4. NEVER ask probing questions or inquire about products
5. Don't use the other person's name unless they've introduced themselves
6. Be slightly reserved, not overly enthusiastic
7. DON'T express specific interest in anything yet
8. Respond as if you're busy and just being polite initially

Examples of good first messages:
"Hello there."
"Hi, nice to meet you."
"Good morning."
"Hello, how are you?"
"""
                
                sales_info = {
                    "product_service": "sales training software", 
                    "sales_experience": "experienced",
                    "initial_greeting_instructions": initial_greeting_instructions
                }
                
                initial_greeting = gpt4o_service.generate_initial_greeting(
                    persona=persona_dict,
                    sales_info=sales_info,
                    conversation_id=conversation_id
                )
                
                # Add greeting to conversation history
                if initial_greeting:
                    conv_history.append({"role": "assistant", "content": initial_greeting})
                    logger.info(f"Generated initial greeting: {initial_greeting}")
            except Exception as e:
                logger.error(f"Error generating initial greeting: {str(e)}")
                # Continue without initial greeting if error occurs
        else:
            # Get existing conversation history
            conv_history = voice_conversations[user_conv_key][conversation_id]
        
        # Add the user's new message to history
        conv_history.append({"role": "user", "content": message})
        
        # Update the conversation state
        try:
            phase_manager.update_state(conv_history)
            conversation_state = phase_manager.get_conversation_state()
            logger.info(f"Updated conversation state: {conversation_state}")
        except Exception as e:
            logger.error(f"Error updating conversation state: {str(e)}")
            conversation_state = None
        
        # Limit context window to last 10 messages
        if len(conv_history) > 10:
            conv_history = conv_history[-10:]
            
        # Get user info
        user_name = current_user.username if hasattr(current_user, 'username') else "Salesperson"
        user_info = {"name": user_name, "experience_level": "experienced"}
        
        # Generate response using GPT4o service with enhanced instructions
        try:
            # Add the roleplay instructions to the persona
            enhanced_persona = persona_dict.copy()
            
            # Add message count to help the AI understand conversation progress
            message_count = len(conv_history)
            
            # DIRECT APPROACH: Handle early conversation with fixed responses
            if message_count <= 4:
                # Use predefined responses for the first few exchanges
                # This approach is much faster and eliminates product questions
                
                # Get the user's last message
                user_message = conv_history[-1]["content"].lower() if len(conv_history) > 0 else ""
                
                # Simple pattern matching for appropriate early response selection
                if any(greeting in user_message for greeting in ["hi", "hello", "hey", "greetings"]):
                    response = random.choice([
                        "Hi there! How are you today?",
                        "Hello! How's it going?",
                        "Hey! How are you doing?",
                        "Hi! Nice to meet you."
                    ])
                elif any(phrase in user_message for phrase in ["how are you", "how's it going", "how you doing", "what's up"]):
                    response = random.choice([
                        "I'm doing well, thanks. How about you?",
                        "Not too bad. Been a busy week so far. You?",
                        "Pretty good, thanks for asking. How's your day going?",
                        "Doing alright. You know how it is - busy as usual."
                    ])
                elif any(word in user_message for word in ["product", "pitch", "software", "service", "offer", "sell"]):
                    # If they mention their product, acknowledge but redirect to small talk
                    response = random.choice([
                        "That sounds interesting. How's your week been so far?",
                        "Ah, got it. Been busy on your end lately?",
                        "I see. How long have you been working on that?",
                        "Interesting. Have you been with your company long?"
                    ])
                elif "?" in user_message:
                    # For questions that aren't about how they are
                    response = random.choice([
                        "It's been pretty standard. You know, the usual meetings and emails. How about you?",
                        "Oh, just the normal day-to-day stuff. Been keeping busy with work. You?",
                        "Nothing too exciting. Just trying to stay on top of everything. What about yourself?",
                        "Just trying to get through my to-do list, you know how it is. How about on your end?"
                    ])
                else:
                    # Default small talk responses for anything else
                    response = random.choice([
                        "Yeah, I know exactly what you mean. How's the rest of your week looking?",
                        "That makes sense. Been pretty busy on my end too. How's work been for you lately?",
                        "Right, I hear you. Work's been keeping me busy too. Anything interesting happening with you?",
                        "I get that. It's been one of those weeks for me too. How are things on your end?"
                    ])
                
                logger.info(f"Used fixed early conversation response: {response}")
            else:
                # For later conversation, use the normal roleplay response method
                # Add appropriate guidance for current phase
                current_phase = phase_manager.current_phase.value if hasattr(phase_manager.current_phase, 'value') else "unknown"
                
                roleplay_instructions = """
CONVERSATION GUIDANCE:
1. Keep responses natural and appropriate to the current sales phase
2. Let the salesperson lead the conversation and sales process
3. Show appropriate interest based on how well they've built rapport
4. Use casual, realistic language with occasional filler words
5. Respond directly to questions but don't introduce new product topics
"""
                
                # Prepare message content for generation
                phase_info = {
                    "message_count": message_count,
                    "current_phase": current_phase,
                    "roleplay_instructions": roleplay_instructions
                }
                
                # Merge phase info into the conversation state if it exists
                if conversation_state:
                    conversation_state.update(phase_info)
                else:
                    conversation_state = phase_info
                
                # Generate response using standard approach for later conversation stages
                response = gpt4o_service.generate_roleplay_response(
                    persona=enhanced_persona,
                    messages=conv_history,
                    conversation_state=conversation_state,
                    user_info=user_info,
                    conversation_id=conversation_id
                )
                
                logger.info(f"Generated response for later conversation stage: {response[:50]}...")
                
        except Exception as e:
            logger.error(f"Error in two-model chain response generation: {str(e)}")
            logger.exception("Full exception details:")
            response = "I'm sorry, I'm having trouble responding right now. Could you repeat your question?"
        
        # Add the AI's response to the conversation history
        conv_history.append({"role": "assistant", "content": response})
        
        # Update conversation in our storage
        voice_conversations[user_conv_key][conversation_id] = conv_history
        
        # Generate simulated metrics data or real metrics if available
        metrics = {
            "clarity": round(0.70 + 0.20 * (hash(message) % 100) / 100, 2),
            "confidence": round(0.65 + 0.25 * (hash(message[::-1]) % 100) / 100, 2),
            "engagement": round(0.75 + 0.20 * (hash(message + "salt") % 100) / 100, 2),
            "keyPointsHit": max(1, hash(message) % 5)
        }
        
        # Build and return response
        current_phase = phase_manager.current_phase.value if hasattr(phase_manager.current_phase, 'value') else "unknown"
        return jsonify({
            'response': response,
            'metrics': metrics,
            'conversation_id': conversation_id,
            'mode': 'roleplay',
            'phase': current_phase
        })
        
    except Exception as e:
        logger.error(f"Error in voice roleplay API: {str(e)}")
        logger.exception("Full exception details:")
        return jsonify({'error': 'An error occurred processing your request'}), 500

@voice.route('/api/coach', methods=['POST'])
@login_required
def voice_coach_api():
    """Process voice chat messages in coaching mode.
    
    This endpoint:
    1. Receives a text transcript from the frontend
    2. Passes it to the GPT-4.1-mini model with a coaching prompt
    3. Returns the AI response as a sales coach
    
    The frontend will separately call the TTS endpoint with the response.
    """
    try:
        # Get request data
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
            
        message = data.get('message')
        conversation_id = data.get('conversation_id')
        
        # Log the request (without the full message for brevity)
        message_preview = message[:50] + '...' if len(message) > 50 else message
        logger.info(f"Voice coach API request from user {current_user.id}: {message_preview}")
        
        # Get or create a conversation ID
        if not conversation_id:
            conversation_id = f"coach-{current_user.id}-{int(time.time())}"
        
        # Get or initialize conversation history
        user_conv_key = f"user_{current_user.id}"
        
        # Initialize conversations dictionary for this user if it doesn't exist
        if user_conv_key not in voice_conversations:
            voice_conversations[user_conv_key] = {}
            
        # Get the GPT-4.1-mini service for better responses
        gpt4o_service = get_gpt4o_service()
        if not gpt4o_service:
            logger.error("Could not initialize GPT4o service")
            return jsonify({'error': 'AI service unavailable'}), 500
            
        # Coaching system prompt
        coaching_system_prompt = """You are PitchIQ, an expert AI sales coach helping salespeople improve their skills.

Your goal is to provide:
1. Insightful analysis of sales techniques
2. Actionable advice on handling objections
3. Guidance on building value propositions
4. Tips on establishing customer relationships
5. Strategic approaches to closing deals

COACHING APPROACH:
- Be supportive but direct - acknowledge good techniques while addressing areas for improvement
- Use the Socratic method - ask thoughtful questions that lead to insights
- Provide concrete examples relevant to the salesperson's situation
- Recommend specific phrases and language they can use
- Keep advice actionable and immediately applicable
- Balance positive reinforcement with constructive criticism

FOCUS ON:
- Helping them develop a structured sales methodology
- Improving discovery and questioning techniques
- Enhancing objection handling with proven frameworks
- Building more compelling value propositions
- Developing stronger closing techniques

PERSONALITY:
- Conversational but focused
- Encouraging yet honest
- Empathetic to sales challenges
- Analytical about performance
- Enthusiastic about improvement

Avoid generic platitudes or overly theoretical advice - focus on practical, proven techniques that work in real sales situations."""
        
        # Check if we need to initialize a new conversation
        if conversation_id not in voice_conversations[user_conv_key]:
            # Initialize new conversation with the system prompt
            conv_history = [{"role": "system", "content": coaching_system_prompt}]
            voice_conversations[user_conv_key][conversation_id] = conv_history
        else:
            # Get existing conversation history
            conv_history = voice_conversations[user_conv_key][conversation_id]
            
            # Ensure system prompt is at the beginning
            if not conv_history or conv_history[0]['role'] != 'system':
                conv_history.insert(0, {"role": "system", "content": coaching_system_prompt})
        
        # Add the user's new message to history
        conv_history.append({"role": "user", "content": message})
        
        # Limit context window to last 10 messages (excluding system prompt)
        if len(conv_history) > 11:  # 1 system prompt + 10 messages
            # Keep system prompt and last 10 messages
            conv_history = [conv_history[0]] + conv_history[-10:]
        
        # Generate response using GPT-4.1-mini service for better quality
        try:
            response = gpt4o_service.generate_response(
                messages=conv_history,
                system_prompt=None,  # System prompt already included in conversation history
                temperature=0.6,
                max_tokens=800
            )
        except Exception as e:
            logger.error(f"Error generating coach response: {str(e)}")
            response = "I'm sorry, I'm having trouble responding right now. Could you repeat your question?"
        
        # Add the AI's response to the conversation history
        conv_history.append({"role": "assistant", "content": response})
        
        # Update conversation in our storage
        voice_conversations[user_conv_key][conversation_id] = conv_history
        
        # Generate coaching metrics based on the conversation
        metrics = {
            "clarity": round(0.80 + 0.15 * (hash(message) % 100) / 100, 2),
            "confidence": round(0.75 + 0.20 * (hash(message[::-1]) % 100) / 100, 2),
            "engagement": round(0.85 + 0.10 * (hash(message + "salt") % 100) / 100, 2),
            "keyPointsHit": max(2, hash(message) % 5)
        }
        
        # Build and return response
        return jsonify({
            'response': response,
            'metrics': metrics,
            'conversation_id': conversation_id,
            'mode': 'coach'
        })
        
    except Exception as e:
        logger.error(f"Error in voice coach API: {str(e)}")
        logger.exception("Full exception details:")
        return jsonify({'error': 'An error occurred processing your request'}), 500

# Legacy route that forwards to the appropriate new endpoint
@voice.route('/api/chat', methods=['POST'])
@login_required
def voice_chat_api():
    """Legacy route that redirects to the appropriate mode endpoint.
    
    By default, forwards to the coaching mode unless explicitly specified.
    """
    try:
        # Get request data
        data = request.json
        mode = data.get('mode', 'coach')  # Default to coach mode
        
        # Forward to the appropriate endpoint
        if mode == 'roleplay':
            return voice_roleplay_api()
        else:
            return voice_coach_api()
            
    except Exception as e:
        logger.error(f"Error in voice chat API: {str(e)}")
        logger.exception("Full exception details:")
        return jsonify({'error': 'An error occurred processing your request'}), 500

@voice.route('/api/speech-to-text', methods=['POST'])
@login_required
def speech_to_text():
    """Process audio data and return text."""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
            
        audio_file = request.files['audio']
        
        # This is a simplified placeholder - you would use Deepgram here
        # For now we'll just return success to simulate the API working
        return jsonify({
            'success': True,
            'text': "This is a simulated transcription response.",
            'confidence': 0.95
        })
    except Exception as e:
        logger.error(f"Error in speech-to-text API: {str(e)}")
        return jsonify({'error': str(e)}), 500

@voice.route('/api/text-to-speech', methods=['POST'])
@login_required
def voice_text_to_speech():
    """Convert text to speech audio and return audio URL or data."""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # This is a simplified placeholder - you would use ElevenLabs here
        # For now we'll just return success to simulate the API working
        return jsonify({
            'success': True,
            'message': 'Text-to-speech processed successfully',
            # In a real implementation, this would be an audio URL or base64 data
            'audio_placeholder': 'Simulated audio data would be here'
        })
    except Exception as e:
        logger.error(f"Error in text-to-speech API: {str(e)}")
        return jsonify({'error': str(e)}), 500 