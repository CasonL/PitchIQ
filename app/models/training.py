"""
Training session and metrics models for the Sales Training AI application.
"""
from datetime import datetime
import json
from app.extensions import db

class TrainingSession(db.Model):
    """Model for training sessions data."""
    
    __tablename__ = 'training_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_profiles.id'))
    user_profile_id = db.Column(db.Integer, db.ForeignKey('user_profiles.id'))  # Alias for user_id for backward compatibility
    
    # Session metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    session_length = db.Column(db.Integer, default=0)  # Length in seconds
    completed = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='active')  # 'active', 'completed', 'canceled'
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    current_stage = db.Column(db.String(50), default='intro')  # Current stage in the roleplay flow
    reached_stages = db.Column(db.Text, default='[]')  # JSON array of stages that have been reached
    trust_score = db.Column(db.Float, default=70.0)  # Trust score from buyer (0-100)
    persuasion_rating = db.Column(db.Float, default=65.0)  # Persuasion effectiveness rating (0-100)
    confidence_score = db.Column(db.Float, default=75.0)  # Sales rep confidence score (0-100)
    
    # Conversation data
    conversation_json = db.Column(db.Text, default='[]')  # JSON string of conversation history
    current_turn = db.Column(db.Integer, default=0)
    
    # Performance metrics
    discovery_score = db.Column(db.Float, default=0.0)    # 0-100 score for discovery questions
    solution_score = db.Column(db.Float, default=0.0)     # 0-100 score for solution presentation
    objection_score = db.Column(db.Float, default=0.0)    # 0-100 score for objection handling
    closing_score = db.Column(db.Float, default=0.0)      # 0-100 score for closing techniques
    overall_score = db.Column(db.Float, default=0.0)      # 0-100 overall performance score
    
    # Emotional intelligence metrics
    emotional_awareness_score = db.Column(db.Float, default=0.0)  # 0-100 score for recognizing emotions
    empathy_score = db.Column(db.Float, default=0.0)              # 0-100 score for empathetic responses
    rapport_score = db.Column(db.Float, default=0.0)              # 0-100 score for building rapport
    question_quality_score = db.Column(db.Float, default=0.0)     # 0-100 score for asking balanced questions
    
    # Feedback data
    feedback_json = db.Column(db.Text, default='{}')      # JSON string of feedback
    strengths = db.Column(db.Text, default='')            # Comma-separated strengths
    areas_to_improve = db.Column(db.Text, default='')     # Comma-separated improvement areas
    
    # Relationships
    user_profile = db.relationship('UserProfile', back_populates='training_sessions', 
                                  foreign_keys=[user_profile_id])
    persona_id = db.Column(db.Integer, db.ForeignKey('buyer_personas.id'))
    persona = db.relationship('BuyerPersona', back_populates='training_sessions',
                             foreign_keys=[persona_id])
    buyer_persona_id = db.Column(db.Integer, db.ForeignKey('buyer_personas.id'))  # Alias for persona_id
    buyer_persona = db.relationship('BuyerPersona', foreign_keys=[buyer_persona_id])  # Alias for persona
    
    def __repr__(self):
        return f'<TrainingSession {self.id}>'
    
    @property
    def conversation(self):
        """Get conversation history."""
        try:
            return json.loads(self.conversation_json)
        except (json.JSONDecodeError, TypeError):
            return []
    
    @conversation.setter
    def conversation(self, value):
        """Set conversation history."""
        self.conversation_json = json.dumps(value)
    
    @property
    def feedback(self):
        """Get feedback."""
        try:
            return json.loads(self.feedback_json)
        except (json.JSONDecodeError, TypeError):
            return {}
    
    @feedback.setter
    def feedback(self, value):
        """Set feedback."""
        self.feedback_json = json.dumps(value)
    
    @property
    def conversation_history_dict(self):
        """Alias for conversation property."""
        return self.conversation

    @conversation_history_dict.setter
    def conversation_history_dict(self, value):
        """Alias for conversation setter."""
        self.conversation = value


class PerformanceMetrics(db.Model):
    """Model for storing detailed performance metrics."""
    __tablename__ = 'performance_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    training_session_id = db.Column(db.Integer, db.ForeignKey('training_sessions.id'), nullable=False)
    user_profile_id = db.Column(db.Integer, db.ForeignKey('user_profiles.id'), nullable=False)
    
    # Skill ratings (1-10)
    rapport_building = db.Column(db.Float, nullable=False)
    needs_discovery = db.Column(db.Float, nullable=False)
    objection_handling = db.Column(db.Float, nullable=False)
    closing_techniques = db.Column(db.Float, nullable=False)
    product_knowledge = db.Column(db.Float, nullable=False)
    
    # Cognitive bias effectiveness
    bias_effectiveness = db.Column(db.Text, nullable=False)  # JSON string with bias ratings
    
    # Emotional intelligence metrics
    emotional_awareness = db.Column(db.Float, nullable=False)
    tone_consistency = db.Column(db.Float, nullable=False)

    training_session = db.relationship('TrainingSession', backref='performance_metrics')

    @property
    def bias_effectiveness_dict(self):
        """Get bias effectiveness as dictionary."""
        try:
            return json.loads(self.bias_effectiveness)
        except (json.JSONDecodeError, TypeError):
            return {}

    @bias_effectiveness_dict.setter
    def bias_effectiveness_dict(self, value):
        """Set bias effectiveness from dictionary."""
        self.bias_effectiveness = json.dumps(value)


class SessionMetrics(db.Model):
    """Stores metrics for training sessions."""
    __tablename__ = 'session_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    training_session_id = db.Column(db.Integer, db.ForeignKey('training_sessions.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Communication metrics
    talk_ratio = db.Column(db.Float, nullable=True)  # User talk time / Total talk time
    avg_response_time = db.Column(db.Float, nullable=True)  # Average seconds to respond
    question_count = db.Column(db.Integer, nullable=True)  # Number of questions asked
    question_ratio = db.Column(db.Float, nullable=True)  # Questions / Statements ratio
    
    # Linguistic analysis
    filler_word_count = db.Column(db.Integer, nullable=True)  # Number of filler words used
    technical_term_count = db.Column(db.Integer, nullable=True)  # Number of technical terms used
    positive_language_ratio = db.Column(db.Float, nullable=True)  # Positive / Total sentiment
    mirroring_score = db.Column(db.Float, nullable=True)  # Language mirroring score
    
    # Time allocation (in percentage)
    time_small_talk = db.Column(db.Float, nullable=True)  # % time spent in small talk
    time_discovery = db.Column(db.Float, nullable=True)  # % time spent in discovery
    time_pitch = db.Column(db.Float, nullable=True)  # % time spent in pitch
    time_objection_handling = db.Column(db.Float, nullable=True)
    time_closing = db.Column(db.Float, nullable=True)  # % time spent closing
    
    # Key structure metrics
    discovery_pitch_ratio = db.Column(db.Float, nullable=True)  # Discovery time / Pitch time
    first_objection_time = db.Column(db.Float, nullable=True)  # When first objection occurred (% into conversation)
    objections_handled_count = db.Column(db.Integer, nullable=True)  # Number of objections handled
    closing_attempts = db.Column(db.Integer, nullable=True)  # Number of closing attempts
    
    # Engagement metrics
    engagement_score = db.Column(db.Float, nullable=True)  # Overall prospect engagement score
    avg_prospect_response_length = db.Column(db.Float, nullable=True)  # Average words in prospect responses
    pain_points_identified = db.Column(db.Integer, nullable=True)  # Number of pain points identified
    value_proposition_alignment = db.Column(db.Float, nullable=True)  # How well value prop aligns with needs
    
    # Detailed data
    pain_point_details = db.Column(db.Text, nullable=True)  # JSON string with pain point details
    
    training_session = db.relationship('TrainingSession', backref='session_metrics')

    def __init__(self, training_session_id, **kwargs):
        self.training_session_id = training_session_id
        super().__init__(**kwargs)

    @property
    def pain_point_details_dict(self):
        """Get pain point details as a dictionary."""
        try:
            return json.loads(self.pain_point_details) if self.pain_point_details else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    @pain_point_details_dict.setter
    def pain_point_details_dict(self, value):
        """Set pain point details from a dictionary."""
        self.pain_point_details = json.dumps(value)

    def to_dict(self):
        """Convert model instance to a dictionary."""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns} 