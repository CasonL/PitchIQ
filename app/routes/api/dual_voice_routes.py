"""
API routes for Dual Voice Agent system

Handles creation and management of dual voice agent training sessions
with buyer personas and sales coaching.
"""

from flask import Blueprint, request, jsonify, current_app, render_template_string, render_template
from flask_login import login_required, current_user
import logging
import json
from app.services.dual_voice_agent_service import get_dual_voice_service
from app.models import UserProfile, db
from app.services.demographic_names import DemographicNameService
from app.services.comprehensive_bias_prevention import ComprehensiveBiasPrevention

logger = logging.getLogger(__name__)

dual_voice_bp = Blueprint('dual_voice', __name__)

@dual_voice_bp.route('/session/create', methods=['POST'])
@login_required
def create_dual_voice_session():
    """Create a new dual voice agent training session"""
    try:
        data = request.get_json() or {}
        
        # Get scenario type and product description from request
        scenario_type = data.get('scenario_type', 'cold_call')
        product_description = data.get('product_description')  # From voice input
        
        # Validate scenario type
        valid_scenarios = [
            'cold_call', 'demo', 'objection_handling', 
            'closing', 'discovery', 'follow_up'
        ]
        
        if scenario_type not in valid_scenarios:
            return jsonify({
                'success': False,
                'error': f'Invalid scenario type. Must be one of: {", ".join(valid_scenarios)}'
            }), 400
        
        # Get user profile for persona generation context
        user_profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        
        if not user_profile:
            logger.warning(f"No user profile found for user {current_user.id}, creating basic profile")
            # Create a basic profile for demo purposes
            user_profile = UserProfile(
                user_id=current_user.id,
                experience_level='intermediate',
                product_service=product_description or 'Business Solution',
                target_market='B2B',
                industry='Technology'
            )
            db.session.add(user_profile)
            db.session.commit()
        
        # Get dual voice service and create session
        dual_voice_service = get_dual_voice_service()
        session_result = dual_voice_service.create_training_session(
            user_id=current_user.id,
            scenario_type=scenario_type,
            user_profile=user_profile,
            product_description=product_description
        )
        
        if not session_result.get('success'):
            logger.error(f"Failed to create dual voice session: {session_result.get('error')}")
            return jsonify(session_result), 500
        
        logger.info(f"Created dual voice session {session_result['session_id']} for user {current_user.id}")
        
        return jsonify(session_result)
        
    except Exception as e:
        logger.error(f"Error creating dual voice session: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to create dual voice session'
        }), 500

@dual_voice_bp.route('/session/<session_id>/log', methods=['POST'])
@login_required
def log_conversation_turn(session_id):
    """Log a conversation turn for analysis"""
    try:
        data = request.get_json() or {}
        
        speaker = data.get('speaker')  # 'user', 'persona', 'coach'
        content = data.get('content', '')
        agent_type = data.get('agent_type')  # 'buyer_persona' or 'sales_coach'
        
        if not speaker or not content:
            return jsonify({
                'success': False,
                'error': 'Speaker and content are required'
            }), 400
        
        # Log the conversation turn
        dual_voice_service = get_dual_voice_service()
        dual_voice_service.log_conversation_turn(
            session_id=session_id,
            speaker=speaker,
            content=content,
            agent_type=agent_type
        )
        
        return jsonify({
            'success': True,
            'message': 'Conversation turn logged'
        })
        
    except Exception as e:
        logger.error(f"Error logging conversation turn: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to log conversation turn'
        }), 500

@dual_voice_bp.route('/session/<session_id>/end', methods=['POST'])
@login_required  
def end_dual_voice_session(session_id):
    """End a dual voice agent session and get feedback"""
    try:
        # End the session and get feedback
        dual_voice_service = get_dual_voice_service()
        result = dual_voice_service.end_session(session_id)
        
        if not result.get('success'):
            logger.error(f"Failed to end dual voice session {session_id}: {result.get('error')}")
            return jsonify(result), 500
        
        logger.info(f"Ended dual voice session {session_id} for user {current_user.id}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error ending dual voice session {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to end dual voice session'
        }), 500

@dual_voice_bp.route('/generate-persona', methods=['POST'])
@login_required
def generate_voice_persona():
    """Generate a buyer persona based on voice conversation data using enhanced GPT-4o service"""
    import time
    start_time = time.time()
    
    try:
        logger.info("🚀 Starting persona generation request...")
        data = request.get_json() or {}
        logger.info(f"📋 Request data: {data}")
        
        # Extract product/service and target market from voice conversation
        product_service = data.get('product_service', '').strip()
        target_market = data.get('target_market', '').strip()
        
        if not product_service:
            logger.warning("❌ Missing product_service in request")
            return jsonify({
                'success': False,
                'error': 'Product or service description is required'
            }), 400
        
        if not target_market:
            logger.warning("❌ Missing target_market in request")
            return jsonify({
                'success': False,
                'error': 'Target market description is required'
            }), 400
        
        logger.info(f"✅ Generating enhanced persona for product: '{product_service}', target: '{target_market}'")
        
        # Use our comprehensive bias prevention system first
        from app.services.comprehensive_bias_prevention import ComprehensiveBiasPrevention
        
        try:
            # Generate bias-free persona with contextual fears
            logger.info("🔧 Using comprehensive bias prevention system...")
            framework = ComprehensiveBiasPrevention.generate_bias_free_persona_framework(
                industry_context=None,
                target_market=target_market,
                complexity_level="intermediate",
                product_service=product_service  # This triggers contextual fear generation
            )
            
            # Transform framework to enhanced persona format
            enhanced_persona = {
                'name': framework['name'],
                'role': framework['role'],
                'primary_concern': framework.get('contextual_fears', {}).get('authentic_objections', ['Looking for effective business solutions'])[0] if framework.get('contextual_fears') else 'Looking for effective business solutions',
                'business_details': f"{framework['role']} at a {framework['industry']} organization, {framework['age_range']} years old, with {framework['decision_authority'].lower()} decision authority",
                'about_person': f"A {framework['cultural_background']} professional with {', '.join(framework['personality_traits'][:2]).lower()} personality traits",
                'business_context': framework['business_context'],
                'emotional_state': f"Professional with {framework['communication_style']['emotional_expression'].lower()} emotional expression",
                'pain_points': [fear['core_concern'] for fear in framework.get('contextual_fears', {}).get('contextual_fears', [])] or ['Efficiency challenges', 'Decision-making pressure'],
                'decision_authority': framework['decision_authority'],
                'personality_traits': {trait: 0.7 for trait in framework['personality_traits']},  # Convert to numeric format
                'objections': framework.get('contextual_fears', {}).get('authentic_objections', ['Budget constraints', 'Implementation concerns']),
                'industry_context': framework['industry'],
                
                # Enhanced voice-specific fields for realistic conversation
                'speech_patterns': {
                    'pace': framework['communication_style']['chattiness_level'],
                    'interruption_style': 'polite' if framework['communication_style']['formality_level'] == 'formal' else 'casual',
                    'filler_words': ['um', 'uh'] if framework['communication_style']['emotional_expression'] == 'hesitant' else [],
                    'regional_expressions': []
                },
                'conversation_dynamics': {
                    'comfort_with_silence': framework['communication_style']['emotional_expression'],
                    'question_asking_tendency': 'high' if 'Thoughtful' in framework['personality_traits'] else 'medium',
                    'story_sharing_level': framework['communication_style']['chattiness_level'],
                    'technical_comfort': 'high' if framework['role_level'] in ['executive', 'management'] else 'medium'
                },
                'emotional_responsiveness': {
                    'excitement_triggers': ['innovation', 'results'],
                    'frustration_triggers': ['complexity', 'delays'],
                    'trust_building_factors': ['expertise', 'transparency'],
                    'skepticism_reducers': ['proof', 'references']
                },
                'persuasion_psychology': {
                    'responds_to_authority': True,
                    'influenced_by_social_proof': True,
                    'motivated_by_urgency': False,
                    'values_relationship_over_features': True
                },
                
                # Include the advanced contextual fear data
                'contextual_fears': framework.get('contextual_fears', {}),
                'conversation_flow_guidance': framework.get('conversation_flow_guidance', ''),
                
                # Include human authenticity data
                'emotional_authenticity': framework.get('emotional_authenticity', {}),
                'communication_struggles': framework.get('communication_struggles', {}),
                'vulnerability_areas': framework.get('vulnerability_areas', {}),
                
                # Include cultural and demographic diversity
                'cultural_background': framework['cultural_background'],
                'gender': framework['gender'],
                'age_range': framework['age_range'],
                'communication_style': framework['communication_style']
            }
            
            # Calculate generation time
            generation_time = time.time() - start_time
            logger.info(f"✅ Successfully generated comprehensive persona: {enhanced_persona['name']} ({framework['cultural_background']}, {framework['gender']}) (took {generation_time:.2f}s)")
            
            return jsonify({
                'success': True,
                'persona': enhanced_persona,
                'context': context,
                'generation_time': generation_time,
                'diversity_info': {
                    'cultural_background': framework['cultural_background'],
                    'gender': framework['gender'],
                    'age_range': framework['age_range'],
                    'role_level': framework['role_level']
                },
                'note': 'Generated using comprehensive bias prevention system with contextual fears'
            })
            
        except Exception as bias_error:
            logger.error(f"❌ Comprehensive bias prevention failed: {str(bias_error)}")
            logger.info("🔄 Falling back to GPT-4o generation...")
            
        # Fallback to GPT-4o if comprehensive system fails
        # Create context for persona generation
        context = {
            "product_service": product_service,
            "target_market": target_market,
            "industry": "Various industries",  # Could be enhanced with industry detection
            "experience_level": "Intermediate"
        }
        
        # Use the enhanced GPT-4o service for persona generation
        logger.info("🔧 Importing GPT-4o service...")
        from app.services.gpt4o_service import get_gpt4o_service
        
        logger.info("🔧 Getting GPT-4o service instance...")
        gpt4o_service = get_gpt4o_service()
        
        logger.info("🎭 Calling GPT-4o service to generate persona...")
        # Generate persona using enhanced service (with all new voice-specific fields)
        persona_json_str = gpt4o_service.generate_customer_persona(context)
        
        logger.info(f"📋 GPT-4o service returned: {len(persona_json_str) if persona_json_str else 0} characters")
        
        if not persona_json_str:
            logger.error("❌ GPT-4o service returned empty result")
            return jsonify({
                'success': False,
                'error': 'Unable to generate persona - empty response from AI service'
            }), 500
        
        try:
            import json
            persona_data = json.loads(persona_json_str)
            logger.info(f"✅ Successfully parsed persona JSON: {persona_data.get('name', 'Unknown')}")
            
            # Enhanced persona processing with voice-specific fields
            enhanced_persona = {
                'name': persona_data.get('name', 'Alex Johnson'),
                'role': persona_data.get('role', 'Business Professional'),
                'primary_concern': persona_data.get('surface_concern') or persona_data.get('primary_concern', 'Looking for business solutions'),
                'business_details': persona_data.get('surface_business_info') or persona_data.get('business_description') or f"A {persona_data.get('business_context', 'B2B')} organization in the {persona_data.get('industry_context', 'business')} sector",
                'about_person': persona_data.get('surface_pain_points') or persona_data.get('description_narrative', 'A professional looking for solutions'),
                'business_context': persona_data.get('business_context', 'B2B'),
                'emotional_state': persona_data.get('emotional_state', 'Professional and focused'),
                'pain_points': persona_data.get('pain_points', ['Efficiency challenges', 'Cost concerns']),
                'decision_authority': persona_data.get('decision_authority', 'Influencer'),
                'personality_traits': persona_data.get('personality_traits', {}),
                'objections': persona_data.get('objections', ['Budget constraints', 'Time concerns']),
                'industry_context': persona_data.get('industry_context', 'Business'),
                
                # Enhanced voice-specific fields for realistic conversation
                'speech_patterns': persona_data.get('speech_patterns', {
                    'pace': 'moderate',
                    'interruption_style': 'polite',
                    'filler_words': ['um', 'uh'],
                    'regional_expressions': []
                }),
                'conversation_dynamics': persona_data.get('conversation_dynamics', {
                    'comfort_with_silence': 'moderate',
                    'question_asking_tendency': 'high',
                    'story_sharing_level': 'medium',
                    'technical_comfort': 'medium'
                }),
                'emotional_responsiveness': persona_data.get('emotional_responsiveness', {
                    'excitement_triggers': ['innovation', 'results'],
                    'frustration_triggers': ['complexity', 'delays'],
                    'trust_building_factors': ['expertise', 'transparency'],
                    'skepticism_reducers': ['proof', 'references']
                }),
                'persuasion_psychology': persona_data.get('persuasion_psychology', {
                    'responds_to_authority': True,
                    'influenced_by_social_proof': True,
                    'motivated_by_urgency': False,
                    'values_relationship_over_features': True
                })
            }
            
            # Calculate generation time
            generation_time = time.time() - start_time
            logger.info(f"✅ Successfully generated enhanced persona: {enhanced_persona['name']} for {product_service} (took {generation_time:.2f}s)")
            
            return jsonify({
                'success': True,
                'persona': enhanced_persona,
                'context': context,
                'generation_time': generation_time
            })
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse persona JSON: {str(e)}")
            logger.error(f"Raw response: {persona_json_str[:500]}...")
            
            # Create fallback persona
            fallback_persona = {
                'name': 'Alex Johnson',
                'role': 'Business Professional',
                'primary_concern': 'Looking for business solutions',
                'business_details': f"A professional in the {target_market} sector",
                'about_person': f"Interested in {product_service}",
                'business_context': 'B2B',
                'emotional_state': 'Professional and focused',
                'pain_points': ['Efficiency challenges', 'Cost concerns'],
                'decision_authority': 'Influencer',
                'personality_traits': {},
                'objections': ['Budget constraints', 'Time concerns'],
                'industry_context': 'Business'
            }
            
            return jsonify({
                'success': True,
                'persona': fallback_persona,
                'context': context,
                'note': 'Using fallback persona due to parsing error'
            })
            
    except Exception as e:
        logger.error(f"❌ Error generating persona: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Failed to generate persona: {str(e)}'
        }), 500

@dual_voice_bp.route('/scenarios', methods=['GET'])
@login_required
def get_training_scenarios():
    """Get available training scenarios"""
    try:
        scenarios = [
            {
                "id": "cold_call",
                "name": "Cold Call",
                "description": "Practice making initial contact with prospects who aren't expecting your call",
                "duration": "10-15 minutes",
                "difficulty": "Intermediate",
                "focus_areas": ["Rapport building", "Permission-based selling", "Pain discovery"]
            },
            {
                "id": "demo",
                "name": "Product Demo",
                "description": "Demonstrate your solution while keeping the prospect engaged",
                "duration": "15-20 minutes", 
                "difficulty": "Advanced",
                "focus_areas": ["Discovery first", "Tailored presentation", "Handling technical questions"]
            },
            {
                "id": "objection_handling",
                "name": "Objection Handling",
                "description": "Navigate through common and complex objections",
                "duration": "10-15 minutes",
                "difficulty": "Advanced", 
                "focus_areas": ["Understanding root concerns", "Feel-felt-found method", "Proof points"]
            },
            {
                "id": "closing",
                "name": "Closing Techniques",
                "description": "Practice various closing approaches and handle final concerns",
                "duration": "10-12 minutes",
                "difficulty": "Advanced",
                "focus_areas": ["Assumptive close", "Alternative choice", "Urgency creation"]
            },
            {
                "id": "discovery",
                "name": "Discovery Call",
                "description": "Master the art of asking the right questions",
                "duration": "15-20 minutes",
                "difficulty": "Beginner",
                "focus_areas": ["Open-ended questions", "Active listening", "Pain identification"]
            },
            {
                "id": "follow_up",
                "name": "Follow-up Call",
                "description": "Re-engage prospects and advance the sales process",
                "duration": "8-12 minutes",
                "difficulty": "Intermediate",
                "focus_areas": ["Referencing previous conversations", "Value reinforcement", "Next steps"]
            }
        ]
        
        return jsonify({
            'success': True,
            'scenarios': scenarios
        })
        
    except Exception as e:
        logger.error(f"Error getting training scenarios: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dual_voice_bp.route('/session/<session_id>/status', methods=['GET'])
@login_required
def get_session_status(session_id):
    """Get status and details of an active session"""
    try:
        dual_voice_service = get_dual_voice_service()
        
        if session_id not in dual_voice_service.active_sessions:
            return jsonify({
                'success': False,
                'error': 'Session not found or has ended'
            }), 404
        
        session_data = dual_voice_service.active_sessions[session_id]
        
        # Return session status without sensitive data
        return jsonify({
            'success': True,
            'session_id': session_id,
            'status': session_data.get('status'),
            'scenario_type': session_data.get('scenario_type'),
            'start_time': session_data.get('start_time').isoformat() if session_data.get('start_time') else None,
            'conversation_turns': len(session_data.get('conversation_log', [])),
            'buyer_persona': {
                'name': session_data['buyer_persona'].name if session_data.get('buyer_persona') else None,
                'role': session_data['buyer_persona'].role if session_data.get('buyer_persona') else None,
                'primary_concern': session_data['buyer_persona'].primary_concern if session_data.get('buyer_persona') else None
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting session status for {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get session status'
        }), 500

@dual_voice_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for dual voice agent service"""
    return jsonify({
        'success': True,
        'service': 'dual_voice_agent',
        'status': 'healthy',
        'active_sessions': len(get_dual_voice_service().active_sessions)
    })

@dual_voice_bp.route('/test-persona', methods=['POST'])
@login_required
def test_persona_generation():
    """Quick test endpoint for persona generation"""
    try:
        logger.info("🧪 Testing persona generation...")
        
        # Use hardcoded test data
        context = {
            "product_service": "CRM Software",
            "target_market": "Small businesses",
            "industry": "Technology",
            "experience_level": "Intermediate"
        }
        
        from app.services.gpt4o_service import get_gpt4o_service
        gpt4o_service = get_gpt4o_service()
        
        # Quick test
        persona_json_str = gpt4o_service.generate_customer_persona(context)
        
        if persona_json_str:
            import json
            persona_data = json.loads(persona_json_str)
            return jsonify({
                'success': True,
                'test_result': 'Persona generation working',
                'persona_name': persona_data.get('name', 'Unknown'),
                'character_count': len(persona_json_str)
            })
        else:
            return jsonify({
                'success': False,
                'test_result': 'Persona generation failed - empty result'
            })
            
    except Exception as e:
        logger.error(f"❌ Test persona generation failed: {str(e)}")
        return jsonify({
            'success': False,
            'test_result': f'Error: {str(e)}'
        }), 500

@dual_voice_bp.route('/session/<session_id>/pause', methods=['POST'])
@login_required
def pause_session(session_id):
    """Pause a training session for learning moment"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'learning_moment')
        
        dual_voice_service = get_dual_voice_service()
        result = dual_voice_service.pause_session(session_id, reason)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error pausing session {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dual_voice_bp.route('/session/<session_id>/resume', methods=['POST'])
@login_required
def resume_session(session_id):
    """Resume a paused training session"""
    try:
        dual_voice_service = get_dual_voice_service()
        result = dual_voice_service.resume_session(session_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error resuming session {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dual_voice_bp.route('/session/<session_id>/coaching-only', methods=['POST'])
@login_required
def activate_coaching_only_mode(session_id):
    """Activate coaching-only mode (disable buyer persona)"""
    try:
        dual_voice_service = get_dual_voice_service()
        result = dual_voice_service.activate_coaching_only_mode(session_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error activating coaching-only mode for {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dual_voice_bp.route('/session/<session_id>/timeout', methods=['POST'])
@login_required
def request_timeout(session_id):
    """Request a timeout for deeper coaching discussion"""
    try:
        data = request.get_json()
        context = data.get('context', 'Learning timeout requested')
        
        dual_voice_service = get_dual_voice_service()
        result = dual_voice_service.request_timeout(session_id, context)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error requesting timeout for {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dual_voice_bp.route('/ask-follow-up', methods=['POST'])
@login_required
def ask_follow_up_question():
    """Ask a follow-up question when persona generation lacks information"""
    try:
        data = request.get_json() or {}
        missing_info = data.get('missing_info', [])  # ['product_service', 'target_market']
        current_data = data.get('current_data', {})
        
        logger.info(f"🔄 Follow-up question requested for missing: {missing_info}")
        
        # Generate appropriate follow-up question based on what's missing
        if 'product_service' in missing_info and 'target_market' in missing_info:
            question = "I need a bit more information to create your ideal customer persona. Could you tell me: What is your primary product or service, and who is your target market?"
        elif 'product_service' in missing_info:
            question = "I have your target market information, but I need to know more about your product or service. What exactly do you sell or offer?"
        elif 'target_market' in missing_info:
            question = "I have your product information, but I need to understand your target market better. Who are your ideal customers or clients?"
        else:
            question = "Could you provide more specific details about your business so I can create a better persona for you?"
        
        return jsonify({
            'success': True,
            'follow_up_question': question,
            'missing_info': missing_info
        })
        
    except Exception as e:
        logger.error(f"Error generating follow-up question: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dual_voice_bp.route('/session/<session_id>/save-snippet', methods=['POST'])
@login_required
def save_recording_snippet(session_id):
    """Save a recording snippet for later coaching review"""
    try:
        data = request.get_json()
        
        dual_voice_service = get_dual_voice_service()
        result = dual_voice_service.save_recording_snippet(session_id, data)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error saving recording snippet for {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dual_voice_bp.route('/session/<session_id>/end', methods=['POST'])
@login_required
def end_training_session(session_id):
    """End a dual voice agent training session"""
    try:
        dual_voice_service = get_dual_voice_service()
        result = dual_voice_service.end_session(session_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error ending training session {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dual_voice_bp.route('/working-implementation', methods=['GET'])
@login_required
def get_working_implementation():
    """Serve the working dual voice agent implementation page"""
    try:
        logger.info(f"User {current_user.id} accessing working dual voice agent implementation")
        
        return jsonify({
            'success': True,
            'message': 'Working implementation available',
            'implementation_details': {
                'description': 'This is your working dual voice agent implementation',
                'features': [
                    'Deepgram Voice Agent integration',
                    'Real-time voice-to-voice conversations',
                    'Buyer persona generation',
                    'Sales coaching feedback'
                ],
                'components': {
                    'frontend': 'DeepgramVoiceAgentCard_WORKING.tsx',
                    'backend': 'deepgram_routes_WORKING.py',
                    'worklet': 'deepgram-worklet_WORKING.js'
                },
                'status': 'active'
            }
        })
        
    except Exception as e:
        logger.error(f"Error accessing working implementation: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to access working implementation'
        }), 500

@dual_voice_bp.route('/demo-working-implementation', methods=['GET'])
def demo_working_implementation():
    """Demo page for the working dual voice agent implementation (no auth required for demo)"""
    return render_template('working_implementation.html')
    
@dual_voice_bp.route('/name-gender-detection', methods=['POST'])
def detect_gender_from_name():
    """Detect gender from name using unbiased demographic name service
    
    This endpoint uses the existing unbiased name-to-gender infrastructure to
    provide gender detection for the frontend, especially for voice selection.
    """
    try:
        data = request.get_json() or {}
        
        # Get name from request
        full_name = data.get('name', '').strip()
        
        if not full_name:
            return jsonify({
                'success': False,
                'error': 'Name is required'
            }), 400
        
        # Parse first and last name (simple split)
        name_parts = full_name.split(' ')
        first_name = name_parts[0] if len(name_parts) > 0 else full_name
        
        # Use unbiased demographic name service to detect gender
        # First check if the first name exists in our database
        gender = None
        
        # Check across different cultural backgrounds
        for culture in DemographicNameService.NAME_POOLS:
            # Check female names
            if first_name in DemographicNameService.NAME_POOLS[culture]['female']['first']:
                gender = 'female'
                break
                
            # Check male names
            if first_name in DemographicNameService.NAME_POOLS[culture]['male']['first']:
                gender = 'male'
                break
                
        # If gender not found in database, use comprehensive bias prevention system
        if not gender:
            # Use equal probability as a fallback (unbiased approach)
            gender = ComprehensiveBiasPrevention._weighted_random_choice({
                'male': {'weight': 0.5},
                'female': {'weight': 0.5}
            })
            
        logger.info(f"✅ Detected gender for name '{full_name}': {gender}")
        
        return jsonify({
            'success': True,
            'name': full_name,
            'gender': gender
        })
        
    except Exception as e:
        logger.error(f"Error detecting gender from name: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to detect gender from name'
        }), 500

@dual_voice_bp.route('/working-page', methods=['GET'])
@login_required
def serve_working_implementation_page():
    """Serve an HTML page with the working dual voice agent implementation"""
    from flask import render_template
    
    try:
        logger.info(f"User {current_user.id} accessing working dual voice agent page")
        return render_template('dual_voice_working.html')
        
    except Exception as e:
        logger.error(f"Error serving working implementation page: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to serve working implementation page'
        }), 500 