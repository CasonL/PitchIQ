"""
Coach State Translation - Data-Driven Mapping
Translates structured state into natural behavioral constraints
"""
from typing import Dict, List
from app.services.coach_constants import PRESSURE_HIGH, PRESSURE_LOW


# Pressure level → behavioral constraint mapping
PRESSURE_TRANSLATIONS = {
    'high': "You're skeptical and need strong evidence before trusting claims",
    'very_high': "You're highly skeptical and push back on vague statements",
    'low': "You're open and receptive to new ideas",
    'very_low': "You're eager to explore solutions and ask clarifying questions"
}

# Objection type → concern focus mapping
OBJECTION_TRANSLATIONS = {
    'price': "You're concerned about budget and need to justify the cost",
    'timing': "You're worried about implementation timeline and disruption",
    'authority': "You need to involve other decision makers before proceeding",
    'need': "You're not convinced this solves a pressing problem",
    'trust': "You need more proof and credibility before moving forward",
    'competitor': "You're comparing this to other solutions you've heard about"
}

# Hard constraint → explicit rule mapping
CONSTRAINT_TRANSLATIONS = {
    'no_pricing_until_discovery': 
        "Do not discuss pricing until you understand their current process and pain points",
    'require_discovery': 
        "Ask clarifying questions about their current situation before engaging deeply",
    'involve_procurement': 
        "You need to loop in procurement/finance before any commitments",
    'technical_validation_needed': 
        "Your technical team needs to validate this before you can proceed",
    'budget_approval_required': 
        "Any spending requires formal budget approval from leadership",
    'wait_for_complete_thought':
        "The caller seems to be mid-thought. Wait for them to finish before responding fully. Give a brief acknowledgment like 'Go on...' or 'I'm listening...'",
    'answer_user_question':
        "The caller just asked you a question. Answer their question directly - do NOT ask the same question back to them"
}

# Patience budget → urgency behavior mapping
PATIENCE_TRANSLATIONS = {
    0: "You're out of time and need to end the call",
    1: "You have one more minute and need to wrap up soon",
    2: "You're running short on time",
    3: "You have limited time remaining"
}


def translate_coach_state(modifiers: Dict, prospect_name: str) -> List[str]:
    """
    Translate Coach state modifiers into natural behavioral constraints
    Data-driven approach - no if-else spaghetti
    """
    constraints = []
    
    # Translate pressure level
    pressure = modifiers.get('pressure_level')
    if pressure is not None:
        constraint = _translate_pressure(pressure)
        if constraint:
            constraints.append(constraint)
    
    # Translate active objection
    objection = modifiers.get('active_objection')
    if objection:
        constraint = OBJECTION_TRANSLATIONS.get(objection)
        if constraint:
            constraints.append(constraint)
    
    # Translate hard constraints
    hard_constraints = modifiers.get('hard_constraints', [])
    for constraint_key in hard_constraints:
        constraint = CONSTRAINT_TRANSLATIONS.get(constraint_key)
        if constraint:
            constraints.append(constraint)
    
    # Translate patience budget
    patience = modifiers.get('patience_budget')
    if patience is not None and patience <= 3:
        constraint = PATIENCE_TRANSLATIONS.get(patience, PATIENCE_TRANSLATIONS[3])
        constraints.append(constraint)
    
    return constraints


def _translate_pressure(pressure: float) -> str:
    """Translate pressure level to behavioral constraint"""
    if pressure >= 0.85:
        return PRESSURE_TRANSLATIONS['very_high']
    elif pressure >= PRESSURE_HIGH:
        return PRESSURE_TRANSLATIONS['high']
    elif pressure <= 0.15:
        return PRESSURE_TRANSLATIONS['very_low']
    elif pressure <= PRESSURE_LOW:
        return PRESSURE_TRANSLATIONS['low']
    return None  # Neutral pressure - no constraint needed


def get_max_sentences(modifiers: Dict, default: int = 2) -> int:
    """Extract max_sentences with fallback"""
    return modifiers.get('max_sentences', default)


def validate_constraint_key(key: str) -> bool:
    """Check if constraint key is valid"""
    return key in CONSTRAINT_TRANSLATIONS


def validate_objection_type(objection: str) -> bool:
    """Check if objection type is valid"""
    return objection in OBJECTION_TRANSLATIONS
