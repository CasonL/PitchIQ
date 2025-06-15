"""
User-related database models for the Sales Training AI application.
"""

from datetime import datetime
import json
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app.extensions import db

class User(db.Model, UserMixin):
    """User model for authentication and profile data."""
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'user'
    
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
                from flask import current_app
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

    # Personalization Form Data
    coach_persona = db.Column(db.Text, nullable=True) # AI-generated summary
    p_product = db.Column(db.Text, nullable=True)
    p_value_prop = db.Column(db.Text, nullable=True)
    p_audience = db.Column(db.Text, nullable=True)
    p_sales_context = db.Column(db.Text, nullable=True)
    p_sales_methodology = db.Column(db.Text, nullable=True)
    p_improvement_goal = db.Column(db.Text, nullable=True)

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
    
    # Premium plan tracking
    premium_start_date = db.Column(db.DateTime, nullable=True)
    premium_end_date = db.Column(db.DateTime, nullable=True)
    payment_status = db.Column(db.String(20), default='active')  # 'active', 'cancelled', 'expired'
    
    # Usage limits (monthly)
    monthly_roleplay_limit = db.Column(db.Integer, default=15)  # Free tier: 15, Premium: unlimited
    current_month_roleplays = db.Column(db.Integer, default=0)
    month_reset_date = db.Column(db.DateTime, default=lambda: datetime.utcnow().replace(day=1))
    
    # Premium features access
    has_advanced_coaching = db.Column(db.Boolean, default=False)
    has_unlimited_roleplays = db.Column(db.Boolean, default=False)
    has_detailed_analytics = db.Column(db.Boolean, default=False)
    
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
    empathy_score = db.Column(db.Float, nullable=True)
    active_listening_score = db.Column(db.Float, nullable=True)
    
    # Relationship to User
    user = db.relationship('User', backref=db.backref('profile', uselist=False, lazy=True))
    
    @property
    def safe_subscription_tier(self):
        """Safely get subscription tier with fallback to free tier if column doesn't exist."""
        try:
            return self.subscription_tier
        except Exception:
            return "free"
            
    @property
    def pain_points_list(self):
        """Get pain points as list."""
        try:
            return json.loads(self.pain_points)
        except:
            return []
    
    @pain_points_list.setter
    def pain_points_list(self, value):
        """Set pain points from list."""
        self.pain_points = json.dumps(value)
    
    @property
    def recent_wins_list(self):
        """Get recent wins as list."""
        try:
            return json.loads(self.recent_wins)
        except:
            return []
    
    @recent_wins_list.setter
    def recent_wins_list(self, value):
        """Set recent wins from list."""
        self.recent_wins = json.dumps(value)
    
    @property
    def mindset_challenges_list(self):
        """Get mindset challenges as list."""
        try:
            return json.loads(self.mindset_challenges)
        except:
            return []
    
    @mindset_challenges_list.setter
    def mindset_challenges_list(self, value):
        """Set mindset challenges from list."""
        self.mindset_challenges = json.dumps(value)
    
    @property
    def improvement_goals_list(self):
        """Get improvement goals as list."""
        try:
            return json.loads(self.improvement_goals)
        except:
            return []
    
    @improvement_goals_list.setter
    def improvement_goals_list(self, value):
        """Set improvement goals from list."""
        self.improvement_goals = json.dumps(value)
    
    @property
    def skill_history_dict(self):
        """Get skill history as dictionary."""
        try:
            return json.loads(self.skill_history)
        except:
            return {}
    
    @skill_history_dict.setter
    def skill_history_dict(self, value):
        """Set skill history from dictionary."""
        self.skill_history = json.dumps(value)
    
    @property
    def common_objections_list(self):
        """Get common objections as list."""
        try:
            return json.loads(self.common_objections)
        except:
            return []
    
    @common_objections_list.setter
    def common_objections_list(self, value):
        """Set common objections from list."""
        self.common_objections = json.dumps(value)
    
    @property
    def objection_handling_scores_dict(self):
        """Get objection handling scores as dictionary."""
        try:
            return json.loads(self.objection_handling_scores)
        except:
            return {}
    
    @objection_handling_scores_dict.setter
    def objection_handling_scores_dict(self, value):
        """Set objection handling scores from dictionary."""
        self.objection_handling_scores = json.dumps(value)
    
    @property
    def biases_used_list(self):
        """Get biases used as list."""
        try:
            return json.loads(self.biases_used)
        except:
            return []
    
    @biases_used_list.setter
    def biases_used_list(self, value):
        """Set biases used from list."""
        self.biases_used = json.dumps(value)
    
    @property
    def biases_missed_list(self):
        """Get biases missed as list."""
        try:
            return json.loads(self.biases_missed)
        except:
            return []
    
    @biases_missed_list.setter
    def biases_missed_list(self, value):
        """Set biases missed from list."""
        self.biases_missed = json.dumps(value)
    
    def update_skill_history(self, skills_dict):
        """Update skill history with current skills."""
        history = self.skill_history_dict
        history[datetime.utcnow().isoformat()] = skills_dict
        self.skill_history = json.dumps(history)
    
    def get_skill_trend(self, skill_name):
        """Get trend for a specific skill."""
        history = self.skill_history_dict
        trend_data = {ts: skills.get(skill_name, 0) for ts, skills in history.items()}
        # Simple trend calculation (could be more sophisticated)
        if len(trend_data) < 2:
            return "stable"
        
        scores = list(trend_data.values())
        return "improving" if scores[-1] > scores[0] else "declining"
    
    def get_skill_level(self, skill_name):
        """Get the latest score for a specific skill."""
        history = self.skill_history_dict
        if not history:
            return 0
        latest_timestamp = max(history.keys())
        return history[latest_timestamp].get(skill_name, 0)
    
    def get_overall_skill_level(self):
        """Get the average of all latest skill scores."""
        history = self.skill_history_dict
        if not history:
            return 0
        latest_timestamp = max(history.keys())
        latest_skills = history[latest_timestamp]
        if not latest_skills:
            return 0
        return sum(latest_skills.values()) / len(latest_skills)
    
    def is_premium(self):
        """Check if user has active premium subscription."""
        return (self.subscription_tier == 'premium' and 
                self.payment_status == 'active' and
                (self.premium_end_date is None or self.premium_end_date > datetime.utcnow()))
    
    def can_use_roleplays(self):
        """Check if user can use roleplays based on their plan and usage."""
        if self.is_premium():
            return True
        
        # Reset monthly counter if needed
        if datetime.utcnow() >= self.month_reset_date:
            self.reset_monthly_usage()
        
        return self.current_month_roleplays < self.monthly_roleplay_limit
    
    def reset_monthly_usage(self):
        """Reset monthly usage counters."""
        self.current_month_roleplays = 0
        # Set next reset date to first day of next month
        current_date = datetime.utcnow()
        if current_date.month == 12:
            next_month = current_date.replace(year=current_date.year + 1, month=1, day=1)
        else:
            next_month = current_date.replace(month=current_date.month + 1, day=1)
        self.month_reset_date = next_month
    
    def upgrade_to_premium(self):
        """Upgrade user to premium plan."""
        self.subscription_tier = 'premium'
        self.premium_start_date = datetime.utcnow()
        self.premium_end_date = None  # No end date for active subscriptions
        self.payment_status = 'active'
        self.has_advanced_coaching = True
        self.has_unlimited_roleplays = True
        self.has_detailed_analytics = True
    
    def downgrade_to_free(self):
        """Downgrade user to free plan."""
        self.subscription_tier = 'free'
        self.premium_end_date = datetime.utcnow()
        self.payment_status = 'cancelled'
        self.has_advanced_coaching = False
        self.has_unlimited_roleplays = False
        self.has_detailed_analytics = False
        self.monthly_roleplay_limit = 15
    
    def increment_roleplay_usage(self):
        """Increment monthly roleplay usage."""
        self.current_month_roleplays += 1
        self.total_roleplays += 1
    
    def get_usage_stats(self):
        """Get user's current usage statistics."""
        return {
            'tier': self.subscription_tier,
            'is_premium': self.is_premium(),
            'monthly_roleplays_used': self.current_month_roleplays,
            'monthly_roleplay_limit': self.monthly_roleplay_limit if not self.is_premium() else 'unlimited',
            'can_use_roleplays': self.can_use_roleplays(),
            'total_roleplays': self.total_roleplays,
            'premium_features': {
                'advanced_coaching': self.has_advanced_coaching,
                'unlimited_roleplays': self.has_unlimited_roleplays,
                'detailed_analytics': self.has_detailed_analytics
            }
        }
    
    def __repr__(self):
        return f'<UserProfile {self.user_id}>'
    
    def get_safe_emotional_intelligence_score(self, default=5.0):
        """Safely get empathy and active listening scores."""
        empathy = self.empathy_score if self.empathy_score is not None else default
        active_listening = self.active_listening_score if self.active_listening_score is not None else default
        return {"empathy": empathy, "active_listening": active_listening} 