"""
Emotion Implementation for AI Buyer Personas

This module provides emotional intelligence enhancements for buyer personas
in sales training roleplays.
"""

import re
from typing import Dict, List, Any, Optional

# Emotional response triggers
PAIN_POINT_UNDERSTOOD = [
    "you've nailed it", 
    "that's exactly right",
    "you understand", 
    "you get it", 
    "that's our problem", 
    "that's our challenge",
    "you've summarized",
    "you've identified",
    "yeah, thats pretty much it",
    "I think you're right",
    "uhh, yeah that sounds about right",
    "wow, that's a good way to put it",
    "yeah, I mean I think you're right"
]

VALUE_DEMONSTRATED = [
    "would help us", 
    "would solve", 
    "could improve", 
    "reduce our", 
    "increase our", 
    "save us", 
    "game-changer"
]

SKEPTICISM_TRIGGERS = [
    "too good to be true", 
    "sounds unrealistic", 
    "prove it", 
    "evidence", 
    "guarantee", 
    "who else", 
    "case studies",
    "not convinced"
]

FRUSTRATION_TRIGGERS = [
    "not relevant", 
    "off-topic", 
    "waste of time", 
    "focus", 
    "back to", 
    "core issue",
    "not addressing",
    "missing the point"
]

# Main emotional response system
class EmotionalResponseSystem:
    """Manages emotional responses for buyer personas in sales training."""
    
    def __init__(self, persona_context: Dict[str, Any]):
        """
        Initialize the emotional response system.
        
        Args:
            persona_context: Dictionary containing persona traits and context
        """
        self.persona = persona_context
        self.emotional_state = "neutral"
        self.previous_states = []
        self.emotion_intensity = 0.5  # Scale 0.0-1.0
        
        # Track key topics mentioned by salesperson
        self.topics_mentioned = set()
        
        # Load persona-specific pain points and priorities
        self.pain_points = self.persona.get("pain_points", [])
        self.primary_concern = self.persona.get("primary_concern", "")
        
    def evaluate_emotional_response(self, 
                                   salesperson_message: str, 
                                   conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Evaluate the appropriate emotional response based on salesperson's message.
        
        Args:
            salesperson_message: The message from the salesperson
            conversation_history: List of previous messages in the conversation
            
        Returns:
            Dictionary with emotional response guidance
        """
        # Track previous emotional state
        self.previous_states.append(self.emotional_state)
        if len(self.previous_states) > 5:
            self.previous_states.pop(0)
        
        # Reset emotional state if needed (don't stay in same state too long)
        if len(self.previous_states) >= 3 and all(state == self.emotional_state for state in self.previous_states[-3:]):
            self.emotion_intensity *= 0.7  # Reduce intensity if same emotion continues
            
        # Analyze salesperson message for emotional triggers
        message_lower = salesperson_message.lower()
        
        # Check for direct questions (close-ended)
        is_question = "?" in salesperson_message
        is_close_ended = is_question and any(w in message_lower for w in ["is", "are", "do", "does", "can", "could", "will", "would", "should"])
        
        # Check for specific emotional triggers
        if any(trigger in message_lower for trigger in PAIN_POINT_UNDERSTOOD):
            # Check if they actually identified key pain points
            if any(point.lower() in message_lower for point in self.pain_points):
                self.emotional_state = "relieved"
                self.emotion_intensity = 0.8
                
                # Extra excitement if they identified the primary concern
                if self.primary_concern and self.primary_concern.lower() in message_lower:
                    self.emotional_state = "excited"
                    self.emotion_intensity = 0.9
            else:
                # They claim to understand but didn't demonstrate it
                self.emotional_state = "skeptical"
                self.emotion_intensity = 0.6
                
        elif any(trigger in message_lower for trigger in VALUE_DEMONSTRATED):
            self.emotional_state = "interested"
            self.emotion_intensity = 0.7
            
            # If they demonstrate value for the primary concern
            if self.primary_concern and self.primary_concern.lower() in message_lower:
                self.emotional_state = "excited"
                self.emotion_intensity = 0.8
                
        elif any(trigger in message_lower for trigger in SKEPTICISM_TRIGGERS):
            self.emotional_state = "defensive"
            self.emotion_intensity = 0.6
            
        elif any(trigger in message_lower for trigger in FRUSTRATION_TRIGGERS):
            self.emotional_state = "frustrated"
            self.emotion_intensity = 0.7
            
        # For close-ended questions, prepare concise response
        if is_close_ended:
            response_length = "very_short"
        else:
            response_length = "normal"
            
        # Prepare response guidance
        response_guidance = {
            "emotional_state": self.emotional_state,
            "intensity": self.emotion_intensity,
            "response_length": response_length,
            "focus_on_primary_concern": self.primary_concern if self.emotional_state in ["relieved", "excited"] else "",
            "let_salesperson_lead": True,
            "is_direct_question": is_question
        }
        
        return response_guidance
    
    def format_ai_response(self, response: str) -> str:
        """
        Format the AI response to match emotional guidelines.
        
        Args:
            response: Original AI response
            
        Returns:
            Reformatted response following emotional guidelines
        """
        # Remove descriptive text (anything in asterisks or brackets)
        response = re.sub(r'\*[^*]*\*', '', response)
        response = re.sub(r'\[[^\]]*\]', '', response)
        
        # Make responses more concise
        if self.emotion_intensity > 0.7 and len(response) > 200:
            # Split into sentences and keep the most emotional ones
            sentences = re.split(r'(?<=[.!?])\s+', response)
            if len(sentences) > 3:
                # Keep first sentence (greeting/acknowledgment)
                # and 1-2 most relevant sentences with emotion
                sentences = [sentences[0]] + [s for s in sentences[1:3] if any(
                    trigger in s.lower() for trigger in 
                    PAIN_POINT_UNDERSTOOD + VALUE_DEMONSTRATED + SKEPTICISM_TRIGGERS
                )]
                response = ' '.join(sentences)
        
        return response.strip()


# Example usage
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
    emotion_system = EmotionalResponseSystem(persona_context)
    response_guidance = emotion_system.evaluate_emotional_response(
        salesperson_message, conversation_history
    )
    
    # Apply emotional formatting to response
    enhanced_response = emotion_system.format_ai_response(original_response)
    
    # For demo purposes, print the emotional state that would be used
    print(f"Emotional state: {response_guidance['emotional_state']}, " 
          f"Intensity: {response_guidance['intensity']}")
    
    return enhanced_response 