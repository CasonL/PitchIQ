"""
Claude 3.7 Sonnet Extended API Service

This module provides a unified interface for interacting with the Claude 3.7 Sonnet Extended API
for the Sales Training AI application.
"""
import logging
import time
import os
import traceback
from typing import List, Dict, Any, Optional
import anthropic
import random

# Configure logging
logger = logging.getLogger(__name__)

# Constants
MODEL_NAME = "claude-3-7-sonnet-20250219"  # Using Claude 3.7 Sonnet Extended
MAX_TOKENS = 4000
DEFAULT_TEMPERATURE = 0.7

class ClaudeService:
    """Service for interacting with Claude 3.7 Sonnet Extended API."""
    
    _instance = None
    
    def __new__(cls, api_key=None):
        """Implement as singleton to ensure consistent client usage."""
        if cls._instance is None:
            cls._instance = super(ClaudeService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, api_key=None):
        """Initialize the Claude API client."""
        if getattr(self, '_initialized', False):
            return
            
        # Get API key from parameter or environment
        self.api_key = api_key or os.environ.get('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        
        try:
            # Initialize the Anthropic client
            self.client = anthropic.Anthropic(api_key=self.api_key)
            self._initialized = True
            logger.info("Claude API service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Claude API service: {str(e)}")
            raise
    
    def generate_response(
        self, 
        messages: List[Dict[str, str]],
        system_prompt: str = "",
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = MAX_TOKENS
    ) -> str:
        """
        Generate a response from Claude based on conversation history.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: System prompt for the model
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        try:
            # Format messages for Anthropic API
            formatted_messages = []
            for msg in messages:
                if msg.get('role') and msg.get('content'):
                    # Map 'assistant' role to 'assistant' for Anthropic
                    role = msg['role']
                    if role == 'assistant':
                        role = 'assistant'
                    formatted_messages.append({
                        "role": role,
                        "content": msg['content']
                    })
            
            # Call the API with retry logic
            max_retries = 3
            backoff_factor = 1.5
            
            for attempt in range(max_retries):
                try:
                    start_time = time.time()
                    response = self.client.messages.create(
                        model=MODEL_NAME,
                        system=system_prompt,
                        messages=formatted_messages,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                    duration = time.time() - start_time
                    logger.info(f"Claude API request completed in {duration:.2f}s")
                    
                    # Extract the assistant's response
                    if response and response.content:
                        return response.content[0].text
                    else:
                        logger.warning("Empty response received from Claude API")
                        return ""
                        
                except anthropic.RateLimitError as e:
                    if attempt < max_retries - 1:
                        wait_time = backoff_factor ** attempt
                        logger.warning(f"Rate limit exceeded, retrying in {wait_time}s. Error: {e}")
                        time.sleep(wait_time)
                    else:
                        raise
                except (anthropic.APIError, anthropic.APIConnectionError) as e:
                    if attempt < max_retries - 1:
                        wait_time = backoff_factor ** attempt
                        logger.warning(f"API error, retrying in {wait_time}s. Error: {e}")
                        time.sleep(wait_time)
                    else:
                        raise
            
            # If we get here, all retries failed
            raise RuntimeError("Failed to get response after multiple retries")
                
        except Exception as e:
            logger.error(f"Error generating Claude response: {str(e)}")
            raise
    
    def generate_customer_persona(self, sales_info: Dict[str, Any]) -> str:
        """
        Generate a detailed customer persona based on sales context.
        
        Args:
            sales_info: Dictionary with 'product_service', 'target_market', and 'sales_experience'
            
        Returns:
            Detailed customer persona text
        """
        # Extract the info we need
        product = sales_info.get('product_service', '')
        market = sales_info.get('target_market', '')
        experience = sales_info.get('sales_experience', 'intermediate')
        
        # Create the system prompt for persona generation
        system_prompt = f"""Generate a detailed, realistic customer persona for a sales roleplay scenario. 
This should be for a {'business customer (B2B)' if 'b2b' in market.lower() else 'consumer (B2C)'} sales context.

The customer should be interested in: {product}

Include the following in your persona:
1. Background information (name, age, role, company if B2B)
2. Personality traits and communication style
3. Specific needs and pain points related to the product/service
4. Potential objections they might have
5. Buying motivation and decision factors
6. Make this persona thoughtfully calibrated to a salesperson with {experience} experience level

Create a rich, detailed character that feels like a real person with genuine concerns and interests.
"""
        
        # Send the request to Claude
        messages = []  # No conversation history for persona generation
        return self.generate_response(messages, system_prompt, temperature=0.8)
    
    def generate_roleplay_response(
        self, 
        conversation_history: List[Dict[str, str]], 
        persona: str,
        sales_info: Dict[str, Any],
        user_name: str = "Salesperson"
    ) -> str or Dict:
        """
        Generate a roleplay response based on conversation history.
        
        Args:
            conversation_history: List of message dictionaries with 'role' and 'content'
            persona: The customer persona description
            sales_info: Dictionary with sales context information
            user_name: Name of the salesperson for personalization
            
        Returns:
            Either a string response or a dict with 'response' and 'follow_up' keys for split messages
        """
        # Determine if this should be a split message (more natural conversation)
        # Check if this is early in the conversation (turns 2-4)
        conversation_turn = len([msg for msg in conversation_history if msg['role'] == 'user'])
        
        # Create the system prompt for the roleplay
        system_prompt = f"""You are roleplaying as a customer with the following persona:

{persona}

Your job is to respond naturally as this customer would, based on the conversation history. 
You should raise appropriate objections and ask questions while being realistic.
The person you're talking to is a salesperson named {user_name} with {sales_info.get('sales_experience', 'some')} experience selling {sales_info.get('product_service', 'their product/service')}.

Guidelines:
- Stay in character as the customer at all times
- Respond conversationally and naturally 
- Express appropriate emotions and hesitations
- Never break character to explain what you're doing
- Be somewhat skeptical but not unreasonably difficult
- Ask questions that a real customer would ask
- Raise realistic objections about price, features, or alternatives
- React to how well the salesperson addresses your needs and concerns
"""

        # Add special instructions for greeting variations
        if conversation_turn == 1:
            # This is the second turn (first AI response after user's first message)
            # Add instructions to make greeting responses more varied and natural
            system_prompt += """
IMPORTANT: For this greeting message, DO NOT default to saying you're busy with meetings.
Instead, choose ONE of these more natural response patterns:
1. A brief positive or neutral greeting response (e.g., "I'm doing alright, thanks for asking.")
2. Share a brief personal detail relevant to today (e.g., "Just finished a busy morning, but doing well.")
3. Return the question (e.g., "I'm fine, how are you doing today?")
4. A mild complaint (e.g., "Been better, dealing with some challenges today.")
5. A direct response about your interest in the product (e.g., "I'm interested in learning more about what you offer.")

After your greeting, continue naturally as your character would.
"""
        
        # Add special instructions for double message feature
        if conversation_turn >= 3 and random.random() < 0.4:  # 40% chance for turns 3+
            system_prompt += """
SPECIAL INSTRUCTION: Split your response into TWO separate messages.
1. The first message should be a brief initial response.
2. After a short pause, you'll send a second follow-up message with additional details, a question, or a change of thought.

This creates a more natural, human-like conversation flow with multiple messages rather than one long response.
Format your response like this:

FIRST_MESSAGE: [Your initial response here]
FOLLOW_UP_MESSAGE: [Your second message that would naturally follow after a short pause]
"""

            # Generate the split response
            full_response = self.generate_response(conversation_history, system_prompt)
            
            # Try to extract the two parts
            try:
                if "FIRST_MESSAGE:" in full_response and "FOLLOW_UP_MESSAGE:" in full_response:
                    parts = full_response.split("FIRST_MESSAGE:")
                    if len(parts) > 1:
                        remaining = parts[1].split("FOLLOW_UP_MESSAGE:")
                        if len(remaining) > 1:
                            first_message = remaining[0].strip()
                            follow_up = remaining[1].strip()
                            
                            # Determine a natural pause time (2-4 seconds)
                            pause_time = random.uniform(2, 4)
                            
                            return {
                                "response": first_message,
                                "follow_up": follow_up,
                                "pause_time": pause_time
                            }
            except Exception as e:
                logger.error(f"Error parsing split message: {e}")
                # Continue with regular response if splitting fails
            
            # Return the full message if splitting failed
            return full_response
        
        # For regular single responses
        return self.generate_response(conversation_history, system_prompt)
    
    def generate_feedback(
        self, 
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """
        Generate comprehensive feedback on a sales conversation.
        
        Args:
            conversation_history: List of message dictionaries with 'role' and 'content'
            
        Returns:
            Structured feedback on the sales conversation
        """
        import traceback
        
        # Extensive logging for debugging
        print("DEBUG: Generating feedback")
        print(f"Total conversation history: {len(conversation_history)} messages")
        
        # Detailed message logging
        for i, msg in enumerate(conversation_history):
            print(f"Message {i+1}:")
            print(f"  Role: {msg.get('role', 'UNKNOWN')}")
            print(f"  Content Length: {len(msg.get('content', ''))}")
            print(f"  Content Preview: {msg.get('content', '')[:200]}...")
        
        # Validate input
        if not conversation_history:
            print("DEBUG: No conversation history provided")
            return """### FEEDBACK ERROR
No conversation history found. Please complete a conversation before requesting feedback."""

        # Filter out empty or invalid messages
        filtered_history = [
            msg for msg in conversation_history 
            if msg.get('role') and msg.get('content', '').strip()
        ]

        # Logging filtered history
        print(f"Filtered messages: {len(filtered_history)}")
        for i, msg in enumerate(filtered_history):
            print(f"Filtered Message {i+1}:")
            print(f"  Role: {msg.get('role')}")
            print(f"  Content Length: {len(msg.get('content', ''))}")
        
        if len(filtered_history) < 4:
            print("DEBUG: Insufficient meaningful messages")
            return """### FEEDBACK ERROR
Unable to generate feedback. Please ensure you have completed a meaningful conversation with at least 4 substantive messages."""

        # Detailed system prompt with more specific instructions
        system_prompt = """You are an expert sales performance coach analyzing a sales roleplay conversation.

CRITICAL INSTRUCTIONS:
1. You MUST generate substantive feedback, even with limited conversation context
2. If the conversation seems brief, provide guidance on what would make a more effective sales interaction

MANDATORY SECTIONS:
### Overall Assessment
- Briefly describe the context of the conversation
- Provide a general evaluation of the sales interaction

### Key Observations
- List at least 3 specific observations about the conversation
- Include both positive aspects and areas for improvement

### Actionable Recommendations
- Provide 3-5 concrete suggestions for enhancing sales approach
- Ensure recommendations are specific and practical

IMPORTANT:
- Your response MUST be at least 300 characters long
- Focus on constructive, helpful feedback
- Use a professional and supportive tone

If you cannot generate comprehensive feedback, explain the specific challenges preventing a thorough analysis.
"""
        
        try:
            # Prepare messages for API call
            print("DEBUG: Preparing messages for API call")
            max_chars_per_message = 1000  # Limit message length
            truncated_history = [
                {
                    'role': msg['role'], 
                    'content': msg['content'][:max_chars_per_message]
                } for msg in filtered_history
            ]
            
            print(f"DEBUG: Truncated messages: {len(truncated_history)}")
            
            # Send the request to Claude with adjusted parameters
            print("DEBUG: Sending request to Claude API")
            feedback = self.generate_response(
                truncated_history, 
                system_prompt, 
                temperature=0.5,  # Slightly higher to encourage more creative analysis
                max_tokens=1000   # Increase max tokens to allow more detailed feedback
            )
            
            # Comprehensive logging of generated feedback
            print("DEBUG: Generated Feedback")
            print(f"Feedback Length: {len(feedback)}")
            print("Feedback Preview:")
            print(feedback)
            
            # Validate feedback
            if not feedback or len(feedback.strip()) < 50:
                print("DEBUG: Generated feedback is too short")
                return """### FEEDBACK ERROR
Unable to generate a meaningful feedback report. 
Possible reasons:
- Conversation may be too brief
- System encountered an unexpected issue

Please try again or contact support."""
            
            return feedback
        
        except Exception as e:
            # Comprehensive error logging
            print("DEBUG: Error in generate_feedback")
            print(f"Error details: {str(e)}")
            traceback.print_exc()
            
            return f"""### FEEDBACK ERROR
An unexpected error occurred while generating feedback. 
Error details: {str(e)}

Possible reasons:
- Conversation complexity
- Temporary system limitations
- Unexpected message format

Please try again or contact support if the issue persists."""

# Create a singleton instance for import and use elsewhere
claude_service = ClaudeService()