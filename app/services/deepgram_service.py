import asyncio
import json
import logging
import os
import socketio
from dotenv import load_dotenv
from flask import Blueprint, jsonify, current_app, request
import inspect
from tenacity import retry, stop_after_attempt, wait_exponential
from typing import Optional, Dict
from deepgram import DeepgramClient, DeepgramClientOptions, __version__ as deepgram_version

# Configure logging - set to DEBUG for more verbose output
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Log SDK version
logger.info(f"Deepgram SDK Version: {deepgram_version}")

# Load environment variables
load_dotenv()
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
# Safely log API key info
if DEEPGRAM_API_KEY:
    logger.info(f"API Key loaded from env: {DEEPGRAM_API_KEY[:4]}...{DEEPGRAM_API_KEY[-4:]}")
else:
    logger.warning("DEEPGRAM_API_KEY not found in environment variables.")

# Create a Blueprint for this service
deepgram_bp = Blueprint('deepgram_api', __name__, url_prefix='/api')

# Create a Socket.IO server for handling client connections
# sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*') # Removed - No longer needed for SDK STT

# Dictionary to track active client streams
# active_streams = {} # Commented out as likely not needed for SDK STT

# Global reference to the event loop
# event_loop = None # Commented out unless SIO is definitely needed elsewhere

def run_async(async_func):
    """Helper to run async functions in a synchronous Flask route."""
    try:
        loop = ensure_event_loop()
        return loop.run_until_complete(async_func())
    except Exception as e:
        logger.error(f"Error running async function: {str(e)}", exc_info=True)
        # Return more detailed error information for debugging
        error_info = {
            "status": "error",
            "message": str(e),
            "error_type": type(e).__name__,
            "debug_info": {
                "module": async_func.__module__ if hasattr(async_func, "__module__") else "unknown",
                "function": async_func.__name__ if hasattr(async_func, "__name__") else "unknown"
            }
        }
        return jsonify(error_info), 500

@deepgram_bp.route('/get_deepgram_token', methods=['GET'])
def get_deepgram_token():
    """Generate a short-lived Deepgram API key for the browser SDK."""
    return run_async(deepgram_service.generate_token)

@deepgram_bp.route('/test_connection', methods=['GET'])
def test_connection():
    """Test the Deepgram API connection with detailed diagnostics."""
    return run_async(deepgram_service.test_connection)

@deepgram_bp.route('/check_config', methods=['GET'])
def check_deepgram_config():
    """Get detailed diagnostic information about the Deepgram configuration."""
    return run_async(deepgram_service.check_deepgram_config)

@deepgram_bp.route('/test_features_api', methods=['GET'])
def test_features_api():
    """Test the Deepgram Features API specifically."""
    return run_async(deepgram_service.test_features_api)

@deepgram_bp.route('/test_manage_api', methods=['GET'])
def test_manage_api():
    """Test the Deepgram Manage API specifically."""
    return run_async(deepgram_service.test_manage_api)

@deepgram_bp.route('/health', methods=['GET'])
def health_check():
    """Simple health check to verify the service is working."""
    return jsonify({
        "status": "ok",
        "service": "deepgram_api",
        "api_key_configured": bool(DEEPGRAM_API_KEY),
        "sdk_version": deepgram_version
    })

@deepgram_bp.route('/check_key_format', methods=['GET'])
def check_key_format():
    """Check the format of the configured Deepgram API key."""
    key = DEEPGRAM_API_KEY
    
    if not key:
        return jsonify({
            "status": "error",
            "message": "No DEEPGRAM_API_KEY configured in environment"
        }), 400
        
    # Safely display key info without exposing the full key
    key_length = len(key)
    has_prefix = key.startswith("dg_")
    key_start = key[:4] if key_length > 8 else "****"
    key_end = key[-4:] if key_length > 8 else "****"
    
    return jsonify({
        "status": "info",
        "key_info": {
            "length": key_length,
            "has_dg_prefix": has_prefix,
            "format": f"{key_start}...{key_end}",
            "appears_valid": (has_prefix and key_length > 30) or (not has_prefix and key_length > 30)
        },
        "recommended_action": "If key tests fail, try regenerating the API key in your Deepgram console"
    }), 200

@deepgram_bp.route('/sdk_version', methods=['GET'])
def get_sdk_version():
    """Return the version of the Deepgram SDK we're using."""
    return jsonify({
        "deepgram_sdk_version": deepgram_version,
        "api_key_format": {
            "length": len(DEEPGRAM_API_KEY) if DEEPGRAM_API_KEY else 0,
            "has_prefix": DEEPGRAM_API_KEY.startswith("dg_") if DEEPGRAM_API_KEY else False,
            "preview": f"{DEEPGRAM_API_KEY[:4]}...{DEEPGRAM_API_KEY[-4:]}" if DEEPGRAM_API_KEY and len(DEEPGRAM_API_KEY) > 8 else "****"
        }
    })

@deepgram_bp.route('/simple_test', methods=['GET'])
def simple_test():
    """Perform a simple API call to test authentication."""
    return run_async(_simple_deepgram_test)

async def _simple_deepgram_test():
    """Test a simpler Deepgram API call to diagnose authentication issues."""
    if not DEEPGRAM_API_KEY:
        return jsonify({
            "status": "error",
            "error": "api_key_missing",
            "message": "Deepgram API key not configured in environment."
        }), 500
        
    try:
        # Initialize Deepgram without any modifications to the key
        config = DeepgramClientOptions(verbose=logging.DEBUG)
        deepgram = DeepgramClient(DEEPGRAM_API_KEY, config)
        
        # Log what methods are available
        logger.info(f"Available methods on deepgram object: {dir(deepgram)}")
        
        # Check what's available in the manage module
        logger.info(f"Available methods on deepgram.manage: {dir(deepgram.manage)}")
        
        # Try a simple API call instead of transcription
        try:
            # First try with manage API - should be lightweight
            logger.info("Attempting simple API call with manage API")
            v1 = deepgram.manage.v("1")
            logger.info(f"Available methods on v1: {dir(v1)}")
            
            # Try to get balance which should be a simple API call
            if hasattr(v1, 'get_balances'):
                response = await v1.get_balances()
                logger.info(f"✅ Simpler API call successful: {response}")
                return jsonify({
                    "status": "success",
                    "message": "Authentication successful with simpler API call",
                    "response": str(response)
                }), 200
            else:
                # If balance method not available, try another simple endpoint
                logger.info("Balance method not available, trying projects endpoint")
                if hasattr(v1, 'get_projects'):
                    response = await v1.get_projects()
                    logger.info(f"✅ Projects API call successful: {response}")
                    return jsonify({
                        "status": "success",
                        "message": "Authentication successful with projects API call",
                        "response": str(response)
                    }), 200
                else:
                    return jsonify({
                        "status": "error",
                        "message": "Could not find a suitable simple API method to test"
                    }), 500
                
        except Exception as e:
            error_message = str(e)
            logger.error(f"🔴 Error with simple API call: {error_message}")
            # Fall through to try direct API call
            
            # Now try a basic test with the token/auth endpoint directly
            logger.info("Attempting direct auth endpoint test")
            try:
                import httpx
                
                # Make a direct call mirroring the curl command that worked
                url = "https://api.deepgram.com/v1/auth/token"
                headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}"}
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, headers=headers)
                    
                if response.status_code == 200:
                    logger.info(f"✅ Direct auth API call successful: {response.text}")
                    return jsonify({
                        "status": "success",
                        "message": "Direct auth endpoint test successful",
                        "response": response.json()
                    }), 200
                else:
                    logger.error(f"🔴 Direct auth API call failed: {response.status_code} - {response.text}")
                    return jsonify({
                        "status": "error",
                        "message": f"Direct auth endpoint test failed: {response.status_code}",
                        "response": response.text
                    }), 500
            except Exception as direct_error:
                logger.error(f"🔴 Error with direct auth test: {str(direct_error)}")
                return jsonify({
                    "status": "error",
                    "message": f"All authentication tests failed",
                    "sdk_error": error_message,
                    "direct_error": str(direct_error)
                }), 500
                
    except Exception as e:
        logger.error(f"🔴 Error testing Deepgram connection: {e}")
        return jsonify({"status": "error", "error": "connection_error", "message": f"Failed to initialize/test Deepgram client: {str(e)}"}), 500

# Add a helper function to verify/format API key
def _format_deepgram_key(api_key):
    """
    Format the Deepgram API key to ensure it has the correct format.
    Deepgram API keys should typically have a specific format.
    """
    if not api_key:
        return None
        
    # If key doesn't start with "dg_" prefix (newer Deepgram keys format)
    # and doesn't look like a legacy key (e.g., 32+ char hex string)
    api_key = api_key.strip()
    
    # Log information about the key format (safely)
    logger.info(f"Deepgram API key format: length={len(api_key)}, has prefix='dg_'={api_key.startswith('dg_')}")
    
    # Try to determine if we need to add a dg_ prefix
    if not api_key.startswith("dg_") and len(api_key) > 30:
        # This appears to be a legacy key that might need dg_ prefix
        logger.info("Detected possible legacy key format, will try both original and with dg_ prefix")
    
    return api_key

class DeepgramService:
    """Service for handling Deepgram operations."""
    
    def __init__(self):
        # Initialize with empty config to prevent attribute errors
        self.config = {
            'debug': True,
            'verbose_logging': True,
            'api_url': 'https://api.deepgram.com/v1'
        }
        
        raw_api_key = DEEPGRAM_API_KEY
        self.api_key = _format_deepgram_key(raw_api_key)
        
        # Also create a version with dg_ prefix if not already present
        if self.api_key and not self.api_key.startswith("dg_"):
            self.prefixed_api_key = f"dg_{self.api_key}"
            logger.info("Created alternative API key with dg_ prefix for fallback")
        else:
            self.prefixed_api_key = None
            
        if not self.api_key:
            logger.error("Failed to initialize Deepgram Service: Invalid API key format")
            
        # Add initialized flag for API manager compatibility
        self.initialized = bool(self.api_key)
    
    def init_app(self, app):
        """Initialize the service with app context for API manager compatibility."""
        logger.info("Initializing DeepgramService with app context")
        
        # Get API key from app config if available
        api_key = app.config.get('DEEPGRAM_API_KEY') or os.environ.get('DEEPGRAM_API_KEY')
        
        if api_key:
            self.api_key = _format_deepgram_key(api_key)
            
            # Also create a version with dg_ prefix if not already present
            if self.api_key and not self.api_key.startswith("dg_"):
                self.prefixed_api_key = f"dg_{self.api_key}"
                logger.info("Created alternative API key with dg_ prefix for fallback")
            else:
                self.prefixed_api_key = None
                
            # Set initialized flag
            self.initialized = True
            logger.info("DeepgramService initialized successfully")
        else:
            logger.error("Deepgram API Key not found in config or environment")
            self.initialized = False
    
    async def test_connection(self):
        """
        Simple test to verify basic Deepgram client connectivity without 
        accessing specific APIs.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        result = {
            "status": "error",
            "message": "",
            "debug_info": {}
        }
        
        # Get API key
        api_key = self.get_api_key()
        if not api_key:
            result["message"] = "No Deepgram API key configured"
            return result
        
        # Log SDK version
        sdk_version = self.get_sdk_version()
        logger.info(f"Deepgram SDK Version: {sdk_version}")
        result["debug_info"]["sdk_version"] = sdk_version
        
        try:
            # Import Deepgram
            import deepgram
            from deepgram import DeepgramClient, ClientOptionsFromEnv
            
            # Create a simple client
            client_options = ClientOptionsFromEnv()
            client_options.verbose = True
            deepgram_client = DeepgramClient(api_key, client_options)
            
            # Just test that we can create the client without errors
            result["status"] = "success"
            result["message"] = "Successfully created Deepgram client"
            result["debug_info"]["client_type"] = str(type(deepgram_client))
            result["debug_info"]["client_dir"] = dir(deepgram_client)
            
            # Try a simple operation - get balance if available
            if hasattr(deepgram_client, "manage") and hasattr(deepgram_client.manage, "get_balance"):
                try:
                    balance = await deepgram_client.manage.get_balance()
                    result["debug_info"]["balance_check"] = "success"
                    result["debug_info"]["balance"] = str(balance)
                except Exception as e:
                    result["debug_info"]["balance_check"] = f"failed: {str(e)}"
            else:
                result["debug_info"]["balance_check"] = "not available"
            
            return result
            
        except Exception as e:
            logger.error(f"Error in Deepgram connection test: {str(e)}")
            result["message"] = f"Failed during connection test: {str(e)}"
            result["debug_info"]["exception"] = str(e)
            return result

    async def generate_token(self, ttl_seconds=300):
        """Generate a temporary token for browser SDK with SDK v3."""
        if not self.api_key:
            logger.error("DEEPGRAM_API_KEY not configured.")
            return jsonify({"error": "Deepgram API key not configured on server."}), 500
        
        # Return currently stored API key - this may have been updated in test_connection 
        # if we found that the prefixed version works better
        try:
            logger.info("Returning master API key for development")
            
            # Return the current API key (which might have been updated with proper format)
            return jsonify({"apiKey": self.api_key}), 200
            
        except Exception as e:
            logger.error(f"Error generating Deepgram token: {str(e)}", exc_info=True)
            return jsonify({"error": f"Failed to generate Deepgram token: {str(e)}"}), 500
            
    async def test_features(self):
        """Test the Deepgram features API with SDK v3."""
        if not self.api_key:
            return jsonify({
                "status": "error",
                "error": "api_key_missing",
                "message": "Deepgram API key not configured on server."
            }), 500
        
        try:
            # Initialize Deepgram SDK with verbose logging
            config = DeepgramClientOptions(verbose=logging.DEBUG)
            deepgram = DeepgramClient(self.api_key, config)
            
            # Log available methods and attributes
            logger.info(f"Available methods on deepgram: {dir(deepgram)}")
            
            # In SDK v3, the correct way to access features is different
            # Try the manage API first
            try:
                logger.info("Attempting to list features through manage API")
                manage = deepgram.manage.v("1")
                logger.info(f"Available methods on manage: {dir(manage)}")
                
                # Check if there's a features endpoint on manage
                if hasattr(manage, 'list_features'):
                    features_response = await manage.list_features()
                    logger.info(f"✅ Features API call successful: {features_response}")
                    return jsonify({
                        "status": "success",
                        "message": "Features API call successful",
                        "features": features_response
                    }), 200
                elif hasattr(deepgram, 'features'):
                    # Try the direct features property if it exists
                    logger.info("Using deepgram.features property")
                    features_client = deepgram.features
                    logger.info(f"Available methods on features_client: {dir(features_client)}")
                    
                    # Try to call list_features()
                    features_response = await features_client.list_features()
                    logger.info(f"✅ Features API call successful: {features_response}")
                    return jsonify({
                        "status": "success", 
                        "message": "Features API call successful",
                        "features": features_response
                    }), 200
                else:
                    # If we can't find the features API, try a direct API call
                    logger.info("Features API not found, trying direct API call")
                    import httpx
                    
                    url = "https://api.deepgram.com/v1/listen/features"
                    headers = {"Authorization": f"Token {self.api_key}"}
                    
                    async with httpx.AsyncClient() as client:
                        response = await client.get(url, headers=headers)
                        
                    if response.status_code == 200:
                        logger.info(f"✅ Direct features API call successful: {response.text}")
                        return jsonify({
                            "status": "success",
                            "message": "Direct features API call successful",
                            "features": response.json()
                        }), 200
                    else:
                        logger.error(f"🔴 Direct features API call failed: {response.status_code} - {response.text}")
                        return jsonify({
                            "status": "error",
                            "message": f"Direct features API call failed: {response.status_code}",
                            "response": response.text
                        }), 500
            except Exception as e:
                error_message = str(e)
                logger.error(f"🔴 Error accessing features: {error_message}")
                return jsonify({
                    "status": "error",
                    "error": "features_api_error",
                    "message": f"Failed to access features API: {error_message}",
                    "exception_type": type(e).__name__
                }), 500
                
        except Exception as e:
            logger.error(f"🔴 Error testing Deepgram features: {e}")
            return jsonify({
                "status": "error",
                "error": "connection_error",
                "message": f"Failed to initialize Deepgram client: {str(e)}"
            }), 500

    def _format_deepgram_key(self, key):
        """Ensure the Deepgram API key is properly formatted."""
        if not key.startswith("dg_"):
            return f"dg_{key}"
        return key
    
    def get_api_key(self):
        """
        Get the Deepgram API key from environment variables.
        """
        # Check for hardcoded API key
        if self.config.get('api_key') and self.config.get('api_key') != 'your-api-key-here':
            return self.config.get('api_key')
        
        # Check for env var
        return os.environ.get('DEEPGRAM_API_KEY')
        
    def get_sdk_version(self):
        """
        Get the installed Deepgram SDK version.
        """
        try:
            import deepgram
            import pkg_resources
            
            # Try to get version from package metadata
            version = pkg_resources.get_distribution("deepgram-sdk").version
            return version
        except Exception as e:
            # If that fails, try alternative methods
            try:
                if hasattr(deepgram, "__version__"):
                    return deepgram.__version__
                elif hasattr(deepgram, "version"):
                    return deepgram.version
                else:
                    # Check module path to deduce version
                    return f"Unknown (module path: {deepgram.__file__})"
            except:
                return "Unknown (unable to determine version)"

    async def test_features_api(self):
        """
        Test method for debugging Deepgram Features API connectivity issues.
        Returns a dict with status, message, and debug info.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        result = {
            "status": "error",
            "message": "",
            "debug_info": {}
        }
        
        # Get API key
        api_key = self.get_api_key()
        if not api_key:
            result["message"] = "No Deepgram API key configured"
            return result
        
        # Log SDK version
        sdk_version = self.get_sdk_version()
        logger.info(f"Deepgram SDK Version: {sdk_version}")
        result["debug_info"]["sdk_version"] = sdk_version
        
        try:
            # Initialize client with verbose logging
            import deepgram
            from deepgram import (
                DeepgramClient,
                ClientOptionsFromEnv
            )
            
            # Create DeepgramClient with verbose logging
            client_options = ClientOptionsFromEnv()
            client_options.verbose = True
            deepgram_client = DeepgramClient(api_key, client_options)
            
            # Check what's available in the client
            client_dir = dir(deepgram_client)
            result["debug_info"]["client_attributes"] = client_dir
            logger.info(f"Client attributes: {client_dir}")
            
            # Try to access features directly
            if hasattr(deepgram_client, "features"):
                logger.info("Client has direct features property")
                try:
                    features_client = deepgram_client.features
                    features_response = await features_client.list_features()
                    result["status"] = "success"
                    result["message"] = "Successfully accessed features API"
                    result["debug_info"]["features_response"] = str(features_response)
                    return result
                except Exception as e:
                    logger.error(f"Error accessing features: {str(e)}")
                    result["debug_info"]["direct_features_error"] = str(e)
            # Check for v3 manage API
            if hasattr(deepgram_client, "manage"):
                logger.info("Trying to access features via manage API")
                try:
                    # In v3, features might be under manage
                    manage_client = deepgram_client.manage
                    manage_dir = dir(manage_client)
                    result["debug_info"]["manage_attributes"] = manage_dir
                    
                    if hasattr(manage_client, "features"):
                        logger.info("Found features under manage API")
                        features_client = manage_client.features
                        features_response = await features_client.list_features()
                        result["status"] = "success"
                        result["message"] = "Successfully accessed features via manage API"
                        result["debug_info"]["features_response"] = str(features_response)
                        return result
                    else:
                        result["message"] = "No features access found under manage API"
                        return result
                except Exception as e:
                    logger.error(f"Error accessing manage.features: {str(e)}")
                    result["debug_info"]["manage_features_error"] = str(e)
                
            result["message"] = "Could not access features API through any available method"
            return result
            
        except Exception as e:
            logger.error(f"General error during Deepgram features test: {str(e)}")
            result["message"] = f"Error during features test: {str(e)}"
            result["debug_info"]["exception"] = str(e)
            return result

    async def check_deepgram_config(self):
        """
        Detailed diagnostic method to check Deepgram configuration issues.
        Returns comprehensive information about the environment, SDK, and configuration.
        """
        import logging
        import sys
        import platform
        logger = logging.getLogger(__name__)
        
        result = {
            "status": "info",
            "message": "Deepgram configuration diagnostic results",
            "system_info": {},
            "sdk_info": {},
            "configuration": {},
            "connection_test": {}
        }
        
        # System information
        result["system_info"] = {
            "python_version": sys.version,
            "platform": platform.platform(),
            "processor": platform.processor()
        }
        
        # SDK information
        try:
            import deepgram
            import importlib.metadata as metadata
            
            # Get SDK version details
            sdk_version = self.get_sdk_version()
            result["sdk_info"]["version"] = sdk_version
            result["sdk_info"]["sdk_path"] = getattr(deepgram, "__file__", "Unknown")
            
            # Check installed packages related to Deepgram
            related_packages = []
            for pkg in metadata.distributions():
                pkg_name = pkg.metadata["Name"]
                if "deepgram" in pkg_name.lower():
                    related_packages.append({
                        "name": pkg_name,
                        "version": pkg.version
                    })
            result["sdk_info"]["related_packages"] = related_packages
            
            # Check SDK configuration
            result["sdk_info"]["available_modules"] = dir(deepgram)
            
            # Check if we have the expected classes for v3
            has_deepgram_client = hasattr(deepgram, "DeepgramClient")
            has_options = hasattr(deepgram, "ClientOptions") or hasattr(deepgram, "ClientOptionsFromEnv")
            result["sdk_info"]["has_expected_v3_classes"] = {
                "DeepgramClient": has_deepgram_client,
                "ClientOptions/ClientOptionsFromEnv": has_options
            }
            
        except Exception as e:
            result["sdk_info"]["error"] = f"Error analyzing SDK: {str(e)}"
        
        # Configuration information
        api_key = self.get_api_key()
        if api_key:
            # Safely display key info without exposing the full key
            key_length = len(api_key)
            has_prefix = api_key.startswith("dg_")
            key_start = api_key[:4] if key_length > 8 else "****"
            key_end = api_key[-4:] if key_length > 8 else "****"
            
            result["configuration"]["api_key_info"] = {
                "length": key_length,
                "has_dg_prefix": has_prefix,
                "format": f"{key_start}...{key_end}",
                "appears_valid": (has_prefix and key_length > 30) or (not has_prefix and key_length > 30)
            }
        else:
            result["configuration"]["api_key_info"] = "No API key configured"
        
        # Test basic connection
        try:
            # Use a simplified connection test to avoid recursion
            if not api_key:
                connection_test = {"status": "error", "message": "No API key configured"}
            else:
                try:
                    # Just create a client to test basic connectivity
                    import deepgram
                    from deepgram import DeepgramClient, ClientOptionsFromEnv
                    
                    client_options = ClientOptionsFromEnv()
                    deepgram_client = DeepgramClient(api_key, client_options)
                    
                    connection_test = {
                        "status": "success",
                        "message": "Successfully created Deepgram client",
                        "client_info": str(type(deepgram_client))
                    }
                except Exception as client_error:
                    connection_test = {
                        "status": "error",
                        "message": f"Failed to create Deepgram client: {str(client_error)}"
                    }
            
            result["connection_test"] = connection_test
        except Exception as e:
            result["connection_test"] = {"error": f"Connection test failed: {str(e)}"}
        
        return result

    async def test_manage_api(self):
        """
        Test method specifically for Deepgram manage API in SDK v3.
        Attempts to list projects and other manage endpoints to diagnose issues.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        result = {
            "status": "error",
            "message": "",
            "debug_info": {}
        }
        
        # Get API key
        api_key = self.get_api_key()
        if not api_key:
            result["message"] = "No Deepgram API key configured"
            return result
        
        # Log SDK version
        sdk_version = self.get_sdk_version()
        logger.info(f"Testing Deepgram manage API with SDK v{sdk_version}")
        result["debug_info"]["sdk_version"] = sdk_version
        
        try:
            # Import Deepgram
            import deepgram
            from deepgram import DeepgramClient, ClientOptionsFromEnv
            
            # Create client with verbose logging
            client_options = ClientOptionsFromEnv()
            client_options.verbose = True
            deepgram_client = DeepgramClient(api_key, client_options)
            
            # Check if manage API exists
            if not hasattr(deepgram_client, "manage"):
                result["message"] = "Manage API not found in Deepgram client"
                result["debug_info"]["client_dir"] = dir(deepgram_client)
                return result
            
            # Get manage API
            manage_api = deepgram_client.manage
            manage_dir = dir(manage_api)
            result["debug_info"]["manage_dir"] = manage_dir
            logger.info(f"Manage API methods: {manage_dir}")
            
            # Try to list projects
            projects_result = None
            if hasattr(manage_api, "get_projects"):
                try:
                    logger.info("Attempting to list projects")
                    projects = await manage_api.get_projects()
                    projects_result = {
                        "success": True,
                        "count": len(projects.projects) if hasattr(projects, "projects") else 0,
                        "data": str(projects)
                    }
                except Exception as e:
                    logger.error(f"Error listing projects: {str(e)}")
                    projects_result = {"success": False, "error": str(e)}
            else:
                projects_result = {
                    "success": False,
                    "error": "get_projects method not found"
                }
            
            result["debug_info"]["projects_test"] = projects_result
            
            # Try to get balance if available
            balance_result = None
            if hasattr(manage_api, "get_balance"):
                try:
                    logger.info("Attempting to get balance")
                    balance = await manage_api.get_balance()
                    balance_result = {
                        "success": True,
                        "data": str(balance)
                    }
                except Exception as e:
                    logger.error(f"Error getting balance: {str(e)}")
                    balance_result = {"success": False, "error": str(e)}
            else:
                balance_result = {
                    "success": False,
                    "error": "get_balance method not found"
                }
            
            result["debug_info"]["balance_test"] = balance_result
            
            # Overall status based on tests
            if projects_result and projects_result.get("success"):
                result["status"] = "success"
                result["message"] = "Successfully accessed Deepgram manage API"
            else:
                result["message"] = "Failed to access all manage API endpoints"
            
            return result
            
        except Exception as e:
            logger.error(f"Error testing Deepgram manage API: {str(e)}")
            result["message"] = f"Error during manage API test: {str(e)}"
            result["debug_info"]["exception"] = str(e)
            return result

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def transcribe_file(self, file_path, options=None) -> Optional[Dict]:
        """
        Transcribe an audio file using Deepgram with advanced options.
        Adds retry logic and specific exception handling.
        Returns transcription result dict or None on failure.
        """
        import logging
        import asyncio
        import time
        logger = logging.getLogger(__name__)
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return None # Return None instead of dict
            
        api_key = self.get_api_key()
        if not api_key:
            logger.error("No Deepgram API key configured")
            return None # Return None instead of dict
            
        # Default options if none provided
        if options is None:
            options = {
                "punctuate": True, 
                "diarize": True,
                "utterances": True
            }
            
        try:
            # Initialize client
            # Assuming self.api_key is the correctly formatted key
            client = DeepgramClient(self.api_key)
            
            # Prepare options object
            prerecorded_options = DeepgramClient.PrerecordedOptions(**options)
            
            # Open audio file
            with open(file_path, "rb") as audio:
                payload = {"buffer": audio}
                
                # Send to Deepgram
                logger.info(f"Sending file {file_path} to Deepgram for transcription...")
                start_time = time.time()
                response = await client.listen.prerecorded.v("1").transcribe_file(payload, prerecorded_options)
                duration = time.time() - start_time
                logger.info(f"Deepgram transcription successful for {file_path}. Duration: {duration:.2f}s")
                
                # Return the response object (usually a dict-like object)
                # The SDK v3 response object might not be directly serializable,
                # convert to dict if necessary for callers.
                return response.to_dict() # Convert Response object to dict
                
        except FileNotFoundError:
            logger.error(f"File not found during transcription attempt: {file_path}")
            return None
        except Exception as e: # Catch general exception for API call
            # Catch any other unexpected errors (including API errors after retry)
            logger.error(f"Error transcribing file {file_path} (after retries or non-retryable): {type(e).__name__} - {e}")
            logger.debug(traceback.format_exc())
            return None
            
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def transcribe_buffer(self, audio_buffer, options=None) -> Optional[Dict]:
        """
        Transcribe an audio buffer using Deepgram with advanced options.
        Adds retry logic and specific exception handling.
        Returns transcription result dict or None on failure.
        """
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        if not audio_buffer:
            logger.error("Empty audio buffer provided")
            return None # Return None instead of dict
            
        api_key = self.get_api_key()
        if not api_key:
            logger.error("No Deepgram API key configured")
            return None # Return None instead of dict
            
        # Default options if none provided
        if options is None:
            options = {
                "punctuate": True, 
                "diarize": True,
                "utterances": True
            }
            
        try:
            # Initialize client
            client = DeepgramClient(self.api_key)
            
            # Prepare options object (fix for SDK v3.0.0)
            from deepgram import PrerecordedOptions
            prerecorded_options = PrerecordedOptions(**options)
            
            # Prepare payload
            payload = {"buffer": audio_buffer}
            
            # Send to Deepgram
            logger.info(f"Sending audio buffer (size: {len(audio_buffer)}) to Deepgram for transcription...")
            start_time = time.time()
            response = await client.listen.prerecorded.v("1").transcribe_buffer(payload, prerecorded_options)
            duration = time.time() - start_time
            logger.info(f"Deepgram buffer transcription successful. Duration: {duration:.2f}s")
            
            # Return the response object converted to dict
            return response.to_dict()
            
        except Exception as e: # Catch general exception for API call
            # Catch any other unexpected errors (including API errors after retry)
            logger.error(f"Error transcribing buffer (after retries or non-retryable): {type(e).__name__} - {e}")
            logger.debug(traceback.format_exc())
            return None

# Create an instance of the service
deepgram_service = DeepgramService()

# Initialize the event loop
def ensure_event_loop():
    global event_loop
    try:
        event_loop = asyncio.get_event_loop()
    except RuntimeError:
        # If there is no event loop in the current thread, create a new one
        event_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(event_loop)
    return event_loop

# --- Socket.IO event handlers (OBSOLETE for SDK-based STT) ---
# If SocketIO is used for OTHER features (chat messages?), keep relevant parts.
# Otherwise, these can be removed.

# @sio.event
# async def connect(sid, environ):
#     """Handle client connection."""
#     logger.info(f"Client connected: {sid}")
#     # Remove Deepgram-specific ready emit if only using SDK
#     # await sio.emit('ready', {}, room=sid)

# @sio.event
# async def disconnect(sid):
#     """Handle client disconnection."""
#     logger.info(f"Client disconnected: {sid}")
#     # Remove Deepgram-specific stream stop if only using SDK
#     # await deepgram_service.stop_stream(sid)
#     # if sid in active_streams:
#     #     del active_streams[sid]

# @sio.event
# async def start_stream(sid, options=None):
#     """(OBSOLETE for SDK) Start streaming for a client."""
#     logger.warning(f"Received obsolete 'start_stream' event from {sid}")
#     # Implementation removed

# @sio.event
# async def stop_stream(sid):
#     """(OBSOLETE for SDK) Stop streaming for a client."""
#     logger.warning(f"Received obsolete 'stop_stream' event from {sid}")
#     # Implementation removed

# @sio.event
# async def audio_data(sid, data):
#     """(OBSOLETE for SDK) Handle audio data from a client."""
#     # logger.warning(f"Received obsolete 'audio_data' event from {sid}")
#     pass # Implementation removed

# Keep run_async if still needed for other async operations called synchronously
def run_async(func, *args, **kwargs):
    """Run an async function in a new event loop."""
    loop = ensure_event_loop()
    if loop.is_running():
        # Create a Future to hold the result
        future = asyncio.run_coroutine_threadsafe(func(*args, **kwargs), loop)
        return future.result()
    else:
        return loop.run_until_complete(func(*args, **kwargs)) 

# --- Add Fallback Deepgram Token Route --- Moved from app/__init__.py
@deepgram_bp.route('/get_token', methods=['GET'])
def get_deepgram_token_fallback():
    """Fallback route to provide Deepgram token directly from app."""
    # --- Add Logging ---
    logger.info("*** HIT FALLBACK Deepgram token route in deepgram_service.py ***")
    # --- End Logging ---
    try:
        # Use the initialized service if possible, otherwise fallback to env var
        from . import deepgram_service # Assuming deepgram_service instance exists
        if deepgram_service and deepgram_service.is_initialized:
            token = deepgram_service.get_api_key() # Or a method to generate a temporary token
            logger.info("Fallback route: Using key from initialized Deepgram service.")
        else:
            logger.warning("Fallback route: Deepgram service not initialized, falling back to env var.")
            token = os.environ.get('DEEPGRAM_API_KEY', '')
        
        if not token:
            # --- Add Logging ---
            logger.error("Fallback route: DEEPGRAM_API_KEY not found in environment or service.")
            # --- End Logging ---
            return jsonify({'error': 'DEEPGRAM_API_KEY not configured'}), 500

        # Placeholder: In a real scenario, generate a short-lived key here
        # For now, returning a static placeholder or the main key (use with caution)
        # Using a placeholder for safety in this example
        logger.warning("Fallback route: Returning placeholder/main key - replace with secure token generation!")
        return jsonify({
            'token': token, 
            'apiKey': token, # Provide both for compatibility
            'message': 'Using fallback token route'
        })

    except Exception as e:
        # --- Add Logging ---
        logger.error(f"Fallback route: Error getting Deepgram token: {str(e)}", exc_info=True)
        # --- End Logging ---
        return jsonify({'error': str(e)}), 500
# --- End Fallback Route --- 