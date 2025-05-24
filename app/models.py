"""
Database models for the Sales Training AI application.

This module provides SQLAlchemy models for users, conversations, and messages.
"""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
import json
from flask import current_app

# Import the db instance from extensions.py
from app.extensions import db

class User(db.Model, UserMixin):
    """User model for authentication and profile data."""
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # User role (admin, user)
    role = db.Column(db.String(20), default='user')
    
    # User stats and training data
    completed_roleplays = db.Column(db.Integer, default=0)
    sales_skills = db.Column(db.Text, default='{}')  # JSON string with skill ratings
    strengths = db.Column(db.Text, default='[]')     # JSON string with strengths list
    weaknesses = db.Column(db.Text, default='[]')    # JSON string with areas to improve
    
    # Google Auth
    google_id = db.Column(db.String(100), unique=True, nullable=True)
    
    # Password reset fields
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    # Define the __tablename__ for the User model
    __tablename__ = 'user'
    
    # conversations will be handled by backref from Conversation model
    
    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password is correct."""
        if not self.password_hash:
            print(f"WARNING: User {self.id} has no password hash!", flush=True)
            return False
        
        try:
            # Use a more robust password checking approach
            result = check_password_hash(self.password_hash, password)
            
            # Log the result
            try:
                current_app.logger.info(f"Password check result for {self.id}: {result}")
            except (ImportError, RuntimeError):
                print(f"Password check result for {self.id}: {result}", flush=True)
            
            return result
        except Exception as e:
            print(f"ERROR in password check for user {self.id}: {str(e)}", flush=True)
            # Log the error but don't expose details to client
            import logging
            logging.getLogger(__name__).error(f"Password check error: {str(e)}")
            return False
    
    @property
    def skills_dict(self):
        """Get sales skills as dictionary."""
        try:
            return json.loads(self.sales_skills)
        except:
            return {
                "rapport_building": 0,
                "needs_discovery": 0,
                "objection_handling": 0,
                "closing": 0,
                "product_knowledge": 0
            }
    
    @skills_dict.setter
    def skills_dict(self, value):
        """Set sales skills from dictionary."""
        self.sales_skills = json.dumps(value)
    
    @property
    def strengths_list(self):
        """Get strengths as list."""
        try:
            return json.loads(self.strengths)
        except:
            return []
    
    @strengths_list.setter
    def strengths_list(self, value):
        """Set strengths from list."""
        self.strengths = json.dumps(value)
    
    @property
    def weaknesses_list(self):
        """Get weaknesses as list."""
        try:
            return json.loads(self.weaknesses)
        except:
            return []
    
    @weaknesses_list.setter
    def weaknesses_list(self, value):
        """Set weaknesses from list."""
        self.weaknesses = json.dumps(value)
    
    def __repr__(self):
        return f'<User {self.email}>'


class Conversation(db.Model):
    """Conversation model for storing chat history."""
    
    __tablename__ = 'conversation'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    persona = db.Column(db.Text, nullable=True)  # Full text of the persona (keeping for compatibility)
    persona_id = db.Column(db.String(100), nullable=True)  # ID for vector persona retrieval
    
    # Archive flag
    is_archived = db.Column(db.Boolean, default=False)
    
    # Onboarding flag
    is_onboarding = db.Column(db.Boolean, default=False)
    
    # Session setup state
    session_setup_step = db.Column(db.String(50), nullable=False, default='confirm_context')

    # Sales context information (can be overridden from profile for a session)
    product_service = db.Column(db.Text, nullable=True)
    target_market = db.Column(db.String(50), nullable=True)
    sales_experience = db.Column(db.String(50), nullable=True)
    
    # Meta data for storing additional information like labels
    meta_data = db.Column(db.JSON, nullable=True)
    
    # NOTE: We'll use meta_data for storing saved state instead of a dedicated column
    # is_saved = db.Column(db.Boolean, default=False)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('conversations', lazy=True))
    messages = db.relationship('Message', backref='conversation', lazy=True, cascade='all, delete-orphan')
    feedback = db.relationship('Feedback', backref='conversation', uselist=False, lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Conversation {self.id} - {self.title}>'


class Message(db.Model):
    """Message model for storing individual chat messages."""
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Message {self.id}: {self.role}>'


class UserProfile(db.Model):
    """Extended profile for sales training users."""
    
    __tablename__ = 'user_profiles'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    
    # Onboarding status/step
    onboarding_complete = db.Column(db.Boolean, default=False)
    initial_setup_complete = db.Column(db.Boolean, default=False, nullable=False)
    onboarding_step = db.Column(db.String(50), default='product')  # Might repurpose or remove later
    onboarding_step_new = db.Column(db.Integer, default=0)

    # Sales context
    product_service = db.Column(db.Text, nullable=True)
    product_type = db.Column(db.String(100), nullable=True)
    target_market = db.Column(db.String(50), nullable=True)  # B2B, B2C, both
    industry = db.Column(db.String(100), nullable=True)
    experience_level = db.Column(db.String(50), nullable=True)  # Added back experience_level field
    
    # Pain points and goals
    pain_points = db.Column(db.Text, default='[]')  # JSON string with pain points
    recent_wins = db.Column(db.Text, default='[]')  # JSON string with recent wins
    mindset_challenges = db.Column(db.Text, default='[]')  # JSON string with challenges
    improvement_goals = db.Column(db.Text, default='[]')  # JSON string with goals
    
    # Training preferences
    preferred_training_style = db.Column(db.String(50), default='structured')  # structured, conversational, challenge-based
    preferred_feedback_frequency = db.Column(db.String(50), default='end-session')  # real-time, end-session, daily
    
    # Subscription tier
    subscription_tier = db.Column(db.String(20), default='free')  # 'free', 'premium', 'enterprise'
    
    # Safe property to handle missing subscription_tier column in database
    @property
    def safe_subscription_tier(self):
        """Safely get subscription tier with fallback to free tier if column doesn't exist."""
        try:
            return self.subscription_tier
        except Exception:
            return "free"
    
    # Performance tracking across sessions
    total_roleplays = db.Column(db.Integer, default=0)
    total_feedback_received = db.Column(db.Integer, default=0)
    last_roleplay_date = db.Column(db.DateTime, nullable=True)
    
    # Historical skill progress (to track improvements over time)
    skill_history = db.Column(db.Text, default='{}')  # JSON with timestamp -> skills mapping
    
    # Common objections and handling history
    common_objections = db.Column(db.Text, default='[]')  # JSON with objections encountered
    objection_handling_scores = db.Column(db.Text, default='{}')  # JSON with objection -> score mapping
    
    # Biases used vs biases missed
    biases_used = db.Column(db.Text, default='[]')  # JSON with biases properly leveraged
    biases_missed = db.Column(db.Text, default='[]')  # JSON with bias opportunities missed
    
    # Emotional intelligence and personality metrics
    emotional_intelligence_score = db.Column(db.Float, default=0.0)  # 0-10 scale
    empathy_score = db.Column(db.Float, nullable=True)
    active_listening_score = db.Column(db.Float, nullable=True)
    
    # Relationship to User
    user = db.relationship('User', backref=db.backref('profile', uselist=False, lazy=True))
    
    # Relationships
    training_sessions = db.relationship('TrainingSession', back_populates='user_profile', 
                                       lazy=True, foreign_keys='TrainingSession.user_profile_id')
    performance_metrics = db.relationship('PerformanceMetrics', backref='user_profile', lazy=True, cascade="all, delete-orphan")
    feedback_analysis = db.relationship('FeedbackAnalysis', backref='user_profile', lazy=True, cascade="all, delete-orphan")
    
    @property
    def pain_points_list(self):
        try:
            return json.loads(self.pain_points)
        except:
            return []
    
    @pain_points_list.setter
    def pain_points_list(self, value):
        self.pain_points = json.dumps(value)
    
    @property
    def recent_wins_list(self):
        try:
            return json.loads(self.recent_wins)
        except:
            return []
    
    @recent_wins_list.setter
    def recent_wins_list(self, value):
        self.recent_wins = json.dumps(value)
    
    @property
    def mindset_challenges_list(self):
        try:
            return json.loads(self.mindset_challenges)
        except:
            return []
    
    @mindset_challenges_list.setter
    def mindset_challenges_list(self, value):
        self.mindset_challenges = json.dumps(value)
    
    @property
    def improvement_goals_list(self):
        try:
            return json.loads(self.improvement_goals)
        except:
            return []
    
    @improvement_goals_list.setter
    def improvement_goals_list(self, value):
        self.improvement_goals = json.dumps(value)
        
    @property
    def skill_history_dict(self):
        try:
            return json.loads(self.skill_history)
        except:
            return {}
    
    @skill_history_dict.setter
    def skill_history_dict(self, value):
        self.skill_history = json.dumps(value)
        
    @property
    def common_objections_list(self):
        try:
            return json.loads(self.common_objections)
        except:
            return []
    
    @common_objections_list.setter
    def common_objections_list(self, value):
        self.common_objections = json.dumps(value)
        
    @property
    def objection_handling_scores_dict(self):
        try:
            return json.loads(self.objection_handling_scores)
        except:
            return {}
    
    @objection_handling_scores_dict.setter
    def objection_handling_scores_dict(self, value):
        self.objection_handling_scores = json.dumps(value)
        
    @property
    def biases_used_list(self):
        try:
            return json.loads(self.biases_used)
        except:
            return []
    
    @biases_used_list.setter
    def biases_used_list(self, value):
        self.biases_used = json.dumps(value)
        
    @property
    def biases_missed_list(self):
        try:
            return json.loads(self.biases_missed)
        except:
            return []
    
    @biases_missed_list.setter
    def biases_missed_list(self, value):
        self.biases_missed = json.dumps(value)
        
    def update_skill_history(self, skills_dict):
        """Add a new entry to skill history with timestamp"""
        history = self.skill_history_dict
        timestamp = datetime.utcnow().isoformat()
        history[timestamp] = skills_dict
        self.skill_history_dict = history
        
    def get_skill_trend(self, skill_name):
        """Get historical trend data for a specific skill"""
        history = self.skill_history_dict
        trend = []
        for timestamp, skills in sorted(history.items()):
            if skill_name in skills:
                trend.append({
                    'timestamp': timestamp,
                    'value': skills[skill_name]
                })
        return trend

    def get_skill_level(self, skill_name):
        """Get the current level of a specific skill."""
        history = self.skill_history_dict
        if not history:
            return 0
        
        # Get the most recent skill score
        latest_entry = max(history.keys())
        latest_skills = history[latest_entry]
        return latest_skills.get(skill_name, 0)

    def get_overall_skill_level(self):
        """Calculate overall skill level from all skills."""
        history = self.skill_history_dict
        if not history:
            return 0
        
        latest_entry = max(history.keys())
        latest_skills = history[latest_entry]
        if not latest_skills:
            return 0
            
        return sum(latest_skills.values()) / len(latest_skills)

    def __repr__(self):
        return f'<UserProfile user_id={self.user_id}>'
        
    def get_safe_emotional_intelligence_score(self, default=5.0):
        """Safely get emotional intelligence score with a default fallback."""
        if self.emotional_intelligence_score is None:
            return default
        return self.emotional_intelligence_score


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
    longterm_personal_description = db.Column(db.Text, nullable=True)  # JSON string
    shortterm_personal_description = db.Column(db.Text, nullable=True)  # JSON string
    demographic_description = db.Column(db.Text, nullable=True)  # JSON string
    linguistic_style_cue = db.Column(db.Text, nullable=True)
    chattiness_level = db.Column(db.String(50), nullable=True)

    # Caching flags
    is_cached = db.Column(db.Boolean, default=False)  # Flag for personas that can be reused across users
    is_legendary = db.Column(db.Boolean, default=False)  # Flag for special "legendary" personas
    cached_at = db.Column(db.DateTime, default=datetime.utcnow)  # When this persona was cached
    
    # Relationships
    training_sessions = db.relationship('TrainingSession', 
                                       primaryjoin="BuyerPersona.id == TrainingSession.persona_id",
                                       back_populates='persona', 
                                       lazy=True, foreign_keys='TrainingSession.persona_id')
    
    @property
    def personality_traits_dict(self):
        """Return personality traits as a dictionary."""
        try:
            if not self.personality_traits:
                return {}
            return json.loads(self.personality_traits)
        except:
            return {}
    
    @personality_traits_dict.setter
    def personality_traits_dict(self, value):
        self.personality_traits = json.dumps(value)
    
    @property
    def pain_points_list(self):
        try:
            return json.loads(self.pain_points)
        except:
            return []
    
    @pain_points_list.setter
    def pain_points_list(self, value):
        self.pain_points = json.dumps(value)
    
    @property
    def objections_list(self):
        try:
            return json.loads(self.objections)
        except:
            return []
    
    @objections_list.setter
    def objections_list(self, value):
        self.objections = json.dumps(value)
    
    @property
    def cognitive_biases_dict(self):
        try:
            return json.loads(self.cognitive_biases)
        except:
            return {}
    
    @cognitive_biases_dict.setter
    def cognitive_biases_dict(self, value):
        self.cognitive_biases = json.dumps(value)


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
    performance_metrics = db.relationship('PerformanceMetrics', backref='training_session',
                                         lazy=True, cascade='all, delete-orphan',
                                         foreign_keys='PerformanceMetrics.training_session_id')
    feedback_analysis = db.relationship('FeedbackAnalysis', backref='training_session',
                                       lazy=True, cascade='all, delete-orphan',
                                       foreign_keys='FeedbackAnalysis.session_id')
    
    def __repr__(self):
        return f'<TrainingSession {self.id}>'
    
    @property
    def conversation(self):
        """Return conversation history as a list of dictionaries."""
        try:
            return json.loads(self.conversation_json)
        except (json.JSONDecodeError, TypeError):
            return []
    
    @conversation.setter
    def conversation(self, value):
        """Set conversation history from a list of dictionaries."""
        self.conversation_json = json.dumps(value)
    
    @property
    def feedback(self):
        """Return feedback as a dictionary."""
        try:
            return json.loads(self.feedback_json)
        except (json.JSONDecodeError, TypeError):
            return {}
    
    @feedback.setter
    def feedback(self, value):
        """Set feedback from a dictionary."""
        self.feedback_json = json.dumps(value)

    @property
    def conversation_history_dict(self):
        """Alias for conversation property to maintain compatibility with existing code."""
        return self.conversation
    
    @conversation_history_dict.setter
    def conversation_history_dict(self, value):
        """Alias setter for conversation to maintain compatibility with existing code."""
        self.conversation = value


class PerformanceMetrics(db.Model):
    """Model for storing detailed performance metrics."""
    
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
    
    @property
    def bias_effectiveness_dict(self):
        try:
            return json.loads(self.bias_effectiveness)
        except:
            return {}
    
    @bias_effectiveness_dict.setter
    def bias_effectiveness_dict(self, value):
        self.bias_effectiveness = json.dumps(value)


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
    
    @property
    def strengths_demonstrated_list(self):
        """Return strengths demonstrated as a list."""
        if not self.strengths_demonstrated:
            return []
        try:
            return json.loads(self.strengths_demonstrated)
        except (json.JSONDecodeError, TypeError):
            return []
            
    @property
    def areas_for_improvement_list(self):
        """Return areas for improvement as a list."""
        if not self.areas_for_improvement:
            return []
        try:
            return json.loads(self.areas_for_improvement)
        except (json.JSONDecodeError, TypeError):
            return []
            
    @property
    def limiting_beliefs_detected_list(self):
        """Return limiting beliefs detected as a list."""
        if not self.limiting_beliefs_detected:
            return []
        try:
            return json.loads(self.limiting_beliefs_detected)
        except (json.JSONDecodeError, TypeError):
            return []
            
    @property
    def reframe_suggestions_list(self):
        """Return reframe suggestions as a list."""
        if not self.reframe_suggestions:
            return []
        try:
            return json.loads(self.reframe_suggestions)
        except (json.JSONDecodeError, TypeError):
            return []
            
    @property
    def action_items_list(self):
        """Return action items as a list."""
        if not self.action_items:
            return []
        try:
            return json.loads(self.action_items)
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
        return f'<SessionFeedback id={self.id} session_id={self.session_id}>'


class Feedback(db.Model):
    """Model to store generated feedback for a conversation."""
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'), nullable=False, unique=True) # Ensure one feedback per convo
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', name='fk_feedback_user_id'), nullable=False)
    feedback_text = db.Column(db.Text, nullable=False)
    model_used = db.Column(db.String(100), nullable=True) # e.g., 'gpt-4o-mini'
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    overall_score = db.Column(db.Float, nullable=True)
    skill_scores = db.Column(db.Text, default='{}')  # JSON string with skill scores
    
    @property
    def skill_scores_dict(self):
        """Get skill scores as dictionary."""
        try:
            return json.loads(self.skill_scores)
        except:
            return {}
            
    @skill_scores_dict.setter
    def skill_scores_dict(self, value):
        """Set skill scores from dictionary."""
        self.skill_scores = json.dumps(value)
    
    def __repr__(self):
        return f'<Feedback {self.id} for Conversation {self.conversation_id}>'

# Moved FeatureVote definition higher
class FeatureVote(db.Model):
    """Stores user votes and comments for potential PitchEdu features."""
    __tablename__ = 'feature_vote'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', name='fk_feature_vote_user_id'), nullable=False)
    feature_id_voted_for = db.Column(db.String(100), nullable=False) # Matches the ID from the form
    comments = db.Column(db.Text, nullable=True)
    voted_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship back to User (optional but good practice)
    user = db.relationship('User', backref=db.backref('feature_votes', lazy=True))

    def __repr__(self):
        return f'<FeatureVote {self.id} by User {self.user_id} for {self.feature_id_voted_for}>'

class SalesStage(db.Model):
    """Model for customizable sales process stages."""
    
    __tablename__ = 'sales_stage'
    
    id = db.Column(db.Integer, primary_key=True)
    user_profile_id = db.Column(db.Integer, db.ForeignKey('user_profiles.id'))  # For user-specific stages
    name = db.Column(db.String(50), nullable=False)  # stage name: rapport, discovery, etc.
    display_name = db.Column(db.String(100), nullable=False)  # User-friendly name
    description = db.Column(db.Text)  # Description of the stage
    order = db.Column(db.Integer, nullable=False)  # Order in the sales process
    is_active = db.Column(db.Boolean, default=True)  # Whether this stage is currently used
    is_default = db.Column(db.Boolean, default=False)  # Is this a system default stage
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user profile
    user_profile = db.relationship('UserProfile', backref=db.backref('sales_stages', lazy=True))
    
    def __repr__(self):
        return f'<SalesStage {self.name}>'

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
    
    def __init__(self, training_session_id, **kwargs):
        self.training_session_id = training_session_id
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    @property
    def pain_point_details_dict(self):
        """Get pain point details as a dictionary."""
        try:
            return json.loads(self.pain_point_details)
        except:
            return {}
    
    @pain_point_details_dict.setter
    def pain_point_details_dict(self, value):
        """Set pain point details from a dictionary."""
        self.pain_point_details = json.dumps(value)
    
    def to_dict(self):
        """Convert model to dictionary."""
        result = {}
        for column in self.__table__.columns:
            if column.name != 'pain_point_details':
                result[column.name] = getattr(self, column.name)
        
        # Add parsed pain points
        result['pain_point_details'] = self.pain_point_details_dict
        return result

# Add the relationship to TrainingSession if it doesn't exist
if not hasattr(TrainingSession, 'metrics'):
    TrainingSession.metrics = db.relationship(
        'SessionMetrics', 
        backref='session',
        uselist=False, 
        cascade='all, delete-orphan',
        primaryjoin="TrainingSession.id == SessionMetrics.training_session_id"
    )

class NameUsageTracker(db.Model):
    """Track names used for buyer personas to ensure diversity."""
    __tablename__ = 'name_usage_tracker'
    
    id = db.Column(db.Integer, primary_key=True)
    user_profile_id = db.Column(db.Integer, db.ForeignKey('user_profiles.id'), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    used_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user_profile = db.relationship('UserProfile', backref=db.backref('name_usages', lazy=True))
    
    def __repr__(self):
        return f'<NameUsageTracker {self.full_name} for user {self.user_profile_id}>'