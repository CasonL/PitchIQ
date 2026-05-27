/**
 * LLMStreamClient.ts
 * Handles SSE streaming from OpenAI API via backend
 * Detects first sentence for low-latency TTS
 */

import { API_ENDPOINTS } from '@/config/apiEndpoints';
import type { SentenceStreamCallback } from '../types/MarcusAI.types';

// SENTENCE STREAMING: Emit first sentence immediately while continuing to stream
const USE_SENTENCE_STREAMING = true;

export class LLMStreamClient {
  private model: string;
  
  constructor(model: string) {
    this.model = model;
  }
  
  /**
   * Stream response from LLM with first-sentence callback
   */
  async stream(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userPrompt: string,
    onFirstSentence?: SentenceStreamCallback
  ): Promise<string> {
    const startTime = performance.now();
    
    // Call AI via Netlify Function with STREAMING enabled
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    let response: Response;
    try {
      response = await fetch(API_ENDPOINTS.OPENAI_CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.75,
          max_tokens: 350,
          stream: true,
          use_cache: true  // Enable prompt caching for 3-5x faster responses
        }),
        signal: controller.signal
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('OpenAI API request timed out after 30 seconds');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    // Handle streaming response (SSE)
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }
    
    const decoder = new TextDecoder();
    let rawContent = '';
    let buffer = '';
    let firstChunkTime: number | null = null;
    let firstSentenceEmitted = false;
    let streamingEmotion: string | undefined = undefined;
    
    console.log('📡 Starting SSE stream...');
    
    // Add streaming timeout - if no data for 15s, abort
    let streamTimeout: ReturnType<typeof setTimeout> | null = null;
    let streamTimedOut = false;
    const resetStreamTimeout = () => {
      if (streamTimeout) clearTimeout(streamTimeout);
      streamTimeout = setTimeout(() => {
        streamTimedOut = true;
        reader.cancel();
      }, 15000);
    };
    
    try {
      resetStreamTimeout();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (streamTimedOut) {
          throw new Error('Stream timed out - no data received for 15 seconds');
        }
        resetStreamTimeout();
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          if (data === '[DONE]') {
            const duration = performance.now() - startTime;
            console.log(`⏱️ LLM stream completed in ${duration.toFixed(0)}ms`);
            break;
          }
          
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            
            if (delta) {
              if (!firstChunkTime) {
                firstChunkTime = performance.now();
                const timeToFirst = firstChunkTime - startTime;
                console.log(`⚡ First token in ${timeToFirst.toFixed(0)}ms`);
              }
              rawContent += delta;
              
              // SENTENCE STREAMING: Emit first complete sentence
              if (USE_SENTENCE_STREAMING && !firstSentenceEmitted && onFirstSentence) {
                let workingContent = rawContent;
                const emotionMatch = workingContent.match(/^\[(\w+)\]\s*/);
                if (emotionMatch) {
                  streamingEmotion = emotionMatch[1].toLowerCase();
                  workingContent = workingContent.replace(emotionMatch[0], '').trim();
                }
                
                // Look for first complete sentence
                const sentenceMatch = workingContent.match(/^[^.!?]+[.!?](?=\s|$)/);
                if (sentenceMatch) {
                  const firstSentence = sentenceMatch[0].trim();
                  const wordCount = firstSentence.split(/\s+/).length;
                  if (wordCount >= 3 && !firstSentence.includes('<META>')) {
                    firstSentenceEmitted = true;
                    const sentenceTime = performance.now() - startTime;
                    console.log(`🚀 First sentence ready in ${sentenceTime.toFixed(0)}ms: "${firstSentence.substring(0, 50)}..."`);
                    onFirstSentence(firstSentence, streamingEmotion);
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Failed to parse SSE chunk:', data.substring(0, 100));
          }
        }
      }
    } finally {
      if (streamTimeout) clearTimeout(streamTimeout);
      reader.releaseLock();
    }
    
    if (!rawContent) {
      throw new Error('No content received from streaming response');
    }
    
    return rawContent;
  }
}
