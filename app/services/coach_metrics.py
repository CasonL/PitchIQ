"""
Coach Metrics - Observability and Decision Tracking
Structured logging for debugging and analytics
"""
from typing import Dict, Optional
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)


class CoachMetrics:
    """Track Coach decisions and state changes for observability"""
    
    MAX_LOG_SIZE = 1000  # Prevent unbounded memory growth
    
    def __init__(self):
        self.decisions_log = []
        self.state_changes_log = []
    
    def _trim_logs(self):
        """Trim logs to prevent memory leak"""
        if len(self.decisions_log) > self.MAX_LOG_SIZE:
            self.decisions_log = self.decisions_log[-self.MAX_LOG_SIZE:]
        if len(self.state_changes_log) > self.MAX_LOG_SIZE:
            self.state_changes_log = self.state_changes_log[-self.MAX_LOG_SIZE:]
    
    def log_decision(
        self,
        session_id: str,
        decision: Dict,
        user_message: str,
        turn: int,
        latency_ms: float = None
    ):
        """Log Coach classification decision with context"""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'session_id': session_id,
            'turn': turn,
            'decision': decision.get('should_intervene'),
            'confidence': decision.get('confidence'),
            'strategy': self._extract_strategy(decision.get('state_patch', {})),
            'reasoning': decision.get('reasoning', '')[:100],  # Truncate
            'user_message_preview': user_message[:50],
            'latency_ms': latency_ms
        }
        
        self.decisions_log.append(entry)
        self._trim_logs()
        
        # Structured log for easy parsing
        logger.info(
            f"[CoachDecision] session={session_id} turn={turn} "
            f"intervene={entry['decision']} confidence={entry['confidence']:.2f} "
            f"strategy={entry['strategy']} latency={latency_ms}ms"
        )
        
        # Detailed debug log
        logger.debug(f"[CoachDecision] Full context: {json.dumps(entry, indent=2)}")
    
    def log_state_change(
        self,
        session_id: str,
        turn: int,
        before: Dict,
        after: Dict
    ):
        """Log state changes for debugging drift"""
        changes = self._diff_state(before, after)
        
        if not changes:
            return
        
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'session_id': session_id,
            'turn': turn,
            'changes': changes
        }
        
        self.state_changes_log.append(entry)
        self._trim_logs()
        
        logger.info(
            f"[StateChange] session={session_id} turn={turn} "
            f"changes={list(changes.keys())}"
        )
        logger.debug(f"[StateChange] Details: {json.dumps(changes, indent=2)}")
    
    def log_intervention_applied(
        self,
        session_id: str,
        turn: int,
        state_patch: Dict,
        one_shot_line: Optional[str]
    ):
        """Log when intervention is actually applied to prospect"""
        logger.info(
            f"[Intervention] session={session_id} turn={turn} "
            f"patch_keys={list(state_patch.keys())} "
            f"has_one_shot={one_shot_line is not None}"
        )
        
        # Log specific state values for debugging
        if state_patch:
            for key, value_dict in state_patch.items():
                if isinstance(value_dict, dict) and 'value' in value_dict:
                    logger.debug(
                        f"[Intervention] {key}={value_dict['value']} "
                        f"ttl={value_dict.get('ttl_turns', 'N/A')}"
                    )
    
    def log_low_confidence_warning(
        self,
        session_id: str,
        confidence: float,
        threshold: float
    ):
        """Warn when Coach has low confidence in decision"""
        logger.warning(
            f"[CoachWarning] session={session_id} "
            f"Low confidence decision: {confidence:.2f} < {threshold}"
        )
    
    def log_parse_error(
        self,
        session_id: str,
        error: str,
        response_preview: str
    ):
        """Log parsing failures for investigation"""
        logger.error(
            f"[CoachError] session={session_id} "
            f"Parse failed: {error}\n"
            f"Response: {response_preview[:200]}"
        )
    
    def get_session_summary(self, session_id: str) -> Dict:
        """Get summary of Coach activity for a session"""
        session_decisions = [d for d in self.decisions_log if d['session_id'] == session_id]
        
        if not session_decisions:
            return {'session_id': session_id, 'total_decisions': 0}
        
        interventions = [d for d in session_decisions if d['decision']]
        
        return {
            'session_id': session_id,
            'total_decisions': len(session_decisions),
            'interventions_count': len(interventions),
            'intervention_rate': len(interventions) / len(session_decisions),
            'avg_confidence': sum(d['confidence'] for d in session_decisions) / len(session_decisions),
            'strategies_used': list(set(d['strategy'] for d in interventions if d['strategy'])),
            'avg_latency_ms': self._avg([d['latency_ms'] for d in session_decisions if d['latency_ms']])
        }
    
    def _extract_strategy(self, state_patch: Dict) -> Optional[str]:
        """Infer strategy from state patch"""
        if not state_patch:
            return None
        
        # Determine primary strategy from what was changed
        if 'pressure_level' in state_patch:
            return 'difficulty_control'
        elif 'active_objection' in state_patch:
            return 'objection_injection'
        elif 'hard_constraints' in state_patch:
            return 'constraint_enforcement'
        elif 'max_sentences' in state_patch:
            return 'pacing_control'
        
        return 'mixed'
    
    def _diff_state(self, before: Dict, after: Dict) -> Dict:
        """Calculate diff between state snapshots"""
        changes = {}
        
        all_keys = set(before.keys()) | set(after.keys())
        
        for key in all_keys:
            before_val = before.get(key)
            after_val = after.get(key)
            
            if before_val != after_val:
                changes[key] = {
                    'before': before_val,
                    'after': after_val
                }
        
        return changes
    
    def _avg(self, values: list) -> Optional[float]:
        """Safe average calculation"""
        if not values:
            return None
        return sum(values) / len(values)


# Global metrics instance
_metrics = CoachMetrics()


def get_metrics() -> CoachMetrics:
    """Get global metrics instance"""
    return _metrics
