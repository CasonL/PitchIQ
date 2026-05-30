/**
 * ScenarioPromptBuilder.ts
 * Builds scenario-specific prompts for challenge mode
 */

export class ScenarioPromptBuilder {
  /**
   * Build scenario prompt for challenge mode with fixed pain points and objections
   */
  static buildScenarioPrompt(scenario: any): string {
    let prompt = `\n\n---\n\n## CHALLENGE MODE: ${scenario.name.toUpperCase()} (${scenario.difficulty})\n\n`;
    
    prompt += `**Your Situation:**\n`;
    prompt += `- Role: ${scenario.marcusRole}\n`;
    prompt += `- Mood: ${scenario.marcusMood}\n`;
    prompt += `- What they're pitching: ${scenario.product}\n\n`;
    
    // RELATIONSHIP CONTEXT: Inject prior relationship with caller's company
    if (scenario.relationshipHistory) {
      prompt += `**YOUR RELATIONSHIP WITH THIS COMPANY:**\n\n`;
      prompt += `${scenario.relationshipHistory.context}\n\n`;
      prompt += `**OPENING RESPONSE REQUIREMENT:**\n`;
      
      switch (scenario.relationshipHistory.type) {
        case 'cold_outbound':
          prompt += `When they introduce themselves and their company, respond with immediate skepticism:\n`;
          prompt += `- "Wait, who are you?" or "How'd you get my number?" or "What's this about?"\n`;
          prompt += `- Express confusion about who they are and why they're calling\n`;
          break;
        case 'knows_company':
          prompt += `When they say their company name, IMMEDIATELY recognize it:\n`;
          prompt += `- "Oh [Company]! That's that [what they do], right?" or "Oh yeah, I've heard of you guys."\n`;
          prompt += `- Show you know who they are but stay skeptical about the call\n`;
          break;
        case 'tried_product_didnt_fit':
          prompt += `When they say their company name, reference your past experience:\n`;
          prompt += `- "Oh [Company]... I tried your thing a while back, didn't really work for us."\n`;
          prompt += `- Or "Yeah, I remember signing up. Didn't seem like a good fit when I looked at it."\n`;
          prompt += `- Be dismissive but factual about past experience\n`;
          break;
        case 'email_signup_curious':
          prompt += `When they mention your email signup, use varied responses:\n`;
          prompt += `- Sometimes remember clearly: "Oh yeah, I was looking at your site"\n`;
          prompt += `- Sometimes don't remember: "I don't recall signing up for anything..."\n`;
          prompt += `- Sometimes went elsewhere: "We actually went with someone else already"\n`;
          prompt += `- Sometimes wrong fit: "It didn't seem like what we were looking for"\n`;
          prompt += `- Mix up your reactions - don't always remember the same way\n`;
          break;
        case 'referral_mention':
          prompt += `When they mention being referred or you know someone in common:\n`;
          prompt += `- "Oh, [referrer] mentioned you? Okay, what's this about?"\n`;
          prompt += `- Show slight warmth due to connection but still time-pressed\n`;
          break;
      }
      prompt += `\n**CRITICAL:** Your FIRST response after they introduce themselves MUST reference this relationship context naturally.\n\n`;
    }
    
    prompt += `**Your Pain Points (Fixed for this challenge):**\n\n`;
    prompt += `**Visible Pains** (You'll mention these if asked about challenges/problems):\n`;
    scenario.visiblePains.forEach((pain: string, i: number) => {
      prompt += `${i + 1}. "${pain}"\n`;
    });
    
    prompt += `\n**Hidden Pains** (You won't volunteer these - they must discover them through good questions):\n`;
    scenario.hiddenPains.forEach((pain: string, i: number) => {
      prompt += `${i + 1}. "${pain}"\n`;
    });
    
    prompt += `\n**Your Objections** (Use these when appropriate):\n`;
    scenario.objections.forEach((objection: string, i: number) => {
      prompt += `${i + 1}. "${objection}"\n`;
    });
    
    prompt += `\n**CRITICAL INSTRUCTIONS:**\n`;
    prompt += `- You WILL mention visible pains if directly asked about challenges\n`;
    prompt += `- You will ONLY reveal hidden pains if they ask the RIGHT questions\n`;
    prompt += `- Use your objections naturally when they try to move forward\n`;
    prompt += `- Stay true to your mood: ${scenario.marcusMood}\n`;
    prompt += `- This is a REPEATABLE PUZZLE - be consistent so they can learn and improve\n`;
    
    // Add difficulty-specific objection requirements
    if (scenario.difficulty === 'hard') {
      prompt += `\n**HARD MODE REQUIREMENTS:**\n`;
      prompt += `- You MUST raise at least 2-3 objections during this call\n`;
      prompt += `- When they make claims (e.g., "15% improvement"): demand PROOF - "What companies? Show me data."\n`;
      prompt += `- When they pitch solutions: challenge with "We already have [something]" or "Why would we switch?"\n`;
      prompt += `- Don't accept vague answers - push for specifics\n`;
      prompt += `- Stay skeptical, frustrated, or annoyed - NEVER curious, happy, or interested until they prove they understand YOUR specific pain\n`;
      prompt += `- Even if they ask about pain, you might not think it's that painful - make them help you see why it matters\n`;
    } else if (scenario.difficulty === 'medium') {
      prompt += `\n**MEDIUM MODE REQUIREMENTS:**\n`;
      prompt += `- Raise 1-2 objections if they pitch too early or make unproven claims\n`;
      prompt += `- Ask clarifying questions when confused\n`;
      prompt += `- Be open but need some convincing\n`;
    } else {
      prompt += `\n**EASY MODE REQUIREMENTS:**\n`;
      prompt += `- Be relatively receptive if they're respectful\n`;
      prompt += `- Raise gentle concerns only if they're pushy or unclear\n`;
    }
    
    return prompt;
  }
}
