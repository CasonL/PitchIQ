/**
 * MarcusResponseParser.ts
 * Handles extraction and parsing of Marcus's LLM responses
 * Extracts: emotion tags, META blocks, objections, tactical followups, state feedback
 */

import { MARCUS_OBJECTION_STACKS } from '../ObjectionStack';
import type { 
  TacticalFollowUp, 
  ObjectionTag, 
  MarcusStateFeedback,
  AIRequestContext 
} from '../types/MarcusAI.types';

export interface ParsedResponse {
  content: string;
  emotion?: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued';
  endCall: boolean;
  tacticalFollowUp?: TacticalFollowUp;
  objection?: ObjectionTag;
  stateFeedback: MarcusStateFeedback;
}

export class MarcusResponseParser {
  /**
   * Parse complete LLM response - extract emotion, META block, and clean content
   */
  static parseResponse(rawContent: string, context: AIRequestContext): ParsedResponse {
    console.log(`📝 Complete response: ${rawContent.length} chars`);
    console.log(`📄 Raw LLM output:\n${rawContent}`);
    
    let content = rawContent;
    let endCall = false;
    let tacticalFollowUp: TacticalFollowUp | undefined = undefined;
    let objection: ObjectionTag | undefined = undefined;
    let stateFeedback: MarcusStateFeedback = {};
    let extractedEmotion: ParsedResponse['emotion'] = undefined;
    
    // Extract emotion tag from beginning: [emotion] content
    const emotionMatch = rawContent.match(/^\[(\w+)\]\s*/);
    if (emotionMatch) {
      const tag = emotionMatch[1].toLowerCase();
      const validEmotions = ['neutral', 'happy', 'excited', 'amused', 'warm', 'interested', 'curious', 'skeptical', 'disappointed', 'frustrated', 'annoyed', 'worried', 'surprised', 'intrigued'];
      if (validEmotions.includes(tag)) {
        extractedEmotion = tag as ParsedResponse['emotion'];
        rawContent = rawContent.replace(emotionMatch[0], '').trim();
        console.log(`🎭 LLM specified emotion: ${extractedEmotion}`);
      }
    }
    
    // HARD MODE: Filter out positive emotions until pain relevance proven
    if (context.scenario?.difficulty === 'hard' && extractedEmotion && context.buyerState) {
      const bannedEmotionsHard = ['curious', 'happy', 'interested', 'intrigued', 'excited', 'warm'];
      const painRelevanceProven = context.buyerState.relevance > 6 && context.buyerState.clarity > 6;
      
      if (bannedEmotionsHard.includes(extractedEmotion) && !painRelevanceProven) {
        console.log(`⚠️ [Hard Mode] Blocking emotion "${extractedEmotion}" - pain relevance not proven (relevance=${context.buyerState.relevance}, clarity=${context.buyerState.clarity})`);
        extractedEmotion = 'skeptical';
      }
    }
    
    // Extract and parse META block
    const metaResult = this.extractMetaBlock(rawContent);
    if (metaResult.meta) {
      endCall = metaResult.meta.endCall;
      tacticalFollowUp = metaResult.meta.tacticalFollowUp;
      objection = metaResult.meta.objection;
      stateFeedback = metaResult.meta.stateFeedback;
    }
    
    // Strip META from content
    content = metaResult.cleanedContent;
    
    // Fallback: try old FOLLOWUP format for backwards compatibility
    if (!metaResult.meta) {
      const followupMatch = rawContent.match(/FOLLOWUP:\s*(.+?)(?:\n|$)/i);
      if (followupMatch) {
        const followupText = followupMatch[1].trim();
        content = rawContent.replace(/FOLLOWUP:\s*.+?(?:\n|$)/i, '').trim();
        
        if (followupText !== 'NONE' && followupText.length > 0) {
          const wordCount = followupText.split(/\s+/).length;
          const isMicroNoise = wordCount <= 3 && /^(mm|mmhm|right|yeah|okay|gotcha|sure|uhh|hmm)/i.test(followupText);
          
          tacticalFollowUp = {
            text: followupText,
            type: isMicroNoise ? 'micro_noise' : 'nudge_question'
          };
        }
      }
    }
    
    // Clean up any remaining format artifacts
    content = content.replace(/^RESPONSE:\s*/i, '').trim();
    content = content.replace(/^\[[\w\s]+\]\s*/i, '').trim();
    
    // Check for coaching language violations in prospect mode
    if (context.phase === 'prospect') {
      this.checkIdentityViolation(content);
    }
    
    return {
      content,
      emotion: extractedEmotion,
      endCall,
      tacticalFollowUp,
      objection,
      stateFeedback
    };
  }
  
  /**
   * Extract and parse <META>...</META> block with repair logic
   */
  private static extractMetaBlock(rawContent: string): {
    meta?: {
      endCall: boolean;
      tacticalFollowUp?: TacticalFollowUp;
      objection?: ObjectionTag;
      stateFeedback: MarcusStateFeedback;
    };
    cleanedContent: string;
  } {
    let metaMatch = rawContent.match(/<META>(.+?)<\/META>/s);
    
    // If no closing tag, try to extract what we can
    if (!metaMatch && rawContent.includes('<META>')) {
      metaMatch = this.repairIncompleteMetaBlock(rawContent);
    }
    
    if (!metaMatch) {
      // No META found - try auto-close
      const autoCloseResult = this.attemptAutoClose(rawContent);
      if (autoCloseResult) {
        return autoCloseResult;
      }
      
      // Give up - strip any META remnants
      const cleanedContent = rawContent.replace(/<META>.*/s, '').trim();
      return { cleanedContent };
    }
    
    // Parse META JSON
    try {
      // Sanitize JSON: remove leading + from numbers, trailing commas
      const sanitizedJson = metaMatch[1]
        .replace(/:\s*\+([0-9.]+)/g, ': $1')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      
      const metaJson = JSON.parse(sanitizedJson);
      
      let endCall = false;
      let tacticalFollowUp: TacticalFollowUp | undefined = undefined;
      let objection: ObjectionTag | undefined = undefined;
      let stateFeedback: MarcusStateFeedback = {};
      
      // Extract end_call
      if (metaJson.end_call === true) {
        endCall = true;
        console.log(`🔚 Marcus signaled end_call: true`);
      }
      
      // Extract followup
      if (metaJson.followup && metaJson.followup !== null && metaJson.followup.trim().length > 0) {
        const followupText = metaJson.followup.trim();
        const wordCount = followupText.split(/\s+/).length;
        const isMicroNoise = wordCount <= 3 && /^(mm|mmhm|right|yeah|okay|gotcha|sure|uhh|hmm)/i.test(followupText);
        
        tacticalFollowUp = {
          text: followupText,
          type: isMicroNoise ? 'micro_noise' : 'nudge_question'
        };
        
        console.log(`🤫 Tactical followup detected [${tacticalFollowUp.type}]: "${followupText}"`);
      }
      
      // Extract objections
      if (metaJson.objections && Array.isArray(metaJson.objections) && metaJson.objections.length > 0) {
        const obj = metaJson.objections[0];
        const objectionId = obj.id.toLowerCase();
        const severity = parseFloat(obj.severity);
        const satisfied = parseFloat(obj.satisfied);
        
        const stackInfo = MARCUS_OBJECTION_STACKS[objectionId];
        if (stackInfo) {
          objection = {
            objection_id: objectionId,
            severity,
            satisfied,
            surfaced_roots: stackInfo.roots.filter(r => r.conscious).map(r => r.id),
            hidden_roots: stackInfo.roots.filter(r => !r.conscious).map(r => r.id)
          };
          
          console.log(`📊 Objection tagged: ${objectionId} (severity: ${severity}, satisfied: ${satisfied})`);
        }
      }
      
      // Extract state feedback
      if (metaJson.user_respect_level !== undefined) {
        stateFeedback.user_respect_level = parseFloat(metaJson.user_respect_level);
      }
      
      if (metaJson.marcus_irritation_delta !== undefined) {
        stateFeedback.marcus_irritation_delta = parseFloat(metaJson.marcus_irritation_delta);
      }
      
      if (metaJson.purpose_clarity_delta !== undefined) {
        stateFeedback.purpose_clarity_delta = parseFloat(metaJson.purpose_clarity_delta);
      }
      
      if (metaJson.extracted_name) {
        stateFeedback.extracted_name = String(metaJson.extracted_name);
      }
      
      if (metaJson.extracted_company) {
        stateFeedback.extracted_company = String(metaJson.extracted_company);
      }
      
      // Extract strategic moment
      if (metaJson.strategic_moment && metaJson.strategic_moment.type) {
        stateFeedback.strategic_moment = {
          type: metaJson.strategic_moment.type,
          signal: String(metaJson.strategic_moment.signal || '')
        };
        console.log(`🎯 Strategic moment detected: ${stateFeedback.strategic_moment.type} - "${stateFeedback.strategic_moment.signal}"`);
      }
      
      if (Object.keys(stateFeedback).length > 0) {
        console.log(`🧠 Marcus state feedback:`, stateFeedback);
      }
      
      // Strip META block from spoken content
      let cleanedContent = rawContent.replace(/<META>.+?<\/META>/s, '').trim();
      
      // Double-check: ensure no META remnants
      if (cleanedContent.includes('<META>')) {
        cleanedContent = cleanedContent.replace(/<META>.*/s, '').trim();
        console.warn('⚠️ META remnants found after initial strip, cleaning up');
      }
      
      return {
        meta: { endCall, tacticalFollowUp, objection, stateFeedback },
        cleanedContent
      };
      
    } catch (e) {
      console.error('⚠️ Failed to parse META block:', e);
      const cleanedContent = rawContent.replace(/<META>.+?<\/META>/s, '').trim();
      return { cleanedContent };
    }
  }
  
  /**
   * Repair incomplete META block by finding likely JSON end point
   */
  private static repairIncompleteMetaBlock(rawContent: string): RegExpMatchArray | null {
    const metaStart = rawContent.indexOf('<META>');
    const afterMeta = rawContent.substring(metaStart + 6);
    
    // Find where JSON likely ends
    const possibleEnds = [
      afterMeta.search(/\n\n[A-Z]/),
      afterMeta.search(/\n[A-Z][a-z]+,/),
      afterMeta.search(/}\s*[A-Z]/),
    ].filter(idx => idx > 0);
    
    if (possibleEnds.length === 0) return null;
    
    const likelyEnd = Math.min(...possibleEnds);
    let extractedJson = afterMeta.substring(0, likelyEnd).trim();
    
    // Repair incomplete JSON by adding closing braces
    const openBraces = (extractedJson.match(/{/g) || []).length;
    const closeBraces = (extractedJson.match(/}/g) || []).length;
    
    if (openBraces > closeBraces) {
      extractedJson += '}'.repeat(openBraces - closeBraces);
      console.log(`🔧 Repaired incomplete META JSON (added ${openBraces - closeBraces} closing braces)`);
    }
    
    return ['<META>' + extractedJson + '</META>', extractedJson] as RegExpMatchArray;
  }
  
  /**
   * Attempt to auto-close missing META tag
   */
  private static attemptAutoClose(rawContent: string): {
    meta?: {
      endCall: boolean;
      tacticalFollowUp?: TacticalFollowUp;
      objection?: ObjectionTag;
      stateFeedback: MarcusStateFeedback;
    };
    cleanedContent: string;
  } | null {
    console.warn('⚠️ META block missing closing tag, attempting auto-close...');
    
    const metaStart = rawContent.indexOf('<META>');
    if (metaStart === -1) return null;
    
    const afterMeta = rawContent.substring(metaStart + 6);
    const lastBrace = afterMeta.lastIndexOf('}');
    
    if (lastBrace === -1) return null;
    
    const potentialJson = afterMeta.substring(0, lastBrace + 1);
    
    try {
      // Sanitize JSON: remove leading + from numbers, trailing commas
      const sanitizedJson = potentialJson
        .replace(/:\s*\+([0-9.]+)/g, ': $1')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      
      const parsed = JSON.parse(sanitizedJson);
      
      const endCall = parsed.end_call || false;
      let tacticalFollowUp: TacticalFollowUp | undefined = undefined;
      let objection: ObjectionTag | undefined = undefined;
      
      if (parsed.followup && parsed.followup !== 'null' && parsed.followup.length > 0) {
        tacticalFollowUp = {
          text: parsed.followup,
          type: parsed.followup.length <= 10 ? 'micro_noise' : 'nudge_question'
        };
      }
      
      if (parsed.objections && Array.isArray(parsed.objections)) {
        const topObjection = parsed.objections.find((obj: any) => obj.severity >= 0.5);
        if (topObjection) {
          objection = topObjection as ObjectionTag;
        }
      }
      
      const stateFeedback: MarcusStateFeedback = {
        user_respect_level: parsed.user_respect_level,
        marcus_irritation_delta: parsed.marcus_irritation_delta,
        purpose_clarity_delta: parsed.purpose_clarity_delta,
        extracted_name: parsed.extracted_name || undefined,
        extracted_company: parsed.extracted_company || undefined
      };
      
      console.log('✅ Auto-closed META and parsed successfully');
      
      const cleanedContent = rawContent.replace(/<META>.*/s, '').trim();
      
      return {
        meta: { endCall, tacticalFollowUp, objection, stateFeedback },
        cleanedContent
      };
      
    } catch (e) {
      console.error('❌ Auto-close failed, could not parse JSON:', e);
      return null;
    }
  }
  
  /**
   * Check if Marcus is using coaching language (identity violation)
   */
  private static checkIdentityViolation(content: string): void {
    const coachingPatterns = [
      /i noticed/i,
      /you should/i,
      /try asking/i,
      /best practice/i,
      /technique/i,
      /framework/i
    ];
    
    const hasCoaching = coachingPatterns.some(pattern => pattern.test(content));
    
    if (hasCoaching) {
      console.error(`🚨 IDENTITY VIOLATION: Marcus gave coaching in Prospect mode: "${content}"`);
    } else {
      console.log('✅ Marcus stayed in Prospect identity');
    }
  }
}
