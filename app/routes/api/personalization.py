from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import traceback
from app.extensions import db
from app.models import UserProfile
from app.services.persona_service import generate_coach_persona, generate_smart_enhancements

personalization_bp = Blueprint('personalization', __name__)

@personalization_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """
    Returns the current user's profile data.
    """
    user_profile = current_user.profile
    if not user_profile:
        return jsonify({"error": "User profile not found."}), 404

    profile_data = {
        "onboarding_complete": user_profile.onboarding_complete,
        "coach_persona": user_profile.coach_persona,
        "p_product": user_profile.p_product,
        "p_value_prop": user_profile.p_value_prop,
        "p_audience": user_profile.p_audience,
        "p_sales_context": user_profile.p_sales_context,
        "p_sales_methodology": user_profile.p_sales_methodology,
        "p_improvement_goal": user_profile.p_improvement_goal,
    }
    return jsonify(profile_data), 200

@personalization_bp.route('/personalize', methods=['POST'])
@login_required
def update_personalization():
    """
    Receives personalization data from the frontend form,
    updates the user's profile, and triggers the AI persona generation.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    try:
        user_profile = current_user.profile
        if not user_profile:
            # This case should be rare if profiles are created on user registration
            user_profile = UserProfile(user_id=current_user.id)
            db.session.add(user_profile)

        # **BACKEND PROTECTION: Prevent duplicate coach creation**
        # Check if this is initial coach creation vs enhancement
        is_initial_creation = not user_profile.coach_persona
        
        # For enhancement requests (when coach already exists), we allow updates
        # For initial creation attempts when coach exists, we block them
        if user_profile.coach_persona and any(key in data for key in ['core_q1_product', 'core_q2_audience', 'core_q5_goal']):
            return jsonify({
                "error": "Coach already exists", 
                "message": "You already have a personalized coach. Use the enhancement features instead of creating a new one.",
                "redirect": "/meet-your-coach"
            }), 409  # Conflict status code

        # Map frontend keys to backend model fields
        field_map = {
            'core_q1_product': 'p_product',
            'core_q1_value': 'p_value_prop',
            'core_q2_audience': 'p_audience',
            'core_q4_style': 'p_sales_context',
            'core_q4_methodology': 'p_sales_methodology',
            'core_q5_goal': 'p_improvement_goal'
        }

        for frontend_key, db_field in field_map.items():
            # Only update attributes that are present in the payload AND have a non-empty value.
            # This prevents overwriting existing data with empty strings from the form.
            if frontend_key in data and data[frontend_key]:
                setattr(user_profile, db_field, data[frontend_key])

        # Consolidate all known personalization data from the profile
        # to pass to the persona generation service. This ensures that
        # even on an "enhance" flow, we use previously entered data.
        persona_context = {
            'core_q1_product': user_profile.p_product or '',
            'core_q1_value': user_profile.p_value_prop or '',
            'core_q2_audience': user_profile.p_audience or '',
            'core_q4_style': user_profile.p_sales_context or '',
            'core_q4_methodology': user_profile.p_sales_methodology or '',
            'core_q5_goal': user_profile.p_improvement_goal or '',
        }
        
        # Generate the AI coach persona using the consolidated context
        coach_persona = generate_coach_persona(persona_context)
        user_profile.coach_persona = coach_persona

        user_profile.onboarding_complete = True
        user_profile.initial_setup_complete = True
        
        db.session.commit()
        return jsonify({"success": True, "message": "Personalization updated successfully."}), 200
    except Exception as e:
        db.session.rollback()
        # Log the full traceback to the console for detailed debugging
        print("--- START: EXCEPTION IN /api/personalize ---")
        traceback.print_exc()
        print("--- END: EXCEPTION IN /api/personalize ---")
        
        # Return a generic error to the user
        return jsonify({"error": f"An internal error occurred: {e}"}), 500 

@personalization_bp.route('/smart-fill', methods=['POST'])
@login_required
def smart_fill():
    """
    Generate smart enhancement suggestions for the user's personalization data.
    """
    try:
        user_profile = current_user.profile
        if not user_profile:
            return jsonify({"error": "User profile not found."}), 404
        
        # Get the full personalization data for proper enhancement generation
        context = {
            'core_q1_product': user_profile.p_product or '',
            'core_q1_value': user_profile.p_value_prop or '',
            'core_q2_audience': user_profile.p_audience or '',
            'core_q4_style': user_profile.p_sales_context or '',
            'core_q4_methodology': user_profile.p_sales_methodology or '',
            'core_q5_goal': user_profile.p_improvement_goal or '',
        }
        
        # Generate smart enhancements using the service
        enhancements = generate_smart_enhancements(context)
        
        return jsonify({"enhancements": enhancements}), 200
        
    except Exception as e:
        print("--- SMART FILL ERROR ---")
        traceback.print_exc()
        print("--- END SMART FILL ERROR ---")
        return jsonify({"error": f"Failed to generate enhancements: {e}"}), 500

@personalization_bp.route('/reset-onboarding', methods=['POST'])
@login_required
def reset_onboarding():
    """Reset the onboarding status to force a user to go through onboarding again."""
    try:
        # Get the user's profile
        profile = current_user.profile
        if not profile:
            return jsonify({
                'status': 'error',
                'message': 'No profile found to reset'
            }), 404
        
        # **COMPREHENSIVE RESET: Clear all coach and personalization data**
        profile.onboarding_complete = False
        profile.initial_setup_complete = False
        
        # Clear all coach persona and personalization data
        profile.coach_persona = None
        profile.p_product = None
        profile.p_value_prop = None
        profile.p_audience = None
        profile.p_sales_context = None
        profile.p_sales_methodology = None
        profile.p_improvement_goal = None
        
        # Reset onboarding step
        profile.onboarding_step = 'product'
        profile.onboarding_step_new = 0
        
        # Commit the changes
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Onboarding and coach persona reset successfully',
            'redirect': '/personalize'  # Explicitly tell the frontend where to go
        })
        
    except Exception as e:
        print("--- RESET ONBOARDING ERROR ---")
        traceback.print_exc()
        print("--- END RESET ONBOARDING ERROR ---")
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': f'Failed to reset onboarding: {str(e)}'
        }), 500 

@personalization_bp.route('/regenerate-coach', methods=['POST'])
@login_required
def regenerate_coach():
    """
    Regenerates the coach persona using existing profile data.
    This is for testing and getting fresh variations of the persona.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    try:
        user_profile = current_user.profile
        if not user_profile:
            return jsonify({"error": "User profile not found"}), 404

        # Use provided data OR fall back to existing profile data
        persona_context = {
            'core_q1_product': data.get('core_q1_product') or user_profile.p_product or '',
            'core_q1_value': data.get('core_q1_value') or user_profile.p_value_prop or '',
            'core_q2_audience': data.get('core_q2_audience') or user_profile.p_audience or '',
            'core_q4_style': data.get('core_q4_style') or user_profile.p_sales_context or '',
            'core_q4_methodology': data.get('core_q4_methodology') or user_profile.p_sales_methodology or '',
            'core_q5_goal': data.get('core_q5_goal') or user_profile.p_improvement_goal or '',
        }
        
        # Ensure we have the minimum required data
        if not persona_context['core_q1_product'] or not persona_context['core_q2_audience']:
            return jsonify({
                "error": "Insufficient data", 
                "message": "Missing required product or audience information for regeneration."
            }), 400
        
        # Generate fresh AI coach persona
        coach_persona = generate_coach_persona(persona_context)
        user_profile.coach_persona = coach_persona
        
        # Optionally update the profile fields if new data was provided
        field_map = {
            'core_q1_product': 'p_product',
            'core_q1_value': 'p_value_prop',
            'core_q2_audience': 'p_audience',
            'core_q4_style': 'p_sales_context',
            'core_q4_methodology': 'p_sales_methodology',
            'core_q5_goal': 'p_improvement_goal'
        }

        for frontend_key, db_field in field_map.items():
            if frontend_key in data and data[frontend_key]:
                setattr(user_profile, db_field, data[frontend_key])
        
        db.session.commit()
        return jsonify({
            "success": True, 
            "message": "Coach persona regenerated successfully.",
            "persona": coach_persona
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print("--- START: EXCEPTION IN /api/regenerate-coach ---")
        traceback.print_exc()
        print("--- END: EXCEPTION IN /api/regenerate-coach ---")
        
        return jsonify({"error": f"An internal error occurred: {e}"}), 500 