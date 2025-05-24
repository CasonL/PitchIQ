import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Import Framer Motion
// TODO: Import icons later: Mic, Send, Volume2, MessageSquare 
// import cn from "@/lib/utils"; // Incorrect default import
import { cn } from "@/lib/utils"; // Correct named import
import { BrainCircuit, MessageSquareText, Mic, BarChart2, PlayCircle, Loader2, PlaySquare, ChevronDown, Info } from 'lucide-react'; // Import icons and ChevronDown
import { Button } from "@/components/ui/button"; // Need Button component
import { marked } from 'marked'; // Import marked for markdown parsing

// Extend Window interface to add our custom property
declare global {
  interface Window {
    connectionErrorShown?: boolean;
  }
}

// Storage keys for persisting state
const STORAGE_KEY_PREFIX = 'ai_coach_';
const STORAGE_KEYS = {
  cardState: `${STORAGE_KEY_PREFIX}card_state`,
  messages: `${STORAGE_KEY_PREFIX}messages`,
  userMessages: `${STORAGE_KEY_PREFIX}user_messages`,
  showActionButtons: `${STORAGE_KEY_PREFIX}show_action_buttons`,
  onboardingComplete: `${STORAGE_KEY_PREFIX}onboarding_complete`,
  onboardingData: `${STORAGE_KEY_PREFIX}onboarding_data`,
  hasCompletedRoleplay: `${STORAGE_KEY_PREFIX}has_completed_roleplay`
};

// Contextual guidance for each stage
const STAGE_GUIDANCE = {
  product: {
    title: "Product/Service Details",
    description: "Describe what you sell and what makes it unique.",
    examples: [
      "We offer a CRM software for small businesses that streamlines customer management.",
      "Our sales training program uses AI to create realistic practice scenarios.",
      "We provide managed IT services with 24/7 support and proactive monitoring."
    ],
    placeholder: "What product or service are you selling?",
    tooltip: "Include both what your product/service does and what makes it special compared to alternatives."
  },
  market_and_buyer: {
    title: "Target Market & Buyer",
    description: "Define who you sell to and their needs.",
    examples: [
      "B2C sales professionals who want to improve their skills and close more deals.",
      "Small business owners who need to improve their sales conversations.",
      "Sales managers wanting to provide better training for their teams."
    ],
    placeholder: "Who are your customers and what are their needs?",
    tooltip: "Include information about who buys your product, their role, and what they're looking to accomplish."
  },
  sales_context: {
    title: "Sales Context",
    description: "Describe your sales cycle and common objections.",
    examples: [
      "60-90 day sales cycle with price as the main objection.",
      "Our customers typically compare us against [competitors].",
      "Most prospects need approval from IT, Legal, and Finance."
    ],
    placeholder: "What's your sales cycle like and common objections?",
    tooltip: "Include sales cycle length, decision-making process, common objections, and competitive landscape."
  }
};

// Add an onboarding guidance framework after the STAGE_GUIDANCE constant

// AI guidance for onboarding conversations
const AI_GUIDANCE = {
  overall_goal: "Collect sufficient information about the user's product/service, target market, and sales context to create personalized sales training scenarios, while helping users better articulate their value proposition.",
  
  product_stage: {
    goal: "Help users clearly articulate what their product/service does and what makes it unique or better than alternatives.",
    information_needed: [
      "Basic description of product/service functionality",
      "Unique selling points or competitive advantages",
      "Key benefits to customers",
      "How it's different from alternatives"
    ],
    example_questions: [
      "To build on that, how does your sales course work? What are it's key features that help salespeople grow?",
      "I see your product filters water - what makes customers choose your filtering system over other options on the market?",
      "You mentioned your app helps with productivity - what specific benefits do your users experience after implementing it?",
      "That's interesting! How is your approach to inventory management different from traditional systems?"
    ],
    principles: [
      "Reference what they've shared to show understanding",
      "Ask for elaboration on areas that need more detail",
      "Provide examples when users are struggling to articulate uniqueness",
      "Don't repeat the same question if they've given a brief answer",
      "Move on once you have sufficient information about functionality and uniqueness"
    ]
  },
  
  market_stage: {
    goal: "Understand who the user is selling to, including demographics, needs, and buying process.",
    information_needed: [
      "**Target customer type (B2B/B2C/both)**",
      "Specific industries, roles, or demographics",
      "Key pain points or needs of these customers",
      "Decision-making process (if B2B)"
    ],
    example_questions: [
      "Based on what you've told me about your software, who benefits most from these automation capabilities?",
      "Are you primarily selling your healthcare solution to hospitals and clinics, individual practitioners, or both?",
      "For your premium writing service, which industries or professional roles tend to need this level of quality?",
      "You mentioned business customers - what specific problems are these organizations trying to solve with your solution?"
    ],
    principles: [
      "Help users narrow down from 'everyone' to specific segments",
      "Explain why customer segmentation is valuable for sales",
      "Ask for specifics when answers are too general",
      "Connect their product's benefits to specific customer needs"
    ]
  },
  
  sales_context_stage: {
    goal: "Understand the sales environment, including cycle length, objections, and competition.",
    information_needed: [
      "Typical sales cycle length",
      "Common objections faced",
      "Key competitors or alternatives",
      "Decision-making factors for customers"
    ],
    example_questions: [
      "For your enterprise security solution, how long does it typically take from first contact to closing a deal?",
      "When selling your consulting services, what objections or concerns do prospects mention most frequently?", 
      "Which companies do your customers typically compare your productivity tool against before making a decision?",
      "With your premium pricing strategy, what factors most influence the customer's decision to invest in your solution?"
    ],
    principles: [
      "Focus on gathering practical sales information",
      "Ask follow-up questions for very brief answers",
      "Explain how this information helps create realistic training",
      "Acknowledge progress through the onboarding process"
    ]
  }
};

// Props will evolve later
interface AISummaryCardProps {}

// Define interaction modes
type InteractionMode = 'none' | 'chat' | 'voice';

// Define card states
type CardState = 'button' | 'options' | 'chat' | 'voice' | 'expanded';

// Define message types
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

// Define onboarding stages with improved naming and order
type OnboardingStage = 'product' | 'market_and_buyer' | 'sales_context' | 'complete';

// Define onboarding data - this is what populates the right panel
interface OnboardingData {
  product: string;
  marketAndBuyer: string; // Combined field
  salesContext: string;
  stage: OnboardingStage;
}

// Add after OnboardingData interface (around line 58)
// Roleplay scenario generation based on user data
interface RoleplayScenario {
  industry: string;
  companyName: string;
  contactName: string;
  contactTitle: string;
  companySize: string;
  painPoints: string[];
  objections: string[];
  scenarioDescription: string;
}

// Data validation schemas
interface ValidationSchema {
  minLength: number;
  requiredKeywords: string[];
  suggestedKeywords: string[];
  validationMessage: string;
}

// Validation schemas for each stage
const VALIDATION_SCHEMAS: Record<Exclude<OnboardingStage, 'complete'>, ValidationSchema> = {
  product: {
    minLength: 30,
    requiredKeywords: ['product', 'service'],
    suggestedKeywords: ['unique', 'feature', 'benefit', 'different', 'solution'],
    validationMessage: "Please provide more details about your product or service and what makes it unique."
  },
  market_and_buyer: {
    minLength: 20,
    requiredKeywords: ['market', 'buyer', 'business'],
    suggestedKeywords: ['size', 'sector', 'customer', 'business', 'client'],
    validationMessage: "Please specify which industries or company sizes you target."
  },
  sales_context: {
    minLength: 20,
    requiredKeywords: ['objection', 'cycle', 'sales'],
    suggestedKeywords: ['process', 'days', 'months', 'competitor', 'price', 'budget'],
    validationMessage: "Please provide details about your sales cycle and common objections."
  }
};

// Add example-based evaluation just after the VALIDATION_SCHEMAS constant (around line 200)
// These examples help determine when the user has provided enough information

const INFORMATION_EXAMPLES = {
  product: {
    sufficient: [
      "I sell project management software that helps teams track tasks and deadlines. It integrates with Slack and email.",
      "Our consulting services help small businesses optimize their sales process through data analysis and training.",
      "We offer custom CRM solutions for real estate agents that automate follow-ups and track client relationships.",
      "My company makes ergonomic office chairs designed to reduce back pain for people who sit all day.",
      "I'm selling a SaaS platform for inventory management that uses AI to predict stock needs.",
      "We provide marketing automation software that specializes in email campaigns and social media scheduling."
    ],
    insufficient: [
      "I sell software.",
      "We do consulting.",
      "Office furniture.",
      "A training program.",
      "We sell a product online.",
      "It's a service business."
    ]
  },
  market_and_buyer: {
    sufficient: [
      "We target mid-sized manufacturing companies with 50-200 employees, usually selling to operations managers.",
      "Our customers are small law firms who need better client management systems.",
      "We sell to HR directors at enterprise companies who need to streamline their onboarding process.",
      "Our market is independent restaurants looking to reduce food waste and improve inventory management.",
      "We focus on marketing agencies that need better project tracking for their client campaigns.",
      "We sell to healthcare providers, particularly hospitals and larger medical practices."
    ],
    insufficient: [
      "Everyone who needs our product.",
      "Businesses.",
      "People who want to save money.",
      "Online customers.",
      "Companies of all sizes.",
      "Anyone interested."
    ]
  },
  sales_context: {
    sufficient: [
      "Our sales cycle is typically 30-45 days. The biggest objection we face is price - competitors offer similar features for less.",
      "We have a 60-90 day sales cycle with multiple stakeholders. IT security concerns are our main roadblock.",
      "Sales usually take 2-3 weeks, but implementation is another month. Customers worry about employee adoption.",
      "Our cycle is around 45 days, competing against 3 major alternatives. Decision makers often need board approval.",
      "We typically close deals in 3-4 meetings over 1-2 months. The main objection is whether our solution integrates with their existing tools.",
      "Sales take about 60 days with the biggest hurdle being budget approval from finance departments."
    ],
    insufficient: [
      "Sales are pretty quick.",
      "People sometimes think it's expensive.",
      "We have some competitors.",
      "It's not a complicated process.",
      "Most people like our product.",
      "We just email them information."
    ]
  }
};

// Simple topic guidance prompts - no entity extraction logic
const GUIDANCE_PROMPTS = {
  product: "As a sales coach, ask the user what product or service they're selling. Be brief but friendly. Don't identify yourself as an AI.",
  productFollowUp: "Ask the user to provide more details about their product or service's features and benefits.",
  market: "Thank the user for the information. Now ask about their target market segment (B2B, B2C, etc.) and industry focus.",
  targetMarket: "Thank the user and now ask for specific details about their target audience (demographics, pain points, etc.).",
  readyForRoleplay: "Summarize the information collected, offer sales insights based on what they've shared, and ask if they're ready to begin a roleplay scenario."
};

// Simple function to determine next stage based on current stage
const determineNextStage = (currentStage: OnboardingStage): OnboardingStage => {
  switch (currentStage) {
    case 'product':
      return 'market_and_buyer';
    case 'market_and_buyer':
      return 'sales_context';
    case 'sales_context':
      return 'complete';
    default:
      return 'complete';
  }
};

// Modified and new styles for a full-screen professional layout
const cardVariants = {
  button: {
    width: 'auto',
    height: 'auto',
    scale: 1,
    opacity: 1,
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 30, 
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1]
    }
  },
  options: {
    width: '100%',
    maxWidth: '800px',
    height: 'auto',
    scale: 1,
    opacity: 1,
    transition: { 
      type: 'spring', 
      stiffness: 250,
      damping: 25,
      duration: 0.7,
      ease: "easeInOut"
    }
  },
  chat: {
    width: '100%',
    height: '100%',
    scale: 1,
    opacity: 1,
    transition: { 
      type: 'spring', 
      stiffness: 250, 
      damping: 30, 
      duration: 0.7,
      ease: [0.34, 1.56, 0.64, 1]
    }
  },
  splitView: {
    width: '100%',
    height: '100%',
    scale: 1,
    opacity: 1,
    transition: { 
      type: 'spring', 
      stiffness: 250, 
      damping: 30, 
      duration: 0.7
    }
  }
};

// Add some new content variants for smoother animations
const contentFadeVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

// Add a new message animation variant
const messageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 500, damping: 30 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Add after line 57, just before GUIDANCE_PROMPTS

// Enhanced industry and keyword detection
interface IndustryDetectionResult {
  industryType: string | null;
  productType: string | null; 
  companySize: string | null;
  isServiceBased: boolean;
  confidence: number;
}

interface USPDetectionResult {
  hasUSP: boolean;
  uspType: string | null;
  confidence: number;
}

// Smart industry, product type, and company size detection
const detectIndustryAndProductType = (text: string): IndustryDetectionResult => {
  const lowerText = text.toLowerCase();
  
  // Industry detection patterns with expanded keywords
  const industries = {
    tech: ['software', 'saas', 'tech', 'technology', 'app', 'application', 'digital', 'cloud', 'ai', 'artificial intelligence', 'ml', 'machine learning', 'data', 'analytics', 'platform', 'online', 'internet', 'web', 'mobile', 'api'],
    healthcare: ['health', 'healthcare', 'medical', 'pharma', 'pharmaceutical', 'biotech', 'wellness', 'therapy', 'hospital', 'clinic', 'patient', 'doctor', 'telemedicine', 'diagnostic', 'treatment', 'care', 'clinical', 'health tech'],
    finance: ['finance', 'financial', 'bank', 'banking', 'invest', 'investment', 'fintech', 'insurance', 'loan', 'mortgage', 'wealth', 'capital', 'credit', 'payment', 'transaction', 'money', 'fund', 'trading', 'asset'],
    education: ['education', 'learning', 'training', 'teach', 'school', 'university', 'course', 'skill', 'knowledge', 'elearning', 'coaching', 'academic', 'student', 'teacher', 'curriculum', 'class', 'lesson', 'educational'],
    retail: ['retail', 'ecommerce', 'shop', 'store', 'commerce', 'product', 'consumer', 'goods', 'marketplace', 'merchant', 'inventory', 'shopping', 'brand', 'seller', 'buyer', 'customer', 'purchase'],
    manufacturing: ['manufacturing', 'factory', 'industrial', 'production', 'supply chain', 'logistics', 'warehouse', 'material', 'equipment', 'machinery', 'assembly', 'fabrication', 'parts', 'component', 'operations'],
    realestate: ['real estate', 'property', 'housing', 'apartment', 'rent', 'lease', 'home', 'building', 'construction', 'broker', 'agent', 'mortgage', 'commercial', 'residential', 'listing', 'buyer', 'seller'],
    marketing: ['marketing', 'advertising', 'brand', 'media', 'promotion', 'campaign', 'agency', 'seo', 'content', 'social media', 'digital marketing', 'lead generation', 'audience', 'customer acquisition'],
    hr: ['hr', 'human resources', 'recruiting', 'talent', 'hiring', 'workforce', 'employee', 'staff', 'recruitment', 'personnel', 'benefits', 'compensation', 'onboarding', 'training', 'development'],
    legal: ['legal', 'law', 'attorney', 'compliance', 'regulation', 'contract', 'lawyer', 'firm', 'legal services', 'counsel', 'litigation', 'rights', 'documentation', 'policy'],
    consulting: ['consulting', 'consultant', 'advisor', 'professional services', 'strategy', 'expertise', 'specialist', 'guidance', 'recommendation', 'assessment', 'analysis'],
    energy: ['energy', 'utility', 'power', 'electricity', 'gas', 'oil', 'renewable', 'solar', 'wind', 'green energy', 'sustainable', 'carbon', 'climate'],
    telecom: ['telecommunications', 'telecom', 'network', 'internet service', 'wireless', 'broadband', 'communication', 'cellular', 'phone', 'provider', 'connectivity']
  };
  
  // Product type detection patterns
  const productTypes = {
    software: ['software', 'platform', 'app', 'application', 'system', 'tool', 'solution', 'dashboard', 'portal', 'interface', 'program', 'suite', 'api'],
    service: ['service', 'consulting', 'coaching', 'advising', 'support', 'assistance', 'help', 'guidance', 'maintenance', 'management', 'administration', 'consultation'],
    subscription: ['subscription', 'membership', 'plan', 'monthly', 'yearly', 'recurring', 'billing', 'payment plan', 'saas', 'license', 'access'],
    physical: ['device', 'hardware', 'equipment', 'product', 'gadget', 'machine', 'appliance', 'tool', 'instrument', 'component', 'material', 'unit'],
    content: ['content', 'course', 'program', 'material', 'resource', 'video', 'guide', 'ebook', 'template', 'document', 'training', 'information', 'media']
  };
  
  // Company size detection
  const companySizes = {
    enterprise: ['enterprise', 'large company', 'large business', 'corporation', 'corporate', 'big company', 'fortune 500', 'global', 'multinational'],
    midmarket: ['mid-market', 'midmarket', 'medium sized', 'medium business', 'mid-sized', 'midsize', 'growing company'],
    smb: ['small business', 'small company', 'smb', 'small medium business', 'startup', 'small team', 'small organization', 'local business', 'mom and pop', 'family business'],
    startup: ['startup', 'early stage', 'seed stage', 'series a', 'series b', 'venture', 'founder', 'founding', 'newly established']
  };
  
  // Detect industry
  let detectedIndustry: string | null = null;
  let industryConfidence = 0;
  
  for (const [industry, keywords] of Object.entries(industries)) {
    const matches = keywords.filter(keyword => lowerText.includes(keyword));
    const matchCount = matches.length;
    
    if (matchCount > industryConfidence) {
      industryConfidence = matchCount;
      detectedIndustry = industry;
    }
  }
  
  // Detect product type
  let detectedProductType: string | null = null;
  let isServiceBased = false;
  let productTypeConfidence = 0;
  
  for (const [type, keywords] of Object.entries(productTypes)) {
    const matches = keywords.filter(keyword => lowerText.includes(keyword));
    const matchCount = matches.length;
    
    if (matchCount > productTypeConfidence) {
      productTypeConfidence = matchCount;
      detectedProductType = type;
      isServiceBased = type === 'service' || type === 'subscription' || type === 'content';
    }
  }
  
  // Default to service if training is mentioned
  if (detectedProductType === null && (lowerText.includes('train') || lowerText.includes('coach'))) {
    detectedProductType = 'service';
    isServiceBased = true;
    productTypeConfidence = 1;
  }
  
  // Detect company size
  let detectedCompanySize: string | null = null;
  let companySizeConfidence = 0;
  
  for (const [size, keywords] of Object.entries(companySizes)) {
    const matches = keywords.filter(keyword => lowerText.includes(keyword));
    const matchCount = matches.length;
    
    if (matchCount > companySizeConfidence) {
      companySizeConfidence = matchCount;
      detectedCompanySize = size;
    }
  }
  
  // Calculate overall confidence score (0-1)
  const confidence = Math.min(1, (industryConfidence + productTypeConfidence) / 5);
  
  return { 
    industryType: detectedIndustry, 
    productType: detectedProductType,
    companySize: detectedCompanySize,
    isServiceBased,
    confidence
  };
};

// Enhanced USP detection
const detectUSP = (text: string): USPDetectionResult => {
  const lowerText = text.toLowerCase();
  
  // USP indicators by category - expanded
  const uspIndicators = {
    innovation: ['innovative', 'cutting-edge', 'groundbreaking', 'revolutionary', 'novel', 'new', 'first', 'disruptive', 'breakthrough', 'state-of-the-art', 'advanced', 'modern', 'pioneering', 'leading-edge', 'unique'],
    quality: ['quality', 'premium', 'high-end', 'superior', 'excellence', 'best', 'finest', 'top-tier', 'world-class', 'exceptional', 'outstanding', 'reliable', 'durable', 'trusted', 'precise'],
    efficiency: ['efficient', 'faster', 'quicker', 'speed', 'time-saving', 'streamlined', 'optimized', 'automated', 'productivity', 'performance', 'effectiveness', 'seamless', 'agile', 'rapid', 'simplified'],
    customization: ['custom', 'tailored', 'personalized', 'bespoke', 'individual', 'specific', 'unique', 'adapted', 'flexibility', 'configurable', 'adjustable', 'modifiable', 'versatile', 'adaptable'],
    costEffective: ['affordable', 'cost-effective', 'economical', 'value', 'budget', 'save money', 'cheaper', 'inexpensive', 'competitive price', 'reasonable', 'savings', 'roi', 'investment', 'profitable'],
    comprehensive: ['comprehensive', 'all-in-one', 'complete', 'integrated', 'holistic', 'full-service', 'end-to-end', 'one-stop', 'unified', 'extensive', 'multi-functional', 'all-inclusive', 'thorough'],
    expertise: ['expert', 'specialized', 'experienced', 'knowledgeable', 'skilled', 'qualified', 'professional', 'certified', 'trained', 'proficient', 'mastery', 'specialist', 'authority', 'leader'],
    results: ['results', 'outcome', 'performance', 'achievement', 'success', 'proven', 'guaranteed', 'effective', 'impact', 'track record', 'measurable', 'return', 'improvement', 'benefit'],
    support: ['support', 'service', 'assistance', 'help', 'guidance', 'responsive', 'available', '24/7', 'dedicated', 'customer service', 'customer success', 'team', 'community', 'resources']
  };
  
  // Common USP phrases - expanded
  const uspPhrases = [
    'what sets us apart', 'what makes us different', 'our advantage', 'our unique', 'unlike others',
    'better than', 'compared to', 'competitors', 'differentiator', 'stand out', 'stands out',
    'special about', 'benefit of', 'key feature', 'main benefit', 'advantage is', 'competitive edge',
    'our approach', 'unlike anything else', 'proprietary', 'patented', 'exclusive', 'unmatched',
    'outperforms', 'we excel at', 'our strength', 'best in class', 'industry leading'
  ];
  
  // Check for USP phrases
  const hasUSPPhrase = uspPhrases.some(phrase => lowerText.includes(phrase));
  
  // Count USP keywords by category
  let uspCount = 0;
  let detectedUSPType: string | null = null;
  let highestCount = 0;
  let categoryScores: Record<string, number> = {};
  
  for (const [type, keywords] of Object.entries(uspIndicators)) {
    const matchingKeywords = keywords.filter(keyword => lowerText.includes(keyword));
    const matchCount = matchingKeywords.length;
    
    // Track keyword counts by category
    categoryScores[type] = matchCount;
    uspCount += matchCount;
    
    if (matchCount > highestCount) {
      highestCount = matchCount;
      detectedUSPType = type;
    }
  }
  
  // Calculate confidence based on text length, USP phrases, and keyword count
  const lengthFactor = Math.min(1, text.length / 100);  // Longer text has higher confidence up to a point
  const phraseBonus = hasUSPPhrase ? 0.5 : 0;  // Boost confidence if USP phrases are present
  const keywordFactor = Math.min(1, uspCount / 3);  // More USP keywords = higher confidence
  
  // Combined confidence score (0-1 scale)
  const confidence = lengthFactor * 0.3 + phraseBonus * 0.3 + keywordFactor * 0.4;
  
  // Determine if a USP is present based on confidence score and keywords
  const hasUSP = confidence > 0.5 || hasUSPPhrase || uspCount >= 2;
  
  return { 
    hasUSP, 
    uspType: detectedUSPType, 
    confidence 
  };
};

// Company size classification helper
const getCompanySizeLabel = (size: string | null): string => {
  if (!size) return "companies";
  
  switch (size) {
    case 'enterprise': return "large enterprises";
    case 'midmarket': return "mid-market companies";
    case 'smb': return "small and medium businesses";
    case 'startup': return "startups";
    default: return "companies";
  }
};

// Industry-specific description helper
const getIndustryDescription = (industry: string | null): string => {
  if (!industry) return "businesses";
  
  switch (industry) {
    case 'tech': return "technology companies";
    case 'healthcare': return "healthcare organizations";
    case 'finance': return "financial institutions";
    case 'education': return "educational institutions";
    case 'retail': return "retail businesses";
    case 'manufacturing': return "manufacturing companies";
    case 'realestate': return "real estate businesses";
    case 'marketing': return "marketing agencies";
    case 'hr': return "HR departments";
    case 'legal': return "legal firms";
    case 'consulting': return "consulting firms";
    case 'energy': return "energy companies";
    case 'telecom': return "telecommunications providers";
    default: return "businesses";
  }
};

// Add interface for validation status
interface ValidationStatus {
  isValid: boolean;
  message: string;
  missingKeywords: string[];
}

// Add typing effect component at the top of the file
interface TypingEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

// Note: CSS styles moved inside the TypingEffect component

// Simple streaming text effect similar to ChatGPT
const TypingEffect: React.FC<TypingEffectProps> = ({ 
  text, 
  speed = 40,
  onComplete 
}) => {
  const [chunks, setChunks] = useState<{
    text: string;
    visible: boolean; 
    id: number;
    isPunctuation?: boolean;
    isBreak?: boolean;
    isMarkdown?: boolean;
  }[]>([]);
  
  // Simplify CSS - keep only essential styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .typing-container {
        white-space: pre-wrap;
        word-break: break-word;
        position: relative;
      }
      
      .chunk {
        display: inline-block;
        opacity: 0;
        transform: scale(0.98);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      
      .chunk.visible {
        opacity: 1;
        transform: scale(1);
      }
      
      .chunk.punctuation {
        transition: opacity 0.3s ease-out, transform 0.3s ease-out;
      }
      
      .chunk.break {
        display: block;
        height: 0.8em;
      }
      
      .chunk.markdown {
        display: inline;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Word chunking algorithm - similar to ChatGPT's behavior
  useEffect(() => {
    if (!text) return;
    
    // Reset when text changes
    setChunks([]);
    
    // Step 1: Clean and normalize the text
    // This is crucial for handling weird API responses with unexpected spacing
    const normalizedText = text
      // Standardize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Fix missing spaces after punctuation marks followed by letters
      .replace(/([.!?:;,])([A-Za-z])/g, '$1 $2')
      // Handle consecutive spaces (but preserve newlines)
      .replace(/ +/g, ' ')
      // Normalize line breaks with consistent spacing
      .replace(/\n+/g, '\n')
      .trim();
    
    // Step 2: Pre-process sentences for better chunking
    // Break text into sentences first to respect sentence boundaries
    const sentences = normalizedText
      // Split at sentence boundaries with careful regex
      .split(/(?<=[.!?])\s+(?=[A-Z])/g)
      .filter(Boolean);
      
    // Step 3: Process sentences into chunks
    const textChunks: string[] = [];
    
    sentences.forEach(sentence => {
      // Handle markdown elements first
      if (sentence.startsWith('- ') || sentence.startsWith('* ') || /^\d+\.\s/.test(sentence)) {
        // It's a list item - treat as a special chunk
        textChunks.push(sentence);
        return;
      }
      
      // Handle explicit line breaks
      if (sentence === '\n') {
        textChunks.push('\n');
        return;
      }
      
      // Split the sentence by spaces to get words, also split at punctuation to ensure spacing
      const words = sentence.split(/(\s+|\n|(?<=[,.!?;:])(?=\S))/);
      
      let currentChunk = '';
      let wordCount = 0;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Skip empty tokens
        if (!word) continue;
        
        const isPunctuation = /^[,.!?;:]$/.test(word.trim());
        const isSpace = /^\s+$/.test(word);
        const isNewline = word === '\n';
        
        // Handle newlines as separate chunks
        if (isNewline) {
          if (currentChunk) {
            textChunks.push(currentChunk);
            currentChunk = '';
            wordCount = 0;
          }
          textChunks.push('\n');
          continue;
        }
        
        // Always include spaces with the previous word
        if (isSpace && currentChunk) {
          currentChunk += word;
          continue;
        }
        
        // For punctuation, create a separate chunk
        if (isPunctuation) {
          if (currentChunk) {
            textChunks.push(currentChunk);
            currentChunk = '';
            wordCount = 0;
          }
          textChunks.push(word);
          continue;
        }
        
        // Group 1-3 normal words together, with some randomness
        // Favor smaller chunks for snappier animations
        const maxWordsInChunk = Math.random() < 0.4 ? 1 : Math.random() < 0.85 ? 2 : 3;
        
        if (wordCount < maxWordsInChunk) {
          currentChunk += word;
          wordCount++;
        } else {
          // When we have enough words, push the chunk and reset
          currentChunk += word;
          textChunks.push(currentChunk);
          currentChunk = '';
          wordCount = 0;
        }
      }
      
      // Add any remaining chunk
      if (currentChunk) {
        textChunks.push(currentChunk);
      }
    });
    
    // Step 4: Create state chunks with proper metadata
    const stateChunks = textChunks.map((chunk, index) => {
      // Check for different chunk types
      const isPunctuation = /^[,.!?;:]$/.test(chunk.trim());
      const isBreak = chunk === '\n';
      const isMarkdown = chunk.startsWith('- ') || chunk.startsWith('* ') || /^\d+\.\s/.test(chunk);
      
      return {
        text: chunk,
        visible: false,
        id: index,
        isPunctuation,
        isBreak,
        isMarkdown
      };
    });
    
    setChunks(stateChunks);
    
    // Reveal function with natural pauses between chunks
    const revealChunks = (index = 0) => {
      if (index >= stateChunks.length) {
        // All chunks are visible - call onComplete callback
        if (onComplete) onComplete();
        return;
      }
      
      // Make current chunk visible
      setChunks(currentChunks => 
        currentChunks.map((chunk, i) => 
          i === index ? { ...chunk, visible: true } : chunk
        )
      );
      
      // Calculate delay based on chunk content
      const chunk = stateChunks[index];
      
      // Handle line breaks with a pause
      if (chunk.isBreak) {
        setTimeout(() => revealChunks(index + 1), 150);
        return;
      }
      
      // Handle markdown elements with a slightly longer pause
      if (chunk.isMarkdown) {
        setTimeout(() => revealChunks(index + 1), 200);
        return;
      }
      
      // Base delay - faster for snappier feel
      let delay = 60 + (Math.random() * 25);
      
      // Add extra delay for punctuation with more variation
      if (/[.!?]/.test(chunk.text)) {
        // End of sentence - shorter but still noticeable pause
        delay += 250 + (Math.random() * 100); 
      } else if (/[,;:]/.test(chunk.text)) {
        // Mid-sentence punctuation - quick but perceptible pause
        delay += 150 + (Math.random() * 50);
      } else {
        // Regular text - minimal delay for snappier feel
        delay += Math.min(chunk.text.length * 5, 50);
        delay += Math.random() * 30; // Slight randomness for natural rhythm
        
        // Occasionally add a slight pause (but shorter than before)
        if (Math.random() < 0.1) {
          delay += 80;
        }
      }
      
      // Special case: if the next chunk is punctuation, reduce this delay slightly
      // to make the punctuation appear more connected to the preceding text
      if (index < stateChunks.length - 1 && stateChunks[index + 1].isPunctuation) {
        delay = Math.max(40, delay * 0.6);
      }
      
      // Schedule next chunk
      setTimeout(() => revealChunks(index + 1), delay);
    };
    
    // Start the animation with minimal delay
    setTimeout(() => revealChunks(), 50);
    
  }, [text, speed, onComplete]);
  
  // Render with special handling for different chunk types
  return (
    <div className="typing-container">
      {chunks.map(chunk => {
        // Handle different chunk types
        if (chunk.isBreak) {
          return <br key={chunk.id} className={`chunk break ${chunk.visible ? 'visible' : ''}`} />;
        }
        
        return (
          <span 
            key={chunk.id} 
            className={`chunk ${chunk.visible ? 'visible' : ''} ${chunk.isPunctuation ? 'punctuation' : ''} ${chunk.isMarkdown ? 'markdown' : ''}`}
          >
            {chunk.text}
          </span>
        );
      })}
    </div>
  );
};

// Clean up AI responses to remove unhelpful continuation prompts
const cleanAIResponse = (response: string): string => {
  // List of phrases to remove from the end of AI responses
  const continuationPhrases = [
    "Is there anything else you'd like to add, or can we continue?",
    "Is there anything else you'd like to add?",
    "Can we continue?",
    "Would you like to continue?",
    "Should we move on to the next step?",
    "Ready to continue?",
    "Anything else you'd like to share before we continue?"
  ];
  
  let cleanedResponse = response;
  
  // Check if any of these phrases appear at the end of the response and remove them
  for (const phrase of continuationPhrases) {
    if (cleanedResponse.endsWith(phrase)) {
      cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - phrase.length).trim();
    }
  }
  
  return cleanedResponse;
};

// Clean up AI responses to remove unhelpful continuation prompts already defined above\r\n\r\nconst AISummaryCard: React.FC<AISummaryCardProps> = ({ /* props */ }) => {

  // State variables
  const [cardState, setCardState] = useState<CardState>('button');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // New state variables for typewriter prompt
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  
  // Add missing state variables
  const [showValidationTooltip, setShowValidationTooltip] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null);
  const [generatedScenario, setGeneratedScenario] = useState<RoleplayScenario | null>(null);
  const [isRecordingSummary, setIsRecordingSummary] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState("0%");
  const [previousStages, setPreviousStages] = useState<{stage: OnboardingStage, data: string}[]>([]);
  const [isUndoVisible, setIsUndoVisible] = useState(false);
  
  // Add feedback state
  const [showFeedbackTip, setShowFeedbackTip] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<{
    tip: string;
    technique: string;
    example: string;
  } | null>(null);
  
  // Onboarding state
  const [hasCompletedRoleplay, setHasCompletedRoleplay] = useState<boolean>(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    product: '',
    marketAndBuyer: '',
    salesContext: '',
    stage: 'product'
  });
  
  // References
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Add state for continue button
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [pendingSummary, setPendingSummary] = useState<{stage: OnboardingStage, summary: string} | null>(null);
  
  // Add a function to handle skipping a stage
  const handleSkipStage = (currentStage: OnboardingStage) => {
    console.log(`%cSkipping stage: ${currentStage}`, "background: orange; color: white");
    
    // Determine the next stage
    let nextStage: OnboardingStage;
    switch (currentStage) {
      case 'product':
        nextStage = 'market_and_buyer';
        break;
      case 'market_and_buyer':
        nextStage = 'sales_context';
        break;
      case 'sales_context':
        nextStage = 'complete';
        break;
      default:
        nextStage = 'complete';
    }
    
    // Update onboarding data with empty value for skipped stage
    setOnboardingData(prevData => {
      const newData = { ...prevData, stage: nextStage };
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(newData));
      
      return newData;
    });
    
    // Clear pending summary and hide continue button
    setPendingSummary(null);
    setShowContinueButton(false);
    
    // Add next stage question
    let nextMessage = "";
    switch (nextStage) {
      case 'market_and_buyer':
        nextMessage = "Who are you selling to? Please tell me about your target customers - who they are, their roles, and what they're looking to accomplish.";
        break;
      case 'sales_context':
        nextMessage = "What's your typical sales cycle like? What common objections do you face from prospects?";
        break;
      case 'complete':
        nextMessage = "Great! We have enough information to start. I'll prepare your personalized dashboard now.";
        setShowActionButtons(true);
        break;
    }
    
    if (nextMessage) {
      // Add AI message
      addAIMessage(nextMessage);
      
      // Force scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };
  
  // Add missing validation function
  const validateUserInput = (input: string, stage: Exclude<OnboardingStage, 'complete'>): ValidationStatus => {
    // Get validation schema for current stage
    const schema = VALIDATION_SCHEMAS[stage];
    
    // Check minimum length
    const meetsMinLength = input.length >= schema.minLength;
    
    // Check for required keywords
    const requiredKeywords = schema.requiredKeywords;
    const inputLower = input.toLowerCase();
    const missingKeywords = requiredKeywords.filter(keyword => 
      !inputLower.includes(keyword.toLowerCase())
    );
    
    // Check for suggested keywords (at least one should be present)
    const suggestedKeywords = schema.suggestedKeywords;
    const hasSuggestedKeyword = suggestedKeywords.some(keyword => 
      inputLower.includes(keyword.toLowerCase())
    );
    
    // Combine validation results
    const isValid = meetsMinLength && missingKeywords.length === 0 && hasSuggestedKeyword;
    
    return {
      isValid,
      message: isValid ? "" : schema.validationMessage,
      missingKeywords: isValid ? [] : [...missingKeywords, ...(!hasSuggestedKeyword ? [suggestedKeywords[0]] : [])]
    };
  };
  
  // Function to generate roleplay scenarios
  const generateRoleplayScenario = (): RoleplayScenario => {
    // Extract information from onboarding data
    const industryResult = detectIndustryAndProductType(onboardingData.product || "");
    
    // Generate company name based on industry
    let companyName = "";
    let industry = "technology";
    let contactTitle = "Director of Sales";
    
    if (industryResult.industryType) {
      industry = industryResult.industryType;
      
      switch (industryResult.industryType) {
        case 'tech':
          companyName = "TechSolutions Inc.";
          contactTitle = "VP of Technology";
          break;
        case 'healthcare':
          companyName = "HealthFirst Medical Group";
          contactTitle = "Chief Medical Officer";
          break;
        case 'finance':
          companyName = "Capital Finance Partners";
          contactTitle = "CFO";
          break;
        case 'education':
          companyName = "Learning Excellence Academy";
          contactTitle = "Director of Training";
          break;
        case 'retail':
          companyName = "Consumer Trends Retail";
          contactTitle = "Head of Sales";
          break;
        default:
          companyName = "Acme Corporation";
          contactTitle = "Director of Operations";
      }
    } else {
      // Default values if no industry is detected
      companyName = "Acme Corporation";
      industry = "business";
    }
    
    // Generate random contact name
    const firstNames = ["Michael", "Jennifer", "David", "Sarah", "Robert", "Lisa", "James", "Emily"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia"];
    
    const randomFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLast = lastNames[Math.floor(Math.random() * lastNames.length)];
    const contactName = `${randomFirst} ${randomLast}`;
    
    // Determine company size
    let companySize = "mid-sized";
    if (onboardingData.marketAndBuyer.toLowerCase().includes("enterprise")) {
      companySize = "large enterprise";
    } else if (onboardingData.marketAndBuyer.toLowerCase().includes("small")) {
      companySize = "small";
    } else if (onboardingData.marketAndBuyer.toLowerCase().includes("startup")) {
      companySize = "startup";
    }
    
    // Generate pain points based on user's product and target market
    const painPoints = [
      "improving sales team effectiveness",
      "reducing training costs",
      "implementing new sales methodologies",
      "improving close rates",
      "standardizing the sales process"
    ];
    
    // Generate common objections
    const objections = [
      "We already have a sales training program",
      "This seems expensive for what it offers",
      "We don't have time to implement new training right now",
      "I need to see proven ROI before committing",
      "I need to consult with the rest of my team first"
    ];
    
    // Generate scenario description
    const scenarioDescription = `${contactName} is the ${contactTitle} at ${companyName}, a ${companySize} company in the ${industry} industry. They're interested in solutions for ${painPoints[0]}, but have concerns about ${objections[0].toLowerCase()}.`;
    
    return {
      industry,
      companyName,
      contactName,
      contactTitle,
      companySize,
      painPoints,
      objections,
      scenarioDescription
    };
  };
  
  // Create a Timeline component to replace the right panel
  const OnboardingTimeline: React.FC = () => {
    // The completed stage is the one before the current stage
    const getStageStatus = (stage: OnboardingStage): 'completed' | 'current' | 'upcoming' => {
      const stageOrder: OnboardingStage[] = ['product', 'market_and_buyer', 'sales_context', 'complete'];
      const currentIndex = stageOrder.indexOf(onboardingData.stage);
      const stageIndex = stageOrder.indexOf(stage);
      
      if (stageIndex < currentIndex) return 'completed';
      if (stageIndex === currentIndex) return 'current';
      return 'upcoming';
    };
    
    return (
      <div className="space-y-6 p-3">
        <h3 className="text-lg font-semibold mb-6 text-gray-800">Onboarding Progress</h3>
        
        <div className="flex flex-col space-y-5">
          {/* Product Stage */}
          <div className="flex items-start space-x-4">
            <div className={`flex flex-col items-center`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                getStageStatus('product') === 'completed' ? 'bg-green-500 text-white' : 
                getStageStatus('product') === 'current' ? 'bg-blue-500 text-white shadow-md' : 
                'bg-gray-200'
              }`}>
                {getStageStatus('product') === 'completed' ? '✓' : '1'}
              </div>
              <div className="w-0.5 h-14 bg-gray-200"></div>
            </div>
            <div className="pt-0.5">
              <h4 className="font-semibold text-gray-800">Product/Service</h4>
              <p className="text-sm text-gray-500 mt-1">Your offering and what makes it unique</p>
              {getStageStatus('product') === 'current' && (
                <button 
                  onClick={() => handleSkipStage('product')}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-2 flex items-center"
                >
                  Skip this step
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Market & Buyer Stage (Combined) */}
          <div className="flex items-start space-x-4">
            <div className={`flex flex-col items-center`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                getStageStatus('market_and_buyer') === 'completed' ? 'bg-green-500 text-white' : 
                getStageStatus('market_and_buyer') === 'current' ? 'bg-blue-500 text-white shadow-md' : 
                'bg-gray-200'
              }`}>
                {getStageStatus('market_and_buyer') === 'completed' ? '✓' : '2'}
              </div>
              <div className="w-0.5 h-14 bg-gray-200"></div>
            </div>
            <div className="pt-0.5">
              <h4 className="font-semibold text-gray-800">Target Market & Buyer</h4>
              <p className="text-sm text-gray-500 mt-1">Who you sell to and their needs</p>
              
              {getStageStatus('market_and_buyer') === 'current' && (
                <button 
                  onClick={() => handleSkipStage('market_and_buyer')}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-2 flex items-center"
                >
                  Skip this step
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Sales Context Stage */}
          <div className="flex items-start space-x-4">
            <div className={`flex flex-col items-center`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                getStageStatus('sales_context') === 'completed' ? 'bg-green-500 text-white' : 
                getStageStatus('sales_context') === 'current' ? 'bg-blue-500 text-white shadow-md' : 
                'bg-gray-200'
              }`}>
                {getStageStatus('sales_context') === 'completed' ? '✓' : '3'}
              </div>
              <div className="w-0.5 h-14 bg-gray-200"></div>
            </div>
            <div className="pt-0.5">
              <h4 className="font-semibold text-gray-800">Sales Context</h4>
              <p className="text-sm text-gray-500 mt-1">Sales cycle and common objections</p>
              {getStageStatus('sales_context') === 'current' && (
                <button 
                  onClick={() => handleSkipStage('sales_context')}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-2 flex items-center"
                >
                  Skip this step
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Complete Stage */}
          <div className="flex items-start space-x-4">
            <div className={`flex flex-col items-center`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                getStageStatus('complete') === 'completed' ? 'bg-green-500 text-white' : 
                getStageStatus('complete') === 'current' ? 'bg-blue-500 text-white shadow-md' : 
                'bg-gray-200'
              }`}>
                {getStageStatus('complete') === 'completed' ? '✓' : '4'}
              </div>
            </div>
            <div className="pt-0.5">
              <h4 className="font-semibold text-gray-800">Ready for Dashboard</h4>
              <p className="text-sm text-gray-500 mt-1">View your personalized sales dashboard</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Handle card/button click
  const handleCardClick = () => {
    if (cardState === 'button') {
      // Reset all message and conversation states
      resetAllStates();
      
      // Expand from button to options
      setCardState('options');
    }
  };

  // Handle voice selection
  const handleSelectVoice = () => {
    console.log("Voice option selected - Not implemented yet");
    // Future: Implement voice functionality
  };

  // Handle chat selection
  const handleSelectChat = () => {
    // Only initialize fresh messages if there are none
    if (messages.length === 0) {
      setCardState('chat');
      // fetchInitialMessages is called by the useEffect
    } else {
      setCardState('chat');
    }
  };

  // Handle practice button click
  const handlePracticeClick = () => {
    // Add a message acknowledging the practice request
    const coachResponse = {
      id: Date.now().toString(),
      content: "Great! Let's practice identifying pain points. I'll set up a scenario for you shortly.",
      isUser: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, coachResponse]);
    
    // In a real implementation, this would navigate to a practice exercise
    console.log("Practice clicked - Would navigate to exercise page");
  };

  // Handle new roleplay button click
  const handleNewRoleplayClick = () => {
    // Add a message acknowledging the new roleplay request
    const coachResponse = {
      id: Date.now().toString(),
      content: "Awesome! Let's start a fresh roleplay. I'll set up a new scenario for you to practice with.",
      isUser: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, coachResponse]);
    
    // In a real implementation, this would navigate to a new roleplay
    console.log("New roleplay clicked - Would start new roleplay");
  };

  // Handle user input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  // Handle user message send
  const handleSendMessage = () => {
    if (userInput.trim() && !isLoading) {
      // Pre-process input to handle pasted conversation logs
      const cleanedInput = preprocessUserInput(userInput.trim());
      
      // Add user message to the conversation
      const newUserMessage = {
        id: Date.now().toString(),
        content: cleanedInput,
        isUser: true,
        timestamp: new Date()
      };
      
      // Update messages state with user message
      setMessages(prev => [...prev, newUserMessage]);
      
      // Store the input before clearing
      const userInputText = cleanedInput;
      
      // Clear input
      setUserInput("");
      
      // Check if we're in roleplay mode and should show sales tips
      if (hasCompletedRoleplay && generatedScenario) {
        checkForFeedbackOpportunity(userInputText);
      }
      
      // Check if we're in onboarding mode
      if (!hasCompletedRoleplay && onboardingData.stage !== 'complete') {
        console.log(`%cHandling onboarding message at stage ${onboardingData.stage}`, 'background: #4CAF50; color: white');
        console.log(`%cCurrent onboarding data:`, 'color: #4CAF50', onboardingData);
        console.log(`%cUser message count:`, 'color: #4CAF50', messages.filter(m => m.isUser).length);
        
        // Handle onboarding responses
        progressOnboarding(userInputText);
        return;
      }
      
      // Handle normal conversations with API call
      (async () => {
        try {
          // Get response from API - this now returns { content, summary, next_stage }
          const apiResult = await sendMessageToApi(userInputText); 
          
          if (apiResult && apiResult.content) {
            // Filter out continuation prompts
            let cleanedContent = apiResult.content;
            
            // List of phrases to remove from the end of AI responses
            const continuationPhrases = [
              "Is there anything else you'd like to add, or can we continue?",
              "Is there anything else you'd like to add?",
              "Can we continue?",
              "Would you like to continue?",
              "Should we move on to the next step?",
              "Ready to continue?",
              "Anything else you'd like to share before we continue?"
            ];
            
            // Remove any of these phrases from the end of the response
            for (const phrase of continuationPhrases) {
              if (cleanedContent.endsWith(phrase)) {
                cleanedContent = cleanedContent.substring(0, cleanedContent.length - phrase.length).trim();
              }
            }
            
            // Create coach response message with cleaned content
            const coachResponse = {
              id: Date.now().toString(),
              content: cleanedContent,
              isUser: false,
              timestamp: new Date()
            };
            
            // Update messages with cleaned coach response
            setMessages(prev => [...prev, coachResponse]);
            
            // Use our enhanced addAIMessage function to clean and add the response
            addAIMessage(apiResult.content);
            
            // Update the right panel with the summary if available
            if (apiResult.summary) {
              console.log("Received summary in chat mode:", apiResult.summary);
              
              // Decide what field to update based on the context or most recent conversation
              const lastFewMessages = messages.slice(-3).map(msg => msg.content.toLowerCase());
              const messageText = userInputText.toLowerCase();
              
              // Create a helper function to check if a text contains specific keywords
              const containsKeywords = (text: string, keywords: string[]) => 
                keywords.some(keyword => text.includes(keyword));
                
              // Product keywords
              const productKeywords = ['product', 'service', 'selling', 'offer', 'solution', 'platform', 'app', 'software'];
              // Buyer keywords
              const buyerKeywords = ['buyer', 'decision', 'customer', 'audience', 'target', 'client', 'prospect', 'user', 'market'];
              // Pain point keywords
              const painKeywords = ['pain', 'problem', 'challenge', 'need', 'solve', 'issue', 'difficulty', 'struggle', 'frustration'];
              
              // Check message context - include both recent messages and current message
              const conversationTexts = [...lastFewMessages, messageText];
              
              // Set a flag to track if we've updated any field
              let fieldUpdated = false;
              
              setOnboardingData(prevData => {
                const newData = {...prevData};
                
                // Check for product keywords
                if (conversationTexts.some(text => containsKeywords(text, productKeywords))) {
                  newData.product = apiResult.summary;
                  fieldUpdated = true;
                  console.log("Updated product summary:", apiResult.summary);
                }
                // Check for buyer keywords
                else if (conversationTexts.some(text => containsKeywords(text, buyerKeywords))) {
                  newData.marketAndBuyer = apiResult.summary;
                  fieldUpdated = true;
                  console.log("Updated market and buyer summary:", apiResult.summary);
                }
                // Check for pain point keywords
                else if (conversationTexts.some(text => containsKeywords(text, painKeywords))) {
                  newData.salesContext = apiResult.summary;
                  fieldUpdated = true;
                  console.log("Updated sales context summary:", apiResult.summary);
                }
                // If no specific context is detected, update the most appropriate empty field
                else if (!fieldUpdated) {
                  if (!newData.product) {
                    newData.product = apiResult.summary;
                    console.log("Updated empty product field with summary:", apiResult.summary);
                  } else if (!newData.marketAndBuyer) {
                    newData.marketAndBuyer = apiResult.summary;
                    console.log("Updated empty market and buyer field with summary:", apiResult.summary);
                  } else if (!newData.salesContext) {
                    newData.salesContext = apiResult.summary;
                    console.log("Updated empty sales context field with summary:", apiResult.summary);
                  }
                }
                
                // Save to localStorage
                localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(newData));
                
                return newData;
              });
            }
            
            // Show action buttons if they're not already shown
            if (!showActionButtons) {
              setShowActionButtons(true);
            }
          } else {
            // Handle case where API result is unexpected (e.g., only fallback content)
            addAIMessage(apiResult?.content || "Sorry, something went wrong. Can you repeat that?");
          }
        } catch (error) {
          console.error('Error in handleSendMessage:', error);
          
          // Add error message
          const errorMessage = {
            id: Date.now().toString(),
            content: "Sorry, I'm having trouble responding right now. Please try again.",
            isUser: false,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, errorMessage]);
        }
      })();
    }
  };
  
  // Handle Enter key press in input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && userInput.trim() && !isLoading) {
      handleSendMessage();
    }
  };
  
  // Typewriter effect for the prompt - only run when in button state
  useEffect(() => {
    if (cardState !== 'button') return;
    
    // Wait 1 second before showing the prompt
    const timer = setTimeout(() => {
      setShowPrompt(true);
      let index = 0;
      const text = 'Click here to start Onboarding!';
      
      // Simulate typewriter effect
      const interval = setInterval(() => {
        if (index < text.length) {
          setPromptText(text.substring(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 50);
      
      return () => clearInterval(interval);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [cardState]);
  
  // Add a new debug function to print state to console
  const logState = (message: string, data: any) => {
    console.log(`%c${message}`, 'color: blue; font-weight: bold', data);
  };

  // Progress onboarding: Store user response, call API, update stage based on API response
  const progressOnboarding = (userResponse: string) => {
    const currentStage = onboardingData.stage; // Capture stage *before* API call
    logState('Starting progressOnboarding with stage:', currentStage);

    // Hide continue button if user sends a new message
    if (showContinueButton) {
      setShowContinueButton(false);
      setPendingSummary(null);
    }

    // Call API to get AI response and next stage instruction
    (async () => {
      setIsLoading(true);
      try {
        // Store initial response for each stage
        setPendingSummary({
          stage: currentStage,
          summary: userResponse.trim()
        });
        
        // Always make an API call to get a natural response
        const apiResult = await sendMessageToApi(userResponse.trim());
        
        if (apiResult) {
          // Show the API's response - this leverages the AI guidance framework
          addAIMessage(apiResult.content);
          
          // Example-based approach to determine if we have enough information
          const hasEnoughInformation = (response: string, stage: OnboardingStage): boolean => {
            // If not in onboarding stage or in complete stage, always return true
            if (stage === 'complete') return true;
            
            // Get examples for current stage
            const examples = INFORMATION_EXAMPLES[stage];
            if (!examples) return false;
            
            // Normalize response by removing extra spaces and converting to lowercase
            const normalizedResponse = response.trim().toLowerCase();
            
            // Simple check: a response length more similar to sufficient examples than insufficient ones
            const avgSufficientLength = examples.sufficient.reduce(
              (sum, example) => sum + example.length, 0
            ) / examples.sufficient.length;
            
            const avgInsufficientLength = examples.insufficient.reduce(
              (sum, example) => sum + example.length, 0
            ) / examples.insufficient.length;
            
            // If response length is closer to sufficient examples than insufficient ones
            // AND response is at least 50% of the average sufficient example length
            const lengthCheckPassed = 
              (Math.abs(normalizedResponse.length - avgSufficientLength) < 
               Math.abs(normalizedResponse.length - avgInsufficientLength)) &&
              (normalizedResponse.length >= avgSufficientLength * 0.5);
              
            // Check for specificity - look for numbers, specific details
            const hasSpecificDetails = 
              /\d+/.test(normalizedResponse) || // Contains numbers
              /specific|unique|different|special|better|best|improve|feature|benefit/i.test(normalizedResponse);
              
            // If the AI explicitly mentions continuing, let's allow it
            const aiSuggestsContinue = 
              apiResult.content.toLowerCase().includes("click continue") || 
              apiResult.content.toLowerCase().includes("press continue") ||
              apiResult.content.toLowerCase().includes("you can continue") ||
              apiResult.content.toLowerCase().includes("ready to continue");
            
            // Return true if length check passes AND has specific details, OR if AI suggests continuing
            return (lengthCheckPassed && hasSpecificDetails) || aiSuggestsContinue;
          };
          
          // Only show Continue button when response has enough information
          if (hasEnoughInformation(userResponse, currentStage)) {
            setTimeout(() => {
              setShowContinueButton(true);
            }, 300);
          }
        } else {
          // Fallback for API failure
          addAIMessage("I couldn't process that response. Could you try again with more details about your " + 
                      (currentStage === 'product' ? "product or service" : 
                       currentStage === 'market_and_buyer' ? "target customers" : "sales context") + "?");
        }
      } catch (error) {
        // Simple error handling
        addAIMessage("Sorry, I encountered an error. Please try again with more details.");
      } finally {
        setIsLoading(false);
      }
    })();
  };

  // Initialize onboarding with a natural first message
  const fetchInitialMessages = async () => {
    setIsInitializing(true);
    
    try {
      // Always check localStorage first to avoid duplication
      const savedMessages = localStorage.getItem(STORAGE_KEYS.messages);
      const parsedMessages = savedMessages ? JSON.parse(savedMessages) : [];
      
      if (parsedMessages.length > 0) {
        console.log("%cFound existing messages in localStorage, using those instead", "background: green; color: white");
        const processedMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(processedMessages);
        setIsInitializing(false);
        return;
      }
      
      // Force fresh start only if no messages exist
      console.log("%cForcing fresh start with product stage", "background: blue; color: white");
      
      // Always reset onboarding data to product stage on initial load
      const defaultData: OnboardingData = {
        product: '',
        marketAndBuyer: '',
        salesContext: '',
        stage: 'product'
      };
      
      // Update state and localStorage
      setOnboardingData(defaultData);
      localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(defaultData));
      
      // Reset hasCompletedRoleplay if it's the initial load
      setHasCompletedRoleplay(false);
      localStorage.setItem(STORAGE_KEYS.hasCompletedRoleplay, 'false');
      
      // Hide Continue button on first load
      setShowContinueButton(false);
      setPendingSummary(null);
      
      // Replace with direct message creation:
      setMessages([{
        id: Date.now().toString(),
        content: "Hi! I'm your AI sales coach. To get started, please tell me about the product or service you're selling. Include what makes it unique compared to alternatives.",
        isUser: false,
        timestamp: new Date()
      }]);
      setIsInitializing(false);
      return;
      
      // For users who have completed roleplays before - continue with normal flow
      // (This is unreachable code now, but kept for reference)
    } catch (error) {
      console.error("Error fetching initial messages:", error);
      
      // Fallback for onboarding
      if (!hasCompletedRoleplay) {
        const initialWelcome = "Welcome to PitchIQ! What product or service are you selling?";
        addAIMessage(initialWelcome);
        setIsInitializing(false);
        return;
      }
      
      // Fallback for returning users
      const fallbackMessages = [
        {
          id: '1',
          content: "Cason, I reviewed your last call. Your rapport-building was solid - particularly how you established common ground early and used active listening techniques. That created a good foundation for the conversation.",
          isUser: false,
          timestamp: new Date()
        },
        {
          id: '2',
          content: "I noticed you missed a couple of opportunities to explore pain points when the prospect mentioned their challenges. Would you like to work on identifying and diving deeper into these moments? It's a skill that can significantly improve your conversion rates.",
          isUser: false,
          timestamp: new Date(Date.now() + 1000) // 1 second later
        }
      ];
      
      setMessages(fallbackMessages);
      
      // Show action buttons after a short delay
      setTimeout(() => {
        setShowActionButtons(true);
      }, 500);
    } finally {
      setIsInitializing(false);
    }
  };

  // Enhanced version of fetchCoachMessage that includes retry logic
  const fetchCoachMessage = async (
    prompt: string, 
    conversationHistory: Array<{role: string, content: string}> = [],
    retryCount = 0,
    maxRetries = 3
  ): Promise<string> => {
    try {
      // Prepare the request data with history
      const requestData = {
        message: prompt,
        context: {
          role: "coach",
          messages: conversationHistory
        }
      };
      
      // Make API call - Use the correct /api prefixed path
      const response = await fetch('/api/dashboard/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.content || "";
      }
      
      // If we get a server error (5xx) and haven't exceeded retries, try again
      if (response.status >= 500 && retryCount < maxRetries) {
        console.log(`API server error (${response.status}). Retrying (${retryCount + 1}/${maxRetries})...`);
        
        // Wait with exponential backoff before retrying
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Recursive retry with incremented retry count
        return fetchCoachMessage(prompt, conversationHistory, retryCount + 1, maxRetries);
      }
      
      // Handle specific error codes
      if (response.status === 401) {
        console.error("Authentication error. User may need to log in again.");
        throw new Error("Authentication error. Please log in again.");
      }
      
      throw new Error(`API error: ${response.status}`);
    } catch (error) {
      console.error("Error fetching coach message:", error);
      
      // If it's a network error and we haven't exceeded retries, try again
      if (error instanceof TypeError && error.message.includes('network') && retryCount < maxRetries) {
        console.log(`Network error. Retrying (${retryCount + 1}/${maxRetries})...`);
        
        // Wait with exponential backoff before retrying
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Recursive retry with incremented retry count
        return fetchCoachMessage(prompt, conversationHistory, retryCount + 1, maxRetries);
      }
      
      if (retryCount >= maxRetries) {
        console.error("Maximum retry attempts reached.");
      }
      
      return ""; // Return empty string to trigger fallback
    }
  };

  // Update sendMessageToApi to clean responses if needed and add retry logic
  const sendMessageToApi = async (
    message: string, 
    retryCount = 0,
    maxRetries = 3
  ): Promise<{content: string, summary: string | null, next_stage: string} | null> => {
    try {
      setIsLoading(true);
      
      // Get the appropriate guidance for the current stage
      let stageGuidance = {};
      if (!hasCompletedRoleplay) {
        switch (onboardingData.stage) {
          case 'product':
            stageGuidance = AI_GUIDANCE.product_stage;
            break;
          case 'market_and_buyer':
            stageGuidance = AI_GUIDANCE.market_stage;
            break;
          case 'sales_context':
            stageGuidance = AI_GUIDANCE.sales_context_stage;
            break;
          default:
            stageGuidance = {};
            break;
        }
      }
      
      // Prepare context with the guidance framework
      const requestData = {
        message,
        context: {
          role: "coach",
          messages: messages.map(msg => ({
            role: msg.isUser ? "user" : "assistant",
            content: msg.content
          })),
          additional_context: {
            overall_goal: AI_GUIDANCE.overall_goal,
            current_stage: onboardingData.stage,
            stage_guidance: stageGuidance,
            product_info: onboardingData.product,
            market_info: onboardingData.marketAndBuyer,
            sales_context_info: onboardingData.salesContext
          }
        }
      };
      
      try {
        console.log("%cCalling AI coach API...", "color: green; font-weight: bold");
        console.log("Current stage:", onboardingData.stage);
        console.log("Context prompt:", stageGuidance);
        
        const response = await fetch('/api/dashboard/coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(requestData)
        });
        
        // Log the full response for debugging
        console.log(`API response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log("%cAPI call successful!", "color: green; font-weight: bold");
          const data = await response.json();
          console.log('%cRaw API response data:', 'color: purple; font-weight: bold', data);
          
          // Clean the content if it contains debug information
          let cleanContent = data.content;
          if (cleanContent) {
            // Remove any SUMMARY: and NEXT_STAGE: debug lines
            cleanContent = cleanContent.replace(/\n*SUMMARY:.*$/m, '');
            cleanContent = cleanContent.replace(/\n*NEXT_STAGE:.*$/m, '');
            // Trim any trailing newlines left after removing debug info
            cleanContent = cleanContent.trim();
          }
          
          // Rest of processing logic...
          // ... (Existing code for handling the response)
          
          // Return object with summary field and clean content
          const result = { 
              content: cleanContent || "I didn't quite catch that.", 
              summary: data.summary || null,
              next_stage: data.next_stage || 'current' 
          };
          return result;
        }
        
        // If we get a server error (5xx) and haven't exceeded retries, try again
        if (response.status >= 500 && retryCount < maxRetries) {
          console.log(`API server error (${response.status}). Retrying (${retryCount + 1}/${maxRetries})...`);
          
          // Wait with exponential backoff before retrying
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          
          // Recursive retry with incremented retry count
          return sendMessageToApi(message, retryCount + 1, maxRetries);
        }
        
        // Handle specific error codes
        if (response.status === 405) {
          console.error("API Error 405: Method Not Allowed. The server doesn't accept POST requests at this endpoint.");
          // Display a more helpful message to the user
          return { 
            content: "I'm currently having technical issues connecting to my coaching system. I'm displaying a pre-programmed response until this is fixed. Please contact support if this continues.", 
            summary: null,
            next_stage: 'current' 
          };
        }
        
        if (response.status === 401) {
          console.error("Authentication error. User may need to log in again.");
          return {
            content: "It looks like your session has expired. Please refresh the page and log in again to continue.",
            summary: null,
            next_stage: 'current'
          };
        }
        
        // Handle errors - return fallback content with 'current' stage
        const fallbackContent = generateFallbackResponse(message);
        console.error(`API error: ${response.status} ${response.statusText}`);
        return { content: fallbackContent, summary: null, next_stage: 'current' };
      } catch (error) {
        // Network error or other fetch failure
        console.error('Network error when sending message to API:', error);
        
        // If it's a network error and we haven't exceeded retries, try again
        if (error instanceof TypeError && error.message.includes('network') && retryCount < maxRetries) {
          console.log(`Network error. Retrying (${retryCount + 1}/${maxRetries})...`);
          
          // Wait with exponential backoff before retrying
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          
          // Recursive retry with incremented retry count
          return sendMessageToApi(message, retryCount + 1, maxRetries);
        }
        
        if (retryCount >= maxRetries) {
          console.error("Maximum retry attempts reached.");
        }
        
        // Let the user know there's a connection issue
        const connectionError = "I'm having trouble connecting to my coaching system. This might be due to network issues or server maintenance. I'll continue with some pre-programmed responses until the connection is restored.";
        
        // Only show the connection error the first time
        if (!window.connectionErrorShown) {
          window.connectionErrorShown = true;
          return { content: connectionError, summary: null, next_stage: 'current' };
        }
        
        return { content: generateFallbackResponse(message), summary: null, next_stage: 'current' };
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add back the scroll effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add back the message fetch on chat activation
  useEffect(() => {
    if (cardState === 'chat' && messages.length === 0 && !isInitializing) {
      // Check if there's saved messages in localStorage first
      const savedMessages = localStorage.getItem(STORAGE_KEYS.messages);
      const parsedMessages = savedMessages ? JSON.parse(savedMessages) : [];
      
      if (parsedMessages.length > 0) {
        // If we have saved messages, just load them
        console.log("Using existing messages from localStorage instead of fetching initial messages");
        const processedMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(processedMessages);
      } else {
        // Only fetch initial messages if there are no saved messages
        console.log("No existing messages in localStorage, fetching initial messages");
        fetchInitialMessages();
      }
    }
  }, [cardState, messages.length, isInitializing]);

  // Generate fallback responses if API fails
  const generateFallbackResponse = (userMessage: string): string => {
    // Log that we're using fallback responses
    console.log("Using fallback response since API call failed");
    
    // Fallback responses with the coach personality
    const lowerMsg = userMessage.toLowerCase();
    
    // Check for greetings first
    if (lowerMsg.match(/^(hi|hello|hey|greetings|howdy)/i)) {
      return "Hello Cason. How can I help with your sales development today? I can provide guidance on:\n\n* Identifying pain points\n* Handling objections\n* Improving your closing technique";
    }
    // Check for yes/affirmative responses
    else if (lowerMsg.match(/\b(yes|yeah|sure|ok|okay|yep|absolutely|definitely)\b/i)) {
      return "Good. Let's work on pain point identification. \n\nWhen prospects mention challenges, you need to **explore them further**. \n\n* Ask 'How long has this been an issue?'\n* Follow with 'What impact has this had on your business?'\n* Then 'What have you tried to solve this so far?'\n\nThese questions help quantify the problem and establish urgency.";
    } 
    // Check for negative responses
    else if (lowerMsg.match(/\b(no|nope|not|nah)\b/i)) {
      return "That's fine. Your rapport-building skills are already solid. \n\nWhat other area would you like to develop? \n\n* Discovery questions\n* Objection handling\n* Closing techniques\n\nChoose an area and we can focus our practice there.";
    } 
    // Check for questions
    else if (lowerMsg.includes('?') || lowerMsg.match(/\b(how|what|why|when|where|who|which)\b/i)) {
      return "Good question. \n\nWhen identifying pain points, listen for phrases like: \n\n* 'We've been struggling with...'\n* 'It's frustrating when...'\n\nThen follow up with: \n\n1. 'Tell me more about that challenge'\n2. 'How long has this been an issue?'\n\nFinally, quantify it: \n* 'What's the financial impact?'\n* 'How is this affecting your team's productivity?'\n\nThis information reveals the true motivation to buy.";
    } 
    // Default response for anything else
    else {
      return "I understand. \n\nLet me share a key principle: **Pain points** are business challenges your product can solve. \n\nIn your next call, listen for phrases like: \n\n* 'It's a challenge when...'\n* 'We're having trouble with...'\n\nThen ask targeted questions: \n\n1. 'How often does this happen?'\n2. 'What's the impact on your business?'\n\nThese answers help you tailor your solution to their specific needs. Would you like to practice this approach?";
    }
  };

  // Reset all states to initial values
  const resetAllStates = () => {
    setMessages([]);
    setUserInput(""); 
    setShowActionButtons(false);
  };

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      console.log("%cComponent mounted - initializing state", "color: purple; font-weight: bold");
      
      // During initial development, clear localStorage to start fresh
      // Uncomment the following line to clear localStorage on every load
      // clearLocalStorage();
      
      loadStateFromStorage();
      
      // Ensure we start in button state if no saved state exists
      if (cardState !== 'button' && cardState !== 'chat') {
        setCardState('button');
        console.log("%cForcing card state to button", "color: red; font-weight: bold");
      }
      
      console.log("%cInitial card state:", "color: blue; font-weight: bold", cardState);
    } catch (error) {
      console.error("Error in initialization:", error);
      // Fallback to button state on error
      setCardState('button');
    }
  }, []);
  
  // Save state to localStorage when it changes
  useEffect(() => {
    saveStateToStorage();
  }, [cardState, messages, showActionButtons]);

  // Save state to localStorage
  const saveStateToStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.cardState, cardState);
      localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
      localStorage.setItem(STORAGE_KEYS.showActionButtons, showActionButtons.toString());
    }
  };
  
  // Load state from localStorage
  const loadStateFromStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        console.log("Loading state from localStorage...");
        
        // Load saved onboarding data first if it exists
        const savedOnboardingData = localStorage.getItem(STORAGE_KEYS.onboardingData);
        if (savedOnboardingData) {
          try {
            const parsedData = JSON.parse(savedOnboardingData);
            console.log("Found onboarding data in localStorage:", parsedData);
            
            // Validate and convert onboarding data
            if (!parsedData.stage || (!['product', 'market_and_buyer', 'sales_context', 'complete'].includes(parsedData.stage) && 
                !['buyer', 'pain_point'].includes(parsedData.stage))) {
              // Reset to product stage if invalid
              console.log("Invalid onboarding stage found, resetting to product stage");
              const defaultData: OnboardingData = {
                product: '',
                marketAndBuyer: '',
                salesContext: '',
                stage: 'product'
              };
              setOnboardingData(defaultData);
              localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(defaultData));
            } else {
              // Convert old stage names to new ones if needed
              let newData = {...parsedData};
              
              // Handle legacy stage names
              if (parsedData.stage === 'buyer') {
                console.log("Converting 'buyer' stage to 'market_and_buyer'");
                newData.stage = 'market_and_buyer';
                newData.marketAndBuyer = parsedData.buyer || '';
              } else if (parsedData.stage === 'pain_point') {
                console.log("Converting 'pain_point' stage to 'sales_context'");
                newData.stage = 'sales_context';
                newData.salesContext = parsedData.painPoint || '';
              }
              
              // Ensure all fields exist
              newData = {
                product: newData.product || '',
                marketAndBuyer: newData.marketAndBuyer || '',
                salesContext: newData.salesContext || '',
                stage: newData.stage as OnboardingStage
              };
              
              setOnboardingData(newData);
              localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(newData));
            }
          } catch (e) {
            console.error("Error parsing onboarding data from localStorage:", e);
            // Reset to default on error
            const defaultData: OnboardingData = {
              product: '',
              marketAndBuyer: '',
              salesContext: '',
              stage: 'product'
            };
            setOnboardingData(defaultData);
            localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(defaultData));
          }
        } else {
          // Initialize default onboarding data if none exists
          const defaultData: OnboardingData = {
            product: '',
            marketAndBuyer: '',
            salesContext: '',
            stage: 'product'
          };
          setOnboardingData(defaultData);
          localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(defaultData));
        }
        
        // Only load if we have saved card state
        if (localStorage.getItem(STORAGE_KEYS.cardState)) {
          const savedCardState = localStorage.getItem(STORAGE_KEYS.cardState) as CardState || 'button';
          const savedMessages = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '[]');
          const savedShowActionButtons = localStorage.getItem(STORAGE_KEYS.showActionButtons) === 'true';
          const savedCompletedRoleplay = localStorage.getItem(STORAGE_KEYS.hasCompletedRoleplay) === 'true';
          
          setCardState(savedCardState);
          setHasCompletedRoleplay(savedCompletedRoleplay);
          
          // Convert timestamps back to Date objects
          const processedMessages = savedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          setMessages(processedMessages);
          setShowActionButtons(savedShowActionButtons);
          
          console.log("Loaded state:", {
            cardState: savedCardState,
            hasCompletedRoleplay: savedCompletedRoleplay,
            messages: processedMessages.length,
            showActionButtons: savedShowActionButtons
          });
        }
      } catch (error) {
        console.error("Error loading state from localStorage:", error);
      }
    }
  };
  
  // Clear all localStorage items for the coach
  const clearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      // First log what we're going to clear
      console.log("%cClearing localStorage items:", "color: red; font-weight: bold", Object.values(STORAGE_KEYS));
      
      // Clear each storage item individually
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
        console.log(`Cleared: ${key}`);
      });
      
      // Additional cleanup for any related localStorage items
      localStorage.removeItem('pitchiq_greeting_complete');
      localStorage.removeItem('pitchiq_user_preferred_name');
      
      // Reset all state variables to their defaults
      setCardState('button');
      setMessages([]);
      setUserInput("");
      setShowActionButtons(false);
      setHasCompletedRoleplay(false);
      setOnboardingData({
        product: '',
        marketAndBuyer: '',
        salesContext: '',
        stage: 'product'
      });
      
      // Force clear window.connectionErrorShown if it exists
      if (window.connectionErrorShown) {
        window.connectionErrorShown = false;
      }
      
      console.log("%cAll localStorage items for the coach cleared and state reset", "color: green; font-weight: bold");
    }
  };
  
  // Add a completely fresh reset function
  const handleCompleteReset = () => {
    // Log the reset attempt
    console.log("%cATTEMPTING COMPLETE RESET", "background: red; color: white; font-size: 16px");
    
    // Force clear ALL localStorage for a clean start
    Object.keys(localStorage).forEach(key => {
      console.log(`Clearing localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Explicitly reset onboarding stage
    setOnboardingData({
      product: '',
      marketAndBuyer: '',
      salesContext: '',
      stage: 'product'
    });
    
    // Force reset messages
    setMessages([]);
    
    // Reset hasCompletedRoleplay explicitly
    setHasCompletedRoleplay(false);
    
    // Reset the card state
    setCardState('button');
    
    // Add a short delay before reload to ensure everything is cleared
    setTimeout(() => {
      console.log("%cReloading page to ensure clean state", "color: blue; font-weight: bold");
      window.location.reload();
    }, 100);
  };

  // Format time for messages
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Add sales technique feedback data
  const SALES_TECHNIQUES = [
    {
      technique: "SPIN Selling",
      tip: "Use situation, problem, implication, and need-payoff questions to uncover needs.",
      example: "What challenges are you currently facing with your sales training process? (Problem)"
    },
    {
      technique: "Feature-Benefit Selling",
      tip: "Always follow features with benefits that matter to this specific customer.",
      example: "Our AI system provides personalized feedback (feature) which means your team will improve faster without hiring more coaches (benefit)."
    },
    {
      technique: "Pain Point Focus",
      tip: "Emphasize the pain points the customer mentioned to validate their concerns.",
      example: "You mentioned that your sales team struggles with consistency in their approaches. This is exactly what our system helps solve."
    },
    {
      technique: "Social Proof",
      tip: "Share relevant success stories from similar customers.",
      example: "Another sales team in your industry increased their close rate by 22% within 3 months of using our system."
    },
    {
      technique: "Objection Handling",
      tip: "Acknowledge, clarify, respond, and confirm when handling objections.",
      example: "I understand your concern about implementation time. Most customers are up and running in under a week."
    },
    {
      technique: "Active Listening",
      tip: "Paraphrase what the customer says to confirm understanding.",
      example: "So if I understand correctly, your main priority is getting consistent results across your team?"
    },
    {
      technique: "Open-ended Questions",
      tip: "Ask questions that require more than yes/no answers to gather more information.",
      example: "How would improving your team's sales skills impact your overall business goals?"
    }
  ];
  
  // Function to randomly select a sales technique tip based on context
  const getRandomSalesTip = (userMessage: string): {technique: string, tip: string, example: string} => {
    // For now, just select random tips, but in the future this could analyze the message content
    // and select a relevant tip based on detected opportunities
    const randomIndex = Math.floor(Math.random() * SALES_TECHNIQUES.length);
    return SALES_TECHNIQUES[randomIndex];
  };
  
  // Add a function to conditionally show sales tips during roleplay
  const checkForFeedbackOpportunity = (message: string) => {
    // Only show tips after roleplay has begun
    if (!hasCompletedRoleplay || !generatedScenario) return;
    
    // Only show tips occasionally (30% chance after user messages)
    if (Math.random() < 0.3) {
      const tip = getRandomSalesTip(message);
      setCurrentFeedback(tip);
      setShowFeedbackTip(true);
      
      // Hide tip after 8 seconds
      setTimeout(() => {
        setShowFeedbackTip(false);
      }, 8000);
    }
  };

  // Additional styles for markdown rendering (since we're not using component overrides)
  useEffect(() => {
    // Add CSS for Markdown styling and typing effects
    const style = document.createElement('style');
    style.innerHTML = `
      .markdown-content ul { 
        list-style-type: disc;
        padding-left: 1.5rem;
        margin-bottom: 1rem;
      }
      .markdown-content ol { 
        list-style-type: decimal;
        padding-left: 1.5rem;
        margin-bottom: 1rem;
      }
      .markdown-content li {
        margin-bottom: 0.5rem;
        line-height: 1.5;
      }
      .markdown-content p {
        margin-bottom: 1rem;
        line-height: 1.6;
      }
      .markdown-content p:last-child {
        margin-bottom: 0;
      }
      .markdown-content strong {
        font-weight: 600;
        color: #1a1a1a;
      }
      .markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4 {
        font-weight: 600;
        margin-top: 1.5rem;
        margin-bottom: 1rem;
      }
      .markdown-content h1 {
        font-size: 1.5rem;
      }
      .markdown-content h2 {
        font-size: 1.25rem;
      }
      .markdown-content h3 {
        font-size: 1.125rem;
      }
      .markdown-content h4 {
        font-size: 1rem;
      }
      .markdown-content a {
        color: #2563eb;
        text-decoration: underline;
      }
      .markdown-content pre {
        background-color: #f5f5f5;
        padding: 1rem;
        border-radius: 0.375rem;
        overflow-x: auto;
        margin-bottom: 1rem;
      }
      .markdown-content code {
        font-family: monospace;
        background-color: #f5f5f5;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-size: 0.875em;
      }
      .markdown-content blockquote {
        border-left: 4px solid #e5e7eb;
        padding-left: 1rem;
        font-style: italic;
        margin-bottom: 1rem;
      }
      
      /* Add blinking cursor animation */
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      
      .animate-blink {
        animation: blink 1s steps(1) infinite;
      }
      
      /* Improve typing effect */
      .typing-text {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.6;
      }
      
      .typing-cursor {
        display: inline-block;
        width: 2px;
        height: 1.2em;
        background-color: currentColor;
        margin-left: 1px;
        vertical-align: text-bottom;
        animation: blink 0.8s steps(2) infinite;
      }
      
      .fade-in {
        transition: opacity 0.5s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Render action buttons based on context
  const renderActionButtons = () => {
    // For onboarding completion, show Start Roleplay button
    if (!hasCompletedRoleplay && onboardingData.stage === 'complete') {
  return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="flex justify-center gap-3 mt-4"
        >
          <Button 
            variant="default"
            className="flex items-center gap-2 px-4 py-2"
            onClick={handleStartFirstRoleplay}
          >
            <PlaySquare className="h-4 w-4" />
            Begin First Roleplay
          </Button>
        </motion.div>
      );
    }
    
    // For experienced users who have completed roleplays
    if (hasCompletedRoleplay && showActionButtons && messages.filter(m => m.isUser).length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="flex flex-col sm:flex-row justify-center gap-3 mt-4"
        >
          <Button 
            variant="default"
            className="flex items-center gap-2 px-4"
            onClick={handlePracticeClick}
          >
            <BarChart2 className="h-4 w-4" />
            Practice Exercise
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center gap-2 px-4"
            onClick={handleNewRoleplayClick}
          >
            <PlayCircle className="h-4 w-4" />
            New Roleplay
          </Button>
        </motion.div>
      );
    }
    
    // For experienced users who have sent messages
    if (hasCompletedRoleplay && showActionButtons && messages.filter(m => m.isUser).length > 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="flex flex-wrap justify-center gap-3 mt-4"
        >
          <Button 
            variant="default"
            size="sm"
            className="flex items-center gap-2"
            onClick={handlePracticeClick}
          >
            <BarChart2 className="h-4 w-4" />
            Practice Exercise
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleNewRoleplayClick}
          >
            <PlayCircle className="h-4 w-4" />
            New Roleplay
          </Button>
        </motion.div>
      );
    }
    
    return null;
  };

  // Add transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  
  // Handle start first roleplay button
  const handleStartFirstRoleplay = () => {
    console.log("Onboarding complete - transitioning to dashboard");
    
    // Mark onboarding as complete
    localStorage.setItem(STORAGE_KEYS.hasCompletedRoleplay, 'true');
    setHasCompletedRoleplay(true);
    
    // Add a message informing the user they're being redirected
    addAIMessage("Perfect! Your onboarding is now complete. I'm preparing your personalized dashboard.");
    
    // Start transition sequence
    setTimeout(() => {
      setIsTransitioning(true);
      setTransitionMessage("Setting up your dashboard...");
      
      // Simulate dashboard preparation
      setTimeout(() => {
        setTransitionMessage("Personalizing your experience...");
        
        // Final transition to dashboard
        setTimeout(() => {
          console.log("REDIRECT: Navigating to dashboard page");
          // In a real app, we would use router navigation here:
          // router.push('/dashboard');
          
          // For demo, create and show the dashboard
          localStorage.setItem('show_dashboard', 'true');
          window.location.href = '/dashboard'; // This would be the actual redirect
        }, 1200);
      }, 1500);
    }, 1500);
  };

  // Handle skipping directly to roleplay
  const handleSkipToRoleplay = () => {
    console.log("%cSkipping directly to dashboard", "background: purple; color: white");
    
    // Confirm with the user
    if (!confirm("Skip the onboarding process and go directly to the dashboard? Default profile information will be used.")) {
      return;
    }
    
    // Set default values for all onboarding data
    setOnboardingData({
      product: "AI-powered sales training service with realistic personas and personalized feedback",
      marketAndBuyer: "Sales professionals looking to improve their skills",
      salesContext: "Typical 30-day sales cycle with objections around price and implementation",
      stage: 'complete'
    });
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify({
      product: "AI-powered sales training service with realistic personas and personalized feedback",
      marketAndBuyer: "Sales professionals looking to improve their skills",
      salesContext: "Typical 30-day sales cycle with objections around price and implementation",
      stage: 'complete'
    }));
    
    // Clear existing messages
    setMessages([]);
    
    // Add a welcome message
    addAIMessage("You've skipped the onboarding process. I'm redirecting you to the dashboard where you can start practicing with roleplay scenarios.");
    
    // Simulate a redirect to dashboard
    setTimeout(() => {
      console.log("REDIRECT: Would navigate to dashboard page");
      addAIMessage("This is where a redirect to the dashboard would happen in the production application.");
    }, 1500);
  };

  // Add a reset function to clear onboarding state and start over
  const handleResetOnboarding = () => {
    // Clear all localStorage items related to the coach
    clearLocalStorage();
    
    // Reset all state variables
    setCardState('button');
    setMessages([]);
    setUserInput("");
    setShowActionButtons(false);
    setHasCompletedRoleplay(false);
    setOnboardingData({
      product: '',
      marketAndBuyer: '',
      salesContext: '',
      stage: 'product'
    });
    
    // Add confirmation message
    console.log("Onboarding state reset. You can click the AI Coach button to start fresh.");
    
    // Force page refresh to ensure clean state
    window.location.reload();
  };

  // Handle minimize button click
  const handleMinimize = () => {
    setIsFullscreen(false);
  };

  // Add a force-update function for testing
  const forceUpdateSummary = () => {
    // Force update the right panel with empty values for testing
    setOnboardingData(prevData => {
      const newData = {
        ...prevData,
        product: '',
        marketAndBuyer: '',
        salesContext: '',
        stage: 'product' as OnboardingStage
      };
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(newData));
      console.log("FORCE RESET onboardingData:", newData);
      
      return newData;
    });
  };

  // Handle continue button click
  const handleContinue = () => {
    console.log("%cContinue button clicked", "background: green; color: white; font-size: 16px");
    console.log("Pending summary:", pendingSummary);
    
    // If we have a pending summary, update the appropriate field
    if (pendingSummary) {
      const { stage, summary } = pendingSummary;
      
      // Show recording animation
      setIsRecordingSummary(true);
      
      // Start progress animation
      setProgressPercentage("100%");
      
      // Record current stage in history for undo functionality
      setPreviousStages(prev => [...prev, {
        stage: stage,
        data: summary
      }]);
      
      // Show undo button
      setIsUndoVisible(true);
      
      // Update onboarding data with the summary
      setOnboardingData(prevData => {
        const newData = { ...prevData };
        
        // Update the appropriate field
        switch (stage) {
          case 'product':
            newData.product = summary;
            newData.stage = 'market_and_buyer';
            break;
          case 'market_and_buyer':
            newData.marketAndBuyer = summary;
            newData.stage = 'sales_context';
            break;
          case 'sales_context':
            newData.salesContext = summary;
            newData.stage = 'complete';
            break;
          default:
            break;
        }
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(newData));
        console.log(`%cUpdated onboardingData for stage ${stage}:`, "background: blue; color: white", newData);
        
        return newData;
      });
      
      // Clear pending summary and hide button immediately
      setPendingSummary(null);
      setShowContinueButton(false);
      
      // If we're moving to the complete stage, show action buttons
      if (stage === 'sales_context') {
        setShowActionButtons(true);
      }
      
      // Add transition message based on next stage
      let nextMessage = "";
      switch (stage) {
        case 'product':
          nextMessage = "Who are you selling to? Please tell me about your target customers - who they are, their roles, and what they're looking to accomplish.";
          break;
        case 'market_and_buyer':
          nextMessage = "What's your typical sales cycle like? What common objections do you face from prospects?";
          break;
        case 'sales_context':
          nextMessage = "Great! Now we have enough information. I'll prepare your personalized dashboard.";
          break;
      }
      
      // Send next message after a short delay
      setTimeout(() => {
        if (nextMessage) {
          // Use direct message creation for immediate state update
          const newMessage = {
            id: Date.now().toString(),
            content: nextMessage,
            isUser: false,
            timestamp: new Date()
          };
          
          // Update messages
          setMessages(prevMessages => [...prevMessages, newMessage]);
          
          // Force scroll to bottom
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 100);
        }
      }, 50);
    }
  };

  // Add a preprocessing function to clean up pasted conversations
  const preprocessUserInput = (input: string): string => {
    console.log("%cPreprocessing user input:", "color: teal; font-weight: bold");
    
    // Check if input looks like a copied conversation (contains timestamps or multiple lines)
    if (input.includes(" p.m.") || input.includes(" a.m.") || input.match(/\d{1,2}:\d{2}/)) {
      console.log("%cDetected possible conversation transcript", "color: orange; font-weight: bold");
      
      // Try to extract just the last user message from the conversation
      const lines = input.split(/\n|(?<=\d{1,2}:\d{2})/);
      
      // Filter out timestamp lines and assistant messages
      const userLines = lines.filter(line => {
        // Remove lines containing timestamps
        if (line.match(/\d{1,2}:\d{2}/) || line.includes(" p.m.") || line.includes(" a.m.")) {
          return false;
        }
        
        // Skip lines that look like AI responses
        const aiStartPhrases = [
          "Thanks for", "Got it", "Great", "I understand", 
          "Could you", "Now, let's", "Let me", "Would you"
        ];
        
        if (aiStartPhrases.some(phrase => line.trim().startsWith(phrase))) {
          return false;
        }
        
        return line.trim().length > 0;
      });
      
      // Take the last meaningful user line, or the original if we couldn't parse it
      const cleanedInput = userLines.length > 0 ? 
        userLines[userLines.length - 1].trim() : 
        input.trim();
      
      console.log("%cExtracted user message:", "color: green; font-weight: bold", cleanedInput);
      return cleanedInput;
    }
    
    // If it doesn't look like a conversation, return as is
    return input;
  };

  // Button mode rendering
  if (cardState === 'button') {
    return (
      <>
        <div className="flex flex-col justify-center items-center w-full h-full relative" style={{ minHeight: 'calc(100vh - 180px)' }}>
          {/* Typewriter prompt positioned above the button */}
          <AnimatePresence>
            {showPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute mb-10"
                style={{ top: 'calc(50% - 120px)' }}
              >
                <div className="font-mono text-xl font-medium text-primary mb-4">
                  {promptText}
          </div>
                
                {/* Animated arrow pointing down */}
                <motion.div 
                  animate={{ 
                    y: [0, 10, 0], 
                    transition: { 
                      repeat: Infinity, 
                      duration: 1.5, 
                      ease: "easeInOut" 
                    } 
                  }}
                  className="flex justify-center"
                >
                  <ChevronDown className="h-8 w-8 text-primary" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Button positioned in the center */}
          <motion.div
            className="ai-summary-card bg-card text-card-foreground rounded-2xl border shadow-lg mx-auto relative z-10"
            onClick={handleCardClick}
            variants={cardVariants}
            initial="button"
            animate="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ 
              padding: '20px 28px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <span className="block font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-pink-600">AI Coach</span>
                <span className="text-xs text-muted-foreground">Click to start coaching</span>
              </div>
            </div>
          </motion.div>
      </div>

        {/* Small test button in corner to reset localStorage */}
        <div className="fixed bottom-16 right-6 z-50">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering card click
              handleCompleteReset();
            }}
            className="text-sm bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-md flex items-center space-x-1 shadow-sm"
            title="Reset AI Coach state (for testing)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            <span>Reset Coach</span>
          </button>
        </div>
      </>
    );
  }
  
  // Options mode (Voice or Chat)
  if (cardState === 'options') {
    return (
      <div className="flex justify-center items-center w-full h-full" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {/* Fixed width container with no width animations */}
        <div className="w-full max-w-[800px] mx-auto">
          <motion.div
            className="ai-summary-card bg-card text-card-foreground rounded-2xl border shadow-lg w-full"
            style={{ 
              padding: '2rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            // Only animate opacity and scale, not width
            initial={{ 
              opacity: 0,
              scale: 0.8,
            }}
            animate={{ 
              opacity: 1,
              scale: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.4
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <h3 className="text-center text-xl font-medium mb-8">
                How would you like to interact with your coach?
              </h3>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full sm:w-auto flex items-center gap-2 px-6 py-6 text-lg"
                  onClick={handleSelectVoice}
                >
                  <Mic className="h-5 w-5" />
                  Voice
               </Button>
                
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto flex items-center gap-2 px-6 py-6 text-lg"
                  onClick={handleSelectChat}
                >
                  <MessageSquareText className="h-5 w-5" />
                  Chat
               </Button>
             </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Chat mode rendering - replace the return statement with this new implementation
  return (
    <div className="absolute inset-0 w-full h-full bg-background">
      {/* Add empty space at the top for the header to overlap */}
      <div className="w-full h-16 bg-white"></div>
      <div className="flex flex-col w-full h-[calc(100%-64px)] overflow-y-auto">
        {/* Minimal Header Bar */}
        <motion.div 
          variants={contentFadeVariants}
          initial="hidden"
          animate="visible"
          className="w-full border-b z-10 sticky top-0 bg-background"
        >
          <div className="container max-w-screen-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <h3 className='flex items-center text-lg font-medium text-foreground'>
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white mr-3">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-pink-600">AI Coach</span>
                <span className="text-xs text-muted-foreground">Your personal sales skill assistant</span>
              </div>
            </h3>
            
            {/* Add Reset Button in Header with improved positioning */}
            <button
              onClick={handleCompleteReset}
              className="text-sm bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-md flex items-center space-x-1 shadow-sm relative z-50 mr-2"
              title="Reset coaching session for testing"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              <span>Reset Coach</span>
            </button>
          </div>
        </motion.div>

        {/* Main Content Area - Allow scrolling */}
        <div className="flex flex-1 w-full h-[calc(100vh-100px)] overflow-y-auto pt-6">
          {/* Left Side: Chat Interface */}
          <motion.div 
            layout
            layoutId="coach-card"
            variants={cardVariants}
            initial="options"
            animate="splitView"
            className="w-2/3 h-full flex flex-col overflow-hidden"
            role="region"
            aria-label="AI Coach Chat"
          >
            {/* Add visual progress indicator */}
            {!hasCompletedRoleplay && onboardingData.stage !== 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 md:px-8 lg:px-16 pb-4"
              >
                <div className="bg-muted/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Onboarding Progress</h3>
                    <span className="text-xs text-muted-foreground">
                      {onboardingData.stage === 'product' ? '1' : 
                       onboardingData.stage === 'market_and_buyer' ? '2' : 
                       onboardingData.stage === 'sales_context' ? '3' : '0'}/4
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: onboardingData.stage === 'product' ? '25%' : 
                               onboardingData.stage === 'market_and_buyer' ? '50%' : 
                               onboardingData.stage === 'sales_context' ? '75%' : '0%' 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className={onboardingData.stage === 'product' ? 'text-primary font-medium' : ''}>Product</span>
                    <span className={onboardingData.stage === 'market_and_buyer' ? 'text-primary font-medium' : ''}>Market</span>
                    <span className={onboardingData.stage === 'sales_context' ? 'text-primary font-medium' : ''}>Context</span>
                  </div>
                  
                  {/* Skip to Roleplay button */}
                  <button
                    onClick={handleSkipToRoleplay}
                    className="mt-3 text-xs text-primary hover:text-primary/80 underline underline-offset-2 flex items-center"
                  >
                    <span>Skip to Roleplay</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
            
            {/* Chat messages container */}
            <motion.div 
              variants={contentFadeVariants}
              initial="hidden"
              animate="visible"
              className="flex-1 flex flex-col space-y-6 overflow-y-auto px-4 md:px-8 lg:px-16 py-6 mt-4"
              ref={chatContainerRef}
            >
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div 
                    key={message.id}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={`flex items-start ${message.isUser ? 'justify-end' : 'justify-start'} max-w-3xl ${message.isUser ? 'ml-auto' : 'mr-auto'}`}
                  >
                    {/* Removed AI circle avatar */}
                    
                    <div 
                      className={`${message.isUser 
                        ? 'text-gray-800 bg-red-100/70 border border-red-200/50 rounded-xl rounded-tr-sm' 
                        : 'text-foreground bg-gray-100 rounded-xl rounded-tl-sm border border-gray-200'
                      } p-4 text-base leading-relaxed max-w-[90%] shadow-sm`}
                    >
                      {message.isUser ? (
                        <div className="text-gray-800">{message.content}</div>
                      ) : (
                        // Only use TypingEffect for the most recent AI message
                        message.id === messages.filter(m => !m.isUser).slice(-1)[0]?.id ? (
                          <TypingEffect 
                            text={message.content}
                            speed={10}
                          />
                        ) : (
                          // For older messages, just render the content directly with markdown
                          <div className="markdown-content text-gray-800" 
                               dangerouslySetInnerHTML={{ __html: marked(message.content) }} />
                        )
                      )}
                      <div className="text-xs mt-2 opacity-70 text-right">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                    
                    {/* Removed user circle avatar */}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Loading indicator - simplified */}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </motion.div>
              )}
              
              {/* Continue Button (only shown when needed) */}
              {showContinueButton && !isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-4 flex justify-center mt-6 mb-2 z-10"
                >
                  <Button
                    onClick={handleContinue}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                  >
                    <span>Continue to Next Step</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Button>
                </motion.div>
              )}
              
              {/* Sales Technique Feedback Tips */}
              <AnimatePresence>
                {showFeedbackTip && currentFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mx-auto my-4 max-w-md bg-blue-50 border border-blue-100 rounded-lg p-4 shadow-md relative"
                  >
                    <div className="absolute top-2 right-2">
                      <button 
                        onClick={() => setShowFeedbackTip(false)}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-800 text-sm mb-1">Sales Tip: {currentFeedback.technique}</h4>
                        <p className="text-sm text-blue-700 mb-2">{currentFeedback.tip}</p>
                        <div className="bg-white p-2 rounded border border-blue-100 text-xs text-gray-700">
                          <strong>Example:</strong> "{currentFeedback.example}"
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Dynamic Action Buttons */}
              {renderActionButtons()}
            </motion.div>

            {/* Message input area */}
            <motion.div 
              variants={contentFadeVariants}
              initial="hidden"
              animate="visible"
              className="p-4 md:px-8 lg:px-16 border-t"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    id="message-input"
                    type="text"
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={onboardingData.stage !== 'complete' ? STAGE_GUIDANCE[onboardingData.stage].placeholder : "Type your message..."}
                    className="w-full py-3 px-4 border rounded-full focus:ring-1 focus:ring-primary focus:outline-none text-base"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="true"
                    data-form-type="other"
                    data-lpignore="true"
                    disabled={isLoading}
                  />
                  
                  {/* Validation tooltip */}
                  {showValidationTooltip && validationStatus && !validationStatus.isValid && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-white border border-red-200 rounded-lg shadow-lg z-50">
                      <p className="text-sm text-red-600 mb-1">{validationStatus.message}</p>
                      {validationStatus.missingKeywords.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-600">Try including keywords like:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {validationStatus.missingKeywords.map(keyword => (
                              <span key={keyword} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <motion.button 
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className={`rounded-full p-3 flex items-center justify-center ${!userInput.trim() || isLoading ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side: Timeline Panel - replaces summary panel */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-1/3 h-full bg-muted/10 overflow-y-auto border-l p-6"
          >
            {/* Replace the progress panel with a Sales Insights Panel */}
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary">
                    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/>
                    <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>
                  </svg>
                  Onboarding Guide
                </h3>
                
                {!hasCompletedRoleplay && (
                  <div className="bg-primary/5 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-sm mb-2">Why Onboarding Matters</h4>
                    <p className="text-sm text-gray-600">
                      Sharing details about your product and sales context helps create realistic practice scenarios tailored to your needs.
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Key Benefits */}
                  <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                    <h4 className="font-medium text-sm mb-2 text-primary">What You'll Get Access To</h4>
                    <ul className="text-sm space-y-3">
                      <li className="flex items-start">
                        <div className="bg-primary/10 p-1 rounded-full mr-2 mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        <div>
                          <strong className="font-medium block text-gray-800">Custom Roleplays</strong>
                          <span className="text-gray-600">Practice with scenarios tailored to your product</span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-primary/10 p-1 rounded-full mr-2 mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        <div>
                          <strong className="font-medium block text-gray-800">Performance Analytics</strong>
                          <span className="text-gray-600">Track your progress and identify areas to improve</span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-primary/10 p-1 rounded-full mr-2 mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        <div>
                          <strong className="font-medium block text-gray-800">Real-time Coaching</strong>
                          <span className="text-gray-600">Get sales tips and feedback during conversations</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Onboarding Steps */}
                  <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                    <h4 className="font-medium text-sm mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-primary">
                        <path d="M8 6V4c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2"/>
                        <path d="M19 6H5a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z"/>
                        <path d="M12 10v8"/>
                        <path d="m8.5 14 7-4"/>
                      </svg>
                      Onboarding Steps
                    </h4>
                    <div className="text-sm text-gray-600">
                      <ol className="list-decimal pl-5 space-y-1">
                        <li className={onboardingData.product ? "text-green-600 line-through" : ""}>Tell us about your product</li>
                        <li className={onboardingData.marketAndBuyer ? "text-green-600 line-through" : ""}>Define your target market and buyer persona</li>
                        <li className={onboardingData.salesContext ? "text-green-600 line-through" : ""}>Explain your sales context</li>
                        <li className={onboardingData.stage === 'complete' ? "text-green-600 line-through" : ""}>Head to the dashboard</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show the action button at the bottom of the timeline for complete stage */}
              {onboardingData.stage === 'complete' && (
                <div className="mt-8 pt-6 border-t border-muted">
                  <button
                    onClick={() => handleStartFirstRoleplay()}
                    className="w-full py-2 px-4 bg-primary text-white rounded-md shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <path d="M9 21V9"/>
                    </svg>
                    Continue to Dashboard
                  </button>
                  <button
                    onClick={handleResetOnboarding}
                    className="w-full mt-2 text-xs text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded border border-rose-200 transition-colors"
                  >
                    Reset Onboarding (Testing Only)
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Add a floating reset button */}
      {hasCompletedRoleplay && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleCompleteReset}
            className="bg-white shadow-md border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-full p-3 flex items-center space-x-2"
            title="Reset onboarding state (for testing only)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            <span className="pr-1">Reset</span>
          </button>
        </div>
      )}

      {/* Add a force-update function for testing */}
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={forceUpdateSummary}
          className="bg-white shadow-md border border-blue-200 text-blue-500 hover:bg-blue-50 rounded-full p-2 flex items-center"
          title="Force update summary (for testing only)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </button>
      </div>
      
      {/* Transition overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 mb-6 bg-gradient-to-r from-primary to-pink-600 rounded-full flex items-center justify-center text-white">
                <BrainCircuit className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-semibold mb-2 text-gray-800">
                {transitionMessage}
              </h2>
              
              <div className="mt-4 w-12 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-primary to-pink-600 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Export the component
export default AISummaryCard; 
