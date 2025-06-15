"""
Roleplay API routes

API endpoints for handling sales roleplay conversations with phase management.
"""

import json
import logging
import uuid
from flask import Blueprint, request, jsonify, current_app, session
from app.services.gpt4o_service import GPT4oService
from flask_login import login_required

roleplay_bp = Blueprint('roleplay', __name__)

# Configure logging
logger = logging.getLogger(__name__)

@roleplay_bp.route('/start', methods=['POST'])
@login_required
def start_roleplay_route():
    """Start a new roleplay session with a customer persona."""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract persona information
        persona = data.get('persona')
        if not persona:
            return jsonify({"error": "No persona provided"}), 400
            
        # Create a conversation ID
        conversation_id = str(uuid.uuid4())
        
        # Store the conversation in the session
        if 'conversations' not in session:
            session['conversations'] = {}
        
        # Initialize the conversation
        session['conversations'][conversation_id] = {
            'persona': persona,
            'messages': [],
            'active': True
        }
        session.modified = True
        
        # Generate initial greeting from the customer
        gpt4o_service = GPT4oService.get_instance()
        initial_greeting = gpt4o_service.generate_initial_greeting(
            persona=persona,
            conversation_id=conversation_id
        )
        
        # Add the greeting to the conversation history
        session['conversations'][conversation_id]['messages'].append({
            'role': 'assistant',
            'content': initial_greeting
        })
        session.modified = True
        
        # Return the conversation info
        return jsonify({
            'conversation_id': conversation_id,
            'initial_greeting': initial_greeting
        }), 200
        
    except Exception as e:
        logger.error(f"Error starting roleplay: {str(e)}")
        return jsonify({"error": f"Failed to start roleplay: {str(e)}"}), 500

@roleplay_bp.route('/message', methods=['POST'])
@login_required
def send_message():
    """Send a message in an active roleplay conversation."""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract required data
        conversation_id = data.get('conversation_id')
        message = data.get('message')
        
        if not conversation_id or not message:
            return jsonify({"error": "Missing conversation_id or message"}), 400
            
        # Check if the conversation exists
        if 'conversations' not in session or conversation_id not in session['conversations']:
            return jsonify({"error": "Conversation not found"}), 404
            
        # Get the conversation
        conversation = session['conversations'][conversation_id]
        
        # Check if the conversation is active
        if not conversation.get('active', False):
            return jsonify({"error": "Conversation is not active"}), 400
            
        # Add the user message to the conversation
        conversation['messages'].append({
            'role': 'user',
            'content': message
        })
        session.modified = True
        
        # Get user info for personalization
        user_info = {
            'name': session.get('user', {}).get('first_name', 'User'),
            'experience_level': session.get('user', {}).get('sales_experience', 'intermediate')
        }
        
        # Extract conversation metadata if available
        conversation_metadata = data.get('conversation_metadata')
        
        # Generate a response
        gpt4o_service = GPT4oService.get_instance()
        response = gpt4o_service.generate_roleplay_response(
            persona=conversation['persona'],
            messages=conversation['messages'],
            user_info=user_info,
            conversation_id=conversation_id,
            conversation_metadata=conversation_metadata
        )
        
        # Add the response to the conversation
        conversation['messages'].append({
            'role': 'assistant',
            'content': response
        })
        session.modified = True
        
        # Get the current phase for the UI
        phase_manager = gpt4o_service.phase_managers.get(conversation_id)
        current_phase = phase_manager.current_phase.value if phase_manager else "unknown"
        
        # Return the response
        return jsonify({
            'response': response,
            'current_phase': current_phase
        }), 200
        
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return jsonify({"error": f"Failed to send message: {str(e)}"}), 500

@roleplay_bp.route('/end', methods=['POST'])
@login_required
def end_roleplay():
    """End an active roleplay conversation."""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract conversation ID
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return jsonify({"error": "Missing conversation_id"}), 400
            
        # Check if the conversation exists
        if 'conversations' not in session or conversation_id not in session['conversations']:
            return jsonify({"error": "Conversation not found"}), 404
            
        # Mark the conversation as inactive
        session['conversations'][conversation_id]['active'] = False
        session.modified = True
        
        # Return success
        return jsonify({
            'status': 'success',
            'message': 'Conversation ended successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error ending roleplay: {str(e)}")
        return jsonify({"error": f"Failed to end roleplay: {str(e)}"}), 500

@roleplay_bp.route('/status', methods=['GET'])
@login_required
def get_phase_status():
    """Get the current phase status of a roleplay conversation."""
    try:
        conversation_id = request.args.get('conversation_id')
        if not conversation_id:
            return jsonify({"error": "Missing conversation_id"}), 400
            
        # Get the phase manager
        gpt4o_service = GPT4oService.get_instance()
        phase_manager = gpt4o_service.phase_managers.get(conversation_id)
        
        if not phase_manager:
            return jsonify({"error": "Phase manager not found for this conversation"}), 404
            
        # Get phase information
        phase_info = {
            'current_phase': phase_manager.current_phase.value,
            'message_counts': {phase.value: count for phase, count in phase_manager.phase_message_counts.items()}
        }
        
        return jsonify(phase_info), 200
        
    except Exception as e:
        logger.error(f"Error getting phase status: {str(e)}")
        return jsonify({"error": f"Failed to get phase status: {str(e)}"}), 500 