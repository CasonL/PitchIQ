"""
Coach LLM Service - Structured State Patch Output
Classifies persist vs intervene and outputs state patches with TTL
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from flask import current_app
from app.services.gpt4o_service import GPT4oService
from app.services.coach_schemas import validate_coach_response
from app.services.coach_constants import (
    COACH_TEMPERATURE, COACH_MAX_TOKENS, CONFIDENCE_THRESHOLD, LOW_CONFIDENCE_THRESHOLD
)
from app.services.coach_metrics import get_metrics
import json
import re
import time


@dataclass
class CoachDecision:
    """Coach's structured decision with state patch"""
    should_intervene: bool
    state_patch: Dict  # Structured state updates with TTL
    one_shot_line: Optional[str]  # Optional specific wording
    reasoning: str
    confidence: float


class CoachLLMService:
    """Minimal Coach - outputs structured state patches"""
    
    def __init__(self):
        self.gpt = GPT4oService()
    
    def classify(
        self,
        user_message: str,
        transcript_history: List[Dict],
        persona: Dict,
        session_context: Dict,
        session_id: str = 'unknown',
        turn: int = 0
    ) -> CoachDecision:
        """
        Classify whether to persist or intervene
        Returns structured state patch + optional one-shot line
        """
        start_time = time.time()
        metrics = get_metrics()
        
        try:
            prompt = self._build_classification_prompt(
                user_message, transcript_history, persona, session_context
            )
            
            response = self.gpt.generate_response(
                messages=[{"role": "user", "content": prompt}],
                temperature=COACH_TEMPERATURE,
                max_tokens=COACH_MAX_TOKENS
            )
            
            decision = self._parse_decision(response)
            latency_ms = (time.time() - start_time) * 1000
            
            # Log decision with metrics
            metrics.log_decision(
                session_id=session_id,
                decision={
                    'should_intervene': decision.should_intervene,
                    'confidence': decision.confidence,
                    'state_patch': decision.state_patch,
                    'reasoning': decision.reasoning
                },
                user_message=user_message,
                turn=turn,
                latency_ms=latency_ms
            )
            
            # Warn on low confidence
            if decision.confidence < LOW_CONFIDENCE_THRESHOLD:
                metrics.log_low_confidence_warning(
                    session_id=session_id,
                    confidence=decision.confidence,
                    threshold=LOW_CONFIDENCE_THRESHOLD
                )
            
            return decision
            
        except Exception as e:
            current_app.logger.error(f"[Coach] Classification error: {e}")
            metrics.log_parse_error(
                session_id=session_id,
                error=str(e),
                response_preview=str(e)[:200]
            )
            return CoachDecision(
                should_intervene=False,
                state_patch={},
                one_shot_line=None,
                reasoning=f"Error: {str(e)[:50]}",
                confidence=0.0
            )
    
    def _build_classification_prompt(
        self, user_message: str, history: List[Dict], persona: Dict, context: Dict
    ) -> str:
        """Build classification prompt requesting structured JSON"""
        
        recent = history[-4:] if len(history) > 4 else history
        conversation = "\n".join([
            f"{turn.get('role', 'user')}: {turn.get('content', '')}" 
            for turn in recent
        ])
        
        # Detect question direction and type
        user_is_asking = self._detect_question_direction(user_message)
        question_type = self._detect_question_type(user_message)
        question_context = ""
        
        if user_is_asking:
            if question_type == 'open':
                question_context = """
IMPORTANT - USER ASKED AN OPEN-ENDED QUESTION:
The user asked a discovery/exploratory question. The prospect should:
- ANSWER with 2-3 sentences of detail
- Share relevant context and specifics
- NOT ask the same question back
- Set max_sentences to 3-4 in state_patch
"""
            elif question_type == 'closed':
                question_context = """
IMPORTANT - USER ASKED A CLOSED QUESTION:
The user asked a yes/no or simple factual question. The prospect should:
- ANSWER briefly and directly (1 sentence)
- NOT over-explain or ramble
- NOT ask the same question back
- Set max_sentences to 1-2 in state_patch
"""
            else:
                question_context = """
IMPORTANT - USER IS ASKING A QUESTION:
The user is asking the prospect a question. The prospect should:
- ANSWER the question, not ask it back
- NOT echo the user's question back to them
- Wait for user to finish if message seems incomplete
"""
        
        return f"""You are a sales training coach. Classify whether to PERSIST or INTERVENE.

User's latest message: "{user_message}"
{question_context}
Recent conversation:
{conversation}

Prospect: {persona.get('name', 'Unknown')} - {persona.get('role', 'Unknown')}
Concern: {persona.get('primary_concern', 'Unknown')}

PERSIST if: conversation flowing naturally, user learning organically
INTERVENE if: user struggling/coasting, conversation off-track

CRITICAL RULES:
- If user's message is incomplete/cut-off, set hard_constraint "wait_for_complete_thought"
- If user is asking a question, prospect must ANSWER it, never ask the same question back
- If user seems confused, keep response SHORT (max_sentences: 1-2)

Output JSON ONLY:
{{
  "decision": "persist" or "intervene",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "question_direction": "user_asking" or "user_answering" or "neutral",
  "state_patch": {{
    "pressure_level": {{"value": 0.5, "ttl_turns": 4}},
    "active_objection": {{"value": "price", "ttl_turns": 3}},
    "hard_constraints": [{{"action": "add", "value": "wait_for_complete_thought", "ttl_turns": 1}}],
    "max_sentences": {{"value": 2, "ttl_turns": 4}}
  }},
  "one_shot_line": "Before we talk numbers, tell me what you're replacing."
}}

ONLY include state_patch keys if changing them. one_shot_line is optional."""
    
    def _parse_decision(self, response: str) -> CoachDecision:
        """Parse and validate JSON response into structured decision"""
        try:
            # Try multiple extraction strategies
            data = self._extract_json(response)
            
            # Validate and sanitize with schema
            validated = validate_coach_response(data)
            
            current_app.logger.debug(f"[Coach] Validated decision: {validated['decision']}")
            
            return CoachDecision(
                should_intervene=(validated['decision'] == 'intervene'),
                state_patch=validated['state_patch'],
                one_shot_line=validated.get('one_shot_line'),
                reasoning=validated['reasoning'],
                confidence=validated['confidence']
            )
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            current_app.logger.warning(
                f"[Coach] Parse error: {e.__class__.__name__}: {str(e)}\n"
                f"Response preview: {response[:200]}"
            )
            # Safe fallback
            return CoachDecision(
                should_intervene=False,
                state_patch={},
                one_shot_line=None,
                reasoning=f"Parse error: {str(e)[:50]}",
                confidence=0.0
            )
    
    def _detect_question_direction(self, message: str) -> bool:
        """Detect if user is asking a question (vs answering or neutral)"""
        message_lower = message.lower().strip()
        
        # Question indicators
        question_starters = [
            'what', 'how', 'why', 'when', 'where', 'who', 'which',
            'can you', 'could you', 'would you', 'do you', 'are you',
            'is there', 'have you', 'tell me about', 'i was wondering',
            'i\'m curious', 'wondering about', 'asking about'
        ]
        
        # Check for question mark
        if '?' in message:
            return True
        
        # Check for question starters
        for starter in question_starters:
            if message_lower.startswith(starter) or f' {starter}' in message_lower:
                return True
        
        # Check for incomplete question patterns (cut off mid-sentence)
        incomplete_patterns = [
            'about your', 'wondering about', 'curious about',
            'tell me', 'what about', 'how about'
        ]
        for pattern in incomplete_patterns:
            if message_lower.endswith(pattern) or message_lower.endswith(pattern + ','):
                return True
        
        return False
    
    def _detect_question_type(self, message: str) -> str:
        """Detect if question is open-ended or closed (yes/no)
        Returns: 'open', 'closed', or 'none'
        """
        message_lower = message.lower().strip()
        
        # Not a question at all
        if not self._detect_question_direction(message):
            return 'none'
        
        # Open-ended indicators (expect detailed response)
        open_patterns = [
            'tell me about', 'describe', 'explain', 'walk me through',
            'what do you think', 'how do you', 'how does', 'how would',
            'why do', 'why would', 'why is', 'what are', 'what is your',
            'what\'s your', 'how are you handling', 'what challenges',
            'what problems', 'what concerns', 'what would', 'what if',
            'in what way', 'to what extent', 'how might'
        ]
        
        for pattern in open_patterns:
            if pattern in message_lower:
                return 'open'
        
        # Closed indicators (expect short yes/no or brief response)
        closed_patterns = [
            'do you have', 'are you', 'is there', 'is it', 'is your',
            'can you', 'could you', 'would you', 'will you', 'did you',
            'have you', 'has your', 'does your', 'do you use',
            'is that', 'are there', 'was it', 'were you'
        ]
        
        for pattern in closed_patterns:
            if message_lower.startswith(pattern):
                return 'closed'
        
        # Default: if it has a question mark but no clear pattern, lean open
        if '?' in message:
            # Short questions are usually closed
            word_count = len(message.split())
            if word_count <= 5:
                return 'closed'
            return 'open'
        
        return 'none'
    
    def _extract_json(self, response: str) -> Dict:
        """Extract JSON with multiple fallback strategies"""
        # Strategy 1: Find JSON in markdown code block
        code_block_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', response, re.DOTALL)
        if code_block_match:
            try:
                return json.loads(code_block_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Strategy 2: Bracket matching for nested JSON
        start_idx = response.find('{')
        if start_idx != -1:
            depth = 0
            end_idx = start_idx
            for i, char in enumerate(response[start_idx:], start_idx):
                if char == '{':
                    depth += 1
                elif char == '}':
                    depth -= 1
                    if depth == 0:
                        end_idx = i + 1
                        break
            
            if depth == 0:
                try:
                    return json.loads(response[start_idx:end_idx])
                except json.JSONDecodeError:
                    pass
        
        # Strategy 3: Try parsing entire response
        return json.loads(response.strip())

