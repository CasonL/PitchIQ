"""
Routes for the AI Sales Training system.
"""

from flask import Blueprint, request, jsonify, current_app, render_template, flash, redirect, url_for, g
from flask_login import login_required, current_user
from models import db, UserProfile, BuyerPersona, TrainingSession, PerformanceMetrics, FeedbackAnalysis, User, Conversation, Feedback
# Import the service functions
from training_services import (
    generate_buyer_persona, 
    generate_ai_response, 
    analyze_interaction, 
    generate_performance_metrics, 
    generate_feedback_analysis
)
from datetime import datetime, timedelta
import json
import random
import logging
import traceback
from typing import List, Dict, Any, Optional

# Initialize logger
logger = logging.getLogger(__name__)

training_bp = Blueprint('training', __name__, url_prefix='/training')

@training_bp.route('/dashboard')
@login_required
def show_dashboard():
    """
    Display the user dashboard with performance metrics and roleplay history.
    """
    try:
        # Get active and archived conversations separately
        active_conversations = Conversation.query.filter_by(
            user_id=current_user.id, 
            is_archived=False
        ).order_by(Conversation.updated_at.desc()).all()
        
        archived_conversations = Conversation.query.filter_by(
            user_id=current_user.id, 
            is_archived=True
        ).order_by(Conversation.updated_at.desc()).all()
        
        # Count active and archived conversations
        active_count = len(active_conversations)
        archived_count = len(archived_conversations)
        total_sessions = active_count + archived_count
        
        # Initialize stats
        stats = {
            'total_sessions': total_sessions,
            'avg_score': 0,
            'avg_trust_score': 0,
            'avg_persuasion': 0,
            'avg_confidence': 0,
        }
        
        # Initialize performance data
        performance_data = {"labels": [], "scores": []}
        # skills_radar = current_user.profile.sales_skills_dict if hasattr(current_user, 'profile') else {}
        # Access skills_dict directly from the User object
        skills_radar = current_user.skills_dict 
        
        # Only calculate stats if there are sessions
        if total_sessions > 0:
            try:
                # Get all feedbacks for performance data
                recent_feedbacks = Feedback.query.filter_by(user_id=current_user.id).order_by(Feedback.generated_at.desc()).limit(5).all()
                if recent_feedbacks:
                    total_score = 0
                    count = 0
                    for fb in recent_feedbacks:
                        score = 0
                        if score is not None:
                            total_score += score
                            count += 1
                    if count > 0:
                        stats['avg_score'] = round(total_score / count, 1)
                
                # Calculate other stats if feedback provides them
                feedback_count = 0
                total_trust = 0
                total_persuasion = 0
                total_confidence = 0
                all_feedbacks = Feedback.query.filter_by(user_id=current_user.id).all()
                if all_feedbacks:
                    for fb in all_feedbacks:
                        trust, persuasion, confidence = 0, 0, 0
                        if trust is not None and persuasion is not None and confidence is not None:
                            total_trust += trust
                            total_persuasion += persuasion
                            total_confidence += confidence
                            feedback_count += 1
                    if feedback_count > 0:
                        stats['avg_trust_score'] = round(total_trust / feedback_count, 1)
                        stats['avg_persuasion'] = round(total_persuasion / feedback_count, 1)
                        stats['avg_confidence'] = round(total_confidence / feedback_count, 1)
            
            except Exception as e:
                logger.error(f"Error calculating stats: {str(e)}")
                logger.error(traceback.format_exc())
        
        # Get strengths and weaknesses
        profile = current_user.profile if hasattr(current_user, 'profile') else None
        strengths_list = profile.strengths_list if profile and hasattr(profile, 'strengths_list') else []
        weaknesses_list = profile.weaknesses_list if profile and hasattr(profile, 'weaknesses_list') else []
        
        # --- FAB Logic --- 
        # Find the most recent active (non-archived) conversation to potentially resume
        latest_active_conversation = next((conv for conv in active_conversations), None) # active_conversations is already sorted desc
        
        resume_roleplay_possible = False
        resume_conversation_id = None
        if latest_active_conversation:
             # Add logic here if you need to check if it's *actually* resumable (e.g., not completed)
             # For now, assume any active conversation can be resumed
             resume_roleplay_possible = True
             resume_conversation_id = latest_active_conversation.id
        # --- End FAB Logic ---
        
        return render_template(
            'dashboard.html',
            user=current_user,
            active_conversations=active_conversations,
            archived_conversations=archived_conversations,
            stats=stats,
            skill_data=skills_radar,
            strengths_list=strengths_list,
            weaknesses_list=weaknesses_list,
            total_sessions=total_sessions,
            active_tab='dashboard',
            now=datetime.utcnow(),
            resume_roleplay_possible=resume_roleplay_possible,
            resume_conversation_id=resume_conversation_id
        )
        
    except Exception as e:
        logger.error(f"Error showing dashboard: {str(e)}")
        logger.error(traceback.format_exc())
        flash('An error occurred while loading the dashboard.', 'danger')
        return redirect(url_for('auth.login'))

@training_bp.route('/feature-poll', methods=['GET', 'POST'])
@login_required
def feature_poll():
    """Display the feature poll page and handle submissions."""
    # Placeholder features (needed for both GET and POST in case of errors)
    features = [
        {"id": "learning_paths", "name": "AI Personalized Learning Paths", "description": "Tailored lesson plans based on your performance data."},
        {"id": "realtime_hints", "name": "Real-time Practice Hints", "description": "Subtle AI suggestions during live roleplay sessions."},
        {"id": "call_analysis", "name": "Recorded Call Analysis", "description": "Upload your real sales calls for AI feedback."},
        {"id": "objection_sim", "name": "Smart Objection Handling Simulator", "description": "Practice responding to AI-generated customer objections."},
        {"id": "knowledge_base", "name": "AI-Powered Knowledge Base Q&A", "description": "Ask questions about your product/service, get AI answers."},
    ]
    
    if request.method == 'POST':
        try:
            vote = request.form.get('feature_vote')
            comments = request.form.get('comments', '') # Optional field
            
            if not vote:
                flash('Please select a feature to vote for.', 'warning')
                # Re-render the form if validation fails on server-side
                return render_template(
                    'feature_poll.html',
                    active_tab='feature_poll',
                    features=features,
                    now=datetime.utcnow()
                )
                
            # --- Start: Save Vote to Database ---
            try:
                from models import FeatureVote # Import inside function
                # Optional: Check if user already voted? (Could add unique constraint or query first)
                # existing_vote = FeatureVote.query.filter_by(user_id=current_user.id).first()
                # if existing_vote:
                #     flash("You've already voted in this poll.", "info")
                #     return redirect(url_for('training.feature_poll'))

                new_vote = FeatureVote(
                    user_id=current_user.id,
                    feature_id_voted_for=vote,
                    comments=comments
                )
                db.session.add(new_vote)
                db.session.commit()
                logger.info(f"Feature poll vote saved for user {current_user.id}, feature: {vote}")
                flash('Thank you for your feedback! Your vote has been recorded.', 'success')
            except Exception as db_error:
                db.session.rollback()
                logger.error(f"Database error saving feature vote for user {current_user.id}: {str(db_error)}")
                logger.error(traceback.format_exc())
                flash('There was an issue saving your vote. Please try again.', 'danger')
            # --- End: Save Vote to Database ---
                
            # TODO: Store the vote and comments persistently (e.g., in a database) - DONE
            # For now, just log it - Removed original logging
            # logger.info(f"Feature poll submission by user {current_user.id}: Voted for '{vote}', Comments: '{comments}'") 
            
            # flash('Thank you for your feedback!', 'success') # Moved inside try block
            # Redirect back to the feature poll page using GET to prevent resubmission
            return redirect(url_for('training.feature_poll'))
            
        except Exception as e:
            logger.error(f"Error processing feature poll submission: {str(e)}")
            logger.error(traceback.format_exc())
            flash('An error occurred while submitting your vote. Please try again.', 'danger')
            # Fall through to render the GET template below in case of error during POST
            
    # Handle GET requests (or fall through from POST errors)
    try:
        return render_template(
            'feature_poll.html',
            active_tab='feature_poll',
            features=features,
            now=datetime.utcnow(),
            csrf_token=g.csrf_token
        )
    except Exception as e:
        logger.error(f"Error showing feature poll page: {str(e)}")
        logger.error(traceback.format_exc())
        flash('An error occurred while loading the feature poll page.', 'danger')
        return redirect(url_for('training.show_dashboard'))

@training_bp.route('/api/training/onboarding/start', methods=['POST'])
@login_required
def start_onboarding():
    """Start the onboarding process for a new user."""
    try:
        # Check if user already has a profile
        if hasattr(current_user, 'profile'):
            return jsonify({
                'status': 'error',
                'message': 'User profile already exists'
            }), 400
        
        # Create new user profile
        profile = UserProfile(
            user_id=current_user.id,
            experience_level=request.json.get('experience_level'),
            product_service=request.json.get('product_service'),
            target_market=request.json.get('target_market'),
            industry=request.json.get('industry')
        )
        
        db.session.add(profile)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Onboarding started successfully',
            'profile_id': profile.id
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting onboarding: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to start onboarding'
        }), 500

@training_bp.route('/api/training/onboarding/update', methods=['POST'])
@login_required
def update_onboarding():
    """Update user profile with additional information."""
    try:
        if not hasattr(current_user, 'profile'):
            return jsonify({
                'status': 'error',
                'message': 'User profile not found'
            }), 404
        
        profile = current_user.profile
        
        # Update profile fields from form data
        if 'experience_level' in request.form:
            profile.experience_level = request.form.get('experience_level')
        if 'product_service' in request.form:
            profile.product_service = request.form.get('product_service')
        if 'target_market' in request.form:
            profile.target_market = request.form.get('target_market')
        if 'industry' in request.form:
            profile.industry = request.form.get('industry')
            
        # Handle tag-based fields that come as JSON strings
        if 'pain_points' in request.form:
            try:
                profile.pain_points = request.form.get('pain_points')
            except:
                pass
        if 'recent_wins' in request.form:
            try:
                profile.recent_wins = request.form.get('recent_wins')
            except:
                pass
        if 'mindset_challenges' in request.form:
            try:
                profile.mindset_challenges = request.form.get('mindset_challenges')
            except:
                pass
        if 'improvement_goals' in request.form:
            try:
                profile.improvement_goals = request.form.get('improvement_goals')
            except:
                pass
        
        # Set default training preferences
        profile.preferred_training_style = 'structured'
        profile.preferred_feedback_frequency = 'end-session'
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Profile updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating profile: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update profile'
        }), 500

@training_bp.route('/api/training/preferences/update', methods=['POST'])
@login_required
def update_preferences():
    """Update user training preferences from the dashboard."""
    try:
        if not hasattr(current_user, 'profile'):
            flash('User profile not found', 'danger')
            return redirect(url_for('training.show_dashboard'))
        
        profile = current_user.profile
        
        # Update training style preference
        if 'preferred_training_style' in request.form:
            training_style = request.form.get('preferred_training_style')
            # Validate the training style
            valid_styles = ['structured', 'conversational', 'challenge-based']
            if training_style in valid_styles:
                profile.preferred_training_style = training_style
        
        # Update feedback frequency preference
        if 'preferred_feedback_frequency' in request.form:
            feedback_frequency = request.form.get('preferred_feedback_frequency')
            # Validate the feedback frequency
            valid_frequencies = ['real-time', 'end-session', 'daily']
            if feedback_frequency in valid_frequencies:
                profile.preferred_feedback_frequency = feedback_frequency
        
        db.session.commit()
        
        flash('Your training preferences have been successfully updated', 'success')
        return redirect(url_for('training.show_dashboard') + '#preferences')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating preferences: {str(e)}")
        flash('Failed to update preferences. Please try again.', 'danger')
        return redirect(url_for('training.show_dashboard') + '#preferences')

@training_bp.route('/api/training/onboarding/complete', methods=['POST'])
@login_required
def complete_onboarding():
    """Mark onboarding as complete."""
    try:
        # Get user profile or create if not exists
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        
        if not profile:
            return jsonify({
                'status': 'error',
                'message': 'User profile not found'
            }), 404
        
        # Mark onboarding as complete
        profile.onboarding_complete = True
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Onboarding marked as complete'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error completing onboarding: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to complete onboarding: {str(e)}'
        }), 500

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
        
        # Generate buyer persona based on user profile
        buyer_persona = generate_buyer_persona(current_user.profile)
        db.session.add(buyer_persona)
        
        # Create training session
        session = TrainingSession(
            user_profile_id=current_user.profile.id,
            buyer_persona_id=buyer_persona.id,
            conversation_history=json.dumps([]),
            key_moments=json.dumps([]),
            objections_handled=json.dumps([])
        )
        db.session.add(session)
        
        db.session.commit()
        
        return jsonify({
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
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting roleplay: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to start roleplay session'
        }), 500

@training_bp.route('/api/training/roleplay/<int:session_id>/message', methods=['POST'])
@login_required
def send_message(session_id):
    """Send a message in the roleplay session."""
    try:
        session = TrainingSession.query.get_or_404(session_id)
        
        if session.user_profile_id != current_user.profile.id:
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access to session'
            }), 403
        
        message = request.json.get('message')
        if not message:
            return jsonify({
                'status': 'error',
                'message': 'Message content is required'
            }), 400
        
        # Update conversation history
        conversation = session.conversation_history_dict
        conversation.append({
            'role': 'user',
            'content': message,
            'timestamp': datetime.utcnow().isoformat()
        })
        session.conversation_history_dict = conversation
        
        # Generate AI response
        ai_response = generate_ai_response(session, message)
        conversation.append({
            'role': 'assistant',
            'content': ai_response,
            'timestamp': datetime.utcnow().isoformat()
        })
        session.conversation_history_dict = conversation
        
        # Analyze key moments and objections
        analyze_interaction(session, message, ai_response)
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Message processed successfully',
            'ai_response': ai_response
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error processing message: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to process message'
        }), 500

@training_bp.route('/api/training/roleplay/<int:session_id>/end', methods=['POST'])
@login_required
def end_roleplay(session_id):
    """End a roleplay session and generate feedback."""
    try:
        session = TrainingSession.query.get_or_404(session_id)
        
        if session.user_profile_id != current_user.profile.id:
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access to session'
            }), 403
        
        # Update session status
        session.status = 'completed'
        session.end_time = datetime.utcnow()
        
        # Generate performance metrics
        metrics = generate_performance_metrics(session)
        db.session.add(metrics)
        
        # Generate feedback analysis
        feedback = generate_feedback_analysis(session, metrics)
        db.session.add(feedback)
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Session completed successfully',
            'metrics': {
                'trust_score': session.trust_score,
                'persuasion_rating': session.persuasion_rating,
                'confidence_score': session.confidence_score
            },
            'feedback': {
                'overall_assessment': feedback.overall_assessment,
                'strengths': feedback.strengths_demonstrated_list,
                'areas_for_improvement': feedback.areas_for_improvement_list,
                'action_items': feedback.action_items_list
            }
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error ending roleplay: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to end roleplay session'
        }), 500

@training_bp.route('/api/training/sessions', methods=['GET'])
@login_required
def get_training_sessions():
    """Get all training sessions for the current user."""
    try:
        if not hasattr(current_user, 'profile'):
            return jsonify({
                'status': 'error',
                'message': 'User profile not found'
            }), 404
        
        sessions = TrainingSession.query.filter_by(
            user_profile_id=current_user.profile.id
        ).order_by(TrainingSession.start_time.desc()).all()
        
        return jsonify({
            'status': 'success',
            'sessions': [{
                'id': session.id,
                'start_time': session.start_time.isoformat(),
                'end_time': session.end_time.isoformat() if session.end_time else None,
                'status': session.status,
                'trust_score': session.trust_score,
                'persuasion_rating': session.persuasion_rating,
                'confidence_score': session.confidence_score,
                'buyer_persona': {
                    'name': session.buyer_persona.name,
                    'description': session.buyer_persona.description
                }
            } for session in sessions]
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting training sessions: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get training sessions'
        }), 500

@training_bp.route('/api/training/sessions/<int:session_id>', methods=['GET'])
@login_required
def get_session_details(session_id):
    """Get detailed information about a specific training session."""
    try:
        session = TrainingSession.query.get_or_404(session_id)
        
        if session.user_profile_id != current_user.profile.id:
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access to session'
            }), 403
        
        return jsonify({
            'status': 'success',
            'session': {
                'id': session.id,
                'start_time': session.start_time.isoformat(),
                'end_time': session.end_time.isoformat() if session.end_time else None,
                'status': session.status,
                'trust_score': session.trust_score,
                'persuasion_rating': session.persuasion_rating,
                'confidence_score': session.confidence_score,
                'conversation_history': session.conversation_history_dict,
                'key_moments': session.key_moments_list,
                'objections_handled': session.objections_handled_list,
                'buyer_persona': {
                    'name': session.buyer_persona.name,
                    'description': session.buyer_persona.description,
                    'personality_traits': session.buyer_persona.personality_traits_dict,
                    'emotional_state': session.buyer_persona.emotional_state,
                    'buyer_type': session.buyer_persona.buyer_type,
                    'decision_authority': session.buyer_persona.decision_authority
                },
                'performance_metrics': {
                    'rapport_building': session.performance_metrics.rapport_building,
                    'needs_discovery': session.performance_metrics.needs_discovery,
                    'objection_handling': session.performance_metrics.objection_handling,
                    'closing_techniques': session.performance_metrics.closing_techniques,
                    'product_knowledge': session.performance_metrics.product_knowledge,
                    'bias_effectiveness': session.performance_metrics.bias_effectiveness_dict,
                    'emotional_awareness': session.performance_metrics.emotional_awareness,
                    'tone_consistency': session.performance_metrics.tone_consistency
                } if session.performance_metrics else None,
                'feedback_analysis': {
                    'overall_assessment': session.feedback_analysis.overall_assessment,
                    'strengths': session.feedback_analysis.strengths_demonstrated_list,
                    'areas_for_improvement': session.feedback_analysis.areas_for_improvement_list,
                    'rapport_feedback': session.feedback_analysis.rapport_feedback,
                    'discovery_feedback': session.feedback_analysis.discovery_feedback,
                    'objection_feedback': session.feedback_analysis.objection_feedback,
                    'closing_feedback': session.feedback_analysis.closing_feedback,
                    'mindset_insights': session.feedback_analysis.mindset_insights,
                    'limiting_beliefs': session.feedback_analysis.limiting_beliefs_detected_list,
                    'reframe_suggestions': session.feedback_analysis.reframe_suggestions_list,
                    'action_items': session.feedback_analysis.action_items_list
                } if session.feedback_analysis else None
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting session details: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get session details'
        }), 500

@training_bp.route('/profile')
@login_required
def show_profile():
    """Show the user's profile page."""
    # Profile data is usually accessed via current_user.profile
    # Add any additional data needed for the profile template here
    return render_template(
        'training/profile.html', 
        user=current_user, 
        active_tab='profile',
        now=datetime.utcnow() # Add now variable
    )

@training_bp.route('/api/profile/update', methods=['POST'])
@login_required
def update_profile():
    """Update the user's profile sales context."""
    try:
        # Use request.form since we're submitting a standard HTML form
        data = request.form
            
        if not data:
            logger.warning("No form data provided in profile update request")
            flash('No data submitted.', 'warning')
            return redirect(url_for('training.show_profile'))
            
        profile = current_user.profile
        if not profile:
             # Should not happen if user is logged in and navigated here,
             # but handle defensively. Maybe create a profile?
             logger.error(f"Profile not found for user {current_user.id} during update.")
             flash('User profile not found. Please contact support.', 'danger')
             return redirect(url_for('training.show_profile'))
        
        # Update profile fields if they exist in the form data
        updated = False
        if 'experience_level' in data and data['experience_level']:
            profile.experience_level = data['experience_level']
            updated = True
            
        if 'target_market' in data and data['target_market']:
            profile.target_market = data['target_market']
            updated = True
            
        if 'product_service' in data:
            # Allow empty string to clear the field
            profile.product_service = data['product_service'] 
            updated = True
            
        if 'industry' in data:
             # Allow empty string to clear the field
            profile.industry = data['industry'] 
            updated = True
            
        # Save changes
        if updated:
            db.session.commit()
            flash('Profile updated successfully!', 'success')
            logger.info(f"Profile updated successfully for user {current_user.id}")
        else:
            flash('No changes detected.', 'info')
            
        return redirect(url_for('training.show_profile'))
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating profile for user {current_user.id}: {e}", exc_info=True)
        flash(f'Failed to update profile: An unexpected error occurred.', 'danger')
        return redirect(url_for('training.show_profile'))

# --- Developer Routes --- #

@training_bp.route('/dev/db-viewer')
@login_required
def dev_db_viewer():
    """Display database contents for developers/admins."""
    # --- ACCESS CONTROL --- #
    # Make sure ONLY admins can access this page
    if not current_user.role == 'admin': # Adjust role name if needed ('developer')
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('training.show_dashboard'))
    # --- END ACCESS CONTROL --- #
    
    try:
        from models import FeatureVote # Import inside function
        # Query data from relevant tables
        feature_votes = FeatureVote.query.order_by(FeatureVote.voted_at.desc()).all()
        users = User.query.order_by(User.id).all()
        # Add more queries here if needed (e.g., Conversations)
        # conversations = Conversation.query.order_by(Conversation.created_at.desc()).limit(50).all()
        
        return render_template(
            'training/dev_db_viewer.html',
            feature_votes=feature_votes,
            users=users,
            # conversations=conversations, # Uncomment if you add the query above
            active_tab='dev_db_viewer' # For potential sidebar highlighting
        )
        
    except Exception as e:
        logger.error(f"Error loading developer DB viewer: {str(e)}")
        logger.error(traceback.format_exc())
        flash('An error occurred while loading the developer database viewer.', 'danger')
        return redirect(url_for('training.show_dashboard')) 