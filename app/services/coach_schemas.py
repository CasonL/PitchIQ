"""
Coach LLM Response Schemas
Validates Coach output structure
"""
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from app.services.coach_constants import VALID_OBJECTIONS, VALID_CONSTRAINTS


@dataclass
class StatePatchSchema:
    """Expected structure for state patches"""
    pressure_level: Optional[Dict[str, Any]] = None
    active_objection: Optional[Dict[str, Any]] = None
    hard_constraints: Optional[List[Dict[str, Any]]] = None
    max_sentences: Optional[Dict[str, Any]] = None
    patience_budget: Optional[Dict[str, Any]] = None


def validate_state_value(value_dict: Any) -> bool:
    """Validate state value has correct structure"""
    if not isinstance(value_dict, dict):
        return False
    
    if 'value' not in value_dict:
        return False
    
    if 'ttl_turns' in value_dict and not isinstance(value_dict['ttl_turns'], (int, float)):
        return False
    
    return True


def validate_constraint(constraint: Any) -> bool:
    """Validate hard constraint structure"""
    if not isinstance(constraint, dict):
        return False
    
    if 'action' not in constraint or constraint['action'] != 'add':
        return False
    
    if 'value' not in constraint or not isinstance(constraint['value'], str):
        return False
    
    return True


def validate_coach_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and sanitize Coach LLM response
    Returns sanitized data or raises ValueError
    """
    # Required fields
    if 'decision' not in data:
        raise ValueError("Missing 'decision' field")
    
    decision = str(data['decision']).lower()
    if decision not in ['persist', 'intervene']:
        raise ValueError(f"Invalid decision: {decision}")
    
    # Validate confidence
    confidence = data.get('confidence', 0.5)
    if not isinstance(confidence, (int, float)) or not (0.0 <= confidence <= 1.0):
        raise ValueError(f"Invalid confidence: {confidence}")
    
    # Validate state_patch if present
    state_patch = data.get('state_patch', {})
    if not isinstance(state_patch, dict):
        raise ValueError("state_patch must be a dict")
    
    sanitized_patch = {}
    
    # Validate pressure_level
    if 'pressure_level' in state_patch:
        if validate_state_value(state_patch['pressure_level']):
            pressure_val = state_patch['pressure_level']['value']
            if isinstance(pressure_val, (int, float)) and 0.0 <= pressure_val <= 1.0:
                sanitized_patch['pressure_level'] = state_patch['pressure_level']
    
    # Validate active_objection
    if 'active_objection' in state_patch:
        if validate_state_value(state_patch['active_objection']):
            objection_val = state_patch['active_objection']['value']
            if objection_val in VALID_OBJECTIONS:
                sanitized_patch['active_objection'] = state_patch['active_objection']
    
    # Validate hard_constraints
    if 'hard_constraints' in state_patch:
        constraints = state_patch['hard_constraints']
        if isinstance(constraints, list):
            valid_constraints = [c for c in constraints if validate_constraint(c)]
            if valid_constraints:
                sanitized_patch['hard_constraints'] = valid_constraints
    
    # Validate max_sentences
    if 'max_sentences' in state_patch:
        if validate_state_value(state_patch['max_sentences']):
            max_sent = state_patch['max_sentences']['value']
            if isinstance(max_sent, int) and 1 <= max_sent <= 5:
                sanitized_patch['max_sentences'] = state_patch['max_sentences']
    
    # Validate patience_budget
    if 'patience_budget' in state_patch:
        if validate_state_value(state_patch['patience_budget']):
            patience = state_patch['patience_budget']['value']
            if isinstance(patience, int) and patience >= 0:
                sanitized_patch['patience_budget'] = state_patch['patience_budget']
    
    # Validate one_shot_line
    one_shot = data.get('one_shot_line')
    if one_shot is not None and not isinstance(one_shot, str):
        one_shot = None
    
    # Validate reasoning
    reasoning = data.get('reasoning', 'No reasoning provided')
    if not isinstance(reasoning, str):
        reasoning = str(reasoning)
    
    return {
        'decision': decision,
        'confidence': float(confidence),
        'reasoning': reasoning,
        'state_patch': sanitized_patch,
        'one_shot_line': one_shot
    }
