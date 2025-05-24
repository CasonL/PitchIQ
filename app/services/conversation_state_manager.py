"""
Conversation State Manager

This module manages the dynamic state of a sales conversation, providing
contextual analysis based on conversation history.
"""

import logging
import re
import json
from enum import Enum
from typing import Dict, Any, List, Optional, Set, Tuple
from app.services.openai_service import get_openai_service

# Configure logging
logger = logging.getLogger(__name__)

# Retain ConversationPhase Enum for 'likely_phase' analysis? Optional.
class ConversationPhase(Enum):
    """Represents the different phases of a sales conversation."""
    RAPPORT = "rapport"
    DISCOVERY = "discovery"
    PRESENTATION = "presentation"
    OBJECTION_HANDLING = "objection_handling"
    CLOSING = "closing"
    UNKNOWN = "unknown" # Added default

# Keywords and patterns for analysis (kept for now)
RAPPORT_KEYWORDS = {
    'weather', 'weekend', 'family', 'hobby', 'hobbies', 'sports', 'vacation', 
    'holiday', 'morning', 'afternoon', 'day', 'nice to meet', 'pleasure', 
    'how are you', 'how\'s it going', 'how have you been'
}

BUSINESS_KEYWORDS = {
    'business', 'company', 'organization', 'team', 'department', 'role', 
    'position', 'responsibilities', 'goals', 'objectives', 'strategy', 
    'growth', 'industry', 'market', 'sector', 'competition'
}

NEEDS_KEYWORDS = {
    'need', 'requirements', 'looking for', 'interested in', 'considering', 
    'challenges', 'problems', 'issues', 'pain points', 'difficulties', 
    'frustrations', 'goals', 'objectives', 'targets', 'expectations', 
    'criteria', 'standards', 'priorities', 'what matters'
}

OBJECTION_PATTERNS = [
    r'too expensive', r'costs? too much', r'pric(e|ing) concern', 
    r'budget constraints', r'can\'?t afford', r'not in the budget',
    r'need to think', r'need more time', r'not ready', r'not convinced', 
    r'not sure', r'have concerns', r'worried about', r'unsure if', 
    r'competitor', r'alternative', r'other options', r'shopping around', 
    r'compare', r'difference between', r'why should I'
]

INTEREST_PATTERNS = [
    r'sounds good', r'interested', r'tell me more', r'(more|additional) (information|details)', 
    r'how (does|would) (it|that) work', r'what (are|would be) the (next steps|process)', 
    r'how (soon|quickly|fast) can', r'implementation', r'(start|beginning|onboarding) process'
]

CLOSING_PATTERNS = [
    r'ready to (move forward|proceed|get started|buy|purchase)',
    r'where do (we|I) sign', r'contract', r'agreement', r'payment', 
    r'invoice', r'credit card', r'pricing plan', r'discount', 
    r'when can (we|I) start', r'next steps', r'getting started',
    r'decision maker', r'approval', r'management', r'team'
]


class ConversationStateManager:
    """
    Analyzes conversation history to determine the current state and context.
    """
    
    def __init__(self, conversation_history: List[Dict[str, str]] = None, business_context: Optional[str] = None):
        """
        Initialize the conversation state manager.
        
        Args:
            conversation_history: The initial conversation history (optional).
            business_context: The business context (e.g., "B2B", "B2C") (optional).
        """
        self.conversation_history = conversation_history or []
        self.business_context = business_context or "B2B" # Default to B2B if not provided
        # Initialize state dictionary with default values
        self.current_state = {
            "likely_phase": ConversationPhase.UNKNOWN,
            "rapport_level": "Medium", # Default rapport
            "needs_identified": [],
            "objections_raised": [],
            "key_commitments": [],
            "salesperson_focus": None,
            "sentiment": "neutral",
            "message_count": len(self.conversation_history)
        }
        logger.info(f"Initialized ConversationStateManager with business context: {self.business_context}")
        # Perform initial analysis if history is provided
        if self.conversation_history:
            self.update_state(self.conversation_history, self.business_context)

    def update_state(self, new_history: List[Dict[str, str]], business_context: Optional[str] = None):
        """
        Analyze the conversation history and update the internal state dictionary.
        
        Args:
            new_history: The complete, updated conversation history.
            business_context: The business context for this analysis.
        """
        self.conversation_history = new_history
        self.business_context = business_context or self.business_context # Use provided or existing
        self.current_state["message_count"] = len(new_history)
        
        logger.info(f"Updating state based on {len(new_history)} messages. Context: {self.business_context}")

        # Get last user and AI message for analysis
        last_user_message_content = None
        last_ai_message_content = None
        last_user_message = None
        last_ai_message = None
        
        if len(new_history) > 0:
            if new_history[-1].get("role") == "assistant":
                last_ai_message = new_history[-1]
                last_ai_message_content = last_ai_message.get("content")
                if len(new_history) > 1 and new_history[-2].get("role") == "user":
                    last_user_message = new_history[-2]
                    last_user_message_content = last_user_message.get("content")
            elif new_history[-1].get("role") == "user":
                last_user_message = new_history[-1]
                last_user_message_content = last_user_message.get("content")

        # Try to use GPT-3.5-turbo for analysis if we have enough messages
        if len(new_history) >= 2:
            try:
                # Use GPT-3.5-turbo for analysis
                gpt_analysis = self._analyze_with_gpt(new_history, self.business_context)
                if gpt_analysis:
                    # If GPT analysis was successful, update the state with it
                    logger.info("Successfully updated state using GPT-3.5-turbo analysis")
                    return
            except Exception as e:
                logger.error(f"Error using GPT-3.5-turbo for conversation analysis: {str(e)}")
                logger.info("Falling back to rule-based analysis")
                
        # --- Fallback to rule-based analysis ---
        # 1. Calculate category scores for the last interaction
        user_scores = self._calculate_message_category_scores(last_user_message_content or "")
        ai_scores = self._calculate_message_category_scores(last_ai_message_content or "") 

        # 2. Determine likely_phase based on scores and history context
        self.current_state["likely_phase"] = self._determine_likely_phase(
            user_scores, 
            ai_scores, 
            self.current_state["likely_phase"] # Pass previous phase
        )
        
        # 3. Update rapport_level
        self.current_state["rapport_level"] = self._update_rapport(user_scores, ai_scores)

        # 4. Update needs_identified (Accumulates)
        self.current_state["needs_identified"] = self._extract_needs(last_user_message_content or "")

        # 5. Update objections_raised (Accumulates, checks AI msg)
        self.current_state["objections_raised"] = self._extract_objections(last_ai_message_content or "")

        # 6. Update key_commitments (placeholder)
        # TODO: Implement logic to detect commitments like "Let's schedule a call", "Send me the proposal"
        self.current_state["key_commitments"] = self._extract_commitments(last_user_message_content or "", last_ai_message_content or "")

        # 7. Update salesperson_focus
        self.current_state["salesperson_focus"] = self._determine_focus(last_user_message_content or "")
        
        # 8. Update sentiment
        self.current_state["sentiment"] = self._update_sentiment(last_user_message_content or "", last_ai_message_content or "")
        # --- End implemented analysis --- 
        
        logger.debug(f"Updated Conversation State: {self.current_state}")
        
    def get_conversation_state(self) -> Dict[str, Any]:
        """
        Return the current analyzed state of the conversation.
        """
        return self.current_state
        
    @property
    def current_phase(self) -> ConversationPhase:
        """Property that returns the current conversation phase."""
        return self.current_state.get("likely_phase", ConversationPhase.UNKNOWN)

    # --- Analysis Helper Methods (Placeholders/Simplified) ---

    def _calculate_message_category_scores(self, message: str) -> Dict[str, float]:
        """
        Calculate scores (0-1 range) for message categories based on keywords/patterns.
        """
        scores = { # Initialize with 0.0
            "rapport": 0.0,
            "business": 0.0,
            "needs": 0.0,
            "objection": 0.0,
            "interest": 0.0,
            "closing": 0.0
        }
        if not message: return scores
        
        message_lower = message.lower()
        message_len = len(message.split()) # Basic length check
        if message_len == 0: return scores

        # Count occurrences and normalize by length (simple approach)
        rapport_count = sum(1 for keyword in RAPPORT_KEYWORDS if keyword in message_lower)
        business_count = sum(1 for keyword in BUSINESS_KEYWORDS if keyword in message_lower)
        needs_count = sum(1 for keyword in NEEDS_KEYWORDS if keyword in message_lower)
        objection_count = sum(1 for pattern in OBJECTION_PATTERNS if re.search(pattern, message_lower))
        interest_count = sum(1 for pattern in INTEREST_PATTERNS if re.search(pattern, message_lower))
        closing_count = sum(1 for pattern in CLOSING_PATTERNS if re.search(pattern, message_lower))

        # Score calculation (simple normalization, capped at 1.0)
        # Weights can be adjusted
        scores["rapport"] = min(1.0, rapport_count * 0.5)
        scores["business"] = min(1.0, business_count * 0.2)
        scores["needs"] = min(1.0, needs_count * 0.4 + (1 if '?' in message else 0) * 0.3)
        scores["objection"] = min(1.0, objection_count * 0.8) # Higher weight for objections
        scores["interest"] = min(1.0, interest_count * 0.6)
        scores["closing"] = min(1.0, closing_count * 0.7)
        
        return scores

    def _determine_likely_phase(self, user_scores: Dict[str, float], ai_scores: Dict[str, float], previous_phase: ConversationPhase) -> ConversationPhase:
        """Determine the most likely current phase based on scores and context."""
        message_count = self.current_state["message_count"]

        # --- Phase Logic ---
        # Closing has highest priority
        if user_scores["closing"] > 0.5 or ai_scores["closing"] > 0.5:
            return ConversationPhase.CLOSING

        # Objection handling - triggered mainly by AI objections
        if ai_scores["objection"] > 0.4:
            return ConversationPhase.OBJECTION_HANDLING

        # Presentation - triggered by user interest after discovery/presentation or high business focus
        if user_scores["interest"] > 0.4 and previous_phase in [ConversationPhase.DISCOVERY, ConversationPhase.PRESENTATION, ConversationPhase.OBJECTION_HANDLING]:
            return ConversationPhase.PRESENTATION
        if user_scores["business"] > 0.6 and previous_phase != ConversationPhase.RAPPORT:
             return ConversationPhase.PRESENTATION # High business focus likely means presentation

        # Discovery - triggered by needs questions/keywords
        if user_scores["needs"] > 0.3 or ai_scores["needs"] > 0.3:
            # Avoid immediately jumping from rapport if needs are mentioned very early
            if previous_phase == ConversationPhase.RAPPORT and message_count < 4:
                 return ConversationPhase.RAPPORT
            return ConversationPhase.DISCOVERY

        # Rapport - Default early on or if rapport signals are strong
        if previous_phase == ConversationPhase.UNKNOWN or message_count < 3:
             return ConversationPhase.RAPPORT
        if user_scores["rapport"] > 0.3 or ai_scores["rapport"] > 0.3:
             return ConversationPhase.RAPPORT

        # Fallback to previous phase if no strong signal
        logger.debug(f"No strong phase signal detected, defaulting to previous phase: {previous_phase}")
        return previous_phase

    def _update_rapport(self, user_scores: Dict[str, float], ai_scores: Dict[str, float]) -> str:
        """Update rapport level based on scores."""
        # Simple heuristic: High rapport if either side shows it strongly
        if user_scores["rapport"] > 0.6 or ai_scores["rapport"] > 0.6:
            return "High"
        # Low rapport if objections are high and rapport is low
        if ai_scores["objection"] > 0.5 and (user_scores["rapport"] < 0.2 and ai_scores["rapport"] < 0.2):
            return "Low"
        # Otherwise, maintain Medium (or previous state if more complex logic added)
        return "Medium"

    def _extract_needs(self, user_message: str) -> List[str]:
        """Extract potential needs mentioned by the user."""
        found_needs = []
        if not user_message: return self.current_state.get("needs_identified", [])

        # Enhanced patterns using raw strings (Corrected)
        patterns = [
            r'need(?:s|ed)? to (.*?)(?:\.|,|$)',
            r'looking for (.*?)(?:\.|,|$)',
            r'challenge.*?(is|with|in) (.*?)(?:\.|,|$)',
            r'problem.*?(is|with|in) (.*?)(?:\.|,|$)',
            r'improve (.*?)(?:\.|,|$)',
            r'reduce (.*?)(?:\.|,|$)',
            r'struggling with (.*?)(?:\.|,|$)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, user_message.lower())
            for match in matches:
                # If pattern captures multiple groups, take the last non-empty one
                need = match[-1] if isinstance(match, tuple) else match
                need = need.strip()
                if len(need) > 3 and len(need.split()) < 10: # Basic filtering
                    found_needs.append(need.capitalize())

        # Combine with previous needs, avoid duplicates
        previous_needs = self.current_state.get("needs_identified", [])
        return list(set(previous_needs + found_needs))

    def _extract_objections(self, ai_message: str) -> List[str]:
         """Extract potential objections raised by the AI."""
         found_objections = []
         if not ai_message: return self.current_state.get("objections_raised", [])
         
         message_lower = ai_message.lower()
         for pattern in OBJECTION_PATTERNS:
             matches = re.findall(pattern, message_lower)
             if matches:
                 # Try to capture a slightly larger context around the pattern
                 for match in matches:
                    # Find the start index of the match
                    try:
                        start_index = message_lower.index(match)
                        # Extract a snippet around the match (e.g., 30 chars before, 40 after)
                        context_start = max(0, start_index - 30)
                        context_end = min(len(ai_message), start_index + len(match) + 40)
                        snippet = ai_message[context_start:context_end].strip()
                        # Basic cleanup
                        snippet = snippet.replace('\n', ' ')
                        found_objections.append(f"Objection: ...{snippet}...")
                        break # Only add one snippet per pattern match for now
                    except ValueError:
                        continue # Should not happen if re.search found it

         # TODO: Add logic to remove objections if user successfully addresses them
         previous_objections = self.current_state.get("objections_raised", [])
         # For now, just accumulate
         return list(set(previous_objections + found_objections))

    def _extract_commitments(self, user_message: str, ai_message: str) -> List[str]:
        """Placeholder for extracting commitments."""
        # TODO: Implement patterns like "send me", "schedule a call", "let's proceed"
        return []

    def _determine_focus(self, user_message: str) -> Optional[str]:
        """Determine the salesperson's focus based on keywords and structure."""
        if not user_message: return self.current_state.get("salesperson_focus")
        
        message_lower = user_message.lower()
        scores = self._calculate_message_category_scores(user_message)

        if scores["closing"] > 0.4: return "Closing Attempt"
        if scores["interest"] > 0.5: return "Building Interest / Presenting"
        if scores["objection"] > 0: return "Addressing Objection" # Less likely for user msg
        if scores["needs"] > 0.4: return "Needs Discovery"
        if scores["business"] > 0.3: return "Business Context Discussion"
        if scores["rapport"] > 0.3: return "Rapport Building"
        if '?' in user_message: return "Asking Question"
        
        return "General Statement" # Default

    def _update_sentiment(self, user_message: str, ai_message: str) -> str:
        """Placeholder for simple sentiment analysis."""
        # TODO: Implement basic keyword spotting for positive/negative sentiment
        positive_words = {"great", "good", "excellent", "thanks", "appreciate", "agree", "perfect", "helpful"}
        negative_words = {"no", "not", "don't", "can't", "problem", "issue", "concern", "difficult", "wrong"}
        
        user_sentiment_score = 0
        ai_sentiment_score = 0

        if user_message:
            user_lower = user_message.lower()
            user_sentiment_score += sum(1 for word in positive_words if word in user_lower)
            user_sentiment_score -= sum(1 for word in negative_words if word in user_lower)
        
        if ai_message:
            ai_lower = ai_message.lower()
            ai_sentiment_score += sum(1 for word in positive_words if word in ai_lower)
            ai_sentiment_score -= sum(1 for word in negative_words if word in ai_lower)

        total_score = user_sentiment_score + ai_sentiment_score

        if total_score > 1: return "positive"
        if total_score < -1: return "negative"
        return "neutral" # Default

    def update_phase(self, user_message: str) -> bool:
        """
        Update the conversation phase based on the latest user message.
        
        Args:
            user_message: The latest message from the user.
            
        Returns:
            bool: True if the phase changed, False otherwise.
        """
        if not user_message:
            return False
            
        # Calculate scores for the message
        scores = self._calculate_message_category_scores(user_message)
        
        # Get the current likely phase from state
        current_phase = self.current_state.get("likely_phase", ConversationPhase.UNKNOWN)
        
        # Determine next phase using simplified heuristics from _determine_likely_phase
        next_phase = current_phase  # Default to no change
        
        # Use message scores to determine phase transition
        if scores["closing"] > 0.5:
            next_phase = ConversationPhase.CLOSING
        elif scores["objection"] > 0.4:
            next_phase = ConversationPhase.OBJECTION_HANDLING
        elif scores["interest"] > 0.4 and current_phase in [ConversationPhase.DISCOVERY, ConversationPhase.PRESENTATION]:
            next_phase = ConversationPhase.PRESENTATION
        elif scores["needs"] > 0.3 and current_phase != ConversationPhase.RAPPORT:
            next_phase = ConversationPhase.DISCOVERY
        elif scores["rapport"] > 0.3 and current_phase == ConversationPhase.UNKNOWN:
            next_phase = ConversationPhase.RAPPORT
        
        # Check if phase changed
        phase_changed = (next_phase != current_phase)
        
        # Update the current phase in the state
        if phase_changed:
            self.current_state["likely_phase"] = next_phase
            
        return phase_changed

    def get_system_prompt(self, persona: str, sales_info: Dict[str, Any] = None, 
                         user_name: str = "User") -> str:
        """
        Generate a system prompt based on the current conversation phase and context.
        
        Args:
            persona: Description of the customer persona
            sales_info: Additional context about the sales scenario
            user_name: Name of the salesperson
            
        Returns:
            str: The generated system prompt
        """
        # Set defaults if not provided
        sales_info = sales_info or {}
        product = sales_info.get('product_service', 'your product/service')
        experience = sales_info.get('sales_experience', 'experienced')
        
        # Get the current phase
        current_phase = self.current_state.get("likely_phase", ConversationPhase.RAPPORT)
        
        # Base system prompt
        base_prompt = f"""You are roleplaying as a potential customer evaluating {product}.
You are speaking with {user_name}, a {experience} salesperson.

CUSTOMER PERSONA:
{persona}

SALES CONVERSATION STATE:
- Current Phase: {current_phase.value}
- Rapport Level: {self.current_state.get('rapport_level', 'Medium')}
- Needs Identified: {', '.join(self.current_state.get('needs_identified', []))}
- Objections Raised: {', '.join(self.current_state.get('objections_raised', []))}
"""

        # Add phase-specific instructions
        phase_instructions = self._get_phase_specific_instructions(current_phase)
        
        return base_prompt + phase_instructions
        
    def _get_phase_specific_instructions(self, phase: ConversationPhase) -> str:
        """
        Get phase-specific conversation instructions.
        
        Args:
            phase: The current conversation phase
            
        Returns:
            str: Phase-specific instructions for the AI
        """
        if phase == ConversationPhase.RAPPORT:
            return """
RAPPORT PHASE INSTRUCTIONS:
- Be professionally friendly but not overly familiar
- Share basic information about yourself and your role
- Ask light professional questions
- Don't immediately reveal all your needs or pain points
- Be receptive to relationship building but maintain professional boundaries
"""
        
        elif phase == ConversationPhase.DISCOVERY:
            return """
DISCOVERY PHASE INSTRUCTIONS:
- Answer questions about your needs and situation honestly
- Share your pain points when asked directly
- Don't volunteer information that hasn't been asked for
- Express some hesitation when appropriate
- Be willing to elaborate when the salesperson asks follow-up questions
- Show more interest when the salesperson addresses your specific concerns
"""
        
        elif phase == ConversationPhase.PRESENTATION:
            return """
PRESENTATION PHASE INSTRUCTIONS:
- Ask clarifying questions when you don't understand something
- React to features/benefits based on how well they match your needs
- Show more interest in aspects that address your pain points
- Raise mild objections if something doesn't seem to fit your requirements
- Become more engaged when the salesperson demonstrates value
"""
        
        elif phase == ConversationPhase.OBJECTION_HANDLING:
            return """
OBJECTION HANDLING PHASE INSTRUCTIONS:
- Express your concerns or objections clearly
- Be specific about what's holding you back
- Don't immediately accept the first response to your objection
- Require logical explanations and evidence
- Show appreciation when the salesperson addresses your concerns well
"""
        
        elif phase == ConversationPhase.CLOSING:
            return """
CLOSING PHASE INSTRUCTIONS:
- Ask about next steps and implementation details
- Raise any final concerns before committing
- Show increased interest when value is clearly demonstrated
- Respond positively to clear calls to action
- Be willing to commit if your needs and objections have been addressed
"""
        
        else:  # Unknown or default
            return """
GENERAL CONVERSATION INSTRUCTIONS:
- Respond naturally to the salesperson's questions and statements
- Be professional and courteous
- Share information about your needs when asked
- Express appropriate levels of interest based on relevance to your situation
- Raise objections if something doesn't align with your requirements
"""

    def _analyze_with_gpt(self, conversation_history: List[Dict[str, str]], business_context: Optional[str] = None) -> bool:
        """
        Use a simpler GPT model (like GPT-3.5-turbo) to analyze the conversation state.
        This is a more advanced approach that can provide nuanced insights.

        Args:
            conversation_history: The conversation history to analyze.
            business_context: The business context (e.g., "B2B", "B2C").

        Returns:
            bool: True if analysis was successful and state was updated, False otherwise.
        """
        if not conversation_history or len(conversation_history) < 2:
            logger.debug("Not enough history for GPT analysis.")
            return False

        try:
            openai_service = get_openai_service() # Assuming this gets the right service
            if not openai_service or not openai_service.initialized:
                logger.warning("OpenAI service not available for GPT analysis in CSM.")
                return False

            # Construct a prompt for GPT-3.5-turbo
            # Limit history to keep prompt size manageable if necessary
            MAX_HISTORY_FOR_PROMPT = 10 # Last 10 messages
            history_for_prompt = json.dumps(conversation_history[-MAX_HISTORY_FOR_PROMPT:], indent=2)
            
            prompt = f"""
Analyze the following sales conversation history to determine its current state. The conversation is in a '{business_context if business_context else 'general'}' context.
Focus on these aspects:
1.  **likely_phase**: Current phase (e.g., rapport, discovery, presentation, objection_handling, closing, unknown).
2.  **rapport_level**: Estimated rapport (e.g., Low, Medium, High).
3.  **needs_identified**: List key customer needs or pain points explicitly mentioned or strongly implied (list of strings).
4.  **objections_raised**: List key objections raised by the customer (list of strings).
5.  **salesperson_focus**: What is the salesperson primarily trying to achieve in their last turn? (e.g., build_rapport, uncover_needs, present_solution, handle_objection, close_deal, clarify_information).
6.  **sentiment**: Overall sentiment of the last few exchanges (e.g., positive, negative, neutral, mixed).

Conversation History (last {MAX_HISTORY_FOR_PROMPT} messages):
{history_for_prompt}

Return your analysis as a JSON object with the keys: "likely_phase", "rapport_level", "needs_identified", "objections_raised", "salesperson_focus", "sentiment".
Ensure "likely_phase" is one of the predefined enum values.
If needs or objections are not apparent, return empty lists.
"""

            logger.debug(f"CSM GPT Analysis Prompt (first 200 chars): {prompt[:200]}...")
            # Use a model suitable for this kind of analysis, e.g., gpt-3.5-turbo
            # The specific model should ideally be configurable or a less expensive one.
            # For now, using the default completion model from openai_service
            analysis_json_str = openai_service.get_completion(
                prompt,
                model_override="gpt-3.5-turbo" # Example: Force a cheaper/faster model
            )

            if not analysis_json_str:
                logger.warning("Received no analysis from GPT in CSM.")
                return False

            logger.debug(f"Raw GPT Analysis JSON string: {analysis_json_str}")
            analysis_data = json.loads(analysis_json_str)

            # Validate and update self.current_state
            # Example validation (can be more robust)
            self.current_state["likely_phase"] = ConversationPhase(analysis_data.get("likely_phase", "unknown").lower())
            self.current_state["rapport_level"] = analysis_data.get("rapport_level", "Medium")
            self.current_state["needs_identified"] = list(analysis_data.get("needs_identified", []))
            self.current_state["objections_raised"] = list(analysis_data.get("objections_raised", []))
            self.current_state["salesperson_focus"] = analysis_data.get("salesperson_focus")
            self.current_state["sentiment"] = analysis_data.get("sentiment", "neutral")
            
            logger.info(f"CSM state successfully updated via GPT: Phase - {self.current_state['likely_phase']}")
            return True

        except json.JSONDecodeError as e_json:
            logger.error(f"CSM: Failed to decode JSON from GPT analysis: {e_json}. Response: {analysis_json_str[:200]}...")
            return False
        except ValueError as e_val: # For invalid enum conversion
            logger.error(f"CSM: Invalid value for likely_phase from GPT: {e_val}")
            self.current_state["likely_phase"] = ConversationPhase.UNKNOWN # Fallback
            return False # Or true if other fields were okay?
        except Exception as e:
            logger.error(f"CSM: Unexpected error during GPT analysis: {e}", exc_info=True)
            return False

# Example standalone analysis function (if needed outside the class)
def analyze_message_content(message: str) -> Dict[str, float]:
    """
    Analyze a message to identify content types and themes
    (Note: This is similar to _calculate_message_category_scores, kept for potential external use)
    
    Args:
        message: The message text to analyze
        
    Returns:
        Dict[str, float]: Scores for different content categories
    """
    # This is a simplified version - in production you might use NLP
    message_lower = message.lower()
    
    # Quick pattern matching for message analysis
    scores = {
        "rapport": 0.0,
        "business": 0.0,
        "needs": 0.0,
        "objection": 0.0,
        "interest": 0.0,
        "closing": 0.0
    }
    
    # Personal/rapport patterns
    rapport_patterns = [
        r"how are you", r"nice (day|weather)", r"weekend", r"family", r"hobby",
        r"nice to (meet|talk)", r"personally", r"yourself", r"background"
    ]
    
    # Business patterns
    business_patterns = [
        r"business", r"company", r"organization", r"industry", r"market",
        r"product", r"service", r"solution", r"offer", r"price", r"cost"
    ]
    
    # Needs/problems patterns
    needs_patterns = [
        r"need", r"want", r"looking for", r"interested in", r"requirement",
        r"problem", r"issue", r"challenge", r"improve", r"better", r"help with"
    ]
    
    # Objection patterns
    objection_patterns = [
        r"expensive", r"costly", r"concern", r"worried", r"risk", r"competitor",
        r"alternative", r"not sure", r"think about", r"high price", r"too much"
    ]
    
    # Interest patterns
    interest_patterns = [
        r"interested", r"tell me more", r"sounds good", r"like that", r"benefit",
        r"value", r"advantage", r"how would", r"feature", r"curious"
    ]
    
    # Closing patterns
    closing_patterns = [
        r"next steps", r"move forward", r"decision", r"purchase", r"buy",
        r"timeline", r"when can we", r"start", r"implement", r"sign", r"agreement"
    ]
    
    # Simple pattern counting
    for pattern in rapport_patterns:
        if re.search(pattern, message_lower): scores["rapport"] += 0.2
    for pattern in business_patterns:
        if re.search(pattern, message_lower): scores["business"] += 0.15
    for pattern in needs_patterns:
        if re.search(pattern, message_lower): scores["needs"] += 0.2
    for pattern in objection_patterns:
        if re.search(pattern, message_lower): scores["objection"] += 0.25
    for pattern in interest_patterns:
        if re.search(pattern, message_lower): scores["interest"] += 0.2
    for pattern in closing_patterns:
        if re.search(pattern, message_lower): scores["closing"] += 0.25
    
    # Cap scores at 1.0
    for key in scores:
        scores[key] = min(scores[key], 1.0)
    
    return scores 