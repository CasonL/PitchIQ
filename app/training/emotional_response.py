"""
Emotional Response System for the AI Buyer Persona

This module provides tools for handling emotional intelligence aspects of the
buyer-seller interaction, evaluating emotional states, and enhancing responses.
"""

import re
import random
import logging
from typing import Dict, List, Any, Optional
from flask import current_app

# Set up logging
logger = logging.getLogger(__name__)

class EmotionalResponseSystem:
    """
    A system for managing emotional responses in buyer personas.
    
    This class provides tools to:
    1. Evaluate the emotional context of conversations
    2. Track emotional states over time
    3. Generate appropriate emotional responses
    4. Enhance sales training by simulating realistic emotional dynamics
    """
    
    def __init__(self, persona_context: Dict[str, Any]):
        """
        Initialize the emotional response system with persona context.
        
        Args:
            persona_context: Dictionary containing persona information
                - name: The buyer persona's name
                - primary_concern: The main pain point or concern
                - pain_points: List of all pain points
        """
        try:
            self.persona_name = persona_context.get('name', 'Unknown Buyer')
            self.primary_concern = persona_context.get('primary_concern', '')
            self.pain_points = persona_context.get('pain_points', [])
            
            # Initialize emotional state tracking
            self.current_emotional_state = self._get_initial_emotional_state()
            self.emotional_intensity = 0.5  # Scale 0.0 - 1.0
            self.rapport_level = 0.2  # Initially low rapport
            self.question_fatigue = 0.0  # Tracks fatigue from too many questions
            
            # Track conversation dynamics
            self.direct_questions_count = 0
            self.open_questions_count = 0
            self.statements_count = 0
            self.total_messages = 0
            
            logger.debug(f"Initialized EmotionalResponseSystem for persona: {self.persona_name}")
        except Exception as e:
            logger.error(f"Error initializing EmotionalResponseSystem: {str(e)}")
    
    def _get_initial_emotional_state(self) -> str:
        """Determine the initial emotional state based on the persona context."""
        # Default to "neutral" if no context available
        if not self.primary_concern and not self.pain_points:
            return "neutral"
            
        # If primary concern exists, initialize with slightly negative emotion
        return "cautious"
    
    def _detect_question_type(self, message: str) -> str:
        """
        Determine the type of question in the message.
        
        Returns:
            "direct" for yes/no questions
            "open" for open-ended questions
            "none" if no question detected
        """
        # Direct questions typically start with verbs and end with question marks
        direct_question_pattern = r'^(is|are|do|does|can|could|will|would|should|have|has|did).*\?'
        
        # Open questions usually start with who, what, where, when, why, how
        open_question_pattern = r'^(who|what|where|when|why|how).*\?'
        
        if re.search(direct_question_pattern, message.lower()):
            return "direct"
        elif re.search(open_question_pattern, message.lower()):
            return "open"
        elif '?' in message:
            return "open"  # Default any other question to open
        return "none"
    
    def evaluate_emotional_response(self, 
                                   last_message: str, 
                                   conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Evaluate the appropriate emotional response based on the conversation.
        
        Args:
            last_message: The most recent message from the salesperson
            conversation_history: List of all messages in the conversation
            
        Returns:
            Dictionary containing:
            - emotional_state: Current emotional state
            - intensity: Intensity level (0.0-1.0)
            - response_length: Suggested length for the response
            - focus_on_primary_concern: Whether to focus on the primary concern
            - is_direct_question: Whether this is a direct question needing a concise response
        """
        try:
            # Update conversation tracking
            self.total_messages += 1
            
            # Check for questions and update counts
            question_type = self._detect_question_type(last_message)
            is_direct_question = question_type == "direct"
            
            if question_type == "direct":
                self.direct_questions_count += 1
                self.question_fatigue += 0.1  # Direct questions cause less fatigue
            elif question_type == "open":
                self.open_questions_count += 1
                self.question_fatigue += 0.2  # Open questions require more effort
            else:
                self.statements_count += 1
                self.question_fatigue = max(0.0, self.question_fatigue - 0.1)  # Statements reduce fatigue
            
            # Cap the question fatigue
            self.question_fatigue = min(1.0, self.question_fatigue)
            
            # Always prefer briefer responses in the updated approach
            if is_direct_question:
                response_length = "very concise"
            elif self.question_fatigue > 0.5:
                response_length = "very brief"  # Tired of questions
            else:
                response_length = "brief"  # Default to brief responses
            
            # Update emotional state based on conversation
            self._update_emotional_state(last_message)
            
            # Determine whether to focus on primary concern
            focus_on_primary_concern = False
            if self.primary_concern and random.random() < 0.3:
                focus_on_primary_concern = True
                
            return {
                "emotional_state": self.current_emotional_state,
                "intensity": self.emotional_intensity,
                "response_length": response_length,
                "focus_on_primary_concern": focus_on_primary_concern,
                "is_direct_question": is_direct_question
            }
        except Exception as e:
            logger.error(f"Error in evaluate_emotional_response: {str(e)}")
            # Return default values in case of error
            return {
                "emotional_state": "neutral",
                "intensity": 0.5,
                "response_length": "moderate",
                "focus_on_primary_concern": False,
                "is_direct_question": False
            }
    
    def _update_emotional_state(self, message: str) -> None:
        """Update the emotional state based on the message content."""
        try:
            # Very basic emotional state update logic - this could be much more sophisticated
            # with sentiment analysis or similar techniques
            
            # Check for positive indicators
            positive_indicators = ["thank", "appreciate", "great", "good", "excellent", "helpful", "understand"]
            negative_indicators = ["problem", "issue", "concern", "worry", "expensive", "cost", "difficult"]
            
            # Count indicators
            positive_count = sum(1 for word in positive_indicators if word in message.lower())
            negative_count = sum(1 for word in negative_indicators if word in message.lower())
            
            # Adjust rapport based on the message
            if positive_count > negative_count:
                self.rapport_level = min(1.0, self.rapport_level + 0.1)
                if self.current_emotional_state == "neutral":
                    self.current_emotional_state = "positive"
                elif self.current_emotional_state == "cautious":
                    self.current_emotional_state = "neutral"
            elif negative_count > positive_count:
                self.rapport_level = max(0.0, self.rapport_level - 0.05)
                if self.current_emotional_state == "positive":
                    self.current_emotional_state = "neutral"
                elif self.current_emotional_state == "neutral":
                    self.current_emotional_state = "cautious"
            
            # Adjust intensity based on punctuation and capitalization
            if "!" in message or message.isupper():
                self.emotional_intensity = min(1.0, self.emotional_intensity + 0.2)
            else:
                # Gradually reduce intensity if no emotional markers
                self.emotional_intensity = max(0.3, self.emotional_intensity - 0.05)
        except Exception as e:
            logger.error(f"Error in _update_emotional_state: {str(e)}")

    def format_ai_response(self, response: str) -> str:
        """
        Format the AI response based on the current emotional state and intensity.
        
        Args:
            response: The original AI-generated response
            
        Returns:
            The response formatted according to emotional state
        """
        try:
            if not response or len(response.strip()) == 0:
                logger.warning("Empty response passed to format_ai_response")
                return "I'm sorry, I'm not sure how to respond to that."
            
            # First, remove annoying filler words that frustrate users
            cleaned_response = self._remove_filler_words(response)
            
            # Then, ensure the response is appropriately brief
            shortened_response = self._ensure_concise_response(cleaned_response)
                
            # Split into sentences for processing
            sentences = re.split(r'(?<=[.!?])\s+', shortened_response)
            
            # Basic adjustments based on emotional state
            if self.current_emotional_state == "positive" and self.emotional_intensity > 0.6:
                # Add enthusiasm markers for positive emotions
                formatted_response = self._add_enthusiasm(shortened_response)
            elif self.current_emotional_state == "cautious" and self.emotional_intensity > 0.6:
                # Add hesitation markers for cautious emotions
                formatted_response = self._add_hesitation(shortened_response)
            else:
                formatted_response = shortened_response
            
            # Add variability based on rapport level
            if self.rapport_level < 0.3:
                # Low rapport - more formal, shorter responses
                formatted_response = formatted_response.replace("!", ".")
                if len(sentences) > 2:
                    formatted_response = ". ".join(sentences[:2]) + "."
            elif self.rapport_level > 0.7 and random.random() > 0.7:
                # High rapport - occasionally more casual but still concise
                formatted_response = self._add_casual_markers(formatted_response)
                
            # One final check to ensure no filler words were reintroduced
            formatted_response = self._remove_filler_words(formatted_response)
                
            return formatted_response
                
        except Exception as e:
            logger.error(f"Error in format_ai_response: {str(e)}")
            return response  # Return original response if formatting fails
            
    def _add_enthusiasm(self, text: str) -> str:
        """Add enthusiasm markers to the text."""
        # Simple enthusiasm markers
        enthusiasm_markers = [
            (".", "!"),
            ("I think", "I'm excited that"),
            ("I believe", "I'm really confident that"),
            ("It's good", "It's great"),
            ("I like", "I love"),
        ]
        
        result = text
        for original, enthusiastic in enthusiasm_markers:
            # Only replace some instances (random chance)
            if random.random() > 0.7:  # 30% chance to replace
                result = result.replace(original, enthusiastic)
                
        return result
        
    def _add_hesitation(self, text: str) -> str:
        """Add hesitation markers to the text."""
        # Simple hesitation markers - REMOVED "Well, " and "Hmm, " as requested
        hesitation_starters = ["I'm not sure, but ", "I suppose "]
        hesitation_insertions = [" actually, ", " I guess, ", " sort of "]
        
        result = text
        
        # Clean up common filler words that frustrate users
        result = re.sub(r'^(Well,?\s+|Alright,?\s+|Hmm,?\s+|So,?\s+)', '', result)
        
        # Add a hesitation starter (if doesn't already have one)
        if not any(text.startswith(starter) for starter in hesitation_starters):
            if random.random() > 0.6:  # 40% chance
                result = random.choice(hesitation_starters) + result[0].lower() + result[1:]
                
        # Maybe add a hesitation insertion
        if len(result) > 20 and random.random() > 0.7:  # 30% chance for longer texts
            # Insert at a natural break point
            sentences = re.split(r'(?<=[.!?])\s+', result)
            if len(sentences) > 1:
                insert_point = random.randint(1, len(sentences)-1)
                sentences[insert_point] = random.choice(hesitation_insertions) + sentences[insert_point]
                result = " ".join(sentences)
                
        return result
        
    def _add_casual_markers(self, text: str) -> str:
        """Add casual language markers to the text."""
        # Simple casual markers
        casual_replacements = [
            ("I am", "I'm"),
            ("you are", "you're"),
            ("do not", "don't"),
            ("cannot", "can't"),
            ("want to", "wanna"),
            ("going to", "gonna"),
        ]
        
        result = text
        for formal, casual in casual_replacements:
            # Only replace some instances
            if random.random() > 0.5:  # 50% chance to replace
                result = result.replace(formal, casual)
                
        return result

    def _ensure_concise_response(self, text: str) -> str:
        """Ensure the response is appropriately concise for the responsive approach."""
        try:
            # Split into sentences
            sentences = re.split(r'(?<=[.!?])\s+', text)
            
            # If already concise, return as is
            if len(sentences) <= 2:
                return text
                
            # For longer responses, prioritize brevity
            # Keep only 1-2 sentences based on context
            if self.question_fatigue > 0.6 or self.current_emotional_state == "cautious":
                # When fatigued or cautious, be very brief
                return sentences[0]
            else:
                # Otherwise keep two sentences at most
                return " ".join(sentences[:2])
                
        except Exception as e:
            logger.error(f"Error in _ensure_concise_response: {str(e)}")
            return text  # Return original text if shortening fails

    def _remove_filler_words(self, text: str) -> str:
        """Remove annoying filler words from the text."""
        # Common filler words that appear at the beginning of responses
        filler_patterns = [
            r'^(Well,?\s+)',
            r'^(Alright,?\s+)',
            r'^(So,?\s+)',
            r'^(Hmm,?\s+)',
            r'^(Umm,?\s+)',
            r'^(You know,?\s+)',
            r'^(Listen,?\s+)',
            r'^(Look,?\s+)',
            r'^(OK,?\s+)',
            r'^(Okay,?\s+)'
        ]
        
        result = text
        
        # Apply each pattern
        for pattern in filler_patterns:
            result = re.sub(pattern, '', result, flags=re.IGNORECASE)
            
        # Also check for fillers between sentences
        sentence_fillers = [
            r'(?<=[.!?])\s+(Well,?\s+)',
            r'(?<=[.!?])\s+(Alright,?\s+)',
            r'(?<=[.!?])\s+(So,?\s+)',
            r'(?<=[.!?])\s+(Hmm,?\s+)'
        ]
        
        for pattern in sentence_fillers:
            result = re.sub(pattern, ' ', result, flags=re.IGNORECASE)
            
        return result


# Helper function for services
def enhance_buyer_persona_response(persona_context: Dict[str, Any], 
                                  salesperson_message: str,
                                  original_response: str,
                                  conversation_history: List[Dict[str, str]]) -> str:
    """
    Enhance the buyer persona's response with appropriate emotional content.
    
    Args:
        persona_context: Dictionary containing persona traits and context
        salesperson_message: Message from the salesperson
        original_response: Original AI-generated response
        conversation_history: Previous messages in the conversation
        
    Returns:
        Enhanced response with appropriate emotional content
    """
    try:
        emotion_system = EmotionalResponseSystem(persona_context)
        response_guidance = emotion_system.evaluate_emotional_response(
            salesperson_message, conversation_history
        )
        
        # Apply emotional formatting to response
        enhanced_response = emotion_system.format_ai_response(original_response)
        
        # Log the emotional state that would be used
        logger.info(f"Emotional state: {response_guidance['emotional_state']}, " 
            f"Intensity: {response_guidance['intensity']}, "
            f"Response length: {response_guidance['response_length']}")
        
        return enhanced_response
    except Exception as e:
        logger.error(f"Error enhancing buyer persona response: {str(e)}")
        return original_response  # Return original response if enhancement fails 