import os
import requests
import logging
from flask import current_app
from tenacity import retry, stop_after_attempt, wait_exponential # Add tenacity
import traceback # For detailed logging

logger = logging.getLogger(__name__)

class ElevenLabsService:
    def __init__(self, app=None):
        self.api_key = None
        self.initialized = False
        if app:
            self.init_app(app)

    def init_app(self, app):
        # --- Add Logging ---
        logger.info(f"ElevenLabsService init_app called. App config type: {type(app.config)}")
        key_from_config = app.config.get('ELEVEN_LABS_API_KEY')
        logger.info(f"API Key from app.config.get('ELEVEN_LABS_API_KEY'): {'Exists' if key_from_config else 'Not Found'}")
        
        key_from_env1 = os.environ.get('ELEVEN_LABS_API_KEY')
        logger.info(f"API Key from os.environ.get('ELEVEN_LABS_API_KEY'): {'Exists' if key_from_env1 else 'Not Found'}")
        
        key_from_env2 = os.environ.get('ELEVENLABS_API_KEY')
        logger.info(f"API Key from os.environ.get('ELEVENLABS_API_KEY'): {'Exists' if key_from_env2 else 'Not Found'}")
        # --- End Logging ---
        
        self.api_key = key_from_config # Prioritize app config
        if not self.api_key:
             # Fallback to environment variables
             self.api_key = key_from_env1 or key_from_env2
        
        if not self.api_key:
            logger.warning("ElevenLabs API key not found in config or environment. TTS functionality will be unavailable.")
            self.initialized = False
        else:
            # --- Add Logging ---
            logger.info(f"ElevenLabsService initialized successfully with API key (length: {len(self.api_key) if self.api_key else 0})")
            # --- End Logging ---
            self.initialized = True

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), 
           retry_error_callback=lambda retry_state: logger.warning(f"Retrying ElevenLabs call after error: {retry_state.outcome.exception()}"))
    def generate_audio_stream(self, text: str, voice_id: str, output_format: str = "mp3_44100_64", model_id: str = "eleven_multilingual_v2", optimize_streaming_latency: int = 4):
        """
        Generates an audio stream from text using the ElevenLabs API.
        Includes retry logic and graceful error handling.

        Args:
            text (str): The text to convert to speech.
            voice_id (str): The ID of the voice to use.
            output_format (str): The desired output format (e.g., 'mp3_44100_64').
            model_id (str): The model ID to use.
            optimize_streaming_latency (int): Latency optimization setting.

        Yields:
            bytes: Chunks of the audio stream. Yields b'' on failure after retries.
        """
        if not self.api_key:
            logger.error("generate_audio_stream called but self.api_key is missing!")
            yield b'' # Signal failure
            return

        if not text:
            logger.warning("generate_audio_stream called with empty text.")
            yield b''
            return

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
        headers = {
            "Accept": "audio/mpeg", # Keep Accept header specific
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.65,
                "similarity_boost": 0.85,
                "style": 0.35,
                "use_speaker_boost": True
            },
            "optimize_streaming_latency": optimize_streaming_latency,
            "output_format": output_format
        }

        try:
            logger.info(f"Requesting audio stream from ElevenLabs for voice {voice_id}, format: {output_format}")
            response = requests.post(url, json=payload, headers=headers, stream=True, timeout=60) # Add timeout

            # Check for specific HTTP errors before trying to iterate
            if response.status_code == 401:
                logger.error(f"ElevenLabs API Error: 401 Unauthorized. Check API Key.")
                yield b'' # Signal failure
                return
            elif response.status_code == 400:
                 logger.error(f"ElevenLabs API Error: 400 Bad Request. Check payload/voice_id. Response: {response.text}")
                 yield b'' # Signal failure
                 return
            elif response.status_code >= 500:
                 logger.error(f"ElevenLabs API Error: Server error ({response.status_code}). Response: {response.text}")
                 # Let retry handle server errors
                 response.raise_for_status() # Raise exception for retry
            elif response.status_code != 200:
                 logger.error(f"ElevenLabs API Error: Unexpected status {response.status_code}. Response: {response.text}")
                 # Let retry handle unexpected non-200s? Or signal failure?
                 # For now, let's signal failure for non-retryable client errors > 400
                 if 400 < response.status_code < 500:
                      yield b'' 
                      return
                 response.raise_for_status() # Raise for other unexpected codes to potentially retry

            # If status is 200, proceed with streaming
            logger.info("Successfully initiated audio stream from ElevenLabs.")
            chunk_count = 0
            for chunk in response.iter_content(chunk_size=2048):
                if chunk:
                    chunk_count += 1
                    yield chunk
            logger.info(f"Finished yielding {chunk_count} audio chunks.")

        except requests.exceptions.RequestException as e:
            # This will be caught by tenacity for retries
            logger.warning(f"HTTP Request error calling ElevenLabs (will retry): {e}")
            raise # Re-raise for tenacity to handle retry
        except Exception as e:
            logger.error(f"Unexpected error in generate_audio_stream after retries or during streaming: {type(e).__name__} - {e}")
            logger.debug(traceback.format_exc())
            yield b'' # Signal failure

# Create a service instance
eleven_labs_service = ElevenLabsService() 

# Helper function to get the service instance
def get_eleven_labs_service():
    """Get the ElevenLabs service instance."""
    global eleven_labs_service
    if not eleven_labs_service.initialized:
        logger.warning("Accessing ElevenLabs service before init_app. Ensure init_app is called in create_app.")
    return eleven_labs_service 