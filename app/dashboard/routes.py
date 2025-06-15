from flask import Blueprint, render_template
from flask_login import login_required
from . import dashboard

@dashboard.route('/')
@login_required
def dashboard_home():
    """Render the main dashboard page."""
    # This will be replaced with the actual dashboard implementation
    return render_template('dashboard/index.html') 