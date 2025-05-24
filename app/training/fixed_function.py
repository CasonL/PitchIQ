def generate_ai_response_fixed(message, session_object):
    """Generate an AI response from the buyer persona for the provided user message."""
    try:
        from app.services.claude_service import get_claude_service
        
        logger.info(f"Generating AI response for session {session_object.id}")
        
        # Get the buyer persona
        buyer_persona = session_object.buyer_persona
        if not buyer_persona:
            logger.error(f"No buyer persona found for session {session_object.id}")
            return "I'm sorry, but I'm having trouble accessing the buyer persona information. Please try again or start a new session.", session_object
        
        # Get the conversation history
        conversation_history = session_object.conversation_history_dict
        if not conversation_history:
            conversation_history = []
            
        # Add the current message to the conversation history temporarily
        conversation_with_new_message = conversation_history + [{"role": "user", "content": message}]

        # Get the Claude service
        claude_service = get_claude_service()
        
        # Get the user's profile to personalize the experience
        user_profile = UserProfile.query.get(session_object.user_profile_id)
        
        # Safely get user name - handle the case where user object may not have username
        user_name = "Salesperson"  # Default fallback
        try:
            if user_profile and hasattr(user_profile, 'user') and user_profile.user:
                if hasattr(user_profile.user, 'username') and user_profile.user.username:
                    user_name = user_profile.user.username
                elif hasattr(user_profile.user, 'email') and user_profile.user.email:
                    # Use part before @ in email as username
                    user_name = user_profile.user.email.split('@')[0]
        except Exception as name_error:
            logger.warning(f"Failed to get username: {name_error}")
            # Continue with default name
        
        # Prepare sales context for the roleplay
        sales_info = {
            "product_service": getattr(user_profile, 'product_service', "Unknown product"),
            "target_market": getattr(user_profile, 'target_market', "Unknown market"),
            "industry": getattr(user_profile, 'industry', "Various industries")
        }
        
        # Use the specialized roleplay response method which has better prompting
        try:
            ai_response = claude_service.generate_roleplay_response(
                conversation_history=conversation_with_new_message,
                persona=buyer_persona.description,
                sales_info=sales_info,
                user_name=user_name
            )
            
            # Handle both string responses and split message responses (as dictionary)
            if isinstance(ai_response, dict) and 'response' in ai_response and 'follow_up' in ai_response:
                logger.info(f"Generated split message response for session {session_object.id}")
                # Return the entire response dictionary
                return ai_response, session_object
            else:
                # Handle normal string responses
                return ai_response, session_object
        
        except Exception as e:
            logger.error(f"Claude API error: {str(e)}")
            return "I'm sorry, but I'm experiencing some technical difficulties. Could you please try again or rephrase your question?", session_object
    
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.", session_object 