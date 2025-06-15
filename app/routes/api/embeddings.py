from flask import Blueprint, request, jsonify
import os
import numpy as np
import openai
from app.utils.auth import require_auth
from app.utils.logger import get_logger

embeddings_bp = Blueprint('embeddings', __name__)

# Get logger
logger = get_logger(__name__)

# Environment setup
openai.api_key = os.environ.get('OPENAI_API_KEY')

@embeddings_bp.route('/create', methods=['POST'])
def create_embedding_route():
    """
    API endpoint to generate text embeddings for semantic understanding
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        text = data.get('text', '')
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Truncate text if too long
        max_tokens = 8191  # Max for text-embedding-ada-002
        if len(text.split()) > max_tokens:
            logger.warning(f"Text too long ({len(text.split())} tokens), truncating to {max_tokens} tokens")
            text = ' '.join(text.split()[:max_tokens])
        
        try:
            # Use the OpenAI API to generate text embeddings
            response = openai.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            
            # Extract the embedding vector from response
            embedding = response.data[0].embedding
            
            return jsonify({
                "embedding": embedding,
                "dimensions": len(embedding)
            })
            
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {str(e)}")
            
            # For development purposes, return a random embedding
            dimensions = 1536  # Dimensionality of text-embedding-ada-002
            random_embedding = list(np.random.normal(0, 0.1, dimensions).astype(float))
            
            return jsonify({
                "embedding": random_embedding,
                "dimensions": dimensions,
                "note": "This is a fallback random embedding because the OpenAI API call failed",
                "error": str(e)
            })
    
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        return jsonify({"error": str(e)}), 500 