"""
Industry-Specific Persona Templates

This module provides industry-specific persona variations to make personas
more contextually authentic based on PERSONA_IMPROVEMENTS.md recommendations.
"""

from typing import Dict, Any, Optional
import random

# Industry-specific trait modifiers and characteristics
INDUSTRY_TEMPLATES = {
    "healthcare": {
        "description": "Healthcare professionals focus on compliance, patient outcomes, and evidence-based solutions",
        "trait_modifiers": {
            "Thoughtful": 0.1,  # Higher thoughtful thinking
            "Skeptical": 0.1,   # More skeptical of new solutions
            "Empathy_Sensitivity": 0.2,  # Higher empathy
            "Risk_Aversion": 0.2  # More risk-averse
        },
        "common_pain_points": [
            "Ensuring patient safety and compliance",
            "Managing increasing regulatory requirements", 
            "Balancing cost containment with quality care",
            "Keeping up with medical advances and best practices"
        ],
        "decision_factors": [
            "Evidence-based outcomes",
            "Regulatory compliance",
            "Patient safety impact",
            "Integration with existing systems"
        ],
        "speech_patterns": {
            "pace": "medium",
            "filler_words": ["well", "you know", "obviously"],
            "technical_comfort": "expert",
            "regional_expressions": []
        },
        "conversation_dynamics": {
            "question_asking_tendency": "high",
            "story_sharing_level": "moderate",
            "comfort_with_silence": "medium"
        },
        "typical_objections": [
            "How does this ensure patient safety?",
            "What's the evidence base for this solution?",
            "How does this integrate with our EMR system?"
        ]
    },
    
    "technology": {
        "description": "Tech professionals are innovation-driven, efficiency-focused, and data-oriented",
        "trait_modifiers": {
            "Thoughtful": 0.2,
            "Innovation_Appreciation": 0.2,
            "Openness_to_New_Ideas": 0.1,
            "Impatience": 0.1
        },
        "common_pain_points": [
            "Scaling systems and infrastructure",
            "Managing technical debt and legacy systems",
            "Keeping up with rapid technology changes",
            "Balancing innovation with stability"
        ],
        "decision_factors": [
            "Technical architecture fit",
            "Scalability and performance",
            "Developer experience and adoption",
            "ROI and efficiency gains"
        ],
        "speech_patterns": {
            "pace": "fast",
            "filler_words": ["like", "basically", "obviously"],
            "technical_comfort": "expert",
            "regional_expressions": []
        },
        "conversation_dynamics": {
            "question_asking_tendency": "high",
            "story_sharing_level": "minimal",
            "comfort_with_silence": "low"
        },
        "typical_objections": [
            "How does this scale?",
            "What's the API documentation like?",
            "Can we get a technical deep-dive?"
        ]
    },
    
    "manufacturing": {
        "description": "Manufacturing professionals are cost-conscious, reliability-focused, and ROI-driven",
        "trait_modifiers": {
            "Cost_Consciousness": 0.2,
            "Risk_Aversion": 0.2,
            "Results_Focused": 0.1,
            "Skeptical": 0.1
        },
        "common_pain_points": [
            "Reducing operational costs and waste",
            "Improving production efficiency and uptime",
            "Managing supply chain disruptions",
            "Meeting quality and safety standards"
        ],
        "decision_factors": [
            "Clear ROI and payback period",
            "Proven reliability and uptime",
            "Integration with existing equipment",
            "Training and implementation costs"
        ],
        "speech_patterns": {
            "pace": "medium",
            "filler_words": ["well", "you see", "the thing is"],
            "technical_comfort": "competent",
            "regional_expressions": []
        },
        "conversation_dynamics": {
            "question_asking_tendency": "medium",
            "story_sharing_level": "moderate",
            "comfort_with_silence": "high"
        },
        "typical_objections": [
            "What's the ROI on this?",
            "How long is the implementation?",
            "What happens if this breaks down?"
        ]
    },
    
    "education": {
        "description": "Education professionals are budget-constrained, student-focused, with long-term thinking",
        "trait_modifiers": {
            "Empathy_Sensitivity": 0.2,
            "Cost_Consciousness": 0.2,
            "Long_Term_Thinking": 0.1,
            "Collaborative": 0.1
        },
        "common_pain_points": [
            "Limited budgets and funding constraints",
            "Improving student outcomes and engagement",
            "Managing diverse learning needs",
            "Keeping up with educational technology"
        ],
        "decision_factors": [
            "Student impact and outcomes",
            "Budget fit and cost-effectiveness",
            "Ease of teacher adoption",
            "Long-term sustainability"
        ],
        "speech_patterns": {
            "pace": "medium",
            "filler_words": ["well", "you know", "I think"],
            "technical_comfort": "competent",
            "regional_expressions": []
        },
        "conversation_dynamics": {
            "question_asking_tendency": "high",
            "story_sharing_level": "extensive",
            "comfort_with_silence": "medium"
        },
        "typical_objections": [
            "How does this help our students?",
            "What's the budget impact?",
            "How hard is this for teachers to learn?"
        ]
    },
    
    "retail": {
        "description": "Retail professionals are customer-experience driven with seasonal pressures and margin consciousness",
        "trait_modifiers": {
            "Customer_Focus": 0.2,
            "Stress_Level": 0.1,
            "Results_Focused": 0.1,
            "Impatience": 0.1
        },
        "common_pain_points": [
            "Improving customer experience and satisfaction",
            "Managing seasonal demand fluctuations",
            "Optimizing inventory and margins",
            "Competing with online retailers"
        ],
        "decision_factors": [
            "Customer experience impact",
            "Revenue and margin improvement",
            "Speed of implementation",
            "Seasonal timing considerations"
        ],
        "speech_patterns": {
            "pace": "fast",
            "filler_words": ["like", "you know", "obviously"],
            "technical_comfort": "competent",
            "regional_expressions": []
        },
        "conversation_dynamics": {
            "question_asking_tendency": "medium",
            "story_sharing_level": "moderate",
            "comfort_with_silence": "low"
        },
        "typical_objections": [
            "How does this improve customer experience?",
            "What's the impact on our margins?",
            "Can we implement this before the holiday season?"
        ]
    },
    
    "financial_services": {
        "description": "Financial professionals focus on compliance, risk management, and regulatory requirements",
        "trait_modifiers": {
            "Risk_Aversion": 0.3,
            "Thoughtful": 0.2,
            "Skeptical": 0.2,
            "Compliance_Focused": 0.2
        },
        "common_pain_points": [
            "Meeting regulatory compliance requirements",
            "Managing risk and security concerns",
            "Improving operational efficiency",
            "Enhancing customer trust and experience"
        ],
        "decision_factors": [
            "Regulatory compliance assurance",
            "Security and risk mitigation",
            "Audit trail and documentation",
            "Integration with existing systems"
        ],
        "speech_patterns": {
            "pace": "medium",
            "filler_words": ["well", "certainly", "obviously"],
            "technical_comfort": "competent",
            "regional_expressions": []
        },
        "conversation_dynamics": {
            "question_asking_tendency": "high",
            "story_sharing_level": "minimal",
            "comfort_with_silence": "high"
        },
        "typical_objections": [
            "How does this meet compliance requirements?",
            "What are the security implications?",
            "What's the audit trail like?"
        ]
    }
}

def get_industry_template(industry_context: str) -> Optional[Dict[str, Any]]:
    """
    Get industry-specific template based on industry context.
    
    Args:
        industry_context: The industry context string
        
    Returns:
        Dictionary with industry-specific modifications or None if no match
    """
    industry_lower = industry_context.lower()
    
    # Map common industry terms to our templates
    industry_mapping = {
        "healthcare": ["healthcare", "medical", "hospital", "clinic", "pharmaceutical", "pharma"],
        "technology": ["technology", "tech", "software", "saas", "it", "engineering", "startup"],
        "manufacturing": ["manufacturing", "industrial", "factory", "production", "automotive"],
        "education": ["education", "school", "university", "academic", "learning", "training"],
        "retail": ["retail", "ecommerce", "e-commerce", "store", "shopping", "consumer"],
        "financial_services": ["financial", "finance", "banking", "insurance", "fintech"]
    }
    
    for template_key, keywords in industry_mapping.items():
        if any(keyword in industry_lower for keyword in keywords):
            return INDUSTRY_TEMPLATES[template_key]
    
    return None

def apply_industry_modifications(
    base_persona_data: Dict[str, Any], 
    industry_context: str
) -> Dict[str, Any]:
    """
    Apply industry-specific modifications to a base persona.
    
    Args:
        base_persona_data: The base persona dictionary
        industry_context: The industry context string
        
    Returns:
        Modified persona dictionary with industry-specific traits
    """
    template = get_industry_template(industry_context)
    if not template:
        return base_persona_data
    
    # Create a copy to avoid modifying the original
    modified_persona = base_persona_data.copy()
    
    # Apply trait modifiers
    if "trait_metrics" in modified_persona and "trait_modifiers" in template:
        trait_metrics = modified_persona["trait_metrics"].copy()
        for trait, modifier in template["trait_modifiers"].items():
            if trait in trait_metrics:
                # Apply modifier and clamp between 0.1 and 0.9
                new_value = trait_metrics[trait] + modifier
                trait_metrics[trait] = max(0.1, min(0.9, new_value))
        modified_persona["trait_metrics"] = trait_metrics
    
    # Enhance pain points with industry-specific ones
    if "pain_points" in modified_persona and "common_pain_points" in template:
        existing_pain_points = modified_persona["pain_points"]
        industry_pain_points = template["common_pain_points"]
        
        # Replace one random existing pain point with an industry-specific one
        if existing_pain_points and industry_pain_points:
            replace_index = random.randint(0, len(existing_pain_points) - 1)
            industry_pain = random.choice(industry_pain_points)
            existing_pain_points[replace_index] = industry_pain
    
    # Enhance objections with industry-specific ones
    if "objections" in modified_persona and "typical_objections" in template:
        existing_objections = modified_persona["objections"]
        industry_objections = template["typical_objections"]
        
        # Replace one random objection with an industry-specific one
        if existing_objections and industry_objections:
            replace_index = random.randint(0, len(existing_objections) - 1)
            industry_objection = random.choice(industry_objections)
            existing_objections[replace_index] = industry_objection
    
    # Apply speech pattern defaults if not specified
    if "speech_patterns" in modified_persona and "speech_patterns" in template:
        speech_patterns = modified_persona["speech_patterns"]
        template_speech = template["speech_patterns"]
        
        # Apply defaults for any missing fields
        for key, default_value in template_speech.items():
            if key not in speech_patterns or not speech_patterns[key]:
                speech_patterns[key] = default_value
    
    # Apply conversation dynamics defaults
    if "conversation_dynamics" in modified_persona and "conversation_dynamics" in template:
        conv_dynamics = modified_persona["conversation_dynamics"]
        template_dynamics = template["conversation_dynamics"]
        
        # Apply defaults for any missing fields
        for key, default_value in template_dynamics.items():
            if key not in conv_dynamics or not conv_dynamics[key]:
                conv_dynamics[key] = default_value
    
    # Add industry context to business description
    if "business_description" in modified_persona:
        industry_desc = template.get("description", "")
        if industry_desc:
            modified_persona["business_description"] += f" {industry_desc}"
    
    return modified_persona

def get_industry_context_prompt_addition(industry_context: str) -> str:
    """
    Get additional prompt text for industry-specific persona generation.
    
    Args:
        industry_context: The industry context string
        
    Returns:
        Additional prompt text to include in persona generation
    """
    template = get_industry_template(industry_context)
    if not template:
        return ""
    
    return f"""
INDUSTRY-SPECIFIC CONTEXT for {industry_context.upper()}:
{template['description']}

Industry-typical pain points to consider:
{', '.join(template['common_pain_points'][:3])}

Common decision factors in this industry:
{', '.join(template['decision_factors'][:3])}

Typical objections in this industry:
{', '.join(template['typical_objections'])}
""" 