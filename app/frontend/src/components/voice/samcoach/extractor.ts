import { leadSpecSchema } from "./leadSpecSchema";

export async function extractLeadSpec(
  productAnswer: string,
  audienceAnswer: string
): Promise<{ product: string; audience: string }> {
  const transcript = `Product answer: ${productAnswer}\nAudience answer: ${audienceAnswer}`;
  
  try {
    const response = await fetch('/api/openai/extract-lead-spec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        schema: leadSpecSchema
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { 
      product: result.product || productAnswer.trim(), 
      audience: result.audience || audienceAnswer.trim() 
    };
  } catch (error) {
    console.error('Failed to extract lead spec:', error);
    // Fallback to raw answers if extraction fails
    return { 
      product: productAnswer.trim(), 
      audience: audienceAnswer.trim() 
    };
  }
}

// Quick heuristic to detect if user gives both answers in one utterance
export function quickSplit(s: string): { product: string; audience: string } | null {
  // Require an action cue to avoid matching small talk like "Hey to how's it going"
  const actionCue = /(sell|offer|build|make|provide|develop|deliver)\b/i;
  if (!actionCue.test(s)) return null;
  const patterns = [
    /(sell|offer|build|make|provide|develop|deliver)\s+([^.,;]+?)(?:\s+to\s+|\s+for\s+)([^.,;]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = s.match(pattern);
    if (match && match.length >= 3) {
      return { 
        product: match[2]?.trim() || "", 
        audience: match[3]?.trim() || "" 
      };
    }
  }
  
  return null;
}
