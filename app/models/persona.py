"""
Buyer Persona model for the Sales Training AI application.
"""
from datetime import datetime
import json
from app.extensions import db

class BuyerPersona(db.Model):
    """Model for AI-generated buyer personas."""
    
    __tablename__ = 'buyer_personas'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False) # Will store description_narrative
    
    # Layer 1: Base Reaction Style
    base_reaction_style = db.Column(db.String(100), nullable=True) # New field

    # Layer 3: Trait Metrics & other personality aspects
    personality_traits = db.Column(db.Text, nullable=False)  # JSON string with trait_metrics object
    intelligence_level = db.Column(db.String(50), nullable=True) # New field (e.g., "low", "average", "high")
    emotional_state = db.Column(db.String(50), nullable=False)
    
    # Existing fields (some map to Layer 2 or more detailed traits)
    buyer_type = db.Column(db.String(50), nullable=False)
    decision_authority = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(100), nullable=True)
    industry_context = db.Column(db.Text, nullable=True)
    pain_points = db.Column(db.Text, nullable=False)  # JSON string with pain points list
    objections = db.Column(db.Text, nullable=False)  # JSON string with common objections list
    primary_concern = db.Column(db.String(200), nullable=True)
    cognitive_biases = db.Column(db.Text, nullable=False)  # JSON string with biases object

    # New detailed fields from rich persona JSON
    business_description = db.Column(db.Text, nullable=True)
    business_context = db.Column(db.String(10), nullable=True)  # B2B or B2C
    longterm_personal_description = db.Column(db.Text, nullable=True)  # JSON string
    shortterm_personal_description = db.Column(db.Text, nullable=True)  # JSON string
    demographic_description = db.Column(db.Text, nullable=True)  # JSON string
    linguistic_style_cue = db.Column(db.Text, nullable=True)
    chattiness_level = db.Column(db.String(50), nullable=True)

    # Caching flags
    is_cached = db.Column(db.Boolean, default=False)  # Flag for personas that can be reused across users
    is_legendary = db.Column(db.Boolean, default=False)  # Flag for special "legendary" personas
    cached_at = db.Column(db.DateTime, default=datetime.utcnow)  # When this persona was cached
    
    @property
    def personality_traits_dict(self):
        """Get personality traits as dictionary."""
        try:
            return json.loads(self.personality_traits)
        except (json.JSONDecodeError, TypeError):
            return {}
    
    @personality_traits_dict.setter
    def personality_traits_dict(self, value):
        """Set personality traits from dictionary."""
        self.personality_traits = json.dumps(value)
    
    @property
    def pain_points_list(self):
        """Get pain points as list."""
        try:
            return json.loads(self.pain_points)
        except (json.JSONDecodeError, TypeError):
            return []
    
    @pain_points_list.setter
    def pain_points_list(self, value):
        """Set pain points from list."""
        self.pain_points = json.dumps(value)
    
    @property
    def objections_list(self):
        """Get objections as list."""
        try:
            return json.loads(self.objections)
        except (json.JSONDecodeError, TypeError):
            return []
    
    @objections_list.setter
    def objections_list(self, value):
        """Set objections from list."""
        self.objections = json.dumps(value)
    
    @property
    def cognitive_biases_dict(self):
        """Get cognitive biases as dictionary."""
        try:
            return json.loads(self.cognitive_biases)
        except (json.JSONDecodeError, TypeError):
            return {}

    @cognitive_biases_dict.setter
    def cognitive_biases_dict(self, value):
        """Set cognitive biases from dictionary."""
        self.cognitive_biases = json.dumps(value)

    def __repr__(self):
        return f'<BuyerPersona {self.name}>' 