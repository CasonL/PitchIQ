from flask import Blueprint, request, jsonify, current_app
import logging
import random
import json
import traceback
import time

logger = logging.getLogger(__name__)

sam_conversation_bp = Blueprint('sam_conversation', __name__)

@sam_conversation_bp.route('/test-openai', methods=['GET'])
def test_openai():
    """Test route to check if OpenAI service is working"""
    try:
        # Get the OpenAI service from the API manager
        api_manager = current_app.api_manager
        openai_service = api_manager.openai_service
        
        logger.info(f"OpenAI service initialized: {openai_service.initialized}")
        
        if not openai_service.initialized:
            return jsonify({
                'status': 'error',
                'message': 'OpenAI service not initialized'
            }), 500
        
        # Try a simple completion with gpt-4o-mini explicitly
        result = openai_service.generate_response(
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10,
            temperature=0.1,
            model="gpt-4o-mini"
        )
        
        return jsonify({
            'status': 'success',
            'initialized': openai_service.initialized,
            'result': result,
            'model': openai_service.model
        })
        
    except Exception as e:
        logger.error(f"OpenAI test failed: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@sam_conversation_bp.route('/analyze-sam-conversation', methods=['POST'])
def analyze_sam_conversation():
    """
    Analyze Sam's conversation to determine if data collection is complete
    and extract product/service and target market information.
    
    Expected JSON payload:
    {
        "conversation": ["message1", "message2", ...]
    }
    
    Returns:
    {
        "is_complete": bool,
        "product_service": str or null,
        "target_market": str or null,
        "ready_for_completion": bool,
        "confidence": float,
        "reasoning": str
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        conversation = data.get('conversation', [])
        
        if not conversation:
            return jsonify({'error': 'No conversation provided'}), 400
        
        logger.debug(f"Analyzing conversation with {len(conversation)} messages")
        
        # Import the service here to avoid circular imports
        from app.services.sam_conversation_service import get_sam_conversation_service
        
        # Use the Sam conversation service to analyze the conversation
        service = get_sam_conversation_service()
        analysis_result = service.analyze_conversation(conversation)
        
        # Return only the necessary fields to the frontend
        return jsonify({
            "is_complete": analysis_result["is_complete"],
            "product_service": analysis_result["product_service"],
            "target_market": analysis_result["target_market"],
            "ready_for_completion": analysis_result["ready_for_completion"],
            "confidence": analysis_result["confidence"],
            "reasoning": analysis_result["reasoning"]
        })
        
    except Exception as e:
        logger.error(f"Error analyzing conversation: {e}")
        return jsonify({
            "is_complete": False,
            "product_service": None,
            "target_market": None,
            "ready_for_completion": False,
            "confidence": 0.0,
            "reasoning": f"Analysis error: {str(e)}"
        }), 500

@sam_conversation_bp.route('/demo/phase-update', methods=['POST'])
def demo_phase_update():
    """Update conversation phase for the public demo flow (no auth). Mirrors /voice/api/phase-update logic."""
    try:
        data = request.get_json() or {}
        conversation_id = data.get('conversation_id')
        utterance = data.get('utterance', '')
        persona = data.get('persona', 'Prospect')
        sales_info = data.get('sales_info', {})
        user_name = data.get('user_name', 'Seller')

        if not conversation_id:
            return jsonify({'error': 'conversation_id required'}), 400

        # Lazy import to avoid circular deps if any
        from app.services.gpt4o_service import get_gpt4o_service
        from app.services.conversation_state_manager import ConversationStateManager, ConversationPhase

        gpt_service = get_gpt4o_service()
        if not gpt_service:
            return jsonify({'error': 'AI service unavailable'}), 500

        if conversation_id not in gpt_service.phase_managers:
            gpt_service.phase_managers[conversation_id] = ConversationStateManager()
        phase_manager = gpt_service.phase_managers[conversation_id]

        phase_changed = phase_manager.update_phase(utterance)
        current_phase = phase_manager.current_state.get('likely_phase', ConversationPhase.RAPPORT)

        # Persona cache on service
        if not hasattr(gpt_service, 'personas'):
            gpt_service.personas = {}

        if conversation_id not in gpt_service.personas:
            try:
                provided_persona = None
                if isinstance(persona, dict):
                    provided_persona = persona
                elif isinstance(persona, str) and persona.strip() and persona.strip().upper() != 'AUTO':
                    provided_persona = {"name": persona.strip(), "role": "Prospect"}

                if not provided_persona:
                    try:
                        sales_info_context = {
                            "product_service": sales_info.get("product_service", "sales solution"),
                            "industry": sales_info.get("industry", "Software"),
                            "sales_experience": sales_info.get("sales_experience", "experienced"),
                        }
                        persona_json_str = gpt_service.generate_customer_persona(sales_info_context)
                        try:
                            provided_persona = json.loads(persona_json_str)
                        except Exception:
                            provided_persona = {"name": "Prospect", "role": "Prospective Customer", "description": persona_json_str}
                    except Exception as e:
                        provided_persona = {"name": "Prospect", "role": "Prospective Customer"}

                if not provided_persona and isinstance(persona, str) and persona.strip():
                    provided_persona = {"name": persona.strip(), "role": "Prospect"}
                if not provided_persona:
                    provided_persona = {"name": "Prospect", "role": "Prospective Customer"}
                gpt_service.personas[conversation_id] = provided_persona
            except Exception:
                gpt_service.personas[conversation_id] = {"name": "Prospect"}
        persona_dict = gpt_service.personas[conversation_id]

        user_info = {"salesperson_name": user_name}
        # ---- Persistence ----
        from app.models import TrainingSession, db
        # find or create session row by conversation_id (store in conversation_json field as fallback)
        session_row = TrainingSession.query.filter(TrainingSession.conversation_json.contains(conversation_id)).first()
        if not session_row:
            session_row = TrainingSession()
            session_row.conversation_json = json.dumps([])
            db.session.add(session_row)
        # Append current turn to session transcript
        try:
            convo_list = json.loads(session_row.conversation_json or '[]')
        except Exception:
            convo_list = []
        if utterance:
            convo_list.append({"role": "user", "content": utterance})
        session_row.conversation_json = json.dumps(convo_list)
        db.session.commit()

        # ---- Time-based guidance ----
        from datetime import datetime, timedelta
        if not session_row.start_time:
            session_row.start_time = datetime.utcnow()
        elapsed_sec = (datetime.utcnow() - session_row.start_time).total_seconds()
        timed_instruction = None
        # small tolerance 5s
        if elapsed_sec >= 60 and elapsed_sec < 70 and not getattr(session_row, '_asked_reason', False):
            timed_instruction = "At this point you have been speaking for one minute. Politely ask the user why they took the call and what they hope to achieve today before continuing."
            session_row._asked_reason = True
        elif elapsed_sec >= 180 and elapsed_sec < 190 and not getattr(session_row, '_first_objection', False):
            timed_instruction = "You are past three minutes. The discovery phase has concluded; raise your first, realistic objection to test the seller's handling."
            session_row._first_objection = True
        elif elapsed_sec >= 480 and elapsed_sec < 490 and not getattr(session_row, '_final_decision', False):
            timed_instruction = "Eight minutes have passed and the seller has not sufficiently met your needs. Politely signal that you have to make a decision soon and lean toward a no unless convinced quickly."
            session_row._final_decision = True
        db.session.commit()
        # ---- Feedback if closing phase reached ----
        feedback_text = None
        if current_phase == ConversationPhase.CLOSING and phase_changed:
            try:
                from app.services.openai_service import openai_service
                feedback_text = openai_service.generate_feedback(convo_list, {"name": user_name})
                session_row.feedback_json = json.dumps({"text": feedback_text})
                session_row.completed = True
                db.session.commit()
            except Exception as e:
                logging.getLogger(__name__).error(f"Feedback generation failed: {e}")

        prompt = gpt_service._create_roleplay_system_prompt(
            persona_dict,
            user_info,
            phase_manager.current_state
        )

        return jsonify({
            'conversation_id': conversation_id,
            'phase': current_phase.value if hasattr(current_phase, 'value') else str(current_phase),
            'phase_changed': phase_changed,
            'prompt': prompt,
            'timed_instruction': timed_instruction,
            'feedback': feedback_text
        })
    except Exception as e:
        logging.getLogger(__name__).error(f"demo_phase_update error: {e}")
        return jsonify({'error': 'internal server error'}), 500


@sam_conversation_bp.route('/demo/generate-persona', methods=['POST'])
def generate_demo_persona():
    """
    Generate a buyer persona for demo purposes (no authentication required)
    """
    try:
        data = request.get_json() or {}
        logger.debug(f"Demo persona generation request: {data}")
        
        # Extract product/service and target market
        product_service = data.get('product_service', '').strip()
        target_market = data.get('target_market', '').strip()
        
        if not product_service:
            logger.warning("Missing product_service in demo request")
            return jsonify({
                'success': False,
                'error': 'Product or service description is required'
            }), 400
        
        if not target_market:
            logger.warning("Missing target_market in demo request")
            return jsonify({
                'success': False,
                'error': 'Target market description is required'
            }), 400
        
        logger.debug(f"Generating demo persona for product: '{product_service}', target: '{target_market}'")

        # Try advanced GPT persona generation first with detailed logging
        logger.info("🚀 Starting sophisticated GPT-4o persona generation...")
        try:
            from app.services.gpt4o_service import get_gpt4o_service
            from app.services.comprehensive_bias_prevention import ComprehensiveBiasPrevention
            
            # Create bias prevention instance
            bias_prevention = ComprehensiveBiasPrevention()
            
            # Force gender alternation based on timestamp to ensure variety
            current_time = int(time.time())
            forced_gender = "male" if current_time % 2 == 0 else "female"
            logger.info(f"🎯 Forcing persona gender to be {forced_gender} for this generation")
            
            # Get GPT service with validation
            gpt_service = get_gpt4o_service()
            if not gpt_service:
                logger.error("❌ GPT-4o service is None - service initialization failed")
                raise Exception("GPT-4o service initialization failed")
            
            logger.info("✅ GPT-4o service initialized successfully")
            
            # Prepare ADVANCED sales info with detailed context for sophisticated generation
            sales_info = {
                "product_service": product_service,
                "target_market": target_market,
                "forced_gender": forced_gender,
                "industry": "Various industries",  # Could be enhanced with industry detection
                "sales_experience": "intermediate",  # Default for demo
                "generation_type": "demo_advanced"  # Flag for advanced generation
            }
            logger.info(f"📝 Advanced sales info prepared: {sales_info}")
            
            # Call ADVANCED GPT persona generation with timing
            start_time = time.time()
            logger.info("🚀 Calling ADVANCED GPT-4o generate_customer_persona with behavioral shell support...")
            
            # Use the advanced method with optional behavioral shell
            # For demo, we'll use None for behavioral_shell_data to get full generation
            persona_json = gpt_service.generate_customer_persona(
                user_profile_context=sales_info,
                behavioral_shell_data=None  # Full generation, not shell-based
            )
            
            generation_time = time.time() - start_time
            logger.info(f"⏱️ GPT-4o generation completed in {generation_time:.2f} seconds")
            logger.info(f"📦 Raw GPT response length: {len(persona_json) if persona_json else 0} characters")
            
            if not persona_json:
                logger.error("❌ GPT-4o returned empty response")
                raise Exception("Empty response from GPT-4o service")
            
            # Parse JSON response with detailed error handling
            try:
                logger.info("🔍 Parsing GPT-4o JSON response...")
                persona_data = json.loads(persona_json)
                logger.info(f"✅ JSON parsed successfully. Keys: {list(persona_data.keys())}")
                
                # Validate ADVANCED required fields for sophisticated personas
                basic_fields = ['name', 'role', 'personality_traits', 'pain_points', 'communication_style']
                advanced_fields = ['speech_patterns', 'conversation_dynamics', 'emotional_responsiveness', 'deep_pain_points', 'surface_business_info']
                
                missing_basic = [field for field in basic_fields if field not in persona_data]
                missing_advanced = [field for field in advanced_fields if field not in persona_data]
                
                if missing_basic:
                    logger.warning(f"⚠️ Missing basic required fields: {missing_basic}")
                if missing_advanced:
                    logger.info(f"📊 Missing advanced fields (acceptable): {missing_advanced}")
                
                # Log the sophistication level of the generated persona
                sophistication_score = len([f for f in advanced_fields if f in persona_data])
                logger.info(f"🎆 Persona sophistication score: {sophistication_score}/{len(advanced_fields)} advanced fields present")
                
                # Log sample of advanced features if present
                if 'speech_patterns' in persona_data:
                    logger.info(f"🗣️ Speech patterns: {persona_data['speech_patterns']}")
                if 'emotional_responsiveness' in persona_data:
                    logger.info(f"😊 Emotional triggers: {list(persona_data['emotional_responsiveness'].keys())}")
                if 'deep_pain_points' in persona_data:
                    logger.info(f"🔍 Deep insights: {len(persona_data['deep_pain_points'])} hidden pain points")
                
                # Ensure the gender is explicitly set
                if "gender" not in persona_data or not persona_data["gender"]:
                    persona_data["gender"] = forced_gender
                    logger.info(f"🔧 Added missing gender: {forced_gender}")
                    
                # Validate name matches gender
                if forced_gender == "male" and bias_prevention.is_female_name(persona_data.get("name", "")):
                    persona_data["name"] = bias_prevention.get_random_name(gender="male")
                    logger.info(f"🔧 Corrected name for male gender: {persona_data['name']}")
                elif forced_gender == "female" and bias_prevention.is_male_name(persona_data.get("name", "")):
                    persona_data["name"] = bias_prevention.get_random_name(gender="female")
                    logger.info(f"🔧 Corrected name for female gender: {persona_data['name']}")
                
                logger.info("🎉 Sophisticated GPT-4o persona generation successful!")
                return jsonify({"success": True, "persona": persona_data, "generation_method": "gpt4o_advanced"})
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON parsing failed: {e}")
                logger.error(f"📄 Raw response: {persona_json[:500]}...")
                # Treat raw string as description fallback
                persona_data = {
                    "name": bias_prevention.get_random_name(gender=forced_gender),
                    "role": "Decision Maker",
                    "gender": forced_gender,
                    "description": persona_json,
                    "communication_style": "Professional and direct",
                    "personality_traits": ["Thoughtful", "Practical"],
                    "pain_points": ["Time constraints", "Budget limitations"]
                }
                logger.info("🔧 Created fallback persona from raw GPT response")
                return jsonify({"success": True, "persona": persona_data, "generation_method": "gpt4o_fallback"})
                
        except Exception as e:
            logger.error(f"❌ Advanced GPT persona generation failed completely. Error: {e}")
            logger.error(f"📊 Error traceback: {traceback.format_exc()}")
        
        # Use our comprehensive bias prevention system
        from app.services.comprehensive_bias_prevention import ComprehensiveBiasPrevention
        
        try:
            # CRITICAL: Detect if this is B2C consumer business vs B2B enterprise business
            product_lower = product_service.lower()
            target_lower = target_market.lower()
            
            # B2C Consumer indicators
            is_consumer_business = any([
                # Product indicators
                any(term in product_lower for term in [
                    'lemonade', 'food', 'drink', 'beverage', 'coffee', 'snack', 'meal',
                    'clothing', 'shoes', 'jewelry', 'gift', 'toy', 'book', 'music',
                    'art', 'craft', 'home goods', 'personal care', 'beauty', 'fitness'
                ]),
                # Target market indicators  
                any(term in target_lower for term in [
                    'people', 'individuals', 'consumers', 'customers', 'thirsty people',
                    'parents', 'kids', 'children', 'families', 'tourists', 'visitors',
                    'pedestrians', 'walkers', 'joggers', 'neighbors', 'locals',
                    'anyone', 'everyone', 'general public', 'passersby', 'on the street'
                ]),
                # Business model indicators
                any(term in target_lower for term in [
                    'stand', 'booth', 'cart', 'shop', 'store front', 'retail',
                    'direct to consumer', 'walk-by', 'foot traffic'
                ])
            ])
            
            if is_consumer_business:
                logger.info(f"Detected B2C consumer business - generating individual consumer persona")
                
                # Generate a consumer persona instead of business professional
                from app.services.demographic_names import DemographicNameService
                
                # Get diverse name
                cultures = ["european_american", "hispanic_latino", "african_american", "asian_american"]
                genders = ["male", "female"]
                selected_culture = random.choice(cultures)
                selected_gender = random.choice(genders)
                
                first_name, last_name = DemographicNameService.get_name_by_demographics(selected_culture, selected_gender)
                full_name = f"{first_name} {last_name}"
                
                # Generate age-appropriate consumer persona
                age_groups = [
                    {"range": "22-28", "desc": "Young adult", "traits": ["tech-savvy", "social", "budget-conscious"]},
                    {"range": "29-35", "desc": "Young professional", "traits": ["busy", "health-conscious", "convenience-focused"]},
                    {"range": "36-45", "desc": "Established adult", "traits": ["family-oriented", "quality-focused", "time-pressed"]},
                    {"range": "46-55", "desc": "Experienced adult", "traits": ["discerning", "value-conscious", "routine-oriented"]},
                    {"range": "25-40", "desc": "Active adult", "traits": ["fitness-minded", "social", "experience-seeking"]}
                ]
                selected_age = random.choice(age_groups)
                
                # Generate consumer-appropriate concerns and objections
                consumer_concerns = [
                    f"Is this {product_service.lower()} worth the price?",
                    f"How do I know this {product_service.lower()} is good quality?",
                    f"I'm not sure if I really need {product_service.lower()} right now",
                    f"I want to make sure I'm getting good value for my money",
                    f"I'm comparing different options for {product_service.lower()}"
                ]
                
                consumer_objections = [
                    "Price concerns - is it worth it?",
                    "Quality questions - how good is it really?",
                    "Timing - do I need this now?",
                    "Alternatives - what other options do I have?",
                    "Value - am I getting a good deal?"
                ]
                
                # Generate lifestyle/situation context
                lifestyle_contexts = [
                    "Out for a walk in the neighborhood",
                    "Taking a break from work/errands", 
                    "Exercising or being active outdoors",
                    "Spending time with family/friends",
                    "Running errands in the area",
                    "Enjoying leisure time outdoors",
                    "Commuting or traveling through the area"
                ]
                
                persona_data = {
                    'name': full_name,
                    'role': f"{selected_age['desc']} - {random.choice(lifestyle_contexts)}",
                    'company': "N/A - Individual Consumer",
                    'industry': "Consumer/Individual",
                    'primary_concern': random.choice(consumer_concerns),
                    'business_details': f"{selected_age['desc']} ({selected_age['range']} years old) who {random.choice(lifestyle_contexts).lower()}",
                    'about_person': f"A {selected_culture.replace('_', ' ')} {selected_gender} with {', '.join(selected_age['traits'])} tendencies",
                    'communication_style': "Casual and friendly, asks practical questions",
                    'pain_points': [
                        "Making sure I get good value for my money",
                        "Finding quality products/services",
                        "Not wanting to waste time or money"
                    ],
                    'decision_factors': consumer_objections,
                    
                    # Additional fields for backend compatibility
                    'business_context': 'B2C Consumer',
                    'emotional_state': f"Casual consumer with {', '.join(selected_age['traits'][:2])} mindset",
                    'decision_authority': 'Personal Decision Maker',
                    'objections': consumer_objections,
                    'industry_context': 'Individual Consumer',
                    
                    # Consumer-specific fields
                    'consumer_type': 'Individual',
                    'purchase_context': target_market,
                    'lifestyle_traits': selected_age['traits'],
                    'cultural_background': selected_culture.replace('_', ' '),
                    'gender': selected_gender,
                    'age_range': selected_age['range']
                }
                
                logger.info(f"Generated consumer persona: {persona_data['name']} ({selected_culture}, {selected_gender})")
                
                return jsonify({
                    'success': True,
                    'persona': persona_data,
                    'consumer_type': 'B2C Individual Consumer',
                    'note': f'Generated consumer persona for {product_service} targeting {target_market}'
                })
            
            # If not consumer business, continue with B2B business professional logic
            logger.info(f"Detected B2B business - generating business professional persona")
            
            # Generate bias-free persona with contextual fears
            framework = ComprehensiveBiasPrevention.generate_bias_free_persona_framework(
                industry_context=None,
                target_market=target_market,
                complexity_level="intermediate",
                product_service=product_service  # This triggers contextual fear generation
            )
            
            # Transform framework to match expected persona format
            persona_data = {
                'name': framework['name'],
                'role': framework['role'],
                'company': f"{framework['industry']} Corp Inc.",  # Generate a company name
                'industry': framework['industry'],
                'primary_concern': framework.get('contextual_fears', {}).get('authentic_objections', ['Looking for effective business solutions'])[0] if framework.get('contextual_fears') else 'Looking for effective business solutions',
                'business_details': f"{framework['role']} at a {framework['industry']} organization, {framework['age_range']} years old, with {framework['decision_authority'].lower()} decision authority",
                'about_person': f"A {framework['cultural_background']} professional with {', '.join(framework['personality_traits'][:2]).lower()} personality traits",
                'communication_style': f"{framework['communication_style']['formality_description']}, {framework['communication_style']['chattiness_description']}",
                'pain_points': [fear['core_concern'] for fear in framework.get('contextual_fears', {}).get('contextual_fears', [])] or ['Efficiency challenges', 'Decision-making pressure'],
                'decision_factors': framework.get('contextual_fears', {}).get('authentic_objections', ['Budget constraints', 'Implementation concerns']),
                
                # Additional fields for backend compatibility
                'business_context': framework['business_context'],
                'emotional_state': f"Professional with {framework['communication_style']['emotional_expression'].lower()} emotional expression",
                'decision_authority': framework['decision_authority'],
                'objections': framework.get('contextual_fears', {}).get('authentic_objections', ['Budget constraints', 'Implementation concerns']),
                'industry_context': framework['industry'],
                
                # Include the advanced contextual fear data
                'contextual_fears': framework.get('contextual_fears', {}),
                'conversation_flow_guidance': framework.get('conversation_flow_guidance', ''),
                
                # Generate comprehensive AI prompt guidance (this is the missing piece!)
                'ai_prompt_guidance': ComprehensiveBiasPrevention.create_ai_prompt_guidance(framework),
                
                # Generate voice-optimized prompt (shorter version for voice agents)
                'voice_optimized_prompt': ComprehensiveBiasPrevention.create_voice_optimized_prompt(framework),
                
                # Include human authenticity data
                'emotional_authenticity': framework.get('emotional_authenticity', {}),
                'communication_struggles': framework.get('communication_struggles', {}),
                'vulnerability_areas': framework.get('vulnerability_areas', {}),
                
                # Include cultural and demographic diversity
                'cultural_background': framework['cultural_background'],
                'gender': framework['gender'],
                'age_range': framework['age_range']
            }
            
            logger.info(f"Generated comprehensive persona: {persona_data['name']} ({framework['cultural_background']}, {framework['gender']})")
            
            return jsonify({
                'success': True,
                'persona': persona_data,
                'diversity_info': {
                    'cultural_background': framework['cultural_background'],
                    'gender': framework['gender'],
                    'age_range': framework['age_range'],
                    'role_level': framework['role_level']
                },
                'note': 'Generated using comprehensive bias prevention system with contextual fears'
            })
            
        except Exception as bias_error:
            logger.error(f"Comprehensive bias prevention failed: {str(bias_error)}")
            # Fallback to simple diverse name generation
            from app.services.demographic_names import DemographicNameService
            first_name, last_name = DemographicNameService.get_name_by_demographics("mixed_american", "female")
            full_name = f"{first_name} {last_name}"
            
            persona_data = {
                'name': full_name,
                'role': 'Business Professional',
                'primary_concern': f'Finding effective solutions for {product_service.lower()}',
                'business_details': f"Professional working in the {target_market} sector",
                'about_person': f"Interested in {product_service} to solve business challenges",
                'business_context': 'B2B',
                'emotional_state': 'Professional and focused',
                'pain_points': ['Efficiency challenges', 'Cost concerns', 'Time constraints'],
                'decision_authority': 'Influencer',
                'objections': ['Budget constraints', 'Time concerns'],
                'industry_context': 'Business'
            }
            
            return jsonify({
                'success': True,
                'persona': persona_data,
                'note': 'Using diverse name fallback (comprehensive system temporarily failed)'
            })
            
    except Exception as e:
        logger.error(f"Error generating demo persona: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to generate persona: {str(e)}'
        }), 500 