"""
Models Package Initialization

This file imports all models from their respective modules and sets up any
cross-module relationships. This allows other parts of the application to
import any model directly from `app.models` (e.g., `from app.models import User`).
"""
from app.extensions import db

from .user import User, UserProfile
from .conversation import Conversation, Message
from .persona import BuyerPersona
from .training import TrainingSession, PerformanceMetrics, SessionMetrics
from .feedback import Feedback, FeedbackAnalysis, SessionFeedback
from .utility import FeatureVote, SalesStage, NameUsageTracker, EmailSignup

# --- Define Relationships that cross modules ---

# Relationship from UserProfile to TrainingSession, etc.
UserProfile.training_sessions = db.relationship('TrainingSession', back_populates='user_profile', lazy='dynamic', foreign_keys='TrainingSession.user_profile_id')
UserProfile.performance_metrics = db.relationship('PerformanceMetrics', backref='user_profile', lazy='dynamic', cascade="all, delete-orphan")

# Relationship from BuyerPersona to TrainingSession
BuyerPersona.training_sessions = db.relationship('TrainingSession', back_populates='persona', lazy='dynamic', foreign_keys='TrainingSession.persona_id')

# Relationships from TrainingSession back to other models have already been defined in their respective files
# using back_populates or backref, so we don't need to redefine them here.
# For example, `TrainingSession.user_profile` is already defined in `training.py`. 