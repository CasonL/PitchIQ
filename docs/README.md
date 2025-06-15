# SalesTraining AI

An AI-powered sales training platform with voice interaction capabilities.

## Project Overview

This application combines a Python (Flask) backend with a React frontend to create an interactive sales training experience. Key features include:

- Chat-based training sessions with AI conversation
- Voice interaction with visual feedback
- Training session analytics and feedback
- User profile and progress tracking

## Simplified Project Structure

The application uses a simplified structure:

```
salestraining-ai/
├── app/                  # Main application code
│   ├── frontend/         # React frontend
│   ├── auth/             # Authentication functionality
│   ├── chat/             # Chat interface functionality
│   ├── voice/            # Voice processing functionality
│   ├── training/         # Training session functionality
│   ├── templates/        # Flask templates
│   ├── static/           # Static assets
│   └── ...
├── scripts/              # Utility scripts
├── tests/                # Test files
├── .env                  # Environment variables (single source of truth)
├── run_app.py            # Main application runner
└── run_backend.py        # Backend-only runner
```

## Setup Instructions

### Environment Setup

1. Clone the repository
2. Create a Python virtual environment:
   ```
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Setup the environment file:
   ```
   python consolidate_env.py
   ```
   This will create a unified `.env` file from existing environment files.

5. Frontend setup:
   ```
   cd app/frontend
   npm install
   ```

### Running the Application

To run the complete application:

1. Start the backend server:
   ```
   python run_backend.py
   ```

2. In another terminal, start the frontend development server:
   ```
   cd app/frontend
   npm run dev
   ```

3. Access the application at: http://localhost:8080

## API Keys Required

The application requires the following API keys:

- OpenAI API Key - for AI conversation
- Anthropic API Key - for Claude AI integration
- ElevenLabs API Key - for text-to-speech
- (Optional) Deepgram API Key - for speech recognition

Add these to your `.env` file.

## Troubleshooting

If you encounter issues with the chat page:

1. Make sure both frontend and backend servers are running
2. Check that port 8081 is available for the backend server
3. Verify that all required API keys are correctly set in the `.env` file
4. Check browser console and backend logs for error messages

For more detailed troubleshooting, see `CLEANUP.md`.

## Project Simplification

The project has been simplified to reduce redundancy:

1. Consolidated environment files (flask.env → .env)
2. Removed hardcoded API keys
3. Improved frontend-backend integration
4. Fixed chat functionality

Use the following utility scripts for further cleanup:
- `consolidate_env.py` - Combines environment files
- `cleanup_project.py` - Identifies redundant code and files

# Sales Training AI - Name Diversity Feature

## Name Diversity for Buyer Personas

This feature ensures that buyer personas in roleplay sessions have diverse, non-repetitive names:

### Rules

1. The same first name cannot be used in 5 consecutive roleplays for a user
2. The same last name cannot be used in 5 consecutive roleplays for a user
3. The exact same name combination (full name) is never reused for a user

### Implementation Details

- Names are tracked per user in the `name_usage_tracker` table
- When generating a new buyer persona, the system checks against recently used names
- If a name violates the diversity rules, a new name is automatically generated
- The system maintains a large pool of first and last names for variety
- Name tracking considers case-insensitive matching

### Database Schema

The `name_usage_tracker` table has the following structure:
- `id`: Primary key
- `user_profile_id`: Foreign key to user_profile table
- `first_name`: First name used
- `last_name`: Last name used
- `full_name`: Complete full name
- `used_at`: Timestamp when the name was used

### Email Signup Database

The database schema for email signups, used for collecting data for user profiles and a planned ambitious project, is managed using DBeaver. This ensures a clear and organized structure for this critical data.

### Running Migration

#### In Windows PowerShell:

To add this feature to an existing database, run:

```powershell
# Run just the name tracker migration
python migrations/create_name_usage_tracker.py

# Or run all migrations
python run_migrations.py
```

#### In Command Prompt or Bash:

```bash
# Run just the name tracker migration
python migrations/create_name_usage_tracker.py

# Or run all migrations
python run_migrations.py
```

### Testing the Feature

Once you've added the table, new buyer personas generated during roleplay sessions will automatically follow the name diversity rules. The system will:

1. Never reuse the exact same name for a user
2. Avoid using the same first name in 5 consecutive sessions
3. Avoid using the same last name in 5 consecutive sessions

When a name would violate these rules, the system automatically generates an alternative name from its built-in name pool. 

## GPT-4o Mini Integration

### Overview

This project has been updated to use OpenAI's GPT-4o mini model instead of Anthropic's Claude. The GPT-4o mini model provides excellent performance at a lower cost, making it ideal for our sales training application.

### Implementation Details

- The `app/services/gpt4o_service.py` module provides a seamless interface to the GPT-4o mini API
- All previous Claude functionality has been replaced with equivalent GPT-4o mini capabilities
- The service maintains the same interface, so existing code continues to work with minimal changes
- Error handling and retry logic are built-in for reliability

### Configuration

To use GPT-4o mini, add your OpenAI API key to your `.env` file:

```
OPENAI_API_KEY=your-openai-api-key
```

The service also supports retrieval from Flask's app config if set there.

### Key Features

- **Voice Transcription**: Uses Whisper API via OpenAI for accurate speech-to-text
- **Roleplay Generation**: Creates dynamic sales roleplay scenarios with diverse buyer personas
- **Feedback Analysis**: Provides detailed feedback on sales performance
- **Voice Analysis**: Analyzes tone, confidence, and emotion in spoken interactions 