"""
Prospect Response API Routes

Generates AI prospect responses with behavioral mirroring and Coach LLM interventions.
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import logging
from app.services.gpt4o_service import GPT4oService
from app.services.coach_llm_service import CoachLLMService
from app.services.session_state import get_session_state
from app.services.coach_translation import translate_coach_state, get_max_sentences
from app.services.coach_constants import CONFIDENCE_THRESHOLD
from app.services.coach_metrics import get_metrics
from app.extensions import csrf

logger = logging.getLogger(__name__)

prospect_response_bp = Blueprint('prospect_response', __name__)
coach_service = CoachLLMService()
metrics = get_metrics()

@prospect_response_bp.route('/generate', methods=['POST'])
@csrf.exempt
def generate_prospect_response():
    """
    Generate AI prospect response with behavioral mirroring.
    
    Expects:
    {
        "transcript": "user's message",
        "persona": {...},  # Full persona data
        "behavior_state": {
            "awkwardness_level": 0.0-1.0,
            "control_taking": 0.0-1.0,
            "energy_level": "passive" | "neutral" | "engaged"
        },
        "conversation_history": [...],  # Optional
        "session_id": "..."
    }
    
    Returns:
    {
        "success": true,
        "response": "AI prospect response text",
        "metadata": {
            "mirrored_awkwardness": 0.3,
            "response_length": 42,
            "tone": "skeptical"
        }
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'transcript' not in data or 'persona' not in data:
            return jsonify({'error': 'Missing transcript or persona'}), 400
        
        transcript = data['transcript']
        persona = data['persona']
        behavior_state = data.get('behavior_state', {
            'awkwardness_level': 0.0,
            'control_taking': 0.0,
            'energy_level': 'neutral'
        })
        conversation_history = data.get('conversation_history', [])
        session_id = data.get('session_id', 'unknown')
        
        logger.info(f"[ProspectResponse] Generating for session {session_id}")
        
        # PHASE 1: Initialize session state with persona (if new session)
        session_state = get_session_state(session_id, persona)
        
        # Capture state before for metrics
        state_before = session_state.get_prompt_modifiers()
        
        coach_decision = coach_service.classify(
            user_message=transcript,
            transcript_history=conversation_history,
            persona=persona,
            session_context={'behavior_state': behavior_state},
            session_id=session_id,
            turn=session_state.current_turn
        )
        
        # Apply state patch if intervening with sufficient confidence
        if coach_decision.should_intervene and coach_decision.confidence >= CONFIDENCE_THRESHOLD:
            logger.info(
                f"[Coach] Intervening: confidence={coach_decision.confidence:.2f} "
                f"threshold={CONFIDENCE_THRESHOLD}"
            )
            # Merge one_shot_line into patch for SessionState
            patch_with_one_shot = {**coach_decision.state_patch}
            if coach_decision.one_shot_line:
                patch_with_one_shot['one_shot_line'] = coach_decision.one_shot_line
            session_state.apply_patch(patch_with_one_shot)
            
            # Log intervention for observability
            metrics.log_intervention_applied(
                session_id=session_id,
                turn=session_state.current_turn,
                state_patch=coach_decision.state_patch,
                one_shot_line=coach_decision.one_shot_line
            )
            
            # Log state change
            state_after = session_state.get_prompt_modifiers()
            metrics.log_state_change(
                session_id=session_id,
                turn=session_state.current_turn,
                before=state_before,
                after=state_after
            )
        else:
            # Still advance turn counter for TTL cleanup
            session_state.apply_patch({})
        
        # PHASE 2: Build prompt with compiled persona + Coach state
        prompt = _build_mirrored_prompt(
            transcript=transcript,
            compiled_persona=session_state.compiled_persona_prompt,
            persona_name=session_state.persona_name,
            behavior_state=behavior_state,
            conversation_history=conversation_history,
            coach_modifiers=session_state.get_prompt_modifiers(),
            one_shot_line=session_state.consume_one_shot()
        )
        
        # PHASE 3: Generate response
        gpt_service = GPT4oService()
        response_text = gpt_service.generate_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=_calculate_temperature(behavior_state),
            max_tokens=300  # Increased from 150 to allow complete sentences
        )
        
        # Calculate response metadata
        metadata = _analyze_response(response_text, behavior_state)
        
        # Add Coach decision info for debugging
        metadata['coach'] = {
            'intervened': coach_decision.should_intervene and coach_decision.confidence >= CONFIDENCE_THRESHOLD,
            'confidence': round(coach_decision.confidence, 2),
            'reasoning': coach_decision.reasoning[:100] if coach_decision.reasoning else None,
            'state_modifiers': session_state.get_prompt_modifiers(),
            'question_type': coach_service._detect_question_type(transcript)
        }
        
        logger.info(f"[ProspectResponse] Generated: {response_text[:50]}...")
        
        return jsonify({
            'success': True,
            'response': response_text,
            'metadata': metadata
        })
        
    except Exception as e:
        logger.error(f"[ProspectResponse] Error: {str(e)}")
        return jsonify({'error': 'Failed to generate response'}), 500


def _build_mirrored_prompt(
    transcript: str, 
    compiled_persona: str,
    persona_name: str,
    behavior_state: dict, 
    conversation_history: list,
    coach_modifiers: dict = None,
    one_shot_line: str = None
) -> str:
    """
    Build prompt with compiled persona + behavioral mirroring + Coach state.
    Persona is pre-compiled and static, reducing token usage.
    """
    
    coach_modifiers = coach_modifiers or {}
    name = persona_name
    
    # Build behavioral mirroring instructions
    awkwardness = behavior_state.get('awkwardness_level', 0.0)
    control = behavior_state.get('control_taking', 0.0)
    energy = behavior_state.get('energy_level', 'neutral')
    
    mirror_instructions = []
    
    if awkwardness > 0.5:
        mirror_instructions.append("The seller seems uncertain - be slightly skeptical")
    elif awkwardness < 0.2 and control > 0.6:
        mirror_instructions.append("The seller is confident - be more engaged")
    
    if energy == 'passive':
        mirror_instructions.append("Keep responses brief and reserved")
    elif energy == 'engaged':
        mirror_instructions.append("Show more enthusiasm")
    
    if control < 0.3:
        mirror_instructions.append("The seller isn't leading - be passive")
    
    # Translate Coach state into behavioral constraints (data-driven)
    coach_constraints = translate_coach_state(coach_modifiers, name)
    
    # Build full prompt using compiled persona
    prompt = f"""{compiled_persona}

BEHAVIORAL GUIDELINES:
{chr(10).join(f"- {inst}" for inst in mirror_instructions) if mirror_instructions else "- Respond naturally"}
{chr(10).join(f"- {constraint}" for constraint in coach_constraints) if coach_constraints else ""}

RECENT CONVERSATION:
"""
    
    for entry in conversation_history[-5:]:
        role_label = "Seller" if entry.get('role') == 'user' else name
        prompt += f"{role_label}: {entry.get('text', '')}\n"
    
    prompt += f"Seller: {transcript}\n\n"
    
    # Determine max sentences from Coach state (data-driven)
    max_sentences = get_max_sentences(coach_modifiers, default=2)
    
    # Check if user asked a question
    has_answer_constraint = any(
        c.get('value') == 'answer_user_question' 
        for c in coach_modifiers.get('hard_constraints', [])
    )
    
    prompt += f"""INSTRUCTIONS:
- Respond in {max_sentences} sentence{"s" if max_sentences != 1 else ""} or less
- Be human and authentic
"""
    
    if has_answer_constraint:
        prompt += """- CRITICAL: The seller just asked YOU a question. Answer their question directly.
- DO NOT ask the seller a question back. DO NOT flip roles.
- You are the PROSPECT being sold to, not the seller asking discovery questions.
"""
    
    # Add one-shot line if Coach provided it
    if one_shot_line:
        prompt += f"\nSuggested response: \"{one_shot_line}\"\n"
    
    prompt += f"\n{name}:"
    
    return prompt




def _calculate_temperature(behavior_state: dict) -> float:
    """Calculate GPT temperature based on behavior state."""
    energy = behavior_state.get('energy_level', 'neutral')
    
    if energy == 'passive':
        return 0.6  # More predictable
    elif energy == 'engaged':
        return 0.85  # More creative
    else:
        return 0.75  # Balanced


def _analyze_response(response: str, behavior_state: dict) -> dict:
    """Analyze generated response for metadata."""
    return {
        'mirrored_awkwardness': behavior_state.get('awkwardness_level', 0.0),
        'response_length': len(response.split()),
        'tone': _infer_tone(behavior_state),
        'word_count': len(response.split())
    }


def _infer_tone(behavior_state: dict) -> str:
    """Infer tone from behavior state."""
    awkwardness = behavior_state.get('awkwardness_level', 0.0)
    control = behavior_state.get('control_taking', 0.0)
    
    if awkwardness > 0.6:
        return 'skeptical'
    elif control > 0.7:
        return 'engaged'
    elif control < 0.3:
        return 'passive'
    else:
        return 'neutral'
