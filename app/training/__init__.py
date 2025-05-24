# Training package init

from flask import Blueprint

# Initialize the blueprint
training_bp = Blueprint('training', __name__, url_prefix='/training')

# Import routes to register them


def create_training_blueprint():
    # This function might be intended for later use or was part of a previous structure.
    # Adding pass to make it syntactically correct.
    pass 

# Import routes here if they depend on the blueprint being defined first
from . import routes
