from flask import Blueprint, request, jsonify
import re # For simple keyword checking
from . import api

# Define more detailed (simulated) expectations for achievements
ACHIEVEMENT_EXPECTATIONS = {
    "product_basics": {
        "description": "Product Fundamentals",
        "criteria": [
            {
                "key": "target_audience_need", 
                "prompt": "Who is your primary audience (e.g., specific industries or roles), and what's the main challenge they face that your product addresses?", 
                "short_ack": "your target audience and their core challenge",
                "hint": "Describe the typical company size or job title, and the key frustration they have before using your solution.",
                "keywords": ["audience", "customer", "user", "industry", "role", "market", "challenge", "problem", "pain point", "need", "solve", "for whom", "target", "clients", "sector", "niche", "struggle", "difficulty", "issue"]
            },
            {
                "key": "solution_adaptability", 
                "prompt": "How does your product work to solve this challenge, and can it adapt to different user situations or needs?", 
                "short_ack": "how your solution addresses the challenge and its adaptability",
                "hint": "Explain the core process or features. Mention if it can be customized or configured for specific scenarios.",
                "keywords": ["how it works", "solution", "feature", "function", "process", "adapt", "custom", "customize", "flexible", "tailor", "specific needs", "various users", "mechanism", "handles", "works by", "method", "approach", "adjust", "configure", "versatile", "dynamic"]
            },
            {
                "key": "value_accessibility",
                "prompt": "What are the key benefits or value users gain, and what does the general pricing or investment look like?",
                "short_ack": "the key value offered and how to access it (pricing)",
                "hint": "Focus on the main 1-2 results users achieve (e.g., save time, increase revenue). Give a general idea of cost (e.g., subscription tiers, project fee range).",
                "keywords": ["value", "benefit", "outcome", "result", "achieve", "pricing", "cost", "investment", "model", "fee", "access", "get started", "ROI", "advantage", "gain", "pay", "subscribe", "purchase", "buy", "tiers", "plan"]
            }
        ],
        "full_marks_advice": "You've clearly explained your product's fundamentals, including who it's for, how it helps them, and how they can access its value. Well done!"
    },
    "product_features": {
        "description": "Product Features",
        "criteria": [
            {"key": "list_features", "prompt": "listing at least 2-3 key features or distinct capabilities", "keywords": ["feature", "capability", "function", "module", "component", "aspect", "part"]},
            {"key": "feature_benefit", "prompt": "explaining the benefit or value of at least one key feature (how it helps the user)", "keywords": ["benefit", "helps", "allows", "enables", "improves", "automates", "streamlines", "value"]},
            # {"key": "how_it_works", "prompt": "giving a sense of how a feature works or its mechanism", "keywords": ["how it works", "process", "mechanism", "uses", "integrates", "by doing"]}
        ],
        "full_marks_advice": "You've provided a good overview of your product's key features and their benefits! Excellent work."
    },
    "product_problems": {
        "description": "Problem Solver Focus",
        "criteria": [
            {"key": "identify_pain", "prompt": "clearly identifying 2-3 specific customer problems or pain points your product addresses", "keywords": ["problem", "pain point", "challenge", "issue", "struggle", "frustration", "difficulty"]},
            {"key": "link_solution", "prompt": "explicitly linking how your product/service solves or alleviates these problems", "keywords": ["solves", "addresses", "eliminates", "reduces", "overcomes", "helps with"]}
        ],
        "full_marks_advice": "You've effectively detailed the problems your product solves. Great job connecting the dots for your customers!"
    },
    "product_differentiation": {
        "description": "Value Proposition Clarity",
        "criteria": [
            {"key": "identify_competitors", "prompt": "mentioning who or what your customers might compare you to (alternatives or competitors)", "keywords": ["competitor", "alternative", "compare to", "instead of", "unlike"]},
            {"key": "state_advantage", "prompt": "articulating at least one clear advantage or unique selling point (USP) against those alternatives", "keywords": ["advantage", "unique", "better", "different", "only we", "stand out", "special"]}
        ],
        "full_marks_advice": "Your unique selling points are coming through clearly! This is key to standing out."
    },
    # Market Understanding Achievements - Placeholders
    "market_identification": {
        "description": "Market Identifier",
        "criteria": [
            # Example: {"key": "target_industries", "prompt": "the specific industries or sectors you target", "keywords": ["industry", "sector", "vertical", "market segment"]}
        ],
        "full_marks_advice": "You've successfully identified your target market segments!"
    },
    "buyer_persona": {
        "description": "Buyer Profiler",
        "criteria": [
            # Example: {"key": "ideal_customer_role", "prompt": "the typical roles or job titles of your ideal customers", "keywords": ["role", "title", "persona", "ideal customer"]}
        ],
        "full_marks_advice": "Your understanding of the ideal buyer persona is excellent!"
    },
    "pain_points": {
        "description": "Pain Point Analyst",
        "criteria": [
            # Example: {"key": "customer_challenges", "prompt": "the specific challenges or frustrations your customers face that your product solves", "keywords": ["pain point", "challenge", "frustration", "problem solved"]}
        ],
        "full_marks_advice": "You've clearly articulated the customer pain points. Well done!"
    },
    "buyer_motivations": {
        "description": "Buyer Psychology Expert",
        "criteria": [
            # Example: {"key": "purchase_drivers", "prompt": "the key motivations or reasons why customers choose your solution", "keywords": ["motivation", "reason to buy", "goal achieved", "value driver"]}
        ],
        "full_marks_advice": "You have a strong grasp of buyer motivations!"
    },
    # Sales Context Achievements - Placeholders
    "sales_cycle": {
        "description": "Sales Cycle Navigator",
        "criteria": [
            # Example: {"key": "cycle_length", "prompt": "the typical length of your sales cycle and its key stages", "keywords": ["sales cycle", "timeline", "process stages", "duration"]}
        ],
        "full_marks_advice": "Your map of the sales cycle is comprehensive!"
    },
    "decision_process": {
        "description": "Decision Process Cartographer",
        "criteria": [
            # Example: {"key": "decision_makers", "prompt": "who is typically involved in the purchase decision and their roles", "keywords": ["decision maker", "buying committee", "approval process"]}
        ],
        "full_marks_advice": "You've clearly outlined the customer decision-making process!"
    },
    "objection_handling": {
        "description": "Objection Handler",
        "criteria": [
            # Example: {"key": "common_objections", "prompt": "at least two common objections and how you typically address them", "keywords": ["objection", "concern", "pushback", "response"]}
        ],
        "full_marks_advice": "You're well-prepared to handle common objections!"
    },
    "competitive_landscape": {
        "description": "Competitive Strategist",
        "criteria": [
            # Example: {"key": "main_competitors", "prompt": "who your main competitors are and your key differentiators against them", "keywords": ["competitor", "alternative", "differentiator", "vs"]}
        ],
        "full_marks_advice": "Your understanding of the competitive landscape is spot on!"
    }
}

def check_criteria(text, criteria_keywords):
    text_lower = text.lower()
    match_count = 0
    # Keep track of keywords already matched in this text to count distinct matches
    matched_keywords_in_text = set()
    for keyword in criteria_keywords:
        keyword_lower = keyword.lower()
        # Check if this keyword was already found in this text
        if keyword_lower in matched_keywords_in_text:
            continue 
        # Use regex for whole word matching
        if re.search(r"\b" + re.escape(keyword_lower) + r"\b", text_lower):
            matched_keywords_in_text.add(keyword_lower)
            match_count += 1
            if match_count >= 2: # Require at least 2 distinct keyword matches
                return True
    return False # Return False if fewer than 2 distinct keywords were found

@api.route('/dashboard/get-achievement-advice', methods=['POST'])
def get_achievement_advice():
    data = request.get_json()
    achievement_id = data.get('achievementId')
    current_stage_text = data.get('currentStageText', '')
    current_score_from_ui = data.get('currentScore', 0) # Get current score from UI

    # --- ADD LOGGING HERE ---
    print(f"[API /get-achievement-advice] Received achievementId: {achievement_id}")
    print(f"[API /get-achievement-advice] Received currentStageText (first 100 chars): '{current_stage_text[:100]}'")
    print(f"[API /get-achievement-advice] Received currentScoreFromUI: {current_score_from_ui}")
    # --- END LOGGING ---

    if not achievement_id or achievement_id not in ACHIEVEMENT_EXPECTATIONS:
        # Handle unknown or missing achievement_id gracefully
        fallback_advice = f"Could not retrieve specific advice for '{achievement_id}'. Please ensure you are discussing the relevant topic."
        if isinstance(current_score_from_ui, int) and current_score_from_ui >= 95:
            fallback_advice = f"You seem to be doing well on '{achievement_id}'!"
        return jsonify({"advice": fallback_advice, "total_criteria": 0, "met_criteria_count": 0, "calculated_score": current_score_from_ui if isinstance(current_score_from_ui, int) else 0}), 200

    expectation = ACHIEVEMENT_EXPECTATIONS[achievement_id]
    description_text = expectation["description"]

    met_criteria_details = [] 
    unmet_criteria = [] # Store the full criterion object for unmet items too
    for criterion in expectation["criteria"]:
        if check_criteria(current_stage_text, criterion["keywords"]):
            met_criteria_details.append(criterion)
        else:
            unmet_criteria.append(criterion) # Store unmet criterion object

    total_criteria_count = len(expectation["criteria"])
    num_met_criteria = len(met_criteria_details)

    calculated_score_based_on_criteria = 0
    if total_criteria_count > 0:
        calculated_score_based_on_criteria = round((num_met_criteria / total_criteria_count) * 100)

    # Generate advice string
    if not unmet_criteria: # All criteria met based on our check
        # Even if all criteria met, the score might not be 100 if based on other factors initially.
        # Use the full_marks_advice.
        generated_advice = expectation.get("full_marks_advice", f"Excellent work on '{description_text}'!")
    else: # There ARE unmet criteria.
        advice_parts = []
        for criterion in unmet_criteria:
            prompt_text = criterion["prompt"]
            hint = criterion.get("hint")
            line = f"- {prompt_text}"
            if hint:
                line += f" (Hint: {hint})"
            advice_parts.append(line)
        
        # Join with newlines. If only one unmet, it will just be that one line.
        generated_advice = "\n".join(advice_parts)

    return jsonify({
        "advice": generated_advice.strip(),
        "total_criteria": total_criteria_count,
        "met_criteria_count": num_met_criteria,
        "calculated_score": calculated_score_based_on_criteria
    }), 200 