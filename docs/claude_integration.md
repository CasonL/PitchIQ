# Claude Service Integration for Emotional Responses

This document outlines how to integrate emotional responses into your Claude service for more realistic buyer personas.

## Integration Steps

1. **Add Emotional Prompt to System Messages**

   When initializing the Claude client for buyer persona generation, add the emotional response prompt to the system message:

   ```python
   def generate_buyer_response(system_prompt, user_message, conversation_history):
       """Generate a response from the buyer persona."""
       
       # Add emotional response guidelines to the system prompt
       with open("llm_emotion_prompt.md", "r") as f:
           emotion_prompt = f.read()
       
       enhanced_system_prompt = f"{system_prompt}\n\n{emotion_prompt}"
       
       # Call Claude with the enhanced system prompt
       response = claude_client.complete(
           prompt=enhanced_system_prompt,
           messages=[
               {"role": "user", "content": user_message}
           ],
           # Include conversation history
           conversation=conversation_history,
           # Other parameters...
       )
       
       return response.content
   ```

2. **Add Post-Processing for Responses**

   Implement the `EmotionalResponseSystem` to post-process Claude's outputs:

   ```python
   from app.services.ai_emotion_implementation import EmotionalResponseSystem
   
   def process_claude_response(persona_context, salesperson_message, 
                              claude_response, conversation_history):
       """Process and enhance Claude's response with emotional intelligence."""
       
       # Initialize the emotional response system
       emotion_system = EmotionalResponseSystem(persona_context)
       
       # Get emotional guidance
       guidance = emotion_system.evaluate_emotional_response(
           salesperson_message, conversation_history
       )
       
       # Format the response according to emotional guidelines
       enhanced_response = emotion_system.format_ai_response(claude_response)
       
       return enhanced_response
   ```

3. **Update Buyer Persona Creation**

   Add primary concern identification to the persona creation:

   ```python
   def create_buyer_persona(context):
       """Create a buyer persona with emotional attributes."""
       
       # Extract existing persona data
       # ...
       
       # Add primary concern field (most important pain point)
       if persona.pain_points:
           # Either explicitly set or choose the first pain point
           persona.primary_concern = persona.pain_points[0]
       
       return persona
   ```

4. **Modify Message Processing**

   Update the message handling in your routes:

   ```python
   @training_bp.route('/api/training/roleplay/<int:session_id>/message', methods=['POST'])
   def send_roleplay_message(session_id):
       # Get the user message
       user_message = request.json.get('message')
       
       # Get persona and conversation history
       persona = get_cached_buyer_persona(session_id)
       conv_history = get_conversation_history(session_id)
       
       # Generate AI response with emotional intelligence
       ai_response = claude_service.generate_response(
           persona, user_message, conv_history
       )
       
       # Post-process for emotional content
       enhanced_response = process_claude_response(
           persona_context=persona.to_dict(),
           salesperson_message=user_message,
           claude_response=ai_response,
           conversation_history=conv_history
       )
       
       # Save the enhanced response
       save_message(session_id, "assistant", enhanced_response)
       
       return jsonify({"message": enhanced_response})
   ```

## Testing

1. Implement A/B testing for emotional responses:
   - Create a switch to enable/disable emotional enhancement
   - Collect user feedback on both versions
   - Track engagement metrics (conversation length, user ratings)

2. Test specific emotional scenarios:
   - Correct pain point identification
   - Irrelevant pitches
   - Value demonstration
   - Close-ended questions

## Example Implementation Timeline

1. **Week 1**: Add emotional response prompt to system message
2. **Week 2**: Implement post-processing for emotional responses  
3. **Week 3**: Add primary concern identification to persona creation
4. **Week 4**: Test and refine the system 