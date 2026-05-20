/**
 * BuyerStatePromptBuilder.ts
 * Builds buyer state instructions based on StrategyLayer/BuyerStateTree output
 */

import { MARCUS_OBJECTION_STACKS } from '../ObjectionStack';
import { 
  CONFUSION_PROMPT, 
  OBJECTION_ESCALATION_PROMPT, 
  DEGRADATION_PROMPT, 
  FORCE_EXIT_PROMPT,
  HIGH_RESISTANCE_PROMPT,
  MEDIUM_RESISTANCE_PROMPT,
  LOW_RESISTANCE_PROMPT
} from './MarcusBasePrompt';
import type { BuyerState } from '../StrategyLayer';

export class BuyerStatePromptBuilder {
  /**
   * Build buyer state instructions for Marcus's behavior
   */
  static buildBuyerStatePrompt(state: BuyerState): string {
    let prompt = `\n\n---\n\n**HOW YOU FEEL RIGHT NOW:**\n\n`;
    
    prompt += `**Current Emotional State:** ${state.emotionalPosture}\n`;
    prompt += `- Your resistance/guardedness level is ${state.resistanceLevel}/10\n`;
    prompt += `- Your openness to this conversation: ${state.openness}/10\n`;
    prompt += `- Your patience remaining: ${state.patience}/10\n`;
    prompt += `- Your trust level in this person: ${state.trustLevel}/10\n`;
    prompt += `- How clear you are on what they're offering: ${state.clarity}/10\n`;
    prompt += `- How relevant this feels to your needs: ${state.relevance}/10\n`;
    
    // CRITICAL: Default to statements, not questions
    prompt += `\n⛔ **YOUR RESPONSE STYLE:**\n`;
    prompt += `Prefer short buyer reactions over exploratory coaching questions.\n`;
    prompt += `Ask questions only when buyer-realistic: clarify the offer, ask how it works, challenge proof, compare to current solution, or qualify price/timing when earned.\n`;
    prompt += `Say what you think, then go quiet. Let THEM do most of the talking.\n\n`;
    
    // Backend-approved question (RARE - only when strategically appropriate)
    if (state.approvedQuestion) {
      prompt += `\n✅ **APPROVED QUESTION (use this exact question):**\n`;
      prompt += `You MAY ask: "${state.approvedQuestion.question}"\n`;
      prompt += `Context: ${state.approvedQuestion.context}\n`;
      prompt += `This is a ${state.approvedQuestion.type} question that makes sense for a real buyer.\n\n`;
      console.log(`✅ [ApprovedQ] Injected: "${state.approvedQuestion.question}" (${state.approvedQuestion.type})`);
    }
    
    // CRITICAL: Acknowledge when they address your concerns
    if (state.lastAcknowledgment) {
      prompt += `\n**🎯 ACKNOWLEDGE THEIR ANSWER:**\n`;
      prompt += `- They just addressed your concern somewhat well\n`;
      prompt += `- Start your response with: "${state.lastAcknowledgment}"\n`;
      prompt += `- Then pivot to your next concern or remaining skepticism\n`;
      prompt += `- DO NOT repeat the same objection if it was partially satisfied\n`;
      prompt += `- You can still be skeptical on OTHER concerns\n\n`;
    }
    
    // CRITICAL 1: Force exit - highest priority
    if (state.shouldForceExit) {
      prompt += `\n${FORCE_EXIT_PROMPT} Reason: ${state.exitReason}\n\n`;
      return prompt; // Exit early - nothing else matters
    }
    
    // CRITICAL 2: Objection escalation
    if (state.shouldEscalateObjection) {
      prompt += `\n${OBJECTION_ESCALATION_PROMPT} Theme: "${state.objectionEscalationTheme}" (${state.objectionCount} times)\n\n`;
    }
    
    // CRITICAL 3: Rep incoherence - show confusion
    if (state.shouldShowConfusion) {
      prompt += `\n${CONFUSION_PROMPT}\n\n`;
    }
    
    // CRITICAL 4: Progress degradation - show suspicion/annoyance
    if (state.shouldShowDegradation) {
      prompt += `\n${DEGRADATION_PROMPT} Reason: ${state.degradationReason}\n\n`;
    }
    
    // Active objection tracking - inject full ObjectionStack context
    if (state.activeObjection) {
      const satisfaction = state.objectionSatisfaction[state.activeObjection];
      
      // Try product-specific objections from ObjectionGenerator first
      let objectionData: { surface: string; roots: Array<{ conscious: boolean; description: string }> } | null = null;
      
      if (state.productSpecificObjections && state.productSpecificObjections[state.activeObjection]) {
        objectionData = state.productSpecificObjections[state.activeObjection];
        console.log(`🎯 [AI] Using product-specific objection for ${state.activeObjection} (${objectionData.roots.length} roots)`);
      } else {
        const objectionStack = MARCUS_OBJECTION_STACKS[state.activeObjection];
        if (objectionStack) {
          objectionData = objectionStack;
          console.log(`📚 [AI] Using hardcoded objection stack for ${state.activeObjection}`);
        }
      }
      
      if (objectionData) {
        prompt += `\n**YOUR CURRENT CONCERN:**\n`;
        prompt += `Surface objection: "${objectionData.surface}"\n`;
        prompt += `Satisfaction level: ${(satisfaction * 100).toFixed(0)}%\n\n`;
        
        // Conscious roots - what you're aware of
        const consciousRoots = objectionData.roots.filter(r => r.conscious);
        if (consciousRoots.length > 0) {
          prompt += `**What you're consciously feeling:**\n`;
          consciousRoots.forEach(root => {
            prompt += `- ${root.description}\n`;
          });
        }
        
        // Unconscious roots - hidden concerns that only surface if they dig deep
        const unconsciousRoots = objectionData.roots.filter(r => !r.conscious);
        if (unconsciousRoots.length > 0) {
          prompt += `\n**Hidden concerns (only reveal if they ask the RIGHT questions):**\n`;
          unconsciousRoots.forEach(root => {
            prompt += `- ${root.description}\n`;
          });
        }
        
        if (satisfaction < 0.3) {
          prompt += `\n⚠️ This is a MAJOR unresolved concern - you're very frustrated\n`;
        } else if (satisfaction < 0.7) {
          prompt += `\n⚠️ They've partially addressed this, but you're not fully convinced\n`;
        } else {
          prompt += `\n✓ This concern is mostly resolved\n`;
        }
      }
    }
    
    // Response behavior based on resistance - conditional injection
    if (state.resistanceLevel >= 7) {
      prompt += `\n${HIGH_RESISTANCE_PROMPT}\n`;
    } else if (state.resistanceLevel >= 5) {
      prompt += `\n${MEDIUM_RESISTANCE_PROMPT}\n`;
    } else {
      prompt += `\n${LOW_RESISTANCE_PROMPT}\n`;
    }
    
    // Disclosure gates
    prompt += `\n**What You Can/Cannot Disclose:**\n`;
    const gates = state.disclosureGates;
    
    if (!gates.canRevealBudget) prompt += `- DO NOT reveal budget information\n`;
    if (!gates.canRevealTimeline) prompt += `- DO NOT reveal timeline or urgency\n`;
    if (!gates.canRevealPainPoints) prompt += `- DO NOT reveal real pain points (stay surface level)\n`;
    if (!gates.canRevealDecisionProcess) prompt += `- DO NOT reveal decision-making process\n`;
    if (!gates.canShowInterest) prompt += `- DO NOT show too much interest (stay neutral/skeptical)\n`;
    if (!gates.canAdmitConcerns) prompt += `- DO NOT admit concerns or vulnerabilities\n`;
    
    if (gates.canShowInterest) prompt += `- You CAN show some interest if they earn it\n`;
    if (gates.canRevealPainPoints) {
      prompt += `\n**HOW TO ANSWER DISCOVERY QUESTIONS:**\n`;
      prompt += `When they ask a good, direct question, ANSWER IT like a real person:\n\n`;
      prompt += `❌ WRONG: "You've established trust there. But I'm still skeptical about X."\n`;
      prompt += `❌ WRONG: "Good question. Here's the thing..."\n`;
      prompt += `❌ WRONG: "I can see you're trying to understand my needs..."\n\n`;
      prompt += `✅ RIGHT: Just answer the damn question:\n`;
      prompt += `- "How's business?" → "Pretty good. Sales team's been a bit flat though."\n`;
      prompt += `- "What's your biggest challenge?" → "Honestly? Getting new reps up to speed. Takes forever."\n`;
      prompt += `- "What are you using now?" → "We've got [current solution]. Works okay, but it's clunky."\n`;
      prompt += `- "What would make this better?" → "I don't know. Faster results? Less manual work?"\n\n`;
      prompt += `Answer like you're talking to a colleague, not being interviewed.\n`;
    } else {
      prompt += `- DO NOT reveal pain points yet - stay vague and surface level\n`;
    }
    
    return prompt;
  }
}
