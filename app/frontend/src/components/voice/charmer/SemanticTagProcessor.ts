/**
 * SemanticTagProcessor.ts
 * Add SSML tags to Marcus's speech for consistent prosody
 * Prevents TTS from guessing inflection/rhythm
 */

export interface SemanticTagOptions {
  baseEmotion?: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued';
}

/**
 * Add semantic SSML tags to text for natural prosody
 * SIMPLIFIED: Only sentence breaks for now
 */
export function addSemanticTags(text: string, options: SemanticTagOptions = {}): string {
  let tagged = text;
  
  // Only add period breaks for natural sentence rhythm
  tagged = addNaturalPauses(tagged);
  
  // NOTE: All other prosody (emotion, speed, emphasis) handled via API
  // SSML tags were causing conflicts and jittery delivery
  
  return tagged;
}

// REMOVED: processQuestions function
// Emotion tags via SSML conflict with API emotion parameter
// Cartesia handles question inflection automatically from punctuation

/**
 * Add break tags for natural rhythm
 * MINIMAL: Only sentence breaks
 */
function addNaturalPauses(text: string): string {
  // Only pause at sentence boundaries
  return text.replace(/\.\s+/g, '.<break time="250ms"/> ');
}

// REMOVED: emphasizeSelfCenteredLanguage
// Speed tags were causing jittery delivery
// Let natural speech patterns carry self-centered tone

/**
 * Strip SSML tags (for display/logging purposes)
 */
export function stripSemanticTags(text: string): string {
  return text
    .replace(/<emotion value="[^"]*"\/>/g, '')
    .replace(/<break time="[^"]*"\/>/g, '')
    .replace(/<speed ratio="[^"]*"\/>/g, '')
    .replace(/<volume ratio="[^"]*"\/>/g, '')
    .replace(/<spell>/g, '')
    .replace(/<\/spell>/g, '')
    .trim();
}
