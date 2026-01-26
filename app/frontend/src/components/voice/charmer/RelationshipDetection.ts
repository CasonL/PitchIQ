/**
 * RelationshipDetection.ts
 * Detect if caller is claiming prior relationship (warm call) vs cold call
 */

export type RelationshipContext = 'cold' | 'warm_claimed' | 'warm_verified';

/**
 * Detect if caller is claiming they know Marcus from somewhere
 * Warm signals = they claim prior connection
 * Cold = no context given, just calling
 */
export function detectRelationshipContext(text: string): RelationshipContext {
  const lowerText = text.toLowerCase();
  
  // Warm call signals - claiming prior connection
  const warmSignals = [
    /we met (at|during|in)/i,
    /we talked (at|about|during)/i,
    /we spoke (at|about|last)/i,
    /you (and i|&\s*i) met/i,
    /remember me (from)?/i,
    /we were (at|in)/i,
    /saw you (at|in)/i,
    /you mentioned/i,
    /you told me/i,
    /you said/i,
    /from (the|that) (event|conference|meeting|networking|party)/i,
    /at (the|that) (event|conference|meeting|networking)/i,
    /last (week|month|time)/i,
    /the other day/i,
    /referred (me|us) to you/i,
    /\b(john|sarah|mike|lisa|david|karen)\b.*mentioned you/i, // Name + mentioned
    /mutual (friend|contact|connection)/i
  ];
  
  // Check for warm signals
  if (warmSignals.some(pattern => pattern.test(text))) {
    return 'warm_claimed';
  }
  
  // Default to cold call
  return 'cold';
}

/**
 * Get appropriate response to warm call claim
 * Marcus can either play along or politely admit he doesn't remember
 */
export function getWarmCallResponse(hasRemembered: boolean): string {
  if (hasRemembered) {
    return 'Play along - you vaguely remember them or are being polite';
  } else {
    return 'Politely say you don\'t quite remember: "Refresh my memory?" or "Remind me where we met?"';
  }
}

/**
 * Determine if company gate should be skipped for warm calls
 */
export function shouldSkipCompanyGate(relationshipContext: RelationshipContext): boolean {
  // If they claim to know you, asking "what company?" is insulting
  return relationshipContext === 'warm_claimed' || relationshipContext === 'warm_verified';
}
