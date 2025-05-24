from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required, current_user

# Create the training blueprint
training = Blueprint('training', __name__)

@training.route('/')
@login_required
def index():
    """Render the main training interface."""
    return render_template('training/index.html')

@training.route('/modules')
@login_required
def modules():
    """View available training modules."""
    return render_template('training/modules.html')

@training.route('/module/<module_id>')
@login_required
def view_module(module_id):
    """View a specific training module."""
    return render_template('training/module.html', module_id=module_id)

@training.route('/progress')
@login_required
def progress():
    """View training progress."""
    return render_template('training/progress.html') 