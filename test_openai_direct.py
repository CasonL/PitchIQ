import os
import logging
import time
import httpx
import ssl
import certifi
from openai import OpenAI
from dotenv import load_dotenv

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
API_KEY = os.environ.get("OPENAI_API_KEY")
MODEL_NAME = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini") # Use same model as in app
MAX_RETRIES = 3 # Reduced retries for faster testing
BASE_URL = "https://api.openai.com/v1"

# --- Main Test Logic ---
if not API_KEY:
    logger.error("FATAL: OPENAI_API_KEY environment variable not found.")
else:
    logger.info(f"OpenAI API Key found (starts with: {API_KEY[:5]}...).")
    logger.info(f"Attempting to connect to OpenAI API (Base URL: {BASE_URL}, Model: {MODEL_NAME})...")

    try:
        # Create a default client (similar to the simplified app setup)
        # We could add explicit httpx/ssl context later if needed, but start simple
        # client = OpenAI(
        #     api_key=API_KEY,
        #     base_url=BASE_URL,
        #     max_retries=MAX_RETRIES, # Use slightly fewer retries for this test
        #     timeout=60.0 # Reasonable timeout
        # )

        # Explicitly create httpx client with SSL context and NO proxies
        # logger.info("Explicitly creating httpx.Client with SSL context and no proxies...")
        # ssl_context = ssl.create_default_context(cafile=certifi.where())
        # custom_http_client = httpx.Client(
        #     timeout=60.0, 
        #     verify=ssl_context, 
        #     proxies=None # Explicitly set proxies to None
        # )
        # logger.info("Custom httpx.Client created.")

        # Pass the custom client to OpenAI
        # client = OpenAI(
        #     api_key=API_KEY,
        #     base_url=BASE_URL,
        #     max_retries=MAX_RETRIES,
        #     timeout=60.0, # Timeout for the OpenAI client operations
        #     http_client=custom_http_client # Pass the custom client
        # )

        # Try simplest possible client creation FIRST
        logger.info("Attempting simplest OpenAI() client creation...")
        client = OpenAI(
             api_key=API_KEY,
             base_url=BASE_URL,
             max_retries=MAX_RETRIES,
             timeout=60.0
        )
        logger.info("OpenAI client created successfully (simple init).")

        api_test_success = False
        for attempt in range(1, MAX_RETRIES + 1):
            logger.info(f"Attempting client.models.retrieve('{MODEL_NAME}') (Attempt {attempt}/{MAX_RETRIES})...")
            try:
                start_time = time.time()
                model_info = client.models.retrieve(MODEL_NAME)
                end_time = time.time()
                logger.info(f"SUCCESS! Connected to OpenAI API and retrieved model info in {end_time - start_time:.2f} seconds.")
                logger.info(f"Model Info: {model_info}")
                api_test_success = True
                break # Exit loop on success
            except Exception as e:
                logger.error(f"API call failed (Attempt {attempt}/{MAX_RETRIES}): {type(e).__name__} - {e}")
                if attempt < MAX_RETRIES:
                    retry_delay = 2 ** (attempt -1) # Slightly faster backoff for test
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)

        if not api_test_success:
             logger.error(f"Failed to connect to OpenAI API after {MAX_RETRIES} attempts.")

    except Exception as client_e:
        logger.error(f"Failed to even create the OpenAI client: {type(client_e).__name__} - {client_e}")

logger.info("Test script finished.") 