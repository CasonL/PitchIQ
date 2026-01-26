/**
 * TTSSanitizer.ts
 * Centralized sanitization to guarantee metadata never reaches TTS
 */

/**
 * Strip all metadata tags from text before sending to TTS
 * CRITICAL: This prevents Marcus from accidentally speaking metadata
 */
export function sanitizeForTTS(text: string): string {
  let sanitized = text;
  
  // Strip <META>...</META> blocks (primary format)
  sanitized = sanitized.replace(/<META>.*?<\/META>/gs, '');
  
  // Strip old format tags as fallback (belt and suspenders)
  sanitized = sanitized.replace(/FOLLOWUP:\s*.+?(?:\n|$)/gi, '');
  sanitized = sanitized.replace(/END_CALL:\s*(true|false)\s*/gi, '');
  sanitized = sanitized.replace(/OBJECTION:\s*\w+\s+[0-9.]+\s+(true|false)\s*/gi, '');
  sanitized = sanitized.replace(/RESPONSE:\s*/gi, '');
  
  // Strip any remaining JSON blocks (just in case)
  sanitized = sanitized.replace(/\{[^}]*"followup"[^}]*\}/g, '');
  sanitized = sanitized.replace(/\{[^}]*"end_call"[^}]*\}/g, '');
  sanitized = sanitized.replace(/\{[^}]*"objections"[^}]*\}/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Log if we stripped anything (helps catch leaks)
  if (sanitized !== text.trim()) {
    console.log('🧹 Sanitized text for TTS (stripped metadata)');
  }
  
  return sanitized;
}

/**
 * Validate that text is safe for TTS (no metadata artifacts)
 */
export function isSafeForTTS(text: string): boolean {
  // Check for metadata patterns
  const unsafePatterns = [
    /<META>/i,
    /<\/META>/i,
    /FOLLOWUP:/i,
    /END_CALL:/i,
    /OBJECTION:/i,
    /"followup":/i,
    /"end_call":/i,
    /"objections":/i
  ];
  
  return !unsafePatterns.some(pattern => pattern.test(text));
}
