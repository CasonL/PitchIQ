# app/voice/__init__.py

from flask import Blueprint

voice = Blueprint('voice', __name__)

from . import routes 