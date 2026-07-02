exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const requestBody = JSON.parse(event.body);

    // Classify calls send { prompt, temperature, max_tokens } without messages/model.
    // Chat calls send { model, messages, stream, ... }.
    const isClassify = !!requestBody.prompt && !requestBody.messages;

    const model = requestBody.model || 'gpt-4o-mini';
    const messages = isClassify
      ? [{ role: 'user', content: requestBody.prompt }]
      : requestBody.messages;

    // Provider prefix (e.g. "google/...", "anthropic/...") → OpenRouter
    // Plain model name (e.g. "gpt-4o-mini") → direct OpenAI
    const isOpenRouterModel = model.includes('/');

    let apiUrl, apiKey, extraHeaders = {};

    if (isOpenRouterModel) {
      apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }) };
      }
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      extraHeaders = { 'HTTP-Referer': 'https://pitchiq.ca', 'X-Title': 'PitchIQ' };
    } else {
      apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_API_KEY not configured' }) };
      }
      apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    // Netlify sync functions cannot stream — force stream: false and collect full response.
    // For chat calls we re-emit the content as a single SSE chunk so LLMStreamClient parses it correctly.
    const payload = {
      model,
      messages,
      temperature: requestBody.temperature ?? 0.75,
      max_tokens: requestBody.max_tokens || 800,
      stream: false
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...extraHeaders
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(data)
      };
    }

    const content = data.choices?.[0]?.message?.content || '';

    // Classify: return plain { content } JSON
    if (isClassify) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ content })
      };
    }

    // Chat: synthesize SSE-compatible response so LLMStreamClient can parse it
    const sseChunk = JSON.stringify({
      choices: [{ delta: { content }, index: 0, finish_reason: null }]
    });
    const sseBody = `data: ${sseChunk}\n\ndata: [DONE]\n\n`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      },
      body: sseBody
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to process request', message: error.message })
    };
  }
};
