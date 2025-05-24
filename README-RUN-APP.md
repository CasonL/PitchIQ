# Running the Sales Training AI Application

This document provides instructions for running the application correctly.

## Quick Start

For the most reliable way to start the application, use the new runner script:

```bash
python run_sales_ai.py
```

This script handles process management, port conflicts, and provides a fallback mode if the main application fails to start.

## Alternative Methods

### Main Application

The traditional way to run the application:

```bash
python run_app.py
```

This will run the application on port 8080 with additional process management.

### Simplified Application

If you're experiencing issues with the main application, you can try the simplified version:

```bash
python simple_run_app.py
```

This runs a minimal Flask app that still provides access to the dashboard.

## Accessing the Application

After starting the application using any of the methods above, access it at:

```
http://localhost:8080
```

The dashboard is available at:

```
http://localhost:8080/dashboard
```

## Troubleshooting

### Port Conflicts

If you see an error about port 8080 being in use:

1. Close any other Python/Flask applications
2. Check for processes using port 8080:
   - Windows: `netstat -ano | findstr :8080`
   - Linux/Mac: `lsof -i :8080`
3. Kill the process:
   - Windows: `taskkill /F /PID <PID>`
   - Linux/Mac: `kill -9 <PID>`

### Loading Issues

If the application takes too long to load:

1. Check for multiple Python processes using Task Manager (Windows) or Activity Monitor (Mac)
2. Try using the simplified runner: `python run_sales_ai.py`
3. Make sure your database is properly initialized: `python init_db.py`

## React Dashboard

The React dashboard relies on API endpoints that provide the necessary data. If the dashboard is not loading:

1. Check the browser console for any errors
2. Verify that the API endpoints are responding (try visiting `/api/dashboard/data` directly)
3. Make sure the React build process completed successfully

## Environment Variables

Make sure your `.env` file contains the necessary configuration. Key variables include:

- `FLASK_ENV` - Set to 'dev', 'test', or 'prod'
- API keys for OpenAI, Deepgram, and other services 