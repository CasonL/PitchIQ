"""
Routes for the AI Sales Training system.
"""

from flask import Blueprint, request, jsonify, current_app, render_template, flash, redirect, url_for, g, make_response, session
from flask_login import login_required, current_user
from app import db
from app.models import TrainingSession, FeedbackAnalysis, BuyerPersona, PerformanceMetrics, UserProfile
from app.training.services import (
    generate_buyer_persona, 
    generate_ai_response,
    generate_feedback_analysis,
    parse_feedback_text,
    create_fallback_feedback,
    get_training_session, 
    create_training_session,
    calculate_and_store_metrics,
)
from datetime import datetime, timedelta
import json
import random
import logging
import traceback
from app.training import services as training_services
from sqlalchemy.orm import joinedload
from app.auth.security import generate_csrf_token
from app.services.gpt4o_service import get_gpt4o_service
from app.extensions import csrf

# Initialize logger
logger = logging.getLogger(__name__)

training_bp = Blueprint('training', __name__)

# Inside app/training/routes.py

# KEEP THIS IMPORT:

@training_bp.route('/hello_training_test', methods=['GET'])
def hello_training_test():
    return "Hello from training blueprint!", 200

@training_bp.route('/dashboard')
@login_required
def show_dashboard():
    """Show the training dashboard with accumulated metrics and growth path."""
    try:
        current_app.logger.info(f"User {current_user.id} accessing dashboard")

        # 1. Initial checks (Profile, Session Query)
        if not hasattr(current_user, 'profile') or not current_user.profile:
            flash("Please complete your profile to access the dashboard.", "info")
            return redirect(url_for('training.onboarding'))
        try:
            sessions_list = TrainingSession.query.filter_by(user_profile_id=current_user.profile.id).order_by(TrainingSession.start_time.desc()).all()
        except Exception as e:
            current_app.logger.error(f"Error querying sessions for dashboard: {str(e)}")
            sessions_list = []

        # 2. Calculate the *count* of completed sessions
        completed_sessions_list = [s for s in sessions_list if s.status == 'completed']
        session_count = len(completed_sessions_list)

        # 3. Initialize the *entire* context dictionary with SAFE defaults
        template_context = {
            'user': current_user,
            'sessions': completed_sessions_list, # Pass ONLY completed sessions maybe?
            'completed_sessions': session_count,
            'current_score': 0,
            'current_level': 1, # Default level
            'current_title': "Rookie", # Default title
            'progress_to_next': 0, # Default progress
            'next_level_score': 60, # Default score for next level (L2 threshold)
            'growth_percentage': 0,
            'skill_progression': {},
            'session_streak': 0, # Needs calculation
            'most_improved_skill': {'name': None, 'change': 0}, # Needs calculation
            'advanced_metrics': {}, # Needs calculation/retrieval
            'journey_metrics': {}, # Needs calculation/retrieval
            'trophy_data': {'count': 0, 'max_count': 8}, # Needs calculation
            'chronological_scores': [], # Needs calculation
            'show_growth_path': False,
            'avg_trust_score': 0,
            'avg_persuasion_rating': 0,
            'avg_confidence_score': 0,
            'total_sessions': len(sessions_list), # Total includes non-completed
            'total_training_time': 0 # Needs calculation
            # Add any other keys the template requires with safe defaults
        }

        # 4. If there *are* completed sessions, attempt calculations SAFELY
        if session_count > 0:
            try:
                # --- Start of SAFE calculation block ---
                latest_session = completed_sessions_list[0] # Most recent completed session

                # Safely get overall score from the latest session
                # Assume overall_score is a direct attribute, fallback to 0
                current_score = getattr(latest_session, 'overall_score', 0) or 0

                # --- ADD Level Calculation Logic Here --- 
                level_thresholds = [0, 60, 75, 85, 95] # Level 1 starts at 0, L2 at 60, etc.
                user_titles = ["Rookie", "Apprentice", "Practitioner", "Expert", "Master"]
                current_level = 1
                current_title = user_titles[0]
                progress_to_next = 0
                next_level_score = level_thresholds[1] if len(level_thresholds) > 1 else 100 # Default next threshold

                for i in range(len(level_thresholds)):
                    if current_score >= level_thresholds[i]:
                        current_level = i + 1
                        current_title = user_titles[i]
                        if i + 1 < len(level_thresholds):
                            lower_bound = level_thresholds[i]
                            upper_bound = level_thresholds[i+1]
                            next_level_score = upper_bound
                            if upper_bound > lower_bound:
                                progress_to_next = ((current_score - lower_bound) / (upper_bound - lower_bound)) * 100
                            else:
                                progress_to_next = 0 # Avoid division by zero if thresholds are same
                        else:
                            # Max level reached
                            progress_to_next = 100
                            next_level_score = current_score # Or set to 100, depending on desired display
                    else:
                        # Found the level, stop checking higher thresholds
                        break 
                # --- END Level Calculation --- 

                # Example: Safely calculate average trust score
                trust_scores = [s.trust_score for s in completed_sessions_list if hasattr(s, 'trust_score') and s.trust_score is not None]
                avg_trust = sum(trust_scores) / len(trust_scores) if trust_scores else 0

                # Example: Safely get skill progression from the latest session
                # Assume skill_progression is stored in feedback_analysis relationship
                latest_feedback = FeedbackAnalysis.query.filter_by(session_id=latest_session.id).first()
                skill_progression = {} # Default empty dict
                if latest_feedback:
                    # Example structure: feedback.skill_scores might be JSON text
                    try:
                        skill_data_text = getattr(latest_feedback, 'skill_scores', '{}')
                        skill_progression = json.loads(skill_data_text or '{}')
                        if not isinstance(skill_progression, dict):
                             skill_progression = {} # Fallback if not a dict
                        # You might need to transform this structure further for the template
                        # E.g., adding 'name' and 'icon' if not present
                    except (json.JSONDecodeError, AttributeError, TypeError) as skill_err:
                        current_app.logger.warning(f"Could not load/parse skill_progression for session {latest_session.id}: {skill_err}")
                        skill_progression = {}

                # --- Placeholder for other complex calculations (streak, growth, etc.) ---
                # These need to be implemented carefully, checking for None values and handling potential errors.
                # For now, we'll use the defaults.
                chronological_scores = [getattr(s, 'overall_score', 0) or 0 for s in reversed(completed_sessions_list)] # Example
                # Calculate growth_percentage safely
                growth_percentage = 0
                if len(chronological_scores) > 1:
                    first_score = chronological_scores[0]
                    last_score = chronological_scores[-1]
                    if first_score and first_score != 0: # Avoid division by zero
                        growth_percentage = ((last_score - first_score) / first_score) * 100

                # --- Update the context dictionary with calculated values ---
                template_context.update({
                    'current_score': current_score,
                    'current_level': current_level,
                    'current_title': current_title,
                    'progress_to_next': progress_to_next,
                    'next_level_score': next_level_score,
                    'avg_trust_score': avg_trust,
                    'skill_progression': skill_progression,
                    'chronological_scores': chronological_scores,
                    'growth_percentage': growth_percentage,
                    # Safely get avg confidence from latest session metrics if they exist
                    'avg_confidence_score': getattr(latest_session, 'confidence_score', 0) or 0,
                    # Update ALL other relevant keys based on your safe calculations
                    # 'session_streak': calculated_streak,
                    # 'most_improved_skill': calculated_most_improved,
                    # ... etc.
                })
                # --- End of SAFE calculation block ---

            except Exception as calc_err:
                # Log the specific error during calculations but still try to render dashboard
                current_app.logger.error(f"Error during dashboard calculations: {str(calc_err)}\n{traceback.format_exc()}")
                flash("Could not calculate all dashboard metrics due to an error.", "warning")
                # The template_context will retain its default values for failed calculations

        # 5. ALWAYS render the template at the end of the main 'try' block
        current_app.logger.info(f"Rendering dashboard with context keys: {list(template_context.keys())}")
        return render_template(
            'training/dashboard_super_minimal.html',
            **template_context # Unpack the dictionary
        )

    except Exception as e:
        # This outer exception handles errors like template rendering errors
        current_app.logger.error(f"Dashboard rendering error: {str(e)}", exc_info=True)
        flash("Something went wrong loading your dashboard. Please try again later.", "error")
        # Still redirect to index, which leads back to chat page
        return redirect(url_for('index'))

@training_bp.route('/roleplay', endpoint='display_roleplay_interface')
@login_required
def display_roleplay_interface():
    """Render the voice chat interface."""
    try:
        # Get default values for the persona
        persona_name = "Sarah Johnson"
        persona_title = "Marketing Director at NexTech Solutions"
        conversation_id = None
        
        # Logic to get an active session if one exists
        active_session = TrainingSession.query.filter_by(
            user_profile_id=current_user.profile.id, 
            status='active'
        ).order_by(TrainingSession.start_time.desc()).first()
        
        if active_session and active_session.buyer_persona:
            persona = active_session.buyer_persona
            persona_name = persona.name
            persona_title = f"{persona.title} at {persona.company}" if persona.title and persona.company else persona_title
            conversation_id = active_session.id
        
        # Render our new simple voice template
        return render_template(
            'simple_voice.html',
            persona_name=persona_name,
            persona_title=persona_title,
            conversation_id=conversation_id
        )
    except Exception as e:
        current_app.logger.error(f"Error displaying roleplay interface: {str(e)}")
        flash("An error occurred while loading the roleplay interface. Please try again.", "error")
        return redirect(url_for('training.show_dashboard'))

@training_bp.route('/api/training/roleplay/start', methods=['POST'])
@login_required
def start_roleplay():
    """Start a new roleplay training session."""
    try:
        if not hasattr(current_user, 'profile'):
            return jsonify({
                'status': 'error',
                'message': 'User profile not found'
            }), 404
            
        # Check if there's an active session ID in the session storage
        session_id = request.cookies.get('active_roleplay_session')
        if session_id:
            try:
                # Try to find the existing session
                existing_session = TrainingSession.query.get(session_id)
                if existing_session and existing_session.status != 'completed':
                    # Session exists and is not completed, return it
                    logger.info(f"Retrieved existing roleplay session {session_id}")
                    buyer_persona = existing_session.buyer_persona
                    
                    return jsonify({
                        'status': 'success',
                        'message': 'Using existing roleplay session',
                        'session_id': existing_session.id,
                        'buyer_persona': {
                            'name': buyer_persona.name,
                            'description': buyer_persona.description,
                            'personality_traits': buyer_persona.personality_traits_dict,
                            'emotional_state': buyer_persona.emotional_state,
                            'buyer_type': buyer_persona.buyer_type,
                            'decision_authority': buyer_persona.decision_authority
                        }
                    })
            except Exception as e:
                # If there's an error retrieving the session, log it and continue with creating a new one
                logger.error(f"Error retrieving existing session {session_id}: {str(e)}")
        
        # Session data model
        session = TrainingSession()
        session.user_profile_id = current_user.profile.id
        session.start_time = datetime.utcnow()
        session.status = 'active'
        session.current_stage = 'rapport'
        session.reached_stages = json.dumps(['rapport'])
        
        # Save session to get an ID first
        db.session.add(session)
        db.session.commit()
        
        # After creating session, generate a unique persona using the session ID
        buyer_persona = generate_buyer_persona(current_user.profile, session_id=session.id)
        session.buyer_persona_id = buyer_persona.id
        
        # Create response with cookie directive to persist the session ID
        response = jsonify({
            'status': 'success',
            'message': 'Roleplay session started',
            'session_id': session.id,
            'buyer_persona': {
                'name': buyer_persona.name,
                'description': buyer_persona.description,
                'personality_traits': buyer_persona.personality_traits_dict,
                'emotional_state': buyer_persona.emotional_state,
                'buyer_type': buyer_persona.buyer_type,
                'decision_authority': buyer_persona.decision_authority
            }
        })
        
        # Set a cookie with the session ID that expires in 24 hours
        response.set_cookie('active_roleplay_session', str(session.id), max_age=86400)
        
        return response
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error starting roleplay session: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'message': f'Failed to start roleplay session: {str(e)}'
        }), 500

@training_bp.route('/api/training/roleplay/<int:session_id>/message', methods=['POST'])
@login_required
# @csrf_required # Consider re-enabling after testing
def send_roleplay_message(session_id):
    """Handle messages sent during a roleplay session."""
    logger.info(f"--- ENTERING send_roleplay_message ROUTE for session {session_id} ---") # DEBUG
    response_data = {}
    try:
        # Validate request
        if not request.is_json:
            logger.warning("Request is not JSON") # DEBUG
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.get_json()
        user_message = data.get('message')
        if not user_message:
            logger.warning("Missing 'message' in JSON payload") # DEBUG
            return jsonify({"error": "Missing 'message' field"}), 400
            
        # Get training session and verify ownership
        session = training_services.get_training_session(session_id, current_user.profile.id)
        if not session:
            logger.warning(f"Session {session_id} not found or user {current_user.profile.id} denied access.") # DEBUG
            return jsonify({"error": "Training session not found or access denied"}), 404
            
        # Check if session is already completed
        if session.status == 'completed':
            logger.warning(f"Attempted to send message to completed session {session_id}") # DEBUG
            return jsonify({"error": "This session has ended."}), 400
            
        logger.info(f"Loaded session {session.id}, status: {session.status}") # DEBUG
        if session.buyer_persona:
            logger.info(f"Session has buyer persona ID: {session.buyer_persona.id}, Name: {session.buyer_persona.name}") # DEBUG
        else:
            logger.warning(f"Session {session.id} is missing buyer persona!") # DEBUG
            
        # Add user message to history (handle potential JSON errors)
        try:
            history = session.conversation_history_dict
            if history is None:
                history = []
            
            logger.info(f"Current conversation history has {len(history)} messages")
            history.append({"role": "user", "content": user_message, "timestamp": datetime.utcnow().isoformat()})
            session.conversation_history_dict = history  # Use property setter
            
            db.session.commit()
            logger.info(f"Added user message to history for session {session.id}") # DEBUG
        except Exception as e_hist_user:
            db.session.rollback()
            logger.error(f"Error updating history with user message for session {session_id}: {e_hist_user}", exc_info=True) # DEBUG
            return jsonify({"error": "Failed to record user message"}), 500

        # Generate AI response
        ai_response_text, updated_session = training_services.generate_ai_response(user_message, session) # Pass session object
        
        if not ai_response_text:
            logger.error(f"AI response generation failed for session {session_id}") # DEBUG
            return jsonify({"error": "AI failed to generate a response"}), 500
        
        # Handle different response types (dict or string)
        ai_response_for_history = ai_response_text
        if isinstance(ai_response_text, dict):
            if 'response' in ai_response_text:
                ai_response_for_client = ai_response_text['response']
            else:
                logger.warning(f"AI response dictionary missing 'response' field: {ai_response_text}")
                ai_response_for_client = str(ai_response_text)
        else:
            ai_response_for_client = ai_response_text
        
        # Add AI response to history
        try:
            history = updated_session.conversation_history_dict
            if history is None:
                history = [{"role": "user", "content": user_message, "timestamp": datetime.utcnow().isoformat()}]
            
            history.append({"role": "assistant", "content": ai_response_for_history, "timestamp": datetime.utcnow().isoformat()})
            updated_session.conversation_history_dict = history
            
            db.session.commit()
            logger.info(f"Added AI response to history. History now has {len(history)} messages") # DEBUG
            
            # Attempt to synchronize persona name (no longer calling non-existent function)
            # try:
            #     sync_result = training_services.sync_persona_name_from_conversation(session_id)
            #     if sync_result:
            #         logger.info(f"Successfully synchronized persona name from conversation for session {session_id}")
            #         response_data["persona_name_updated"] = True
            #         response_data["persona_name"] = updated_session.buyer_persona.name
            # except Exception as e_sync:
            #     logger.warning(f"Non-critical error syncing persona name: {str(e_sync)}")
                
        except Exception as e_hist_ai:
            db.session.rollback()
            logger.error(f"Error updating history with AI message for session {session_id}: {e_hist_ai}", exc_info=True) # DEBUG
            ai_response_for_client = "[System Error: Could not save conversation history]"
            
        # Prepare response data
        response_data.update({
            "status": "success",
            "response": ai_response_for_client,
            "session_id": updated_session.id,
            "current_stage": updated_session.current_stage, 
            "reached_stages": json.loads(updated_session.reached_stages or '[]')
        })
        
        logger.info(f"Returning AI response for session {session_id}") # DEBUG
        return jsonify(response_data), 200

    except Exception as e:
        db.session.rollback() # Rollback any potential partial changes
        logger.error(f"Error handling message for session {session_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "An internal server error occurred"}), 500

@training_bp.route('/session_summary/<int:session_id>')
@login_required
def show_session_summary(session_id):
    """Show the summary page for a completed training session."""
    try:
        # Get the training session
        session = TrainingSession.query.get_or_404(session_id)
        
        # Check if the user is authorized to view this session
        if session.user_profile_id != current_user.profile.id:
            flash('You are not authorized to view this session.', 'danger')
            return redirect(url_for('training.show_dashboard'))
        
        # Get data needed for the template
        conversation_history = session.conversation_history_dict or []
        metrics = PerformanceMetrics.query.filter_by(training_session_id=session_id).first()
        feedback = FeedbackAnalysis.query.filter_by(session_id=session_id).first()
        buyer_persona = session.buyer_persona
        
        # Debug log for conversation history
        current_app.logger.info(f"Session {session_id} has conversation history: {len(conversation_history)} messages")
        if len(conversation_history) > 0:
            current_app.logger.info(f"First message sample: {conversation_history[0]}")
        else:
            current_app.logger.warning(f"Empty conversation history for session {session_id}")
        
        # Always use conversation_history directly - don't try to use get_messages
        messages = conversation_history
        
        # Create a safe session dict with defaults
        safe_session = {
            'trust_score': getattr(session, 'trust_score', 75),
            'persuasion_rating': getattr(session, 'persuasion_rating', 65),
            'confidence_score': getattr(session, 'confidence_score', 70),
            'duration': getattr(session, 'duration', 15),
            'start_time': getattr(session, 'start_time', datetime.utcnow() - timedelta(minutes=30)),
            'end_time': getattr(session, 'end_time', datetime.utcnow())
        }
        
        # Clear the active roleplay cookie
        response = make_response(render_template(
            'training/session_summary.html',
            active_tab='roleplay',
            session=session,
            roleplay_session=session,
            safe_session=safe_session,
            metrics=metrics,
            feedback=feedback,
            buyer_persona=buyer_persona,
            stages=session.reached_stages_list if hasattr(session, 'reached_stages_list') else [],
            current_stage=session.current_stage if hasattr(session, 'current_stage') else 'unknown',
            messages=messages
        ))
        response.set_cookie('active_roleplay_session', '', max_age=0)
        return response
            
    except Exception as e:
        current_app.logger.error(f"Error showing session summary: {str(e)}")
        flash('An error occurred while loading the session summary.', 'danger')
        return redirect(url_for('training.show_dashboard'))

@training_bp.route('/api/training/roleplay/<int:session_id>/end', methods=['POST'])
@login_required
def end_roleplay_session(session_id):
    """API endpoint to mark a roleplay session as completed and trigger feedback."""
    try:
        session = training_services.get_training_session(session_id, current_user.profile.id)
        if not session:
            return jsonify({"error": "Training session not found or access denied"}), 404

        if session.status == 'completed':
            return jsonify({"status": "success", "message": "Session already completed"}), 200

        # Update session status
        session.status = 'completed'
        session.end_time = datetime.utcnow()
        
        # Trigger final feedback generation and storage
        # This assumes generate_feedback_analysis handles saving
        feedback = training_services.generate_feedback_analysis(session) 
        if not feedback:
             # Even if feedback fails, we still mark session completed
             current_app.logger.error(f"Failed to generate final feedback for completed session {session_id}")
             # Commit session status change anyway
             try:
                 db.session.commit()
             except Exception as commit_err:
                 db.session.rollback()
                 current_app.logger.error(f"Error committing session status after feedback failure: {commit_err}")
                 return jsonify({"error": "Failed to finalize session after feedback error"}), 500
             return jsonify({"status": "success", "message": "Session ended, but feedback generation failed"}), 200 # Or maybe 207 Multi-Status?
        else:
             # Commit session status change after successful feedback
             try:
                 db.session.commit() 
                 current_app.logger.info(f"Training session {session_id} marked as completed.")
             except Exception as commit_err:
                 db.session.rollback()
                 current_app.logger.error(f"Error committing session status after feedback success: {commit_err}")
                 # Feedback was generated but status update failed - tricky state
                 return jsonify({"error": "Feedback generated, but failed to finalize session status"}), 500
        
        # Clear any relevant session cookies/local storage on client side via response/JS
        return jsonify({"status": "success", "message": "Session ended and feedback generated"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error ending roleplay session {session_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "An internal error occurred while ending the session."}), 500

@training_bp.route('/api/roleplay/<int:session_id>/persona', methods=['GET'])
@login_required
def get_roleplay_persona(session_id):
    """API endpoint to get the buyer persona for a specific training session."""
    try:
        session = TrainingSession.query.get_or_404(session_id)
        
        # Check if the session belongs to the current user
        if not session.user_profile_id == current_user.profile.id:
            current_app.logger.warning(f"User {current_user.id} attempted to access session {session_id} they don't own.")
            return jsonify({'error': 'Unauthorized access to session'}), 403
            
        persona = session.buyer_persona
        if not persona:
            current_app.logger.error(f"Buyer persona not found for session {session_id}")
            return jsonify({'error': 'Buyer persona not found for this session'}), 404
            
        # Prepare persona data for JSON response
        persona_data = {
            'id': persona.id,
            'name': persona.name or "Unknown",
            'description': persona.description or "No description available.",
            'personality_traits': persona.personality_traits_dict,
            'emotional_state': persona.emotional_state,
            'buyer_type': persona.buyer_type,
            'decision_authority': persona.decision_authority,
            'objections': persona.objections_list
            # Add other relevant fields as needed
        }
        
        current_app.logger.info(f"Successfully retrieved persona {persona.id} for session {session_id}")
        return jsonify(persona_data)
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving persona for session {session_id}: {str(e)}", exc_info=True)
        return jsonify({'error': 'An internal error occurred while retrieving the persona.'}), 500

@training_bp.route('/delete_all_roleplays', endpoint='delete_all_roleplays', methods=['GET', 'POST'])
@login_required
def delete_all_roleplays():
    """Delete all roleplay sessions for the current user (for testing purposes)."""
    try:
        sessions = TrainingSession.query.filter_by(user_profile_id=current_user.profile.id).all()
        for session in sessions:
            db.session.delete(session)
        db.session.commit()
        flash("All roleplay sessions deleted.", "success")
        return redirect(url_for('training.show_dashboard'))
    except Exception as e:
        current_app.logger.error(f"Error deleting roleplay sessions: {str(e)}")
        flash("Error deleting roleplay sessions.", "danger")
        return redirect(url_for('training.show_dashboard'))

@training_bp.route('/api/sessions', methods=['GET'])
@login_required
def get_active_sessions():
    """Return active roleplay sessions for the current user."""
    sessions = TrainingSession.query.filter_by(user_profile_id=current_user.profile.id).all()
    sessions_list = []
    for s in sessions:
        sessions_list.append({
            "id": s.id,
            "status": s.status  # assuming s.status exists
        })
    return jsonify({"sessions": sessions_list})

@training_bp.route('/profile', methods=['GET'])
@login_required
def training_profile():
    """Redirect to the auth profile page."""
    return redirect(url_for('auth.profile'))

@training_bp.route('/api/profile/update', methods=['POST'])
@login_required
def update_profile():
    """Update user profile preferences"""
    try:
        # Get profile
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            flash('Profile not found. Creating a new one.', 'warning')
            profile = UserProfile(user_id=current_user.id)
            db.session.add(profile)
        
        # Check for onboarding reset
        if request.form.get('reset_onboarding') == 'true':
            profile.onboarding_complete = False
            profile.onboarding_step = 'experience'  # Reset to first step
            db.session.commit()
            flash('Onboarding has been reset. You will now be redirected to the onboarding page.', 'success')
            return redirect(url_for('training.onboarding'))
            
        # Update preference fields
        if 'preferred_training_style' in request.form:
            profile.preferred_training_style = request.form.get('preferred_training_style')
            
        if 'preferred_feedback_frequency' in request.form:
            profile.preferred_feedback_frequency = request.form.get('preferred_feedback_frequency')
        
        # Save changes
        db.session.commit()
        
        flash('Profile preferences updated successfully!', 'success')
        return redirect(url_for('auth.settings'))
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating profile: {str(e)}")
        flash(f"Error updating profile: {str(e)}", 'danger')
        return redirect(url_for('auth.settings'))

@training_bp.route('/latest-summary')
@login_required
def latest_summary():
    """Display the summary/feedback for the most recent completed session."""
    try:
        latest_completed_session = TrainingSession.query.filter_by(
            user_profile_id=current_user.profile.id,
            status='completed'
        ).order_by(TrainingSession.end_time.desc()).first()

        if not latest_completed_session:
            flash("No completed sessions found to display feedback.", "info")
            return redirect(url_for('training.show_dashboard'))

        # Eager load feedback analysis
        feedback = FeedbackAnalysis.query.filter_by(session_id=latest_completed_session.id).first()
        
        if not feedback:
            flash("Feedback for the latest session is not available yet or failed to generate.", "warning")
            # Potentially trigger regeneration or show an error state?
            # For now, redirect to dashboard
            return redirect(url_for('training.show_dashboard'))

        # Render the comprehensive session summary template instead
        return render_template('training/session_summary.html', 
                                session=latest_completed_session, 
                                feedback=feedback)
    except Exception as e:
        current_app.logger.error(f"Error loading latest summary: {str(e)}", exc_info=True)
        flash("An error occurred while loading the feedback summary.", "error")
        return redirect(url_for('training.show_dashboard'))

@training_bp.route('/voice-chat', methods=['GET'])
def voice_chat_view():
    """Redirect to the new voice chat interface."""
    return redirect('/chat')

@training_bp.route('/dashboard/voice-chat', methods=['GET'])
@login_required
def dashboard_voice_chat():
    """Redirect to the new voice chat interface from the dashboard."""
    return redirect('/chat')

# LEGACY ONBOARDING ROUTES - REMOVED
# The following routes have been removed and replaced with the simplified version below:
# - /api/training/onboarding/start
# - /onboarding
# - /api/training/onboarding/update
# - /api/training/onboarding/complete
# - /api/reset-onboarding (replaced with simpler version)
        
# NEW SIMPLIFIED RESET ONBOARDING ENDPOINT
@training_bp.route('/api/reset-onboarding', methods=['POST'])
@login_required
@csrf.exempt
def reset_onboarding():
    """Reset the onboarding status to force a user to go through onboarding again."""
    try:
        # Get the user's profile
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        
        if not profile:
            return jsonify({
                'status': 'error',
                'message': 'No profile found to reset'
            }), 404
        
        # Reset onboarding status - now just a simple flag since React handles the details
        profile.onboarding_complete = False
        
        # Commit the changes
        db.session.commit()
        
        logger.info(f"User {current_user.id} reset their onboarding status")
        
        return jsonify({
            'status': 'success',
            'message': 'Onboarding reset successfully'
        })
        
    except Exception as e:
        logger.error(f"Error resetting onboarding: {str(e)}")
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': f'Failed to reset onboarding: {str(e)}'
        }), 500 

@training_bp.route('/api/chat/create_test_persona', methods=['POST'])
@csrf.exempt
def api_create_test_persona():
    """API endpoint to generate a new buyer persona for testing."""
    # --- NEW LOGGING ---
    logger.info(f"Entering /api/chat/create_test_persona. Headers: {request.headers}")
    # --- END NEW LOGGING ---
    try:
        # For testing, we call generate_buyer_persona without a specific UserProfile.
        # The service function is now adapted to handle this by using a mock profile for context.
        persona_model = generate_buyer_persona(user_profile=None) # Pass None

        if not persona_model:
            return jsonify({"error": "Failed to generate persona model"}), 500

        # Ensure personality_traits and cognitive_biases are dictionaries before sending
        try:
            personality_traits_dict = json.loads(persona_model.personality_traits) if persona_model.personality_traits else {}
        except (json.JSONDecodeError, TypeError):
            personality_traits_dict = {"error": "Could not parse personality_traits"}
        
        try:
            cognitive_biases_dict = json.loads(persona_model.cognitive_biases) if persona_model.cognitive_biases else {}
        except (json.JSONDecodeError, TypeError):
            cognitive_biases_dict = {"error": "Could not parse cognitive_biases"}

        persona_data = {
            "id": persona_model.id, # The ID from the database
            "name": persona_model.name,
            "role": persona_model.role,
            "description_narrative": persona_model.description, # Mapped from description_narrative
            "base_reaction_style": persona_model.base_reaction_style,
            "intelligence_level_generated": persona_model.intelligence_level,
            "primary_personality_trait_generated": personality_traits_dict.get(next(iter(personality_traits_dict), None), None) if personality_traits_dict else None, # Attempt to get a primary trait
            "trait_metrics": personality_traits_dict, # This is the trait_metrics object
            "emotional_state": persona_model.emotional_state,
            "buyer_type": persona_model.buyer_type,
            "decision_authority": persona_model.decision_authority,
            "industry_context": persona_model.industry_context,
            "pain_points": json.loads(persona_model.pain_points) if persona_model.pain_points else [],
            "primary_concern": persona_model.primary_concern,
            "objections": json.loads(persona_model.objections) if persona_model.objections else [],
            "cognitive_biases": cognitive_biases_dict
        }
        logger.info(f"Generated test persona: {persona_model.name}, ID: {persona_model.id}")
        return jsonify(persona_data), 200
    except Exception as e:
        logger.error(f"Error in /api/chat/create_test_persona: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to create test persona", "details": str(e)}), 500

@training_bp.route('/api/chat/send_test_message', methods=['POST'])
@csrf.exempt
def api_send_test_message():
    """API endpoint to send a message to a test persona and get a reply."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        user_text = data.get('message')
        persona_data = data.get('persona') # This is the full persona object from frontend state
        history = data.get('history', [])   # List of {role, content} dicts

        if not user_text or not persona_data:
            return jsonify({"error": "Missing message or persona data"}), 400

        # Construct messages for GPT-4o service
        # The history from frontend already has role/content. Add the new user message.
        messages_for_api = history + [{"role": "user", "content": user_text}]

        # Standardize roles for OpenAI API
        for message in messages_for_api:
            if message.get("role") == "ai":
                message["role"] = "assistant"
            # Ensure only supported roles are passed, or raise an error/log
            # For now, just fixing 'ai'. Consider adding more robust validation if other roles might appear.

        gpt4o_service = get_gpt4o_service()

        # The persona_data from frontend should match the structure expected by _create_roleplay_system_prompt
        # We might need to ensure fields like 'personality_traits' (which is trait_metrics)
        # and 'description' (which is description_narrative) are correctly named when passed.
        # For gpt4o_service.generate_roleplay_response, the persona arg is a dict.
        # The _create_roleplay_system_prompt expects fields like 'description' for narrative,
        # 'personality_traits' for the trait_metrics object.
        
        # Frontend Persona interface:
        #   description_narrative: string;
        #   trait_metrics object is under persona.trait_metrics (this needs to be mapped)
        # Backend gpt4o_service._create_roleplay_system_prompt expects:
        #   description: string (for narrative)
        #   personality_traits: object (for trait_metrics)
        
        persona_for_prompt = {
            **persona_data, # Spread all fields from frontend
            "description": persona_data.get("description_narrative"), # Map to expected key
            "personality_traits": persona_data.get("trait_metrics"), # Map to expected key
            # intelligence_level is already intelligence_level_generated from frontend persona state
            # base_reaction_style is already there
        }

        # Mock user_info for now for the system prompt generation
        mock_user_info = {"name": "Sales Rep (Test)", "experience_level": "intermediate"}

        ai_reply = gpt4o_service.generate_roleplay_response(
            persona=persona_for_prompt,
            messages=messages_for_api,
            user_info=mock_user_info,
            # conversation_state can be omitted or mocked for this simpler test interface
        )

        if not ai_reply:
            logger.error("AI service returned no reply.")
            return jsonify({"error": "AI service failed to generate a reply"}), 500

        logger.info(f"Generated AI reply for test chat: {ai_reply[:50]}...")
        return jsonify({"reply": ai_reply}), 200
    except Exception as e:
        logger.error(f"Error in /api/chat/send_test_message: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to process test message", "details": str(e)}), 500 