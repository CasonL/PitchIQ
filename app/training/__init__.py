# Training package init

from flask import Blueprint

# Initialize the blueprint
training = Blueprint('training', __name__)

# Import routes to register them


def create_training_blueprint():
    # This function might be intended for later use or was part of a previous structure.
    # Adding pass to make it syntactically correct.
    pass 

# Import routes here if they depend on the blueprint being defined first
from . import routes
