"""
Service for generating AI coach personas based on user input.
"""
import os
import json
import logging
import random
import re
from flask import current_app

logger = logging.getLogger(__name__)

def normalize_input_text(text: str) -> str:
    """
    Normalize and fix common input issues for more reliable processing.
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Common typo corrections
    corrections = {
        'pragnent': 'pregnant',
        'pregnent': 'pregnant', 
        'preg nent': 'pregnant',
        'pregant': 'pregnant',
        'buisness': 'business',
        'busines': 'business',
        'managment': 'management',
        'mangers': 'managers',
        'manger': 'manager',
        'compaines': 'companies',
        'companys': 'companies',
        'employes': 'employees',
        'empolyees': 'employees',
        'exspensive': 'expensive',
        'expesive': 'expensive',
        'realy': 'really',
        'alot': 'a lot',
        'helpfull': 'helpful'
    }
    
    # Apply corrections (case-insensitive)
    normalized = text
    for wrong, correct in corrections.items():
        normalized = re.sub(r'\b' + re.escape(wrong) + r'\b', correct, normalized, flags=re.IGNORECASE)
    
    # Clean up extra whitespace
    normalized = ' '.join(normalized.split())
    
    return normalized.strip()

def robust_json_extraction(response_text: str) -> dict:
    """
    Ultra-robust JSON extraction with multiple fallback strategies.
    """
    if not response_text:
        logger.warning("Empty response text for JSON extraction")
        return None
    
    # Strategy 1: Direct JSON parsing
    try:
        return json.loads(response_text.strip())
    except json.JSONDecodeError:
        pass
    
    # Strategy 2: Extract from markdown code blocks
    code_block_patterns = [
        r'```json\s*(.*?)\s*```',
        r'```\s*(.*?)\s*```',
        r'`(.*?)`'
    ]
    
    for pattern in code_block_patterns:
        matches = re.findall(pattern, response_text, re.DOTALL)
        for match in matches:
            try:
                return json.loads(match.strip())
            except json.JSONDecodeError:
                continue
    
    # Strategy 3: Look for JSON-like structures with specific keys
    json_patterns = [
        r'\{[^{}]*"value_proposition"[^{}]*\}',
        r'\{[^{}]*"coaching_methodology"[^{}]*\}',
        r'\{[^{}]*"opening_hook"[^{}]*\}',
        r'\{.*?".*?".*?\}'
    ]
    
    for pattern in json_patterns:
        matches = re.findall(pattern, response_text, re.DOTALL)
        for match in matches:
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue
    
    # Strategy 4: Try to extract key-value pairs manually
    try:
        lines = response_text.split('\n')
        extracted = {}
        current_key = None
        current_value = []
        
        for line in lines:
            line = line.strip()
            if ':' in line and not line.startswith('"'):
                if current_key and current_value:
                    extracted[current_key] = ' '.join(current_value).strip()
                
                parts = line.split(':', 1)
                current_key = parts[0].strip().strip('"').lower().replace(' ', '_')
                current_value = [parts[1].strip().strip('"')]
            elif current_key and line:
                current_value.append(line.strip('"'))
        
        # Add the last key-value pair
        if current_key and current_value:
            extracted[current_key] = ' '.join(current_value).strip()
        
        if len(extracted) >= 2:  # At least some content extracted
            logger.info(f"Extracted {len(extracted)} fields via manual parsing")
            return extracted
    except Exception as e:
        logger.warning(f"Manual extraction failed: {e}")
    
    logger.error(f"All JSON extraction strategies failed. Response was: {response_text[:300]}...")
    return None

def generate_coach_persona(form_data: dict) -> str:
    """
    Generates an ultra-intelligent, adaptive AI coach persona using advanced business reasoning.

    Args:
        form_data: A dictionary containing the user's answers from the personalization form.

    Returns:
        A string containing the AI-generated coach persona with sophisticated business intelligence.
    """
    # Input validation
    if not form_data or not isinstance(form_data, dict):
        logger.error("Invalid form_data provided to generate_coach_persona")
        return "Unable to generate coach persona due to invalid input data."
    
    openai_service = current_app.extensions.get('api_manager').get_service('openai') if current_app.extensions.get('api_manager') else None
    
    # Extract and normalize core data
    raw_product = normalize_input_text(form_data.get('core_q1_product', ''))
    raw_value = normalize_input_text(form_data.get('core_q1_value', ''))
    raw_audience = normalize_input_text(form_data.get('core_q2_audience', ''))
    raw_goal = normalize_input_text(form_data.get('core_q5_goal', ''))
    
    logger.info(f"Normalized inputs - Product: '{raw_product}', Audience: '{raw_audience}'")
    
    # **INTELLIGENT TEXT PROCESSING** - Clean and paraphrase inputs
    def clean_and_paraphrase_product(product_text):
        """Convert 'I create/sell/offer X' into clean product descriptions."""
        if not product_text:
            return "your offering"
            
        text = product_text.strip()
        
        # Remove first-person language and convert to clean product descriptions
        patterns_to_clean = [
            (r'^I\s+(create|make|build|develop|design|offer|sell|provide)\s+', ''),
            (r'^I\s+help\s+.*?\s+with\s+', ''),
            (r'^I\s+help\s+.*?\s+by\s+', ''),
            (r'^My\s+company\s+(creates|makes|builds|develops|designs|offers|sells|provides)\s+', ''),
            (r'^We\s+(create|make|build|develop|design|offer|sell|provide)\s+', ''),
            (r'\s+for\s+companies\s+that\s+convert\s+into\s+sales$', ' that drive conversions'),
            (r'\s+that\s+convert\s+into\s+sales$', ' that drive conversions'),
            (r'\s+for\s+businesses\s+to\s+get\s+more\s+sales$', ' for business growth'),
        ]
        
        for pattern, replacement in patterns_to_clean:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        # Additional intelligent paraphrasing
        replacements = {
            'websites that convert': 'conversion-focused websites',
            'websites for companies': 'business websites', 
            'sales funnels': 'conversion funnels',
            'marketing campaigns': 'marketing solutions',
            'social media content': 'social media strategies',
            'business software': 'business solutions',
            'mobile apps': 'mobile applications',
            '3d tvs': '3D entertainment systems',
            'outdoor tvs': 'outdoor entertainment systems',
            'patio tvs': 'patio entertainment solutions'
        }
        
        for old, new in replacements.items():
            text = re.sub(old, new, text, flags=re.IGNORECASE)
        
        # Capitalize first letter and clean up
        text = text.strip()
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
            
        return text if text else "your offering"
    
    def clean_and_paraphrase_audience(audience_text):
        """Clean up audience descriptions for better readability."""
        if not audience_text:
            return "your target audience"
            
        text = audience_text.strip()
        
        # Clean up common patterns
        patterns_to_clean = [
            (r'^I\s+target\s+', ''),
            (r'^My\s+audience\s+is\s+', ''),
            (r'^I\s+work\s+with\s+', ''),
            (r'\s+that\s+need\s+.*$', ''),
            (r'\s+who\s+are\s+looking\s+for\s+.*$', ''),
            (r'\s+dependant\s+on\s+their\s+website\s+for\s+sales$', ' who rely on their website for revenue'),
        ]
        
        for pattern, replacement in patterns_to_clean:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        # Intelligent audience paraphrasing  
        replacements = {
            'small to medium sized businesses': 'small and medium businesses (SMBs)',
            'small to medium businesses': 'small and medium businesses (SMBs)', 
            'startup companies': 'startups and emerging companies',
            'business owners': 'business leaders',
            'wealthy homeowners': 'affluent homeowners',
            'high net worth individuals': 'affluent individuals',
            'people who want': 'individuals seeking',
            'companies that want': 'businesses seeking'
        }
        
        for old, new in replacements.items():
            text = re.sub(old, new, text, flags=re.IGNORECASE)
        
        # Capitalize first letter and clean up
        text = text.strip()
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
            
        return text if text else "your target audience"
    
    # Apply intelligent text processing
    product = clean_and_paraphrase_product(raw_product)
    audience = clean_and_paraphrase_audience(raw_audience)
    
    # Generate intelligent summaries for persona sections
    summarized_product = summarize_text(product, "product")
    summarized_audience = summarize_text(audience, "audience")

    logger.info(f"Text processing: '{raw_product}' -> '{product}'")
    logger.info(f"Text processing: '{raw_audience}' -> '{audience}'")
    
    # Apply the same advanced business intelligence
    def detect_industry_smart(product_text, value_text):
        text = f"{product_text} {value_text}".lower()
        
        if any(x in text for x in ['software', 'platform', 'app', 'saas', 'system', 'tool', 'dashboard']):
            return 'saas'
        elif any(x in text for x in ['consulting', 'advisory', 'strategy', 'coaching', 'mentoring']):
            return 'consulting' 
        elif any(x in text for x in ['training', 'course', 'education', 'learning', 'certification']):
            return 'education'
        elif any(x in text for x in ['marketing', 'advertising', 'design', 'creative', 'branding']):
            return 'agency'
        elif any(x in text for x in ['finance', 'investment', 'insurance', 'accounting']):
            return 'financial'
        elif any(x in text for x in ['tv', 'television', 'entertainment', 'outdoor', '3d', 'home theater', 'luxury', 'porch', 'backyard', 'pool', 'patio']):
            return 'luxury_consumer'
        elif any(x in text for x in ['car', 'auto', 'vehicle', 'real estate', 'house', 'home', 'furniture', 'appliance', 'chair', 'bed', 'nursery']):
            return 'consumer'
        else:
            # Default to 'business' instead of 'general' for better templating
            return 'business'
    
    def analyze_audience_psychology(audience_text):
        """Enhanced audience analysis with parenting/family support and better edge case handling."""
        text = audience_text.lower()
        
        # CRITICAL FIX: Add parenting/family detection first
        if any(x in text for x in ['pregnant', 'pregnancy', 'expecting', 'new parent', 'new mom', 'new mother', 'new dad', 'new father', 'maternity', 'baby', 'infant', 'newborn', 'nursing', 'breastfeeding', 'postpartum']):
            return {
                'type': 'new parents and expecting families',
                'pain_points': ['comfort during pregnancy', 'preparing for baby', 'finding quality products', 'safety concerns'],
                'motivations': ['comfort', 'safety', 'preparing for family', 'quality investment'],
                'sales_cycle': '2-9 months',
                'decision_style': 'careful research, comfort-focused, safety-first'
            }
        elif any(x in text for x in ['family', 'families', 'parents', 'children', 'kids', 'household', 'home', 'domestic']):
            return {
                'type': 'families and households',
                'pain_points': ['finding family-friendly solutions', 'balancing needs', 'long-term value'],
                'motivations': ['family comfort', 'practical value', 'durability'],
                'sales_cycle': '1-6 months',
                'decision_style': 'family-focused, practical, value-conscious'
            }
        elif any(x in text for x in ['entrepreneur', 'startup', 'founder']):
            return {
                'type': 'entrepreneurs',
                'pain_points': ['limited time', 'scaling challenges', 'resource constraints'],
                'motivations': ['growth', 'competitive advantage', 'efficiency'],
                'sales_cycle': '1-4 weeks',
                'decision_style': 'fast, intuitive, results-focused'
            }
        elif any(x in text for x in ['enterprise', 'large company', 'corporation', 'large business']):
            return {
                'type': 'enterprise', 
                'pain_points': ['compliance', 'integration', 'stakeholder alignment'],
                'motivations': ['security', 'proven results', 'vendor reliability'],
                'sales_cycle': '6-18 months',
                'decision_style': 'committee-based, risk-averse, thorough'
            }
        elif any(x in text for x in ['small business', 'smb', 'local business']):
            return {
                'type': 'small businesses',
                'pain_points': ['budget constraints', 'limited staff', 'competing priorities'],
                'motivations': ['cost savings', 'simplicity', 'immediate results'],
                'sales_cycle': '2-8 weeks', 
                'decision_style': 'practical, value-focused, relationship-driven'
            }
        elif any(x in text for x in ['250-500', 'mid-size', 'medium', 'growing']):
            return {
                'type': 'mid-market companies',
                'pain_points': ['growth scaling', 'process optimization', 'resource allocation'],
                'motivations': ['efficiency', 'competitive advantage', 'scalability'],
                'sales_cycle': '4-12 weeks',
                'decision_style': 'results-focused, practical'
            }
        elif any(x in text for x in ['wealthy', 'affluent', 'luxury', 'high-end', 'premium', 'upscale', 'homeowner']):
            return {
                'type': 'affluent consumers',
                'pain_points': ['finding unique experiences', 'quality concerns', 'installation complexity'],
                'motivations': ['luxury lifestyle', 'investment', 'status'],
                'sales_cycle': '1-2 years',
                'decision_style': 'experience-focused, quality-driven, lifestyle-oriented'
            }
        elif any(x in text for x in ['homeowner', 'consumer', 'individual', 'personal']):
            return {
                'type': 'consumers',
                'pain_points': ['finding the right fit', 'installation concerns', 'warranty questions'],
                'motivations': ['practical value', 'ease of use', 'cost-benefit'],
                'sales_cycle': '1-3 years',
                'decision_style': 'research-driven, value-conscious, practical'
            }
        else:
            # Default to business professionals instead of 'general'
            return {
                'type': 'business professionals',
                'pain_points': ['efficiency challenges', 'growth constraints'],
                'motivations': ['better results', 'competitive advantage'],
                'sales_cycle': '2-6 weeks',
                'decision_style': 'results-focused, practical'
            }
    
    def detect_coaching_focus(goal_text):
        goal_lower = goal_text.lower() if goal_text else ''
        
        if any(x in goal_lower for x in ['objection', 'pushback', 'resistance']):
            return {
                'focus': 'objection handling',
                'coaching_style': 'challenging and strategic',
                'practice_scenarios': 'difficult prospects with tough questions',
                'expertise_areas': ['reframing techniques', 'psychological persuasion', 'competitive positioning']
            }
        elif any(x in goal_lower for x in ['closing', 'conversion', 'deals', 'sale']):
            return {
                'focus': 'closing deals',
                'coaching_style': 'decisive and results-oriented',
                'practice_scenarios': 'decision-making moments and commitment conversations',
                'expertise_areas': ['urgency creation', 'decision facilitation', 'commitment psychology']
            }
        elif any(x in goal_lower for x in ['confidence', 'nervous', 'better']):
            return {
                'focus': 'confidence building',
                'coaching_style': 'supportive yet challenging',
                'practice_scenarios': 'high-pressure situations and complex conversations',
                'expertise_areas': ['preparation frameworks', 'stress management', 'expertise demonstration']
            }
        else:
            return {
                'focus': 'sales excellence',
                'coaching_style': 'comprehensive and adaptive',
                'practice_scenarios': 'full sales cycle interactions',
                'expertise_areas': ['strategic communication', 'relationship building', 'value demonstration']
            }
    
    # Perform intelligent analysis with error handling
    try:
        industry = detect_industry_smart(product, raw_value)
        logger.info(f"🎯 Starting AI audience analysis for: '{audience}'")
        audience_profile = analyze_audience_with_ai(audience, openai_service)  # 🎯 NEW: AI-powered analysis!
        coaching_focus = detect_coaching_focus(raw_goal)
        
        # Validate that we got proper results
        if not audience_profile or not isinstance(audience_profile, dict):
            logger.warning(f"Invalid audience_profile returned from AI analysis: {audience_profile}")
            audience_profile = get_enhanced_fallback_for_audience(audience)  # 🎯 Use smart fallback instead!
        else:
            logger.info(f"✅ AI audience analysis successful: {audience_profile['type']}")
        
        if not coaching_focus or not isinstance(coaching_focus, dict):
            logger.warning("Invalid coaching_focus, using default")
            coaching_focus = {
                'focus': 'sales excellence',
                'coaching_style': 'analytical and strategic',
                'expertise_areas': ['strategic selling', 'client relationship building'],
                'practice_scenarios': 'comprehensive sales simulations'
            }
            
    except Exception as e:
        logger.error(f"Error during analysis phase: {e}")
        # Use safe defaults
        industry = 'business'
        audience_profile = get_enhanced_fallback_for_audience(audience)  # 🎯 Use smart fallback instead!
        coaching_focus = {
            'focus': 'sales excellence',
            'coaching_style': 'analytical and strategic',
            'expertise_areas': ['strategic selling', 'client relationship building'],
            'practice_scenarios': 'comprehensive sales simulations'
        }
    
    if openai_service and openai_service.client:
        # Enhanced prompt with business intelligence
        enhanced_prompt = f"""
You are creating a sophisticated AI coach persona using advanced business intelligence. Follow the format EXACTLY.

**BUSINESS INTELLIGENCE ANALYSIS:**
- Industry: {industry.title()}
- Target Audience: {audience_profile['type']} 
- Audience Challenges: {', '.join(audience_profile['pain_points'])}
- Decision Style: {audience_profile['decision_style']}
- Sales Complexity: {audience_profile['sales_cycle']}
- Coaching Focus: {coaching_focus['focus']}
- Coaching Style: {coaching_focus['coaching_style']}

**USER'S SPECIFIC DATA:**
- Product/Service: {product}
- Target Audience: {audience}
- Primary Goal: {raw_goal}

**CRITICAL LANGUAGE REQUIREMENTS:**
- NEVER append "sales" to product descriptions unless the product is actually about sales
- Use industry-appropriate terminology (e.g., "patient consultations" for healthcare, "client presentations" for consulting)
- Avoid generic sales language - be specific to the industry and context
- Use professional language that matches how people in this industry actually talk

**REQUIRED OUTPUT FORMAT (follow EXACTLY):**

### Meet [Professional Name], Your {coaching_focus['focus'].title()} Specialist

I see you're working with **{product}** for **{audience}**. [Add 2-3 sentences with specific industry insights about what this audience type typically struggles with, their decision-making patterns, and why your coaching approach will work for them specifically.]

As your {coaching_focus['coaching_style']} coach, I'll help you master {audience_profile['type']} interactions through realistic practice scenarios where I act as [specific type of prospect from their audience]. We'll practice {coaching_focus['practice_scenarios']} with a focus on {coaching_focus['expertise_areas'][0]} and {coaching_focus['expertise_areas'][1]}.

**What makes me different:** I understand {industry} dynamics and the {audience_profile['decision_style']} nature of {audience_profile['type']}. Together, we'll turn their typical concerns like "{audience_profile['pain_points'][0]}" into competitive advantages.

Ready to master {audience_profile['type']} conversations and achieve your goals?

**EXAMPLE OUTPUT (DO NOT COPY - use actual user data):**
### Meet Jordan, Your Communication Excellence Specialist

I see you're working with **outdoor 3D entertainment systems** for **homeowners with entertainment spaces**. These prospects typically evaluate entertainment investments based on durability, experience quality, and seasonal usability. They make decisions based on lifestyle enhancement and want to understand installation, maintenance, and weather resistance.

As your comprehensive and adaptive coach, I'll help you master homeowner conversations through realistic practice scenarios where I act as a discerning homeowner evaluating premium entertainment options. We'll practice consultation interactions with a focus on demonstrating value and addressing practical concerns.

**What makes me different:** I understand entertainment industry dynamics and the experience-focused nature of homeowners. Together, we'll turn their typical concerns like "weather durability questions" into competitive advantages.

Ready to master homeowner conversations and help them create amazing entertainment experiences?

**Now create the persona using the user's actual data and business intelligence above.**
"""

        try:
            # Add randomization to get different variations each time
            random_seed = random.randint(1, 10000)
            
            completion = openai_service.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": f"You are an expert AI sales coach persona generator with deep business intelligence. Generate sophisticated, industry-aware coaching personas that demonstrate understanding of specific business dynamics, buyer psychology, and market contexts. IMPORTANT: Create fresh, varied content with different phrasing, approaches, and insights each time. Randomization seed: {random_seed}"},
                    {"role": "user", "content": enhanced_prompt}
                ],
                temperature=0.9,  # Increased for more variation
                max_tokens=500,
                seed=random_seed  # Add seed for variation
            )
            persona = completion.choices[0].message.content.strip()
            logger.info(f"Successfully generated advanced AI coach persona with business intelligence (seed: {random_seed}).")
            return persona
        except Exception as e:
            logger.error(f"Error generating enhanced coach persona: {e}")
            # Fall through to advanced fallback
    
    # Advanced fallback with same business intelligence
    logger.warning("OpenAI service not available. Using advanced fallback persona generation.")

    # **DETERMINE INTERACTION CONTEXT** - Based on industry and audience
    if industry in ['luxury_consumer', 'consumer']:
        interaction_verb = "working with"
        interaction_type = "conversations"
        coaching_context = "realistic consultations"
    else:
        interaction_verb = "working with" 
        interaction_type = "interactions"
        coaching_context = "strategic role-play scenarios"
    
    # **RANDOMIZED COACH GENERATION** - Multiple variations for each focus
    coach_name_pools = {
        'objection handling': ['Marcus', 'Victoria', 'Alessandro', 'Priya', 'James', 'Sofia'],
        'closing deals': ['Victoria', 'Dominic', 'Isabella', 'Rafael', 'Zara', 'Phoenix'], 
        'confidence building': ['Sarah', 'Miguel', 'Aria', 'Kai', 'Luna', 'River'],
        'sales excellence': ['Jordan', 'Sage', 'Nova', 'Atlas', 'Echo', 'Quinn']
    }
    
    coach_names = coach_name_pools.get(coaching_focus['focus'], ['Alex', 'Casey', 'Taylor', 'Morgan', 'Cameron', 'Skyler'])
    
    # Use deterministic selection based on user input hash for consistency
    input_hash = hash(f"{product}{audience}{raw_goal}") % len(coach_names)
    coach_name = coach_names[input_hash]
    
    # **VARIED INTRODUCTION PATTERNS** - Different ways to start
    intro_patterns = [
        f"I see you're {interaction_verb}",
        f"I notice you're specializing in", 
        f"Your focus on",
        f"Working with",
        f"I can see your expertise lies in",
        f"You're positioned in the market with"
    ]
    intro_pattern = intro_patterns[input_hash % len(intro_patterns)]
    
    # **DETERMINISTIC INDUSTRY INSIGHTS** - Consistent variations per industry based on input
    industry_insight_variations = {
        'saas': [
            f"These prospects evaluate multiple software solutions, need technical validation, and require clear ROI timelines. They're {audience_profile['decision_style']} and typically concerned about integration complexity and vendor reliability.",
            f"This audience compares platforms extensively, demands proof-of-concept demonstrations, and focuses on scalability metrics. They prefer {audience_profile['decision_style']} approaches and worry about data migration and user adoption.",
            f"These technology buyers research extensively, require stakeholder buy-in, and prioritize long-term vendor partnerships. Their {audience_profile['decision_style']} nature means they value technical credibility and implementation support.",
            f"Software evaluators in this space demand detailed feature comparisons, security audits, and integration roadmaps. They make {audience_profile['decision_style']} decisions and focus on minimizing operational disruption."
        ],
        'consulting': [
            f"These clients value expertise demonstration, need cultural fit assessment, and require proof of strategic impact. They make {audience_profile['decision_style']} decisions and focus on long-term partnership potential.",
            f"Professional service buyers evaluate consultant credibility, seek relevant case studies, and demand clear methodology frameworks. Their {audience_profile['decision_style']} approach prioritizes relationship chemistry and measurable outcomes.",
            f"These strategic buyers assess consultant expertise depth, require industry-specific experience, and value collaborative working styles. They prefer {audience_profile['decision_style']} engagement models with defined success metrics.",
            f"Advisory service clients prioritize consultant track records, demand cultural alignment, and seek transformational thinking. They make {audience_profile['decision_style']} decisions based on strategic value and partnership fit."
        ],
        'education': [
            f"These prospects prioritize skill development ROI, need clear learning outcomes, and require flexible implementation. They're {audience_profile['decision_style']} and typically concerned about time investment and practical application.",
            f"Learning-focused buyers evaluate curriculum relevance, seek measurable skill improvements, and demand flexible scheduling options. Their {audience_profile['decision_style']} nature emphasizes practical results and career advancement.",
            f"Professional development seekers compare program effectiveness, require certification value, and prioritize hands-on learning experiences. They make {audience_profile['decision_style']} decisions focused on career impact and knowledge retention.",
            f"Training buyers assess content quality, demand interactive learning formats, and seek immediate applicability. Their {audience_profile['decision_style']} approach values proven methodologies and ongoing support."
        ],
        'luxury_consumer': [
            f"These consumers seek premium experiences, expect exceptional quality, and value exclusivity. They're {audience_profile['decision_style']} and typically concerned about craftsmanship, durability, and status enhancement.",
            f"Affluent buyers prioritize unique experiences, demand superior materials, and appreciate personalized service. Their {audience_profile['decision_style']} nature focuses on investment value and prestige factors.",
            f"Premium market consumers evaluate craftsmanship details, seek exclusive offerings, and value long-term investment potential. They make {audience_profile['decision_style']} decisions based on quality, uniqueness, and lifestyle enhancement.",
            f"Luxury buyers assess attention to detail, require white-glove service, and prioritize brand heritage. Their {audience_profile['decision_style']} approach emphasizes experiential value and social significance."
        ],
        'consumer': [
            f"These consumers research thoroughly, compare options carefully, and prioritize value for money. They're {audience_profile['decision_style']} and typically concerned about reliability, support, and long-term satisfaction.",
            f"Value-conscious buyers evaluate multiple alternatives, seek honest reviews, and demand transparent pricing. Their {audience_profile['decision_style']} nature prioritizes practical benefits and customer service quality.",
            f"Consumer market buyers compare features extensively, require warranty protection, and value user-friendly experiences. They make {audience_profile['decision_style']} decisions focused on reliability and ongoing support.",
            f"Practical consumers assess total cost of ownership, seek proven performance records, and prioritize ease of use. Their {audience_profile['decision_style']} approach emphasizes value, dependability, and satisfaction guarantees."
        ],
        'business': [
            f"These prospects evaluate practical value, need clear outcome demonstration, and require reasonable implementation timelines. They make {audience_profile['decision_style']} decisions and focus on measurable business impact.",
            f"Professional buyers assess solution effectiveness, demand proven results, and prioritize efficient implementation. Their {audience_profile['decision_style']} nature emphasizes practical outcomes and competitive advantages.",
            f"Business decision-makers evaluate cost-benefit ratios, require success case studies, and seek scalable solutions. They make {audience_profile['decision_style']} choices based on strategic value and operational efficiency.",
            f"Market professionals compare alternative solutions, demand ROI validation, and prioritize sustainable results. Their {audience_profile['decision_style']} approach focuses on business growth and competitive positioning."
        ]
    }
    
    insights_list = industry_insight_variations.get(industry, industry_insight_variations['business'])
    industry_insight = insights_list[input_hash % len(insights_list)]
    
    # **VARIED COACHING APPROACH DESCRIPTIONS** - Different ways to describe coaching
    coaching_approaches = [
        f"As your {coaching_focus['coaching_style']} coach, I'll help you master {audience_profile['type']} {interaction_type} through {coaching_context}",
        f"Working as your {coaching_focus['coaching_style']} mentor, I'll guide you through complex {audience_profile['type']} {interaction_type} using {coaching_context}",
        f"In my role as your {coaching_focus['coaching_style']} specialist, I'll develop your {audience_profile['type']} {interaction_type} skills via {coaching_context}",
        f"As your dedicated {coaching_focus['coaching_style']} advisor, I'll enhance your {audience_profile['type']} {interaction_type} through strategic {coaching_context}"
    ]
    coaching_approach = coaching_approaches[input_hash % len(coaching_approaches)]
    
    # **DETERMINISTIC ROLE-PLAY DESCRIPTIONS** - Consistent ways to describe practice scenarios  
    # Safe extraction of audience type for role-play scenarios
    audience_type_singular = audience_profile['type']
    if audience_type_singular.endswith('s') and len(audience_type_singular) > 1:
        audience_type_singular = audience_type_singular[:-1]
    elif audience_type_singular.endswith('ies'):
        audience_type_singular = audience_type_singular[:-3] + 'y'
    elif audience_type_singular.endswith('families'):
        audience_type_singular = 'family member'
    
    roleplay_descriptions = [
        f"where I act as a {audience_profile['decision_style']} {audience_type_singular} who understands {industry} dynamics",
        f"with me playing a {audience_profile['decision_style']} {audience_type_singular} familiar with {industry} challenges", 
        f"where I embody a {audience_profile['decision_style']} {audience_type_singular} experienced in {industry} solutions",
        f"featuring me as a {audience_profile['decision_style']} {audience_type_singular} versed in {industry} best practices"
    ]
    roleplay_description = roleplay_descriptions[input_hash % len(roleplay_descriptions)]
    
    # **DETERMINISTIC EXPERTISE POSITIONING** - Consistent ways to highlight unique value
    expertise_styles = [
        f"**What makes me different:** I understand {industry} dynamics ({audience_profile['sales_cycle']} complexity) and the {audience_profile['decision_style']} nature of {audience_profile['type']}.",
        f"**My unique advantage:** Deep {industry} expertise combined with understanding of {audience_profile['decision_style']} {audience_profile['type']} behavior patterns.",
        f"**What sets me apart:** Specialized knowledge of {industry} market dynamics and proven experience with {audience_profile['decision_style']} {audience_profile['type']}.",
        f"**My distinctive approach:** {industry.title()} industry insight paired with mastery of {audience_profile['decision_style']} {audience_profile['type']} psychology."
    ]
    expertise_style = expertise_styles[input_hash % len(expertise_styles)]
    
    # **DETERMINISTIC CHALLENGE REFRAMING** - Consistent ways to turn objections into advantages
    challenge_reframes = [
        f"Together, we'll turn their typical concerns like \"{audience_profile['pain_points'][0]}\" into competitive advantages.",
        f"We'll transform common challenges such as \"{audience_profile['pain_points'][0]}\" into your unique selling points.",
        f"I'll help you reframe obstacles like \"{audience_profile['pain_points'][0]}\" as opportunities for differentiation.",
        f"We'll convert typical pushback around \"{audience_profile['pain_points'][0]}\" into trust-building moments."
    ]
    challenge_reframe = challenge_reframes[input_hash % len(challenge_reframes)]
    
    # **DETERMINISTIC CALL-TO-ACTION** - Consistent endings
    cta_styles = [
        f"Ready to master {audience_profile['type']} {interaction_type} and achieve your goals?",
        f"Let's elevate your {audience_profile['type']} {interaction_type} to the next level!",
        f"Ready to transform your approach to {audience_profile['type']} {interaction_type}?",
        f"Time to dominate {audience_profile['type']} {interaction_type} – are you in?"
    ]
    cta = cta_styles[input_hash % len(cta_styles)]
    
    # **GENERATE HIGHLY VARIED PERSONA**
    advanced_persona = f"""### Meet {coach_name}, Your {coaching_focus['focus'].title()} Specialist

{intro_pattern} **{product}** for **{audience}**. {industry_insight}

{coaching_approach} {roleplay_description}. We'll practice {coaching_focus['practice_scenarios']} with a focus on {coaching_focus['expertise_areas'][0]} and {coaching_focus['expertise_areas'][1]}.

{expertise_style} {challenge_reframe}

{cta}"""
    
    return advanced_persona

def generate_smart_enhancements(form_data: dict) -> dict:
    """
    Generates high-quality enhancement suggestions using GPT-4o.
    
    Args:
        form_data: Dictionary containing user's original personalization data
        
    Returns:
        Dictionary with enhancement suggestions for value_prop, sales_context, methodology
    """
    # Try multiple ways to get OpenAI service
    openai_service = None
    
    # Method 1: Through api_manager extension
    if hasattr(current_app, 'extensions') and 'api_manager' in current_app.extensions:
        api_manager = current_app.extensions['api_manager']
        if hasattr(api_manager, 'get_service'):
            openai_service = api_manager.get_service('openai')
    
    # Method 2: Check if OpenAI service has a working client
    if openai_service and hasattr(openai_service, 'client') and openai_service.client:
        # Extract key data for enhancement generation
        product = form_data.get('core_q1_product', '')
        audience = form_data.get('core_q2_audience', '')
        goal = form_data.get('core_q5_goal', '')
        
        prompt = f"""
You are a world-class sales strategist helping create premium enhancement content for a sales professional.

**User's Current Data:**
- Product/Service: {product}
- Target Audience: {audience}  
- Improvement Goal: {goal}

**Task: Generate 3 high-quality enhancements:**

1. **Value Proposition** (2-3 sentences):
   - Must start with competitive framing ("Unlike...", "While others...", "Instead of...")
   - Focus on unique outcomes/benefits, NOT features
   - Be specific to their product and audience
   - Example: "Unlike generic sales training companies, we help entrepreneurs master conversations through AI that adapts to their specific industry challenges - cutting their learning curve from months to weeks."

2. **Sales Context** (2-3 sentences):
   - Professional description of their sales environment
   - Include process details (discovery, demos, cycle length)
   - Mention audience-specific considerations
   - Example: "B2B sales targeting fast-growing startups and SMBs. Typical process involves discovery calls, product demos, and stakeholder alignment meetings. Sales cycles range from 2-8 weeks depending on company size and decision-making complexity."

3. **Sales Methodology** (2-3 sentences):
   - Match methodology to their improvement goal
   - Provide specific approach details
   - Explain why it fits their situation
   - Example: "Consultative selling approach combined with challenger insights. Focus on understanding deep business needs through strategic questioning, then challenging assumptions to create urgency around the status quo."

**Output Format (JSON):**
{{
  "value_proposition": "[your value prop text]",
  "sales_context": "[your sales context text]", 
  "sales_methodology": "[your methodology text]"
}}

Make it professional, specific, and immediately usable.
"""

        try:
            completion = openai_service.client.chat.completions.create(
                model="gpt-4o",  # Premium model for highest quality
                messages=[
                    {"role": "system", "content": "You are a world-class sales strategist and business consultant. Generate premium, professional content that sales professionals can use immediately."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,  # Slightly higher for more creative/varied suggestions
                max_tokens=600,   # More tokens for detailed responses
            )
            
            response_text = completion.choices[0].message.content.strip()
            
            # Use robust JSON extraction with multiple fallback strategies
            enhancements = robust_json_extraction(response_text)
            if enhancements:
                logger.info("Successfully generated AI smart enhancements with robust extraction")
                return enhancements
            else:
                logger.warning(f"Robust JSON extraction failed. Response was: {response_text[:200]}...")
                return _fallback_enhancements(form_data)
                
        except Exception as e:
            logger.error(f"Error generating smart enhancements: {e}")
            return _fallback_enhancements(form_data)
    
    # Fall back to enhanced static generation
    logger.warning("OpenAI service not available. Using enhanced fallback enhancements.")
    return _fallback_enhancements(form_data)


def _fallback_enhancements(form_data: dict) -> dict:
    """Ultra-intelligent enhancement generation with advanced business reasoning"""
    product = normalize_input_text(form_data.get('core_q1_product', ''))
    value_prop_raw = normalize_input_text(form_data.get('core_q1_value', ''))
    audience = normalize_input_text(form_data.get('core_q2_audience', ''))
    goal = normalize_input_text(form_data.get('core_q5_goal', ''))
    
    # Advanced Business Intelligence
    def detect_industry_smart(product_text, value_text):
        text = f"{product_text} {value_text}".lower()
        
        if any(x in text for x in ['software', 'platform', 'app', 'saas', 'system', 'tool', 'dashboard']):
            return 'saas'
        elif any(x in text for x in ['consulting', 'advisory', 'strategy', 'coaching', 'mentoring']):
            return 'consulting' 
        elif any(x in text for x in ['training', 'course', 'education', 'learning', 'certification']):
            return 'education'
        elif any(x in text for x in ['marketing', 'advertising', 'design', 'creative', 'branding']):
            return 'agency'
        elif any(x in text for x in ['finance', 'investment', 'insurance', 'accounting']):
            return 'financial'
        elif any(x in text for x in ['tv', 'television', 'entertainment', 'outdoor', '3d', 'home theater', 'luxury', 'porch', 'backyard', 'pool', 'patio']):
            return 'luxury_consumer'
        elif any(x in text for x in ['car', 'auto', 'vehicle', 'real estate', 'house', 'home', 'furniture', 'appliance']):
            return 'consumer'
        else:
            # Default to 'business' instead of 'general' for better templating
            return 'business'
    
    def analyze_audience_psychology(audience_text):
        """Enhanced audience analysis with parenting/family support - duplicate for fallback function."""
        text = audience_text.lower()
        
        # CRITICAL FIX: Add parenting/family detection first
        if any(x in text for x in ['pregnant', 'pregnancy', 'expecting', 'new parent', 'new mom', 'new mother', 'new dad', 'new father', 'maternity', 'baby', 'infant', 'newborn', 'nursing', 'breastfeeding', 'postpartum']):
            return {
                'type': 'new parents and expecting families',
                'pain_points': ['comfort during pregnancy', 'preparing for baby', 'finding quality products', 'safety concerns'],
                'motivations': ['comfort', 'safety', 'preparing for family', 'quality investment'],
                'sales_cycle': '2-9 months',
                'decision_style': 'careful research, comfort-focused, safety-first'
            }
        elif any(x in text for x in ['family', 'families', 'parents', 'children', 'kids', 'household', 'home', 'domestic']):
            return {
                'type': 'families and households',
                'pain_points': ['finding family-friendly solutions', 'balancing needs', 'long-term value'],
                'motivations': ['family comfort', 'practical value', 'durability'],
                'sales_cycle': '1-6 months',
                'decision_style': 'family-focused, practical, value-conscious'
            }
        elif any(x in text for x in ['entrepreneur', 'startup', 'founder']):
            return {
                'type': 'entrepreneurs',
                'pain_points': ['limited time', 'scaling challenges', 'resource constraints'],
                'motivations': ['growth', 'competitive advantage', 'efficiency'],
                'sales_cycle': '1-4 weeks',
                'decision_style': 'fast, intuitive, results-focused'
            }
        elif any(x in text for x in ['enterprise', 'large company', 'corporation', 'large business']):
            return {
                'type': 'enterprise', 
                'pain_points': ['compliance', 'integration', 'stakeholder alignment'],
                'motivations': ['security', 'proven results', 'vendor reliability'],
                'sales_cycle': '6-18 months',
                'decision_style': 'committee-based, risk-averse, thorough'
            }
        elif any(x in text for x in ['small business', 'smb', 'local business']):
            return {
                'type': 'small businesses',
                'pain_points': ['budget constraints', 'limited staff', 'competing priorities'],
                'motivations': ['cost savings', 'simplicity', 'immediate results'],
                'sales_cycle': '2-8 weeks', 
                'decision_style': 'practical, value-focused, relationship-driven'
            }
        elif any(x in text for x in ['250-500', 'mid-size', 'medium', 'growing']):
            return {
                'type': 'mid-market companies',
                'pain_points': ['growth scaling', 'process optimization', 'resource allocation'],
                'motivations': ['efficiency', 'competitive advantage', 'scalability'],
                'sales_cycle': '4-12 weeks',
                'decision_style': 'results-focused, practical'
            }
        elif any(x in text for x in ['wealthy', 'affluent', 'luxury', 'high-end', 'premium', 'upscale', 'homeowner']):
            return {
                'type': 'affluent consumers',
                'pain_points': ['finding unique experiences', 'quality concerns', 'installation complexity'],
                'motivations': ['luxury lifestyle', 'investment', 'status'],
                'sales_cycle': '1-2 years',
                'decision_style': 'experience-focused, quality-driven, lifestyle-oriented'
            }
        elif any(x in text for x in ['homeowner', 'consumer', 'individual', 'family', 'personal']):
            return {
                'type': 'consumers',
                'pain_points': ['finding the right fit', 'installation concerns', 'warranty questions'],
                'motivations': ['practical value', 'ease of use', 'cost-benefit'],
                'sales_cycle': '1-3 years',
                'decision_style': 'research-driven, value-conscious, practical'
            }
        else:
            # Default to business professionals instead of 'general'
            return {
                'type': 'business professionals',
                'pain_points': ['efficiency challenges', 'growth constraints'],
                'motivations': ['better results', 'competitive advantage'],
                'sales_cycle': '2-6 weeks',
                'decision_style': 'results-focused, practical'
            }
    
    def detect_value_drivers(product_text, value_text):
        text = f"{product_text} {value_text}".lower()
        drivers = []
        
        if any(x in text for x in ['ai', 'artificial intelligence', 'machine learning']):
            drivers.append('ai_intelligence')
        if any(x in text for x in ['fast', 'quick', 'instant', 'speed', 'rapid']):
            drivers.append('speed')
        if any(x in text for x in ['personalized', 'customized', 'tailored', 'adaptive']):
            drivers.append('personalization')
        if any(x in text for x in ['results', 'roi', 'revenue', 'growth']):
            drivers.append('results')
        if any(x in text for x in ['simple', 'easy', 'intuitive']):
            drivers.append('simplicity')
            
        return drivers if drivers else ['effectiveness']
    
    # Perform intelligent analysis
    industry = detect_industry_smart(product, value_prop_raw)
    audience_profile = analyze_audience_with_ai(audience, openai_service)  # 🎯 NEW: AI-powered analysis!
    value_drivers = detect_value_drivers(product, value_prop_raw)
    primary_driver = value_drivers[0] if value_drivers else 'effectiveness'
    
    # Generate ultra-smart value proposition
    competitive_frames = {
        'ai_intelligence': 'While traditional solutions rely on manual processes',
        'speed': 'Unlike slow, outdated approaches',
        'personalization': 'Instead of one-size-fits-all solutions', 
        'results': 'While competitors focus on features over outcomes',
        'simplicity': 'Unlike overly complex alternatives'
    }
    
    frame = competitive_frames.get(primary_driver, 'Unlike traditional solutions')
    
    if industry == 'saas' and primary_driver == 'ai_intelligence':
        value_prop = f"""{frame}, our intelligent platform provides:
• AI-driven insights that learn from your specific business patterns
• Automated optimization that improves performance over time
• Predictive analytics that anticipate {audience_profile['type']} challenges
• Seamless integration designed for {audience_profile['motivations'][0]} focus

Built specifically for {audience_profile['type']} who need {audience_profile['motivations'][0]} without the complexity of traditional enterprise solutions."""
    
    elif industry == 'consulting' and audience_profile['type'] == 'entrepreneurs':
        value_prop = f"""{frame}, we deliver strategic guidance through:
• Rapid implementation cycles matching your {audience_profile['sales_cycle']} timeline
• Proven frameworks that address {audience_profile['pain_points'][0]} directly
• Hands-on expertise without the overhead of large consulting firms
• Results-driven approach focused on {audience_profile['motivations'][0]}

Designed for {audience_profile['type']} who value {audience_profile['decision_style']} decision making."""
        
    else:
        value_prop = f"""{frame}, our solution delivers:
• Strategic advantage through {primary_driver.replace('_', ' ')} optimization
• Measurable outcomes aligned with {audience_profile['type']} success metrics
• Risk mitigation addressing {audience_profile['pain_points'][0]}
• Scalable approach designed for {audience_profile['motivations'][0]}

Engineered for {audience_profile['type']} who prioritize {audience_profile['decision_style']} approaches."""
    
    # Generate intelligent sales context
    if industry == 'saas':
        sales_context = f"""B2B SaaS sales targeting {audience_profile['type']}. Technology-forward process featuring:
• Product demonstrations with real-world use cases
• Technical evaluation periods ({audience_profile['sales_cycle']} typical)
• ROI modeling and implementation planning
• Integration assessment and scalability discussion
• {audience_profile['decision_style']} procurement approach"""
    
    elif industry == 'consulting':
        sales_context = f"""Professional services sales to {audience_profile['type']}. Expertise-driven approach:
• Strategic discovery sessions assessing current challenges
• Customized solution development ({audience_profile['sales_cycle']} cycle)
• Case study presentations and reference validation
• Cultural fit assessment and team dynamics
• {audience_profile['decision_style']} engagement process"""
    
    else:
        sales_context = f"""Professional sales targeting {audience_profile['type']} in the {industry} sector:
• Industry-specific needs assessment and gap analysis
• Tailored solution presentations ({audience_profile['sales_cycle']} timeline)
• Competitive differentiation and value demonstration
• {audience_profile['decision_style']} decision facilitation"""
    
    # Generate psychology-based methodology
    goal_lower = goal.lower() if goal else ''
    
    if 'objection' in goal_lower:
        methodology = f"""Advanced objection management for {audience_profile['type']}:
• Pre-emptive addressing of common concerns: {', '.join(audience_profile['pain_points'])}
• Reframing techniques aligned with {audience_profile['decision_style']} thinking
• Social proof strategies targeting {audience_profile['motivations'][0]} motivation
• Risk reversal addressing {audience_profile['pain_points'][0]} specifically"""
    
    elif any(x in goal_lower for x in ['closing', 'conversion', 'deals']):
        methodology = f"""Strategic closing approach for {audience_profile['type']}:
• Urgency creation aligned with {audience_profile['motivations'][0]} drivers
• Decision facilitation for {audience_profile['decision_style']} buyers
• Multiple commitment levels addressing budget/timing concerns
• Success visualization targeting {audience_profile['motivations'][1]} outcomes"""
        
    elif 'confidence' in goal_lower:
        methodology = f"""Confidence-building methodology for {audience_profile['type']}:
• Industry-specific scenario practice and role-playing
• Preparation frameworks for {audience_profile['decision_style']} interactions
• Expertise demonstration through relevant case studies
• Success metrics aligned with {audience_profile['motivations'][0]} goals"""
        
    else:
        methodology = f"""Adaptive sales methodology for {audience_profile['type']}:
• Strategic approach leveraging {audience_profile['motivations'][0]} motivation
• Communication style matching {audience_profile['decision_style']} preferences
• Value demonstration addressing {audience_profile['pain_points'][0]} challenges
• Process optimization for {audience_profile['sales_cycle']} decision cycles"""
    
    return {
        "value_proposition": value_prop,
        "sales_context": sales_context,
        "sales_methodology": methodology
    } 

def summarize_text(text: str, summary_type: str = "product") -> str:
    """
    Summarizes the given text using OpenAI if available, otherwise uses a smart truncation fallback.
    """
    if not text:
        return ""

    # Attempt to use OpenAI for high-quality summarization
    openai_service = current_app.extensions.get('api_manager').get_service('openai') if current_app.extensions.get('api_manager') else None
    if openai_service and openai_service.client:
        try:
            prompt = f"Summarize the following description into a concise and compelling phrase for an AI sales coach persona. The description is about a {summary_type}. Focus on the core value and benefit. Be brief and impactful. DESCRIPTION: '{text}'"
            response = openai_service.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=60
            )
            summary = response.choices[0].message.content.strip().strip('"')
            logger.info(f"OpenAI summarization successful for {summary_type}.")
            return summary
        except Exception as e:
            logger.warning(f"OpenAI summarization failed, falling back to smart truncation. Error: {e}")

    # Fallback: Smart truncation for long descriptions
    if len(text) > 150:
        # Find a natural break point (sentence end)
        break_point = text.rfind('.', 0, 150)
        if break_point != -1:
            return text[:break_point+1]
        # If no sentence end, just truncate
        return text[:147] + "..."
    return text 

def analyze_audience_with_ai(audience_text: str, openai_service) -> dict:
    """
    Use AI to dynamically analyze ANY audience - no hardcoded categories needed!
    Handles everything from 'pregnant women' to 'pet owners' to 'circus performers'.
    """
    if not audience_text or not openai_service:
        return get_default_audience_profile()
    
    prompt = f"""
You are an expert sales psychologist. Analyze this target audience and return ONLY a JSON object with these exact fields:

AUDIENCE: "{audience_text}"

Return this exact JSON structure:
{{
  "type": "[descriptive audience type - be specific, e.g. 'expectant mothers', 'pet owners', 'theater performers', 'dental professionals']",
  "pain_points": ["[specific challenge 1]", "[specific challenge 2]", "[specific challenge 3]"],
  "motivations": ["[primary motivation]", "[secondary motivation]", "[tertiary motivation]"],
  "sales_cycle": "[realistic timeframe like '2-6 weeks', '3-9 months', etc.]",
  "decision_style": "[how they make decisions - be specific to this audience]"
}}

CRITICAL RULES:
- Be specific to the actual audience (not generic)
- Focus on WHO IS BUYING (not end users if different)
- Pain points should be realistic challenges this audience faces
- Motivations should reflect what drives their purchasing decisions
- Sales cycle should match typical buying behavior for this market
- Decision style should be specific to this audience type

Examples:
- "pregnant women" → buyers are expectant mothers preparing for baby
- "dogs" → buyers are pet owners who care about pet comfort  
- "performers" → buyers are creative professionals needing quality gear
- "small businesses" → buyers are business owners focused on growth
"""

    try:
        completion = openai_service.client.chat.completions.create(
            model="gpt-4o-mini",  # Faster model for analysis
            messages=[
                {"role": "system", "content": "You are a sales psychology expert. Return ONLY valid JSON with no additional text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for consistent analysis
            max_tokens=300
        )
        
        response_text = completion.choices[0].message.content.strip()
        
        # Use our robust JSON extraction
        audience_profile = robust_json_extraction(response_text)
        
        if audience_profile and isinstance(audience_profile, dict):
            # Validate required fields
            required_fields = ['type', 'pain_points', 'motivations', 'sales_cycle', 'decision_style']
            if all(field in audience_profile for field in required_fields):
                logger.info(f"AI successfully analyzed audience '{audience_text}' as '{audience_profile['type']}'")
                return audience_profile
        
        logger.warning(f"AI audience analysis returned invalid structure for '{audience_text}'")
        return get_enhanced_fallback_for_audience(audience_text)
        
    except Exception as e:
        logger.error(f"AI audience analysis failed for '{audience_text}': {e}")
        return get_enhanced_fallback_for_audience(audience_text)

def get_enhanced_fallback_for_audience(audience_text: str) -> dict:
    """
    Enhanced fallback that tries to intelligently guess based on keywords.
    Much smarter than defaulting to 'business professionals' for everything.
    """
    text = audience_text.lower()
    
    # Quick intelligent guesses for common cases
    if any(x in text for x in ['pregnant', 'expecting', 'new parent', 'maternity', 'baby']):
        return {
            'type': 'expectant and new parents',
            'pain_points': ['comfort during pregnancy', 'preparing for baby', 'finding safe products'],
            'motivations': ['baby safety', 'comfort', 'quality investment'],
            'sales_cycle': '2-6 months',
            'decision_style': 'careful research, safety-first'
        }
    elif any(x in text for x in ['dog', 'cat', 'pet', 'animal']):
        return {
            'type': 'pet owners',
            'pain_points': ['pet comfort', 'finding pet-safe products', 'durability concerns'],
            'motivations': ['pet wellbeing', 'quality', 'value'],
            'sales_cycle': '1-4 weeks',
            'decision_style': 'research-driven, pet-focused'
        }
    elif any(x in text for x in ['performer', 'artist', 'musician', 'actor', 'entertainer']):
        return {
            'type': 'creative professionals',
            'pain_points': ['finding quality gear', 'budget constraints', 'reliability needs'],
            'motivations': ['performance quality', 'artistic expression', 'professional image'],
            'sales_cycle': '2-8 weeks',
            'decision_style': 'quality-focused, experience-driven'
        }
    elif any(x in text for x in ['business', 'company', 'enterprise', 'startup']):
        return {
            'type': 'business decision makers',
            'pain_points': ['efficiency challenges', 'budget constraints', 'ROI concerns'],
            'motivations': ['business growth', 'competitive advantage', 'cost savings'],
            'sales_cycle': '4-12 weeks',
            'decision_style': 'results-focused, data-driven'
        }
    else:
        # Generic but reasonable fallback
        return {
            'type': 'consumers and professionals',
            'pain_points': ['finding the right solution', 'value for money', 'quality concerns'],
            'motivations': ['solving their problem', 'good value', 'reliable service'],
            'sales_cycle': '2-8 weeks',
            'decision_style': 'research-driven, value-conscious'
        }

def get_default_audience_profile() -> dict:
    """Safe default when everything fails."""
    return {
        'type': 'customers and clients',
        'pain_points': ['finding reliable solutions', 'getting good value', 'achieving their goals'],
        'motivations': ['solving problems', 'quality service', 'positive outcomes'],
        'sales_cycle': '2-6 weeks', 
        'decision_style': 'practical, results-oriented'
    } 