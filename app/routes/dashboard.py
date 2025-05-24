"""
Dashboard routes for the Sales Training AI application.

This module provides routes for the dashboard views.
"""
from flask import Blueprint, current_app, send_from_directory, jsonify
from flask_login import login_required, current_user
import os

dashboard = Blueprint('dashboard', __name__)

@dashboard.route('/dashboard')
# @login_required # Keep commented out for now if login isn't needed for React app directly
def view_dashboard():
    """
    Main dashboard view.
    
    Serves the main index.html for the React dashboard application.
    """
    # Serve the index.html from the React build directory
    react_dist_dir = os.path.join(current_app.static_folder, 'react', 'dist')
    
    # Check if index.html exists
    index_path = os.path.join(react_dist_dir, 'index.html')
    if not os.path.exists(index_path):
        current_app.logger.error(f"React index.html not found at {index_path}")
        # Consider rendering a Flask error template instead of plain text
        return "Dashboard application not found. Build the React app first.", 404
        
    return send_from_directory(react_dist_dir, 'index.html')

# Commenting out the /simplified-dashboard route
# @dashboard.route('/simplified-dashboard')
# @login_required
# def simplified_dashboard():
#     \"\"\"
#     Simplified dashboard view.
#     
#     This provides a simple HTML dashboard without React dependencies.
#     \"\"\"
#     # Simply render the simplified dashboard template
#     return render_template('dashboard/simple_dashboard.html')

@dashboard.route('/api/dashboard/data')
@login_required
def dashboard_data():
    """
    API endpoint to provide dashboard data.
    
    This is used by the simplified dashboard and for testing.
    """
    user_data = {
        'name': getattr(current_user, 'name', 'User'),
        'metrics': {
            'sessions': 24,
            'training_hours': 32.5,
            'overall_score': 78,
            'improvement': 15
        },
        'recent_activity': [
            {'name': 'Sales Call Demo', 'score': 85},
            {'name': 'Product Demo', 'score': 78},
            {'name': 'Objection Handling', 'score': 92}
        ]
    }
    
    return jsonify(user_data) 