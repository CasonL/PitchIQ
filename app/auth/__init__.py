from flask import Blueprint

# This creates the blueprint object that 'routes.py' will use to define routes.
auth = Blueprint('auth', __name__)
auth_bp = auth  # Alias for backward compatibility

# This import is placed at the bottom to avoid circular dependencies.
# It attaches the defined routes from the routes.py file to the blueprint.
from . import routes
