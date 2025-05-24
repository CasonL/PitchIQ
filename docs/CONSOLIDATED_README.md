# PitchIQ Sales Training AI - Consolidated Application

This document explains how to run the application after consolidating multiple Flask files and environment configurations.

## Application Structure Improvements

We've made the following improvements to streamline the application structure:

1. **Consolidated Flask Runner**: 
   - Created a single `app.py` script that combines functionality from:
     - `server_test.py`
     - `run_app.py`
     - `run_backend.py`
     - `run_patched_app.py`

2. **Unified Environment Configuration**:
   - Consolidated all `.env` files into a single `.env` file
   - Created a script (`consolidate_env.py`) to automate this process
   - Ensured all critical environment variables are documented

## Cleanup Results

The following redundant files have been removed:

- `server_test.py` - Replaced by `app.py`
- `run_app.py` - Replaced by `app.py`
- `run_backend.py` - Replaced by `app.py`
- `run_patched_app.py` - Replaced by `app.py`
- `flask.env` - Consolidated into `.env`

## Running the Application

### Step 1: Set Up Environment Variables

Create a `.env` file in the project root with your configuration:

```bash
# Run the consolidation script to create a unified .env file
python consolidate_env.py
```

Edit the `.env` file to set at least these critical variables:
- `SECRET_KEY` (for session security)
- `OPENAI_API_KEY` (for AI functionality)
- `ANTHROPIC_API_KEY` (optional, for Claude AI)
- `ELEVEN_LABS_API_KEY` (for text-to-speech)
- `DEEPGRAM_API_KEY` (for speech-to-text)

### Step 2: Run the Application

```bash
# Run with default settings
python app.py

# Run with specific port
python app.py --port 5000

# Run in debug mode with verbose logging
python app.py --debug

# Specify environment
python app.py --env production
```

The application will:
1. Load your environment variables from `.env`
2. Find an available port if the default is in use
3. Configure logging based on the selected mode
4. Start the Flask server with SocketIO support

### Command Line Arguments

The `app.py` script supports the following arguments:

- `--port PORT`: Specify the port to run on (default: from .env or 8081)
- `--debug`: Enable debug mode with verbose logging
- `--env ENV`: Specify environment (development, testing, production)

## Troubleshooting

### Port Conflicts

If you see this error:
```
OSError: [WinError 10048] Only one usage of each socket address (protocol/network address/port) is normally permitted
```

Either:
1. Close any running instances of the application
2. Use the `--port` argument to specify a different port
3. Let the application find an available port automatically

### API Key Issues

If features like chat, speech-to-text, or text-to-speech aren't working:
1. Ensure the corresponding API keys are set in your `.env` file
2. Check the application logs for specific error messages
3. Test API connections using the included test scripts

## Database Initialization

The application uses SQLite by default. To initialize or reset the database:

```bash
# Initialize the database
python init_db.py

# Reset the database (warning: deletes all data)
python reset_db.py
``` 