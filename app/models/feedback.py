"""
Feedback-related models for the Sales Training AI application.
"""
from datetime import datetime
import json
from app.extensions import db

class FeedbackAnalysis(db.Model):
    """Stores AI-generated feedback for a training session."""
    __tablename__ = 'feedback_analysis'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('training_sessions.id'), nullable=False)
    user_profile_id = db.Column(db.Integer, db.ForeignKey('user_profiles.id', name='fk_feedback_user_profile_id'), nullable=False)
    overall_assessment = db.Column(db.Text, nullable=True)
    strengths_demonstrated = db.Column(db.Text, nullable=True)  # JSON string
    areas_for_improvement = db.Column(db.Text, nullable=True)  # JSON string
    rapport_feedback = db.Column(db.Text, nullable=True)
    discovery_feedback = db.Column(db.Text, nullable=True)
    objection_feedback = db.Column(db.Text, nullable=True)
    closing_feedback = db.Column(db.Text, nullable=True)
    
    # New emotional intelligence feedback fields
    emotional_intelligence_feedback = db.Column(db.Text, nullable=True)
    question_quality_feedback = db.Column(db.Text, nullable=True)
    emotional_awareness_score = db.Column(db.Float, nullable=True, default=70.0)
    empathy_score = db.Column(db.Float, nullable=True, default=70.0)
    rapport_score = db.Column(db.Float, nullable=True, default=70.0)
    question_quality_score = db.Column(db.Float, nullable=True, default=75.0)
    
    # Flag for insufficient conversation data
    insufficient_data = db.Column(db.Boolean, default=False)
    
    mindset_insights = db.Column(db.Text, nullable=True)
    limiting_beliefs_detected = db.Column(db.Text, nullable=True)  # JSON string
    reframe_suggestions = db.Column(db.Text, nullable=True)  # JSON string
    action_items = db.Column(db.Text, nullable=True)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    error_message = db.Column(db.Text, nullable=True)  # For storing any errors during feedback generation
    
    training_session = db.relationship('TrainingSession', backref='feedback_analysis')
    user_profile = db.relationship('UserProfile', backref='feedback_analysis')

    @property
    def strengths_demonstrated_list(self):
        try:
            return json.loads(self.strengths_demonstrated) if self.strengths_demonstrated else []
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def areas_for_improvement_list(self):
        try:
            return json.loads(self.areas_for_improvement) if self.areas_for_improvement else []
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def limiting_beliefs_detected_list(self):
        try:
            return json.loads(self.limiting_beliefs_detected) if self.limiting_beliefs_detected else []
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def reframe_suggestions_list(self):
        try:
            return json.loads(self.reframe_suggestions) if self.reframe_suggestions else []
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def action_items_list(self):
        try:
            return json.loads(self.action_items) if self.action_items else []
        except (json.JSONDecodeError, TypeError):
            return []


class SessionFeedback(db.Model):
    """Stores user feedback about roleplay sessions."""
    __tablename__ = 'session_feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('training_sessions.id'), nullable=False)
    persona_rating = db.Column(db.Integer, nullable=False)  # 1-5 star rating
    overall_rating = db.Column(db.Integer, nullable=False)  # 1-5 star rating
    comments = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    session = db.relationship('TrainingSession', backref=db.backref('user_feedback', uselist=False))
    
    def __repr__(self):
        return f'<SessionFeedback for session {self.session_id}>'


class Feedback(db.Model):
    """Model to store generated feedback for a conversation."""
    __tablename__ = 'feedback'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'), nullable=False, unique=True) # Ensure one feedback per convo
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', name='fk_feedback_user_id'), nullable=False)
    feedback_text = db.Column(db.Text, nullable=False)
    model_used = db.Column(db.String(100), nullable=True) # e.g., 'gpt-4o-mini'
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    overall_score = db.Column(db.Float, nullable=True)
    skill_scores = db.Column(db.Text, default='{}')  # JSON string with skill scores
    
    user = db.relationship('User', backref='feedback')

    @property
    def skill_scores_dict(self):
        """Get skill scores as dictionary."""
        try:
            return json.loads(self.skill_scores)
        except (json.JSONDecodeError, TypeError):
            return {}

    @skill_scores_dict.setter
    def skill_scores_dict(self, value):
        """Set skill scores from dictionary."""
        self.skill_scores = json.dumps(value)

    def __repr__(self):
        return f'<Feedback for convo {self.conversation_id}>' 