"""
Coach API Routes - Sync Classifier + Async Planner

Two endpoints:
1. /sync-classify - Fast reflex flags (called every turn)
2. /async-plan - Strategic planning (called during user speech)
"""
from flask import Blueprint, request, jsonify
from app.services.coach_sync_classifier import get_sync_classifier
from app.services.coach_async_planner import get_async_planner
from app.services.session_state import get_session_state, CallPhase
from app.extensions import csrf
import logging

logger = logging.getLogger(__name__)

coach_bp = Blueprint('coach', __name__, url_prefix='/api/coach')


@coach_bp.route('/sync-classify', methods=['POST'])
@csrf.exempt
def sync_classify():
    """
    Fast sync classification for reflex flags.
    Called every turn, must be fast (<50ms).
    """
    try:
        data = request.get_json()
        
        user_message = data.get('message', '')
        session_id = data.get('session_id', 'unknown')
        
        # Get session state for current phase
        session_state = get_session_state(session_id)
        current_phase = session_state.get_current_phase()
        
        # Run sync classifier (no LLM, pattern matching only)
        classifier = get_sync_classifier()
        reflexes = classifier.classify(user_message, current_phase)
        
        # Apply reflexes to session state
        session_state.apply_sync_reflexes({
            'max_sentences': {'value': reflexes.max_sentences, 'ttl_turns': 2},
            'answer_policy': reflexes.answer_policy,
            'do_not_echo': reflexes.do_not_echo,
            'hard_constraints': reflexes.hard_constraints
        })
        
        return jsonify({
            'success': True,
            'reflexes': {
                'max_sentences': reflexes.max_sentences,
                'answer_policy': reflexes.answer_policy,
                'do_not_echo': reflexes.do_not_echo,
                'hard_constraints': [c['value'] for c in reflexes.hard_constraints],
                'question_type': reflexes.question_type
            }
        })
        
    except Exception as e:
        logger.error(f"[Coach] Sync classify error: {e}")
        return jsonify({'error': str(e)}), 500


@coach_bp.route('/async-plan', methods=['POST'])
@csrf.exempt
def async_plan():
    """
    Async strategic planning.
    Called during user speech, can take longer.
    Only affects FUTURE turns.
    """
    try:
        data = request.get_json()
        
        session_id = data.get('session_id', 'unknown')
        transcript_history = data.get('transcript_history', [])
        persona = data.get('persona', {})
        
        # Get session state
        session_state = get_session_state(session_id)
        current_phase = session_state.get_current_phase()
        current_turn = session_state.current_turn
        current_facts = session_state.get_facts()
        
        # Get current pressure level
        pressure_level = 0.5
        if session_state.pressure_level:
            pressure_level = session_state.pressure_level.value
        
        # Run async planner (uses LLM, can take time)
        planner = get_async_planner()
        plan = planner.plan(
            transcript_history=transcript_history,
            persona=persona,
            current_phase=current_phase,
            current_turn=current_turn,
            current_facts=current_facts,
            pressure_level=pressure_level
        )
        
        # Apply plan to session state (for FUTURE turns)
        
        # Try phase transition if suggested
        if plan.suggested_phase:
            try:
                target_phase = CallPhase(plan.suggested_phase)
                transitioned = session_state.try_transition_phase(
                    target_phase,
                    confidence=plan.phase_confidence,
                    min_confidence=0.7
                )
                logger.info(f"[Coach] Phase transition attempt: {plan.suggested_phase} -> {transitioned}")
            except ValueError:
                logger.warning(f"[Coach] Invalid phase: {plan.suggested_phase}")
        
        # Set pending trap
        if plan.pending_trap:
            session_state.pending_trap = plan.pending_trap
        
        # Adjust pressure
        if plan.pressure_adjustment != 0:
            current = pressure_level
            new_pressure = max(0.0, min(1.0, current + plan.pressure_adjustment))
            session_state.pressure_level = type(session_state.pressure_level)(
                value=new_pressure,
                ttl_turns=4,
                set_at_turn=current_turn
            ) if session_state.pressure_level else None
        
        # Add detected facts
        for key, value in plan.facts_detected.items():
            session_state.add_fact(key, value)
        
        # Set objection if suggested
        if plan.objection_to_introduce:
            session_state.active_objection = type(session_state.active_objection)(
                value=plan.objection_to_introduce,
                ttl_turns=3,
                set_at_turn=current_turn
            ) if session_state.active_objection else None
        
        return jsonify({
            'success': True,
            'plan': {
                'suggested_phase': plan.suggested_phase,
                'phase_confidence': plan.phase_confidence,
                'pending_trap': plan.pending_trap,
                'pressure_adjustment': plan.pressure_adjustment,
                'objection_to_introduce': plan.objection_to_introduce,
                'reasoning': plan.reasoning,
                'facts_detected': plan.facts_detected
            },
            'current_state': {
                'phase': session_state.get_current_phase(),
                'phase_duration': session_state.get_phase_duration(),
                'facts': session_state.get_facts()
            }
        })
        
    except Exception as e:
        logger.error(f"[Coach] Async plan error: {e}")
        return jsonify({'error': str(e)}), 500


@coach_bp.route('/state', methods=['GET'])
def get_state():
    """Get current session state (for debugging)"""
    try:
        session_id = request.args.get('session_id', 'unknown')
        session_state = get_session_state(session_id)
        
        return jsonify({
            'session_id': session_id,
            'current_turn': session_state.current_turn,
            'phase': session_state.get_current_phase(),
            'phase_duration': session_state.get_phase_duration(),
            'facts': session_state.get_facts(),
            'sync_state': session_state.get_sync_state(),
            'modifiers': session_state.get_prompt_modifiers()
        })
        
    except Exception as e:
        logger.error(f"[Coach] Get state error: {e}")
        return jsonify({'error': str(e)}), 500
