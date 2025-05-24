"""
Chat routes for the Sales Training AI application.

This module provides routes for the chat interface, conversation management, 
and interaction with the Claude AI service.
"""
from flask import Blueprint, render_template, request, jsonify, g, redirect, url_for
from flask_login import login_required, current_user
from models import db, User, Conversation, Message
from claude_service import claude_service
from datetime import datetime
from typing import List, Dict, Any, Optional
import json

# Create blueprint
chat = Blueprint('chat', __name__, url_prefix='/chat')

@chat.route('/dashboard')
@login_required
def dashboard():
    """User dashboard page."""
    # Get user's conversations
    conversations = Conversation.query.filter_by(user_id=current_user.id).order_by(Conversation.updated_at.desc()).limit(5).all()
    print(f"Type of conversations: {type(conversations)}")
    print(f"Contents: {conversations}")
    return render_template('dashboard.html', user=current_user, conversations=conversations)

@chat.route('/')
@login_required
def chat_page():
    """Main chat interface."""
    # Check for conversation ID
    conversation_id = request.args.get('conversation')
    
    if conversation_id:
        # Load existing conversation
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first_or_404()
    else:
        # Create new conversation
        conversation = Conversation(user_id=current_user.id)
        db.session.add(conversation)
        db.session.commit()
    
    # Get all user conversations for sidebar
    conversations = Conversation.query.filter_by(user_id=current_user.id).order_by(Conversation.updated_at.desc()).all()
    
    return render_template('chat.html', conversation=conversation, conversations=conversations)

@chat.route('/<int:conversation_id>/message', methods=['POST'])
@login_required
def send_message(conversation_id):
    """Send a message to the AI."""
    try:
        # Find conversation
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first_or_404()
        
        # Get message content
        data = request.get_json()
        message_content = data.get('message', '').strip()
        
        if not message_content:
            return jsonify({'error': 'Message content is required'}), 400
        
        # Create user message
        user_message = Message(
            conversation_id=conversation.id,
            role='user',
            content=message_content
        )
        db.session.add(user_message)
        db.session.commit()  # Commit to ensure message is saved
        
        # Generate AI response
        message_count = Message.query.filter_by(conversation_id=conversation.id).count()
        
        # Only use handle_first_message for the first few messages while gathering info
        if message_count <= 3:  # Allow for a couple of back-and-forths to collect info
            ai_response = handle_first_message(conversation, message_content)
        else:
            ai_response = generate_ai_response(conversation, message_content)
        
        # Create AI message
        ai_message = Message(
            conversation_id=conversation.id,
            role='assistant',
            content=ai_response
        )
        db.session.add(ai_message)
        
        # Update conversation timestamp
        conversation.updated_at = datetime.utcnow()
        
        # Generate title if needed
        if (not conversation.title or conversation.title == "New Conversation") and message_count <= 2:
            words = message_content.split()
            if len(words) > 2:
                new_title = " ".join(words[:5])
                if len(new_title) > 30:
                    new_title = new_title[:27] + "..."
                conversation.title = new_title
        
        # Save all changes
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': {
                'role': 'assistant',
                'content': ai_response,
                'timestamp': ai_message.timestamp.isoformat()
            }
        })
    except Exception as e:
        # Log the error but return JSON
        print(f"Error in send_message: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': f"An error occurred: {str(e)}"
        }), 500

# Step 1: Update the chat_routes.py file to add proper error handling

@chat.route('/<int:conversation_id>/feedback')
@login_required
def get_feedback(conversation_id):
    """Get AI feedback on the conversation."""
    try:
        # Find conversation
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first_or_404()
        
        # Get messages
        messages = Message.query.filter_by(conversation_id=conversation.id).order_by(Message.timestamp).all()
        
        # Debug logging
        print("Total messages found:", len(messages))
        for msg in messages:
            print(f"Message {msg.id}: Role={msg.role}, Content length={len(msg.content)}")
            print(f"Content preview: {msg.content[:100]}...")
        
        if len(messages) < 4:
            return jsonify({
                'status': 'error', 
                'error': f'Not enough conversation history. Only {len(messages)} messages found.'
            }), 400
        
        # Format messages for Claude
        formatted_messages = [
            {'role': msg.role, 'content': msg.content} for msg in messages
        ]
        
        # Debug logging for formatted messages
        print("Formatted Messages:")
        for msg in formatted_messages:
            print(f"Role: {msg['role']}, Content length: {len(msg['content'])}")
        
        # Generate feedback
        feedback = claude_service.generate_feedback(formatted_messages)
        
        # Update user's stats based on feedback
        update_user_stats(current_user, feedback)
        
        # Increment completed roleplays
        current_user.completed_roleplays += 1
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'feedback': feedback
        })
    except Exception as e:
        # Log the full error details
        import traceback
        print("Full error traceback:")
        traceback.print_exc()
        
        return jsonify({
            'status': 'error',
            'error': f"Error generating feedback: {str(e)}"
        }), 500

# Step 2: Update the claude_service.py file to fix the generate_feedback method

def generate_feedback(self, conversation_history: List[Dict[str, str]]) -> str:
    """
    Generate comprehensive feedback on a sales conversation.
    
    Args:
        conversation_history: List of message dictionaries with 'role' and 'content'
        
    Returns:
        Structured feedback on the sales conversation
    """
    system_prompt = """Analyze this sales roleplay conversation between a salesperson (user) and a customer (assistant).
Provide an in-depth, comprehensive analysis with these sections:

### OVERALL SCORE
Rate the salesperson's performance on a scale of 1-10 and provide a brief justification.

### SKILL ANALYSIS
- Rapport Building: Score 1-10, with specific examples and comments
- Needs Discovery: Score 1-10, with specific examples and comments
- Objection Handling: Score 1-10, with specific examples and comments
- Closing Technique: Score 1-10, with specific examples and comments
- Product Knowledge: Score 1-10, with specific examples and comments

### KEY STRENGTHS
List 3-5 specific strengths with examples from the conversation.

### IMPROVEMENT OPPORTUNITIES
List 3-5 specific areas for improvement with examples from the conversation.

### STRATEGIC RECOMMENDATIONS
Provide 3-5 detailed, actionable recommendations the salesperson could implement immediately.

### SAMPLE PHRASES
Provide 3-5 alternative phrases or questions the salesperson could have used at critical moments.

Be specific, balanced, and focus on concrete evidence from the conversation.
"""
    
    try:
        # Send the request to Claude with lower temperature for more consistent feedback
        return self.generate_response(conversation_history, system_prompt, temperature=0.3)
    except Exception as e:
        print(f"Error in generate_feedback: {str(e)}")
        raise

@chat.route('/<int:conversation_id>', methods=['DELETE'])
@login_required
def delete_conversation(conversation_id):
    """Delete a conversation."""
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first_or_404()
    
    db.session.delete(conversation)
    db.session.commit()
    
    return jsonify({'status': 'success'})

def handle_first_message(conversation, message_content):
    """
    Handle the first message in a conversation to collect context and generate persona.
    """
    try:
        # First, try to extract information from the message
        if not conversation.sales_experience:
            extracted_experience = extract_sales_experience(message_content)
            if extracted_experience:
                conversation.sales_experience = extracted_experience
                db.session.commit()
                print(f"Extracted sales experience: {extracted_experience}")

        if not conversation.product_service:
            extracted_product = extract_product_service(message_content)
            if extracted_product:
                conversation.product_service = extracted_product
                db.session.commit()
                print(f"Extracted product/service: {extracted_product}")

        if not conversation.target_market:
            extracted_market = extract_target_market(message_content)
            if extracted_market:
                conversation.target_market = extracted_market
                db.session.commit()
                print(f"Extracted target market: {extracted_market}")

        # Now check what information we still need
        if not conversation.sales_experience:
            return "Thanks for starting a roleplay! To create a realistic scenario, I need to know how long you've been in sales. Could you tell me about your sales experience?"

        if not conversation.product_service:
            return f"Thanks! You have {conversation.sales_experience} of sales experience. What product or service will you be selling in this roleplay?"

        if not conversation.target_market:
            # Fix the truncated message
            return f"Great! So you'll be selling {conversation.product_service}. Is your target market B2B (business-to-business), B2C (business-to-consumer), or a mix of both?"

        # If we have all the info, generate persona
        sales_info = {
            'product_service': conversation.product_service,
            'target_market': conversation.target_market,
            'sales_experience': conversation.sales_experience
        }
        
        print(f"Generating persona with sales info: {sales_info}")
        
        try:
            # Generate persona
            persona = claude_service.generate_customer_persona(sales_info)
            conversation.persona = persona
            db.session.commit()
            
            # Start the roleplay
            greeting = "Great! Let's begin the roleplay. I'll act as a potential customer based on the information you've provided. I'll respond as this customer would naturally, with appropriate questions and objections.\n\nHello there! How can I help you today?"
            
            return greeting
        except Exception as api_error:
            print(f"Error calling Claude API: {str(api_error)}")
            return f"I'm having trouble connecting to the AI service. Error: {str(api_error)}"
            
    except Exception as e:
        # Log the error
        print(f"Error in handle_first_message: {str(e)}")
        return f"I'm sorry, I encountered an error processing your message. Could you please try again? Error details: {str(e)}"
    
    except Exception as e:
        # Log the error
        print(f"Error in handle_first_message: {str(e)}")
        # Return a friendly message instead of crashing
        return "I'm sorry, I encountered an error processing your message. Could you please try again with more details about your sales experience?"

def generate_ai_response(conversation, message_content):
    """
    Generate an AI response using the Claude service.
    """
    # Get conversation history
    messages = Message.query.filter_by(conversation_id=conversation.id).order_by(Message.timestamp).all()
    
    # Format messages for Claude (limit to last 20 messages for context)
    formatted_messages = [
        {'role': msg.role, 'content': msg.content} for msg in messages[-20:]
    ]
    
    # Add the new user message
    formatted_messages.append({'role': 'user', 'content': message_content})
    
    # Create sales info context
    sales_info = {
        'product_service': conversation.product_service,
        'target_market': conversation.target_market,
        'sales_experience': conversation.sales_experience
    }
    
    # Generate response
    ai_response = claude_service.generate_roleplay_response(
        formatted_messages, 
        conversation.persona,
        sales_info
    )
    
    return ai_response

def extract_sales_experience(message):
    """Extract sales experience information from message."""
    # Simple extraction logic - can be improved with more sophisticated NLP
    message = message.lower()
    
    # Check for years/months patterns
    if any(term in message for term in ['year', 'years', 'yr', 'yrs']):
        for i in range(1, 31):  # Up to 30 years
            if f"{i} year" in message or f"{i} years" in message or f"{i} yr" in message or f"{i} yrs" in message:
                return f"{i} years"
    
    if any(term in message for term in ['month', 'months', 'mo', 'mos']):
        for i in range(1, 36):  # Up to 36 months
            if f"{i} month" in message or f"{i} months" in message or f"{i} mo" in message or f"{i} mos" in message:
                return f"{i} months"
    
    # Check for experience levels
    if any(term in message for term in ['beginner', 'new', 'novice', 'starting']):
        return "beginner"
    elif any(term in message for term in ['intermediate', 'some experience', 'a few years']):
        return "intermediate"
    elif any(term in message for term in ['experienced', 'expert', 'veteran', 'seasoned', 'senior']):
        return "experienced"
    
    return None

def extract_product_service(message):
    """Extract product or service information from message."""
    # This is a simplified extraction - in real app would use better NLP
    message = message.lower()
    
    # Look for selling indicators
    selling_indicators = [
        'selling', 'offer', 'promote', 'market', 'sell', 'product is', 'service is',
        'i sell', 'we sell', 'i\'m selling', 'we\'re selling'
    ]
    
    for indicator in selling_indicators:
        if indicator in message:
            # Extract what comes after the indicator
            parts = message.split(indicator, 1)
            if len(parts) > 1 and parts[1].strip():
                # Extract up to 50 chars or until end of sentence
                product_text = parts[1].strip()
                end_markers = ['.', '!', '?', ',', '\n']
                for marker in end_markers:
                    if marker in product_text:
                        product_text = product_text.split(marker, 1)[0]
                
                return product_text[:50].strip()
    
    return None

def extract_target_market(message):
    """Extract target market information from message."""
    message = message.lower()
    
    if any(term in message for term in ['b2b', 'business to business', 'businesses', 'companies', 'corporations', 'organizations']):
        return 'B2B'
    
    if any(term in message for term in ['b2c', 'business to consumer', 'consumers', 'individuals', 'people', 'retail']):
        return 'B2C'
    
    if any(term in message for term in ['both', 'mix', 'hybrid', 'b2b and b2c', 'b2c and b2b']):
        return 'mixed'
    
    return None

def update_user_stats(user, feedback):
    """Update user stats based on feedback."""
    try:
        # Extract strengths and areas for improvement
        strengths = []
        weaknesses = []
        
        # Simple string-based extraction - could be improved with better parsing
        if "### Strengths" in feedback:
            strengths_section = feedback.split("### Strengths")[1].split("###")[0]
            strength_items = [s.strip() for s in strengths_section.split("-") if s.strip()]
            strengths = [s[:100] for s in strength_items]
        
        if "### Areas for Improvement" in feedback:
            weaknesses_section = feedback.split("### Areas for Improvement")[1].split("###")[0]
            weakness_items = [w.strip() for w in weaknesses_section.split("-") if w.strip()]
            weaknesses = [w[:100] for w in weakness_items]
        
        # Update skills based on the feedback
        skills = user.skills_dict
        
        # This is a simple algorithm - could be improved with better NLP
        # Increase skills mentioned in strengths
        for strength in strengths:
            if "rapport" in strength.lower():
                skills["rapport_building"] = min(100, skills.get("rapport_building", 0) + 5)
            
            if any(term in strength.lower() for term in ["discovery", "question", "listen", "understanding"]):
                skills["needs_discovery"] = min(100, skills.get("needs_discovery", 0) + 5)
            
            if any(term in strength.lower() for term in ["objection", "concern", "handle", "address"]):
                skills["objection_handling"] = min(100, skills.get("objection_handling", 0) + 5)
            
            if any(term in strength.lower() for term in ["close", "closing", "commitment", "decision"]):
                skills["closing"] = min(100, skills.get("closing", 0) + 5)
            
            if any(term in strength.lower() for term in ["product", "knowledge", "feature", "benefit"]):
                skills["product_knowledge"] = min(100, skills.get("product_knowledge", 0) + 5)
        
        # Slower increase for areas with weaknesses
        for weakness in weaknesses:
            if "rapport" in weakness.lower():
                skills["rapport_building"] = max(1, skills.get("rapport_building", 0) + 2)
            
            if any(term in weakness.lower() for term in ["discovery", "question", "listen", "understanding"]):
                skills["needs_discovery"] = max(1, skills.get("needs_discovery", 0) + 2)
            
            if any(term in weakness.lower() for term in ["objection", "concern", "handle", "address"]):
                skills["objection_handling"] = max(1, skills.get("objection_handling", 0) + 2)
            
            if any(term in weakness.lower() for term in ["close", "closing", "commitment", "decision"]):
                skills["closing"] = max(1, skills.get("closing", 0) + 2)
            
            if any(term in weakness.lower() for term in ["product", "knowledge", "feature", "benefit"]):
                skills["product_knowledge"] = max(1, skills.get("product_knowledge", 0) + 2)
        
        # Update user data
        user.skills_dict = skills
        
        # Update strengths and weaknesses
        current_strengths = user.strengths_list
        current_weaknesses = user.weaknesses_list
        
        # Add new items but avoid duplicates
        for strength in strengths:
            if strength and strength not in current_strengths:
                current_strengths.append(strength)
        
        for weakness in weaknesses:
            if weakness and weakness not in current_weaknesses:
                current_weaknesses.append(weakness)
        
        # Keep only the top items
        user.strengths_list = current_strengths[:10]
        user.weaknesses_list = current_weaknesses[:10]
        
    except Exception as e:
        print(f"Error updating user stats: {e}")
