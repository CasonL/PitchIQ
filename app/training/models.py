from app import db
from app.models import TrainingSession

# Add the get_messages method to TrainingSession in its original location
# by monkey patching the existing model class
def get_messages(self):
    """Returns conversation history as a list of message dictionaries."""
    return self.conversation_history_dict

# Add the method to the existing TrainingSession class
TrainingSession.get_messages = get_messages

# Add the metrics relationship to the existing TrainingSession class
if not hasattr(TrainingSession, 'metrics'):
    TrainingSession.metrics = db.relationship('SessionMetrics', backref='session', 
                                           uselist=False, cascade='all, delete-orphan')

# SessionMetrics model has been moved to app/models.py 