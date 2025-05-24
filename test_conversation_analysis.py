"""
Test script for GPT-3.5-turbo conversation analysis.

This script tests the ConversationStateManager with GPT-3.5-turbo analysis.
"""

import logging
import sys
import os
from app.services.conversation_state_manager import ConversationStateManager, ConversationPhase
from app.services.openai_service import get_openai_service, OpenAIService

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Test the GPT-3.5-turbo conversation analysis."""
    logger.info("Testing GPT-3.5-turbo conversation analysis")
    
    # Sample conversation
    conversation = [
        {"role": "user", "content": "Hi there, I'm John from ABC Software. How are you today?"},
        {"role": "assistant", "content": "Hello John, I'm doing well, thanks for asking. It's a busy day here at XYZ Corp. How about you?"},
        {"role": "user", "content": "I'm good, thanks. I wanted to talk to you about our sales training software that can help upskill your team."},
        {"role": "assistant", "content": "That's interesting. We've been discussing improving our sales training processes. What kind of software do you offer?"},
        {"role": "user", "content": "We have a platform that uses AI to simulate customer interactions and provide feedback on sales calls. What challenges is your team facing with sales currently?"},
        {"role": "assistant", "content": "Our main challenge is that our sales team varies in experience levels, and our newer reps struggle with objection handling. Also, we're concerned about the cost of any new solution - our budget is pretty tight this quarter."}
    ]
    
    # Create a conversation state manager
    state_manager = ConversationStateManager()
    
    # Initialize the OpenAI service
    openai_service = get_openai_service()
    if not openai_service.initialized:
        # Just create a basic instance without app for testing
        openai_service.api_key = os.environ.get('OPENAI_API_KEY')
        openai_service.initialized = True
        openai_service.model = "gpt-3.5-turbo"
        
        # Try to create the OpenAI client
        try:
            from openai import OpenAI
            openai_service.client = OpenAI(api_key=openai_service.api_key)
            logger.info("Created OpenAI client for testing")
        except Exception as e:
            logger.error(f"Failed to create OpenAI client: {e}")
            return
    
    # Analyze the conversation
    state_manager.update_state(conversation)
    
    # Print the results
    state = state_manager.get_conversation_state()
    logger.info("Conversation Analysis Results:")
    logger.info(f"Likely Phase: {state['likely_phase'].value}")
    logger.info(f"Rapport Level: {state['rapport_level']}")
    logger.info(f"Needs Identified: {state['needs_identified']}")
    logger.info(f"Objections Raised: {state['objections_raised']}")
    logger.info(f"Sentiment: {state['sentiment']}")
    
    logger.info("Test completed")

if __name__ == "__main__":
    main() 