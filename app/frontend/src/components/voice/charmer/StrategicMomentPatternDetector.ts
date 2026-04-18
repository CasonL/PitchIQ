/**
 * StrategicMomentPatternDetector
 * 
 * Scans Marcus's dialogue for strategic moment keywords and patterns.
 * Used as a fallback/supplement to LLM META tagging.
 */

export type StrategicMomentType = 
  | 'permission_signal'
  | 'differentiation_ask'
  | 'pain_reveal'
  | 'soft_exit';

export interface DetectedStrategicMoment {
  type: StrategicMomentType;
  signal: string;
  confidence: number;
}

export class StrategicMomentPatternDetector {
  /**
   * Detect strategic moments in Marcus's dialogue
   */
  static detect(marcusText: string): DetectedStrategicMoment | null {
    const normalized = marcusText.toLowerCase().trim();
    
    // 1. Permission signal - Marcus grants time/permission
    const permissionSignal = this.detectPermissionSignal(normalized);
    if (permissionSignal) return permissionSignal;
    
    // 2. Differentiation ask - Marcus asks what makes it different
    const diffAsk = this.detectDifferentiationAsk(normalized);
    if (diffAsk) return diffAsk;
    
    // 3. Pain reveal - Marcus volunteers a problem
    const painReveal = this.detectPainReveal(normalized);
    if (painReveal) return painReveal;
    
    // 4. Soft exit - Marcus signals wrapping up
    const softExit = this.detectSoftExit(normalized);
    if (softExit) return softExit;
    
    return null;
  }
  
  private static detectPermissionSignal(text: string): DetectedStrategicMoment | null {
    const permissionPatterns = [
      /\b(sure|yeah|okay|alright|fine),?\s+(i'?ve got|i have|got)\s+(a |some )?(minute|second|time|moment)/i,
      /\b(go ahead|shoot|tell me more|let'?s hear it)/i,
      /\b(i'?m listening|i'?ll listen)/i,
      /\b(send me something|email me)/i
    ];
    
    for (const pattern of permissionPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'permission_signal',
          signal: 'Marcus gave permission - be specific and brief',
          confidence: 0.9
        };
      }
    }
    
    return null;
  }
  
  private static detectDifferentiationAsk(text: string): DetectedStrategicMoment | null {
    const diffPatterns = [
      /\b(what makes|how is|how'?s).{0,30}(different|better|unlike|unique)/i,
      /\b(why yours|why should i|what'?s different|what'?s unique)/i,
      /\b(seen (this|stuff|tools?) (like this )?before|already (have|use))/i,
      /\b(how do you (compare|differ|stand out))/i,
      /\b(what sets you apart|what'?s your edge)/i,
      /\b(everyone says that|i'?ve heard (that|this) before)/i
    ];
    
    for (const pattern of diffPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'differentiation_ask',
          signal: 'Marcus wants explicit contrast - lead with differentiator',
          confidence: 0.95
        };
      }
    }
    
    return null;
  }
  
  private static detectPainReveal(text: string): DetectedStrategicMoment | null {
    // Marcus volunteers a problem (not prompted)
    const painPatterns = [
      /\b(our|we'?re|we are).{0,40}(weak|struggling|having trouble|not (great|good)|broken|failing)/i,
      /\b(not thrilled|not happy|frustrated|annoyed) with (our|the)/i,
      /\b(honestly|to be honest|frankly),?.{0,20}(not|could be better|struggling)/i,
      /\b(we need (to|a)|we should|we have to) (improve|fix|solve|address)/i
    ];
    
    for (const pattern of painPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'pain_reveal',
          signal: 'Marcus revealed pain - dig deeper here',
          confidence: 0.85
        };
      }
    }
    
    return null;
  }
  
  private static detectSoftExit(text: string): DetectedStrategicMoment | null {
    const exitPatterns = [
      /\b(i'?ve? got to (go|run|head out)|gotta (go|run))/i,
      /\b(i'?m (busy|swamped|in a meeting)|busy right now)/i,
      /\b(send me (something|an email|info)|email me (the )?details)/i,
      /\b(i'?ll think about it|let me think|need to think)/i,
      /\b(maybe (later|another time)|follow up later)/i,
      /\b(wrapping up|need to wrap)/i
    ];
    
    for (const pattern of exitPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'soft_exit',
          signal: 'Marcus signaling exit - handoff moment, keep it SHORT',
          confidence: 0.9
        };
      }
    }
    
    return null;
  }
}
