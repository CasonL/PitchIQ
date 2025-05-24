import os
import json
import logging
from dotenv import load_dotenv

# Assuming your app structure allows these imports from the root
# If not, we might need to adjust sys.path or how services are loaded.
from app.services.gpt4o_service import GPT4oService, get_gpt4o_service
from app.services.conversation_state_manager import ConversationStateManager

# Setup basic logging for the test script
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_test_conversation():
    # --- Configuration ---
    # 1. Load .env file if you use one for OPENAI_API_KEY
    load_dotenv() 
    
    # 2. Ensure OPENAI_API_KEY is available
    #    GPT4oService will try to get it from Flask app config (if in app context)
    #    or os.environ. For standalone, os.environ is most direct.
    if not os.environ.get('OPENAI_API_KEY'):
        logger.error("OPENAI_API_KEY not found in environment variables. Please set it.")
        # You might want to prompt the user for it here for ease of testing,
        # or ensure your .env file is correctly loaded and populated.
        # For now, exiting if not found.
        # Example: os.environ['OPENAI_API_KEY'] = input("Enter your OpenAI API Key: ")
        return

    # 3. Initialize the GPT4oService
    #    Since this is outside Flask app context, GPT4oService will use os.environ.
    try:
        # Pass the API key directly if preferred, or let it find from os.environ
        # gpt_service = GPT4oService(api_key=os.environ.get('OPENAI_API_KEY'))
        gpt_service = get_gpt4o_service() # Relies on os.environ.get in this standalone context
        if not gpt_service.api_available:
            logger.error("GPT service not available. Check API key and connectivity.")
            return
        logger.info("GPT4oService initialized successfully for testing.")
    except Exception as e:
        logger.error(f"Error initializing GPT4oService: {e}")
        return

    # --- Define Test Data (Phase 1: Consistent Persona) ---
    # test_persona_emily = {
    #     "name": "Emily Carter",
    #     "role": "Logistics Coordinator",
    #     "business_description": "Emily is a detail-oriented Logistics Coordinator at 'Efficient Shipments Inc.', a mid-sized company (around 150 employees) in the logistics and supply chain sector. Efficient Shipments Inc. specializes in national freight forwarding but is struggling with outdated tracking software, leading to operational inefficiencies and customer complaints. Emily's team is directly impacted by these issues.",
    #     "longterm_personal_description": {
    #         "family_relationships": "Married, two young children (ages 5 and 7). Values family time immensely.",
    #         "education": "Bachelor's degree in Business Administration with a focus on Supply Chain Management from a state university.",
    #         "hobbies_interests": "Enjoys reading mystery novels, gardening on weekends, and is a casual fan of the local college football team. Used to play volleyball in high school.",
    #         "favorite_things": {"food": "Italian", "travel": "Beach vacations", "music": "Country and Pop"},
    #         "dreams_ambitions": "Professionally, Emily hopes to streamline operations at her current company to reduce stress for her team and improve customer satisfaction. Personally, she dreams of taking her family on a big vacation once the kids are a bit older.",
    #         "general_disposition": "Generally an organized and thoughtful person, but can get flustered when under significant pressure."
    #     },
    #     "shortterm_personal_description": {
    #         "recent_life_events": "Her youngest child just started kindergarten, which has been a bit of an emotional adjustment but also freeing up some of her morning time. This week, she's also dealing with a minor plumbing issue at home.",
    #         "current_mood_impact": "Slightly preoccupied due to the home issue, but professionally motivated to find solutions for work as the software problems have been particularly bad this past month."
    #     },
    #     "demographic_description": {
    #         "age_group": "Mid-30s",
    #         "region_cultural_background": "Grew up in the Southeastern US (e.g., Georgia/Carolinas), has a polite and generally agreeable demeanor, but can be firm when necessary. Might use occasional mild Southern colloquialisms like 'y'all' or 'fixin' to' when relaxed, but maintains professional language in business settings.",
    #         "communication_style_notes": "Prefers clear, straightforward communication. Appreciates when people get to the point but doesn't mind a brief, friendly chat to start. Values honesty and transparency."
    #     },
    #     "base_reaction_style": "Cautious_Pragmatist",
    #     "intelligence_level": "average",
    #     "personality_traits": {
    #         "detail_orientation": 0.8,
    #         "skepticism": 0.6,
    #         "patience": 0.7,
    #         "openness_to_new_ideas": 0.5,
    #         "agreeableness": 0.7,
    #         "stress_tolerance": 0.4
    #     },
    #     "emotional_state": "Slightly Stressed",
    #     "buyer_type": "User",
    #     "decision_authority": "Low (Recommender)",
    #     "industry_context": "Logistics and Supply Chain",
    #     "pain_points": ["Outdated tracking software leads to delays and errors", "Lack of real-time visibility into shipments", "Difficult to generate accurate performance reports", "Manual data entry is time-consuming and prone to mistakes"],
    #     "primary_concern": "Finding a reliable, user-friendly, and easy-to-implement shipment tracking software that integrates well with existing systems.",
    #     "objections": ["Concerned about the cost and complexity of data migration from the old system", "Worried about the learning curve and training time for her team", "Needs assurance about ongoing support and system reliability"],
    #     "cognitive_biases": {"Status_Quo_Bias": 0.7, "Anchoring": 0.5, "Availability_Heuristic": 0.6},
    #     "business_context": "B2B",
    #     "linguistic_style_cue": "Neutral Professional with a hint of Southern US English (e.g., occasional 'y'all', polite, slightly more anectdotal when comfortable)",
    #     "chattiness_level": "medium"
    # }

    test_persona = {
        "name": "David Lee",
        "role": "Owner of Innovate & Create Co.",
        "business_description": "David runs 'Innovate & Create Co.', a bustling small graphic design and marketing agency with a team of 5. He's passionate about fostering creativity and efficiency, constantly seeking tools that can enhance workflow and collaboration without stifling his team's innovative spirit.",
        "longterm_personal_description": {
            "family_relationships": "Happily married, actively involved in coaching his kid's soccer team on weekends.",
            "education": "Degree in Graphic Design, self-taught in many aspects of business management.",
            "hobbies_interests": "Big sci-fi movie buff, enjoys tinkering with new gadgets, and occasionally attempts ambitious DIY home projects.",
            "favorite_things": {"food": "Spicy ramen", "travel": "Tech conferences and city explorations", "music": "Indie electronic and classic rock"},
            "dreams_ambitions": "His biggest professional dream is for 'Innovate & Create Co.' to win a prestigious design award. Personally, he hopes to one day design and build his own smart home from scratch.",
            "general_disposition": "Optimistic, energetic, and generally approachable. Gets excited by new ideas."
        },
        "shortterm_personal_description": {
            "recent_life_events": "Just returned from an inspiring national design conference last week and is buzzing with new ideas for the agency.",
            "current_mood_impact": "Feeling highly motivated, creative, and eager to explore solutions that can bring some of that conference energy into his team's daily work."
        },
        "demographic_description": {
            "age_group": "Early 40s",
            "region_cultural_background": "Based on the West Coast, USA (e.g., California). Embodies a bit of the startup hustle culture – energetic, informal in conversation, and comfortable using some modern tech or design slang.",
            "communication_style_notes": "Values creative brainstorming and open dialogue. Appreciates enthusiasm and a forward-thinking approach. Not afraid to challenge traditional methods if a better, newer way is proposed."
        },
        "base_reaction_style": "Enthusiastic_EarlyAdopter",
        "intelligence_level": "average", # Can be "high" if we want him to grasp complex ideas quickly
        "chattiness_level": "high",
        "personality_traits": {
            "agreeableness": 0.8,
            "openness_to_new_ideas": 0.9,
            "skepticism": 0.3, # Lower skepticism for an early adopter
            "patience": 0.6,
            "stress_tolerance": 0.7, # Handles the pressure of a small agency
            "enthusiasm": 0.9 # Added trait
        },
        "emotional_state": "Optimistic and Energized",
        "buyer_type": "Decision Maker", # As owner
        "decision_authority": "High (Final Decision Maker)",
        "industry_context": "Creative Services / Marketing Agency",
        "pain_points": [
            "Current project management tools feel clunky and stifle creativity.",
            "Team collaboration on visual assets is inefficient, with feedback getting lost.",
            "Struggles to get his creative team to consistently use existing PM software.",
            "Wastes time on administrative tasks instead of design or client strategy."
        ],
        "primary_concern": "Finding a project management and collaboration tool that his creative team will actually enjoy using, one that streamlines visual feedback and helps them meet deadlines without feeling overly corporate or restrictive.",
        "objections": [
            "Concerned that new software might be too rigid for a creative workflow.",
            "Worries about the time investment for the team to learn another new tool.",
            "Price is a factor for a small agency, needs clear ROI."
        ],
        "cognitive_biases": {"Novelty_Bias": 0.7, "Optimism_Bias": 0.6, "Bandwagon_Effect": 0.5}, # Biases fitting an early adopter
        "business_context": "B2B", # Selling to his business
        "linguistic_style_cue": "Informal, energetic, uses some modern slang or tech-adjacent terms (e.g., 'let's jam on that', 'what's the bandwidth?', 'level up'). Friendly and approachable, often expresses enthusiasm."
    }

    user_info = {
        "name": "Cason",
        "experience_level": "intermediate"
    }

    messages = []
    conversation_id = "test_voice_mvp_001"

    # --- Conversation Loop ---
    logger.info(f"Starting 10-Minute Voice Discovery Call MVP Test with {test_persona['name']}.")
    logger.info("Type 'quit' to end the conversation.")

    turn_count = 0
    while True:
        turn_count += 1
        user_input = input(f"\n{user_info['name']} (Turn {turn_count}): ")
        if user_input.lower() == 'quit':
            logger.info("Ending conversation.")
            break

        messages.append({"role": "user", "content": user_input})

        persona_business_context = test_persona.get("business_context", "B2B")
        
        try:
            state_manager = ConversationStateManager(messages, business_context=persona_business_context) 
            conversation_state = state_manager.get_conversation_state()
            logger.info(f"Conversation State (Turn {turn_count}): {conversation_state}")
        except Exception as csm_e:
            logger.error(f"Error with ConversationStateManager: {csm_e}")
            conversation_state = None

        try:
            ai_response_text = gpt_service.generate_roleplay_response(
                persona=test_persona,
                messages=list(messages),
                conversation_state=conversation_state,
                user_info=user_info,
                conversation_id=conversation_id
            )
            print(f"\n{test_persona['name']} (AI): {ai_response_text}")
            messages.append({"role": "assistant", "content": ai_response_text})

        except Exception as e:
            logger.error(f"Error getting AI response: {e}")
            print("\nAI: Sorry, I encountered an error.")
    
    logger.info("\n--- Conversation Ended ---")
    logger.info("Final message history:")
    for msg in messages:
        logger.info(f"- {msg['role']}: {msg['content']}")

if __name__ == '__main__':
    run_test_conversation() 