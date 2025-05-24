#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Environment Variables Consolidation Tool

This script consolidates environment variables from multiple .env files 
into a single, comprehensive .env file. It also verifies the presence of
critical variables and provides a template for missing ones.
"""

import os
import re
import argparse
from pathlib import Path

# Template for a comprehensive .env file
ENV_TEMPLATE = """# PitchIQ Sales Training AI - Environment Configuration
# ---------------------------------------------------------------------------
# This file contains all environment variables for the application
# Values here can be overridden by command-line arguments to app.py

# Application Settings
# ---------------------------------------------------------------------------
FLASK_APP=app.py
FLASK_ENV={flask_env}
FLASK_DEBUG={flask_debug}
HOST={host}
PORT={port}
SECRET_KEY={secret_key}

# Database Configuration
# ---------------------------------------------------------------------------
SQLALCHEMY_DATABASE_URI={db_uri}
SQLALCHEMY_TRACK_MODIFICATIONS=false

# API Keys - Keep these secure!
# ---------------------------------------------------------------------------
# AI Service Keys
OPENAI_API_KEY={openai_key}
ANTHROPIC_API_KEY={anthropic_key}
ELEVEN_LABS_API_KEY={eleven_labs_key}
DEEPGRAM_API_KEY={deepgram_key}

# Authentication
# ---------------------------------------------------------------------------
# OAuth settings
GOOGLE_CLIENT_ID={google_client_id}
GOOGLE_CLIENT_SECRET={google_client_secret}

# Security
# ---------------------------------------------------------------------------
# Session settings
SESSION_TYPE=filesystem
PERMANENT_SESSION_LIFETIME=86400  # 24 hours in seconds
SESSION_COOKIE_SECURE=false       # Set to true in production

# Rate limiting
RATE_LIMIT_WINDOW=60  # Window in seconds
RATE_LIMIT=10         # Max requests per window
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=300      # Seconds (5 minutes)

# Email Configuration
# ---------------------------------------------------------------------------
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME={smtp_username}
SMTP_PASSWORD={smtp_password}
FROM_EMAIL={from_email}

# Debugging and Logging
# ---------------------------------------------------------------------------
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
"""

def find_env_files():
    """Find all .env-type files in the project."""
    env_files = []
    for path in Path(".").rglob("*.env*"):
        # Skip virtual environment files
        if ".venv" in str(path) or "__pycache__" in str(path):
            continue
        env_files.append(str(path))
    return env_files

def extract_variables(env_file):
    """Extract variables from an env file."""
    variables = {}
    if not os.path.exists(env_file):
        print(f"File not found: {env_file}")
        return variables
    
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith('#'):
                    continue
                # Extract variable assignments
                match = re.match(r'^([A-Za-z0-9_]+)=(.*)$', line)
                if match:
                    key, value = match.groups()
                    # Strip quotes if present
                    value = value.strip('"\'')
                    variables[key] = value
    except Exception as e:
        print(f"Error reading {env_file}: {e}")
    
    return variables

def consolidate_env_files(output_file='.env'):
    """Consolidate all env files into a single file."""
    env_files = find_env_files()
    all_variables = {}
    
    print(f"Found {len(env_files)} .env files to process.")
    for env_file in env_files:
        print(f"Processing: {env_file}")
        variables = extract_variables(env_file)
        all_variables.update(variables)
    
    # Ensure critical variables have values
    defaults = {
        'flask_env': all_variables.get('FLASK_ENV', 'development'),
        'flask_debug': all_variables.get('FLASK_DEBUG', 'true'),
        'host': all_variables.get('HOST', '0.0.0.0'),
        'port': all_variables.get('PORT', '8081'),
        'secret_key': all_variables.get('SECRET_KEY', 'replace_with_secure_random_key_in_production'),
        'db_uri': all_variables.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///instance/app.db'),
        'openai_key': all_variables.get('OPENAI_API_KEY', ''),
        'anthropic_key': all_variables.get('ANTHROPIC_API_KEY', ''),
        'eleven_labs_key': all_variables.get('ELEVEN_LABS_API_KEY', ''),
        'deepgram_key': all_variables.get('DEEPGRAM_API_KEY', ''),
        'google_client_id': all_variables.get('GOOGLE_CLIENT_ID', ''),
        'google_client_secret': all_variables.get('GOOGLE_CLIENT_SECRET', ''),
        'smtp_username': all_variables.get('SMTP_USERNAME', ''),
        'smtp_password': all_variables.get('SMTP_PASSWORD', ''),
        'from_email': all_variables.get('FROM_EMAIL', '')
    }
    
    # Generate the consolidated .env file
    env_content = ENV_TEMPLATE.format(**defaults)
    
    # Add any additional variables not in template
    additional_vars = []
    for key, value in all_variables.items():
        if key not in [
            'FLASK_ENV', 'FLASK_DEBUG', 'HOST', 'PORT', 'SECRET_KEY',
            'SQLALCHEMY_DATABASE_URI', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
            'ELEVEN_LABS_API_KEY', 'DEEPGRAM_API_KEY', 'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'FROM_EMAIL'
        ]:
            additional_vars.append(f"{key}={value}")
    
    if additional_vars:
        env_content += "\n# Additional Variables\n# ---------------------------------------------------------------------------\n"
        env_content += "\n".join(additional_vars)
        env_content += "\n"
    
    # Write the consolidated .env file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print(f"Consolidated environment variables into {output_file}")
    print(f"Total variables: {len(all_variables)}")
    
    # Check for missing critical variables
    critical_vars = ['OPENAI_API_KEY', 'SECRET_KEY']
    missing = [var for var in critical_vars if not all_variables.get(var)]
    if missing:
        print("\nWARNING: The following critical variables are missing or empty:")
        for var in missing:
            print(f"  - {var}")

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Consolidate environment variables from multiple .env files')
    parser.add_argument('--output', default='.env', help='Output file name (default: .env)')
    return parser.parse_args()

if __name__ == '__main__':
    args = parse_arguments()
    consolidate_env_files(args.output) 