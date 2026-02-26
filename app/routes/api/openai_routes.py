"""
OpenAI API Proxy Routes
Provides secure backend proxy for OpenAI chat completions (used by Marcus demo)
"""

import logging
from flask import Blueprint, request, jsonify, current_app, Response, stream_with_context
from flask_login import login_required
import json

logger = logging.getLogger(__name__)

openai_bp = Blueprint('openai', __name__)

@openai_bp.route('/chat', methods=['POST'])
def chat():
    """
    Proxy chat completions via OpenRouter (supports multiple AI providers)
    Used by Marcus (CharmerAIService) for dynamic conversation generation
    
    Supports streaming for low-latency responses via SSE
    
    Supported models:
    - openai/gpt-4o-mini (fast, cheap, less polite)
    - anthropic/claude-3-5-sonnet (current default)
    - openai/gpt-4o (slower, smarter)
    - meta-llama/llama-3.1-70b-instruct (open source, direct)
    - mistralai/mistral-large (European, less customer-service-y)
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract parameters
        model = data.get('model', 'openai/gpt-4o-mini')
        messages = data.get('messages', [])
        temperature = data.get('temperature', 0.6)
        max_tokens = data.get('max_tokens', 150)
        stream = data.get('stream', False)  # Enable streaming for low latency
        
        if not messages:
            return jsonify({'error': 'No messages provided'}), 400
        
        # Use OpenRouter instead of direct OpenAI
        import os
        import requests
        
        openrouter_key = os.environ.get('OPENROUTER_API_KEY')
        if not openrouter_key:
            logger.error("OPENROUTER_API_KEY not set")
            return jsonify({'error': 'OpenRouter not configured'}), 503
        
        # Call OpenRouter API
        logger.info(f"Generating response with {model} via OpenRouter (temp={temperature}, max_tokens={max_tokens}, stream={stream})")
        
        # Build headers - add Accept header for SSE when streaming
        headers = {
            'Authorization': f'Bearer {openrouter_key}',
            'HTTP-Referer': 'https://pitchiq.com',
            'X-Title': 'PitchIQ Marcus Demo',
            'Content-Type': 'application/json'
        }
        
        if stream:
            headers['Accept'] = 'text/event-stream'
        
        logger.info(f"Sending request to OpenRouter with stream={stream}")
        logger.info(f"Request headers: {headers}")
        
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json={
                'model': model,
                'messages': messages,
                'temperature': temperature,
                'max_tokens': max_tokens,
                'stream': stream
            },
            stream=stream
        )
        
        logger.info(f"OpenRouter response status: {response.status_code}")
        logger.info(f"OpenRouter response headers: {dict(response.headers)}")
        
        if not response.ok:
            logger.error(f"OpenRouter error: {response.status_code} - {response.text}")
            return jsonify({'error': f'OpenRouter API error: {response.status_code}'}), 500
        
        # Check if response is actually streaming based on Content-Type
        content_type = response.headers.get('Content-Type', '')
        is_streaming = 'text/event-stream' in content_type or 'stream' in content_type.lower()
        
        logger.info(f"Response Content-Type: {content_type}, Is streaming: {is_streaming}, stream param: {stream}")
        
        # Handle streaming response
        if stream and is_streaming:
            def generate():
                try:
                    logger.info("Starting SSE stream generation...")
                    line_count = 0
                    for line in response.iter_lines():
                        if line:
                            line_count += 1
                            line_text = line.decode('utf-8')
                            
                            # Log first few lines for debugging
                            if line_count <= 3:
                                logger.info(f"SSE line #{line_count}: {line_text[:100]}")
                            
                            if line_text.startswith('data: '):
                                chunk_data = line_text[6:]  # Remove 'data: ' prefix
                                if chunk_data.strip() == '[DONE]':
                                    logger.info(f"Stream complete - sent {line_count} lines")
                                    yield f"data: [DONE]\n\n"
                                    break
                                yield f"data: {chunk_data}\n\n"
                    
                    if line_count == 0:
                        logger.warning("⚠️ No lines received from OpenRouter stream!")
                    
                    logger.info(f"SSE generation complete - total lines: {line_count}")
                except Exception as e:
                    logger.error(f"Error in streaming: {e}", exc_info=True)
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            return Response(stream_with_context(generate()), mimetype='text/event-stream', headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'  # Disable nginx buffering
            })
        
        # Non-streaming response (legacy)
        result = response.json()
        logger.info(f"Generated {result.get('usage', {}).get('completion_tokens', 0)} tokens with {model}")
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in OpenAI chat proxy: {e}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
