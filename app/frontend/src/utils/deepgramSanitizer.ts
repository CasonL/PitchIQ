// src/utils/deepgramSanitizer.ts
// Utilities for preparing Deepgram-compatible text and settings

// Sanitize freeform text for Deepgram Voice Agent API
// - Single line
// - No list markers/section headers
// - No fancy quotes/backticks
// - Collapse whitespace
// - Enforce conservative max length
export function sanitizeForDeepgramText(input: string, maxLen: number = 1200): string {
  if (!input) return '';
  let s = String(input);
  // Flatten newlines and tabs
  s = s.replace(/[\n\r\t]+/g, ' ');
  // Remove common section headers used in our prompts
  s = s.replace(/\bHUMAN-LIKE BEHAVIOR RULES:\b/gi, '');
  s = s.replace(/\bINTELLIGENT PAUSING FOR COMPLEX QUESTIONS:\b/gi, '');
  s = s.replace(/\bREALISTIC UNCERTAINTY AND KNOWLEDGE GAPS:\b/gi, '');
  s = s.replace(/\bINTELLIGENT QUESTION REDIRECTION.*?:/gi, '');
  s = s.replace(/\bCALL OPENING INSTRUCTIONS:\b/gi, '');
  // Replace bullet dashes and numbered lists
  s = s.replace(/\s*-\s+/g, ' ');
  s = s.replace(/\b\d+\.\s+/g, ' ');
  // Remove fancy quotes/backticks
  s = s.replace(/[`“”‘’]/g, '');
  // Strip markdown links [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  // Remove common markdown emphasis markers while preserving content
  // Handle bold/italic combinations like ***text***, **text**, *text*, __text__, _text_
  s = s.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
  // Remove any remaining stray asterisks/underscores
  s = s.replace(/[*_]+/g, '');
  // Remove heading markers (best-effort after newline flatten)
  s = s.replace(/(^|\s)#{1,6}\s+/g, '$1');
  // Reduce repeated punctuation
  s = s.replace(/[:;]{2,}/g, ':');
  s = s.replace(/\.{3,}/g, '...');
  // Collapse spaces
  s = s.replace(/\s{2,}/g, ' ').trim();
  // Enforce max length conservatively
  if (s.length > maxLen) {
    s = s.slice(0, maxLen);
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace > Math.floor(maxLen * 0.7)) s = s.slice(0, lastSpace);
    s = s.trim();
  }
  return s;
}

// Sanitize greeting specifically, with a tighter length bound (Deepgram commonly suggests ~160 chars)
export function sanitizeGreeting(input: string, maxLen: number = 400): string {
  // Reuse base sanitizer, but with tighter max length
  return sanitizeForDeepgramText(input, maxLen);
}

// Remove/normalize fields that can cause Deepgram parsing errors and conform to AgentLiveSchema
export interface HardenOptions {
  preserveLegacy?: boolean;
}

export function hardenSettings<T extends Record<string, any>>(settings: T, opts: HardenOptions = {}): T {
  const clone: any = JSON.parse(JSON.stringify(settings || {}));
  const preserve = !!opts.preserveLegacy;

  // Known-problem or legacy fields (top-level)
  delete clone.agent_id;
  delete clone.system_prompt;
  // In legacy/provider-shaped mode, we intentionally KEEP experimental=false
  // to force legacy handling on the server. Only strip in strict mode.
  if (!preserve) {
    delete clone.experimental;
  }
  delete clone.type; // SDK handles message envelope

  // Normalize audio fields and key casing
  if (clone.audio) {
    // Input: only encoding, sampleRate (camelCase), multichannel? (optional)
    if (clone.audio.input) {
      if (!preserve) {
        if (typeof clone.audio.input.sample_rate !== 'undefined') {
          clone.audio.input.sampleRate = clone.audio.input.sample_rate;
          delete clone.audio.input.sample_rate;
        }
      }
      if (!preserve) {
        delete clone.audio.input.channels;
        delete clone.audio.input.container;
      }
    }
    // Output: encoding, container, sampleRate (camelCase)
    if (clone.audio.output) {
      if (!preserve) {
        if (typeof clone.audio.output.sample_rate !== 'undefined') {
          clone.audio.output.sampleRate = clone.audio.output.sample_rate;
          delete clone.audio.output.sample_rate;
        }
      }
    }
  }

  if (clone.agent) {
    // Remove unsupported agent-level fields
    delete clone.agent.agent_id;
    delete clone.agent.system_prompt;
    if (!preserve) {
      delete clone.agent.experimental;
    }
    if (!preserve) {
      delete clone.agent.language; // not in AgentLiveSchema
    }

    // Move greeting to context.messages (assistant) only in strict mode.
    // In legacy mode, keep agent.greeting as-is to leverage provider-shaped payload stability.
    if (!preserve) {
      if (typeof clone.agent.greeting === 'string' && clone.agent.greeting.trim()) {
        const greeting = sanitizeGreeting(clone.agent.greeting);
        clone.context = clone.context || {};
        const msgs = Array.isArray(clone.context.messages) ? clone.context.messages : [];
        msgs.push({ role: 'assistant', content: greeting });
        clone.context.messages = msgs;
        if (typeof clone.context.replay !== 'boolean') clone.context.replay = true;
        delete clone.agent.greeting;
      }
    }

    // Normalize listen: in strict mode, copy provider.model → model; in legacy mode, keep provider shape as-is and remove duplicate top-level model
    if (clone.agent.listen) {
      const lp = clone.agent.listen.provider;
      if (!preserve) {
        if (lp && lp.model && !clone.agent.listen.model) {
          clone.agent.listen.model = lp.model;
        }
      }
      if (preserve && lp && typeof clone.agent.listen.model !== 'undefined') {
        // Remove duplicate top-level model to match legacy provider-shaped payloads
        delete clone.agent.listen.model;
      }
      if (!preserve) {
        delete clone.agent.listen.provider;
        delete clone.agent.listen.smart_format;
        delete clone.agent.listen.interim_results;
        delete clone.agent.listen.endpointing;
        delete clone.agent.listen.endpointing_ms;
      }
    }

    // Normalize think. In legacy/provider-shaped mode (preserve=true), keep `prompt` as-is
    // because some agents reject `instructions`. In strict mode, prefer `instructions`.
    if (clone.agent.think) {
      if (preserve) {
        // Legacy/provider-shaped: keep prompt, drop instructions
        if (typeof clone.agent.think.prompt === 'string') {
          clone.agent.think.prompt = sanitizeForDeepgramText(clone.agent.think.prompt);
        }
        if (typeof clone.agent.think.instructions !== 'undefined') {
          delete clone.agent.think.instructions;
        }
      } else {
        // Strict schema: prefer `instructions`
        if (typeof clone.agent.think.prompt === 'string' && !clone.agent.think.instructions) {
          clone.agent.think.instructions = sanitizeForDeepgramText(clone.agent.think.prompt);
        } else if (typeof clone.agent.think.instructions === 'string') {
          clone.agent.think.instructions = sanitizeForDeepgramText(clone.agent.think.instructions);
        }
      }

      // Keep provider fields as provided; do not force enum normalization or flatten
      const prov = clone.agent.think.provider;
      if (prov && typeof prov === 'object') {
        // Do not modify provider.type casing or model nesting; maintain legacy-compatible shape
        // For custom provider, we still remove url/key in strict mode

        // Remove url/key for non-custom providers
        if (clone.agent.think.provider && clone.agent.think.provider.type !== 'custom') {
          delete clone.agent.think.provider.url;
          delete clone.agent.think.provider.key;
        }
        if (preserve && typeof clone.agent.think.model !== 'undefined') {
          // Remove duplicate top-level think.model; keep provider.model
          delete clone.agent.think.model;
        }
      }

      if (!preserve) delete clone.agent.think.prompt;
      delete clone.agent.think.temperature;
    }

    // Normalize speak: in strict mode, copy provider.model → model; in legacy mode, keep provider shape and remove duplicate top-level model
    if (clone.agent.speak) {
      const sp = clone.agent.speak.provider;
      if (!preserve) {
        if (sp && sp.model && !clone.agent.speak.model) {
          clone.agent.speak.model = sp.model;
        }
      }
      if (preserve && sp && typeof clone.agent.speak.model !== 'undefined') {
        delete clone.agent.speak.model;
      }
      if (!preserve) {
        delete clone.agent.speak.provider;
      }
    }

  }

  return clone as T;
}
