# Project Cleanup and Simplification Guide

This guide outlines steps to simplify and clean up the SalesTraining AI project, addressing redundancies and improving overall code organization.

## Environment File Consolidation

The project previously used multiple environment files including `flask.env` and potential references to `.env`. This has been consolidated to use a single `.env` file:

1. Create a `.env` file in the project root with these variables:

```
# Environment variables for SalesTraining AI Application
FLASK_APP=run.py
FLASK_ENV=development
FLASK_DEBUG=0
SECRET_KEY=your_secret_key_here
DATABASE_URI=sqlite:///instance/new_salestrainer.db

# API Keys
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
ELEVEN_LABS_API_KEY=your_elevenlabs_key_here

# Server configuration
HOST=0.0.0.0
PORT=8081

# Web configuration
BASE_URL=http://localhost:8081

# Authentication settings
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

2. Run scripts have been updated to use `.env` instead of `flask.env`:
   - `run_app.py` now uses `load_dotenv('.env')`
   - `run_backend.py` now uses `load_dotenv('.env')`

3. Delete the old `flask.env` file once you've created the `.env` file.

## Chat Page Integration

The chat page has been fixed by:

1. Updating the `ChatInterface.tsx` component to properly handle API responses
2. Ensuring that `sendToBackend` function correctly processes the API response

## Running the Application

To run the application with the simplified setup:

1. Backend: 
   ```
   python run_backend.py
   ```

2. Frontend:
   ```
   cd app/frontend
   npm run dev
   ```

This will start the backend on port 8081 and the frontend on port 8080 with proper proxy configuration.

## Additional Cleanup Tasks

The following areas could be further simplified:

1. **Script Files**: Many scripts in the root directory seem to be one-off utilities. Consider moving these to a `scripts/` directory.

2. **Duplicate Code**: Several services have duplicate implementations. Look for opportunities to consolidate.

3. **Remove External Projects**: There are several external projects in the root directory that could be removed:
   - `pitchiq-spark-launch-main/`
   - `pitchiq-voice-orb-design-a43f76bafc0e5d8fa6138ab0896e1fc6c01a2e6d/`
   - `nextjs-live-transcription-main/`
   - `flask-text-to-speech-main/`
   - `deepgram-js-sdk-main/`

4. **Database Initialization**: Consolidate the various database scripts (`reset_db.py`, `fix_database.py`, etc.) into a single utility.

5. **Voice Feature Integration**: Voice functionality is spread across multiple components. Consider consolidating this into a unified voice service.

## Troubleshooting

If the chat feature still doesn't work after these changes:

1. Check browser console for errors
2. Verify backend API responses (use the browser Network tab)
3. Ensure all required API keys are set in `.env`
4. Make sure the server is running on port 8081 as expected by the frontend proxy

## Changes Made

### 1. Removed Unused Imports
- Removed unused imports from `app/auth/routes.py` (limiter, form classes)
- Removed unused yaml import from `app/config_manager.py`
- Cleaned up unused imports from `app/services/voice_analysis_service.py` while preserving voice functionality

### 2. Fixed Code Issues
- Fixed unreachable code in `app/chat/services.py`

### 3. Reorganized Project Structure
- Created `utils/legacy_scripts/` directory to store one-time utility scripts
- Moved utility scripts (fix_*, add_*, check_*, clean_*, debug_*, reset_*) to `utils/legacy_scripts/`
- Moved setup and update scripts (create_*, update_*) to `utils/legacy_scripts/`
- Moved test scripts to `tests/scripts/` directory

## Preserved Components

### Voice Features
All voice-related functionality has been preserved since this is an active development area. The code has been cleaned up but all core functionality remains intact for ongoing voice feature implementation.

### PitchEDU
Any components related to PitchEDU have been preserved for future development.

## Next Steps

For continued project improvement:

1. Complete the voice feature implementation
2. Implement improved feedback visualization
3. Continue performance optimization
4. Consider implementing PitchEDU features
5. Add additional unit tests

## Legacy Scripts

The scripts moved to `utils/legacy_scripts/` were primarily one-time utilities for:
- Database schema fixes and migrations
- Data cleanup operations
- Debug utilities
- Setup and initialization scripts

These scripts have been preserved for reference but are no longer needed in the main project directory. 