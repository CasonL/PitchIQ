#!/bin/bash
set -e

echo "--- Starting Project Setup Script ---"

# Prefer python3 if available, otherwise use python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

VENV_DIR=".venv"

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating Python virtual environment at $VENV_DIR..."
  $PYTHON_CMD -m venv $VENV_DIR
else
  echo "Python virtual environment $VENV_DIR already exists."
fi

echo "Ensuring instance folder exists and is writable..."
mkdir -p instance
chmod 777 instance

# Cross-platform virtual environment activation
if [ -f "$VENV_DIR/Scripts/activate" ]; then # Windows (Git Bash)
    echo "Activating Windows virtual environment..."
    # In bash, we source the activate script from Scripts.
    # The commands will then be on the PATH.
    source "$VENV_DIR/Scripts/activate"
    PIP_CMD="pip"
    FLASK_CMD="flask"
else # Linux, macOS
    echo "Activating Unix virtual environment..."
    source "$VENV_DIR/bin/activate"
    PIP_CMD="pip"
    FLASK_CMD="flask"
fi


echo "Installing Python dependencies from requirements.txt..."
$PIP_CMD install -r requirements.txt

export FLASK_APP="app"
echo "FLASK_APP is set to: $FLASK_APP"

echo "Running database migrations..."
$PYTHON_CMD run_migrations.py

echo "--- Running Automated Tests ---"
$PIP_CMD install pytest # Ensure pytest is installed
pytest

echo "--- Python Backend Setup Complete ---"

FRONTEND_DIR="app/frontend"
if [ -f "$FRONTEND_DIR/package.json" ]; then
  echo "Found frontend project in $FRONTEND_DIR."
  if command -v npm &> /dev/null; then
    echo "Installing frontend dependencies and building project..."
    (cd $FRONTEND_DIR && npm install && npm run build)
    echo "Frontend setup complete."
  else
    echo "npm command not found. Skipping frontend setup."
  fi
else
  echo "No package.json found in $FRONTEND_DIR. Skipping frontend setup."
fi

echo "--- Project Setup Script Finished ---" 