/**
 * DiscoveryMomentDetector.ts
 * Detects key discovery moments with rigid LLM rules
 * Triggers progressive objection generation as more is revealed
 */

export type DiscoveryMomentType = 
  | 'product_category'      // "We sell CRM software"
  | 'value_proposition'     // "We help teams close 30% more deals"
  | 'key_features'          // "We have AI call analysis and automated follow-ups"
  | 'pricing_model'         // "It's $99 per user per month"
  | 'implementation'        // "Takes 2 weeks to get set up"
  | 'differentiation'       // "Unlike Gong, we integrate with HubSpot"
  | 'proof_points';         // "We work with 500+ companies like Stripe"

export interface DiscoveryMoment {
  type: DiscoveryMomentType;
  detectedAt: number; // utterance count
  extractedInfo: string; // What was revealed
  context: string; // Full user utterance
  confidence: number; // 0-1, how sure we are this is a discovery moment
}

export interface DiscoveryState {
  moments: DiscoveryMoment[];
  productCategory?: string;
  valueProposition?: string;
  keyFeatures: string[];
  pricingModel?: string;
  implementation?: string;
  differentiators: string[];
  proofPoints: string[];
}

export class DiscoveryMomentDetector {
  private discoveryState: DiscoveryState = {
    moments: [],
    keyFeatures: [],
    differentiators: [],
    proofPoints: []
  };

  /**
   * Detect if user just revealed something significant
   * Uses LLM with RIGID rules to avoid false positives
   */
  async detectMoment(
    userUtterance: string,
    utteranceCount: number,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<DiscoveryMoment | null> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OpenAI API key missing - discovery detection disabled');
      return null;
    }

    try {
      const prompt = this.buildDetectionPrompt(userUtterance, conversationHistory);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at detecting sales discovery moments with RIGID criteria. Only flag clear, specific revelations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temp for consistency
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        return null;
      }

      const detection = this.parseDetection(content, userUtterance, utteranceCount);
      
      if (detection && detection.confidence >= 0.7) {
        // Update discovery state
        this.updateDiscoveryState(detection);
        console.log(`🔍 [Discovery] Detected ${detection.type}: "${detection.extractedInfo}"`);
        return detection;
      }

      return null;
    } catch (error) {
      console.error('❌ Discovery detection failed:', error);
      return null;
    }
  }

  /**
   * Build rigid detection prompt
   */
  private buildDetectionPrompt(
    userUtterance: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): string {
    const recentHistory = conversationHistory.slice(-4).map(msg => 
      `${msg.role === 'user' ? 'Rep' : 'Marcus'}: ${msg.content}`
    ).join('\n');

    return `Analyze if the rep just revealed something SIGNIFICANT about their product/service.

**RIGID CRITERIA - Only flag if ALL conditions met:**

1. **product_category**: Rep explicitly states what they sell
   - ✅ "We sell CRM software"
   - ✅ "We're a sales training platform"
   - ❌ "We help teams" (too vague)

2. **value_proposition**: Rep states specific outcome/benefit with numbers or clear impact
   - ✅ "We help teams close 30% more deals"
   - ✅ "Reduces onboarding time from 6 months to 2 weeks"
   - ❌ "We make things better" (no specifics)

3. **key_features**: Rep describes specific functionality
   - ✅ "We have AI call analysis and automated follow-ups"
   - ✅ "Built-in email sequences with A/B testing"
   - ❌ "It's really powerful" (no specifics)

4. **pricing_model**: Rep mentions pricing structure or cost
   - ✅ "$99 per user per month"
   - ✅ "One-time fee of $5,000"
   - ❌ "Very affordable" (no numbers)

5. **implementation**: Rep describes setup/onboarding process
   - ✅ "Takes 2 weeks to get fully set up"
   - ✅ "We handle migration from your current system"
   - ❌ "It's easy to use" (not about setup)

6. **differentiation**: Rep explicitly compares to competitor or states uniqueness
   - ✅ "Unlike Gong, we integrate with HubSpot"
   - ✅ "We're the only platform that does X"
   - ❌ "We're the best" (not specific)

7. **proof_points**: Rep provides evidence (case studies, metrics, client names)
   - ✅ "We work with 500+ companies like Stripe and Shopify"
   - ✅ "Customers see 40% increase in pipeline"
   - ❌ "Lots of happy customers" (no specifics)

**Recent conversation:**
${recentHistory}

**Latest rep utterance:**
"${userUtterance}"

**Output format (JSON):**
\`\`\`json
{
  "detected": true/false,
  "type": "product_category" | "value_proposition" | etc. | null,
  "extractedInfo": "specific information revealed",
  "confidence": 0.0-1.0,
  "reasoning": "why this meets/doesn't meet criteria"
}
\`\`\`

Be STRICT. Only flag if criteria clearly met.`;
  }

  /**
   * Parse LLM detection response
   */
  private parseDetection(
    content: string,
    userUtterance: string,
    utteranceCount: number
  ): DiscoveryMoment | null {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) || content.match(/```\n([\s\S]+?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      const parsed = JSON.parse(jsonString);
      
      if (!parsed.detected || !parsed.type) {
        return null;
      }

      return {
        type: parsed.type,
        detectedAt: utteranceCount,
        extractedInfo: parsed.extractedInfo || '',
        context: userUtterance,
        confidence: parsed.confidence || 0
      };
    } catch (error) {
      console.error('Failed to parse discovery detection:', error);
      return null;
    }
  }

  /**
   * Update internal discovery state
   */
  private updateDiscoveryState(moment: DiscoveryMoment): void {
    this.discoveryState.moments.push(moment);

    switch (moment.type) {
      case 'product_category':
        this.discoveryState.productCategory = moment.extractedInfo;
        break;
      case 'value_proposition':
        this.discoveryState.valueProposition = moment.extractedInfo;
        break;
      case 'key_features':
        this.discoveryState.keyFeatures.push(moment.extractedInfo);
        break;
      case 'pricing_model':
        this.discoveryState.pricingModel = moment.extractedInfo;
        break;
      case 'implementation':
        this.discoveryState.implementation = moment.extractedInfo;
        break;
      case 'differentiation':
        this.discoveryState.differentiators.push(moment.extractedInfo);
        break;
      case 'proof_points':
        this.discoveryState.proofPoints.push(moment.extractedInfo);
        break;
    }
  }

  /**
   * Get current discovery state
   */
  getDiscoveryState(): DiscoveryState {
    return { ...this.discoveryState };
  }

  /**
   * Check if we have enough context for specific objections
   */
  hasMinimumContext(): boolean {
    return !!this.discoveryState.productCategory || this.discoveryState.keyFeatures.length > 0;
  }

  /**
   * Reset for new call
   */
  reset(): void {
    this.discoveryState = {
      moments: [],
      keyFeatures: [],
      differentiators: [],
      proofPoints: []
    };
  }
}
