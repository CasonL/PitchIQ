"""
Personality Trait System for Personas

This module provides a system for generating core + supporting personality traits
that make personas more nuanced and realistic.
"""

import random
from typing import Dict, Tuple, List

# Core personality traits (dominant behavior - 70%)
CORE_TRAITS = [
    "Analytical", "Enthusiastic", "Cautious", "Direct", "Empathetic", 
    "Ambitious", "Creative", "Methodical", "Optimistic", "Skeptical"
]

# Supporting personality traits (nuanced behavior - 30%)
SUPPORTING_TRAITS = [
    "Patient", "Impulsive", "Collaborative", "Independent", "Detail-oriented",
    "Big-picture", "Relationship-focused", "Results-driven", "Risk-averse", "Innovative"
]

# Trait combination descriptions for AI prompts
TRAIT_COMBINATIONS = {
    ("Analytical", "Empathetic"): "Loves data and facts but deeply cares about people impact. Makes decisions based on both logic and human considerations.",
    ("Enthusiastic", "Cautious"): "Gets genuinely excited about possibilities but wants to verify details and think through implications before committing.",
    ("Direct", "Collaborative"): "Speaks plainly and cuts to the chase, but values team input and consensus-building in decision making.",
    ("Ambitious", "Patient"): "Has big goals and drives for success, but understands that good things take time and is willing to build relationships.",
    ("Creative", "Detail-oriented"): "Thinks outside the box and loves innovative solutions, but also pays attention to implementation specifics.",
    ("Methodical", "Innovative"): "Likes structured approaches and proven processes, but is open to new methods that can improve outcomes.",
    ("Optimistic", "Risk-averse"): "Generally positive about possibilities and outcomes, but wants to minimize potential downsides and protect against failure.",
    ("Skeptical", "Big-picture"): "Questions assumptions and wants proof, but can see the broader strategic implications and long-term vision.",
    ("Cautious", "Results-driven"): "Careful about making decisions too quickly, but ultimately focused on achieving concrete business outcomes.",
    ("Empathetic", "Independent"): "Cares deeply about people and relationships, but prefers to make decisions autonomously without too much input."
}

def generate_personality_traits() -> Dict[str, str]:
    """
    Generate a random core + supporting personality trait combination.
    
    Returns:
        Dict with core_trait, supporting_trait, and blend_description
    """
    core_trait = random.choice(CORE_TRAITS)
    supporting_trait = random.choice(SUPPORTING_TRAITS)
    
    blend_description = f"Primarily {core_trait.lower()} in approach but with {supporting_trait.lower()} tendencies that add nuance to their decision-making style."
    
    return {
        "core_personality_trait": core_trait,
        "supporting_personality_trait": supporting_trait,
        "personality_blend_description": blend_description
    }

def get_trait_behavior_instructions(core_trait: str, supporting_trait: str) -> str:
    """
    Generate AI behavior instructions based on personality traits.
    
    Args:
        core_trait: The dominant personality trait
        supporting_trait: The supporting personality trait
        
    Returns:
        Detailed behavior instructions for the AI
    """
    
    core_behaviors = {
        "Analytical": "Ask probing questions, want to see data/proof, think through logical implications",
        "Enthusiastic": "Show genuine excitement about possibilities, use energetic language",
        "Cautious": "Take time to consider options, ask about risks and downsides",
        "Direct": "Cut to the chase, appreciate straightforward communication",
        "Empathetic": "Show concern for people impact, respond well to emotional appeals",
        "Ambitious": "Focus on growth and advancement opportunities",
        "Creative": "Appreciate innovative approaches, get excited by novel solutions",
        "Methodical": "Want step-by-step explanations, appreciate structured presentations",
        "Optimistic": "Focus on positive outcomes and opportunities",
        "Skeptical": "Question claims and assumptions, want proof and references"
    }
    
    supporting_behaviors = {
        "Patient": "Don't rush decisions, willing to take time to understand",
        "Impulsive": "Can make quick decisions when excited",
        "Collaborative": "Want to involve others in decisions",
        "Independent": "Prefer to make own decisions",
        "Detail-oriented": "Ask specific questions about features",
        "Big-picture": "Focus on strategic implications",
        "Relationship-focused": "Value personal connections",
        "Results-driven": "Focus on outcomes and ROI",
        "Risk-averse": "Concerned about potential problems",
        "Innovative": "Excited by cutting-edge features"
    }
    
    core_behavior = core_behaviors.get(core_trait, "Display balanced professional behavior")
    supporting_behavior = supporting_behaviors.get(supporting_trait, "Show additional considerations")
    
    return f"""
PERSONALITY BEHAVIOR INSTRUCTIONS:
Core Trait ({core_trait} - 70% of behavior): {core_behavior}
Supporting Trait ({supporting_trait} - 30% of behavior): {supporting_behavior}

BEHAVIORAL BLEND: The core trait should dominate most interactions, but the supporting trait should add nuance and occasionally modify responses.
"""

def get_weighted_trait_metrics(core_trait: str, supporting_trait: str) -> Dict[str, float]:
    """
    Generate trait metrics based on personality combination.
    
    Args:
        core_trait: The dominant personality trait
        supporting_trait: The supporting personality trait
        
    Returns:
        Dictionary of trait metrics weighted by personality
    """
    
    # Base metrics for each core trait
    core_metrics = {
        "Analytical": {"Analytical": 0.8, "Skeptical": 0.7, "Patience": 0.6, "Detail_Oriented": 0.8},
        "Enthusiastic": {"Enthusiasm": 0.9, "Optimism": 0.8, "Impulsiveness": 0.6, "Openness_to_New_Ideas": 0.8},
        "Cautious": {"Risk_Aversion": 0.8, "Patience": 0.7, "Skeptical": 0.6, "Detail_Oriented": 0.7},
        "Direct": {"Directness": 0.9, "Impatience": 0.6, "Results_Focused": 0.7, "Confidence": 0.7},
        "Empathetic": {"Empathy_Sensitivity": 0.9, "Relationship_Focus": 0.8, "Trust_Building_Speed": 0.7},
        "Ambitious": {"Results_Focused": 0.8, "Competitiveness": 0.7, "Impatience": 0.6, "Confidence": 0.8},
        "Creative": {"Openness_to_New_Ideas": 0.9, "Innovation_Appreciation": 0.8, "Flexibility": 0.7},
        "Methodical": {"Detail_Oriented": 0.8, "Patience": 0.7, "Structure_Preference": 0.8, "Risk_Aversion": 0.6},
        "Optimistic": {"Optimism": 0.9, "Trust_Building_Speed": 0.7, "Openness_to_New_Ideas": 0.7},
        "Skeptical": {"Skeptical": 0.8, "Analytical": 0.7, "Risk_Aversion": 0.7, "Trust_Building_Speed": 0.3}
    }
    
    # Supporting trait modifiers
    supporting_modifiers = {
        "Patient": {"Patience": 0.3, "Impatience": -0.3},
        "Impulsive": {"Impulsiveness": 0.3, "Patience": -0.2},
        "Collaborative": {"Relationship_Focus": 0.3, "Independence": -0.2},
        "Independent": {"Independence": 0.3, "Relationship_Focus": -0.2},
        "Detail-oriented": {"Detail_Oriented": 0.3, "Big_Picture_Focus": -0.2},
        "Big-picture": {"Big_Picture_Focus": 0.3, "Detail_Oriented": -0.2},
        "Relationship-focused": {"Relationship_Focus": 0.3, "Empathy_Sensitivity": 0.2},
        "Results-driven": {"Results_Focused": 0.3, "Patience": -0.2},
        "Risk-averse": {"Risk_Aversion": 0.3, "Impulsiveness": -0.3},
        "Innovative": {"Innovation_Appreciation": 0.3, "Risk_Aversion": -0.2}
    }
    
    # Start with base emotional responsiveness
    metrics = {
        "Emotional_Responsiveness": 0.7,
        "Openness_to_New_Ideas": 0.6,
        "Trust_Building_Speed": 0.5,
        "Empathy_Sensitivity": 0.6,
        "Confidence_Influenced": 0.6,
        "Analytical": 0.5,
        "Skeptical": 0.5,
        "Impulsiveness": 0.4,
        "Stress_Level": random.uniform(0.3, 0.7)
    }
    
    # Apply core trait metrics
    if core_trait in core_metrics:
        for trait, value in core_metrics[core_trait].items():
            if trait in metrics:
                metrics[trait] = value
            else:
                metrics[trait] = value
    
    # Apply supporting trait modifiers
    if supporting_trait in supporting_modifiers:
        for trait, modifier in supporting_modifiers[supporting_trait].items():
            if trait in metrics:
                metrics[trait] = max(0.1, min(0.9, metrics[trait] + modifier))
    
    return metrics 