"""
AI service for the Sales Training system.

This module handles all LLM-based generation and analysis for the training system.
"""

from models import BuyerPersona, TrainingSession, PerformanceMetrics, FeedbackAnalysis
import json
from typing import Dict, List, Optional
import random

class AITrainingService:
    """Service for handling AI-based training functionality."""
    
    def __init__(self, llm_client):
        """Initialize the AI training service.
        
        Args:
            llm_client: The LLM client to use for generation and analysis
        """
        self.llm_client = llm_client
        
        # Predefined personality traits and emotional states
        self.personality_traits = [
            "analytical", "skeptical", "expressive", "logical", "emotional",
            "practical", "innovative", "conservative", "open-minded", "detail-oriented"
        ]
        
        self.emotional_states = [
            "cautious", "frustrated", "curious", "satisfied", "anxious",
            "confident", "skeptical", "interested", "neutral", "excited"
        ]
        
        self.buyer_types = ["economic", "technical", "user"]
        self.decision_authorities = ["individual", "committee", "manager", "executive"]
        
        # Cognitive biases to simulate
        self.cognitive_biases = [
            "anchoring", "scarcity", "loss_aversion", "social_proof",
            "commitment", "reciprocity", "authority", "liking"
        ]
    
    def generate_buyer_persona(self, user_profile) -> BuyerPersona:
        """Generate a buyer persona based on user profile.
        
        Args:
            user_profile: The user's profile containing their context
            
        Returns:
            BuyerPersona: A generated buyer persona
        """
        # Generate personality traits
        num_traits = random.randint(3, 5)
        selected_traits = random.sample(self.personality_traits, num_traits)
        personality_dict = {trait: random.uniform(0.5, 1.0) for trait in selected_traits}
        
        # Generate emotional state
        emotional_state = random.choice(self.emotional_states)
        
        # Generate buyer type and decision authority
        buyer_type = random.choice(self.buyer_types)
        decision_authority = random.choice(self.decision_authorities)
        
        # Generate pain points based on user's product/service
        pain_points = self._generate_pain_points(user_profile.product_service)
        
        # Generate objections based on buyer type and pain points
        objections = self._generate_objections(buyer_type, pain_points)
        
        # Generate cognitive biases to simulate
        num_biases = random.randint(2, 4)
        selected_biases = random.sample(self.cognitive_biases, num_biases)
        bias_dict = {bias: random.uniform(0.3, 0.9) for bias in selected_biases}
        
        # Generate persona description using LLM
        description_prompt = f"""
        Create a detailed description of a {buyer_type} buyer with the following traits:
        - Personality: {', '.join(selected_traits)}
        - Emotional state: {emotional_state}
        - Decision authority: {decision_authority}
        - Pain points: {', '.join(pain_points)}
        - Common objections: {', '.join(objections)}
        
        Make the description realistic and detailed, focusing on their role, challenges, and decision-making style.
        """
        
        description = self.llm_client.generate(description_prompt)
        
        # Create and return the buyer persona
        return BuyerPersona(
            name=f"{buyer_type.title()} Buyer",
            description=description,
            personality_traits=json.dumps(personality_dict),
            emotional_state=emotional_state,
            buyer_type=buyer_type,
            decision_authority=decision_authority,
            pain_points=json.dumps(pain_points),
            objections=json.dumps(objections),
            cognitive_biases=json.dumps(bias_dict)
        )
    
    def generate_ai_response(self, session: TrainingSession, message: str) -> str:
        """Generate AI response based on conversation context.
        
        Args:
            session: The current training session
            message: The user's message
            
        Returns:
            str: The AI's response
        """
        # Get conversation history
        conversation = session.conversation_history_dict
        
        # Create context for the LLM
        context_prompt = f"""
        You are a {session.buyer_persona.buyer_type} buyer with the following characteristics:
        - Personality: {session.buyer_persona.personality_traits_dict}
        - Emotional state: {session.buyer_persona.emotional_state}
        - Pain points: {session.buyer_persona.pain_points_list}
        - Common objections: {session.buyer_persona.objections_list}
        
        Previous conversation:
        {self._format_conversation_history(conversation)}
        
        Current message from salesperson: {message}
        
        Respond as this buyer would, maintaining consistency with their personality and emotional state.
        Consider their pain points and potential objections when responding.
        """
        
        return self.llm_client.generate(context_prompt)
    
    def analyze_interaction(self, session: TrainingSession, user_message: str, ai_response: str) -> None:
        """Analyze the interaction for key moments and objections.
        
        Args:
            session: The current training session
            user_message: The user's message
            ai_response: The AI's response
        """
        # Analyze for key moments
        moments_prompt = f"""
        Analyze this sales interaction for key moments:
        
        Salesperson: {user_message}
        Buyer: {ai_response}
        
        Identify:
        1. Rapport-building moments
        2. Needs discovery attempts
        3. Objection handling
        4. Value proposition delivery
        5. Closing attempts
        
        Format the response as a JSON array of moments, each with:
        - type: string (rapport/discovery/objection/value/closing)
        - timestamp: string (ISO format)
        - description: string
        - effectiveness: number (1-10)
        """
        
        moments = json.loads(self.llm_client.generate(moments_prompt))
        session.key_moments_list.extend(moments)
        
        # Analyze for objections
        objections_prompt = f"""
        Analyze this sales interaction for objections:
        
        Salesperson: {user_message}
        Buyer: {ai_response}
        
        Identify any objections raised or implied by the buyer.
        Format the response as a JSON array of objections, each with:
        - type: string (price/trust/urgency/timing/other)
        - description: string
        - how_handled: string
        - effectiveness: number (1-10)
        """
        
        objections = json.loads(self.llm_client.generate(objections_prompt))
        session.objections_handled_list.extend(objections)
    
    def generate_performance_metrics(self, session: TrainingSession) -> PerformanceMetrics:
        """Generate performance metrics for the session.
        
        Args:
            session: The completed training session
            
        Returns:
            PerformanceMetrics: Generated performance metrics
        """
        # Analyze conversation for skill ratings
        skills_prompt = f"""
        Analyze this sales conversation and rate the salesperson's skills (1-10):
        
        Conversation history:
        {self._format_conversation_history(session.conversation_history_dict)}
        
        Key moments:
        {json.dumps(session.key_moments_list)}
        
        Objections handled:
        {json.dumps(session.objections_handled_list)}
        
        Rate the following skills:
        1. Rapport building
        2. Needs discovery
        3. Objection handling
        4. Closing techniques
        5. Product knowledge
        6. Emotional awareness
        7. Tone consistency
        
        Also analyze the effectiveness of cognitive biases used.
        
        Format the response as a JSON object with the ratings and bias effectiveness.
        """
        
        analysis = json.loads(self.llm_client.generate(skills_prompt))
        
        # Create performance metrics
        metrics = PerformanceMetrics(
            training_session_id=session.id,
            rapport_building=analysis['rapport_building'],
            needs_discovery=analysis['needs_discovery'],
            objection_handling=analysis['objection_handling'],
            closing_techniques=analysis['closing_techniques'],
            product_knowledge=analysis['product_knowledge'],
            bias_effectiveness=json.dumps(analysis['bias_effectiveness']),
            emotional_awareness=analysis['emotional_awareness'],
            tone_consistency=analysis['tone_consistency']
        )
        
        # Update session scores
        session.trust_score = analysis['trust_score']
        session.persuasion_rating = analysis['persuasion_rating']
        session.confidence_score = analysis['confidence_score']
        
        return metrics
    
    def generate_feedback_analysis(self, session: TrainingSession, metrics: PerformanceMetrics) -> FeedbackAnalysis:
        """Generate detailed feedback analysis for the session.
        
        Args:
            session: The completed training session
            metrics: The performance metrics for the session
            
        Returns:
            FeedbackAnalysis: Generated feedback analysis
        """
        # Generate comprehensive feedback
        feedback_prompt = f"""
        Generate detailed feedback for this sales training session:
        
        Conversation history:
        {self._format_conversation_history(session.conversation_history_dict)}
        
        Performance metrics:
        {json.dumps({
            'rapport_building': metrics.rapport_building,
            'needs_discovery': metrics.needs_discovery,
            'objection_handling': metrics.objection_handling,
            'closing_techniques': metrics.closing_techniques,
            'product_knowledge': metrics.product_knowledge,
            'emotional_awareness': metrics.emotional_awareness,
            'tone_consistency': metrics.tone_consistency
        })}
        
        Key moments:
        {json.dumps(session.key_moments_list)}
        
        Objections handled:
        {json.dumps(session.objections_handled_list)}
        
        Provide:
        1. Overall assessment
        2. Strengths demonstrated
        3. Areas for improvement
        4. Detailed feedback for each skill area
        5. Mindset insights
        6. Limiting beliefs detected
        7. Reframe suggestions
        8. Action items
        
        Format the response as a JSON object with all these elements.
        """
        
        analysis = json.loads(self.llm_client.generate(feedback_prompt))
        
        return FeedbackAnalysis(
            training_session_id=session.id,
            overall_assessment=analysis['overall_assessment'],
            strengths_demonstrated=json.dumps(analysis['strengths']),
            areas_for_improvement=json.dumps(analysis['areas_for_improvement']),
            rapport_feedback=analysis['rapport_feedback'],
            discovery_feedback=analysis['discovery_feedback'],
            objection_feedback=analysis['objection_feedback'],
            closing_feedback=analysis['closing_feedback'],
            mindset_insights=analysis['mindset_insights'],
            limiting_beliefs_detected=json.dumps(analysis['limiting_beliefs']),
            reframe_suggestions=json.dumps(analysis['reframe_suggestions']),
            action_items=json.dumps(analysis['action_items'])
        )
    
    def _generate_pain_points(self, product_service: str) -> List[str]:
        """Generate realistic pain points based on product/service.
        
        Args:
            product_service: The product or service being sold
            
        Returns:
            List[str]: List of pain points
        """
        prompt = f"""
        Generate 3-5 realistic pain points that a potential buyer might have regarding: {product_service}
        
        Format the response as a JSON array of pain points.
        """
        
        return json.loads(self.llm_client.generate(prompt))
    
    def _generate_objections(self, buyer_type: str, pain_points: List[str]) -> List[str]:
        """Generate realistic objections based on buyer type and pain points.
        
        Args:
            buyer_type: The type of buyer
            pain_points: List of pain points
            
        Returns:
            List[str]: List of objections
        """
        prompt = f"""
        Generate 3-5 realistic objections that a {buyer_type} buyer might raise,
        considering these pain points: {', '.join(pain_points)}
        
        Format the response as a JSON array of objections.
        """
        
        return json.loads(self.llm_client.generate(prompt))
    
    def _format_conversation_history(self, conversation: List[Dict]) -> str:
        """Format conversation history for prompts.
        
        Args:
            conversation: List of conversation messages
            
        Returns:
            str: Formatted conversation history
        """
        return "\n".join([
            f"{msg['role'].title()}: {msg['content']}"
            for msg in conversation
        ]) 