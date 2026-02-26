"""
Coach Async Planner - Strategic Flow Prompting

This is the ASYNC path for the Coach architecture.
- Runs during user speech (uses dead time)
- Handles phase transitions, traps, pressure arcs
- Uses flow prompting for strategic decisions
- Only affects FUTURE turns, never current

Strategic decisions:
- Phase transitions (rapport → discovery → tension → close)
- Trap sequencing and timing
- Pressure arc adjustments
- Objection introduction
- Learning objective alignment
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from flask import current_app
from app.services.gpt4o_service import GPT4oService
from app.services.session_state import CallPhase
import json
import logging
import time

logger = logging.getLogger(__name__)


@dataclass
class StrategicPlan:
    """Async planner's strategic output for future turns"""
    suggested_phase: Optional[str]  # Phase to transition to (if any)
    phase_confidence: float  # Confidence in phase transition
    pending_trap: Optional[str]  # Trap to set up
    pressure_adjustment: float  # -0.2 to +0.2 delta
    objection_to_introduce: Optional[str]  # Objection to raise
    reasoning: str
    facts_detected: Dict[str, str]  # Facts extracted from conversation


class CoachAsyncPlanner:
    """
    Strategic planner using flow prompting.
    Runs during user speech, affects future turns.
    """
    
    def __init__(self):
        self.gpt = GPT4oService()
    
    def plan(
        self,
        transcript_history: List[Dict],
        persona: Dict,
        current_phase: str,
        current_turn: int,
        current_facts: Dict,
        pressure_level: float = 0.5
    ) -> StrategicPlan:
        """
        Generate strategic plan for future turns.
        This can take longer - it's async.
        """
        start_time = time.time()
        
        try:
            prompt = self._build_planning_prompt(
                transcript_history, persona, current_phase,
                current_turn, current_facts, pressure_level
            )
            
            response = self.gpt.generate_response(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,  # Slightly creative for strategy
                max_tokens=500
            )
            
            plan = self._parse_plan(response)
            
            latency_ms = (time.time() - start_time) * 1000
            logger.info(f"[AsyncPlanner] Generated plan in {latency_ms:.0f}ms: "
                       f"phase={plan.suggested_phase}, trap={plan.pending_trap}")
            
            return plan
            
        except Exception as e:
            logger.error(f"[AsyncPlanner] Planning error: {e}")
            return StrategicPlan(
                suggested_phase=None,
                phase_confidence=0.0,
                pending_trap=None,
                pressure_adjustment=0.0,
                objection_to_introduce=None,
                reasoning=f"Error: {str(e)[:50]}",
                facts_detected={}
            )
    
    def _build_planning_prompt(
        self,
        history: List[Dict],
        persona: Dict,
        current_phase: str,
        current_turn: int,
        current_facts: Dict,
        pressure_level: float
    ) -> str:
        """Build strategic planning prompt"""
        
        recent = history[-6:] if len(history) > 6 else history
        conversation = "\n".join([
            f"{turn.get('role', 'user')}: {turn.get('content', '')}"
            for turn in recent
        ])
        
        facts_str = json.dumps(current_facts) if current_facts else "{}"
        
        return f"""You are a sales training strategist. Analyze this call and plan the NEXT phase.

CURRENT STATE:
- Phase: {current_phase}
- Turn: {current_turn}
- Pressure level: {pressure_level:.1f}
- Known facts: {facts_str}

PROSPECT:
- Name: {persona.get('name', 'Unknown')}
- Role: {persona.get('role', 'Unknown')}
- Primary concern: {persona.get('primary_concern', 'budget')}

RECENT CONVERSATION:
{conversation}

PHASE PROGRESSION (forward only):
rapport → discovery → presentation → tension → close

STRATEGIC QUESTIONS:
1. Should we transition to a new phase? (Only if natural and earned)
2. Should we set up a trap or objection for later?
3. Should pressure increase or decrease?
4. Are there facts to extract from what the user revealed?

Output JSON ONLY:
{{
  "suggested_phase": "discovery" or null,
  "phase_confidence": 0.0-1.0,
  "pending_trap": "price_anchor" or "competitor_mention" or "timeline_pressure" or null,
  "pressure_adjustment": -0.2 to 0.2,
  "objection_to_introduce": "budget" or "timing" or "authority" or null,
  "reasoning": "brief strategic explanation",
  "facts_detected": {{"industry": "healthcare", "budget_range": "100k+"}}
}}

Be conservative with phase transitions. Only suggest if clearly earned.
Traps should be set up 2-3 turns before springing.
Facts must be explicitly stated by user, not inferred."""
    
    def _parse_plan(self, response: str) -> StrategicPlan:
        """Parse strategic plan from LLM response"""
        try:
            # Extract JSON from response
            json_match = None
            
            # Try to find JSON block
            if '```json' in response:
                start = response.find('```json') + 7
                end = response.find('```', start)
                json_match = response[start:end].strip()
            elif '```' in response:
                start = response.find('```') + 3
                end = response.find('```', start)
                json_match = response[start:end].strip()
            elif '{' in response:
                start = response.find('{')
                end = response.rfind('}') + 1
                json_match = response[start:end]
            
            if not json_match:
                raise ValueError("No JSON found in response")
            
            data = json.loads(json_match)
            
            return StrategicPlan(
                suggested_phase=data.get('suggested_phase'),
                phase_confidence=float(data.get('phase_confidence', 0.0)),
                pending_trap=data.get('pending_trap'),
                pressure_adjustment=float(data.get('pressure_adjustment', 0.0)),
                objection_to_introduce=data.get('objection_to_introduce'),
                reasoning=data.get('reasoning', 'No reasoning provided'),
                facts_detected=data.get('facts_detected', {})
            )
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning(f"[AsyncPlanner] Parse error: {e}")
            return StrategicPlan(
                suggested_phase=None,
                phase_confidence=0.0,
                pending_trap=None,
                pressure_adjustment=0.0,
                objection_to_introduce=None,
                reasoning=f"Parse error: {str(e)[:50]}",
                facts_detected={}
            )


# Singleton instance
_planner = None

def get_async_planner() -> CoachAsyncPlanner:
    """Get singleton planner instance"""
    global _planner
    if _planner is None:
        _planner = CoachAsyncPlanner()
    return _planner
