/**
 * Conversation Graph Engine
 * 
 * This module provides a dynamic conversation flow system that adapts based on
 * user knowledge, sentiment, and previous interactions.
 */

// Define node types
export type NodeType = 'intro' | 'question' | 'transition' | 'conclusion';
export type NodeStage = 'product' | 'market_and_buyer' | 'sales_context' | 'complete';

// Node definition
interface ConversationNode {
  id: string;
  type: NodeType;
  stage: NodeStage;
  question: string;
  transitions: {
    default: string;
    conditions?: {
      achievementIds: string[];
      threshold: number;
      targetNode: string;
    }[];
    sentiment?: {
      frustrated?: string;
      engaged?: string;
    };
  };
}

// Define the conversation graph structure
export const conversationGraph: Record<string, ConversationNode> = {
  // Product introduction and questions
  'product_intro': {
    id: 'product_intro',
    type: 'intro',
    stage: 'product',
    question: "Let's start by exploring your product or service. What specific problem does your solution solve for customers?",
    transitions: {
      default: 'product_features',
      conditions: [
        {
          achievementIds: ['product_basics'],
          threshold: 50,
          targetNode: 'product_features'
        }
      ]
    }
  },
  'product_features': {
    id: 'product_features',
    type: 'question',
    stage: 'product',
    question: "What are the key features or capabilities that differentiate your offering from alternatives?",
    transitions: {
      default: 'product_value',
      conditions: [
        {
          achievementIds: ['product_features', 'product_differentiation'],
          threshold: 60,
          targetNode: 'product_value'
        }
      ],
      sentiment: {
        frustrated: 'product_value_simplified'
      }
    }
  },
  'product_value_simplified': {
    id: 'product_value_simplified',
    type: 'question',
    stage: 'product',
    question: "In simple terms, what's the main value your customers get from your product?",
    transitions: {
      default: 'product_value'
    }
  },
  'product_value': {
    id: 'product_value',
    type: 'question',
    stage: 'product',
    question: "How do you typically communicate the value of your product in sales conversations?",
    transitions: {
      default: 'product_to_market_transition',
      conditions: [
        {
          achievementIds: ['product_basics', 'product_features', 'product_differentiation'],
          threshold: 45,
          targetNode: 'product_to_market_transition'
        }
      ]
    }
  },
  'product_to_market_transition': {
    id: 'product_to_market_transition',
    type: 'transition',
    stage: 'product',
    question: "Thanks for sharing those details about your product. Now let's talk about who your customers are and what they need.",
    transitions: {
      default: 'market_audience'
    }
  },

  // Market/buyer questions
  'market_audience': {
    id: 'market_audience',
    type: 'question',
    stage: 'market_and_buyer',
    question: "Who is your ideal customer profile? What industries, roles or demographics do you target?",
    transitions: {
      default: 'market_needs',
      conditions: [
        {
          achievementIds: ['market_identification', 'buyer_persona'],
          threshold: 50,
          targetNode: 'market_needs'
        }
      ],
      sentiment: {
        frustrated: 'market_audience_simplified'
      }
    }
  },
  'market_audience_simplified': {
    id: 'market_audience_simplified',
    type: 'question',
    stage: 'market_and_buyer',
    question: "Are your customers mostly businesses, consumers, or both? What size or type?",
    transitions: {
      default: 'market_needs'
    }
  },
  'market_needs': {
    id: 'market_needs',
    type: 'question',
    stage: 'market_and_buyer',
    question: "What specific pain points or challenges do your customers experience that your solution addresses?",
    transitions: {
      default: 'market_decision',
      conditions: [
        {
          achievementIds: ['pain_points'],
          threshold: 55,
          targetNode: 'market_decision'
        }
      ]
    }
  },
  'market_decision': {
    id: 'market_decision',
    type: 'question',
    stage: 'market_and_buyer',
    question: "What typically motivates your customers to make a purchasing decision?",
    transitions: {
      default: 'market_to_sales_transition',
      conditions: [
        {
          achievementIds: ['buyer_motivations'],
          threshold: 50,
          targetNode: 'market_to_sales_transition'
        }
      ]
    }
  },
  'market_to_sales_transition': {
    id: 'market_to_sales_transition',
    type: 'transition',
    stage: 'market_and_buyer',
    question: "Now I have a good understanding of your customers. Let's discuss your sales process and approach.",
    transitions: {
      default: 'sales_cycle'
    }
  },

  // Sales context questions
  'sales_cycle': {
    id: 'sales_cycle',
    type: 'question',
    stage: 'sales_context',
    question: "What's your typical sales cycle length, and what are the key stages in your sales process?",
    transitions: {
      default: 'sales_objections',
      conditions: [
        {
          achievementIds: ['sales_cycle'],
          threshold: 50,
          targetNode: 'sales_objections'
        }
      ],
      sentiment: {
        frustrated: 'sales_cycle_simplified'
      }
    }
  },
  'sales_cycle_simplified': {
    id: 'sales_cycle_simplified',
    type: 'question',
    stage: 'sales_context',
    question: "How long does it typically take to close a deal with a new customer?",
    transitions: {
      default: 'sales_objections'
    }
  },
  'sales_objections': {
    id: 'sales_objections',
    type: 'question',
    stage: 'sales_context',
    question: "What objections do you hear most frequently from prospects, and how do you typically handle them?",
    transitions: {
      default: 'sales_competition',
      conditions: [
        {
          achievementIds: ['objection_handling'],
          threshold: 50,
          targetNode: 'sales_competition'
        }
      ]
    }
  },
  'sales_competition': {
    id: 'sales_competition',
    type: 'question',
    stage: 'sales_context',
    question: "Who are your main competitors, and how do you position yourself against them?",
    transitions: {
      default: 'sales_to_complete_transition',
      conditions: [
        {
          achievementIds: ['competitive_landscape'],
          threshold: 50,
          targetNode: 'sales_to_complete_transition'
        }
      ]
    }
  },
  'sales_to_complete_transition': {
    id: 'sales_to_complete_transition',
    type: 'transition',
    stage: 'sales_context',
    question: "Thanks for all this valuable information! I now have a comprehensive understanding of your business, customers, and sales approach.",
    transitions: {
      default: 'complete_personalization'
    }
  },

  // Completion nodes
  'complete_personalization': {
    id: 'complete_personalization',
    type: 'conclusion',
    stage: 'complete',
    question: "Based on everything you've shared, I've personalized your coaching experience. What specific sales scenario would you like to practice first?",
    transitions: {
      default: 'complete_open_practice'
    }
  },
  'complete_open_practice': {
    id: 'complete_open_practice',
    type: 'question',
    stage: 'complete',
    question: "Is there a particular aspect of your sales conversations you'd like to focus on improving?",
    transitions: {
      default: 'complete_open_practice'
    }
  }
};

/**
 * Determines the next conversation node based on current state
 * 
 * @param currentNodeId Current position in conversation graph
 * @param achievementScores User's current achievement scores
 * @param userSentiment Detected user sentiment
 * @param visitedNodes Array of previously visited node IDs
 * @returns ID of the next conversation node
 */
export const determineNextNode = (
  currentNodeId: string,
  achievementScores: Record<string, number>,
  userSentiment: 'neutral' | 'frustrated' | 'engaged',
  visitedNodes: string[]
): string => {
  // Get current node
  const currentNode = conversationGraph[currentNodeId];
  if (!currentNode) {
    // Fallback if node doesn't exist
    return 'product_intro';
  }
  
  // Check for sentiment-based transitions
  if (currentNode.transitions.sentiment) {
    if (userSentiment === 'frustrated' && currentNode.transitions.sentiment.frustrated) {
      return currentNode.transitions.sentiment.frustrated;
    }
    
    if (userSentiment === 'engaged' && currentNode.transitions.sentiment.engaged) {
      return currentNode.transitions.sentiment.engaged;
    }
  }
  
  // Check achievement-based conditions
  if (currentNode.transitions.conditions) {
    for (const condition of currentNode.transitions.conditions) {
      // Calculate average achievement score for the specified achievements
      const relevantScores = condition.achievementIds
        .map(id => achievementScores[id] || 0);
      
      if (relevantScores.length === 0) continue;
      
      const averageScore = relevantScores.reduce((sum, score) => sum + score, 0) / 
        relevantScores.length;
      
      // If threshold is met, use this transition
      if (averageScore >= condition.threshold) {
        // Skip if we've already visited this node recently (avoid loops)
        if (visitedNodes.slice(-3).includes(condition.targetNode)) {
          continue;
        }
        
        return condition.targetNode;
      }
    }
  }
  
  // Use default transition if no conditions are met
  return currentNode.transitions.default;
};

/**
 * Gets the question text for a given node
 * 
 * @param nodeId ID of the conversation node
 * @returns Question text for the node
 */
export const getNodeQuestion = (nodeId: string): string => {
  return conversationGraph[nodeId]?.question || 
    "What else would you like to discuss about your sales approach?";
};

/**
 * Gets the stage for a given node
 * 
 * @param nodeId ID of the conversation node
 * @returns Stage the node belongs to
 */
export const getNodeStage = (nodeId: string): NodeStage => {
  return conversationGraph[nodeId]?.stage || 'complete';
};

/**
 * Finds a node related to a specific achievement area
 * 
 * @param achievementId Achievement area to focus on
 * @param visitedNodes Previously visited nodes
 * @returns ID of a relevant node
 */
export const findNodeForAchievement = (
  achievementId: string,
  visitedNodes: string[]
): string => {
  // Map achievement IDs to relevant node IDs
  const achievementToNodeMap: Record<string, string[]> = {
    'product_basics': ['product_intro', 'product_value_simplified'],
    'product_features': ['product_features'],
    'product_differentiation': ['product_features', 'product_value'],
    'market_identification': ['market_audience', 'market_audience_simplified'],
    'buyer_persona': ['market_audience', 'market_audience_simplified'],
    'pain_points': ['market_needs'],
    'buyer_motivations': ['market_decision'],
    'sales_cycle': ['sales_cycle', 'sales_cycle_simplified'],
    'decision_process': ['sales_cycle', 'market_decision'],
    'objection_handling': ['sales_objections'],
    'competitive_landscape': ['sales_competition']
  };
  
  // Get relevant nodes for this achievement
  const relevantNodes = achievementToNodeMap[achievementId] || [];
  
  // Find a node we haven't visited recently
  for (const nodeId of relevantNodes) {
    if (!visitedNodes.slice(-5).includes(nodeId)) {
      return nodeId;
    }
  }
  
  // Default to the first relevant node if all have been visited
  return relevantNodes[0] || 'product_intro';
};

/**
 * Suggests questions to address specific knowledge gaps
 * 
 * @param lowScoringAchievements Achievement IDs with low scores
 * @param visitedNodes Previously visited nodes
 * @returns Array of suggested questions
 */
export const suggestQuestionsForKnowledgeGaps = (
  lowScoringAchievements: string[],
  visitedNodes: string[]
): string[] => {
  const suggestions: string[] = [];
  
  for (const achievementId of lowScoringAchievements) {
    const nodeId = findNodeForAchievement(achievementId, visitedNodes);
    const question = getNodeQuestion(nodeId);
    
    if (question && !suggestions.includes(question)) {
      suggestions.push(question);
    }
  }
  
  return suggestions;
}; 