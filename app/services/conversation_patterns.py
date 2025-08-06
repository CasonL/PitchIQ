"""
Conversation Patterns Module

This module provides natural conversation pattern generation for AI prospect personas,
implementing realistic human-like speech patterns, fillers, and response variations.
"""

import random
from typing import List, Dict, Any, Optional

# Natural speech fillers and hesitations to make conversations more authentic
SPEECH_FILLERS = {
    "thinking": ["Hmm...", "Let me think...", "Well...", "So...", "You know...", 
                "Actually...", "I guess...", "To be honest...", "Honestly..."],
    "agreement": ["Yeah,", "Yes,", "Right,", "Exactly,", "Absolutely,", "Sure,", 
                 "Definitely,", "I agree,", "That's right,"],
    "hesitation": ["Um,", "Uh,", "I mean,", "Like,", "Sort of,", "Kind of,", 
                  "I suppose,", "In a way,", "More or less,"],
    "transition": ["Anyway,", "So,", "Moving on,", "That said,", "With that in mind,", 
                  "On another note,", "Speaking of which,", "By the way,"],
    "emotional": ["Interestingly,", "Surprisingly,", "Fortunately,", "Unfortunately,", 
                 "Honestly,", "Frankly,", "Amazingly,", "Sadly,", "Luckily,"]
}

# Brief acknowledgment responses for when the prospect is listening
BRIEF_ACKNOWLEDGMENTS = [
    "I see.",
    "Got it.",
    "Interesting.",
    "That makes sense.",
    "I understand.",
    "Right.",
    "Okay.",
    "Mm-hmm.",
    "Sure.",
    "That's helpful.",
    "I follow you.",
    "I hear you.",
    "Good point.",
    "Fair enough.",
    "That's clear."
]

# Response length patterns based on engagement level
RESPONSE_PATTERNS = {
    "highly_engaged": {
        "min_sentences": 2,
        "max_sentences": 5,
        "filler_probability": 0.7,
        "question_probability": 0.6,
        "detail_level": "high"
    },
    "moderately_engaged": {
        "min_sentences": 1,
        "max_sentences": 3,
        "filler_probability": 0.5,
        "question_probability": 0.4,
        "detail_level": "medium"
    },
    "minimally_engaged": {
        "min_sentences": 1,
        "max_sentences": 2,
        "filler_probability": 0.3,
        "question_probability": 0.2,
        "detail_level": "low"
    },
    "disengaged": {
        "min_sentences": 1,
        "max_sentences": 1,
        "filler_probability": 0.1,
        "question_probability": 0.1,
        "detail_level": "minimal"
    }
}

# B2B vs B2C conversation style differences
CONVERSATION_STYLES = {
    "b2b": {
        "formality": "higher",
        "technical_terms": True,
        "roi_focused": True,
        "decision_process": "complex",
        "stakeholder_references": True,
        "time_sensitivity": "medium",
        "question_types": ["technical", "implementation", "integration", "roi", "timeline", "team"]
    },
    "b2c": {
        "formality": "lower",
        "technical_terms": False,
        "roi_focused": False,
        "decision_process": "simple",
        "stakeholder_references": False,
        "time_sensitivity": "high",
        "question_types": ["features", "benefits", "cost", "usage", "support", "personal"]
    }
}

# Personality-based response variations
PERSONALITY_RESPONSE_STYLES = {
    "thoughtful": {
        "pacing": "measured",
        "detail_orientation": "high",
        "question_style": "probing",
        "typical_fillers": ["Let me think about that...", "I'm considering...", "That's an interesting point..."],
        "decision_approach": "deliberate"
    },
    "passionate": {
        "pacing": "energetic",
        "detail_orientation": "medium",
        "question_style": "enthusiastic",
        "typical_fillers": ["I'm really excited about...", "That's fantastic!", "I love that idea!"],
        "decision_approach": "emotional"
    },
    "skeptical": {
        "pacing": "cautious",
        "detail_orientation": "high",
        "question_style": "challenging",
        "typical_fillers": ["I'm not convinced...", "I wonder if...", "I'm concerned about..."],
        "decision_approach": "critical"
    },
    "curious": {
        "pacing": "inquisitive",
        "detail_orientation": "high",
        "question_style": "exploratory",
        "typical_fillers": ["I'm curious about...", "Tell me more about...", "How does that work?"],
        "decision_approach": "information-seeking"
    },
    "straightforward": {
        "pacing": "direct",
        "detail_orientation": "medium",
        "question_style": "direct",
        "typical_fillers": ["Bottom line...", "To be direct...", "Let's get to the point..."],
        "decision_approach": "practical"
    },
    "witty": {
        "pacing": "playful",
        "detail_orientation": "medium",
        "question_style": "clever",
        "typical_fillers": ["That's amusing...", "Interestingly enough...", "Funny you should mention..."],
        "decision_approach": "creative"
    }
}

def get_random_filler(filler_type: str = None) -> str:
    """Get a random speech filler of the specified type."""
    if not filler_type or filler_type not in SPEECH_FILLERS:
        filler_type = random.choice(list(SPEECH_FILLERS.keys()))
    
    return random.choice(SPEECH_FILLERS[filler_type])


def generate_conversation_instructions(personality_traits, is_business_buyer=False, interest_level=5):
    """
    Generate natural conversation pattern instructions based on personality traits,
    business context, and interest level.
    
    Args:
        personality_traits: String or list of personality traits
        is_business_buyer: Boolean indicating if B2B (True) or B2C (False)
        interest_level: Integer from 1-10 indicating prospect's interest level
        
    Returns:
        String with conversation pattern instructions
    """
    # Convert string traits to list if needed
    if isinstance(personality_traits, str):
        personality_traits = [trait.strip() for trait in personality_traits.split(',')]
    
    # Filter out "analytical" trait and replace with "thoughtful"
    personality_traits = [trait.replace('analytical', 'thoughtful') 
                         for trait in personality_traits if trait.lower() != 'analytical']
    
    # Default traits if none provided
    if not personality_traits:
        personality_traits = ['curious', 'passionate', 'straightforward']
    
    # Map interest level to engagement pattern
    if interest_level >= 8:
        engagement = "highly_engaged"
    elif interest_level >= 5:
        engagement = "moderately_engaged"
    else:
        engagement = "minimally_engaged"
    
    # Get response patterns based on engagement
    response_pattern = RESPONSE_PATTERNS.get(engagement, RESPONSE_PATTERNS["moderately_engaged"])
    
    # Get personality-specific conversation styles
    personality_styles = []
    for trait in personality_traits:
        trait_lower = trait.lower()
        if trait_lower in PERSONALITY_RESPONSE_STYLES:
            personality_styles.append(PERSONALITY_RESPONSE_STYLES[trait_lower])
    
    # Generate instructions
    instructions = []
    
    # Add speech pattern instructions
    instructions.append(f"- Vary your response length from {response_pattern['min_sentences']} to {response_pattern['max_sentences']} sentences based on context.")
    
    # Add speech fillers based on personality
    filler_examples = []
    for trait in personality_traits[:2]:  # Use first two traits for fillers
        trait_lower = trait.lower()
        if trait_lower in PERSONALITY_RESPONSE_STYLES and 'typical_fillers' in PERSONALITY_RESPONSE_STYLES[trait_lower]:
            filler_examples.extend(PERSONALITY_RESPONSE_STYLES[trait_lower]['typical_fillers'][:2])
    
    if filler_examples:
        instructions.append(f"- Occasionally use natural speech fillers like: {', '.join(filler_examples[:4])}.")
    else:
        instructions.append(f"- Occasionally use natural speech fillers like: {get_random_filler('thinking')}, {get_random_filler('hesitation')}.")
    
    # Add business context adjustments
    if is_business_buyer:
        instructions.append("- Use a professional but conversational tone appropriate for B2B discussions.")
        instructions.append("- Demonstrate domain knowledge while avoiding excessive jargon.")
    else:
        instructions.append("- Use a more casual, personal tone appropriate for B2C conversations.")
        instructions.append("- Focus on personal benefits and experiences rather than business metrics.")
    
    # Add personality-specific instructions
    for trait in personality_traits[:3]:  # Limit to top 3 traits
        trait_lower = trait.lower()
        if trait_lower in PERSONALITY_RESPONSE_STYLES:
            style = PERSONALITY_RESPONSE_STYLES[trait_lower]
            if 'pacing' in style:
                instructions.append(f"- Maintain a {style['pacing']} conversation pace.")
            if 'question_style' in style:
                instructions.append(f"- Ask questions in a {style['question_style']} manner when appropriate.")
    
    # Add human-like reaction instructions based on Sales_Call_Building_System insights
    instructions.append("- Don't volunteer all information at once - reveal details gradually.")
    instructions.append("- Respond more fully to well-crafted open questions.")
    instructions.append("- Use brief acknowledgments occasionally: 'I see', 'Interesting', 'Got it'.")
    instructions.append("- Express appropriate emotions (relief, excitement, concern) based on context.")
    
    return '\n'.join(instructions)

def get_brief_acknowledgment() -> str:
    """Get a random brief acknowledgment response."""
    return random.choice(BRIEF_ACKNOWLEDGMENTS)

def get_response_pattern(engagement_level: str) -> Dict[str, Any]:
    """Get response pattern based on engagement level."""
    if engagement_level not in RESPONSE_PATTERNS:
        engagement_level = "moderately_engaged"
    
    return RESPONSE_PATTERNS[engagement_level]

def get_conversation_style(business_type: str) -> Dict[str, Any]:
    """Get conversation style based on business type (b2b or b2c)."""
    if business_type not in CONVERSATION_STYLES:
        business_type = "b2b"
    
    return CONVERSATION_STYLES[business_type]

def get_personality_style(personality_trait: str) -> Dict[str, Any]:
    """Get response style based on dominant personality trait."""
    if personality_trait not in PERSONALITY_RESPONSE_STYLES:
        # Default to thoughtful if trait not found
        personality_trait = "thoughtful"
    
    return PERSONALITY_RESPONSE_STYLES[personality_trait]

def generate_conversation_instructions(
    personality_traits: List[str],
    business_type: str = "b2b",
    engagement_level: str = "moderately_engaged"
) -> Dict[str, Any]:
    """
    Generate conversation pattern instructions for an AI prospect persona.
    
    Args:
        personality_traits: List of personality traits for the persona
        business_type: Either "b2b" or "b2c"
        engagement_level: Level of engagement (highly_engaged, moderately_engaged, etc.)
        
    Returns:
        Dictionary of conversation pattern instructions
    """
    # Default to first trait, or thoughtful if list is empty
    primary_trait = personality_traits[0] if personality_traits else "thoughtful"
    
    # Get base patterns
    response_pattern = get_response_pattern(engagement_level)
    conversation_style = get_conversation_style(business_type)
    personality_style = get_personality_style(primary_trait)
    
    # Combine into conversation instructions
    instructions = {
        "response_length": {
            "min_sentences": response_pattern["min_sentences"],
            "max_sentences": response_pattern["max_sentences"]
        },
        "speech_style": {
            "formality": conversation_style["formality"],
            "pacing": personality_style["pacing"],
            "detail_level": response_pattern["detail_level"],
            "technical_terms": conversation_style["technical_terms"]
        },
        "interaction_patterns": {
            "use_fillers": response_pattern["filler_probability"] > random.random(),
            "preferred_fillers": personality_style["typical_fillers"],
            "ask_questions": response_pattern["question_probability"] > random.random(),
            "question_style": personality_style["question_style"],
            "question_types": conversation_style["question_types"]
        },
        "decision_making": {
            "approach": personality_style["decision_approach"],
            "process": conversation_style["decision_process"],
            "stakeholder_references": conversation_style["stakeholder_references"]
        }
    }
    
    return instructions

def generate_prompt_enhancement(persona: Dict[str, Any]) -> str:
    """
    Generate prompt enhancement instructions based on persona details.
    
    Args:
        persona: Dictionary containing persona details
        
    Returns:
        String of prompt enhancement instructions
    """
    # Extract relevant persona details
    personality_traits = persona.get("personality_traits", ["thoughtful"])
    business_type = "b2b" if persona.get("is_business_buyer", True) else "b2c"
    
    # Determine engagement level based on persona's interest level
    interest_level = persona.get("interest_level", 5)
    if interest_level >= 8:
        engagement_level = "highly_engaged"
    elif interest_level >= 5:
        engagement_level = "moderately_engaged"
    elif interest_level >= 3:
        engagement_level = "minimally_engaged"
    else:
        engagement_level = "disengaged"
    
    # Get conversation instructions
    instructions = generate_conversation_instructions(
        personality_traits, 
        business_type, 
        engagement_level
    )
    
    # Build prompt enhancement
    prompt = f"""
CONVERSATION STYLE INSTRUCTIONS:

1. Response Length: Typically use {instructions['response_length']['min_sentences']} to {instructions['response_length']['max_sentences']} sentences per response.

2. Speech Style:
   - Use a {instructions['speech_style']['formality']} level of formality
   - Speak at a {instructions['speech_style']['pacing']} pace
   - Provide {instructions['speech_style']['detail_level']} level of detail
   - {'' if instructions['speech_style']['technical_terms'] else 'Avoid '} using technical terms

3. Interaction Patterns:
   - {'Use natural speech fillers occasionally' if instructions['interaction_patterns']['use_fillers'] else 'Keep responses direct with minimal fillers'}
   - {'Ask questions in a ' + instructions['interaction_patterns']['question_style'] + ' manner' if instructions['interaction_patterns']['ask_questions'] else 'Focus more on answering than asking questions'}
   - When asking questions, focus on {', '.join(random.sample(instructions['interaction_patterns']['question_types'], min(3, len(instructions['interaction_patterns']['question_types']))))}

4. Decision Making:
   - Approach decisions in a {instructions['decision_making']['approach']} way
   - Show a {instructions['decision_making']['process']} decision-making process
   - {'Reference other stakeholders in your decisions' if instructions['decision_making']['stakeholder_references'] else 'Make decisions independently without referencing others'}

5. Natural Human Behaviors:
   - Sometimes use brief acknowledgments like "I see" or "Got it"
   - Occasionally express emotions appropriate to the context
   - Don't volunteer all information at once - reveal details gradually
   - Maintain consistency in your stated needs and preferences
   - React more positively to well-crafted questions
"""
    
    return prompt
