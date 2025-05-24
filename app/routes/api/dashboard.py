"""
Dashboard API Routes

This file contains API routes for the React dashboard
"""
from flask import Blueprint, jsonify, request, current_app, g, Response
from flask_login import current_user, login_required # Restore this import
import logging
# from app.services.openai_service import openai_service # Remove direct import
from app.services.api_manager import api_manager # Import api_manager
from app.extensions import csrf # Import csrf
import json

# Create dashboard API blueprint (Removed url_prefix)
dashboard_api = Blueprint('dashboard_api', __name__)

# Add logger
logger = logging.getLogger(__name__)

# --- MOCK DATA AND ROUTES REMOVED TO AVOID CONFLICT WITH api_blueprint.py ---

@csrf.exempt
@dashboard_api.route('/coach', methods=['GET', 'POST'])
# @login_required # Removed to allow testing without login
def coach_conversation():
    """Handle conversation flow with the AI Coach."""
    if request.method == 'GET':
        logger.info("Received GET request for /coach")
        initial_message = "Welcome! What product or service are you selling today?"
        return jsonify({"messages": [{"role": "assistant", "content": initial_message}]})

    elif request.method == 'POST':
        try:
            user_id = current_user.id if hasattr(current_user, 'is_authenticated') and current_user.is_authenticated else 'Anonymous'
            logger.info(f"Entered coach_conversation with POST method for user: {user_id}")
            
            data = request.get_json()
            if not data or 'message' not in data:
                logger.warning("Invalid POST data: Missing 'message' field.")
                return jsonify({'error': 'Invalid request data. Message required.'}), 400

            user_message = data.get('message')
            current_stage = data.get('stage', 'product') 
            context_prompt_data = data.get('contextPrompt', {}) # This is AI_GUIDANCE for the current_stage
            conversation_history = data.get('conversation_history', []) # Array of {role, content}

            logger.debug(f"Received user message: {user_message}")
            logger.debug(f"Received conversation history length: {len(conversation_history)}")
            logger.debug(f"Current stage: {current_stage}")
            logger.debug(f"Context prompt data received: {bool(context_prompt_data)}")


            # Determine if this is the user's first actual turn in the product stage
            is_first_product_turn = current_stage == 'product' and not any(msg.get('role') == 'user' for msg in conversation_history)
            logger.info(f"Is this the user's first product description turn? {is_first_product_turn}")
            if conversation_history:
                # Log example of message structure in history if needed for debugging
                # logger.debug(f"Sample message from history: {conversation_history[0]}")
                pass

            system_message_content = ""
            info_needed_list = context_prompt_data.get('information_needed', [])
            info_needed_str = "\n".join([f"- {info.strip()}" for info in info_needed_list])


            if is_first_product_turn:
                system_message_content = f"""You are an AI onboarding assistant. This is the user's VERY FIRST message where they are describing their product or service.
Your response MUST follow this exact three-part structure and NOTHING ELSE for this turn:
1.  A brief polite acknowledgment (e.g., 'Thanks for telling me about that.' or 'Okay, I understand.').
2.  A standalone expression of genuine, noticeable enthusiasm about what they are selling (e.g., 'That's a fascinating business!' or 'Wow, that sounds like a great venture!'). This MUST be a new sentence.
3.  Ask ONE clear, direct follow-up question from the 'Information to gather' list below to learn more specifics about their product/service. This MUST be a new sentence.

Example for a user selling 'old books':
User: I sell old books.
AI: Thanks for telling me about that. Selling old books sounds like a rewarding venture! Could you tell me a bit more about what makes your old books special?

Do NOT add any other advice, summaries, introductory phrases (e.g. "Okay, great!"), or additional questions in this first response. Stick strictly to the three parts.

Information to gather for the Product Stage:
{info_needed_str}
"""
            else: # Not the first product turn, or a different stage
                system_prompt_parts = []
                current_stage_display_name = current_stage.replace('_', ' ').title()
                
                current_stage_goal = context_prompt_data.get('goal', f"Help the user with the {current_stage_display_name} stage of onboarding.")
                system_prompt_parts.append(f"Onboarding Goal for {current_stage_display_name} Stage: {current_stage_goal}")

                current_stage_principles = context_prompt_data.get('principles', [])
                if current_stage_principles:
                    system_prompt_parts.append(f"\nKey Behavioral Instructions for {current_stage_display_name} Stage (Follow Strictly):")
                    system_prompt_parts.extend([f"- {p.strip()}" for p in current_stage_principles])
                
                if info_needed_list:
                   system_prompt_parts.append(f"\nInformation needed for this {current_stage_display_name} Stage (Your direct questions should target these specific areas if not yet covered):")
                   system_prompt_parts.extend([f"- {info.strip()}" for info in info_needed_list])

                example_questions = context_prompt_data.get('example_questions', [])
                if example_questions:
                    system_prompt_parts.append("\nExample questions for inspiration (adapt as needed, ask only one at a time if appropriate to the conversation flow):")
                    system_prompt_parts.extend([f"- {q.strip()}" for q in example_questions])

                system_prompt_parts.append("\nGeneral Role: You are an AI onboarding assistant. Maintain a natural, friendly, and conversational tone. If user responses are vague, gently guide them with clarifying questions. Compliment genuinely when appropriate.")
                system_message_content = "\n".join(filter(None, system_prompt_parts)).strip()
        
            if not system_message_content: 
                logger.warning("System message content is empty. Using a default system prompt.")
                fallback_goal = context_prompt_data.get('goal', "assist the user effectively")
                system_message_content = f"You are a helpful AI sales coach. Please focus on helping the user to {fallback_goal} for the {current_stage.replace('_',' ').title()} stage."


            # Log the constructed system prompt
            logger.info(f"\n=== SYSTEM PROMPT SENT TO OPENAI (dashboard.py) ===\n{system_message_content}\n============================================")

            messages_for_api = [
                {"role": "system", "content": system_message_content}
            ]
            messages_for_api.extend(conversation_history) # Add history AFTER system prompt
            messages_for_api.append({"role": "user", "content": user_message})
            
            service_manager = getattr(g, 'api_manager', api_manager)
            
            if not service_manager or not hasattr(service_manager, 'openai_service'):
                logger.error("OpenAI service not found in API manager!")
                return jsonify({'error': 'AI service configuration error'}), 500
                
            ai_response_content = service_manager.openai_service.generate_response(
                messages=messages_for_api,
                model=current_app.config.get('OPENAI_DEFAULT_MODEL', 'gpt-4o-mini'), # Or a specific model for coaching
                temperature=0.3, # Lowered temperature from 0.7 to 0.3
                max_tokens=300, # Increased token count slightly for potentially longer enthusiastic responses + summary
                current_stage=current_stage # Pass current_stage
            )

            # --- START LOGGING RAW RESPONSE ---
            logger.info(f"\n=== RAW RESPONSE FROM OPENAI (dashboard.py) ===\n{ai_response_content}\n============================================")
            # --- END LOGGING RAW RESPONSE ---

            # Parse response for content, summary and next_stage
            chat_message = ai_response_content
            summary_text = None
            next_stage_instruction = 'current' # Default
            
            if ai_response_content:
                lines = ai_response_content.strip().split('\n')
                potential_chat_message_lines = []
                
                # First pass: Look for explicit SUMMARY and NEXT_STAGE lines
                for line in lines:
                    line_stripped = line.strip()
                    if line_stripped.startswith('SUMMARY:'):
                        summary_text = line_stripped.replace('SUMMARY:', '').strip()
                        logger.info(f"Found summary line: {summary_text}")
                    elif line_stripped.startswith('NEXT_STAGE:'):
                        next_stage_instruction = line_stripped.replace('NEXT_STAGE:', '').strip()
                        logger.info(f"Found next stage instruction: {next_stage_instruction}")
                    else:
                        potential_chat_message_lines.append(line)
                        
                # If no summary was found but we're expecting one, look for implicit summary patterns
                if summary_text is None and current_stage != 'complete':
                    logger.warning("No explicit SUMMARY line found, looking for implicit summary...")
                    for i, line in enumerate(lines):
                        line_lower = line.lower()
                        # Look for lines that might be a summary without the explicit marker
                        if (("summary" in line_lower or "to summarize" in line_lower) 
                            and i < len(lines) - 1  # Not the last line
                            and len(line) > 15      # Reasonably long line
                            and ":" in line):       # Contains a colon
                            
                            # Extract what appears to be a summary
                            summary_candidate = line.split(":", 1)[1].strip()
                            if summary_candidate and len(summary_candidate) > 10:
                                summary_text = summary_candidate
                                logger.info(f"Extracted implicit summary: {summary_text}")
                                # Don't remove this line from the chat message
                                break
                
                # Rebuild the chat message without SUMMARY and NEXT_STAGE lines
                chat_message = "\n".join(potential_chat_message_lines).strip()
                
                # Log what we found
                logger.info(f"Final summary text: {summary_text}")
                logger.info(f"Final next stage: {next_stage_instruction}")
                logger.info(f"Chat message length: {len(chat_message)}")

            # First print the stage we received for debugging
            logger.info(f"Received next_stage_instruction: '{next_stage_instruction}'")
                
            # Validate next_stage value (make lowercase to be more forgiving)
            if next_stage_instruction:
                next_stage_instruction = next_stage_instruction.lower()
                
            valid_stages = ['product', 'buyer', 'pain_point', 'complete', 'current']
            if next_stage_instruction not in valid_stages:
                logger.warning(f"AI returned invalid next_stage: '{next_stage_instruction}'. Defaulting to 'current'.")
                next_stage_instruction = 'current'
                
            logger.info(f"Final validated next_stage: '{next_stage_instruction}'")

            if chat_message:
                logger.info(f"Successfully generated AI response. Summary: {summary_text}, Next Stage: {next_stage_instruction}")
                # Return with summary field
                return jsonify({
                    'content': chat_message, 
                    'summary': summary_text,
                    'next_stage': next_stage_instruction
                }), 200
            else:
                return jsonify({'error': 'Failed to get response from AI coach'}), 500

        except Exception as e:
            logger.error(f"Error in coach_conversation POST: {str(e)}", exc_info=True)
            return jsonify({'error': 'An internal server error occurred'}), 500 

# Add streaming endpoint
@dashboard_api.route('/coach/stream', methods=['POST'])
# @login_required # Commented out for testing
def coach_conversation_stream():
    """
    Handle streaming conversation with the AI Coach.
    Returns a stream of text chunks as they are generated by the AI.
    """
    try:
        data = request.json
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Invalid request. Message is required.'}), 400
            
        # Extract data
        user_message = data['message']
        conversation_history = data.get('context', {}).get('messages', [])
        additional_context = data.get('context', {}).get('additional_context', '')
        current_stage = data.get('context', {}).get('current_stage', '')
        
        # Set system prompt
        system_prompt = """You are an AI sales coach helping a user improve their sales skills.
Keep responses conversational, natural, and easy to follow.
Respond thoughtfully, but conversationally, as if you're talking informally."""
        
        if additional_context:
            system_prompt += f"\n\nCURRENT FOCUS: {additional_context}"
            
        # Prepare messages for API
        messages_for_api = []
        
        # Add conversation history
        for msg in conversation_history:
            role = msg.get('role', 'user' if msg.get('isUser', False) else 'assistant')
            content = msg.get('content', '')
            if content:
                messages_for_api.append({"role": role, "content": content})
        
        # Add current message
        messages_for_api.append({"role": "user", "content": user_message})
        
        # Get service manager
        service_manager = getattr(g, 'api_manager', api_manager)
        
        # Ensure OpenAI service is initialized
        if not service_manager or not hasattr(service_manager, 'openai_service'):
            return jsonify({'error': 'AI service configuration error'}), 500
            
        # Create streaming response
        def generate():
            # Initial SSE message with event type
            yield 'event: start\ndata: {"status": "started"}\n\n'
            
            # Stream response chunks
            for chunk in service_manager.openai_service.generate_streaming_response(
                messages=messages_for_api,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=250
            ):
                # Format as SSE data message
                yield f'event: chunk\ndata: {json.dumps({"chunk": chunk})}\n\n'
                
            # Final message
            yield 'event: end\ndata: {"status": "completed"}\n\n'
                
        # Return streaming response
        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        logger.error(f"Error in coach_conversation_stream: {str(e)}", exc_info=True)
        return jsonify({'error': 'An internal server error occurred'}), 500 