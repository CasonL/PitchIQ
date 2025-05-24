/**
 * Embedding Service
 * 
 * This module provides functionality for generating and comparing semantic embeddings
 * to better understand the meaning behind user responses.
 */

/**
 * Gets an embedding vector for a text string
 * 
 * @param text The text to embed
 * @returns Promise that resolves to an embedding vector (array of numbers)
 */
export const getEmbedding = async (text: string): Promise<number[]> => {
  try {
    // Call the API endpoint to get embeddings
    const response = await fetch('/api/get-embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error getting embedding:', error);
    // Return a fallback empty embedding
    return [];
  }
};

/**
 * Calculates the cosine similarity between two embedding vectors
 * 
 * @param embedding1 First embedding vector
 * @param embedding2 Second embedding vector
 * @returns Similarity score between 0 and 1
 */
export const calculateEmbeddingSimilarity = (
  embedding1: number[], 
  embedding2: number[]
): number => {
  // Check if embeddings are available
  if (!embedding1 || !embedding2 || 
      embedding1.length === 0 || embedding2.length === 0 ||
      embedding1.length !== embedding2.length) {
    return 0;
  }
  
  // Calculate dot product
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  // Avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  // Calculate cosine similarity
  return dotProduct / (magnitude1 * magnitude2);
};

/**
 * Compares a text string against a concept using embeddings
 * 
 * @param text The user's text to evaluate
 * @param concept The concept to compare against
 * @returns Promise that resolves to a similarity score
 */
export const getTextConceptSimilarity = async (
  text: string, 
  concept: string
): Promise<number> => {
  try {
    // Get embeddings for both text and concept
    const [textEmbedding, conceptEmbedding] = await Promise.all([
      getEmbedding(text),
      getEmbedding(concept)
    ]);
    
    // Calculate similarity
    return calculateEmbeddingSimilarity(textEmbedding, conceptEmbedding);
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
};

/**
 * Finds the most similar concepts to a given text
 * 
 * @param text The text to analyze
 * @param concepts Array of concept strings
 * @param threshold Minimum similarity threshold (0-1)
 * @returns Promise that resolves to array of matching concepts and scores
 */
export const findSimilarConcepts = async (
  text: string,
  concepts: string[],
  threshold = 0.5
): Promise<Array<{ concept: string; similarity: number }>> => {
  try {
    // Get text embedding
    const textEmbedding = await getEmbedding(text);
    if (textEmbedding.length === 0) return [];
    
    // Calculate similarities with each concept
    const similarities = await Promise.all(
      concepts.map(async (concept) => {
        const conceptEmbedding = await getEmbedding(concept);
        const similarity = calculateEmbeddingSimilarity(textEmbedding, conceptEmbedding);
        return { concept, similarity };
      })
    );
    
    // Filter by threshold and sort by similarity (descending)
    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error('Error finding similar concepts:', error);
    return [];
  }
};

/**
 * Caches embeddings to avoid redundant API calls
 */
class EmbeddingCache {
  private static instance: EmbeddingCache;
  private cache: Map<string, number[]> = new Map();
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): EmbeddingCache {
    if (!EmbeddingCache.instance) {
      EmbeddingCache.instance = new EmbeddingCache();
    }
    return EmbeddingCache.instance;
  }
  
  /**
   * Gets an embedding from cache or generates a new one
   */
  public async getEmbedding(text: string): Promise<number[]> {
    // Normalize text for consistent caching
    const normalizedText = text.trim().toLowerCase();
    
    // Return from cache if available
    if (this.cache.has(normalizedText)) {
      return this.cache.get(normalizedText)!;
    }
    
    // Generate new embedding
    const embedding = await getEmbedding(normalizedText);
    
    // Cache the result
    this.cache.set(normalizedText, embedding);
    
    return embedding;
  }
  
  /**
   * Preloads embeddings for common concepts
   */
  public async preloadCommonConcepts(concepts: string[]): Promise<void> {
    await Promise.all(
      concepts.map(concept => this.getEmbedding(concept))
    );
  }
}

// Export the singleton instance
export const embeddingCache = EmbeddingCache.getInstance(); 