"""
Claude 3.7 Sonnet Extended API Service

This module provides a unified interface for interacting with the Claude 3.7 Sonnet Extended API
for the Sales Training AI application.
"""
import logging
import time
import os
import json
import random
import re
from typing import List, Dict, Any, Optional, Union
import anthropic
from flask import current_app
import urllib3

# Configure logging
logger = logging.getLogger(__name__)

# Define Custom Exception
class ClaudeServiceError(Exception):
    """Custom exception for errors originating from the ClaudeService."""
    pass

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
            
        # Get API key from Flask app config or fallback to environment
        try:
            # Prefer getting from Flask app config if available
            self.api_key = current_app.config.get('ANTHROPIC_API_KEY')
            if not self.api_key:
                 # Fallback to environment variable if not in app config (e.g., during init)
                 self.api_key = os.environ.get('ANTHROPIC_API_KEY')
        except RuntimeError: # Catch cases where app context might not be available
            self.api_key = os.environ.get('ANTHROPIC_API_KEY')
        
        if not self.api_key:
            logger.error("Anthropic API key is missing. Set ANTHROPIC_API_KEY in config or environment.")
            # Set a flag to indicate API unavailability
            self.api_available = False
            self._initialized = True
            return
        
        try:
            # Test the API key by making a minimal request
            test_client = anthropic.Anthropic(api_key=self.api_key)
            
            # Initialize the full Anthropic client
            self.client = test_client
            self.api_available = True
            self._initialized = True
            logger.info("Claude API service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Claude API service: {str(e)}")
            self.api_available = False
            self._initialized = True
    
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
        # Check if API is available
        if not hasattr(self, 'api_available') or not self.api_available:
            logger.error("Claude API is not available. Cannot generate response.")
            raise ClaudeServiceError("Claude API is not properly configured. Please check your API key.")
            
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
                    
                    # --- Add Detailed Logging Here ---
                    api_params = {
                        "model": MODEL_NAME,
                        "system": system_prompt,
                        "messages": formatted_messages,
                        "max_tokens": max_tokens,
                        "temperature": temperature
                    }
                    logger.info(f"Calling Anthropic API (Attempt {attempt + 1})")
                    logger.info(f"Model: {api_params['model']}")
                    logger.info(f"System Prompt Length: {len(api_params['system'])}")
                    logger.info(f"Num Messages: {len(api_params['messages'])}")
                    # --- End Detailed Logging ---
                    
                    response = self.client.messages.create(**api_params)
                    
                    duration = time.time() - start_time
                    logger.info(f"Claude API request completed in {duration:.2f}s")
                    
                    # Extract the assistant's response
                    if response and response.content and response.content[0].text.strip(): # Check if text exists and isn't just whitespace
                        return response.content[0].text
                    else:
                        logger.error("Empty or invalid content received from Claude API") # Log as error
                        raise ClaudeServiceError("Claude API returned an empty or invalid response content.")
                        
                except anthropic.RateLimitError as e:
                    if attempt < max_retries - 1:
                        wait_time = backoff_factor ** attempt
                        logger.warning(f"Rate limit exceeded, retrying in {wait_time}s. Error: {e}")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Final rate limit error after {max_retries} attempts: {str(e)}")
                        raise ClaudeServiceError(f"Claude API rate limit exceeded after {max_retries} attempts: {e}") from e
                except (anthropic.APIError, anthropic.APIConnectionError) as e:
                    if attempt < max_retries - 1:
                        wait_time = backoff_factor ** attempt
                        logger.warning(f"API error, retrying in {wait_time}s. Error: {e}")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Final API connection error after {max_retries} attempts: {str(e)}")
                        raise ClaudeServiceError(f"Claude API connection failed after {max_retries} attempts: {e}") from e
            
            # If we get here, all retries failed (though the exceptions above should have been raised)
            # This might catch cases where the loop finishes unexpectedly.
            raise ClaudeServiceError(f"Claude API failed to respond after {max_retries} attempts.")
                
        except ClaudeServiceError: # Re-raise our custom error to avoid the generic catch below
             raise
        except Exception as e:
            error_details = str(e)
            logger.error(f"Unexpected error during Claude API call: {error_details}")
            # logger.exception("Traceback:") # Optional: log full traceback

            # Remove the specific format check, just raise a generic error
            # if "Unexpected role \"system\"" in error_details:
            #     return "[ERROR: Claude API integration format issue. Needs system parameter, not system role. Please contact support.]"

            # Return a clear error message
            # return f"[ERROR: Claude API request failed. {error_details}]"
            raise ClaudeServiceError(f"Claude API request failed: {error_details}") from e
    
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
        
        # Generate a random personality type to encourage variety
        personality_types = [
            "Analytical", "Assertive", "Creative", "Detail-oriented", "Direct", 
            "Empathetic", "Enthusiastic", "Flexible", "Methodical", "Optimistic",
            "Practical", "Reflective", "Reserved", "Risk-averse", "Skeptical",
            "Sociable", "Strategic", "Supportive", "Systematic", "Task-focused"
        ]
        
        # Select a random personality type to emphasize
        primary_personality = random.choice(personality_types)
        
        # Generate a random intelligence level - weighted towards average
        intelligence_levels = ["low", "average", "average", "average", "high"]
        intelligence_level = random.choice(intelligence_levels)
        
        # Create the system prompt for persona generation
        system_prompt = f"""Generate a realistic customer persona specifically designed for a **sales roleplay simulation**.
The persona should behave like a potential buyer evaluating a product/service, not just a character in a story.

Context:
- Sales Context: {'Business (B2B)' if 'b2b' in market.lower() else 'Consumer (B2C)'}
- Product/Service of Interest: {product}
- Target Salesperson Experience: {experience}

**IMPORTANT PERSONALITY INSTRUCTION:**
This persona should prominently feature the following personality trait: {primary_personality}
While they can have other traits, this should be their most defining characteristic that affects how they make decisions and communicate.

**INTELLIGENCE LEVEL INSTRUCTION:**
This persona should have {intelligence_level} intelligence.
- Low intelligence: May struggle with technical concepts, need simpler explanations, ask for clarification often
- Average intelligence: Typical understanding of most concepts, can follow standard explanations
- High intelligence: Quick to grasp complex ideas, might challenge the salesperson with detailed questions

**CRITICAL - CREATE DIVERSE PERSONAS:**
- Create personas that span different ages, genders, cultural backgrounds, and professional roles
- Avoid making every persona a middle-aged business professional
- Include personas across the personality spectrum (introverted/extroverted, analytical/emotional, etc.)
- AVOID overused personas like "Morgan Chen" or "Alex" with analytical personalities
- Each persona should have a unique combination of traits, not cookie-cutter replicas

**Naming REQUIREMENTS:**
- Create a diverse but easy-to-pronounce name
- Names should be simple and immediately pronounceable by English speakers
- Avoid very common names (like John, Sarah, etc.) and avoid recently used names like "Morgan" or "Alex"
- DO NOT include nicknames or name variations in quotes
- ALWAYS use a specific first and last name (like "David Garcia" or "Priya Patel")
- NEVER use generic descriptors like "Business Buyer" or role titles as names
- The name MUST be a realistic human name, not a description of their role or position

**Communication Challenges (CRITICAL):**
Everyone struggles to articulate themselves clearly sometimes. The persona MUST demonstrate realistic communication difficulties:
- May have trouble precisely describing what they want or need
- May contradict themselves about requirements
- May use vague language when uncertain
- May struggle with technical terminology
- May get sidetracked by personal interests during business discussions
- May make unexpected connections between their interests and the product

**Interest-Business Integration:**
- The persona should occasionally (not always) make natural connections between their personal interests and the product/service
- Example: A sports fan might say "I need software that's a team player, works well with our existing systems"
- Example: A travel enthusiast might evaluate products by saying "I'm looking for reliability - like when you book a 5-star hotel"

Persona Requirements:
1. **Buyer Profile:** Plausible name, age, role (or situation if B2C). Keep background concise and focused on relevance to buying.
2. **Demographics:** Age (25-65), gender, location relevant to {market}, education level
3. **Profession & Workplace:** Job title, company type or workplace, industry, years of experience, relevant aspects of workplace culture
4. **Buying Context:** Why they're considering purchasing a {product}, timeline for decision, budget constraints, who else influences the decision
5. **Key Personality Traits:** 3-5 dominant personality traits that influence buying style (MUST include {primary_personality})
6. **Intelligence Level:** {intelligence_level} - how this affects their decision making and communication
7. **Communication Style:** How they typically express themselves (direct vs indirect, formal vs casual, etc.)
8. **Pain Points:** 2-4 specific challenges, problems, or frustrations they're facing that the product/service might address
9. **Primary Objections:** 2-3 realistic objections they might raise about the product/service (price, implementation, features, etc.)
10. **Decision-Making Style:** Analytical, emotional, consensus-driven, etc. How they typically evaluate options.
11. **Success Metrics:** How they'll judge if the purchase was successful - what specific outcomes they need

Response Format:
* Format as a complete descriptive paragraph about the person first
* Then include key details in a structured section with headers
* Ensure natural language throughout - this should read like a real person, not a list of traits
* Length: 300-500 words total"""

        # Generate the persona
        messages = [{"role": "user", "content": "Generate a buyer persona for sales training"}]
        response = self.generate_response(messages, system_prompt, temperature=0.9)
        
        # Validate the response
        if not response or len(response) < 100:
            logger.error("Failed to generate a valid customer persona")
            # Return a fallback persona
            return """
Daniel Chen is a 42-year-old IT Director at a mid-sized healthcare company. He's analytical, detail-oriented, and somewhat risk-averse when it comes to new technology investments. Daniel is currently evaluating solutions to improve the company's data security compliance, a pressing issue due to recent healthcare regulation changes. He's experienced with technology vendors but skeptical of overblown claims, preferring demonstrations over promises. Daniel has a tight budget this quarter but needs to solve growing security concerns expressed by the executive team.

**Buyer Profile:** Daniel Chen, 42, IT Director at MediCare Solutions
**Demographics:** 42, male, Chicago area, Master's in Computer Science
**Profession & Workplace:** IT Director, mid-sized healthcare company (200 employees), 8 years in current role
**Buying Context:** Needs to improve data security compliance, 3-month decision timeline, $50-75K budget range, must get CFO approval
**Personality Traits:** Analytical, cautious, thorough, pragmatic, slightly skeptical
**Intelligence Level:** Average - understands complex concepts but prefers clear explanations
**Communication Style:** Direct and efficient, prefers data over stories, asks specific technical questions
**Pain Points:** Recent security compliance failures, understaffed IT department, increasing data breach attempts, pressure from C-suite
**Primary Objections:** Cost concerns, implementation timeframe, compatibility with legacy systems
**Decision-Making Style:** Fact-based, methodical evaluation, creates comparison matrices, consults team
**Success Metrics:** Full regulatory compliance, reduction in security incidents, minimal disruption during implementation, measurable ROI
"""
            
        return response
        
    def generate_buyer_persona(self, context, use_previous_feedback=False, previous_feedback=None):
        """
        Adapter method for generate_customer_persona to maintain API compatibility
        
        Args:
            context: Dictionary with user profile context
            use_previous_feedback: Whether to use feedback from previous sessions
            previous_feedback: The previous feedback to use
            
        Returns:
            Generated buyer persona text
        """
        logger.info("Generating buyer persona via adapter method")
        
        # Convert context to sales_info format expected by generate_customer_persona
        sales_info = {
            "product_service": context.get("product_service", ""),
            "target_market": context.get("target_market", ""),
            "sales_experience": context.get("experience_level", "intermediate")
        }
        
        # Add industry if available
        if "industry" in context:
            sales_info["industry"] = context["industry"]
            
        # Call the actual implementation
        return self.generate_customer_persona(sales_info)
    
    def generate_roleplay_response(
        self,
        conversation_history: List[Dict[str, str]],
        persona: str,
        sales_info: Dict[str, Any],
        user_name: str = "Salesperson"
    ) -> Union[str, Dict[str, Any]]:
        """
        Generate a roleplay response based on conversation history.
        
        Args:
            conversation_history: List of message dictionaries with 'role' and 'content'
            persona: The customer persona description
            sales_info: Dictionary with sales context information
            user_name: Name of the salesperson for personalization
            
        Returns:
            Either a string response or a dict with 'response' and 'follow_up' keys
        """
        try:
            # Extract details from sales info
            product = sales_info.get('product_service', 'their product/service')
            market = sales_info.get('target_market', 'the target market')
            experience = sales_info.get('sales_experience', 'intermediate')

            # --- System Prompt Construction ---
            # REVERTING: Always send the full persona description in the system prompt
            system_prompt = f"""You are an AI simulating a specific buyer persona for a sales roleplay training exercise.
            Your goal is to respond realistically as this buyer, based on the provided persona description and the ongoing conversation.

            **Your Persona:**
            {persona}

            **Roleplay Context:**
            - You are interacting with: {user_name} (the salesperson)
            - They are selling: {product}
            - Relevant market context: {market}
            - The salesperson's experience level: {experience}

            **Your Task:**
            - Respond naturally *as the persona* based on the conversation history.
            - Maintain the persona's described personality, motivations, and communication style throughout the conversation.
            - React realistically to the salesperson's statements and questions.
            - CRITICAL: Be responsive rather than directive - let the salesperson lead the conversation.
            - Avoid taking control of the conversation unless the salesperson is extremely passive.
            - DO NOT use "sales manager" type behavior where you directly tell the salesperson what to do.
            - Ask questions and raise objections naturally, but only when appropriate in response to what the salesperson has said.
            - Keep responses human-like, brief and natural - typically 1-2 sentences only.
            - Only provide thorough answers if directly asked a specific question by the salesperson.
            - NEVER switch to coaching mode or meta-commentary about the sales process.
            - DO NOT break character. DO NOT describe your actions or thoughts in the third person.
            - If the salesperson asks open-ended questions, provide some information but leave room for follow-up.
            - Your voice should sound natural and conversational, not robotic or scripted.
            
            **IMPORTANT FORMATTING REQUIREMENTS:**
            - Limit your response to at most two questions per message.
            """

            # Generate response using the provided conversation history
            ai_response = self.generate_response(conversation_history, system_prompt)
            
            # Log the response
            if ai_response:
                logger.info(f"Generated Claude roleplay response: {ai_response[:50]}...")
            else:
                logger.warning("Empty or None response from Claude roleplay generation")
            
            return ai_response or "I apologize, but I'm having trouble processing your request right now."
            
        except Exception as e:
            logger.error(f"Error in generate_roleplay_response: {str(e)}")
            return "I apologize, but I'm having trouble processing your request right now."
    
    def generate_feedback(
        self, 
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """
        Generate a sales coaching feedback analysis of the conversation.
        
        Args:
            conversation_history: List of message dictionaries with 'role' and 'content'
            
        Returns:
            Detailed feedback analysis
        """
        # Filter out system messages if any
        filtered_history = [
            msg for msg in conversation_history 
            if msg.get('role') in ('user', 'assistant')
        ]
        
        # If no conversation to analyze, return error message
        if not filtered_history or len(filtered_history) < 3:
            return """### FEEDBACK ERROR
Unable to generate feedback due to insufficient conversation data.
The conversation needs to include at least 3 exchanges between you and the buyer persona."""
        
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

If you cannot generate comprehensive feedback, explain the specific challenges preventing a thorough analysis."""
        
        try:
            # Prepare messages for API call
            logger.info("Preparing messages for feedback API call")
            max_chars_per_message = 1000  # Limit message length
            truncated_history = [
                {
                    'role': msg['role'], 
                    'content': msg['content'][:max_chars_per_message]
                } for msg in filtered_history
            ]
            
            logger.info(f"Truncated messages: {len(truncated_history)}")
            
            # Send the request to Claude with adjusted parameters
            logger.info("Sending request to Claude API for feedback")
            feedback = self.generate_response(
                truncated_history, 
                system_prompt, 
                temperature=0.5,  # Slightly higher to encourage more creative analysis
                max_tokens=1000   # Increase max tokens to allow more detailed feedback
            )
            
            # Comprehensive logging of generated feedback
            logger.info(f"Generated feedback - Length: {len(feedback)}")
            
            # Validate feedback
            if not feedback or len(feedback.strip()) < 50:
                logger.warning("Generated feedback is too short")
                return """### FEEDBACK ERROR
Unable to generate a meaningful feedback report. 
Possible reasons:
- Conversation may be too brief
- System encountered an unexpected issue

Please try again or contact support."""
            
            return feedback
            
        except Exception as e:
            logger.error(f"Error generating feedback: {str(e)}")
            return f"""### FEEDBACK ERROR
An error occurred while generating your feedback: {str(e)}
Please try again or contact support."""

# Create a singleton instance
claude_service = ClaudeService()

def get_claude_service() -> ClaudeService:
    """Get the Claude service singleton instance."""
    return claude_service

def get_claude_completion(prompt, temperature=0.7, max_tokens=4000, system_prompt=""):
    """
    Get a completion from Claude using the provided prompt.
    
    Args:
        prompt (str): The prompt to send to Claude
        temperature (float, optional): Sampling temperature. Defaults to 0.7.
        max_tokens (int, optional): Maximum tokens to generate. Defaults to 4000.
        system_prompt (str, optional): System prompt for the model. Defaults to "".
        
    Returns:
        str: Generated completion text
    """
    # Get the Claude service
    service = get_claude_service()
    
    # Format as a single user message
    messages = [{"role": "user", "content": prompt}]
    
    # Generate the response
    return service.generate_response(
        messages=messages,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens
    )