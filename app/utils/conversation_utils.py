import re
import math
from typing import List, Dict, Any

def analyze_conversation_flow(conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
    """Analyze the conversation flow and provide insights."""
    if not conversation_history:
        return {}
        
    analysis = {
        "total_messages": len(conversation_history),
        "user_message_count": 0,
        "ai_message_count": 0,
        "question_count": 0,
        "average_response_length": 0,
        "topics": set(),
        "phase_suggestions": []
    }
    
    # Track message statistics
    total_length = 0
    for msg in conversation_history:
        role = msg.get('role', '')
        content = str(msg.get('content', ''))
        
        if role == 'user':
            analysis["user_message_count"] += 1
        elif role == 'assistant':
            analysis["ai_message_count"] += 1
            if '?' in content:
                analysis["question_count"] += 1
                
        total_length += len(content.split())
        
        # Simple topic extraction
        content_lower = content.lower()
        if 'business' in content_lower:
            analysis["topics"].add('business')
        if 'product' in content_lower or 'service' in content_lower:
            analysis["topics"].add('product')
        if 'price' in content_lower or 'cost' in content_lower:
            analysis["topics"].add('pricing')
            
    # Calculate averages
    if analysis["ai_message_count"] > 0:
        analysis["average_response_length"] = total_length / analysis["ai_message_count"]
        
    # Generate phase suggestions
    if analysis["user_message_count"] < 2:
        analysis["phase_suggestions"].append("Continue building rapport")
    elif 'business' not in analysis["topics"]:
        analysis["phase_suggestions"].append("Consider transitioning to business topics")
        
    # Convert set to list for JSON serialization
    analysis["topics"] = list(analysis["topics"])
        
    return analysis

def calculate_question_density(message: str) -> float:
    """Calculate the question density in a message."""
    if not message:
        return 0.0
        
    sentences = [s for s in re.split(r'[.!?]+', message) if s.strip()]
    if not sentences:
        return 0.0
        
    question_count = sum(1 for s in sentences if s.strip().endswith('?'))
    return question_count / len(sentences)

def should_transition_to_business(conversation_history: List[Dict[str, str]]) -> bool:
    """Determine if the conversation should transition to business topics."""
    if len(conversation_history) < 2:
        return False
        
    # Check last few messages for business context
    business_keywords = {'business', 'company', 'solution', 'product', 'service', 'need', 'looking for', 'help with', 'tell me about'}
    last_messages = ' '.join([str(m.get('content', '')) for m in conversation_history[-2:]])
    
    return any(keyword in last_messages.lower() for keyword in business_keywords)

# ----------------- New lightweight helpers -----------------
PERSONAL_Q_RE = re.compile(r"(how (are|have).*|how.?s.*(day|weekend)|family|hobby|vacation|morning|afternoon)", re.I)

def is_personal_question(text: str) -> bool:
    """Detect common small-talk questions."""
    if not text:
        return False
    return bool(PERSONAL_Q_RE.search(text))

def passion_trigger(user_msg: str, passions: List[str]) -> bool:
    """Return True if user mentions one of the persona passions."""
    if not user_msg or not passions:
        return False
    msg_lower = user_msg.lower()
    return any(p.lower() in msg_lower for p in passions)

def allow_reciprocation(candidate_resp: str, history: List[Dict[str, str]]) -> bool:
    """Allow a short reciprocating question if the previous user line was personal."""
    if not candidate_resp or '?' not in candidate_resp:
        return False
    if not history or history[-1].get('role') != 'user':
        return False
    if not is_personal_question(history[-1].get('content', '')):
        return False
    # Require the reciprocating question to be short (<= 6 words)
    return len(candidate_resp.split()) <= 6

def update_rapport_score(state: Dict[str, Any], salesperson_msg: str, ai_resp: str) -> None:
    """Very lightweight rapport score: +1 when salesperson engages personally and AI mirrors politely."""
    if not state:
        return
    score = state.get('rapport_score', 0)
    if is_personal_question(salesperson_msg) and is_personal_question(ai_resp):
        score += 1
    state['rapport_score'] = min(score, 5)

def cooperation_factor(score: int) -> float:
    """Map rapport score to cooperation factor (0.6-1.4)."""
    if score <= 1:
        return 0.6
    if score <= 3:
        return 1.0
    return 1.4

# --- Simple Rules Engine for Call Outcome ---
_COMMIT_PATTERNS = [
    r"\b(let's|lets) (proceed|move forward|move ahead)\b",
    r"\b(send|share) (over )?(the )?(contract|agreement)\b",
    r"\b(sign|buy|purchase)\b",
    r"\b(onboard|kick ?off)\b",
]
_FOLLOWUP_PATTERNS = [
    r"\b(follow up|circle back|touch base)\b",
    r"\b(send|email) (me )?(more )?(info|information|details)\b",
    r"\b(need|have) to (think|discuss|review)\b",
    r"\b(next week|next month|tomorrow)\b",
]
_NOFIT_PATTERNS = [
    r"\b(not interested|no thanks|will pass|not a good fit)\b",
    r"\b(already have|using another|going with someone else)\b",
]

def _match_any(message: str, patterns: List[str]) -> bool:
    msg = message.lower()
    for pat in patterns:
        if re.search(pat, msg):
            return True
    return False


def _weighted_scores(history: List[Dict[str, str]], rapport_score: int = 0):
    """Return raw scores for each outcome using multiple signals."""
    recent_msgs = [m["content"] for m in reversed(history[-6:]) if m.get("role") == "assistant"]
    commit_matches = sum(1 for msg in recent_msgs if _match_any(msg, _COMMIT_PATTERNS))
    follow_matches = sum(1 for msg in recent_msgs if _match_any(msg, _FOLLOWUP_PATTERNS))
    nofit_matches = sum(1 for msg in recent_msgs if _match_any(msg, _NOFIT_PATTERNS))
    # Base scores ensure every class has some weight
    scores = {
        "commit": 1 + commit_matches * 3 + rapport_score * 0.8,
        "follow_up": 1 + follow_matches * 3 + rapport_score * 0.5,
        "no_fit": 1 + nofit_matches * 3 + max(0, 3 - rapport_score) * 0.6,
        "undecided": 1.0,
    }
    return scores


def detect_outcome(history: List[Dict[str, str]], rapport_score: int = 0):
    """Return tuple (outcome, confidence 0-1). Confidence is gap between top and runner-up probs."""
    if not history:
        return "undecided", 0.0
    scores = _weighted_scores(history, rapport_score)
    # Softmax
    exp_scores = {k: math.exp(v) for k, v in scores.items()}
    total = sum(exp_scores.values())
    probs = {k: v / total for k, v in exp_scores.items()}
    # Sort
    sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
    top_outcome, top_prob = sorted_probs[0]
    runner_up_prob = sorted_probs[1][1]
    confidence = max(0.0, top_prob - runner_up_prob)
    # Threshold: if low confidence, mark undecided
    if top_prob < 0.4 or confidence < 0.15:
        return "undecided", confidence
    return top_outcome, confidence
