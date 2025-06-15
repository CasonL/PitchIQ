"""
Conversation and Message models for the Sales Training AI application.
"""
from datetime import datetime
from app.extensions import db

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