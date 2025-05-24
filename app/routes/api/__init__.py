"""
API Routes Package

This package contains API routes for the application.
"""

from app.routes.api.api_blueprint import api_blueprint
from app.routes.api.dashboard import dashboard_api

# Alias for backward compatibility
api = api_blueprint

__all__ = ['api_blueprint', 'dashboard_api', 'api'] 