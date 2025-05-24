import os
import logging
from flask import Flask, current_app

# Import service classes
from app.services.openai_service import OpenAIService
from app.services.eleven_labs_service import ElevenLabsService
from app.services.deepgram_service import DeepgramService

logger = logging.getLogger(__name__)

class APIManager:
    """
    Unified API Manager for initializing and managing all external API services.
    Provides a central point for API interactions and fallbacks.
    """
    def __init__(self, app=None):
        self.openai_service = OpenAIService()
        self.elevenlabs_service = ElevenLabsService()
        self.deepgram_service = DeepgramService()
        
        # Service status tracking
        self.service_status = {
            'openai': False,
            'elevenlabs': False,
            'deepgram': False
        }
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize all API services with the Flask app"""
        logger.info("Initializing API Manager with all services")
        
        # Initialize services
        self._init_openai(app)
        self._init_elevenlabs(app)
        self._init_deepgram(app)
        
        # Register the manager on the app
        app.api_manager = self
        
        # Register health check route
        self._register_health_check(app)
    
    def _init_openai(self, app):
        """Initialize OpenAI service"""
        try:
            self.openai_service.init_app(app)
            self.service_status['openai'] = self.openai_service.initialized
            logger.info(f"OpenAI service initialized: {self.service_status['openai']}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI service: {str(e)}")
            self.service_status['openai'] = False
    
    def _init_elevenlabs(self, app):
        """Initialize ElevenLabs service"""
        try:
            self.elevenlabs_service.init_app(app)
            self.service_status['elevenlabs'] = self.elevenlabs_service.initialized
            logger.info(f"ElevenLabs service initialized: {self.service_status['elevenlabs']}")
        except Exception as e:
            logger.error(f"Failed to initialize ElevenLabs service: {str(e)}")
            self.service_status['elevenlabs'] = False
    
    def _init_deepgram(self, app):
        """Initialize Deepgram service"""
        try:
            self.deepgram_service.init_app(app)
            self.service_status['deepgram'] = True
            logger.info("Deepgram service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Deepgram service: {str(e)}")
            self.service_status['deepgram'] = False
    
    def _register_health_check(self, app):
        """Register health check endpoint"""
        @app.route('/system/health/api', methods=['GET'])
        def api_health():
            """Check health of all API services"""
            return {
                'openai': self.service_status['openai'],
                'elevenlabs': self.service_status['elevenlabs'],
                'deepgram': self.service_status['deepgram']
            }
    
    def get_service(self, service_name):
        """Get a service by name with service existence check"""
        if service_name == 'openai':
            return self.openai_service
        elif service_name == 'elevenlabs':
            return self.elevenlabs_service
        elif service_name == 'deepgram':
            return self.deepgram_service
        else:
            raise ValueError(f"Unknown service: {service_name}")
    
    def check_service_health(self, service_name):
        """Check if a specific service is healthy"""
        return self.service_status.get(service_name, False)
    
    def get_all_service_health(self):
        """Get health status of all services"""
        return self.service_status

# Global instance for app-wide access
api_manager = APIManager() 