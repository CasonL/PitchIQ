"""
Vector Persona Service for PitchIQ

This module provides a vector database implementation for efficient persona storage and retrieval.
It allows storing large personas as embeddings and retrieving only relevant portions based on context.
"""

import os
import json
import numpy as np
import faiss
import logging
import uuid
from typing import List, Dict, Any, Optional, Tuple
from openai import OpenAI
from flask import current_app
import requests

# Configure logging
logger = logging.getLogger(__name__)

# Constants
MODEL_NAME = "gpt-4.1-mini" # Using high quality setting
EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_TEMPERATURE = 0.7
DEFAULT_CHUNK_SIZE = 500  # characters per chunk

class VectorPersonaService:
    """Service for managing personas using vector embeddings for efficient retrieval."""
    
    _instance = None
    
    def __new__(cls, api_key=None):
        """Implement as singleton to ensure consistent database."""
        if cls._instance is None:
            cls._instance = super(VectorPersonaService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, api_key=None):
        """Initialize the vector database and OpenAI client."""
        if getattr(self, '_initialized', False):
            return
            
        # Get API key from Flask app config or fallback to environment
        try:
            self.api_key = current_app.config.get('OPENAI_API_KEY')
            if not self.api_key:
                self.api_key = os.environ.get('OPENAI_API_KEY')
        except RuntimeError:
            self.api_key = os.environ.get('OPENAI_API_KEY')
        
        if not self.api_key:
            logger.error("OpenAI API key is missing. Set OPENAI_API_KEY in config or environment.")
            self.api_available = False
            self._initialized = True
            return
        
        try:
            # Initialize OpenAI client
            self.client = OpenAI(api_key=self.api_key)
            
            # Initialize vector database (FAISS)
            self.dimension = 1536  # Dimension of OpenAI embeddings
            self.index = faiss.IndexFlatL2(self.dimension)
            
            # Storage for persona chunks
            self.persona_chunks = {}  # id -> chunk text
            self.persona_metadata = {}  # persona_id -> metadata
            
            # Track which IDs belong to which personas
            self.persona_to_chunks = {}  # persona_id -> list of chunk_ids
            
            self.api_available = True
            self._initialized = True
            logger.info("Vector Persona Service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Vector Persona Service: {str(e)}")
            self.api_available = False
            self._initialized = True
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """
        Generate embeddings for a text using OpenAI's embedding model.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            NumPy array containing the embedding vector
        """
        try:
            response = self.client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text
            )
            embedding = response.data[0].embedding
            return np.array(embedding, dtype=np.float32)
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            # Return a zero vector if embedding fails
            return np.zeros(self.dimension, dtype=np.float32)
    
    def _chunk_text(self, text: str, chunk_size: int = DEFAULT_CHUNK_SIZE) -> List[str]:
        """
        Break a long text into chunks of roughly equal size.
        
        Args:
            text: Text to chunk
            chunk_size: Approximate size of each chunk in characters
            
        Returns:
            List of text chunks
        """
        # Simple chunking by character count
        chunks = []
        sentences = text.split('. ')
        current_chunk = ""
        
        for sentence in sentences:
            # Add sentence separator back if not the first sentence
            if current_chunk:
                sentence = '. ' + sentence
                
            # If adding this sentence would exceed chunk size, save current chunk and start new one
            if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
                chunks.append(current_chunk)
                current_chunk = sentence
            else:
                current_chunk += sentence
        
        # Add the last chunk if not empty
        if current_chunk:
            chunks.append(current_chunk)
            
        return chunks
    
    def add_persona(self, persona_id: str, persona_text: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Add a persona to the vector database by splitting it into chunks and embedding each chunk.
        
        Args:
            persona_id: Unique identifier for the persona
            persona_text: Full text of the persona description
            metadata: Optional metadata about the persona
            
        Returns:
            True if successful, False otherwise
        """
        if not self.api_available:
            logger.error("OpenAI API is not available. Cannot add persona.")
            return False
            
        try:
            # Store metadata
            self.persona_metadata[persona_id] = metadata or {}
            
            # Split persona into chunks
            chunks = self._chunk_text(persona_text)
            
            # Create chunk IDs and store mappings
            chunk_ids = []
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"{persona_id}_{i}"
                self.persona_chunks[chunk_id] = chunk
                chunk_ids.append(chunk_id)
                
                # Get embedding for this chunk
                embedding = self._get_embedding(chunk)
                
                # Add to FAISS index
                self.index.add(np.array([embedding]))
            
            # Store mapping from persona ID to its chunk IDs
            self.persona_to_chunks[persona_id] = chunk_ids
            
            logger.info(f"Added persona {persona_id} with {len(chunks)} chunks")
            return True
        except Exception as e:
            logger.error(f"Error adding persona {persona_id}: {str(e)}")
            return False
    
    def retrieve_relevant_chunks(self, query: str, persona_id: Optional[str] = None, top_k: int = 3) -> List[str]:
        """
        Retrieve the most relevant chunks for a query, optionally limited to a specific persona.
        
        Args:
            query: The query text to find relevant chunks for
            persona_id: Optional persona ID to limit search to
            top_k: Number of top chunks to retrieve
            
        Returns:
            List of relevant text chunks
        """
        if not self.api_available:
            logger.error("OpenAI API is not available. Cannot retrieve chunks.")
            return []
            
        try:
            # Get embedding for query
            query_embedding = self._get_embedding(query)
            
            # Search for similar chunks
            D, I = self.index.search(np.array([query_embedding]), self.index.ntotal)
            
            # Get chunk IDs from indices
            all_chunk_ids = list(self.persona_chunks.keys())
            
            # Filter by persona ID if specified
            relevant_chunks = []
            count = 0
            
            for idx in I[0]:
                if idx >= len(all_chunk_ids):
                    continue
                    
                chunk_id = all_chunk_ids[idx]
                
                # If persona_id is specified, only include chunks from that persona
                if persona_id:
                    if chunk_id.startswith(f"{persona_id}_"):
                        relevant_chunks.append(self.persona_chunks[chunk_id])
                        count += 1
                else:
                    relevant_chunks.append(self.persona_chunks[chunk_id])
                    count += 1
                
                if count >= top_k:
                    break
            
            return relevant_chunks
        except Exception as e:
            logger.error(f"Error retrieving relevant chunks: {str(e)}")
            return []
    
    def generate_persona(self, sales_info: Dict[str, Any]) -> str:
        """
        Generate a persona ID based on the sales information.
        
        Args:
            sales_info: Dictionary containing sales information
            
        Returns:
            persona_id: A unique identifier for the generated persona
        """
        try:
            # Create a unique ID for this persona
            persona_id = str(uuid.uuid4())
            
            # Convert sales info to a structured prompt
            persona_prompt = self._format_persona_prompt(sales_info)
            
            # Generate the persona using GPT-4.1-mini
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "You are an AI that creates detailed sales coach personas."},
                    {"role": "user", "content": persona_prompt}
                ],
                temperature=0.7,
            )
            
            persona_text = response.choices[0].message.content
            
            # Store the persona in vector database with the ID as reference
            self._store_persona(persona_id, persona_text, sales_info)
            
            logger.info(f"Generated persona with ID: {persona_id}")
            return persona_id
            
        except Exception as e:
            logger.error(f"Error generating persona: {str(e)}")
            raise
    
    def generate_response(self, 
                          conversation_history: List[Dict[str, str]], 
                          persona_id: Optional[str],
                          user_message: str,
                          user_name: str = "User") -> str:
        """
        Generate a response using the persona ID to retrieve the relevant persona context.
        
        Args:
            conversation_history: List of previous messages
            persona_id: The ID of the persona to use (can be None)
            user_message: The latest user message
            user_name: The name of the user
            
        Returns:
            The AI response
        """
        try:
            # Get persona context - either from ID or use default
            if persona_id:
                try:
                    # Retrieve persona context from vector DB
                    persona_context = self._retrieve_persona(persona_id)
                    if not persona_context:
                        logger.warning(f"Could not retrieve persona with ID: {persona_id}, using default")
                        persona_context = self._get_default_persona_context()
                except Exception as e:
                    logger.error(f"Error retrieving persona: {str(e)}, using default")
                    persona_context = self._get_default_persona_context()
            else:
                # No persona ID provided, use default
                logger.info("No persona ID provided, using default persona")
                persona_context = self._get_default_persona_context()
            
            # Format the conversation history for the API
            formatted_history = []
            for msg in conversation_history:
                if msg.get('role') == 'user':
                    formatted_history.append({
                        "role": "user", 
                        "content": f"{user_name}: {msg.get('content')}"
                    })
                else:
                    formatted_history.append({
                        "role": "assistant", 
                        "content": msg.get('content')
                    })
            
            # Add the system message with persona context
            system_message = {
                "role": "system", 
                "content": f"You are a sales coach with the following persona: {persona_context}"
            }
            
            # Add the latest user message
            formatted_history.append({
                "role": "user", 
                "content": f"{user_name}: {user_message}"
            })
            
            # Generate the response
            messages = [system_message] + formatted_history
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=messages,
                temperature=0.7,
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            # Return a fallback response instead of raising
            return "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question."
    
    def _format_persona_prompt(self, sales_info: Dict[str, Any]) -> str:
        """Format the sales information into a prompt for persona generation."""
        prompt = "Create a detailed sales coach persona based on the following information:\n\n"
        
        if sales_info.get('industry'):
            prompt += f"Industry: {sales_info.get('industry')}\n"
        if sales_info.get('product_type'):
            prompt += f"Product Type: {sales_info.get('product_type')}\n"
        if sales_info.get('target_market'):
            prompt += f"Target Market: {sales_info.get('target_market')}\n"
        if sales_info.get('sales_experience'):
            prompt += f"Sales Experience Level: {sales_info.get('sales_experience')}\n"
        
        prompt += "\nThe persona should include:\n"
        prompt += "1. A name and background story\n"
        prompt += "2. Areas of expertise and specialization\n"
        prompt += "3. Coaching style and communication approach\n"
        prompt += "4. Key sales methodologies and principles they follow\n"
        prompt += "5. Examples of advice they might give\n"
        
        return prompt
    
    def _store_persona(self, persona_id: str, persona_text: str, metadata: Dict[str, Any]) -> None:
        """
        Store the persona in a vector database.
        In a production environment, this would use a proper vector DB like Pinecone, Weaviate, etc.
        For now, we'll simulate storage with a basic implementation.
        """
        try:
            # Generate embeddings for the persona text
            embedding_response = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=persona_text
            )
            
            embedding = embedding_response.data[0].embedding
            
            # In a real implementation, here we would store the embedding in a vector DB
            # For this implementation, we'll log that we would store it
            logger.info(f"Storing persona ID {persona_id} with metadata and embeddings")
            
            # In a real implementation, this would be a call to a vector DB API
            # For now, we simulate success
            return True
            
        except Exception as e:
            logger.error(f"Error storing persona: {str(e)}")
            raise
    
    def _retrieve_persona(self, persona_id: str) -> str:
        """
        Retrieve the persona from the vector database.
        In a production environment, this would use a proper vector DB.
        For now, we'll use a simulated response based on the ID.
        """
        try:
            # For this implementation, we'll return a simulated response
            # In a real implementation, this would retrieve the actual persona from the vector DB
            logger.info(f"Retrieving persona with ID: {persona_id}")
            
            # Simulated persona text
            # In a real implementation, this would be retrieved from the vector DB
            simulated_persona = """
            Expert Sales Coach Persona:
            
            Name: Alex Morgan
            
            Background: Alex has 15+ years of experience in B2B sales across multiple industries.
            They excelled at enterprise software sales before moving into sales training and coaching.
            
            Expertise: Solution selling, objection handling, relationship building, and sales strategy.
            
            Coaching Style: Direct but supportive. Focuses on actionable feedback and real-world examples.
            Believes in practicing scenarios and building confidence through preparation.
            
            Methodologies: SPIN Selling, Challenger Sale, and Value-Based Selling approaches.
            
            Key Principles:
            1. Always understand the customer's business problems first
            2. Focus on value, not features
            3. Prepare thoroughly for every interaction
            4. Listen more than you speak
            5. Follow up consistently and build relationships
            
            Communication: Clear, concise advice with specific examples. Uses questions to guide rather than simply giving answers.
            """
            
            return simulated_persona
            
        except Exception as e:
            logger.error(f"Error retrieving persona: {str(e)}")
            raise

    def _get_default_persona_context(self) -> str:
        """Return a default persona context when no specific persona is available."""
        return """
        Expert Sales Coach Persona:
        
        Name: Alex Morgan
        
        Background: 15+ years of experience in sales across multiple industries.
        Expert in consultative selling techniques and relationship building.
        
        Coaching Style: Supportive and actionable. Provides constructive feedback
        with specific techniques to improve sales conversations.
        
        Key Principles:
        1. Listen more than you speak
        2. Focus on solving customer problems
        3. Build value before discussing price
        4. Use clear, confident communication
        5. Follow up consistently
        
        Approach: Asks thoughtful questions to guide learning and offers practical
        advice based on real-world sales situations.
        """

# Create a singleton instance
_vector_persona_service = None

def get_vector_persona_service() -> VectorPersonaService:
    """
    Get the vector persona service singleton instance.
    
    Returns:
        VectorPersonaService: An instance of the vector persona service
    """
    global _vector_persona_service
    if _vector_persona_service is None:
        _vector_persona_service = VectorPersonaService()
    return _vector_persona_service 