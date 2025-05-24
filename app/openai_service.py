import logging
import os
import traceback
import socket
import json
import ssl
from typing import List, Dict, Any, Optional
from openai import OpenAI, APIError, RateLimitError
from flask import current_app, Flask
import httpx
import certifi
import random
import time

# Configure logging
logger = logging.getLogger(__name__)

# Constants
MODEL_NAME = "gpt-3.5-turbo"  # Changed from gpt-4.1-mini to a more widely available model
MAX_TOKENS_RESPONSE = 2000 # Max tokens for the completion response
DEFAULT_TEMPERATURE = 0.5

class OpenAIService:
    """Service for generating responses from OpenAI models."""
    
    def __init__(self):
        """Initialize placeholder values. Actual init requires app context."""
        self.initialized = False
        self.api_key = None
        self.client = None
        self.model = None
        self.feedback_model = None
        logger.info("OpenAIService instance created (uninitialized).")
        
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
            
            if not self.api_key:
                logger.error("OpenAI API Key not found in config or environment.")
                return

            if not self.api_key.startswith('sk-'):
                logger.error(f"Invalid OpenAI API key format: {self.api_key[:5]}...")
                return

            # Create client with improved configuration for Windows environments
            try:
                # Log the local IP address for debugging connectivity issues
                try:
                    host_ip = socket.gethostbyname(socket.gethostname())
                    logger.info(f"Local IP address: {host_ip}")
                except Exception as ip_e:
                    logger.warning(f"Could not determine local IP: {str(ip_e)}")

                # Get proxy settings from environment variables
                http_proxy = os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy')
                https_proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
                no_proxy = os.environ.get('NO_PROXY') or os.environ.get('no_proxy')
                
                logger.info(f"Proxy environment: HTTP_PROXY={http_proxy}, HTTPS_PROXY={https_proxy}, NO_PROXY={no_proxy}")
                
                # Create proxy settings
                proxies = None
                if https_proxy:
                    proxies = {
                        "https://": https_proxy,
                    }
                    if http_proxy:
                        proxies["http://"] = http_proxy
                    logger.info(f"Using proxy settings: {proxies}")
                else:
                    # Explicitly set proxies to None to bypass system settings
                    logger.info("No proxies defined in environment, bypassing system proxies")
                
                # For troubleshooting connection issues, try with httpx
                try:
                    logger.info("Testing connectivity to api.openai.com with httpx...")
                    timeout = httpx.Timeout(10.0)
                    with httpx.Client(timeout=timeout) as client:
                        response = client.get("https://api.openai.com/v1/models")
                        logger.info(f"Test connection to OpenAI API: Status {response.status_code}")
                except Exception as http_e:
                    logger.warning(f"Test connection to OpenAI API failed: {str(http_e)}")
                
                # Create a client with robust timeout settings
                custom_http_client = httpx.Client(
                    timeout=30.0,          # Increase timeout to 30 seconds
                    follow_redirects=True,
                    verify=True            # Use system certificates
                )
                
                logger.info("Created custom HTTP client for OpenAI API")
                
                # Create the OpenAI client with our improved HTTP client
                self.client = OpenAI(
                    api_key=self.api_key,
                    http_client=custom_http_client,
                    base_url="https://api.openai.com/v1"  # Explicitly set the base URL
                )
                
                logger.info("Created OpenAI client with improved HTTP configuration")
            except Exception as client_e:
                logger.error(f"Failed to create OpenAI client: {str(client_e)}")
                logger.error(traceback.format_exc())
                self.initialized = False
                return
            
            self.model = app.config.get('OPENAI_MODEL', MODEL_NAME)
            self.feedback_model = app.config.get('OPENAI_FEEDBACK_MODEL', MODEL_NAME)
            
            # Set initialized to True regardless of API test
            self.initialized = True
            logger.info(f"OpenAIService initialized with client.")
            
            # Test API connection
            try:
                logger.info(f"Testing OpenAI API connection with model: {self.model}...")
                self.client.models.retrieve(self.model) # Simpler test than create()
                logger.info(f"OpenAI API connection successful for model: {self.model}")
            except Exception as api_e:
                logger.error(f"OpenAI API test failed for model {self.model}: {str(api_e)}")
                logger.error(traceback.format_exc())
                # No longer unsets initialized flag on API test failure
                logger.warning("Continuing with initialization despite API test failure")

        except Exception as e:
            logger.error(f"Error during OpenAIService init_app: {str(e)}", exc_info=True)
            self.initialized = False
    
    def generate_response(self, messages: List[Dict[str, str]], system_prompt: str = None, 
                        temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """
        Generate a response from OpenAI models.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: Optional system prompt to prepend
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        
        try:
            # Prepare messages for the API
            formatted_messages = []
            
            # Add system prompt if provided and not already in messages
            if system_prompt and (not messages or messages[0]['role'] != 'system'):
                formatted_messages.append({"role": "system", "content": system_prompt})
            
            # Add the rest of the messages
            formatted_messages.extend(messages)
            
            logger.info(f"Generating response with {len(formatted_messages)} messages, temp={temperature}, model={self.model}")
            
            # Make the API request
            response = self.client.chat.completions.create(
                model=self.model,
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
            # Use app logger directly
            current_app.logger.error(f"OpenAI API rate limit exceeded: {e}")
            return "Rate limit exceeded. Please try again later."
        except APIError as e:
            current_app.logger.error(f"OpenAI API error: {e}")
            return f"An API error occurred: {e}"
        except Exception as e:
            current_app.logger.error(f"Unexpected error in OpenAI interaction: {e}", exc_info=True)
            return f"An unexpected error occurred: {e}"

    def generate_streaming_response(self, messages: List[Dict[str, str]], system_prompt: str = None,
                           temperature: float = 0.7, max_tokens: int = 2000):
        """
        Generate a streaming response from OpenAI models. Instead of returning the
        complete response at once, this method yields individual tokens as they're
        generated for a more natural, progressive text display.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: Optional system prompt to prepend
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Yields:
            Text chunks as they are generated
        """
        try:
            # Prepare messages with more natural, conversational instructions
            formatted_messages = []
            
            # Create a system prompt that encourages more natural, conversational responses
            base_system_prompt = """
            Respond in a natural, conversational way with shorter sentences and occasional pauses.
            Use more casual language, incomplete thoughts at times, and vary your pacing.
            Don't be afraid to start sentences with conjunctions or use ellipses... or short fragments.
            This creates a more human-like typing rhythm.
            
            Occasionally:
            - Use shorter sentences or fragments
            - Pause with commas, or use "..." 
            - Vary sentence length significantly
            """
            
            # Add system prompt with our conversational instructions
            if system_prompt:
                # Combine user's system prompt with our conversation instructions
                combined_prompt = f"{system_prompt}\n\n{base_system_prompt}"
                formatted_messages.append({"role": "system", "content": combined_prompt})
            else:
                formatted_messages.append({"role": "system", "content": base_system_prompt})
            
            # Add the rest of the messages
            formatted_messages.extend(messages)
            
            logger.info(f"Generating streaming response with {len(formatted_messages)} messages, temp={temperature}, model={self.model}")
            
            # Make the API request with streaming enabled
            response_stream = self.client.chat.completions.create(
                model=self.model,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,  # Enable streaming
                presence_penalty=0.6,  # Increase diversity
                frequency_penalty=0.5  # Discourage repetition
            )
            
            # Process and yield tokens as they arrive
            for chunk in response_stream:
                # Extract content delta if present
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
                    # Add intentional micro-delays between some chunks for more natural pacing
                    # These won't slow down the API, just the delivery of already received chunks
                    if random.random() < 0.2:  # 20% chance of an added delay
                        time.sleep(random.uniform(0.05, 0.2))
                        
        except RateLimitError as e:
            current_app.logger.error(f"OpenAI API rate limit exceeded: {e}")
            yield "Rate limit exceeded. Please try again later."
        except APIError as e:
            current_app.logger.error(f"OpenAI API error: {e}")
            yield f"An API error occurred: {e}"
        except Exception as e:
            current_app.logger.error(f"Unexpected error in OpenAI streaming interaction: {e}", exc_info=True)
            yield f"An unexpected error occurred: {e}"
    
    def generate_feedback(self, conversation_history: List[Dict[str, str]], user_profile: Dict[str, Any]) -> str:
        """
        Generate comprehensive feedback on a sales conversation.
        
        Args:
            conversation_history: List of message dictionaries with 'role' and 'content'
            user_profile: Dictionary containing user profile information (used in prompt)
            
        Returns:
            Structured feedback on the sales conversation
        """
        if not self.initialized or not self.client:
            # Attempt lazy initialization if called before init_app somehow
            if hasattr(current_app, '_get_current_object'):
                logger.warning("OpenAIService accessed before explicit init_app. Attempting lazy init.")
                self.init_app(current_app._get_current_object())
                
            if not self.initialized or not self.client:
                error_msg = "OpenAI service not properly initialized"
                logger.error(error_msg)
                return f"Error: {error_msg}"
            
        # Updated system prompt to include user profile context
        system_prompt = f"""Analyze this sales roleplay conversation between a salesperson (user) and a customer (assistant).
Salesperson Profile: {json.dumps(user_profile, indent=2)}

Provide an in-depth, comprehensive analysis with these sections:

### OVERALL SCORE
Rate the salesperson's performance on a scale of 1-10 and provide a brief justification.

### SKILL ANALYSIS
- Rapport Building: Score 1-10, with specific examples and comments
- Needs Discovery: Score 1-10, with specific examples and comments
- Objection Handling: Score 1-10, with specific examples and comments
- Closing Technique: Score 1-10, with specific examples and comments
- Product Knowledge: Score 1-10, with specific examples and comments

### KEY STRENGTHS
List 3-5 specific strengths with examples from the conversation.

### IMPROVEMENT OPPORTUNITIES
List 3-5 specific areas for improvement with examples from the conversation.

### STRATEGIC RECOMMENDATIONS
Provide 3-5 detailed, actionable recommendations the salesperson could implement immediately.

### SAMPLE PHRASES
Provide 3-5 alternative phrases or questions the salesperson could have used at critical moments.

Be specific, balanced, and focus on concrete evidence from the conversation.
"""
        
        try:
            # Process conversation history to ensure it's compatible with OpenAI format
            processed_history = []
            for msg in conversation_history:
                role = msg.get('role', '')
                content = msg.get('content', '')
                
                # Ensure role is one of 'system', 'user', or 'assistant'
                if role not in ['system', 'user', 'assistant']:
                    # Default unknown roles to 'user'
                    role = 'user'
                
                # Skip any empty messages
                if not content:
                    continue
                    
                processed_history.append({"role": role, "content": content})
            
            print(f"DEBUG: Processed {len(conversation_history)} messages to {len(processed_history)} for feedback")
            
            # Limit to last 25 messages if conversation is very long to stay within token limits
            if len(processed_history) > 25:
                processed_history = processed_history[-25:]
                print(f"DEBUG: Limiting to last 25 messages for token management")
                
            return self.generate_response(processed_history, system_prompt, temperature=0.3, max_tokens=3000)
        except RateLimitError as e:
            current_app.logger.error(f"OpenAI API rate limit exceeded during feedback generation: {e}")
            return "Feedback generation failed due to rate limits. Please try again later."
        except APIError as e:
            current_app.logger.error(f"OpenAI API error during feedback generation: {e}")
            return f"Feedback generation failed due to an API error: {e}"
        except Exception as e:
            current_app.logger.error(f"Unexpected error during feedback generation: {e}", exc_info=True)
            return f"An unexpected error occurred during feedback generation: {e}"
    
    def generate_text(self, prompt, model=None, max_tokens=500, temperature=0.7):
        """
        Generate text using OpenAI's completion API
        
        Args:
            prompt (str): The prompt to generate completion for
            model (str): The model to use (default: gpt-3.5-turbo)
            max_tokens (int): Maximum tokens in the response
            temperature (float): Sampling temperature
            
        Returns:
            str: Generated text or error message
        """
        if not self.initialized or not self.client:
            # Lazy init fallback
            if hasattr(current_app, '_get_current_object'):
                self.init_app(current_app._get_current_object())
            if not self.initialized or not self.client:
                return "Error: OpenAI service not initialized"
        
        use_model = model or self.model # Use specified model or default
        
        try:
            response = self.client.chat.completions.create(
                model=use_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            if response.choices and len(response.choices) > 0:
                return response.choices[0].message.content
            else:
                return "Error: No response from OpenAI API"
        except Exception as e:
            current_app.logger.error(f"Error generating text: {e}", exc_info=True)
            return f"Error generating text: {e}"
    
    def transcribe_audio(self, audio_file, language="en"):
        """
        Transcribe audio using OpenAI's Whisper API
        
        Args:
            audio_file: File-like object containing audio data
            language (str): Language code (default: en)
            
        Returns:
            str: Transcribed text or error message
        """
        if not self.initialized or not self.client:
            # Lazy init fallback
            if hasattr(current_app, '_get_current_object'):
                self.init_app(current_app._get_current_object())
            if not self.initialized or not self.client:
                return "Error: OpenAI service not initialized"

        try:
            with open(audio_file, "rb") as f:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    language=language
                )
            return transcript.text
        except Exception as e:
            current_app.logger.error(f"Error transcribing audio: {e}", exc_info=True)
            return f"Error transcribing audio: {e}"

# --- Global Instance --- 
# Create an instance but don't initialize fully here.
# Initialization needs app context via init_app().
openai_service = OpenAIService() 