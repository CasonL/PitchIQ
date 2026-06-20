"""Call recording model for storing audio and emotion analysis."""

from datetime import datetime
import json
from app.extensions import db


class CallRecording(db.Model):
    """Store call recordings and emotion analysis for post-call feedback."""
    __tablename__ = 'call_recordings'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(255), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    audio_path = db.Column(db.String(500), nullable=False)  # Local path or S3 URL
    duration_seconds = db.Column(db.Float, nullable=True)
    emotion_analysis = db.Column(db.Text, nullable=True)  # JSON string from Hume
    status = db.Column(db.String(50), default='uploaded')  # uploaded, analyzing, analyzed, error
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('call_recordings', lazy=True))
    
    @property
    def emotion_analysis_dict(self):
        """Get emotion analysis as dictionary."""
        if not self.emotion_analysis:
            return {}
        try:
            return json.loads(self.emotion_analysis)
        except json.JSONDecodeError:
            return {}
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'audio_path': self.audio_path,
            'duration_seconds': self.duration_seconds,
            'emotion_analysis': self.emotion_analysis_dict,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
