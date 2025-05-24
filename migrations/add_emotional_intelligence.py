from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
import sys
from datetime import datetime
from sqlalchemy import inspect, text

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import db
from app.models import TrainingSession, FeedbackAnalysis
from sqlalchemy import Column, Float, Text

def add_emotional_intelligence_columns():
    """
    Add emotional intelligence columns to the TrainingSession and FeedbackAnalysis tables.
    """
    print("Starting migration to add emotional intelligence columns...")
    
    # Create inspector
    inspector = inspect(db.engine)
    
    # Check if the TrainingSession table exists
    if 'training_session' not in inspector.get_table_names():
        print("Table 'training_session' does not exist. Migration aborted.")
        return False
        
    # Check if the FeedbackAnalysis table exists
    if 'feedback_analysis' not in inspector.get_table_names():
        print("Table 'feedback_analysis' does not exist. Migration aborted.")
        return False
        
    # Connect to the database
    connection = db.engine.connect()
    transaction = connection.begin()
    
    try:
        # Check if the columns already exist in TrainingSession
        existing_columns_ts = [c['name'] for c in inspector.get_columns('training_session')]
        
        # Add emotional intelligence columns to TrainingSession if they don't exist
        columns_to_add_ts = []
        if 'emotional_awareness_score' not in existing_columns_ts:
            columns_to_add_ts.append("ALTER TABLE training_session ADD COLUMN emotional_awareness_score FLOAT DEFAULT 70.0")
        if 'empathy_score' not in existing_columns_ts:
            columns_to_add_ts.append("ALTER TABLE training_session ADD COLUMN empathy_score FLOAT DEFAULT 70.0")
        if 'rapport_score' not in existing_columns_ts:
            columns_to_add_ts.append("ALTER TABLE training_session ADD COLUMN rapport_score FLOAT DEFAULT 70.0")
        if 'question_quality_score' not in existing_columns_ts:
            columns_to_add_ts.append("ALTER TABLE training_session ADD COLUMN question_quality_score FLOAT DEFAULT 75.0")
            
        # Execute the TrainingSession column additions
        for sql in columns_to_add_ts:
            connection.execute(text(sql))
            print(f"Executed: {sql}")
            
        # Check if the columns already exist in FeedbackAnalysis
        existing_columns_fa = [c['name'] for c in inspector.get_columns('feedback_analysis')]
        
        # Add emotional intelligence columns to FeedbackAnalysis if they don't exist
        columns_to_add_fa = []
        if 'emotional_intelligence_feedback' not in existing_columns_fa:
            columns_to_add_fa.append("ALTER TABLE feedback_analysis ADD COLUMN emotional_intelligence_feedback TEXT")
        if 'question_quality_feedback' not in existing_columns_fa:
            columns_to_add_fa.append("ALTER TABLE feedback_analysis ADD COLUMN question_quality_feedback TEXT")
        if 'emotional_awareness_score' not in existing_columns_fa:
            columns_to_add_fa.append("ALTER TABLE feedback_analysis ADD COLUMN emotional_awareness_score FLOAT DEFAULT 70.0")
        if 'empathy_score' not in existing_columns_fa:
            columns_to_add_fa.append("ALTER TABLE feedback_analysis ADD COLUMN empathy_score FLOAT DEFAULT 70.0")
        if 'rapport_score' not in existing_columns_fa:
            columns_to_add_fa.append("ALTER TABLE feedback_analysis ADD COLUMN rapport_score FLOAT DEFAULT 70.0")
        if 'question_quality_score' not in existing_columns_fa:
            columns_to_add_fa.append("ALTER TABLE feedback_analysis ADD COLUMN question_quality_score FLOAT DEFAULT 75.0")
        if 'error_message' not in existing_columns_fa:
            columns_to_add_fa.append("ALTER TABLE feedback_analysis ADD COLUMN error_message TEXT")
            
        # Execute the FeedbackAnalysis column additions
        for sql in columns_to_add_fa:
            connection.execute(text(sql))
            print(f"Executed: {sql}")
            
        # Commit the transaction
        transaction.commit()
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        # Roll back the transaction if an error occurs
        transaction.rollback()
        print(f"Error during migration: {str(e)}")
        return False
        
    finally:
        # Close the connection
        connection.close()

if __name__ == "__main__":
    # Create a minimal Flask app for this migration
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize the app with the extension
    db.init_app(app)
    
    # Run the migration within the app context
    with app.app_context():
        add_emotional_intelligence_columns() 