import sqlite3
import os
import shutil
from datetime import datetime

# Backup the old database
if os.path.exists('instance/sales_training.db'):
    backup_path = f'instance/sales_training.db.bak.{datetime.now().strftime("%Y%m%d%H%M%S")}'
    shutil.copy2('instance/sales_training.db', backup_path)
    print(f"Created backup at {backup_path}")

# Create a new database
conn = sqlite3.connect('instance/sales_training.db.new')
cursor = conn.cursor()

# Create all required tables
# User table
cursor.execute('''
CREATE TABLE user (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    role TEXT,
    completed_roleplays INTEGER DEFAULT 0,
    sales_skills TEXT DEFAULT '{}',
    strengths TEXT DEFAULT '[]',
    weaknesses TEXT DEFAULT '[]',
    google_id TEXT,
    reset_token TEXT,
    reset_token_expires DATETIME
)
''')

# User Profile table
cursor.execute('''
CREATE TABLE user_profile (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES user (id)
)
''')

# Buyer Persona table
cursor.execute('''
CREATE TABLE buyer_persona (
    id INTEGER PRIMARY KEY,
    name TEXT,
    description TEXT,
    company TEXT,
    role TEXT,
    pain_points TEXT,
    goals TEXT,
    created_at DATETIME,
    updated_at DATETIME
)
''')

# Training Session table
cursor.execute('''
CREATE TABLE training_session (
    id INTEGER PRIMARY KEY,
    user_profile_id INTEGER,
    buyer_persona_id INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    status TEXT,
    conversation_history TEXT,
    key_moments TEXT,
    objections_handled TEXT,
    trust_score FLOAT,
    persuasion_rating FLOAT,
    confidence_score FLOAT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (user_profile_id) REFERENCES user_profile (id),
    FOREIGN KEY (buyer_persona_id) REFERENCES buyer_persona (id)
)
''')

# Alembic version table
cursor.execute('''
CREATE TABLE alembic_version (
    version_num TEXT NOT NULL
)
''')

# Set the migration version to include the timestamp fields
cursor.execute("INSERT INTO alembic_version (version_num) VALUES ('b3abebdf4435')")

conn.commit()
conn.close()

print("New database created at instance/sales_training.db.new")
print("You can replace the original file with this one when all processes are stopped.")
print("Use: copy instance\\sales_training.db.new instance\\sales_training.db") 