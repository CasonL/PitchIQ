"""
OpenAI Service Module

This module provides a service for interacting with the OpenAI API.
It has been updated to use the v0.28.1 API structure.
"""

import logging
import os
import traceback
from typing import List, Dict, Any, Optional
import openai  # Import the base openai library
from flask import current_app, Flask
import json
import httpx
import ssl
import certifi
import socket
import time
import platform
import dns.resolver  # Ensure this is in requirements.txt
from dotenv import load_dotenv
from openai import APIError, RateLimitError, APITimeoutError, APIConnectionError, APIStatusError # Updated imports for specific errors
from tenacity import retry, stop_after_attempt, wait_exponential

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Constants
MODEL_NAME = "gpt-4o-mini"  # Changed from gpt-3.5-turbo
MAX_TOKENS_RESPONSE = 2000 # Max tokens for the completion response
DEFAULT_TEMPERATURE = 0.5

class OpenAIService:
    """Service for generating responses from OpenAI models."""
    
    def __init__(self):
        """Initialize placeholder values. Actual init requires app context."""
        self.initialized = False
        self.client = None  # Initialize client attribute
        self.api_key = None
        self.model = None
        self.feedback_model = None
        self.mock_mode = os.environ.get('OPENAI_MOCK_MODE', 'false').lower() in ('true', '1', 'yes')
        logger.info(f"OpenAIService instance created (uninitialized). Mock mode: {self.mock_mode}")
        self.last_system_prompt = None
        
    def init_app(self, app: Flask):
        """Initialize the service with app context. Call this from create_app."""
        if self.initialized:
            logger.warning("OpenAIService already initialized.")
            return
            
        logger.info("Initializing OpenAIService with app context...")
        try:
            # Use with app.app_context() if called outside request context, 
            # but usually called from create_app where context is available.
            self.api_key = app.config.get('OPENAI_API_KEY') or os.environ.get('OPENAI_API_KEY')
            
            # Set the model names from config or environment variables
            self.model = app.config.get('OPENAI_MODEL') or os.environ.get('OPENAI_MODEL', MODEL_NAME)
            self.feedback_model = app.config.get('OPENAI_FEEDBACK_MODEL') or os.environ.get('OPENAI_FEEDBACK_MODEL', self.model)
            logger.info(f"Resolved OpenAI model: {self.model} (Config: {app.config.get('OPENAI_MODEL')}, Env: {os.environ.get('OPENAI_MODEL')}, Default: {MODEL_NAME})")
            logger.info(f"Resolved feedback model: {self.feedback_model} (Config: {app.config.get('OPENAI_FEEDBACK_MODEL')}, Env: {os.environ.get('OPENAI_FEEDBACK_MODEL')}, Default: {self.model})")
            
            if self.mock_mode:
                logger.info("MOCK MODE ENABLED: Setting up mock OpenAI responses")
                # Setup mock mode for v0.28.1 API
                self._setup_mock_mode()
                self.initialized = True
                logger.info("OpenAIService initialized in mock mode.")
                return
            
            if not self.api_key:
                logger.error("OpenAI API key is missing. Please set OPENAI_API_KEY environment variable.")
                return

            if not self.api_key.startswith('sk-'):
                logger.error(f"Invalid OpenAI API key format: {self.api_key[:5]}...")
                return

            # Instantiate the OpenAI client
            self.client = openai.OpenAI(api_key=self.api_key)
            logger.info("OpenAI client instantiated.")

            # Log OS and network info
            self._log_network_info()

            # Set API key for the module (global config in v0.28.1)
            openai.api_key = self.api_key
            
            # Set API base to default value
            openai.api_base = "https://api.openai.com/v1" # This line is effectively replaced by client instantiation
            
            # Log setup for clarity
            logger.info("Set OpenAI API key and base URL") # This log message might be misleading now
                
            # Check if we should skip connectivity tests
            skip_tests = os.environ.get('OPENAI_SKIP_TESTS', '').lower() in ('true', '1', 'yes')
            if skip_tests:
                logger.info("Skipping OpenAI connectivity tests due to OPENAI_SKIP_TESTS=true")
                self.initialized = True
                return
            
            # Test basic socket connectivity to OpenAI
            def test_socket_connectivity(host, port, timeout=5):
                """Test basic TCP socket connectivity to a host:port"""
                try:
                    logger.info(f"Testing basic connectivity to {host}:{port}...")
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(timeout)  # Set a shorter timeout for faster failure
                    sock.connect((host, port))
                    sock.close()
                    logger.info(f"Socket connection to {host}:{port} successful")
                    return True
                except socket.gaierror as e:
                    logger.warning(f"Socket connection to {host}:{port} failed with DNS error: {str(e)}")
                    return False
                except socket.timeout as e:
                    logger.warning(f"Socket connection to {host}:{port} timed out: {str(e)}")
                    return False
                except Exception as e:
                    logger.warning(f"Socket connection to {host}:{port} failed: {str(e)}")
                    return False
            
            # Always use domain-based test
            test_socket_connectivity("api.openai.com", 443)
            
            # Test API connection with retry logic and improved error handling
            max_retries = 5
            api_test_success = False
            for attempt in range(1, max_retries + 1):
                try:
                    logger.info(f"Testing OpenAI API connection with model: {self.model} (attempt {attempt}/{max_retries})...")
                    
                    # Use the API to test connection in v1.x
                    list_response = self.client.models.list()
                    logger.info(f"OpenAI API connection successful. {len(list_response.data)} models available.")
                    api_test_success = True
                    break  # Exit the retry loop on success
                except APIError as api_e: # Catching a more general APIError from openai v1.x
                    logger.error(f"OpenAI API test failed for model {self.model} (attempt {attempt}/{max_retries}): {str(api_e)}")
                    
                    # Detailed error analysis - specific error types can be caught if needed
                    if "Proxy" in str(api_e) or "407" in str(api_e):
                        logger.error("Likely proxy authentication issue. Check proxy settings.")
                    elif "SSL" in str(api_e) or "certificate" in str(api_e):
                        logger.error("SSL certificate verification issue. Check system certificates.")
                    elif "Connection" in str(api_e) or "timeout" in str(api_e).lower():
                        logger.error("Network connectivity issue. Check firewall settings.")
                    
                    if attempt < max_retries:
                        retry_delay = 2 ** attempt  # Exponential backoff
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
            
            if not api_test_success:
                logger.warning("All API test attempts failed. Continuing with initialization anyway.")

            # Set initialized flag to True
            self.initialized = True
            logger.info(f"OpenAIService initialized successfully.")

        except Exception as e:
            logger.error(f"Error during OpenAIService init_app: {str(e)}", exc_info=True)
            self.initialized = False
    
    def _test_direct_ip_connection(self, ip_address: str):
        """Tests direct HTTPS connection to a given IP address using httpx."""
        try:
            target_url = f"https://{ip_address}/v1/models"
            headers = {"Host": "api.openai.com"} # Essential for SNI and correct routing
            logger.info(f"Attempting direct HTTPS GET to {target_url} (IP: {ip_address}) with Host header...")

            # Use a default httpx client for this specific test
            with httpx.Client(timeout=30.0) as test_client:
                test_response = test_client.get(target_url, headers=headers)
                test_response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
                logger.info(f"Direct httpx GET to IP {ip_address} successful. Status Code: {test_response.status_code}")
                return True

        except httpx.RequestError as req_err:
            # Includes ConnectError, ReadTimeout, etc.
            logger.error(f"Direct httpx GET to IP {ip_address} failed (Request Error): {req_err.__class__.__name__} - {req_err}")
        except httpx.HTTPStatusError as status_err:
            # Handles non-2xx responses
            logger.error(f"Direct httpx GET to IP {ip_address} failed (HTTP Status Error): {status_err.response.status_code} - {status_err}")
        except Exception as e:
            # Catch potential SSL errors or other unexpected issues
            logger.error(f"Direct httpx GET to IP {ip_address} failed (Other Error): {e.__class__.__name__} - {e}")
        return False

    def _log_network_info(self):
        """Logs relevant OS and network configuration details for debugging."""
        try:
            os_info = f"{platform.system()} {platform.release()} ({platform.version()})"
            logger.info(f"Operating system: {os_info}")

            # Get local IP address(es)
            hostname = socket.gethostname()
            try:
                # Try getting IP associated with hostname first
                host_ip = socket.gethostbyname(hostname)
                logger.info(f"Hostname: {hostname}, Primary IP (gethostbyname): {host_ip}")
                # Additionally, try getaddrinfo for potentially more IPs
                all_ips = [ip[4][0] for ip in socket.getaddrinfo(hostname, None)]
                logger.info(f"All IPs for hostname (getaddrinfo): {list(set(all_ips))}")
            except socket.gaierror as e:
                logger.warning(f"Could not determine local IP via hostname lookup: {e}")
                # Fallback: Try connecting to an external address (doesn't send data)
                try:
                    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                        s.connect(("8.8.8.8", 80))
                        local_ip = s.getsockname()[0]
                        logger.info(f"Local IP (external connection method): {local_ip}")
                except Exception as sock_e:
                    logger.warning(f"Could not determine local IP via socket connection method: {sock_e}")
            except Exception as ip_e:
                logger.warning(f"Could not determine local IP: {ip_e}")

            # Log proxy environment variables
            http_proxy = os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy')
            https_proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
            no_proxy = os.environ.get('NO_PROXY') or os.environ.get('no_proxy')
            logger.info(f"Proxy environment: HTTP_PROXY={http_proxy}, HTTPS_PROXY={https_proxy}, NO_PROXY={no_proxy}")

            # Log Python and library versions
            logger.info(f"Python version: {platform.python_version()}")
            try:
                import openai
                import httpx
                import certifi
                import dns.resolver
                logger.info(f"openai version: {openai.__version__}")
                logger.info(f"httpx version: {httpx.__version__}")
                logger.info(f"certifi path: {certifi.where()}")
                logger.info(f"dnspython version: {dns.__version__}")
            except ImportError as imp_err:
                logger.warning(f"Could not import a library to check version: {imp_err}")

        except Exception as e:
            logger.error(f"Error logging network info: {e}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def generate_response(self, messages: List[Dict[str, str]], system_prompt: str = None, 
                        temperature: float = 0.7, max_tokens: int = 2000, model: str = None) -> Optional[str]:
        """
        Adds retry logic and specific exception handling.
        Returns the response content string or None on failure.
        
        Args:
            messages: List of message dictionaries with role and content
            system_prompt: Optional system prompt to prepend to messages
            temperature: Temperature parameter for controlling randomness
            max_tokens: Maximum tokens to generate
            model: Optional override for the default model
            
        Returns:
            String containing the generated text or None if failed
        """
        if not self.initialized or not self.client:
            logger.error("OpenAIService not initialized or client not available. Cannot generate response.")
            return None
        
        if self.mock_mode:
            logger.info("Using mock response in generate_response")
            # Pass original arguments to mock function
            return "This is a mock response from the OpenAI service."
        
        try:
            # Prepare messages for the API
            formatted_messages = []
            
            # If system prompt provided, add or replace system message
            if system_prompt:
                # Enhanced system prompt with formatting instructions
                enhanced_prompt = self._enhance_system_prompt(system_prompt)
                formatted_messages.append({"role": "system", "content": enhanced_prompt})
            elif messages and messages[0]['role'] == 'system':
                # If first message is already a system message, enhance it
                enhanced_content = self._enhance_system_prompt(messages[0]['content'])
                formatted_messages.append({"role": "system", "content": enhanced_content})
                messages = messages[1:]  # Skip the first message in subsequent processing
            else:
                # Add default system message
                formatted_messages.append({"role": "system", "content": "You are a helpful assistant."})
            
            # Add the rest of the messages
            formatted_messages.extend(messages)
            
            # Determine which model to use (passed model overrides instance model)
            model_to_use = model or self.model
            
            logger.info(f"Generating response with {len(formatted_messages)} messages, temp={temperature}, model={model_to_use}")
            
            # Make the API request
            response = self.client.chat.completions.create(
                model=model_to_use,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract and return the generated text
            if response.choices and len(response.choices) > 0:
                result = response.choices[0].message.content
                return result
            else:
                error_msg = "No choices returned from OpenAI API"
                logger.error(error_msg)
                return f"Error: {error_msg}"
            
        except RateLimitError as e:
            logger.error(f"OpenAI API rate limit exceeded: {e}")
            return "Rate limit exceeded. Please try again later."
        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            return f"An API error occurred: {e}"
        except Exception as e:
            logger.error(f"Unexpected error in OpenAI interaction: {e}", exc_info=True)
            return f"An unexpected error occurred: {e}"

    def _enhance_system_prompt(self, original_prompt: str) -> str:
        """
        Enhances system prompts with standard guidance, but removes the
        unnecessary spacing instructions since GPT models already add spaces properly.
        
        Args:
            original_prompt: The original system prompt
            
        Returns:
            Enhanced system prompt
        """
        # We no longer need to add formatting instructions since we fixed the
        # code that was actually removing spaces
        return original_prompt

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def generate_feedback(self, conversation_history: List[Dict[str, str]], user_profile: Dict[str, Any]) -> Optional[str]:
        """
        Generate detailed feedback using the feedback model.
        Adds retry logic and specific exception handling.
        Returns the feedback string or None on failure.
        """
        if not self.initialized or not self.client:
            logger.error("OpenAIService not initialized or client not available. Cannot generate feedback.")
            return None
            
        # Construct the prompt
        prompt_messages = self._construct_feedback_prompt(conversation_history, user_profile)
        if not prompt_messages:
            return None # Error logged in construct method

        logger.info(f"Generating feedback using model: {self.feedback_model}")
        logger.debug(f"Messages sent to feedback model: {json.dumps(prompt_messages)}")
        
        try:
            start_time = time.time()
            # Use older API structure for v0.28.1
            response = self.client.chat.completions.create(
                model=self.feedback_model,
                messages=prompt_messages,
                temperature=0.5,  # Lower temp for more focused feedback
                max_tokens=3000 # Allow longer feedback
            )
            end_time = time.time()
            duration = end_time - start_time
            logger.info(f"OpenAI feedback generation successful. Duration: {duration:.2f} seconds")

            if response.choices and len(response.choices) > 0:
                feedback_content = response.choices[0].message.content
                logger.debug(f"Received feedback content: {feedback_content[:100]}...")
                # Log token usage
                if hasattr(response, 'usage'):
                    logger.info(f"Feedback Token Usage: Prompt={response.usage.prompt_tokens}, Completion={response.usage.completion_tokens}, Total={response.usage.total_tokens}")
                return feedback_content.strip()
            else:
                logger.error("OpenAI feedback response missing expected content.")
                logger.debug(f"Full feedback response: {response}")
                return None

        except Exception as e:
            logger.error(f"Error during feedback generation: {type(e).__name__} - {e}")
            logger.debug(traceback.format_exc())
            return None

    def _construct_feedback_prompt(self, conversation_history, user_profile):
        # ... (existing helper function) ...
        pass

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def generate_text(self, prompt, model=None, max_tokens=500, temperature=0.7) -> Optional[str]:
        """
        Generate text using the standard completions endpoint (for older models).
        Adds retry logic and specific exception handling.
        Returns the generated text or None on failure.
        """
        if not self.initialized or not self.client:
            logger.error("OpenAIService not initialized or client not available. Cannot generate text.")
            return None

        current_model = model if model else self.model
        logger.info(f"Generating text with model {current_model} using legacy completion endpoint.")

        try:
            start_time = time.time()
            # Use older API structure in v0.28.1
            response = self.client.completions.create(
                model=current_model,
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature
            )
            end_time = time.time()
            duration = end_time - start_time
            logger.info(f"OpenAI text generation successful. Duration: {duration:.2f} seconds")

            if response.choices and len(response.choices) > 0:
                text_content = response.choices[0].text
                # Log token usage
                if hasattr(response, 'usage'):
                    logger.info(f"Text Gen Token Usage: Prompt={response.usage.prompt_tokens}, Completion={response.usage.completion_tokens}, Total={response.usage.total_tokens}")
                return text_content.strip()
            else:
                logger.error("OpenAI text generation response missing expected content.")
                logger.debug(f"Full text gen response: {response}")
                return None

        except Exception as e:
            logger.error(f"Error during text generation: {type(e).__name__} - {e}")
            logger.debug(traceback.format_exc())
            return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def transcribe_audio(self, audio_file, language="en") -> Optional[str]:
        """
        Transcribe audio using OpenAI Whisper API.
        Adds retry logic and specific exception handling.
        Returns the transcription text or None on failure.
        """
        if not self.initialized or not self.client:
            logger.error("OpenAIService not initialized or client not available. Cannot transcribe audio.")
            return None

        logger.info(f"Transcribing audio file: {getattr(audio_file, 'name', 'N/A')}, Language: {language}")
        
        try:
            start_time = time.time()
            # Ensure the file pointer is at the beginning if it's a file object
            if hasattr(audio_file, 'seek'):
                audio_file.seek(0)
            
            # Use the new client for audio transcriptions
            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language
            )
            end_time = time.time()
            duration = end_time - start_time
            logger.info(f"OpenAI audio transcription successful. Duration: {duration:.2f} seconds")

            if response.text:
                transcription_text = response.text
                logger.debug(f"Received transcription: {transcription_text[:100]}...")
                return transcription_text
            else:
                logger.error("OpenAI transcription response missing expected text.")
                logger.debug(f"Full transcription response: {response}")
                return None

        except APIError as e:
            logger.error(f"OpenAI API error during transcription: {str(e)}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Unexpected error during audio transcription: {str(e)}", exc_info=True)
            return None

    def _setup_mock_mode(self):
        """Set up mock mode for the v0.28.1 OpenAI API structure."""
        # We'll monkey patch the API methods to return mock responses
        
        # Store original methods to restore later if needed
        self._original_chat_create = openai.ChatCompletion.create
        self._original_completion_create = openai.Completion.create
        self._original_audio_transcribe = openai.Audio.transcribe
        
        # Mock ChatCompletion.create
        def mock_chat_create(*args, **kwargs):
            logger.info(f"MOCK: Creating chat completion for model {kwargs.get('model', 'unknown')}")
            response_class = type('MockResponse', (), {})
            response = response_class()
            
            # Create a mock choice
            choice_class = type('MockChoice', (), {})
            choice = choice_class()
            message_class = type('MockMessage', (), {})
            message = message_class()
            
            # Set up the mock message content
            message.content = "This is a mock response from OpenAI API in mock mode."
            message.role = "assistant"
            
            # Set up the mock choice
            choice.message = message
            choice.index = 0
            choice.finish_reason = "stop"
            
            # Set up the mock usage
            usage_class = type('MockUsage', (), {})
            usage = usage_class()
            usage.prompt_tokens = 10
            usage.completion_tokens = 20
            usage.total_tokens = 30
            
            # Set up the mock response
            response.choices = [choice]
            response.id = "mock-chat-completion-id"
            response.model = kwargs.get('model', 'mock-model')
            response.usage = usage
            
            return response
        
        # Mock Completion.create
        def mock_completion_create(*args, **kwargs):
            logger.info(f"MOCK: Creating completion for model {kwargs.get('model', 'unknown')}")
            response_class = type('MockResponse', (), {})
            response = response_class()
            
            # Create a mock choice
            choice_class = type('MockChoice', (), {})
            choice = choice_class()
            
            # Set up the mock choice
            choice.text = "This is a mock text response from OpenAI API in mock mode."
            choice.index = 0
            choice.finish_reason = "stop"
            
            # Set up the mock usage
            usage_class = type('MockUsage', (), {})
            usage = usage_class()
            usage.prompt_tokens = 5
            usage.completion_tokens = 15
            usage.total_tokens = 20
            
            # Set up the mock response
            response.choices = [choice]
            response.id = "mock-completion-id"
            response.model = kwargs.get('model', 'mock-model')
            response.usage = usage
            
            return response
            
        # Mock Audio.transcribe
        def mock_audio_transcribe(*args, **kwargs):
            logger.info(f"MOCK: Transcribing audio with model {kwargs.get('model', 'whisper-1')}")
            response_class = type('MockResponse', (), {})
            response = response_class()
            
            # Set up the mock response
            response.text = "This is a mock transcription from OpenAI Whisper API in mock mode."
            
            return response
        
        # Apply the mocks
        openai.ChatCompletion.create = mock_chat_create
        openai.Completion.create = mock_completion_create
        openai.Audio.transcribe = mock_audio_transcribe
        
        logger.info("Mock mode setup complete for OpenAI API.")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def create_embedding(self, text, model="text-embedding-ada-002") -> Optional[Dict[str, Any]]:
        """
        Generate embeddings for the given text using OpenAI's embedding model.
        
        Args:
            text (str): The text to embed
            model (str): The embedding model to use
            
        Returns:
            Optional[Dict[str, Any]]: A dictionary containing the embedding vector
                                    or None if the operation failed
        """
        if not self.initialized or not self.client:
            logger.error("OpenAIService not initialized or client not available. Cannot create embedding.")
            return None
            
        try:
            logger.info(f"Creating embedding for text (length: {len(text)}) with model {model}")
            
            # Trim and clean the text if too long
            if len(text) > 8000:
                logger.warning(f"Text too long for embedding ({len(text)} chars), truncating to 8000 chars")
                text = text[:8000]
            
            start_time = time.time()
            
            # Use the new client for embeddings
            response = self.client.embeddings.create(
                input=[text.replace("\n", " ")], # API recommendation: replace newlines with spaces
                model=model
            )
            
            end_time = time.time()
            duration = end_time - start_time
            logger.info(f"OpenAI embedding generation successful. Duration: {duration:.2f} seconds")
            
            if response.data and len(response.data) > 0:
                # Extract the embedding vector
                embedding_vector = response.data[0].embedding
                logger.info(f"Generated embedding vector with {len(embedding_vector)} dimensions")
                
                # Log token usage if available
                if hasattr(response, 'usage'):
                    logger.info(f"Embedding Token Usage: {response.usage.total_tokens} tokens")
                
                return {
                    "embedding": embedding_vector,
                    "model": model,
                    "dimensions": len(embedding_vector),
                    "text_length": len(text)
                }
            else:
                logger.error("No embedding data received from OpenAI API.")
                logger.debug(f"Full embedding response: {response}")
                return None
                
        except APIError as e:
            logger.error(f"OpenAI API error during embedding creation: {str(e)}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Unexpected error during embedding creation: {str(e)}", exc_info=True)
            return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def get_completion(self, prompt: str, system_prompt: str = None, 
                      temperature: float = 0.7, max_tokens: int = 500, model: str = None) -> Optional[str]:
        """
        Simple completion method for single prompt requests.
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            temperature: Temperature parameter for controlling randomness
            max_tokens: Maximum tokens to generate
            model: Optional override for the default model
            
        Returns:
            String containing the generated text or None if failed
        """
        messages = [{"role": "user", "content": prompt}]
        return self.generate_response(
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            model=model
        )

    def chat_completion(self, messages: List[Dict[str, str]], max_tokens: int = 500, 
                       temperature: float = 0.7, model: str = None) -> Optional[str]:
        """
        Chat completion method for message-based requests.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            max_tokens: Maximum tokens to generate
            temperature: Temperature parameter for controlling randomness
            model: Optional override for the default model
            
        Returns:
            String containing the generated text or None if failed
        """
        return self.generate_response(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            model=model
        )

# --- Global Instance --- 
# Create an instance but don't initialize fully here.
# Initialization needs app context via init_app().
openai_service = OpenAIService()

# --- get_openai_service function --- 
def get_openai_service():
    """Get the initialized OpenAI service instance."""
    global openai_service
    if not openai_service.initialized:
        logger.warning("Accessing OpenAI service before init_app. Ensure init_app is called in create_app.")
    return openai_service 