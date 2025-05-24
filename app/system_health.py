import logging
import os
import time
from flask import Blueprint, jsonify, current_app
import psutil
import platform
from sqlalchemy.exc import SQLAlchemyError
import threading
import traceback
import socket
import httpx
from typing import Dict, Any, List, Tuple, Optional

# Create blueprint for health check routes
health_bp = Blueprint('health', __name__, url_prefix='/system/health')

logger = logging.getLogger(__name__)

def register_health_routes(app):
    """Register health check routes with the Flask app"""
    app.register_blueprint(health_bp)
    logger.info("Health check routes registered")

@health_bp.route('/', methods=['GET'])
def system_health():
    """Full system health check dashboard"""
    start_time = time.time()
    
    # Collect all health data
    health = {
        'status': 'initializing',
        'timestamp': time.time(),
        'components': {
            'database': check_database_connection(),
            'openai': check_openai_connection(),
            'elevenlabs': check_elevenlabs_connection(),
            'deepgram': check_deepgram_connection()
        },
        'system': get_system_info(),
        'app': get_app_info()
    }
    
    # Determine overall status
    critical_components = ['database']
    critical_status = all(health['components'][c]['status'] == 'healthy' for c in critical_components)
    api_status = any(health['components'][c]['status'] == 'healthy' for c in ['openai', 'elevenlabs', 'deepgram'])
    
    if critical_status and api_status:
        health['status'] = 'healthy'
    elif critical_status:
        health['status'] = 'degraded'
    else:
        health['status'] = 'unhealthy'
    
    health['response_time'] = time.time() - start_time
    
    return jsonify(health)

def check_database_connection():
    """Check database connection health"""
    try:
        from app.extensions import db
        # Execute a simple query to check connection
        db.session.execute("SELECT 1")
        db.session.commit()
        return {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except SQLAlchemyError as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}'
        }
    except Exception as e:
        logger.error(f"Unexpected error during database health check: {str(e)}")
        return {
            'status': 'unknown',
            'message': f'Error checking database: {str(e)}'
        }

def check_openai_connection():
    """Check OpenAI API connection"""
    try:
        from app.services.api_manager import api_manager
        if not api_manager.service_status.get('openai'):
            return {
                'status': 'unhealthy',
                'message': 'OpenAI service not initialized'
            }
        
        # Optionally perform a real API test here
        return {
            'status': 'healthy',
            'message': 'OpenAI service initialized'
        }
    except Exception as e:
        logger.error(f"OpenAI health check failed: {str(e)}")
        return {
            'status': 'unknown',
            'message': f'Error checking OpenAI: {str(e)}'
        }

def check_elevenlabs_connection():
    """Check ElevenLabs API connection"""
    try:
        from app.services.api_manager import api_manager
        if not api_manager.service_status.get('elevenlabs'):
            return {
                'status': 'unhealthy',
                'message': 'ElevenLabs service not initialized'
            }
        
        # Optionally perform a real API test here
        return {
            'status': 'healthy', 
            'message': 'ElevenLabs service initialized'
        }
    except Exception as e:
        logger.error(f"ElevenLabs health check failed: {str(e)}")
        return {
            'status': 'unknown',
            'message': f'Error checking ElevenLabs: {str(e)}'
        }

def check_deepgram_connection():
    """Check Deepgram API connection"""
    try:
        from app.services.api_manager import api_manager
        if not api_manager.service_status.get('deepgram'):
            return {
                'status': 'unhealthy',
                'message': 'Deepgram service not initialized'
            }
        
        # Optionally perform a real API test here
        return {
            'status': 'healthy',
            'message': 'Deepgram service initialized'
        }
    except Exception as e:
        logger.error(f"Deepgram health check failed: {str(e)}")
        return {
            'status': 'unknown',
            'message': f'Error checking Deepgram: {str(e)}'
        }

def get_system_info():
    """Get system resource information"""
    try:
        return {
            'cpu_usage': psutil.cpu_percent(interval=0.1),
            'memory_usage': psutil.virtual_memory().percent,
            'disk_usage': psutil.disk_usage('/').percent,
            'platform': platform.platform(),
            'python_version': platform.python_version(),
            'hostname': socket.gethostname(),
            'ip_address': get_ip_address()
        }
    except Exception as e:
        logger.error(f"Error getting system info: {str(e)}")
        return {
            'status': 'error',
            'message': f'Error retrieving system info: {str(e)}'
        }

def get_app_info():
    """Get application information"""
    try:
        return {
            'version': os.environ.get('APP_VERSION', 'unknown'),
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'debug_mode': current_app.debug,
            'testing_mode': current_app.testing
        }
    except Exception as e:
        logger.error(f"Error getting app info: {str(e)}")
        return {
            'status': 'error',
            'message': f'Error retrieving app info: {str(e)}'
        }

def get_ip_address() -> str:
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Doesn't need to be reachable, just used to determine local interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        logger.warning(f"Could not determine IP address: {str(e)}")
        return "Unknown"

def check_api_connectivity() -> Dict[str, Any]:
    """
    Checks connectivity to various APIs used in the application.
    
    Returns:
        Dict with API connection statuses
    """
    results = {
        "openai": check_openai_connectivity(),
        "deepgram": check_deepgram_connectivity()
    }
    return results

def check_openai_connectivity() -> Dict[str, Any]:
    """
    Tests connectivity to OpenAI API.
    
    Returns:
        Dict with connection status and details
    """
    try:
        from app.extensions import openai_service
        
        if not openai_service.initialized:
            return {
                "status": "error",
                "message": "OpenAI service not initialized",
                "details": "API key may be missing or invalid"
            }
            
        start_time = time.time()
        try:
            # Attempt to test the model
            openai_service.client.models.retrieve(openai_service.model)
            
            # If we made it here, connection is successful
            return {
                "status": "success",
                "latency_ms": int((time.time() - start_time) * 1000),
                "model": openai_service.model
            }
        except Exception as e:
            # Enhanced error reporting
            error_details = {
                "status": "error",
                "message": str(e),
                "error_type": e.__class__.__name__,
                "stack_trace": traceback.format_exc()
            }
            
            # Add more detailed network diagnostics for connection errors
            if "Connection" in str(e):
                # Check if we can reach OpenAI's domain
                openai_connectivity = test_domain_connectivity("api.openai.com")
                error_details["domain_reachable"] = openai_connectivity["reachable"]
                error_details["dns_resolution"] = openai_connectivity["dns"]
                error_details["connection_details"] = openai_connectivity["details"]
                
                # Additional proxy information
                try:
                    proxy_env = {k: v for k, v in os.environ.items() if 'proxy' in k.lower()}
                    error_details["proxy_environment"] = proxy_env if proxy_env else "No proxy environment variables set"
                except Exception as proxy_e:
                    error_details["proxy_environment_error"] = str(proxy_e)
            
            logger.error(f"OpenAI API connectivity error: {error_details}")
            return error_details
            
    except Exception as e:
        logger.error(f"Error checking OpenAI API connectivity: {str(e)}")
        return {
            "status": "error", 
            "message": f"Failed to check OpenAI connectivity: {str(e)}"
        }

def test_domain_connectivity(domain: str) -> Dict[str, Any]:
    """
    Tests basic connectivity to a domain by performing:
    1. DNS resolution
    2. TCP connection
    3. HTTPS request
    
    Args:
        domain: Domain name to test
        
    Returns:
        Dict with test results
    """
    result = {
        "reachable": False,
        "dns": False,
        "tcp": False,
        "https": False,
        "details": {}
    }
    
    # Test DNS resolution
    try:
        ip = socket.gethostbyname(domain)
        result["dns"] = True
        result["details"]["ip"] = ip
    except socket.gaierror as e:
        result["details"]["dns_error"] = str(e)
        return result
    
    # Test TCP connection
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3)
        s.connect((ip, 443))
        s.close()
        result["tcp"] = True
    except Exception as e:
        result["details"]["tcp_error"] = str(e)
        return result
    
    # Test HTTPS request
    try:
        timeout = httpx.Timeout(10.0)
        with httpx.Client(timeout=timeout) as client:
            response = client.get(f"https://{domain}/", verify=True)
            result["https"] = response.status_code < 500
            result["details"]["status_code"] = response.status_code
            result["reachable"] = True
    except Exception as e:
        result["details"]["https_error"] = str(e)
    
    return result

def check_deepgram_connectivity() -> Dict[str, Any]:
    """
    Tests connectivity to Deepgram API.
    
    Returns:
        Dict with connection status
    """
    try:
        key = current_app.config.get('DEEPGRAM_API_KEY') or os.environ.get('DEEPGRAM_API_KEY')
        
        if not key:
            return {
                "status": "error",
                "message": "Deepgram API key not configured"
            }
        
        # Just check if API key exists for now
        # Future: implement actual API test
        return {
            "status": "unknown",
            "message": "Key exists but connectivity not tested"
        }
    except Exception as e:
        logger.error(f"Error checking Deepgram API connectivity: {str(e)}")
        return {"status": "error", "message": str(e)} 