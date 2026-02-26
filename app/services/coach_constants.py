"""
Coach System Constants
Centralized configuration for thresholds and parameters
"""

# Classification thresholds
CONFIDENCE_THRESHOLD = 0.6  # Minimum confidence to apply intervention
LOW_CONFIDENCE_THRESHOLD = 0.4  # Log warning below this

# State TTL defaults (in turns)
DEFAULT_STATE_TTL = 4
PRESSURE_TTL = 4
OBJECTION_TTL = 3
CONSTRAINT_TTL = 3
MAX_SENTENCES_TTL = 4
PATIENCE_TTL = 6

# Pressure level ranges
PRESSURE_HIGH = 0.7  # Above this = high pressure/skepticism
PRESSURE_LOW = 0.3   # Below this = low pressure/receptive
PRESSURE_DEFAULT = 0.5

# Max sentences constraints
MIN_SENTENCES = 1
MAX_SENTENCES = 5
DEFAULT_SENTENCES = 2

# Valid objection types
VALID_OBJECTIONS = [
    'price',
    'timing',
    'authority',
    'need',
    'trust',
    'competitor'
]

# Valid hard constraints
VALID_CONSTRAINTS = [
    'no_pricing_until_discovery',
    'require_discovery',
    'involve_procurement',
    'technical_validation_needed',
    'budget_approval_required',
    'wait_for_complete_thought',  # User is mid-sentence, don't respond yet
    'answer_user_question'  # User asked a question, answer it don't echo it back
]

# LLM parameters
COACH_TEMPERATURE = 0.3
COACH_MAX_TOKENS = 250

# Rate limiting (future)
MAX_INTERVENTIONS_PER_SESSION = 10
MIN_TURNS_BETWEEN_INTERVENTIONS = 2

# Observability
LOG_COACH_DECISIONS = True
LOG_STATE_CHANGES = True
TRACK_INTERVENTION_SUCCESS = True  # Future feature
