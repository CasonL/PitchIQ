"""
Database initialization script to create all SQLAlchemy tables

This script directly imports models from app/models.py and creates tables
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from flask import Flask

print("Creating database tables...")

# Create a minimal Flask app
app = Flask(__name__)

# Use absolute path for the database file
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, 'instance', 'salestrainer.db')
os.makedirs(os.path.dirname(db_path), exist_ok=True)
print(f"Database path: {db_path}")

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Import all the models to ensure they're registered with SQLAlchemy
from app.extensions import db
from app.models import (
    User, UserProfile, BuyerPersona, TrainingSession,
    PerformanceMetrics, FeedbackAnalysis, SessionFeedback,
    SessionMetrics, NameUsageTracker, Conversation, Message,
    Feedback, FeatureVote, SalesStage
)

# Initialize database with app
db.init_app(app)

# Create all tables
with app.app_context():
    print("Creating database directory...")
    
    print("Creating tables...")
    db.create_all()
    
    print("Checking if tables were created...")
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Created tables: {tables}")
    
    print("Database initialization completed successfully!")

if __name__ == "__main__":
    print("Script execution completed.") 