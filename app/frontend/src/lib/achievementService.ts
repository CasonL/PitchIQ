/**
 * Achievement Service
 * 
 * Handles API calls related to achievement criteria, advice, and scoring
 */

/**
 * Fetch achievement advice and criteria information
 * 
 * @param achievementId The ID of the achievement
 * @param stageText The current text input for the stage
 * @param currentScore The current score from the UI
 * @returns Promise with the achievement advice response
 */
export const fetchAchievementAdvice = async (
  achievementId: string,
  stageText: string,
  currentScore: number = 0
) => {
  try {
    const response = await fetch('/api/dashboard/get-achievement-advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        achievementId,
        currentStageText: stageText,
        currentScore
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching achievement advice:', error);
    return {
      advice: 'Unable to fetch advice at this time. Please try again later.',
      total_criteria: 0,
      met_criteria_count: 0,
      calculated_score: currentScore
    };
  }
};

/**
 * Analyze text for achievement criteria completion
 * 
 * @param text The text to analyze
 * @param achievementIds Array of achievement IDs to check
 * @returns Promise with scores for each achievement
 */
export const analyzeAchievementProgress = async (
  text: string,
  achievementIds: string[]
) => {
  const results: Record<string, {
    score: number,
    metCriteria: number,
    totalCriteria: number,
    advice: string
  }> = {};

  // Process each achievement in parallel
  await Promise.all(
    achievementIds.map(async (id) => {
      const adviceResult = await fetchAchievementAdvice(id, text);
      
      results[id] = {
        score: adviceResult.calculated_score || 0,
        metCriteria: adviceResult.met_criteria_count || 0,
        totalCriteria: adviceResult.total_criteria || 0,
        advice: adviceResult.advice || ''
      };
    })
  );

  return results;
};

/**
 * Get achievement metadata
 * This would normally come from the backend, but for now we'll hardcode it
 */
export const getAchievementMetadata = (achievementId: string) => {
  const achievementData: Record<string, { title: string, description: string }> = {
    // Product knowledge achievements
    'product_basics': {
      title: 'Product Fundamentals',
      description: 'Understanding of core product offering and purpose'
    },
    'product_features': {
      title: 'Product Features',
      description: 'Knowledge of key product features and capabilities'
    },
    'product_problems': {
      title: 'Problem Recognition',
      description: 'Understanding of the problems your product solves'
    },
    'product_differentiation': {
      title: 'Product Differentiation',
      description: 'Ability to articulate unique value proposition'
    },

    // Market understanding achievements
    'market_identification': {
      title: 'Market Understanding',
      description: 'Knowledge of target market segments'
    },
    'buyer_persona': {
      title: 'Buyer Personas',
      description: 'Understanding of ideal customer profiles'
    },
    'pain_points': {
      title: 'Customer Pain Points',
      description: 'Recognition of customer challenges and pain points'
    },
    'buyer_motivations': {
      title: 'Buyer Motivations',
      description: 'Understanding of buyer decision factors'
    },

    // Sales process achievements
    'sales_cycle': {
      title: 'Sales Process',
      description: 'Knowledge of sales cycle and process stages'
    },
    'decision_process': {
      title: 'Decision Process',
      description: 'Understanding of customer decision-making process'
    },
    'objection_handling': {
      title: 'Objection Handling',
      description: 'Ability to address common sales objections'
    },
    'competitive_landscape': {
      title: 'Competitive Awareness',
      description: 'Knowledge of competitive landscape and positioning'
    }
  };

  return achievementData[achievementId] || { 
    title: achievementId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'Achievement criteria'
  };
}; 