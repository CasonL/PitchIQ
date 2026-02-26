"""
Coach Sync Classifier - Fast Reflex Flags Only

This is the SYNC path for the Coach architecture.
- Runs every turn, must be fast (<50ms)
- Outputs only allowlisted reflex flags
- No strategic decisions (those go to async planner)

Allowlist:
- max_sentences
- answer_policy (answer | clarify | deflect)
- do_not_echo
- hard_constraints (limited set)
"""
from typing import Dict, Optional
from dataclasses import dataclass
import re
import logging

logger = logging.getLogger(__name__)


# Allowlisted hard constraints for sync path
SYNC_CONSTRAINTS = {
    'wait_for_complete_thought',
    'answer_user_question',
    'keep_brief'
}


@dataclass
class SyncReflexes:
    """Fast reflex flags - no strategic content"""
    max_sentences: int
    answer_policy: str  # "answer" | "clarify" | "deflect"
    do_not_echo: bool
    hard_constraints: list
    question_type: str  # "open" | "closed" | "none"


class CoachSyncClassifier:
    """
    Fast pattern-based classifier for sync reflexes.
    No LLM calls - pure pattern matching.
    """
    
    def classify(self, user_message: str, current_phase: str = "rapport") -> SyncReflexes:
        """
        Classify user message and return reflex flags.
        Must be fast - no LLM calls.
        """
        message_lower = user_message.lower().strip()
        
        # Detect question type
        question_type = self._detect_question_type(message_lower)
        
        # Detect if message is incomplete
        is_incomplete = self._detect_incomplete(message_lower)
        
        # Build reflex flags
        max_sentences = self._calculate_max_sentences(question_type, current_phase)
        answer_policy = self._determine_answer_policy(question_type, is_incomplete)
        do_not_echo = question_type != "none"
        
        # Build constraints
        constraints = []
        if is_incomplete:
            constraints.append({
                'action': 'add',
                'value': 'wait_for_complete_thought',
                'ttl_turns': 1
            })
        if question_type != "none":
            constraints.append({
                'action': 'add',
                'value': 'answer_user_question',
                'ttl_turns': 1
            })
        
        reflexes = SyncReflexes(
            max_sentences=max_sentences,
            answer_policy=answer_policy,
            do_not_echo=do_not_echo,
            hard_constraints=constraints,
            question_type=question_type
        )
        
        logger.debug(f"[SyncClassifier] Reflexes: max_sentences={max_sentences}, "
                    f"answer_policy={answer_policy}, question_type={question_type}")
        
        return reflexes
    
    def _detect_question_type(self, message: str) -> str:
        """Detect if message is open question, closed question, or neither"""
        
        # Open question indicators (discovery, exploratory)
        open_patterns = [
            r'\b(tell me about|describe|explain|walk me through)\b',
            r'\b(how do you|how does|how would)\b',
            r'\b(what is your|what are your|what\'s your)\b',
            r'\b(why do you|why would|why is)\b',
            r'\bwhat .{5,}\?',  # "what" followed by 5+ chars and ?
        ]
        
        # Closed question indicators (yes/no, factual)
        closed_patterns = [
            r'^(do you|are you|is it|can you|will you|would you|have you)\b',
            r'^(does |did |has |was |were )\b',
            r'\b(yes or no|which one)\b',
            r'\bhow many\b',
            r'\bhow much\b',
        ]
        
        # Check for question mark
        has_question_mark = '?' in message
        
        # Check open patterns
        for pattern in open_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return "open"
        
        # Check closed patterns
        for pattern in closed_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return "closed"
        
        # If has question mark but no pattern matched, assume closed
        if has_question_mark:
            return "closed"
        
        return "none"
    
    def _detect_incomplete(self, message: str) -> bool:
        """Detect if message appears incomplete/cut-off"""
        
        # Incomplete patterns
        incomplete_endings = [
            'about', 'about your', 'about the',
            'wondering', 'wondering about',
            'curious', 'curious about',
            'tell me', 'tell me about',
            'and', 'but', 'so', 'because',
            'like', 'such as',
        ]
        
        # Check if ends with incomplete pattern
        for ending in incomplete_endings:
            if message.rstrip('.,!?').endswith(ending):
                return True
        
        # Check if very short with no punctuation (likely cut off)
        if len(message) < 10 and not any(p in message for p in '.?!'):
            return True
        
        return False
    
    def _calculate_max_sentences(self, question_type: str, phase: str) -> int:
        """Calculate appropriate response length"""
        
        # Base on question type
        if question_type == "open":
            base = 3
        elif question_type == "closed":
            base = 1
        else:
            base = 2
        
        # Adjust by phase
        phase_adjustments = {
            "rapport": 0,      # Normal length
            "discovery": 1,    # Slightly longer (sharing info)
            "presentation": 1, # Longer (explaining)
            "tension": -1,     # Shorter (pushback)
            "close": 0         # Normal
        }
        
        adjustment = phase_adjustments.get(phase, 0)
        return max(1, min(4, base + adjustment))
    
    def _determine_answer_policy(self, question_type: str, is_incomplete: bool) -> str:
        """Determine how to handle the response"""
        
        if is_incomplete:
            return "clarify"  # Ask them to finish
        
        if question_type in ("open", "closed"):
            return "answer"  # Direct answer
        
        return "answer"  # Default to answering


# Singleton instance
_classifier = None

def get_sync_classifier() -> CoachSyncClassifier:
    """Get singleton classifier instance"""
    global _classifier
    if _classifier is None:
        _classifier = CoachSyncClassifier()
    return _classifier
