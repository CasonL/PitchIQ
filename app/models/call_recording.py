"""Call recording model for storing turn-based audio and vocal metrics."""

from datetime import datetime
import json
from app.extensions import db


class CallRecording(db.Model):
    """Store call recording session metadata."""
    __tablename__ = 'call_recordings'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(255), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    duration_seconds = db.Column(db.Float, nullable=True)
    transcript = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='processing')  # processing, ready, error
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('call_recordings', lazy=True))
    turns = db.relationship('CallTurn', backref='call_recording', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'duration_seconds': self.duration_seconds,
            'transcript': self.transcript,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'turns': [turn.to_dict() for turn in self.turns]
        }


class CallTurn(db.Model):
    """Store a single conversational turn (user or AI) with audio and metrics."""
    __tablename__ = 'call_turns'
    
    id = db.Column(db.Integer, primary_key=True)
    call_recording_id = db.Column(db.Integer, db.ForeignKey('call_recordings.id'), nullable=False)
    turn_id = db.Column(db.String(100), nullable=False)
    speaker = db.Column(db.String(20), nullable=False)  # 'user' or 'ai'
    text = db.Column(db.Text, nullable=True)
    audio_path = db.Column(db.String(500), nullable=True)
    start_ms = db.Column(db.Integer, nullable=True)
    end_ms = db.Column(db.Integer, nullable=True)
    metrics = db.Column(db.Text, nullable=True)  # JSON: wpm, filler_count, pauses, etc.
    word_timestamps = db.Column(db.Text, nullable=True)  # JSON array
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<CallTurn {self.turn_id} {self.speaker}>'
    
    @property
    def metrics_dict(self):
        if not self.metrics:
            return {}
        try:
            return json.loads(self.metrics)
        except json.JSONDecodeError:
            return {}
    
    @property
    def word_timestamps_list(self):
        if not self.word_timestamps:
            return []
        try:
            return json.loads(self.word_timestamps)
        except json.JSONDecodeError:
            return []
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'turn_id': self.turn_id,
            'speaker': self.speaker,
            'text': self.text,
            'audio_path': self.audio_path,
            'start_ms': self.start_ms,
            'end_ms': self.end_ms,
            'duration_ms': (self.end_ms - self.start_ms) if self.end_ms and self.start_ms else None,
            'metrics': self.metrics_dict,
            'word_timestamps': self.word_timestamps_list,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
