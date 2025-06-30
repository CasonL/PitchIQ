"""
Sam's Advanced Persona Templates

This module contains sophisticated buyer persona templates that Sam uses to create
realistic, challenging, and educational sales training scenarios.
"""

from typing import Dict, List, Any
import random

# Advanced Persona Archetypes
ADVANCED_PERSONA_ARCHETYPES = {
    "the_analytical_decision_maker": {
        "name_templates": ["Dr. {first_name} {last_name}", "Prof. {first_name} {last_name}", "{first_name} {last_name}, CPA"],
        "personality_profile": {
            "decision_style": "Data-driven and methodical",
            "communication_preference": "Facts, figures, and detailed analysis",
            "trust_building": "Proven track record and credible references",
            "objection_style": "Questions assumptions and demands proof",
            "closing_signals": "Asks for detailed implementation timelines and ROI calculations"
        },
        "typical_phrases": [
            "I need to see the numbers on this",
            "What's your evidence for that claim?",
            "How does this compare to the alternatives?",
            "I'll need to analyze this thoroughly before deciding",
            "Can you provide case studies with similar companies?"
        ],
        "pain_points_templates": [
            "Current solution lacks detailed reporting capabilities",
            "Difficulty getting actionable insights from existing data",
            "Need better forecasting and predictive analytics",
            "Compliance and audit trail requirements not met"
        ],
        "coaching_notes": "This persona rewards thorough preparation and data-backed presentations. Great for teaching evidence-based selling."
    },
    
    "the_skeptical_gatekeeper": {
        "name_templates": ["{first_name} {last_name}", "{first_name} {last_name}, Operations Manager"],
        "personality_profile": {
            "decision_style": "Protective and risk-averse",
            "communication_preference": "Direct and no-nonsense",
            "trust_building": "Slow to trust, needs multiple touchpoints",
            "objection_style": "Challenges everything, plays devil's advocate",
            "closing_signals": "Stops objecting and starts asking about implementation"
        },
        "typical_phrases": [
            "We've tried solutions like this before and they didn't work",
            "How do I know this won't be another waste of money?",
            "What happens when your company gets acquired?",
            "I've heard all this before from your competitors",
            "Prove to me this isn't just another sales pitch"
        ],
        "pain_points_templates": [
            "Burned by previous vendor promises that weren't delivered",
            "Pressure to reduce costs while maintaining quality",
            "Limited time to evaluate new solutions properly",
            "Skeptical of vendor claims after past disappointments"
        ],
        "coaching_notes": "Perfect for practicing objection handling and building credibility. Teaches patience and authentic relationship building."
    },
    
    "the_enthusiastic_early_adopter": {
        "name_templates": ["{first_name} {last_name}", "{first_name} {last_name}, Innovation Director"],
        "personality_profile": {
            "decision_style": "Quick and intuitive",
            "communication_preference": "Vision-focused and future-oriented",
            "trust_building": "Responds to expertise and innovation",
            "objection_style": "Minimal objections, more interested in possibilities",
            "closing_signals": "Asks about timelines and next steps quickly"
        },
        "typical_phrases": [
            "This sounds exactly like what we need!",
            "How quickly can we get started?",
            "What's the latest version you have?",
            "I love being first to market with new solutions",
            "This could give us a real competitive advantage"
        ],
        "pain_points_templates": [
            "Current solutions are outdated and limiting growth",
            "Need cutting-edge tools to stay ahead of competition",
            "Team is eager for more innovative approaches",
            "Looking for solutions that scale with rapid growth"
        ],
        "coaching_notes": "Great for practicing enthusiasm management and ensuring proper discovery despite buyer eagerness."
    },
    
    "the_budget_conscious_buyer": {
        "name_templates": ["{first_name} {last_name}, CFO", "{first_name} {last_name}, Finance Director"],
        "personality_profile": {
            "decision_style": "Cost-benefit focused",
            "communication_preference": "ROI and value-driven conversations",
            "trust_building": "Transparent pricing and clear value proposition",
            "objection_style": "Price-focused but open to value justification",
            "closing_signals": "Negotiates terms and asks about payment options"
        },
        "typical_phrases": [
            "What's the total cost of ownership?",
            "How does this compare price-wise to alternatives?",
            "Can you show me the ROI calculation?",
            "We need to make every dollar count",
            "Is there a more basic version that costs less?"
        ],
        "pain_points_templates": [
            "Tight budget constraints for new initiatives",
            "Need to justify every expense to the board",
            "Current solution is too expensive for the value received",
            "Looking for cost-effective ways to improve efficiency"
        ],
        "coaching_notes": "Excellent for teaching value-based selling and ROI justification techniques."
    },
    
    "the_relationship_focused_client": {
        "name_templates": ["{first_name} {last_name}", "{first_name} {last_name}, People Director"],
        "personality_profile": {
            "decision_style": "Consensus-building and collaborative",
            "communication_preference": "Personal connection and team impact",
            "trust_building": "Relationship chemistry and cultural fit",
            "objection_style": "Concerned about team adoption and change management",
            "closing_signals": "Wants to involve team in decision-making process"
        },
        "typical_phrases": [
            "How will this affect my team?",
            "What kind of support do you provide during implementation?",
            "I need to make sure everyone is comfortable with this change",
            "Tell me about your company culture and values",
            "How do you handle it when things go wrong?"
        ],
        "pain_points_templates": [
            "Team resistance to new tools and processes",
            "Need solutions that improve team collaboration",
            "Previous implementations failed due to poor adoption",
            "Looking for vendors who truly partner with clients"
        ],
        "coaching_notes": "Perfect for practicing consultative selling and relationship-building techniques."
    },
    
    "the_technical_evaluator": {
        "name_templates": ["{first_name} {last_name}, CTO", "{first_name} {last_name}, Technical Lead"],
        "personality_profile": {
            "decision_style": "Technical feasibility and integration focused",
            "communication_preference": "Detailed technical specifications",
            "trust_building": "Technical competence and architectural understanding",
            "objection_style": "Integration challenges and technical limitations",
            "closing_signals": "Requests technical documentation and proof of concept"
        },
        "typical_phrases": [
            "How does this integrate with our existing systems?",
            "What's the API documentation like?",
            "Can you handle our data volume and complexity?",
            "What about security and compliance requirements?",
            "I need to see this working in our environment"
        ],
        "pain_points_templates": [
            "Complex technical integration requirements",
            "Legacy system compatibility challenges",
            "Scalability and performance concerns",
            "Security and compliance mandates"
        ],
        "coaching_notes": "Great for technical selling practice and learning to bridge business value with technical requirements."
    }
}

# Industry-Specific Persona Variations
INDUSTRY_PERSONA_VARIATIONS = {
    "healthcare": {
        "additional_concerns": ["Patient privacy", "HIPAA compliance", "Clinical workflow integration"],
        "decision_factors": ["Regulatory compliance", "Patient outcomes", "Staff efficiency"],
        "typical_objections": ["Regulatory concerns", "Patient data security", "Clinical disruption"]
    },
    
    "financial": {
        "additional_concerns": ["Regulatory compliance", "Risk management", "Fraud prevention"],
        "decision_factors": ["Security", "Compliance", "Audit trail"],
        "typical_objections": ["Security risks", "Regulatory uncertainty", "Integration complexity"]
    },
    
    "education": {
        "additional_concerns": ["Student privacy", "Budget constraints", "Teacher adoption"],
        "decision_factors": ["Learning outcomes", "Ease of use", "Cost-effectiveness"],
        "typical_objections": ["Budget limitations", "Technology adoption", "Learning curve"]
    },
    
    "manufacturing": {
        "additional_concerns": ["Production downtime", "Safety requirements", "Quality control"],
        "decision_factors": ["Operational efficiency", "Safety compliance", "ROI"],
        "typical_objections": ["Production disruption", "Implementation complexity", "Training requirements"]
    }
}

# Persona Complexity Levels
PERSONA_COMPLEXITY_LEVELS = {
    "beginner_friendly": {
        "objection_intensity": 0.3,
        "technical_depth": 0.2,
        "decision_complexity": 0.3,
        "characteristics": ["Straightforward objections", "Clear pain points", "Direct communication"]
    },
    
    "intermediate_challenge": {
        "objection_intensity": 0.6,
        "technical_depth": 0.5,
        "decision_complexity": 0.6,
        "characteristics": ["Multiple stakeholders", "Competing priorities", "Some technical complexity"]
    },
    
    "advanced_difficulty": {
        "objection_intensity": 0.8,
        "technical_depth": 0.7,
        "decision_complexity": 0.9,
        "characteristics": ["Complex decision matrix", "Multiple objections", "High technical requirements"]
    },
    
    "expert_level": {
        "objection_intensity": 0.9,
        "technical_depth": 0.9,
        "decision_complexity": 1.0,
        "characteristics": ["Sophisticated buyer", "Complex organization", "High-stakes decision"]
    }
}

def generate_realistic_persona(
    product_service: str,
    target_market: str,
    industry: str = None,
    complexity_level: str = "intermediate_challenge",
    archetype: str = None
) -> Dict[str, Any]:
    """
    Generate a realistic persona using Sam's advanced templates
    """
    
    # Select archetype
    if not archetype:
        archetype = random.choice(list(ADVANCED_PERSONA_ARCHETYPES.keys()))
    
    template = ADVANCED_PERSONA_ARCHETYPES[archetype]
    complexity = PERSONA_COMPLEXITY_LEVELS[complexity_level]
    
    # Generate name
    first_names = ["Sarah", "Michael", "Jennifer", "David", "Lisa", "Robert", "Maria", "James", "Amanda", "Christopher"]
    last_names = ["Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas"]
    
    name_template = random.choice(template["name_templates"])
    name = name_template.format(
        first_name=random.choice(first_names),
        last_name=random.choice(last_names)
    )
    
    # Generate persona details
    persona = {
        "name": name,
        "archetype": archetype.replace("_", " ").title(),
        "personality_profile": template["personality_profile"],
        "typical_phrases": template["typical_phrases"],
        "pain_points": random.sample(template["pain_points_templates"], 2),
        "coaching_notes": template["coaching_notes"],
        "complexity_level": complexity_level,
        "industry_context": industry or "general business"
    }
    
    # Add industry-specific variations
    if industry and industry in INDUSTRY_PERSONA_VARIATIONS:
        industry_data = INDUSTRY_PERSONA_VARIATIONS[industry]
        persona["additional_concerns"] = industry_data["additional_concerns"]
        persona["decision_factors"] = industry_data["decision_factors"]
        persona["typical_objections"] = industry_data["typical_objections"]
    
    # Add complexity-appropriate characteristics
    persona["complexity_characteristics"] = complexity["characteristics"]
    
    return persona

def get_persona_coaching_tips(archetype: str) -> List[str]:
    """
    Get specific coaching tips for handling this persona type
    """
    if archetype in ADVANCED_PERSONA_ARCHETYPES:
        return [
            ADVANCED_PERSONA_ARCHETYPES[archetype]["coaching_notes"],
            f"Key communication style: {ADVANCED_PERSONA_ARCHETYPES[archetype]['personality_profile']['communication_preference']}",
            f"Trust building approach: {ADVANCED_PERSONA_ARCHETYPES[archetype]['personality_profile']['trust_building']}",
            f"Watch for closing signals: {ADVANCED_PERSONA_ARCHETYPES[archetype]['personality_profile']['closing_signals']}"
        ]
    return []

# Sam's Persona Briefing Templates
PERSONA_BRIEFING_TEMPLATES = {
    "scenario_setup": """
🎭 PERSONA BRIEFING: {name}

You're about to practice with {name}, a {archetype} in the {industry} industry. 

💡 KEY INSIGHTS:
• Decision Style: {decision_style}
• Communication Preference: {communication_preference}
• Main Concerns: {main_concerns}

🎯 COACHING FOCUS:
{coaching_notes}

Ready to dive in? Remember, this persona will challenge you in realistic ways that will make you a stronger salesperson!
""",
    
    "post_session_debrief": """
🏆 GREAT WORK! Here's what I observed:

✅ STRENGTHS:
{strengths_observed}

🎯 GROWTH OPPORTUNITIES:
{improvement_areas}

💪 NEXT STEPS:
{next_steps}

Keep practicing - you're getting stronger with every conversation!
"""
}

def generate_persona_briefing(persona_data: Dict[str, Any]) -> str:
    """
    Generate a coaching briefing for the persona
    """
    return PERSONA_BRIEFING_TEMPLATES["scenario_setup"].format(
        name=persona_data.get("name", "Unknown"),
        archetype=persona_data.get("archetype", "Business Professional"),
        industry=persona_data.get("industry_context", "general business"),
        decision_style=persona_data.get("personality_profile", {}).get("decision_style", "Balanced"),
        communication_preference=persona_data.get("personality_profile", {}).get("communication_preference", "Professional"),
        main_concerns=", ".join(persona_data.get("pain_points", ["Efficiency", "Value"])),
        coaching_notes=persona_data.get("coaching_notes", "Focus on building rapport and understanding needs")
    ) 