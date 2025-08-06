"""
Contextual Fear Generation System

This system generates realistic, product-specific fears and objections that can't be hardcoded.
It analyzes the product/service context and generates authentic human concerns.
"""

import random
import time
from typing import Dict, List, Optional, Tuple
import re
from collections import defaultdict

class ContextualFearGenerator:
    """
    Generates realistic fears and objections based on product/service context,
    personal situation, and industry trends.
    
    Uses anti-bias selection to ensure diverse, non-repetitive fear generation.
    """
    
    # Track fear usage to prevent repetitive patterns
    _fear_usage_history = defaultdict(int)
    _manifestation_history = []
    _max_history = 100
    
    # Core fear categories that combine with context
    FEAR_ARCHETYPES = {
        "job_security": {
            "core_fear": "This will replace me or make me obsolete",
            "triggers": ["AI", "automation", "efficiency", "streamline", "optimize", "replace", "eliminate"],
            "manifestations": [
                "Will this take my job?",
                "Are you trying to replace {role} with technology?",
                "How do I know this won't make me redundant?",
                "What happens to {role}s when this is fully implemented?",
                "Is this just a way to reduce headcount?"
            ]
        },
        "competence_threat": {
            "core_fear": "This will expose my incompetence or make me look bad",
            "triggers": ["training", "coaching", "improvement", "performance", "skills", "development", "reps"],
            "manifestations": [
                "What if this shows I'm not good at {role}?",
                "Will this track everything I do wrong?",
                "How do I know this won't make me look incompetent?",
                "What if my {boss_title} sees the results?",
                "Is this going to monitor my performance?",
                "How does {technology} train them better than I can?"
            ]
        },
        "change_resistance": {
            "core_fear": "This will disrupt my comfortable routine",
            "triggers": ["new", "change", "different", "improve", "upgrade", "modernize"],
            "manifestations": [
                "We've always done {current_process} and it works fine",
                "Why fix something that isn't broken?",
                "How much time will this take to learn?",
                "Will this complicate our current process?",
                "Do we really need to change everything?"
            ]
        },
        "trust_deficit": {
            "core_fear": "This technology/company can't be trusted",
            "triggers": ["AI", "data", "cloud", "software", "technology", "startup"],
            "manifestations": [
                "How do I know {product} actually works?",
                "What if your company goes out of business?",
                "Can I trust {technology} with sensitive information?",
                "How do I know this isn't just hype?",
                "What if the technology fails when I need it most?"
            ]
        },
        "ai_fear": {
            "core_fear": "AI is dangerous and unpredictable",
            "triggers": ["AI", "artificial intelligence", "roleplay", "scenarios", "machine learning"],
            "manifestations": [
                "Wait, we don't like {technology} here",
                "{technology}? That's scary stuff!",
                "How much do you rely on {technology}?",
                "But it's {technology}. How does it work?",
                "One minute it's copying art, the next it's taking my job",
                "I don't trust {technology} with training our people"
            ]
        },
        "safety_liability": {
            "core_fear": "This is physically dangerous and legally risky",
            "triggers": ["skydiving", "extreme", "dangerous", "risk", "trauma", "physical", "injury", "accident"],
            "manifestations": [
                "Wait... you want me to throw my team out of airplanes?!",
                "What if someone gets hurt or dies?",
                "Our insurance will never cover this",
                "This sounds like a lawsuit waiting to happen",
                "What if the parachute doesn't open?",
                "How do I explain to HR that I sent people jumping out of planes?",
                "Who's liable if there's an accident?",
                "This is team building, not a death wish!"
            ]
        },
        "employee_resistance": {
            "core_fear": "My team will refuse or be traumatized by this",
            "triggers": ["teams", "participate", "trauma", "extreme", "fear", "heights", "phobia"],
            "manifestations": [
                "Half my team is afraid of heights",
                "What if people refuse to participate?",
                "This will traumatize people, not bond them",
                "Some people have medical conditions",
                "What if someone has a panic attack?",
                "You can't force employees to do extreme sports",
                "This is going to cause more trauma than bonding"
            ]
        },
        "reputation_risk": {
            "core_fear": "This makes me look reckless and unprofessional",
            "triggers": ["extreme", "unusual", "unconventional", "risky", "dangerous", "trauma"],
            "manifestations": [
                "How do I explain this to the board?",
                "What will upper management think?",
                "This doesn't sound like serious business",
                "What if this gets in the news?",
                "How do I justify this to shareholders?",
                "This makes us look like we're not serious",
                "What kind of company sends employees skydiving?"
            ]
        },
        "social_judgment": {
            "core_fear": "Others will judge me negatively for this decision",
            "triggers": ["team", "colleagues", "peers", "industry", "reputation"],
            "manifestations": [
                "What will my team think about this?",
                "Will {industry} peers see this as legitimate?",
                "How do I explain this to {stakeholder_group}?",
                "Is this going to make us look desperate?",
                "What if this doesn't work and I recommended it?"
            ]
        },
        "complexity_overwhelm": {
            "core_fear": "This is too complex for me to handle",
            "triggers": ["system", "platform", "integration", "setup", "implementation"],
            "manifestations": [
                "This sounds too complicated for our team",
                "How long does implementation take?",
                "Do we need technical expertise we don't have?",
                "What if we can't figure out how to use it?",
                "Will this require a lot of training?"
            ]
        },
        "financial_risk": {
            "core_fear": "This will waste money or hurt financially",
            "triggers": ["cost", "price", "investment", "budget", "ROI", "expensive"],
            "manifestations": [
                "What if this doesn't deliver the ROI you promise?",
                "How do I justify this cost to {budget_holder}?",
                "What if we invest in this and it doesn't work?",
                "Is this just an expensive experiment?",
                "Can we afford this if it doesn't pay off?"
            ]
        }
    }
    
    # Context-specific fear modifiers
    INDUSTRY_FEAR_MODIFIERS = {
        "sales": {
            "specific_concerns": ["quota pressure", "commission impact", "territory changes", "CRM adoption"],
            "stakeholders": ["sales reps", "sales managers", "VPs of Sales", "revenue teams"],
            "current_processes": ["manual prospecting", "traditional training", "in-person coaching"]
        },
        "healthcare": {
            "specific_concerns": ["patient safety", "compliance", "HIPAA", "liability"],
            "stakeholders": ["patients", "doctors", "nurses", "administrators"],
            "current_processes": ["manual documentation", "traditional protocols", "paper records"]
        },
        "technology": {
            "specific_concerns": ["security", "scalability", "integration", "downtime"],
            "stakeholders": ["developers", "IT teams", "CTOs", "users"],
            "current_processes": ["legacy systems", "manual deployment", "traditional workflows"]
        }
    }
    
    # Personal situation modifiers
    PERSONAL_SITUATION_MODIFIERS = {
        "new_parent": {
            "stress_amplifiers": ["time pressure", "exhaustion", "competing priorities"],
            "decision_factors": ["simplicity", "reliability", "low maintenance"],
            "communication_style": "tired, seeking simple solutions, easily overwhelmed"
        },
        "new_role": {
            "stress_amplifiers": ["proving competence", "learning curve", "imposter syndrome"],
            "decision_factors": ["quick wins", "credibility building", "risk aversion"],
            "communication_style": "cautious, seeking validation, risk-averse"
        },
        "under_pressure": {
            "stress_amplifiers": ["deadline pressure", "performance scrutiny", "resource constraints"],
            "decision_factors": ["immediate results", "proven solutions", "minimal risk"],
            "communication_style": "urgent, results-focused, impatient"
        }
    }
    
    @classmethod
    def _anti_bias_fear_selection(cls, fear_type: str, manifestations: List[str], recent_count: int = 20) -> str:
        """
        Select fear manifestation while avoiding recently used options to prevent repetitive patterns.
        """
        # Get recent manifestations for this fear type
        recent_manifestations = [
            entry for entry in cls._manifestation_history[-recent_count:]
            if entry.get("fear_type") == fear_type
        ]
        recent_texts = [entry["manifestation"] for entry in recent_manifestations]
        
        # Prefer manifestations that haven't been used recently
        available_manifestations = [m for m in manifestations if m not in recent_texts]
        
        # If all manifestations have been used recently, use the least recently used
        if not available_manifestations:
            available_manifestations = manifestations
        
        # Add randomness with time-based seed to ensure variety
        random.seed(int(time.time() * 1000) % 10000)
        selected = random.choice(available_manifestations)
        
        # Record this selection
        cls._manifestation_history.append({
            "fear_type": fear_type,
            "manifestation": selected,
            "timestamp": time.time()
        })
        
        # Keep history manageable
        if len(cls._manifestation_history) > cls._max_history:
            cls._manifestation_history = cls._manifestation_history[-cls._max_history:]
        
        return selected
    
    @classmethod
    def _weighted_fear_selection(cls, fear_scores: Dict[str, float]) -> List[str]:
        """
        Select fears using weighted probabilities and anti-bias logic.
        """
        # Filter fears with significant trigger strength
        significant_fears = {k: v for k, v in fear_scores.items() if v > 0.3}
        
        if not significant_fears:
            # Fallback to top fears if none are significant
            sorted_fears = sorted(fear_scores.items(), key=lambda x: x[1], reverse=True)
            significant_fears = dict(sorted_fears[:3])
        
        # Apply anti-bias weighting (reduce weight for recently used fears)
        adjusted_fears = {}
        for fear_type, score in significant_fears.items():
            recent_usage = cls._fear_usage_history.get(fear_type, 0)
            # Reduce weight for frequently used fears
            bias_penalty = min(0.5, recent_usage * 0.1)
            adjusted_score = max(0.1, score - bias_penalty)
            adjusted_fears[fear_type] = adjusted_score
        
        # Select 2-3 fears using weighted selection
        selected_fears = []
        fear_types = list(adjusted_fears.keys())
        weights = list(adjusted_fears.values())
        
        # Use time-based randomization
        random.seed(int(time.time() * 1000) % 10000)
        
        # Select primary fear
        if fear_types:
            primary_fear = random.choices(fear_types, weights=weights, k=1)[0]
            selected_fears.append(primary_fear)
            cls._fear_usage_history[primary_fear] += 1
            
            # Remove selected fear for secondary selection
            remaining_fears = [(f, w) for f, w in zip(fear_types, weights) if f != primary_fear]
            
            # Select secondary fear if available
            if remaining_fears and random.random() > 0.3:  # 70% chance of secondary fear
                secondary_types, secondary_weights = zip(*remaining_fears)
                secondary_fear = random.choices(secondary_types, weights=secondary_weights, k=1)[0]
                selected_fears.append(secondary_fear)
                cls._fear_usage_history[secondary_fear] += 1
        
        return selected_fears
    
    @classmethod
    def generate_contextual_fears(cls, 
                                product_service: str,
                                persona_context: Dict[str, any],
                                personal_situation: Optional[str] = None) -> Dict[str, any]:
        """
        Generate realistic, contextual fears based on product and persona context.
        Uses anti-bias selection to ensure diverse, non-repetitive fears.
        """
        
        # Analyze product for fear triggers
        fear_triggers = cls._identify_fear_triggers(product_service)
        
        # Use weighted, anti-bias selection to choose diverse fears
        selected_fear_types = cls._weighted_fear_selection(fear_triggers)
        
        # Generate contextual fears using anti-bias manifestation selection
        contextual_fears = []
        for fear_type in selected_fear_types:
            fear_data = cls.FEAR_ARCHETYPES[fear_type]
            contextual_fear = cls._generate_specific_fear(
                fear_data, 
                product_service, 
                persona_context,
                fear_type  # Pass fear_type for anti-bias tracking
            )
            contextual_fears.append({
                "fear_type": fear_type,
                "fear_statement": contextual_fear,
                "core_concern": fear_data["core_fear"],
                "trigger_strength": fear_triggers.get(fear_type, 0.0)
            })
        
        # Generate authentic objections
        authentic_objections = cls._generate_authentic_objections(
            contextual_fears, 
            persona_context,
            personal_situation
        )
        
        return {
            "contextual_fears": contextual_fears,
            "authentic_objections": authentic_objections
        }
    
    @classmethod
    def _identify_fear_triggers(cls, product_service: str) -> Dict[str, float]:
        """Analyze product description to identify fear triggers."""
        product_lower = product_service.lower()
        fear_scores = {}
        
        for fear_type, fear_data in cls.FEAR_ARCHETYPES.items():
            trigger_score = 0.0
            triggers = fear_data["triggers"]
            
            for trigger in triggers:
                if trigger in product_lower:
                    trigger_score += 0.4
                    
                # Check for related terms
                if trigger == "AI" and any(term in product_lower for term in ["artificial intelligence", "machine learning", "automated"]):
                    trigger_score += 0.3
            
            fear_scores[fear_type] = min(1.0, trigger_score)
        
        return fear_scores
    
    @classmethod
    def _generate_specific_fear(cls, 
                              fear_data: Dict[str, any], 
                              product_service: str, 
                              persona_context: Dict[str, any],
                              fear_type: str) -> str:
        """Generate a specific fear statement based on context using anti-bias selection."""
        
        manifestations = fear_data["manifestations"]
        # Use anti-bias selection instead of random.choice
        chosen_manifestation = cls._anti_bias_fear_selection(fear_type, manifestations)
        
        # Replace placeholders with context-specific terms
        replacements = {
            "role": persona_context.get("role", "position"),
            "product": cls._extract_product_name(product_service),
            "technology": cls._extract_technology_type(product_service),
            "boss_title": cls._get_boss_title(persona_context)
        }
        
        # Apply replacements
        for placeholder, replacement in replacements.items():
            pattern = "{" + placeholder + "}"
            chosen_manifestation = chosen_manifestation.replace(pattern, replacement)
        
        return chosen_manifestation
    
    @classmethod
    def _extract_product_name(cls, product_service: str) -> str:
        """Extract or infer product name from description."""
        if "PitchIQ" in product_service:
            return "PitchIQ"
        elif "AI" in product_service.upper():
            return "this AI system"
        elif "software" in product_service.lower():
            return "this software"
        else:
            return "this solution"
    
    @classmethod
    def _extract_technology_type(cls, product_service: str) -> str:
        """Extract technology type from product description."""
        product_lower = product_service.lower()
        
        if "AI" in product_service.upper() or "artificial intelligence" in product_lower:
            return "AI"
        elif "automation" in product_lower:
            return "automation"
        else:
            return "technology"
    
    @classmethod
    def _get_boss_title(cls, persona_context: Dict[str, any]) -> str:
        """Get appropriate boss title based on persona role."""
        role = persona_context.get("role", "").lower()
        
        if "manager" in role:
            return "director"
        elif "director" in role:
            return "VP"
        else:
            return "boss"
    
    @classmethod
    def _generate_authentic_objections(cls,
                                     contextual_fears: List[Dict],
                                     persona_context: Dict[str, any],
                                     personal_situation: Optional[str]) -> List[str]:
        """Generate authentic objections that sound human, not robotic."""
        
        objections = []
        
        for fear in contextual_fears[:2]:  # Top 2 fears
            base_objection = fear["fear_statement"]
            
            # Add human hesitation and uncertainty
            human_objections = [
                f"Wait... {base_objection}",
                f"But {base_objection.lower()}",
                f"How do I know {base_objection.lower()}?"
            ]
            
            # Add personal situation context
            if personal_situation == "new_parent":
                human_objections.extend([
                    f"Look, I'm exhausted. {base_objection}",
                    f"I don't have time for complications. {base_objection}"
                ])
            
            # Use time-based randomization for objection selection
            random.seed(int(time.time() * 1000) % 10000)
            objections.append(random.choice(human_objections))
        
        return objections
    
    @classmethod
    def get_fear_generation_report(cls) -> Dict[str, any]:
        """Get report on fear generation patterns to monitor for bias."""
        
        # Analyze fear type usage
        total_generations = sum(cls._fear_usage_history.values())
        fear_distribution = {}
        
        if total_generations > 0:
            for fear_type, count in cls._fear_usage_history.items():
                fear_distribution[fear_type] = {
                    "count": count,
                    "percentage": round((count / total_generations) * 100, 2)
                }
        
        # Analyze recent manifestation diversity
        recent_manifestations = cls._manifestation_history[-50:]  # Last 50
        manifestation_diversity = len(set(m["manifestation"] for m in recent_manifestations))
        
        return {
            "total_fear_generations": total_generations,
            "fear_type_distribution": fear_distribution,
            "recent_manifestation_diversity": manifestation_diversity,
            "total_unique_manifestations": len(cls._manifestation_history),
            "bias_prevention_active": True
        }
    
    @classmethod
    def reset_fear_history(cls):
        """Reset fear generation history (useful for testing)."""
        cls._fear_usage_history.clear()
        cls._manifestation_history.clear()
    
    @classmethod
    def generate_conversation_flow_guidance(cls, 
                                          contextual_fears: List[Dict],
                                          persona_context: Dict[str, any]) -> Dict[str, any]:
        """
        Generate guidance for natural human conversation progression.
        Prevents AI from getting stuck in loops or robot behavior.
        """
        
        fear_types = [fear["fear_type"] for fear in contextual_fears]
        
        # Define natural progression patterns based on fear types
        conversation_flow = {
            "initial_concerns": [],
            "follow_up_patterns": [],
            "information_seeking": [],
            "decision_progression": []
        }
        
        # Safety/liability fears progression
        if "safety_liability" in fear_types:
            conversation_flow["initial_concerns"].append("Physical safety of team members")
            conversation_flow["follow_up_patterns"].extend([
                "After safety reassurance → Ask about team member concerns",
                "After statistics → Ask about practical opt-out options",
                "After insurance info → Ask about medical conditions/phobias"
            ])
            conversation_flow["information_seeking"].extend([
                "What's the actual experience like?",
                "How do other companies handle people who can't participate?",
                "What kind of support do you provide for scared team members?"
            ])
        
        # Employee resistance fears progression  
        if "employee_resistance" in fear_types:
            conversation_flow["initial_concerns"].append("Team member comfort and participation")
            conversation_flow["follow_up_patterns"].extend([
                "After participation concerns → Ask about alternative bonding activities",
                "After trauma concerns → Ask about psychological support",
                "After medical concerns → Ask about accommodation options"
            ])
            conversation_flow["information_seeking"].extend([
                "Do you have alternative activities for people who can't jump?",
                "How do you handle team members with phobias?",
                "What's the backup plan if half the team opts out?"
            ])
        
        # Reputation risk fears progression
        if "reputation_risk" in fear_types:
            conversation_flow["initial_concerns"].append("Professional image and stakeholder perception")
            conversation_flow["follow_up_patterns"].extend([
                "After reputation concerns → Ask about business justification",
                "After board concerns → Ask about ROI and outcomes",
                "After image concerns → Ask about professional framing"
            ])
            conversation_flow["information_seeking"].extend([
                "How do I present this professionally to leadership?",
                "What business outcomes do other companies see?",
                "How do you frame this as a legitimate business investment?"
            ])
        
        # AI/competence fears progression
        if any(fear_type in fear_types for fear_type in ["ai_fear", "competence_threat"]):
            conversation_flow["follow_up_patterns"].extend([
                "After AI concerns → Ask about human oversight and control",
                "After job security → Ask about augmentation vs replacement",
                "After competence → Ask about learning and development support"
            ])
        
        # Natural decision progression
        conversation_flow["decision_progression"] = [
            "Initial resistance → Information gathering → Conditional interest → Practical questions → Gradual buy-in"
        ]
        
        return conversation_flow
    
    @classmethod
    def create_conversation_guidance_prompt(cls, 
                                          contextual_fears: List[Dict],
                                          persona_context: Dict[str, any]) -> str:
        """Create specific prompt guidance for natural conversation flow."""
        
        flow_guidance = cls.generate_conversation_flow_guidance(contextual_fears, persona_context)
        
        guidance = f"""
NATURAL HUMAN CONVERSATION FLOW GUIDANCE:

**AUTHENTIC RESPONSE PATTERNS:**
When the sales rep addresses your concerns, respond like a real human:

1. **ACKNOWLEDGE THEIR RESPONSE:** 
   - "Okay, that does help..." / "I see what you're saying..." / "That's reassuring..."

2. **TRANSITION TO RELATED CONCERNS:**
   - "But I'm still worried about..." / "What about..." / "I'm also concerned that..."

3. **ASK PRACTICAL FOLLOW-UPS:**
   - Focus on implementation details, not repeating the same fear
   - Ask about specific scenarios that worry you
   - Seek concrete solutions to remaining concerns

**YOUR NATURAL CONCERN PROGRESSION:**
{chr(10).join([f"- {concern}" for concern in flow_guidance["initial_concerns"]])}

**FOLLOW-UP PATTERNS TO USE:**
{chr(10).join([f"- {pattern}" for pattern in flow_guidance["follow_up_patterns"]])}

**INFORMATION-SEEKING QUESTIONS:**
{chr(10).join([f"- {question}" for question in flow_guidance["information_seeking"]])}

**DECISION PROGRESSION:**
{flow_guidance["decision_progression"][0] if flow_guidance["decision_progression"] else "Natural human progression from concern to interest"}

**ABSOLUTELY AVOID (Robot Behavior):**
- Repeating the same objection after it's been addressed
- Arguing with statistics ("But the 1% chance still...")
- Instant compliance ("Okay, sounds great!")
- Endless new objections without progression
- Academic analysis instead of emotional responses

**AUTHENTIC HUMAN EXAMPLE:**
Rep: "You're safer skydiving than driving, plus backup parachutes"
You: "Okay... *sigh* that does make me feel better about the safety part. But honestly, I'm still concerned about my team. I have people who are genuinely terrified of heights. What happens if someone just can't do it? Do we force them?"

This shows: Processing information → Natural concern transition → Practical follow-up
"""
        
        return guidance 