/**
 * MarcusState.ts
 * Stateful tracking of Marcus's patience, respect perception, and purpose clarity
 * Separates three distinct behavioral dimensions instead of one vague "attention span"
 */

import { extractName, extractCompany } from './InfoExtraction';
import { isMinimalResponse, calculateEffortQuality, hasThoughtfulQuestion, isVagueResponse } from './EngagementDetection';
import { detectRelationshipContext, shouldSkipCompanyGate, type RelationshipContext } from './RelationshipDetection';
import type { MarcusStateFeedback } from './CharmerAIService';

export interface MarcusState {
  // Relationship context
  relationshipContext: RelationshipContext; // 'cold' | 'warm_claimed' | 'warm_verified'
  
  // Required information gates
  hasName: boolean; // Non-negotiable - Marcus needs this
  userName?: string; // Extracted name
  hasCompany: boolean; // Required for cold calls, skipped for warm
  companyName?: string; // Extracted company
  
  // Purpose clarity - information dimension
  purposeStated: boolean;
  exchangesWithoutPurpose: number;
  
  // Variance factor - prevents predictable patterns
  varianceSeed: number; // 0-1, set once per call for personality variance
  
  // Patience / time pressure - state dimension
  patienceLevel: number; // 0-1 (1 = very patient today)
  irritationLevel: number; // 0-1 (1 = very irritated)
  
  // Respect / vibe - tone dimension
  perceivedRespect: number; // 0-1 (0 = disrespectful, 1 = respectful)
  
  // User engagement quality (for earned vs unearned silence)
  userEffortQuality: number; // 0-1 (0 = low effort, 1 = high effort)
  consecutiveMinimalResponses: number; // Track vague/minimal responses in a row
  lastUserTextLength: number; // Track engagement depth
  
  // Behavior stage (derived from above)
  behaviorStage: 'normal' | 'needs_name' | 'needs_company' | 'needs_purpose' | 'direct' | 'impatient' | 'done';
}

/**
 * Detect if user has stated a clear business purpose
 * Rough pattern matching - just needs to be "basically clear"
 */
export function detectPurpose(text: string): boolean {
  const patterns = [
    /i'?m calling because/i,
    /the reason.*calling/i,
    /we (offer|provide|sell|build|help)/i,
    /my (company|team|startup|product) (does|helps|is)/i,
    /i wanted to (talk|chat|speak|discuss) about/i,
    /here's what we do/i,
    /let me tell you about/i,
    /our (product|service|solution|platform)/i,
    /we specialize in/i,
    /i help (companies?|businesses?|people)/i
  ];
  
  return patterns.some(p => p.test(text));
}

/**
 * Calculate Marcus's current behavior stage based on state
 * This is the "ladder" that determines how he acts
 * GATES OVERRIDE PATIENCE: Name and company are non-negotiable
 */
export function calculateBehaviorStage(state: MarcusState): MarcusState['behaviorStage'] {
  // Stage FINAL - Done (one-way door)
  if (state.irritationLevel >= 0.9) {
    return 'done';
  }
  
  // GATE 1 - Name is non-negotiable (immediate enforcement)
  if (!state.hasName && state.exchangesWithoutPurpose >= 1) {
    return 'needs_name';
  }
  
  // GATE 2 - Company required after name (SKIP for warm calls)
  const skipCompany = shouldSkipCompanyGate(state.relationshipContext);
  if (state.hasName && !state.hasCompany && !skipCompany && state.exchangesWithoutPurpose >= 1) {
    return 'needs_company';
  }
  
  // GATE 3 - Purpose required after name (or name+company for cold calls)
  const companyGateSatisfied = skipCompany || state.hasCompany;
  if (state.hasName && companyGateSatisfied && !state.purposeStated && state.exchangesWithoutPurpose >= 1) {
    return 'needs_purpose';
  }
  
  // Stage - Impatient (after gates are satisfied)
  // Add variance: some Marcus personalities tolerate more, some less
  const patienceThreshold = 0.4 + (state.varianceSeed * 0.2 - 0.1); // 0.3 to 0.5
  const irritationThreshold = 0.7 + (state.varianceSeed * 0.2 - 0.1); // 0.6 to 0.8
  
  const impatientConditions = (
    state.perceivedRespect < patienceThreshold ||
    state.irritationLevel >= irritationThreshold
  );
  
  if (impatientConditions) {
    return 'impatient';
  }
  
  // Stage - Direct (slight pushiness, not full impatience)
  // Add variance: some Marcus personalities are naturally more direct
  const directnessThreshold = 5 + Math.floor(state.varianceSeed * 3); // 5-7 exchanges
  const respectThreshold = 0.6 + (state.varianceSeed * 0.15 - 0.075); // 0.525 to 0.675
  
  const directConditions = (
    (state.exchangesWithoutPurpose >= directnessThreshold && !state.purposeStated) ||
    state.perceivedRespect < respectThreshold
  );
  
  if (directConditions) {
    return 'direct';
  }
  
  // Stage - Normal
  return 'normal';
}

/**
 * Initialize Marcus state for a new call
 */
export function initializeMarcusState(basePatienceLevel: number = 0.7): MarcusState {
  return {
    relationshipContext: 'cold', // Default to cold call
    hasName: false,
    userName: undefined,
    hasCompany: false,
    companyName: undefined,
    purposeStated: false,
    exchangesWithoutPurpose: 0,
    patienceLevel: basePatienceLevel,
    irritationLevel: 0.0,
    perceivedRespect: 0.7, // Start neutral-positive
    userEffortQuality: 0.5, // Start neutral
    consecutiveMinimalResponses: 0,
    lastUserTextLength: 0,
    behaviorStage: 'normal',
    varianceSeed: Math.random() // Unique personality variance per call
  };
}

/**
 * Update Marcus state based on user input and LLM feedback
 */
export function updateMarcusState(
  state: MarcusState,
  userText: string,
  llmFeedback?: MarcusStateFeedback
): MarcusState {
  const updated = { ...state };
  
  // RELATIONSHIP CONTEXT: Detect warm vs cold call on first exchange
  if (updated.exchangesWithoutPurpose === 0) {
    const detectedContext = detectRelationshipContext(userText);
    if (detectedContext !== 'cold') {
      updated.relationshipContext = detectedContext;
      console.log(`🤝 Warm call detected: ${detectedContext}`);
    }
  }
  
  // GATE 1: Extract name if not already captured
  if (!updated.hasName) {
    const extractedName = extractName(userText);
    if (extractedName) {
      updated.hasName = true;
      updated.userName = extractedName;
      console.log(`✅ Name extracted: ${extractedName}`);
    }
  }
  
  // GATE 2: Extract company if name is captured but company isn't
  if (updated.hasName && !updated.hasCompany) {
    const extractedCompany = extractCompany(userText);
    if (extractedCompany) {
      updated.hasCompany = true;
      updated.companyName = extractedCompany;
      console.log(`✅ Company extracted: ${extractedCompany}`);
    }
  }
  
  // GATE 3: Check if purpose was stated
  if (!updated.purposeStated && detectPurpose(userText)) {
    updated.purposeStated = true;
    console.log(`✅ Purpose detected`);
  }
  
  // Track exchanges without progress
  if (!updated.purposeStated) {
    updated.exchangesWithoutPurpose += 1;
  } else {
    updated.exchangesWithoutPurpose = 0; // Reset if purpose stated
  }
  
  // ENGAGEMENT TRACKING: Earned vs unearned silence
  const isMinimal = isMinimalResponse(userText);
  const isVague = isVagueResponse(userText);
  const hasQuestion = hasThoughtfulQuestion(userText);
  const isDetailedResponse = userText.split(/\s+/).length >= 15;
  
  // Track minimal responses (for pattern detection)
  if (isMinimal || isVague) {
    updated.consecutiveMinimalResponses += 1;
    console.log(`⚠️ Minimal/vague response detected (${updated.consecutiveMinimalResponses} in a row)`);
  } else {
    updated.consecutiveMinimalResponses = 0; // Reset on substantive response
  }
  
  // Calculate effort quality (0-1)
  const effortScore = calculateEffortQuality(userText, hasQuestion, isDetailedResponse);
  
  // Blend with previous effort quality (weighted average)
  updated.userEffortQuality = updated.userEffortQuality * 0.6 + effortScore * 0.4;
  
  // Track last user text length for context
  updated.lastUserTextLength = userText.length;
  
  console.log(`📊 User effort quality: ${updated.userEffortQuality.toFixed(2)} (minimal: ${isMinimal}, vague: ${isVague}, question: ${hasQuestion})`);
  
  // Apply LLM feedback if provided
  if (llmFeedback) {
    // LLM-extracted name (overrides regex extraction)
    if (!updated.hasName && llmFeedback.extracted_name) {
      updated.hasName = true;
      updated.userName = llmFeedback.extracted_name;
      console.log(`✅ Name extracted by LLM: ${llmFeedback.extracted_name}`);
    }
    
    // LLM-extracted company (overrides regex extraction)
    if (updated.hasName && !updated.hasCompany && llmFeedback.extracted_company) {
      updated.hasCompany = true;
      updated.companyName = llmFeedback.extracted_company;
      console.log(`✅ Company extracted by LLM: ${llmFeedback.extracted_company}`);
    }
    
    // Update respect perception (blend with current)
    if (llmFeedback.user_respect_level !== undefined) {
      updated.perceivedRespect = (
        updated.perceivedRespect * 0.6 + llmFeedback.user_respect_level * 0.4
      );
    }
    
    // Update irritation (accumulate delta)
    if (llmFeedback.marcus_irritation_delta !== undefined) {
      updated.irritationLevel = Math.max(0, Math.min(1, 
        updated.irritationLevel + llmFeedback.marcus_irritation_delta
      ));
    }
    
    // Purpose clarity can be adjusted by LLM too
    if (llmFeedback.purpose_clarity_delta !== undefined) {
      if (llmFeedback.purpose_clarity_delta > 0.3) {
        updated.purposeStated = true;
        updated.exchangesWithoutPurpose = 0;
      }
    }
  }
  
  // Automatic irritation increase if purpose not stated after many exchanges
  if (!updated.purposeStated && updated.exchangesWithoutPurpose >= 4) {
    updated.irritationLevel = Math.min(1, updated.irritationLevel + 0.1);
  }
  
  // Low respect increases irritation
  if (updated.perceivedRespect < 0.3) {
    updated.irritationLevel = Math.min(1, updated.irritationLevel + 0.15);
  }
  
  // Recalculate behavior stage
  updated.behaviorStage = calculateBehaviorStage(updated);
  
  return updated;
}

/**
 * Get prompt context string for Marcus based on his current state
 */
export function getMarcusStatePromptContext(state: MarcusState): string {
  return `## CONTEXT ABOUT THIS CALL
- has_name: ${state.hasName}${state.userName ? ` (${state.userName})` : ''}
- has_company: ${state.hasCompany}${state.companyName ? ` (${state.companyName})` : ''}
- purpose_stated: ${state.purposeStated}
- exchanges_without_purpose: ${state.exchangesWithoutPurpose}
- perceived_respect: ${state.perceivedRespect.toFixed(1)}
- irritation_level: ${state.irritationLevel.toFixed(1)}
- user_effort_quality: ${state.userEffortQuality.toFixed(1)} (${state.userEffortQuality >= 0.7 ? 'HIGH - earned patience' : state.userEffortQuality >= 0.5 ? 'MEDIUM' : 'LOW - unearned patience'})
- consecutive_minimal_responses: ${state.consecutiveMinimalResponses}
- behavior_stage: ${state.behaviorStage}

## BEHAVIOR RULES
${getBehaviorRulesForStage(state)}

## SILENCE HANDLING
${getSilenceHandlingRules(state)}`;
}

/**
 * Get behavior rules based on current stage
 */
/**
 * Get silence handling rules based on user effort quality
 */
function getSilenceHandlingRules(state: MarcusState): string {
  const { userEffortQuality, consecutiveMinimalResponses, irritationLevel } = state;
  
  // High effort = earned silence (patient)
  if (userEffortQuality >= 0.7) {
    return `EARNED SILENCE (User put in effort):
- Be patient with silence - they earned thinking time
- Gentle check-in after reasonable pause: "Want me to elaborate on that?" or "What are you thinking?"
- Assume they're processing thoughtfully`;
  }
  
  // Pattern of minimal responses = losing interest
  if (consecutiveMinimalResponses >= 3 || irritationLevel >= 0.8) {
    return `MOMENTUM LOST:
- Conversation has stalled - neither of you are engaged
- Natural fade: "I'm not sure where we're going with this" or "Maybe we should reconnect another time"
- Not confrontational - just acknowledging the awkwardness
- If it continues, set end_call: true naturally`;
  }
  
  // Low effort = confused, not angry
  if (userEffortQuality < 0.4 || consecutiveMinimalResponses >= 2) {
    return `CONFUSED BY SILENCE:
- They haven't given you much to work with - silence feels awkward
- Check in naturally: "You still with me?" or "Did I lose you?"
- Not accusatory, just checking if the connection is there
- If it continues, you'll naturally disengage`;
  }
  
  // Low effort but not yet annoyed = confused
  if (userEffortQuality < 0.5) {
    return `UNEARNED SILENCE - CONFUSED:
- User hasn't shown clear engagement
- Check-in with confusion: "Hello? Did you have a specific question?"
- "Not sure if I answered what you were asking?"
- Seek clarity on what they need`;
  }
  
  // Default (medium effort)
  return `MODERATE ENGAGEMENT:
- Normal check-ins after silence
- "Still there?" or "Does that make sense?"
- Watch for patterns of disengagement`;
}

function getBehaviorRulesForStage(state: MarcusState): string {
  switch (state.behaviorStage) {
    case 'normal':
      return `- You're friendly and open to conversation
- Happy to answer questions about yourself and your work
- Natural pace, no rush
- All required info collected (name, company, purpose)`;
      
    case 'needs_name':
      return `- You need their name before continuing
- Ask naturally based on what they said: "Who is this?" or "Sorry, who am I talking to?"
- Don't discuss your business until you have their name`;
      
    case 'needs_company':
      return `- COLD CALL ONLY: You have their name (${state.userName}), now you NEED their company
- Ask IMMEDIATELY: "And you're with...?" or "What company are you calling from?"
- DO NOT ask about their purpose yet - you don't even know what company they represent
- DO NOT say "what's on your mind" or "how can I help" - that comes AFTER you know their company
- This is a cold call - standard etiquette is name, then company, then purpose`;
      
    case 'needs_purpose':
      const isWarm = state.relationshipContext !== 'cold';
      const warmContext = isWarm ? `\n- WARM CALL: Start friendly, then IMMEDIATELY pivot to purpose\n- Pattern: [quick greeting] + [short relational beat] + [what's up?]\n- Example: "Good to hear from you. I'm in the middle of something but I've got a few minutes - what's up?"\n- Example: "Nice! So what can I help you with?"\n- DO NOT extend small talk - you're busy` : '';
      return `- You have name (${state.userName})${state.companyName ? ` and company (${state.companyName})` : ''}, you NEED to know why they're calling
- CRITICAL: Distinguish DISCOVERY from SALES INTENT
  * If they're asking about YOUR business (pain points, challenges, pipeline): Answer naturally, engage in conversation
  * Only deflect when you detect SALES INTENT: mentioning their product, asking for your time, pitching features
  * Discovery = rapport building (legitimate)
  * Pitch without context = deflect immediately
- When you DO detect sales intent without clear purpose:
  * "What do you need from me?" / "What can I help you with?" / "So what's this about?"
  * Frame around YOUR time/resources: "What brings you to me?" / "What did you need?"
  * NOT exploratory/generous: Avoid "What's on your mind?" or "What are you thinking?"${warmContext}`;
      
    case 'direct':
      return `- Conversation lacks momentum - you're mildly curious but drifting
- Shorter responses, less elaboration
- Redirect gently: "So where are we going with this?" or "Help me understand what you're getting at"
- Not rude, just less generous with your attention`;
      
    case 'impatient':
      return `- You're losing interest - this feels unproductive
- Brief responses, minimal engagement
- Subtle time pressure: "I've got a few minutes" or "What exactly did you need?"
- Not angry, just disengaged - like you're mentally checking out`;
      
    case 'done':
      return `- This isn't going anywhere - time to wrap
- Natural exit: "I don't think this is the right fit" or "I'm going to let you go" or "I should probably jump"
- Brief, not harsh - more fade than rejection
- Set end_call: true in your metadata`;
  }
}
