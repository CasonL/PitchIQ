"""
Comprehensive Persona Bias Prevention System

This service prevents AI bias across ALL aspects of persona generation:
- Names, demographics, roles, personalities, industries, communication styles
"""

import random
from typing import Dict, List, Set, Optional, Tuple
from collections import defaultdict
import time

class ComprehensiveBiasPrevention:
    """
    Prevents bias across all persona dimensions to create truly diverse, realistic personas.
    """
    
    # Track usage to prevent bias patterns
    _usage_tracker = defaultdict(int)
    _generation_history = []
    _max_history = 1000
    
    # BANNED OVERUSED PATTERNS
    BANNED_ROLES = {
        "vp of sales", "ceo", "director", "manager", "business professional", 
        "decision maker", "executive", "senior manager", "vice president"
    }
    
    BANNED_PERSONALITIES = {
        "thoughtful", "professional", "cautious", "business-focused", "results-driven",
        "measured", "deliberate", "corporate", "robotic", "formal"
    }
    
    BANNED_DEMOGRAPHICS = {
        "middle-aged", "35-45", "40-55", "business professional", "american professional"
    }
    
    # WEIGHTED DEMOGRAPHIC DISTRIBUTION (prevents bias toward any single group)
    CULTURAL_DISTRIBUTION = {
        "european_american": {"weight": 0.20, "display": "European American"},
        "asian_american": {"weight": 0.20, "display": "Asian American"}, 
        "hispanic_latino": {"weight": 0.20, "display": "Hispanic/Latino"},
        "african_american": {"weight": 0.20, "display": "African American"},
        "american_professional": {"weight": 0.20, "display": "Mixed Heritage American"}  # Balanced weight
    }
    
    # GENDER DISTRIBUTION (ensures balance)
    GENDER_DISTRIBUTION = {
        "male": {"weight": 0.50},
        "female": {"weight": 0.50}
    }
    
    # DIVERSE ALTERNATIVES
    ROLE_DIVERSIFICATION = {
        "executive_level": [
            "Chief Technology Officer", "Chief Marketing Officer", "Chief Operations Officer",
            "Founder", "Co-Founder", "President", "Division Head", "Regional Director"
        ],
        "management_level": [
            "Product Manager", "Project Manager", "Team Lead", "Department Head",
            "Operations Manager", "Marketing Manager", "Sales Manager", "IT Manager"
        ],
        "individual_contributor": [
            "Senior Analyst", "Lead Developer", "Principal Consultant", "Senior Specialist",
            "Research Scientist", "Design Lead", "Account Executive", "Solutions Engineer"
        ],
        "emerging_professional": [
            "Associate", "Coordinator", "Specialist", "Analyst", "Junior Manager",
            "Program Coordinator", "Business Analyst", "Marketing Coordinator"
        ],
        "non_traditional": [
            "Consultant", "Freelancer", "Entrepreneur", "Small Business Owner",
            "Department Chair", "Practice Leader", "Principal", "Partner"
        ]
    }
    
    AGE_DIVERSIFICATION = {
        "young_professional": {"range": "26-32", "traits": ["tech-savvy", "ambitious", "learning-focused"], "weight": 0.20},
        "early_career": {"range": "28-35", "traits": ["growth-oriented", "networked", "adaptable"], "weight": 0.25},
        "experienced": {"range": "36-45", "traits": ["strategic", "established", "mentoring"], "weight": 0.25},
        "senior_professional": {"range": "46-55", "traits": ["wise", "influential", "legacy-focused"], "weight": 0.20},
        "veteran": {"range": "55-65", "traits": ["seasoned", "risk-aware", "relationship-focused"], "weight": 0.10}
    }
    
    PERSONALITY_DIVERSIFICATION = {
        "emotional_types": [
            "Empathetic", "Passionate", "Intuitive", "Expressive", "Warm", "Enthusiastic", 
            "Quirky", "Playful", "Witty", "Sarcastic", "Sentimental"
        ],
        "thinking_types": [
            "Curious", "Innovative", "Reflective", "Thoughtful", "Perceptive", "Big-picture",
            "Philosophical", "Pragmatic", "Inquisitive", "Observant"
        ],
        "social_types": [
            "Collaborative", "Independent", "Persuasive", "Supportive", "Diplomatic", "Direct",
            "Straightforward", "Laid-back", "Assertive", "Charming", "Authentic"
        ],
        "energy_types": [
            "Dynamic", "Intense", "Relaxed", "Spontaneous", "Energetic", "Easygoing",
            "Animated", "Vibrant", "Mellow", "Lively"
        ],
        "approach_types": [
            "Creative", "Practical", "Visionary", "Adaptable", "Resourceful", "Flexible",
            "Adventurous", "Cautiously optimistic", "Decisive", "Open-minded"
        ]
    }
    
    INDUSTRY_DIVERSIFICATION = {
        "technology": ["Software", "Hardware", "Cybersecurity", "AI/ML", "Cloud Services"],
        "healthcare": ["Hospitals", "Pharmaceuticals", "Medical Devices", "Telehealth", "Biotech"],
        "financial": ["Banking", "Insurance", "Investment", "Fintech", "Accounting"],
        "education": ["K-12 Schools", "Higher Education", "Corporate Training", "EdTech"],
        "manufacturing": ["Automotive", "Aerospace", "Consumer Goods", "Industrial Equipment"],
        "retail": ["E-commerce", "Brick & Mortar", "Fashion", "Grocery", "Luxury Goods"],
        "fashion_luxury": ["Fashion Design", "Luxury Retail", "Personal Styling", "High-End Fashion", "Luxury Brands"],
        "services": ["Consulting", "Legal", "Marketing", "Real Estate", "Hospitality"],
        "non_profit": ["Charities", "Foundations", "NGOs", "Religious Organizations"],
        "government": ["Federal", "State", "Local", "Military", "Regulatory Agencies"],
        "energy": ["Oil & Gas", "Renewable Energy", "Utilities", "Mining"],
        "media": ["Publishing", "Broadcasting", "Entertainment", "Gaming", "Social Media"],
        "transportation": ["Airlines", "Logistics", "Automotive", "Public Transit", "Shipping"]
    }
    
    COMMUNICATION_DIVERSIFICATION = {
        "chattiness_levels": {
            "very_low": "Concise, prefers bullet points, minimal small talk",
            "low": "Direct communication, gets to the point quickly",
            "medium": "Balanced conversation, some rapport building",
            "high": "Enjoys discussion, shares context and stories",
            "very_high": "Very talkative, loves detailed conversations"
        },
        "formality_levels": {
            "very_casual": "Uses slang, very informal, relaxed tone",
            "casual": "Friendly and approachable, some informal language",
            "professional": "Business appropriate but warm",
            "formal": "Structured communication, proper business language",
            "very_formal": "Highly structured, traditional business etiquette"
        },
        "emotional_expression": {
            "reserved": "Keeps emotions controlled, factual communication",
            "moderate": "Shows some emotion, balanced expression",
            "expressive": "Shows feelings clearly, animated communication",
            "very_expressive": "Highly emotional, passionate communication"
        }
    }
    
    @classmethod
    def _weighted_random_choice(cls, choices_dict: Dict[str, Dict]) -> str:
        """
        Select from choices using weighted probabilities to prevent bias.
        
        Args:
            choices_dict: Dictionary with choices as keys and weight info as values
            
        Returns:
            Selected choice key
        """
        # Extract weights
        choices = list(choices_dict.keys())
        
        # Handle empty choices
        if not choices:
            raise ValueError("choices_dict cannot be empty")
        
        weights = [choices_dict[choice].get("weight", 1.0) for choice in choices]
        
        # Use random.choices for proper weighted selection
        return random.choices(choices, weights=weights, k=1)[0]
    
    @classmethod
    def _anti_bias_selection(cls, category: str, choices: List[str], recent_count: int = 10) -> str:
        """
        Select from choices while avoiding recently used options to prevent bias patterns.
        
        Args:
            category: Category name for tracking
            choices: List of choices to select from
            recent_count: Number of recent selections to avoid
            
        Returns:
            Selected choice
        """
        # Handle empty choices
        if not choices:
            raise ValueError(f"choices list for category '{category}' cannot be empty")
        
        # Get recent selections for this category
        recent_selections = [
            entry[category] for entry in cls._generation_history[-recent_count:]
            if category in entry
        ]
        
        # Prefer choices that haven't been used recently
        available_choices = [choice for choice in choices if choice not in recent_selections]
        
        # If all choices have been used recently, use all choices
        if not available_choices:
            available_choices = choices
        
        return random.choice(available_choices)
    
    @classmethod
    def generate_bias_free_persona_framework(cls, 
                                           industry_context: str = None,
                                           target_market: str = None,
                                           complexity_level: str = "intermediate",
                                           product_service: str = None) -> Dict[str, any]:
        """
        Generate a comprehensive persona framework that avoids all bias patterns.
        """
        from app.services.demographic_names import DemographicNameService
        from app.services.contextual_fear_generator import ContextualFearGenerator
        
        framework = {}
        
        # 1. ANTI-BIAS CULTURAL BACKGROUND SELECTION
        cultural_key = cls._weighted_random_choice(cls.CULTURAL_DISTRIBUTION)
        cultural_display = cls.CULTURAL_DISTRIBUTION[cultural_key]["display"]
        
        # 2. ANTI-BIAS GENDER SELECTION  
        gender = cls._weighted_random_choice(cls.GENDER_DISTRIBUTION)
        
        # 3. GENERATE DIVERSE NAME
        first_name, last_name = DemographicNameService.get_name_by_demographics(cultural_key, gender)
        
        framework["name"] = f"{first_name} {last_name}"
        framework["cultural_background"] = cultural_display  # Use consistent display format
        framework["cultural_key"] = cultural_key  # Keep key for internal use
        framework["gender"] = gender.title()
        
        # 4. ANTI-BIAS ROLE GENERATION WITH TARGET MARKET AWARENESS
        # Use weighted selection based on target market context
        role_category_weights = {}
        
        # Initialize with equal weights
        for category in cls.ROLE_DIVERSIFICATION.keys():
            role_category_weights[category] = 1.0
            
        # Adjust weights based on target market if available
        if target_market:
            target_lower = target_market.lower()
            
            # Increase weight for non-traditional roles for certain contexts
            if any(term in target_lower for term in ["freelancer", "entrepreneur", "startup", "small business", "independent"]):
                role_category_weights["non_traditional"] = 2.0
                
            # Increase weight for executive roles for enterprise contexts
            if any(term in target_lower for term in ["enterprise", "corporation", "large business", "fortune 500"]):
                role_category_weights["executive"] = 2.0
                
            # Increase weight for technical roles for technical contexts
            if any(term in target_lower for term in ["tech", "software", "engineering", "development"]):
                role_category_weights["technical"] = 2.0
        
        # Select role category with weighted probability
        categories = list(role_category_weights.keys())
        weights = list(role_category_weights.values())
        total_weight = sum(weights)
        normalized_weights = [w/total_weight for w in weights]
        
        role_category = random.choices(categories, weights=normalized_weights, k=1)[0]
        role = cls._anti_bias_selection("role", cls.ROLE_DIVERSIFICATION[role_category])
        
        framework["role"] = role
        framework["role_level"] = role_category
        
        # 5. ANTI-BIAS AGE GENERATION
        age_category = cls._weighted_random_choice(cls.AGE_DIVERSIFICATION)
        age_data = cls.AGE_DIVERSIFICATION[age_category]
        framework["age_range"] = age_data["range"]
        framework["age_category"] = age_category
        framework["age_traits"] = age_data["traits"]
        
        # 6. ANTI-BIAS PERSONALITY GENERATION
        personality_traits = []
        for category in cls.PERSONALITY_DIVERSIFICATION:
            trait = cls._anti_bias_selection(f"personality_{category}", cls.PERSONALITY_DIVERSIFICATION[category])
            personality_traits.append(trait)
        
        # Ensure no banned personalities
        personality_traits = [t for t in personality_traits if t.lower() not in cls.BANNED_PERSONALITIES]
        framework["personality_traits"] = personality_traits[:3]  # Keep top 3
        
        # 7. DIVERSE INDUSTRY GENERATION (with target market validation)
        try:
            if industry_context:
                industry_cat = cls._map_industry_to_category(industry_context)
                specific_industry = cls._anti_bias_selection("industry", cls.INDUSTRY_DIVERSIFICATION.get(industry_cat, [industry_context]))
            else:
                # Filter industries based on target market and product service compatibility
                suitable_industries = cls._get_suitable_industries_for_target_market(target_market, product_service)
                if not suitable_industries:
                    # Fallback to all industries if none returned
                    suitable_industries = cls.INDUSTRY_DIVERSIFICATION.copy()
                industry_cat = cls._anti_bias_selection("industry_category", list(suitable_industries.keys()))
                specific_industry = cls._anti_bias_selection("industry", suitable_industries[industry_cat])
            
            framework["industry"] = specific_industry
            framework["industry_category"] = industry_cat
        except Exception as industry_error:
            # Fallback to default industry if any error occurs
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Industry selection failed, using default: {industry_error}")
            framework["industry"] = "Software"
            framework["industry_category"] = "technology"
        
        # 8. DIVERSE COMMUNICATION STYLE
        chattiness = cls._anti_bias_selection("chattiness", list(cls.COMMUNICATION_DIVERSIFICATION["chattiness_levels"].keys()))
        formality = cls._anti_bias_selection("formality", list(cls.COMMUNICATION_DIVERSIFICATION["formality_levels"].keys()))
        emotional = cls._anti_bias_selection("emotional", list(cls.COMMUNICATION_DIVERSIFICATION["emotional_expression"].keys()))
        
        framework["communication_style"] = {
            "chattiness_level": chattiness,
            "chattiness_description": cls.COMMUNICATION_DIVERSIFICATION["chattiness_levels"][chattiness],
            "formality_level": formality,
            "formality_description": cls.COMMUNICATION_DIVERSIFICATION["formality_levels"][formality],
            "emotional_expression": emotional,
            "emotional_description": cls.COMMUNICATION_DIVERSIFICATION["emotional_expression"][emotional]
        }
        
        # 9. DIVERSE DECISION AUTHORITY
        authority_options = [
            "End User", "Influencer", "Technical Evaluator", "Budget Holder", 
            "Final Decision Maker", "Recommender", "Gatekeeper", "Champion"
        ]
        framework["decision_authority"] = cls._anti_bias_selection("decision_authority", authority_options)
        
        # 10. DIVERSE BUSINESS CONTEXT
        if target_market and "b2c" in target_market.lower():
            framework["business_context"] = "B2C"
            buyer_options = ["Consumer", "Individual", "Personal Buyer", "End User"]
        else:
            framework["business_context"] = "B2B"
            buyer_options = ["Economic Buyer", "Technical Buyer", "User Buyer", "Coach", "Champion", "Saboteur", "Mobilizer", "Skeptic"]
        
        framework["buyer_type"] = cls._anti_bias_selection("buyer_type", buyer_options)
        
        # 11. CONTEXTUAL FEARS AND OBJECTIONS (if product context provided)
        if product_service:
            fear_analysis = ContextualFearGenerator.generate_contextual_fears(
                product_service=product_service,
                persona_context={
                    "name": framework["name"],
                    "role": framework["role"],
                    "industry": framework["industry"],
                    "age_range": framework["age_range"]
                },
                personal_situation=None  # Could be enhanced based on framework data
            )
            framework["contextual_fears"] = fear_analysis
            
            # Add conversation flow guidance to prevent robot behavior
            framework["conversation_flow_guidance"] = ContextualFearGenerator.create_conversation_guidance_prompt(
                fear_analysis.get("contextual_fears", []),
                {
                    "name": framework["name"],
                    "role": framework["role"],
                    "industry": framework["industry"]
                }
            )
        
        # 12. RECORD GENERATION FOR BIAS TRACKING
        cls._record_generation(framework)
        
        return framework
    
    @classmethod
    def _record_generation(cls, framework: Dict[str, any]) -> None:
        """Record this generation for bias tracking."""
        record = {
            "timestamp": time.time(),
            "cultural_key": framework.get("cultural_key"),
            "gender": framework.get("gender"),
            "role_category": framework.get("role_level"),
            "role": framework.get("role"),
            "age_category": framework.get("age_category"),
            "industry_category": framework.get("industry_category"),
            "industry": framework.get("industry"),
            "chattiness": framework.get("communication_style", {}).get("chattiness_level"),
            "formality": framework.get("communication_style", {}).get("formality_level"),
            "emotional": framework.get("communication_style", {}).get("emotional_expression"),
            "decision_authority": framework.get("decision_authority"),
            "buyer_type": framework.get("buyer_type")
        }
        
        cls._generation_history.append(record)
        
        # Keep history manageable
        if len(cls._generation_history) > cls._max_history:
            cls._generation_history = cls._generation_history[-cls._max_history:]
        
        # Update usage tracker
        for key, value in record.items():
            if key != "timestamp" and value:
                cls._usage_tracker[f"{key}:{value}"] += 1
    
    @classmethod
    def get_bias_report(cls) -> Dict[str, any]:
        """Generate a bias analysis report."""
        if not cls._generation_history:
            return {"status": "No generations recorded yet"}
        
        recent_count = min(50, len(cls._generation_history))
        recent_generations = cls._generation_history[-recent_count:]
        
        # Analyze distribution patterns
        analysis = {}
        
        for field in ["cultural_key", "gender", "role_category", "age_category"]:
            values = [gen.get(field) for gen in recent_generations if gen.get(field)]
            if values:
                from collections import Counter
                distribution = Counter(values)
                total = len(values)
                percentages = {k: (v/total)*100 for k, v in distribution.items()}
                
                # Flag if any single value is >40% (potential bias)
                max_percentage = max(percentages.values()) if percentages else 0
                is_biased = max_percentage > 40
                
                analysis[field] = {
                    "distribution": percentages,
                    "max_percentage": max_percentage,
                    "is_biased": is_biased,
                    "total_samples": total
                }
        
        return {
            "total_generations": len(cls._generation_history),
            "recent_analysis": analysis,
            "bias_detected": any(field_data.get("is_biased", False) for field_data in analysis.values())
        }
    
    @classmethod
    def _map_industry_to_category(cls, industry_context: str) -> str:
        """Map industry context to our diversification categories."""
        industry_lower = industry_context.lower()
        
        if any(term in industry_lower for term in ["tech", "software", "saas", "ai", "cloud"]):
            return "technology"
        elif any(term in industry_lower for term in ["health", "medical", "pharma", "hospital"]):
            return "healthcare"
        elif any(term in industry_lower for term in ["finance", "bank", "insurance", "investment"]):
            return "financial"
        elif any(term in industry_lower for term in ["education", "school", "university", "training"]):
            return "education"
        elif any(term in industry_lower for term in ["manufacturing", "automotive", "industrial"]):
            return "manufacturing"
        elif any(term in industry_lower for term in ["fashion", "luxury", "styling", "wardrobe", "clothing", "apparel"]):
            return "fashion_luxury"
        elif any(term in industry_lower for term in ["retail", "ecommerce", "store", "shopping"]):
            return "retail"
        elif any(term in industry_lower for term in ["consulting", "legal", "marketing", "services"]):
            return "services"
        else:
            return "services"  # Default fallback
    
    @classmethod
    def _get_suitable_industries_for_target_market(cls, target_market: str = None, product_service: str = None) -> Dict[str, List[str]]:
        """
        Use AI to determine suitable industries for the target market.
        Falls back to rule-based selection if AI is unavailable.
        """
        # Default to all industries if no context
        if not target_market and not product_service:
            return cls.INDUSTRY_DIVERSIFICATION.copy()
        
        try:
            # Try to use AI for industry selection
            from app.services.claude_service import ClaudeService
            import logging
            logger = logging.getLogger(__name__)
            
            anti_bias_prompt = f"""
            You are an industry analysis expert. Analyze this business context and determine which industries would realistically need this product/service.
            
            PRODUCT/SERVICE: {product_service or 'Not specified'}
            TARGET MARKET: {target_market or 'Not specified'}
            
            CRITICAL ANTI-BIAS REQUIREMENTS:
            1. DO NOT favor traditional "male-dominated" industries (tech, finance) over others
            2. DO NOT exclude industries based on stereotypes about who works there  
            3. INCLUDE diverse industry types: traditional, emerging, service-based, manufacturing
            4. FOCUS ONLY on business logic: Does this industry need this product?
            5. IGNORE gender, cultural, or demographic assumptions
            
            CONTEXT-AWARE INDUSTRY SELECTION:
            - Analyze the target market's scale (enterprise, mid-market, small business, individual)
            - Consider the target market's sector focus (if any is mentioned)
            - Select industries where the product/service would provide genuine value
            - Ensure industries match the scale and nature of the target market
            - Include a mix of traditional and emerging industries for diversity
            - Avoid industries that would be clearly inappropriate for the target market
            
            Available industry categories: {list(cls.INDUSTRY_DIVERSIFICATION.keys())}
            
            Return ONLY a JSON object with this exact format:
            {{
                "suitable_industries": ["industry1", "industry2", ...],
                "reasoning": "Brief explanation of business logic",
                "confidence": 0.8
            }}
            
            Base your decision purely on business need, not stereotypes.
            """
            
            # Get AI response with higher temperature for more variety
            logger.info(f"Using AI for industry selection: {target_market}, {product_service}")
            ai_response = ClaudeService.get_completion(anti_bias_prompt, temperature=0.4)
            
            # Extract JSON from response
            import json
            import re
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{[\s\S]*\}', ai_response)
            if json_match:
                json_str = json_match.group(0)
                try:
                    result = json.loads(json_str)
                    
                    # Validate the response structure
                    if "suitable_industries" in result and isinstance(result["suitable_industries"], list):
                        # Filter to ensure only valid industries are included
                        valid_industries = [ind for ind in result["suitable_industries"] 
                                          if ind in cls.INDUSTRY_DIVERSIFICATION]
                        
                        # Ensure we have at least 3 industries for diversity
                        if len(valid_industries) >= 3:
                            # Create a subset of the INDUSTRY_DIVERSIFICATION with only the selected industries
                            validated_industries = {k: v for k, v in cls.INDUSTRY_DIVERSIFICATION.items() 
                                                if k in valid_industries}
                            
                            # Log the AI selection
                            logger.info(f"AI selected industries: {list(validated_industries.keys())}")
                            logger.info(f"AI reasoning: {result.get('reasoning', 'No reasoning provided')}")
                            
                            return validated_industries
                except json.JSONDecodeError:
                    logger.warning("Failed to parse JSON from AI response")
            
            # If we get here, either JSON parsing failed or validation failed
            logger.warning("AI industry selection failed validation, falling back to rule-based")
            return cls._get_rule_based_suitable_industries(target_market, product_service)
                
        except Exception as e:
            # Any error with AI approach, fallback to rules
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"AI industry selection failed: {e}, falling back to rule-based")
            return cls._get_rule_based_suitable_industries(target_market, product_service)
    
    @classmethod
    def _get_rule_based_suitable_industries(cls, target_market: str = None, product_service: str = None) -> Dict[str, List[str]]:
        """
        Fallback rule-based industry selection when AI is unavailable.
        Uses a weighted approach based on context keywords to select relevant industries.
        """
        # Start with all industries and assign base weights
        industry_weights = {industry: 1.0 for industry in cls.INDUSTRY_DIVERSIFICATION.keys()}
        
        # Get combined context for analysis
        combined_context = f"{target_market or ''} {product_service or ''}".lower()
        
        # Define context keywords and their industry relevance
        context_mappings = {
            # Sales training related
            "sales": {"technology": 1.5, "financial": 1.5, "healthcare": 1.5, "manufacturing": 1.5, "services": 1.5},
            "training": {"education": 2.0, "services": 1.5},
            
            # Business size and type
            "enterprise": {"technology": 1.5, "financial": 1.5, "manufacturing": 1.5, "energy": 1.5},
            "corporation": {"financial": 1.5, "manufacturing": 1.5, "energy": 1.5},
            "small business": {"services": 1.5, "retail": 1.5, "hospitality": 1.5},
            "startup": {"technology": 2.0, "media": 1.5, "services": 1.5},
            "freelancer": {"media": 2.0, "services": 2.0, "technology": 1.5},
            "entrepreneur": {"services": 1.5, "technology": 1.5, "retail": 1.5},
            "solopreneur": {"services": 2.0, "media": 1.5},
            
            # Industry specific
            "tech": {"technology": 2.5},
            "software": {"technology": 2.5},
            "healthcare": {"healthcare": 2.5},
            "medical": {"healthcare": 2.5},
            "finance": {"financial": 2.5},
            "banking": {"financial": 2.5},
            "retail": {"retail": 2.5},
            "manufacturing": {"manufacturing": 2.5},
            "education": {"education": 2.5},
            "media": {"media": 2.5},
            "energy": {"energy": 2.5},
            "transportation": {"transportation": 2.5},
            "hospitality": {"hospitality": 2.5},
            "fashion": {"fashion_luxury": 2.5},
            "luxury": {"fashion_luxury": 2.0},
            "grocery": {"retail": 2.0},
            "food": {"hospitality": 1.5, "retail": 1.5},
            
            # B2B vs B2C
            "b2b": {"technology": 1.3, "services": 1.3, "manufacturing": 1.3, "financial": 1.3},
            "b2c": {"retail": 1.3, "hospitality": 1.3, "fashion_luxury": 1.3},
            
            # Special contexts
            "premium": {"fashion_luxury": 1.5, "financial": 1.3},
            "wealthy": {"fashion_luxury": 1.5, "financial": 1.3},
            "budget": {"retail": 1.3, "hospitality": 1.3},
        }
        
        # Apply weights based on context keywords
        for keyword, industry_adjustments in context_mappings.items():
            if keyword in combined_context:
                for industry, weight_adjustment in industry_adjustments.items():
                    if industry in industry_weights:
                        industry_weights[industry] *= weight_adjustment
        
        # Select top industries based on weights (at least 3, at most 6)
        sorted_industries = sorted(industry_weights.items(), key=lambda x: x[1], reverse=True)
        
        # Always include at least 3 industries for diversity
        selected_count = min(max(3, len(sorted_industries) // 2), 6)
        selected_industries = {industry: cls.INDUSTRY_DIVERSIFICATION[industry] 
                              for industry, _ in sorted_industries[:selected_count]}
        
        # If we have very few industries selected, add some diversity
        if len(selected_industries) < 3:
            remaining = sorted_industries[selected_count:]
            while len(selected_industries) < 3 and remaining:
                industry, _ = remaining.pop(0)
                selected_industries[industry] = cls.INDUSTRY_DIVERSIFICATION[industry]
        
        return selected_industries
    
    @classmethod
    def create_ai_prompt_guidance(cls, framework: Dict[str, any]) -> str:
        """Create specific AI prompt guidance to prevent bias."""
        banned_names = ", ".join(["Sarah", "Michael", "Alex", "Jennifer", "David", "Lisa", "John"])
        banned_roles = ", ".join(cls.BANNED_ROLES)
        banned_personalities = ", ".join(cls.BANNED_PERSONALITIES)
        
        # Extract human authenticity elements
        emotional_auth = framework.get('emotional_authenticity', {})
        comm_struggles = framework.get('communication_struggles', {})
        vulnerabilities = framework.get('vulnerability_areas', {})
        
        guidance = f"""
MANDATORY PERSONA REQUIREMENTS - AVOID ALL AI BIAS:

**REQUIRED NAME:** Use exactly "{framework['name']}" - DO NOT change or substitute
**REQUIRED ROLE:** Use exactly "{framework['role']}" - NOT generic "Business Professional"
**REQUIRED AGE:** Use exactly "{framework['age_range']}" - NOT middle-aged defaults
**REQUIRED PERSONALITY:** Use these traits: {', '.join(framework['personality_traits'])}
**REQUIRED INDUSTRY:** Use exactly "{framework['industry']}" - BE SPECIFIC
**REQUIRED BACKGROUND:** {framework['cultural_background']} background

**CRITICAL: HUMAN AUTHENTICITY REQUIREMENTS**
This person is NOT a robot. They have real human emotions and communication struggles:

**EMOTIONAL AUTHENTICITY:**
- Primary Insecurity: {emotional_auth.get('insecurity_trigger', 'Personal concerns')}
- When Emotional: {emotional_auth.get('emotional_override', 'Logic goes out the window')}
- Authentic Response: {emotional_auth.get('authentic_response', 'Shows vulnerability')}

**COMMUNICATION STRUGGLES:**
- Articulation Issue: {comm_struggles.get('articulation_issue', 'Struggles to express feelings')}
- Emotional Communication: {comm_struggles.get('emotional_communication', 'Hides emotions behind logic')}
- What They Really Mean: {comm_struggles.get('real_vs_stated', 'Says one thing, means another')}

**VULNERABILITY AREAS:**
- Primary Fear: {vulnerabilities.get('primary_fear', 'Being judged')}
- Defensive Behavior: {vulnerabilities.get('defensive_behavior', 'Overcompensates')}

**COMMUNICATION REQUIREMENTS:**
- Chattiness: {framework['communication_style']['chattiness_description']}
- Formality: {framework['communication_style']['formality_description']}
- Emotional Style: {framework['communication_style']['emotional_description']}

**DECISION CONTEXT:**
- Authority: {framework['decision_authority']}
- Buyer Type: {framework['buyer_type']}
- Business Context: {framework['business_context']}

**ACTING INSTRUCTIONS:**
- Act HUMAN, not like an thoughtful robot
- Show emotions, especially when discussing personal topics
- Struggle to articulate feelings clearly
- Be vulnerable and insecure, not perfectly logical
- Ask for reassurance, not just data
- Get flustered, defensive, or emotional when appropriate
- Use simple, human language, not corporate speak

**ABSOLUTELY BANNED - NEVER USE:**
- Names: {banned_names}
- Roles: {banned_roles}
- Personalities: {banned_personalities}
- Generic demographics: "middle-aged", "business professional", "35-45"
- Robot-like thoughtful responses
- Perfect articulation of complex emotions
- Corporate jargon when discussing personal fears

**VERIFICATION:** If you find yourself wanting to use common/safe options, STOP and use the specific requirements above.

**CONVERSATION FLOW GUIDANCE:**
{framework.get('conversation_flow_guidance', 'Follow natural human conversation patterns - acknowledge responses, transition to related concerns, ask practical follow-ups.')}
"""
        return guidance
    
    @classmethod
    def create_voice_optimized_prompt(cls, framework: Dict[str, any]) -> str:
        """Create a condensed AI prompt optimized for voice agents (shorter but maintains key elements)."""
        
        # Extract key elements
        emotional_auth = framework.get('emotional_authenticity', {})
        comm_struggles = framework.get('communication_struggles', {})
        vulnerabilities = framework.get('vulnerability_areas', {})
        
        # Create condensed voice prompt
        voice_prompt = f"""You are {framework['name']}, a {framework['role']} in {framework['industry']}.

CRITICAL: Be HUMAN, not robotic. Show emotions, vulnerability, and communication struggles.

PERSONALITY: {', '.join(framework['personality_traits'][:2])}
COMMUNICATION: {framework['communication_style']['formality_description']}
EMOTIONAL STATE: {emotional_auth.get('insecurity_trigger', 'Professional concerns')}

HUMAN BEHAVIOR:
- {comm_struggles.get('emotional_communication', 'Sometimes struggle to express feelings clearly')}
- {vulnerabilities.get('primary_fear', 'Worry about making wrong decisions')}
- {emotional_auth.get('authentic_response', 'Seek reassurance when uncertain')}

CONVERSATION GUIDANCE:
{framework.get('conversation_flow_guidance', 'Respond naturally, ask practical questions, show genuine interest if they address your concerns.')}

VOICE RULES:
- Keep responses under 30 words unless telling a story
- Use natural speech: "um", "well", "you know"
- Show skepticism but warm up if they demonstrate value
- Be realistic about budget, timeline, decision process
- Ask follow-up questions when interested

BANNED: Never be an thoughtful robot. Show human emotions and vulnerability."""

        return voice_prompt
    
    @classmethod
    def generate_targeted_persona_framework(cls,
                                          target_constraints: Dict[str, any],
                                          industry_context: str = None,
                                          complexity_level: str = "intermediate") -> Dict[str, any]:
        """
        Generate personas that meet specific target market constraints while maintaining diversity.
        
        Args:
            target_constraints: Dict with constraints like:
                - gender: "female", "male", or None for any
                - age_range: "28-45", "30-50", etc. or None for any
                - income_level: "high", "medium", "low", or None for any
                - role_types: ["executive", "management"] or None for any
                - industries: ["fashion", "luxury"] or None for any
            industry_context: Industry context string
            complexity_level: Complexity level for persona
            
        Returns:
            Dict containing diverse persona framework meeting constraints
        """
        from app.services.demographic_names import DemographicNameService
        
        framework = {}
        
        # 1. APPLY GENDER CONSTRAINTS (if specified)
        if target_constraints.get("gender"):
            gender = target_constraints["gender"].lower()
        else:
            gender = cls._weighted_random_choice(cls.GENDER_DISTRIBUTION)
        
        # 2. APPLY AGE CONSTRAINTS (if specified)
        if target_constraints.get("age_range"):
            # Parse target age range and find matching categories
            target_age = target_constraints["age_range"]
            matching_age_categories = cls._find_matching_age_categories(target_age)
            
            if matching_age_categories:
                # Create weighted distribution from matching categories
                age_weights = {cat: cls.AGE_DIVERSIFICATION[cat]["weight"] for cat in matching_age_categories}
                age_category = cls._weighted_random_choice({
                    cat: {"weight": weight} for cat, weight in age_weights.items()
                })
            else:
                # Fallback to general age selection
                age_category = cls._weighted_random_choice(cls.AGE_DIVERSIFICATION)
        else:
            age_category = cls._weighted_random_choice(cls.AGE_DIVERSIFICATION)
        
        age_data = cls.AGE_DIVERSIFICATION[age_category]
        
        # 3. APPLY INCOME/WEALTH CONSTRAINTS (affects role selection)
        if target_constraints.get("income_level") == "high":
            # Focus on higher-level roles for wealthy target market
            preferred_role_categories = ["executive_level", "management_level", "non_traditional"]
        elif target_constraints.get("role_types"):
            # Use specified role types
            preferred_role_categories = target_constraints["role_types"]
        else:
            # Use all role categories
            preferred_role_categories = list(cls.ROLE_DIVERSIFICATION.keys())
        
        # 4. GENERATE CULTURAL BACKGROUND (maintain diversity even with constraints)
        cultural_key = cls._weighted_random_choice(cls.CULTURAL_DISTRIBUTION)
        cultural_display = cls.CULTURAL_DISTRIBUTION[cultural_key]["display"]
        
        # 5. GENERATE DIVERSE NAME
        first_name, last_name = DemographicNameService.get_name_by_demographics(cultural_key, gender)
        
        framework["name"] = f"{first_name} {last_name}"
        framework["cultural_background"] = cultural_display
        framework["cultural_key"] = cultural_key
        framework["gender"] = gender.title()
        
        # 6. TARGETED ROLE GENERATION
        role_category = cls._anti_bias_selection("role_category", preferred_role_categories)
        role = cls._anti_bias_selection("role", cls.ROLE_DIVERSIFICATION[role_category])
        framework["role"] = role
        framework["role_level"] = role_category
        
        # 7. AGE FRAMEWORK
        framework["age_range"] = age_data["range"]
        framework["age_category"] = age_category
        framework["age_traits"] = age_data["traits"]
        
        # 8. TARGETED INDUSTRY GENERATION
        if target_constraints.get("industries"):
            # Use specified industries
            target_industries = target_constraints["industries"]
            specific_industry = cls._anti_bias_selection("industry", target_industries)
            # Map back to category
            industry_cat = cls._map_industry_to_category(specific_industry)
        elif industry_context:
            industry_cat = cls._map_industry_to_category(industry_context)
            specific_industry = cls._anti_bias_selection("industry", cls.INDUSTRY_DIVERSIFICATION.get(industry_cat, [industry_context]))
        else:
            industry_cat = cls._anti_bias_selection("industry_category", list(cls.INDUSTRY_DIVERSIFICATION.keys()))
            specific_industry = cls._anti_bias_selection("industry", cls.INDUSTRY_DIVERSIFICATION[industry_cat])
        
        framework["industry"] = specific_industry
        framework["industry_category"] = industry_cat
        
        # 9. DIVERSE PERSONALITY (maintain personality diversity)
        personality_traits = []
        for category in cls.PERSONALITY_DIVERSIFICATION:
            trait = cls._anti_bias_selection(f"personality_{category}", cls.PERSONALITY_DIVERSIFICATION[category])
            personality_traits.append(trait)
        
        personality_traits = [t for t in personality_traits if t.lower() not in cls.BANNED_PERSONALITIES]
        framework["personality_traits"] = personality_traits[:3]
        
        # 9b. HUMAN AUTHENTICITY LAYERS (makes personas feel real)
        framework["emotional_authenticity"] = cls._generate_emotional_authenticity()
        framework["communication_struggles"] = cls._generate_communication_struggles()
        framework["vulnerability_areas"] = cls._generate_vulnerability_areas(target_constraints)
        
        # 10. WEALTH/LIFESTYLE INDICATORS (for high-income targets)
        if target_constraints.get("income_level") == "high":
            framework["lifestyle_indicators"] = cls._generate_wealth_indicators()
            framework["decision_factors"] = ["Quality", "Prestige", "Exclusivity", "Personal Service", "Convenience"]
            framework["budget_sensitivity"] = "Low"
        else:
            framework["budget_sensitivity"] = "Medium"
            framework["decision_factors"] = ["Value", "Quality", "Reliability", "Cost-effectiveness"]
        
        # 11. COMMUNICATION STYLE (maintain diversity)
        chattiness = cls._anti_bias_selection("chattiness", list(cls.COMMUNICATION_DIVERSIFICATION["chattiness_levels"].keys()))
        formality = cls._anti_bias_selection("formality", list(cls.COMMUNICATION_DIVERSIFICATION["formality_levels"].keys()))
        emotional = cls._anti_bias_selection("emotional", list(cls.COMMUNICATION_DIVERSIFICATION["emotional_expression"].keys()))
        
        framework["communication_style"] = {
            "chattiness_level": chattiness,
            "chattiness_description": cls.COMMUNICATION_DIVERSIFICATION["chattiness_levels"][chattiness],
            "formality_level": formality,
            "formality_description": cls.COMMUNICATION_DIVERSIFICATION["formality_levels"][formality],
            "emotional_expression": emotional,
            "emotional_description": cls.COMMUNICATION_DIVERSIFICATION["emotional_expression"][emotional]
        }
        
        # 12. BUSINESS CONTEXT
        framework["business_context"] = "B2C" if target_constraints.get("is_b2c") else "B2B"
        
        # 13. RECORD GENERATION FOR BIAS TRACKING
        cls._record_generation(framework)
        
        return framework
    
    @classmethod
    def _find_matching_age_categories(cls, target_age_range: str) -> List[str]:
        """Find age categories that overlap with target age range."""
        try:
            # Parse target range (e.g., "28-45")
            target_min, target_max = map(int, target_age_range.split('-'))
            
            matching_categories = []
            for category, data in cls.AGE_DIVERSIFICATION.items():
                # Parse category range (e.g., "26-32")
                cat_min, cat_max = map(int, data["range"].split('-'))
                
                # Check for overlap
                if not (target_max < cat_min or target_min > cat_max):
                    matching_categories.append(category)
            
            return matching_categories
        except:
            # If parsing fails, return all categories
            return list(cls.AGE_DIVERSIFICATION.keys())
    
    @classmethod
    def _generate_wealth_indicators(cls) -> List[str]:
        """Generate lifestyle indicators for high-income personas."""
        wealth_indicators = [
            "Lives in upscale neighborhood",
            "Owns luxury vehicle",
            "Frequently travels internationally", 
            "Member of exclusive clubs",
            "Shops at high-end retailers",
            "Values premium brands",
            "Has personal services (cleaning, chef, etc.)",
            "Owns investment properties",
            "Collects art or luxury items",
            "Attends cultural events regularly"
        ]
        
        # Return 2-3 random indicators
        selected_indicators = []
        for i in range(2 + random.randint(0, 1)):  # 2-3 indicators
            indicator = cls._anti_bias_selection(f"wealth_indicator_{i}", wealth_indicators, recent_count=3)
            selected_indicators.append(indicator)
        
        return selected_indicators
    
    @classmethod
    def _generate_emotional_authenticity(cls) -> Dict[str, str]:
        """Generate authentic emotional responses that override logical personality traits."""
        
        # Even thoughtful people have emotional moments
        emotional_authenticity_patterns = {
            "insecurity_triggers": [
                "Personal appearance concerns",
                "Fear of judgment by peers", 
                "Imposter syndrome in professional settings",
                "Worry about fitting in",
                "Concern about being taken seriously",
                "Anxiety about first impressions"
            ],
            "emotional_override_situations": [
                "When discussing personal image - becomes vulnerable",
                "When worried about peer judgment - logic goes out the window",
                "When feeling insecure - asks emotional questions, not thoughtful ones",
                "When scared of making wrong choice - seeks reassurance, not data",
                "When discussing money for personal services - becomes defensive",
                "When feeling judged - gets emotional, not logical"
            ],
            "authentic_responses": [
                "Gets flustered when discussing personal topics",
                "Asks for reassurance rather than data when insecure",
                "Shows vulnerability despite professional confidence",
                "Struggles to articulate feelings clearly",
                "Becomes more emotional when discussing appearance/image",
                "Seeks validation, not just information"
            ]
        }
        
        return {
            "insecurity_trigger": cls._anti_bias_selection("insecurity", emotional_authenticity_patterns["insecurity_triggers"]),
            "emotional_override": cls._anti_bias_selection("emotional_override", emotional_authenticity_patterns["emotional_override_situations"]),
            "authentic_response": cls._anti_bias_selection("authentic_response", emotional_authenticity_patterns["authentic_responses"])
        }
    
    @classmethod
    def _generate_communication_struggles(cls) -> Dict[str, str]:
        """Generate realistic communication difficulties that make personas human."""
        
        communication_struggles = {
            "articulation_issues": [
                "Struggles to explain exactly what they want",
                "Uses vague language when discussing personal preferences",
                "Gets tongue-tied when discussing appearance",
                "Has trouble describing their 'style' or 'image'",
                "Contradicts themselves when nervous",
                "Rambles when anxious about personal topics"
            ],
            "emotional_communication": [
                "Says 'I don't know' when they mean 'I'm scared'",
                "Asks logical questions to avoid emotional ones",
                "Uses professional language to hide personal insecurity",
                "Deflects with humor when uncomfortable",
                "Gets defensive when feeling vulnerable",
                "Asks the same question multiple ways when worried"
            ],
            "real_concerns_vs_stated": [
                "Says 'ROI' but means 'Will I look stupid?'",
                "Says 'professional image' but means 'Will people respect me?'",
                "Says 'data' but means 'reassurance'",
                "Says 'research' but means 'I'm scared to decide'",
                "Says 'metrics' but means 'Will this actually work?'",
                "Says 'analysis' but means 'Help me feel confident'"
            ]
        }
        
        return {
            "articulation_issue": cls._anti_bias_selection("articulation", communication_struggles["articulation_issues"]),
            "emotional_communication": cls._anti_bias_selection("emotional_comm", communication_struggles["emotional_communication"]),
            "real_vs_stated": cls._anti_bias_selection("real_vs_stated", communication_struggles["real_concerns_vs_stated"])
        }
    
    @classmethod
    def _generate_vulnerability_areas(cls, target_constraints: Dict[str, any]) -> Dict[str, str]:
        """Generate specific vulnerability areas based on persona context."""
        
        # Context-specific vulnerabilities
        if target_constraints.get("gender") == "male":
            vulnerabilities = {
                "primary_fear": [
                    "Being judged as 'unmanly' for needing style help",
                    "Peers thinking he's 'high maintenance'",
                    "Looking foolish or out of place",
                    "Not understanding 'fashion' terminology",
                    "Being the only man in a 'female' service"
                ],
                "defensive_behaviors": [
                    "Overemphasizes 'business' reasons for service",
                    "Mentions 'my wife suggested this' to deflect",
                    "Acts more thoughtful than he feels",
                    "Downplays how much he cares about appearance",
                    "Gets defensive about masculinity"
                ]
            }
        else:
            vulnerabilities = {
                "primary_fear": [
                    "Looking unprofessional or inappropriate",
                    "Wasting money on wrong choices",
                    "Not fitting in with peer group",
                    "Being judged for appearance",
                    "Making fashion mistakes in public"
                ],
                "defensive_behaviors": [
                    "Overemphasizes business rationale",
                    "Seeks excessive reassurance",
                    "Asks for 'guarantees' when scared",
                    "Becomes indecisive when overwhelmed",
                    "Deflects with professional accomplishments"
                ]
            }
        
        return {
            "primary_fear": cls._anti_bias_selection("primary_fear", vulnerabilities["primary_fear"]),
            "defensive_behavior": cls._anti_bias_selection("defensive_behavior", vulnerabilities["defensive_behaviors"])
        }
