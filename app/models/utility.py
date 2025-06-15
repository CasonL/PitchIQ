"""
Utility and miscellaneous models for the Sales Training AI application.
"""
from datetime import datetime
from app.extensions import db

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
        return f'<FeatureVote for {self.feature_id_voted_for} by user {self.user_id}>'


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
        return f'<NameUsageTracker for {self.full_name}>'


class EmailSignup(db.Model):
    """Model for storing email signups with preferences and computer tracking."""
    __tablename__ = 'email_signups'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    early_access = db.Column(db.Boolean, default=False)
    get_updates = db.Column(db.Boolean, default=False)
    computer_fingerprint = db.Column(db.String(255), nullable=True)  # To track unique computers
    ip_address = db.Column(db.String(45), nullable=True)  # Store IP for additional tracking
    user_agent = db.Column(db.Text, nullable=True)  # Store user agent string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<EmailSignup {self.email}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'early_access': self.early_access,
            'get_updates': self.get_updates,
            'created_at': self.created_at.isoformat()
        } 