"""
Sam Conversation Analysis Service

This service provides intelligent conversation analysis for the Sam Coach agent,
handling message attribution, response reconstruction, and information extraction.
"""

import logging
import re
from typing import Dict, List, Tuple, Optional, Any

logger = logging.getLogger(__name__)

class SamConversationService:
    """Service for analyzing Sam Coach conversations and extracting required information."""
    
    def __init__(self):
        # Configuration
        self.sam_identifiers = [
            "i'm sam", "sales coach", "what product or service do you sell", 
            "who is your target market", "i'll now generate your practice partner",
            "excellent! i'll now generate", "great! i'll create", "perfect! i'll generate"
        ]
        self.user_identifiers = [
            "i sell", "we sell", "our product", "our service", "my company",
            "our target market", "our customers", "our clients"
        ]
        self.product_question_patterns = [
            'what product or service do you sell', 'what do you sell', 'what is your product',
            'what is your service', 'tell me about your product', 'tell me what you sell'
        ]
        self.target_question_patterns = [
            'who is your target market', 'target market', 'who do you sell to',
            'ideal customer', 'target market or ideal customer', 'who are your customers'
        ]
        self.product_keywords = [
            'sell', 'training', 'service', 'ai', 'coaching', 'software', 'platform',
            'solution', 'product', 'offer', 'provide', 'help', 'consulting'
        ]
        self.target_keywords = [
            'team', 'teams', 'market', 'customer', 'customers', 'business', 'businesses', 
            'company', 'companies', 'organization', 'organizations', 'b2b', 'b2c', 
            'enterprise', 'small business', 'startup', 'startups', 'corporate',
            'large', 'medium', 'small', 'industry', 'sector', 'professional',
            'manager', 'director', 'executive', 'owner', 'founder', 'people', 'clients'
        ]
        self.completion_phrases = [
            "excellent! i'll now generate", 
            "i'll now generate your practice partner",
            "perfect! let me create",
            "great! i'll create your personas",
            "wonderful! let me generate",
            "amazing! i'll create",
            "fantastic! let me create",
            "excellent! i'll create",
            "perfect! i'll generate",
            "great! let me create your custom ai prospect",
            "i'll now generate your practice partner based on this information"
        ]
    
    def analyze_conversation(self, conversation: List[str]) -> Dict[str, Any]:
        """
        Analyze a Sam conversation to extract product/service and target market.
        
        Args:
            conversation: List of conversation messages
            
        Returns:
            Dictionary with analysis results including:
            - is_complete: Whether the conversation is complete
            - product_service: Extracted product/service
            - target_market: Extracted target market
            - ready_for_completion: Whether all required info is collected
            - confidence: Confidence score for the extraction
            - reasoning: Explanation of the analysis
        """
        try:
            # Skip empty conversations
            if not conversation:
                return {
                    "is_complete": False,
                    "product_service": None,
                    "target_market": None,
                    "ready_for_completion": False,
                    "confidence": 0.0,
                    "reasoning": "Empty conversation"
                }
            
            # Step 1: Identify message roles (Sam vs User)
            message_roles = self._identify_message_roles(conversation)
            
            # Step 2: Reconstruct complete user responses
            complete_user_responses = self._reconstruct_user_responses(conversation, message_roles)
            
            # Step 3: Check if Sam has asked the required questions
            sam_asked_product = self._check_if_sam_asked_about(conversation, message_roles, self.product_question_patterns)
            sam_asked_target = self._check_if_sam_asked_about(conversation, message_roles, self.target_question_patterns)
            
            # Step 4: Extract product/service and target market
            product_service = self._extract_product_service(conversation, message_roles, complete_user_responses)
            target_market = self._extract_target_market(conversation, message_roles, complete_user_responses, product_service)
            
            # Step 5: Check for completion phrase
            is_complete = self._check_for_completion_phrase(conversation)
            
            # Step 6: Determine if ready for completion
            ready_for_completion = (
                product_service and 
                target_market and 
                sam_asked_product and 
                sam_asked_target
            )
            
            # Step 7: Generate reasoning and confidence
            reasoning, confidence = self._generate_reasoning(
                is_complete, ready_for_completion, sam_asked_product, 
                sam_asked_target, product_service, target_market
            )
            
            # Return analysis results
            return {
                "is_complete": bool(is_complete),
                "product_service": product_service,
                "target_market": target_market,
                "ready_for_completion": ready_for_completion,
                "sam_asked_product": sam_asked_product,
                "sam_asked_target": sam_asked_target,
                "confidence": confidence,
                "reasoning": reasoning,
                "message_roles": message_roles,
                "complete_user_responses": complete_user_responses
            }
            
        except Exception as e:
            logger.error(f"Error analyzing conversation: {e}")
            return {
                "is_complete": False,
                "product_service": None,
                "target_market": None,
                "ready_for_completion": False,
                "confidence": 0.0,
                "reasoning": f"Analysis error: {str(e)}"
            }
    
    def _identify_message_roles(self, conversation: List[str]) -> List[str]:
        """
        Identify whether each message is from Sam or the user.
        
        Args:
            conversation: List of conversation messages
            
        Returns:
            List of roles ('sam' or 'user') for each message
        """
        message_roles = []
        last_role = None
        
        for i, msg in enumerate(conversation):
            msg_lower = msg.lower().strip()
            
            # Skip empty messages
            if not msg_lower:
                message_roles.append('unknown')
                continue
            
            # High confidence Sam identification
            if any(sam_phrase in msg_lower for sam_phrase in self.sam_identifiers):
                message_roles.append('sam')
                last_role = 'sam'
                continue
            
            # High confidence user identification
            if any(user_phrase in msg_lower for user_phrase in self.user_identifiers):
                message_roles.append('user')
                last_role = 'user'
                continue
            
            # Use conversation flow logic for ambiguous messages
            if i == 0:
                # First message is likely Sam's greeting
                message_roles.append('sam')
                last_role = 'sam'
            elif last_role == 'sam' and len(msg_lower.split()) <= 3 and any(word in msg_lower for word in ['great', 'excellent', 'perfect', 'wonderful', 'fantastic', 'amazing']):
                # Short acknowledgment after Sam's message is likely Sam continuing
                message_roles.append('sam')
                last_role = 'sam'
            elif last_role == 'sam' and '?' in conversation[i-1]:
                # Response after Sam asks a question is likely user's answer
                message_roles.append('user')
                last_role = 'user'
            elif last_role == 'user' and len(msg_lower.split()) <= 15 and '?' not in msg_lower:
                # Short message after user message without question is likely user continuing
                message_roles.append('user')
                last_role = 'user'
            else:
                # Additional heuristics for ambiguous cases
                if any(sam_phrase in msg_lower for sam_phrase in [
                    "what is your", "who is your", "tell me about", "can you describe", 
                    "what do you sell", "product or service", "target market", "ideal customer",
                    "perfect!", "excellent!", "great!", "wonderful!", "amazing!", "fantastic!",
                    "i'll now", "let me create", "i'll create"
                ]):
                    message_roles.append('sam')
                    last_role = 'sam'
                else:
                    message_roles.append('user')
                    last_role = 'user'
        
        return message_roles
    
    def _reconstruct_user_responses(self, conversation: List[str], message_roles: List[str]) -> List[str]:
        """
        Reconstruct complete user responses by merging adjacent user messages.
        
        Args:
            conversation: List of conversation messages
            message_roles: List of roles for each message
            
        Returns:
            List of complete user responses
        """
        complete_user_responses = []
        current_response = []
        
        for i, (msg, role) in enumerate(zip(conversation, message_roles)):
            if not msg.strip() or role == 'unknown':
                continue
                
            if role == 'user':
                # Check if this is a continuation of previous message
                if i > 0 and message_roles[i-1] == 'user':
                    # If previous message doesn't end with punctuation, likely continuation
                    prev_msg = conversation[i-1].strip()
                    if prev_msg and not prev_msg[-1] in '.!?':
                        current_response.append(msg.strip())
                    else:
                        # Previous message had ending punctuation, might be new thought
                        # Check if this message starts with lowercase (likely continuation)
                        if msg.strip() and msg.strip()[0].islower():
                            current_response.append(msg.strip())
                        else:
                            # Likely new thought
                            if current_response:
                                complete_user_responses.append(' '.join(current_response))
                            current_response = [msg.strip()]
                else:
                    # First user message or after Sam's message
                    if current_response:
                        complete_user_responses.append(' '.join(current_response))
                    current_response = [msg.strip()]
            else:
                # Sam's message - finalize any pending user response
                if current_response:
                    complete_user_responses.append(' '.join(current_response))
                    current_response = []
        
        # Add final response if exists
        if current_response:
            complete_user_responses.append(' '.join(current_response))
            
        return complete_user_responses
    
    def _check_if_sam_asked_about(self, conversation: List[str], message_roles: List[str], patterns: List[str]) -> bool:
        """
        Check if Sam asked about a specific topic.
        
        Args:
            conversation: List of conversation messages
            message_roles: List of roles for each message
            patterns: List of patterns to check for
            
        Returns:
            True if Sam asked about the topic, False otherwise
        """
        for i, (msg, role) in enumerate(zip(conversation, message_roles)):
            if role == 'sam':
                msg_lower = msg.lower()
                if any(pattern in msg_lower for pattern in patterns):
                    return True
        return False
    
    def _extract_product_service(self, conversation: List[str], message_roles: List[str], complete_user_responses: List[str]) -> Optional[str]:
        """
        Extract product/service from the conversation.
        
        Args:
            conversation: List of conversation messages
            message_roles: List of roles for each message
            complete_user_responses: List of complete user responses
            
        Returns:
            Extracted product/service or None if not found
        """
        # First, look for the response that came after Sam asked about product/service
        product_question_indices = []
        for i, (msg, role) in enumerate(zip(conversation, message_roles)):
            if role == 'sam':
                msg_lower = msg.lower()
                if any(pattern in msg_lower for pattern in self.product_question_patterns):
                    product_question_indices.append(i)
        
        # If we found where Sam asked about products
        if product_question_indices:
            last_product_question = product_question_indices[-1]
            
            # Find the next user response after the product question
            for i, (msg, role) in enumerate(zip(conversation[last_product_question+1:], 
                                              message_roles[last_product_question+1:])):
                if role == 'user' and msg.strip():
                    # Found first user response after product question
                    # Find the corresponding complete response
                    for complete_resp in complete_user_responses:
                        if msg.strip() in complete_resp:
                            return complete_resp.strip()
                    
                    # If we couldn't find a matching complete response, use this message
                    return msg.strip()
        
        # Fallback: Use the first substantial user response with product keywords
        for resp in complete_user_responses:
            resp_lower = resp.lower()
            if len(resp.strip()) > 10 and any(keyword in resp_lower for keyword in self.product_keywords):
                return resp.strip()
                
        # Last resort: just take the first substantial user response
        for resp in complete_user_responses:
            if len(resp.strip()) > 10:
                return resp.strip()
        
        return None
    
    def _extract_target_market(self, conversation: List[str], message_roles: List[str], 
                              complete_user_responses: List[str], product_service: Optional[str]) -> Optional[str]:
        """
        Extract target market from the conversation.
        
        Args:
            conversation: List of conversation messages
            message_roles: List of roles for each message
            complete_user_responses: List of complete user responses
            product_service: Previously extracted product/service
            
        Returns:
            Extracted target market or None if not found
        """
        # First, look for the response that came after Sam asked about target market
        target_question_indices = []
        for i, (msg, role) in enumerate(zip(conversation, message_roles)):
            if role == 'sam':
                msg_lower = msg.lower()
                if any(pattern in msg_lower for pattern in self.target_question_patterns):
                    target_question_indices.append(i)
        
        # If we found where Sam asked about target market
        if target_question_indices:
            last_target_question = target_question_indices[-1]
            
            # Find user responses that came after the target market question
            for i, (msg, role) in enumerate(zip(conversation[last_target_question+1:], 
                                              message_roles[last_target_question+1:])):
                if role == 'user' and msg.strip():
                    # Found user response after target market question
                    # Make sure this isn't the product service response
                    if not product_service or not self._is_same_response(msg, product_service):
                        # Find the corresponding complete response
                        for complete_resp in complete_user_responses:
                            if msg.strip() in complete_resp and (not product_service or 
                               not self._is_same_response(complete_resp, product_service)):
                                return complete_resp.strip()
                        
                        # If we couldn't find a matching complete response, use this message
                        return msg.strip()
        
        # Fallback: Look for a user response with target market keywords that's different from product
        for resp in complete_user_responses:
            # Make sure this isn't the product service response
            if product_service and self._is_same_response(resp, product_service):
                continue
                
            resp_lower = resp.lower()
            if len(resp.strip()) > 5 and any(keyword in resp_lower for keyword in self.target_keywords):
                return resp.strip()
        
        # Last resort: take the last substantial user response that's different from product
        if len(complete_user_responses) > 1:
            # Try to find a response that's clearly different from the product
            for resp in reversed(complete_user_responses):
                if product_service and self._is_same_response(resp, product_service):
                    continue
                if len(resp.strip()) > 10:
                    return resp.strip()
        
        return None
    
    def _is_same_response(self, resp1: str, resp2: str) -> bool:
        """
        Check if two responses are essentially the same.
        
        Args:
            resp1: First response
            resp2: Second response
            
        Returns:
            True if responses are the same, False otherwise
        """
        # Exact match
        if resp1.strip() == resp2.strip():
            return True
        
        # Significant overlap
        words1 = set(re.findall(r'\b\w+\b', resp1.lower()))
        words2 = set(re.findall(r'\b\w+\b', resp2.lower()))
        
        if not words1 or not words2:
            return False
            
        # If more than 70% of the words in the shorter response are in the longer response
        overlap = len(words1.intersection(words2))
        min_length = min(len(words1), len(words2))
        
        return overlap / min_length > 0.7
    
    def _check_for_completion_phrase(self, conversation: List[str]) -> bool:
        """
        Check if Sam said a completion phrase.
        
        Args:
            conversation: List of conversation messages
            
        Returns:
            True if a completion phrase was found, False otherwise
        """
        conversation_text = ' '.join(conversation).lower()
        return any(phrase in conversation_text for phrase in self.completion_phrases)
    
    def _generate_reasoning(self, is_complete: bool, ready_for_completion: bool, 
                           sam_asked_product: bool, sam_asked_target: bool,
                           product_service: Optional[str], target_market: Optional[str]) -> Tuple[str, float]:
        """
        Generate reasoning and confidence for the analysis.
        
        Args:
            is_complete: Whether the conversation is complete
            ready_for_completion: Whether all required info is collected
            sam_asked_product: Whether Sam asked about product/service
            sam_asked_target: Whether Sam asked about target market
            product_service: Extracted product/service
            target_market: Extracted target market
            
        Returns:
            Tuple of (reasoning, confidence)
        """
        if is_complete:
            reasoning = "Sam said completion phrase - conversation complete"
            confidence = 0.9
        elif ready_for_completion:
            reasoning = "Both questions answered - waiting for Sam's completion phrase"
            confidence = 0.8
        elif sam_asked_product and not product_service:
            reasoning = "Waiting for product/service answer"
            confidence = 0.5
        elif sam_asked_target and not target_market:
            reasoning = "Waiting for target market answer"
            confidence = 0.5
        elif not sam_asked_product:
            reasoning = "Waiting for Sam to ask about product/service"
            confidence = 0.5
        elif not sam_asked_target:
            reasoning = "Waiting for Sam to ask about target market"
            confidence = 0.5
        else:
            reasoning = "Conversation in progress"
            confidence = 0.5
        
        return reasoning, confidence


# Singleton instance
sam_conversation_service = SamConversationService()

def get_sam_conversation_service() -> SamConversationService:
    """Get the singleton instance of SamConversationService."""
    return sam_conversation_service
