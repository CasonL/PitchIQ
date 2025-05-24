import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { Loader2, RefreshCw, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Zap, Sparkles, Settings2, ThumbsUp, AlertTriangle, Lightbulb } from "lucide-react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
// Remove unused imports
// import { Button } from "@/components/ui/button"; 
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import SkillRadar from "@/components/dashboard/SkillRadar";
// import KeyMetrics from "@/components/dashboard/KeyMetrics";
// import AICardSystem from "@/components/dashboard/AICardSystem";
// import CallTimeline from "@/components/dashboard/CallTimeline";
import AISummaryCard from "@/components/dashboard/AISummaryCard";
import PostRoleplayAnalysisCard from "@/components/dashboard/PostRoleplayAnalysisCard";
import ExcitementCard from "@/components/dashboard/ExcitementCard";
import InteractiveAnalysisHubCard, { type InteractiveAnalysisHubCardProps } from '@/components/dashboard/InteractiveAnalysisHubCard';
import DataPointHighlightCard, { type DataPointHighlightProps } from '@/components/dashboard/widgets/DataPointHighlightCard';
import KeyMomentCard, { type KeyMomentCardProps } from '@/components/dashboard/widgets/KeyMomentCard';
import ResourceSpotlightCard, { type ResourceSpotlightCardProps } from '@/components/dashboard/widgets/ResourceSpotlightCard';
// import PerformanceSnapshotCard, { type PerformanceSnapshotCardProps } from '@/components/dashboard/widgets/PerformanceSnapshotCard'; // REMOVED
// import AnalyticsSidebar from "@/components/dashboard/AnalyticsSidebar";
import AppHeader from "@/components/AppHeader";
import TypewriterGreeting from "@/components/TypewriterGreeting";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import DashboardDevToolsPanel from '@/components/dashboard/DashboardDevToolsPanel'; // Removed DashboardDevToolsPanelProps from here
import type { DashboardDevToolsPanelProps } from '@/components/dashboard/DashboardDevToolsPanel'; // Added separate type import
import TopLevelAIChatBar from '@/components/dashboard/TopLevelAIChatBar';
import ConfirmationModal from "@/components/ui/ConfirmationModal"; // <-- Import the new modal
import MethodologySelectionModal from "@/components/ui/MethodologySelectionModal"; // <-- Import the new selection modal
import "./Dashboard.css";
import PromptStartRoleplay from '@/components/dashboard/PromptStartRoleplay'; // Import the new component
import UnlockableFeaturesGrid from '@/components/dashboard/widgets/UnlockableFeaturesGrid'; // Import the new grid

// Define type for chat messages
interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

// User data for the dashboard
const userData = {
  id: 1,
  username: 'demo_user',
  email: 'demo@example.com',
  name: 'Cason', // Updated to match the coach messages
  role: 'Sales Representative'
};

// Create a key for storing the user's name preference
const USER_NAME_STORAGE_KEY = 'pitchiq_user_preferred_name';
// Create a key for tracking if user has completed roleplays
const USER_ROLEPLAY_KEY = 'ai_coach_has_completed_roleplay';
// Create a key for tracking if the greeting interaction is complete
const GREETING_COMPLETE_KEY = 'pitchiq_greeting_complete';
// Key to indicate a new analysis is pending from a completed roleplay
const NEW_ANALYSIS_PENDING_KEY = 'pitchiq_new_analysis_pending';
// Key to track if the first deep-dive analysis has been viewed
const FIRST_ANALYSIS_VIEWED_KEY = 'pitchiq_first_analysis_viewed';

// Key for storing the chat log
const CHAT_LOG_STORAGE_KEY = 'pitchiq_chat_log';

// Key for completed roleplays count
const COMPLETED_ROLEPLAYS_COUNT_KEY = 'pitchiq_completed_roleplays_count';

// Key for revealed features
const REVEALED_FEATURES_STORAGE_KEY = 'pitchiq_revealed_features';

// --- NEW: Sales Methodology ---
export type SalesMethodology =
  | 'SPIN Selling'
  | 'Challenger Sale'
  | 'Solution Selling'
  | 'Consultative Selling'
  | 'Value Selling'
  | 'Pending Selection' // User wants to change, but hasn't picked yet
  | 'AI Recommended'    // Default or placeholder before first real suggestion
  | null;               // Not yet determined / Error

const USER_METHODOLOGY_STORAGE_KEY = 'pitchiq_user_methodology';
// --- END NEW: Sales Methodology ---

// --- NEW: Key for AI Original Recommendation ---
const AI_ORIGINAL_RECOMMENDATION_KEY = 'pitchiq_ai_original_recommendation';
// --- END NEW ---

// Keys used by AISummaryCard for its state
const ONBOARDING_DATA_KEY = 'ai_coach_onboarding_data';
const ONBOARDING_MESSAGES_KEY = 'ai_coach_messages';

// --- Define User Dashboard States ---
export type UserDashboardState =
  | 'FRESH_ONBOARDING_COMPLETE'
  | 'AWAITING_FIRST_ROLEPLAY'
  | 'FIRST_ROLEPLAY_DONE_ANALYSIS_PENDING'
  | 'SHOW_FIRST_ANALYSIS_DEEP_DIVE'
  | 'SUBSEQUENT_ROLEPLAY_DONE_ANALYSIS_PENDING'
  | 'SUBSEQUENT_ANALYSIS_READY'
  | 'SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE'
  | 'GENERAL_USE_IDLE'
  | 'GENERAL_USE_ACTIVE_GOAL'
  | 'IN_TRAINING_MODULE'
  | 'NEW_CONTENT_AVAILABLE'
  | 'IDLE_PROMPT_NEW_ROLEPLAY' // Added new state
  // ROLEPLAY_ACTIVE state removed
  | 'NEW_USER_NO_DATA'; // Added for dev panel reset

// 2. Define array of all UserDashboardState values
const ALL_USER_DASHBOARD_STATES: UserDashboardState[] = [
  'FRESH_ONBOARDING_COMPLETE',
  'AWAITING_FIRST_ROLEPLAY',
  'FIRST_ROLEPLAY_DONE_ANALYSIS_PENDING',
  'SHOW_FIRST_ANALYSIS_DEEP_DIVE',
  'SUBSEQUENT_ROLEPLAY_DONE_ANALYSIS_PENDING',
  'SUBSEQUENT_ANALYSIS_READY',
  'SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE',
  'GENERAL_USE_IDLE',
  'GENERAL_USE_ACTIVE_GOAL',
  'IN_TRAINING_MODULE',
  'NEW_CONTENT_AVAILABLE',
  'IDLE_PROMPT_NEW_ROLEPLAY', // Added new state to array
  // ROLEPLAY_ACTIVE state removed
  'NEW_USER_NO_DATA'
];

// --- Mock Data & State for PostRoleplayAnalysisCard ---
const MOCK_ROLEPLAY_ANALYSIS = {
  // --- Fields for Deep Dive View (isFirstAnalysis = true) ---
  deepDiveSummary: "This was your first roleplay, and overall you demonstrated a good foundational understanding of the product. The primary area for development is broadening your questioning technique to elicit more detailed responses. You also showed good confidence when presenting the solution. We'll work on structuring your responses a bit more to highlight value propositions clearly. Keep up the great effort!",
  performanceNarrativeParagraph1: "Right out of the gate in your first session, your enthusiasm for the product and genuine desire to help the client shined brightly! You established rapport quickly and navigated the initial conversation with a natural confidence. We noticed a significant improvement in your pacing compared to typical first-timers, allowing the client ample space to speak – that's a fantastic foundational skill you're already leveraging effectively. Keep that engaging energy high!",
  performanceNarrativeParagraph2: "The biggest opportunity we see for exponential growth lies in deepening your discovery phase. While you asked good baseline questions, imagine the power if you consistently probed further with insightful follow-ups! For instance, when the client mentioned a challenge, a simple 'Tell me more about how that impacts your team daily?' could unlock invaluable information. Mastering this will transform your pitches from good to absolutely compelling. This is an exciting area for us to focus on together!",
  keyMetrics: [
    { label: 'Pace', value: '155 WPM', trend: 'neutral' },
    { label: 'Clarity', value: '80%', trend: 'up' },
    { label: 'Filler Words', value: '3', trend: 'down' },
    { label: 'Talk/Listen Ratio', value: '60/40', trend: 'neutral' },
  ],
  salesSkillsSnapshot: [
    { skillName: 'Opening', userScore: 70, targetScore: 75, summary: 'Good rapport building.' },
    { skillName: 'Needs Discovery', userScore: 60, targetScore: 80, summary: 'Opportunity to ask more probing questions.' },
    { skillName: 'Product Pitch', userScore: 75, targetScore: 70, summary: 'Clear explanation of features.' },
    { skillName: 'Objection Handling', userScore: 65, targetScore: 75, summary: 'Responded well to initial objections.' },
    { skillName: 'Closing', userScore: 55, targetScore: 70, summary: 'Could be more assertive in asking for the next step.' },
  ],
  
  // --- Fields for BOTH Deep Dive & Focused View ---
  mainFeedback: {
    id: 'mf1',
    summary: 'Broaden Questioning Techniques',
    details: 'Focus on asking more open-ended and follow-up questions to encourage the client to share more detailed information about their needs and challenges. This will help you tailor your solution more effectively.',
    relatedTraining: [
      { id: 'train1', title: 'Module: Art of Questioning', type: 'module' },
      { id: 'prac1', title: 'Practice: Open-Ended Questions Roleplay', type: 'practice' },
    ],
  },
  additionalFeedback: [
    { 
      id: 'af1', 
      summary: 'Clear Product Presentation', 
      details: 'You explained the product features clearly and concisely. The client seemed to understand the core benefits well.',
      positiveTrait: "Clarity",
      benefit: "Ensured client understood product value.",
    },
    { 
      id: 'af2', 
      summary: 'Handled Initial Price Objection Well', 
      details: 'When the client mentioned budget concerns, you effectively pivoted to value without being dismissive. Good job redirecting the conversation.',
      positiveTrait: "Value Reinforcement",
      specificAction: "Pivoted from price to value.",
    },
    { 
      id: 'af3', 
      summary: 'Opportunity to Summarize Needs Before Pitching', 
      details: 'Consider summarizing the client\'s stated needs back to them before diving into the full product pitch. This ensures alignment and shows active listening.',
      desiredOutcome: "Stronger client alignment.",
      specificAction: "Summarize needs before pitching solution."
    },
    {
      id: 'af4',
      summary: 'Good use of talk-to-listen ratio',
      details: 'You maintained a good balance between talking and listening, allowing the client to express their thoughts.',
    }
  ],

  // --- NEW Fields PRIMARILY for Focused View (isFirstAnalysis = false) ---
  focusedSummary: "This session, you showed marked improvement in objection handling! The key focus now is to further refine your questioning strategy.",
  focusedArea: {
    title: "Mastering Follow-Up Questions",
    keyPoints: [
      "After the client answers, ask 'Tell me more about that.' or 'Why is that important to you?'.",
      "Listen for keywords in their response to guide your next question.",
      "Practice linking their previous statement to your follow-up question."
    ],
    lessonSuggestion: {
      id: 'train2',
      title: 'Advanced Questioning Techniques',
      type: 'module',
    },
  },
  performanceTrends: [
    { 
      metricName: 'Questioning Depth', 
      currentValue: 'Improved', 
      previousValue: 'Basic', 
      trend: 'improved', 
      summary: 'You asked more follow-up questions this time.',
      averageBenchmark: "Top 10%: Advanced",
      benchmarkLabel: "Peer Benchmark:"
    },
    { 
      metricName: 'Clarity Score', 
      currentValue: '85%', 
      previousValue: '80%', 
      trend: 'improved', 
      averageBenchmark: "80-90%",
      benchmarkLabel: "Target Range:"
    },
    { 
      metricName: 'Pacing', 
      currentValue: '150 WPM', 
      previousValue: '165 WPM', 
      trend: 'improved',
      summary: 'Your pacing is more controlled, aiding comprehension.',
      averageBenchmark: "140-160 WPM",
      benchmarkLabel: "Optimal Pace:"
    },
    {
      metricName: 'Use of Silence',
      currentValue: 'Good',
      previousValue: 'Okay',
      trend: 'stable',
      summary: 'Allowing thoughtful pauses effectively.',
    },
    {
      metricName: 'Empathy Statements',
      currentValue: '3',
      previousValue: 'N/A',
      trend: 'new',
      summary: 'Now tracking your use of empathy statements. Great start!',
      averageBenchmark: "2-4 statements",
      benchmarkLabel: "Avg. Rep:"
    }
  ],
};
// --- END Mock Data ---

// Define the interface for strength spotlight data based on InteractiveAnalysisHubCard
interface StrengthSpotlightDataForDashboard {
  metricName: string;
  metricValue: string;
  achievementContext?: string;
}

// --- Define interface for Consistency Champion data ---
interface ConsistencyChampionDataForDashboard {
  skillName: string;
  durationContext?: string;
}

// --- Define a type for the context passed to the positive feedback handler ---
export interface PositiveFeedbackContext {
  type: 'STRENGTH_SPOTLIGHT' | 'CONSISTENCY_CHAMPION'; // Add more types as needed
  data: any; // Data specific to the type, e.g., { metricName, metricValue } or { skillName }
}

// Define the discriminated union for all insight card types
export type InsightCardData = DataPointHighlightProps | KeyMomentCardProps | ResourceSpotlightCardProps;

// Interface for onboarding data used within Dashboard.tsx
interface DashboardOnboardingData {
  answer_q1_product_value: string;
  answer_q1_combined?: string;
  answer_q2_audience?: string;
  answer_q4_style?: string; 
  answer_q4_methodology?: string;
  answer_q5_goal?: string;
  stage: string; // Keep as string to be general, specific stages handled by AISummaryCard
  businessType?: string;
  businessDescription?: string;
  extracted_sales_environment_details?: any; // <-- EXISTING ADDED FIELD

  // Fields used by handleOnboardingComplete and potentially ExcitementCard
  productInfo?: string; 
  audienceInfo?: string;
  salesStyle?: string;
  salesEnvironment?: string;

  // Deprecated fields that might still exist in older localStorage data
  answer_q1?: string; // Still used by handleOnboardingComplete for productInfo
  answer_q2?: string; // Still used by handleOnboardingComplete for audienceInfo
}

const Dashboard = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  // State for loading
  const [loading, setLoading] = useState(true);
  // State for user's preferred name
  const [userName, setUserName] = useState(userData.name);
  // State for tracking if user has completed roleplays
  const [hasCompletedRoleplay, setHasCompletedRoleplay] = useState(false);
  // State for tracking if the greeting interaction is complete
  const [greetingComplete, setGreetingComplete] = useState(false);

  // --- State for AISummaryCard visibility ---
  const [showAISummaryCard, setShowAISummaryCard] = useState(true); // New state
  // --- State for ExcitementCard visibility and data ---
  const [showExcitementCard, setShowExcitementCard] = useState(false);
  const [onboardingSummaryData, setOnboardingSummaryData] = useState<DashboardOnboardingData | null>(null); // To pass to ExcitementCard

  // --- State for PostRoleplayAnalysisCard visibility and data ---
  const [showRoleplayAnalysis, setShowRoleplayAnalysis] = useState(false); // Initially false
  const [roleplayAnalysisData, setRoleplayAnalysisData] = useState<any>(null);
  // const [analysisLoading, setAnalysisLoading] = useState(false); // REMOVE this line
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // --- END State for PostRoleplayAnalysisCard ---

  // --- State for first time analysis view ---
  const [isFirstTimeAnalysisView, setIsFirstTimeAnalysisView] = useState(true);

  // --- NEW STATE for focused analysis teaser/full view ---
  const [showFullAnalysisCard, setShowFullAnalysisCard] = useState(true); // For dev, can be set by dev tools

  // --- Developer State for Cycling Card Views ---
  type DevDisplayMode = 'NORMAL_FLOW' | 'AISUMMARY' | 'EXCITEMENT' | 'DEEP_DIVE_ANALYSIS' | 'FOCUSED_ANALYSIS' | 'ANALYSIS_TEASER';
  const DEV_MODES: DevDisplayMode[] = ['NORMAL_FLOW', 'AISUMMARY', 'EXCITEMENT', 'DEEP_DIVE_ANALYSIS', 'FOCUSED_ANALYSIS', 'ANALYSIS_TEASER'];
  const [devDisplayMode, setDevDisplayMode] = useState<DevDisplayMode>('NORMAL_FLOW');

  // --- NEW STATE for Dev Tools Dropdown ---
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(true); // Default to true for easier dev

  // --- NEW State for User Account Status ---
  const [userAccountStatus, setUserAccountStatus] = useState<'free' | 'premium'>('free'); // Default to 'free'

  // --- NEW State for Adaptive Dashboard Hub ---
  const [userDashboardState, setUserDashboardState] = useState<UserDashboardState>('GENERAL_USE_IDLE');

  // --- NEW State for Generic Data Point Highlights (Main Insights Carousel) ---
  const [insightCards, setInsightCards] = useState<InsightCardData[]>([]);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0); // For main insights carousel

  // --- NEW State for Chat Bar Initial Query ---
  const [chatBarInitialQuery, setChatBarInitialQuery] = useState<string | null>(null);

  // State for dev tools panel
  const [showDevTools, setShowDevTools] = useState(false);

  // --- NEW State for Dev Tool Hub Card Inputs ---
  const [devActiveGoalName, setDevActiveGoalName] = useState<string>("");
  const [devActiveGoalDescription, setDevActiveGoalDescription] = useState<string>("");
  const [devTrainingModuleName, setDevTrainingModuleName] = useState<string>("");
  const [devTrainingModuleProgress, setDevTrainingModuleProgress] = useState<string>("");
  const [devNewContentTitle, setDevNewContentTitle] = useState<string>("");
  const [devNewContentTeaser, setDevNewContentTeaser] = useState<string>("");
  // --- END NEW State for Dev Tool Hub Card Inputs ---

  // --- NEW State for Chat Log ---
  const [chatLog, setChatLog] = useState<ChatMessage[]>(() => {
    const storedChatLog = localStorage.getItem(CHAT_LOG_STORAGE_KEY);
    try {
      return storedChatLog ? JSON.parse(storedChatLog) : [];
    } catch (error) {
      console.error("Error parsing stored chat log:", error);
      return [];
    }
  });
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false); // For future typing indicator
  // --- END NEW State for Chat Log ---

  // --- NEW State for TopLevelAIChatBar visibility (controlled by Dashboard) ---
  const [isChatLogOpen, setIsChatLogOpen] = useState<boolean>(false); // Default to closed as per previous logic

  // --- NEW State for Full Chat History visibility (controlled by Dashboard) ---
  const [showFullChatHistory, setShowFullChatHistory] = useState<boolean>(false);

  // Placeholder for actual analysis data - replace with real data fetching
  const [currentAnalysisData, setCurrentAnalysisData] = useState<any>(null); 

  // State for completed roleplays count
  const [completedRoleplaysCount, setCompletedRoleplaysCount] = useState<number>(() => {
    const storedCount = localStorage.getItem(COMPLETED_ROLEPLAYS_COUNT_KEY);
    return storedCount ? parseInt(storedCount, 10) : 0;
  });

  // State for revealed feature IDs
  const [revealedFeatureIds, setRevealedFeatureIds] = useState<Record<string, boolean>>(() => {
    const storedRevealedFeatures = localStorage.getItem(REVEALED_FEATURES_STORAGE_KEY);
    try {
      return storedRevealedFeatures ? JSON.parse(storedRevealedFeatures) : {};
    } catch (error) {
      console.error("Error parsing stored revealed features:", error);
      return {};
    }
  });

  // NEW state for managing analysis loading flow
  type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');

  // --- NEW State for controlling UnlockableFeaturesGrid visibility ---
  const [showUnlockableFeaturesSection, setShowUnlockableFeaturesSection] = useState(false);

  // --- NEW State for Focused Insight Mode ---
  const [isFocusedInsightMode, setIsFocusedInsightMode] = useState(false);

  // --- NEW State for Sales Methodology ---
  const [currentUserMethodology, setCurrentUserMethodology] = useState<SalesMethodology>(() => {
    return (localStorage.getItem(USER_METHODOLOGY_STORAGE_KEY) as SalesMethodology) || 'AI Recommended';
  });
  const [showMethodologyChangeModal, setShowMethodologyChangeModal] = useState<boolean>(false);
  // --- NEW State for Methodology Selection Flow ---
  const [showMethodologySelectionModal, setShowMethodologySelectionModal] = useState<boolean>(false);
  const [methodologyBeforeChangeAttempt, setMethodologyBeforeChangeAttempt] = useState<SalesMethodology | null>(null);
  // --- END NEW State for Methodology Selection Flow ---

  // --- NEW State for AI's Original Recommendation ---
  const [aiOriginalRecommendation, setAiOriginalRecommendation] = useState<SalesMethodology | null>(() => {
    return localStorage.getItem(AI_ORIGINAL_RECOMMENDATION_KEY) as SalesMethodology | null;
  });
  // --- END NEW State ---

  // Ref for TopLevelAIChatBar for click outside detection
  const chatBarRef = useRef<HTMLDivElement>(null);


  // Log states on every render for debugging card visibility
  console.log("[Dashboard Render] States:", {
    greetingComplete,
    showAISummaryCard,
    showExcitementCard,
    showRoleplayAnalysis,
    showFullAnalysisCard,
    devDisplayMode
  });

  // Effect to save chatLog to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CHAT_LOG_STORAGE_KEY, JSON.stringify(chatLog));
  }, [chatLog]);

  // Effect to save completedRoleplaysCount to localStorage
  useEffect(() => {
    localStorage.setItem(COMPLETED_ROLEPLAYS_COUNT_KEY, completedRoleplaysCount.toString());
  }, [completedRoleplaysCount]);

  // Effect to save revealedFeatureIds to localStorage
  useEffect(() => {
    localStorage.setItem(REVEALED_FEATURES_STORAGE_KEY, JSON.stringify(revealedFeatureIds));
  }, [revealedFeatureIds]);

  // Effect to save currentUserMethodology to localStorage
  useEffect(() => {
    if (currentUserMethodology) {
      localStorage.setItem(USER_METHODOLOGY_STORAGE_KEY, currentUserMethodology);
    } else {
      localStorage.removeItem(USER_METHODOLOGY_STORAGE_KEY);
    }
  }, [currentUserMethodology]);

  // Effect to save aiOriginalRecommendation to localStorage
  useEffect(() => {
    if (aiOriginalRecommendation) {
      localStorage.setItem(AI_ORIGINAL_RECOMMENDATION_KEY, aiOriginalRecommendation);
    } else {
      localStorage.removeItem(AI_ORIGINAL_RECOMMENDATION_KEY); // Or not, if we want to keep it once set
    }
  }, [aiOriginalRecommendation]);

  // Load user data on mount
  useEffect(() => {
    console.log('Dashboard useEffect: START (Effect 1 - Initial setup and new analysis detection)');
    console.log('Dashboard useEffect: Initial NEW_ANALYSIS_PENDING is', localStorage.getItem(NEW_ANALYSIS_PENDING_KEY));
    console.log('Dashboard useEffect: Initial COMPLETED_ROLEPLAYS_COUNT is', localStorage.getItem(COMPLETED_ROLEPLAYS_COUNT_KEY));
    
    // let isMounted = true; // isMounted might not be needed with the new effect structure
    // let newAnalysisProcessedInThisRun = false; // This flag might also be re-evaluated or removed
    // let analysisTimeoutId: NodeJS.Timeout | null = null; // Will be managed by Effect 2

    const newAnalysisPending = localStorage.getItem(NEW_ANALYSIS_PENDING_KEY) === 'true';

    if (newAnalysisPending) {
      localStorage.removeItem(NEW_ANALYSIS_PENDING_KEY);
      // newAnalysisProcessedInThisRun = true; 
      console.log('Dashboard useEffect (Effect 1): Processing NEW_ANALYSIS_PENDING_KEY.');

      // No direct isMounted check needed for these state setters if effect dependencies are correct
      setShowAISummaryCard(false);
      setShowExcitementCard(false);
      setHasCompletedRoleplay(true);
      
      const currentCompletedRoleplaysCount = parseInt(localStorage.getItem(COMPLETED_ROLEPLAYS_COUNT_KEY) || '0', 10);
      console.log("New analysis pending (Effect 1). Total completed roleplays:", currentCompletedRoleplaysCount);

      const shouldShowFocusedView = (currentCompletedRoleplaysCount > 0) && ((currentCompletedRoleplaysCount - 1) % 4 === 0);
      console.log("Should show focused view for this analysis (Effect 1)?", shouldShowFocusedView);

      setIsFirstTimeAnalysisView(!shouldShowFocusedView); 

      if (shouldShowFocusedView) {
        setUserDashboardState('SHOW_FIRST_ANALYSIS_DEEP_DIVE'); 
        console.log("[Dashboard] (Effect 1) New analysis (focused view), userDashboardState to SHOW_FIRST_ANALYSIS_DEEP_DIVE");
      } else {
        setUserDashboardState('SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE'); 
        console.log("[Dashboard] (Effect 1) New analysis (deep dive view), userDashboardState to SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE");
      }
      setShowRoleplayAnalysis(true); 
      setAnalysisStatus('loading'); // <<< TRIGGER data loading via status change
      setAnalysisError(null); // Clear previous errors
      
    } else {
      // console.log('Dashboard useEffect (Effect 1): No new analysis processed, proceeding with loadUserData.');
      // loadUserData(); // loadUserData will be called, but let's ensure it doesn't fight with analysisStatus
      // If no new analysis is pending, ensure we are not stuck in a loading state from a previous cycle
      if (analysisStatus === 'loading') {
        // This case should ideally not happen if NEW_ANALYSIS_PENDING was the sole trigger for 'loading'
        // But as a safeguard:
        console.log('Dashboard useEffect (Effect 1): No new analysis, but status was loading. Resetting to idle.');
        setAnalysisStatus('idle');
      }
      loadUserData(); // loadUserData will set the baseline dashboard state
    }
    
    setUserAccountStatus('premium'); 
    setLoading(false); // Overall dashboard loading (not analysis specific)
    
    console.log('Dashboard useEffect: END (Effect 1)');
    return () => {
      console.log('Dashboard useEffect: CLEANUP (Effect 1)');
      // No specific cleanup needed here for the analysis loading itself, as it's handled by Effect 2
    };
  }, []); // This effect still runs once on mount (or twice in StrictMode)


  // NEW Effect 2: Handles the actual "loading" of analysis data when status is 'loading'
  useEffect(() => {
    console.log('Dashboard useEffect (Effect 2 - Analysis Data Loader), current status:', analysisStatus);
    if (analysisStatus === 'loading') {
      console.log('Dashboard useEffect (Effect 2): Status is loading, starting timer for mock data.');
      const timerId = setTimeout(() => {
        console.log("Mock analysis data loaded via Effect 2 timer.");
        setRoleplayAnalysisData(MOCK_ROLEPLAY_ANALYSIS);
        setAnalysisStatus('success'); 
      }, 1000);

      return () => {
        console.log('Dashboard useEffect (Effect 2): Cleanup - clearing analysis data timer.', timerId);
        clearTimeout(timerId);
      };
    }
  }, [analysisStatus]); // This effect re-runs if analysisStatus changes

  // Load user data from localStorage
  const loadUserData = (): boolean => { 
    console.log('loadUserData: START');
    let willShowOldAnalysisFlag = false;
    let localShowAISummaryCard = showAISummaryCard; // Start with current state

    const currentCompletedCount = parseInt(localStorage.getItem(COMPLETED_ROLEPLAYS_COUNT_KEY) || '0', 10);
    console.log('loadUserData: currentCompletedCount from localStorage:', currentCompletedCount);

    const firstAnalysisAlreadyViewed = localStorage.getItem(FIRST_ANALYSIS_VIEWED_KEY) === 'true';
    
    const storedName = localStorage.getItem(USER_NAME_STORAGE_KEY);
    if (storedName) setUserName(storedName);
    
    setHasCompletedRoleplay(currentCompletedCount > 0);
    const actualRoleplayCompleted = currentCompletedCount > 0;
    
    const greetingDone = localStorage.getItem(GREETING_COMPLETE_KEY) === 'true';
    setGreetingComplete(greetingDone);

    const newAnalysisIsPendingLocally = localStorage.getItem(NEW_ANALYSIS_PENDING_KEY) === 'true';
    console.log('loadUserData: newAnalysisIsPendingLocally:', newAnalysisIsPendingLocally);

    if (newAnalysisIsPendingLocally) {
      console.log('loadUserData: NEW_ANALYSIS_PENDING_KEY is true. The main useEffect should handle this. Deferring state changes.');
      return false; 
    }

    if (greetingDone) {
      if (!actualRoleplayCompleted) {
        console.log('loadUserData: Setting state to AWAITING_FIRST_ROLEPLAY');
        setUserDashboardState('AWAITING_FIRST_ROLEPLAY');
        localShowAISummaryCard = false;
      } else { // actualRoleplayCompleted is true
        if (firstAnalysisAlreadyViewed) {
          console.log('loadUserData: Setting state to IDLE_PROMPT_NEW_ROLEPLAY');
          setUserDashboardState('IDLE_PROMPT_NEW_ROLEPLAY');
          localShowAISummaryCard = false;
        } else {
          console.log('loadUserData: User has completed roleplay(s), but first (deep dive type) analysis not viewed. Setting up for old analysis teaser.');
          willShowOldAnalysisFlag = true;
          setIsFirstTimeAnalysisView(true); 
          setUserDashboardState('SHOW_FIRST_ANALYSIS_DEEP_DIVE'); 
          localShowAISummaryCard = false;
        }
      }
    } else { 
      console.log('loadUserData: Greeting not complete.');
      // If greeting not done, TypewriterGreeting shows.
      // AISummaryCard might be true by default if onboarding hasn't started.
      // This is generally fine as TypewriterGreeting takes precedence in JSX.
      // No change to localShowAISummaryCard here, let initial/default state prevail.
    }
    
    // If, after the above logic, no specific "prompt" or "analysis teaser" state was set,
    // AND greeting is done, then check if onboarding is complete to decide on AISummaryCard.
    if (greetingDone && !localShowAISummaryCard && // Check if it was already set to false by above logic
        userDashboardState !== 'AWAITING_FIRST_ROLEPLAY' &&
        userDashboardState !== 'IDLE_PROMPT_NEW_ROLEPLAY' &&
        userDashboardState !== 'SHOW_FIRST_ANALYSIS_DEEP_DIVE' /* for old teaser */) {
      
      // This block seems to have been trying to show AISummaryCard if it was otherwise hidden
      // but the conditions are tricky. Let's simplify:
      // The states above *should* have set localShowAISummaryCard = false.
      // The only time we want to potentially show it is if onboarding is not complete.
    }


    // Decision point for AISummaryCard if greeting is done:
    if (greetingDone) {
        const onboardingDataString = localStorage.getItem(ONBOARDING_DATA_KEY);
        let onboardingInProgressOrNotStarted = true;
        if (onboardingDataString) {
            const onboardingData = JSON.parse(onboardingDataString);
            if (onboardingData.stage === 'complete') {
                onboardingInProgressOrNotStarted = false;
            }
        }

        if (onboardingInProgressOrNotStarted) {
            // Onboarding is not complete. Should we show AISummaryCard?
            // Yes, unless a more specific card is already taking precedence.
            if (userDashboardState !== 'AWAITING_FIRST_ROLEPLAY' &&
                userDashboardState !== 'IDLE_PROMPT_NEW_ROLEPLAY' &&
                !(userDashboardState === 'SHOW_FIRST_ANALYSIS_DEEP_DIVE' && willShowOldAnalysisFlag) &&
                userDashboardState !== 'SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE' /* from new analysis */ &&
                userDashboardState !== 'FIRST_ROLEPLAY_DONE_ANALYSIS_PENDING' /* from new analysis */ &&
                userDashboardState !== 'SUBSEQUENT_ROLEPLAY_DONE_ANALYSIS_PENDING' /* from new analysis */
                ) {
                console.log('loadUserData: Onboarding not complete and no other primary card state active -> setting localShowAISummaryCard to true. Current state:', userDashboardState);
                localShowAISummaryCard = true;
            } else {
                 console.log('loadUserData: Onboarding not complete, but a specific card state is active, localShowAISummaryCard remains/becomes false. State:', userDashboardState);
                 localShowAISummaryCard = false; // Explicitly false if other cards take precendence
            }
        } else {
            // Onboarding IS complete. AISummaryCard should be false.
            console.log('loadUserData: Onboarding is complete, setting localShowAISummaryCard to false.');
            localShowAISummaryCard = false;
        }
    }
    
    // Apply the determined state for AISummaryCard
    setShowAISummaryCard(localShowAISummaryCard);
    if (!localShowAISummaryCard) { // If summary card is hidden, excitement card should also be hidden
        setShowExcitementCard(false);
    }


    if (willShowOldAnalysisFlag) {
        console.log("[loadUserData] Setting up to show old analysis teaser. isFirstTimeAnalysisView state set to: true (for deep dive type teaser)");
        setShowRoleplayAnalysis(true); 
        setShowFullAnalysisCard(false); 
        // AISummaryCard should have been set to false by the logic above.
    }
    console.log('loadUserData: END, willShowOldAnalysisFlag:', willShowOldAnalysisFlag, 'final userDashboardState:', userDashboardState, 'showAISummaryCard:', localShowAISummaryCard);
    return willShowOldAnalysisFlag;
  };
  
  // Handle name change
  const handleNameChange = (newName: string) => {
    setUserName(newName);
    localStorage.setItem(USER_NAME_STORAGE_KEY, newName);
  };
  
  const handleGreetingComplete = () => {
    setGreetingComplete(true);
    localStorage.setItem(GREETING_COMPLETE_KEY, 'true');
    
    // After greeting, decide whether to show AISummaryCard or proceed differently
    const onboardingDataString = localStorage.getItem(ONBOARDING_DATA_KEY);
    if (onboardingDataString) {
      const onboardingData = JSON.parse(onboardingDataString);
      if (onboardingData.stage === 'complete') {
        // Onboarding already done.
        setShowAISummaryCard(false);
        setShowExcitementCard(false);
        // Determine initial dashboard state after greeting if onboarding is complete
        if (localStorage.getItem(NEW_ANALYSIS_PENDING_KEY) === 'true') {
          // useEffect will handle showing the new analysis, do nothing here regarding analysis card
          // but ensure the user state reflects that an analysis might be coming.
          // The useEffect that checks NEW_ANALYSIS_PENDING_KEY will set the appropriate userDashboardState.
        } else if (localStorage.getItem(USER_ROLEPLAY_KEY) === 'true' && localStorage.getItem(FIRST_ANALYSIS_VIEWED_KEY) !== 'true'){
          // Old, unviewed analysis might exist. loadUserData might handle showing a teaser.
          // For now, just set to general idle, InteractiveAnalysisHubCard can offer to view old analysis.
          setUserDashboardState('GENERAL_USE_IDLE'); 
        } else if (localStorage.getItem(USER_ROLEPLAY_KEY) === 'true'){
          setUserDashboardState('IDLE_PROMPT_NEW_ROLEPLAY');
        } else {
          setUserDashboardState('AWAITING_FIRST_ROLEPLAY');
        }
      } else {
        // Onboarding not complete, show the summary card to continue/start onboarding
        setShowAISummaryCard(true);
        setShowExcitementCard(false);
        setUserDashboardState('GENERAL_USE_IDLE'); // Ensure PromptStartRoleplay is not shown
      }
    } else {
      // No onboarding data yet, show AISummaryCard to start it
      setShowAISummaryCard(true);
      setShowExcitementCard(false);
      setUserDashboardState('GENERAL_USE_IDLE'); // Changed from AWAITING_FIRST_ROLEPLAY
    }
  };

  const handleOnboardingComplete = () => {
    console.log("[Dashboard] handleOnboardingComplete called");
    const onboardingDataString = localStorage.getItem(ONBOARDING_DATA_KEY);
    if (onboardingDataString) {
      const data = JSON.parse(onboardingDataString) as DashboardOnboardingData; // Cast to ensure all fields are potentially there
      const summaryData: DashboardOnboardingData = {
        // Ensure all required fields from DashboardOnboardingData are present
        stage: data.stage || 'complete', // Default to 'complete' if not present, though it should be
        answer_q1_product_value: data.answer_q1_product_value || data.answer_q1 || '', // Prioritize specific, fallback to old, then empty
        answer_q2_audience: data.answer_q2_audience || data.answer_q2 || '', // Add if it becomes required
        answer_q4_style: data.answer_q4_style || '', // Add if it becomes required
        // Fields for ExcitementCard and methodology suggestion
        productInfo: data.answer_q1_product_value || data.answer_q1 || '', // Use the more specific field first
        audienceInfo: data.answer_q2_audience || data.answer_q2 || '',    // Use the more specific field first
        salesStyle: data.answer_q4_style || '',
        salesEnvironment: data.businessType || '', // businessType is used as salesEnvironment
        // Include other optional fields from DashboardOnboardingData if they exist in 'data'
        answer_q1_combined: data.answer_q1_combined,
        answer_q4_methodology: data.answer_q4_methodology,
        answer_q5_goal: data.answer_q5_goal,
        businessType: data.businessType,
        businessDescription: data.businessDescription,
        extracted_sales_environment_details: data.extracted_sales_environment_details,
        // Deprecated fields, include them if they are in 'data' and might be used by legacy logic or for safety
        answer_q1: data.answer_q1,
        answer_q2: data.answer_q2,
      };
      setOnboardingSummaryData(summaryData);
      console.log("[Dashboard] Onboarding summary data set:", summaryData);

      // --- NEW: Simulate AI Methodology Suggestion ---
      let suggestedMethodology: SalesMethodology = 'Consultative Selling'; // Default suggestion
      if (summaryData.salesEnvironment?.toLowerCase().includes('enterprise') || summaryData.productInfo?.toLowerCase().includes('complex solution')) {
        suggestedMethodology = 'Solution Selling';
      } else if (summaryData.salesStyle?.toLowerCase().includes('challenger') || summaryData.productInfo?.toLowerCase().includes('innovative')) {
        suggestedMethodology = 'Challenger Sale';
      } else if (summaryData.audienceInfo?.toLowerCase().includes('c-suite') || summaryData.productInfo?.toLowerCase().includes('high value')) {
        suggestedMethodology = 'Value Selling';
      } else if (summaryData.salesStyle?.toLowerCase().includes('relationship') || summaryData.salesEnvironment?.toLowerCase().includes('smb')) {
        suggestedMethodology = 'SPIN Selling';
      }
      setCurrentUserMethodology(suggestedMethodology);
      setAiOriginalRecommendation(suggestedMethodology); // <-- Store the AI's original choice
      console.log("[Dashboard] AI Suggested Methodology:", suggestedMethodology);
      // --- END NEW: Simulate AI Methodology Suggestion ---

    } else {
      console.log("[Dashboard] No onboarding data found in localStorage for summary.");
      setCurrentUserMethodology('AI Recommended'); // Fallback if no data for suggestion
    }
    setShowAISummaryCard(false);
    setShowExcitementCard(true);
    setShowRoleplayAnalysis(false);
    console.log("[Dashboard] States after handleOnboardingComplete: showAISummaryCard=false, showExcitementCard=true");
  };

  const handleExploreDashboard = () => {
    setShowExcitementCard(false);
    // Determine next state based on whether roleplay has been done
    if (hasCompletedRoleplay) {
      const newAnalysisPending = localStorage.getItem(NEW_ANALYSIS_PENDING_KEY);
      if (newAnalysisPending === 'true') {
         if (isFirstTimeAnalysisView) {
            setUserDashboardState('SHOW_FIRST_ANALYSIS_DEEP_DIVE');
          } else {
            setUserDashboardState('SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE');
          }
          setShowRoleplayAnalysis(true);
      } else {
         setUserDashboardState('GENERAL_USE_IDLE');
      }
    } else {
      setUserDashboardState('AWAITING_FIRST_ROLEPLAY');
    }
  };
  
  const handleStartRoleplay = () => {
    console.log("Attempting to start roleplay: Navigating to /chat page...");
    navigate('/chat'); // Use navigate to change the route

    // For now, we'll log the intent.
    // No state changes needed within Dashboard.tsx itself for ROLEPLAY_ACTIVE.
    // The /chat page will handle the roleplay. Upon completion, it should set 
    // NEW_ANALYSIS_PENDING_KEY in localStorage and navigate back.
    // Dashboard.tsx's useEffect hook will then pick up this key.
  };

  const handleViewFullAnalysis = () => {
    console.log("Attempting to view full analysis. Current state:", userDashboardState);
    if (userDashboardState === 'SUBSEQUENT_ANALYSIS_READY' || userDashboardState === 'SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE') {
      setShowRoleplayAnalysis(true);
      // Optionally, directly show the full card if it was previously a teaser.
      setShowFullAnalysisCard(true); 
    } else if (userDashboardState === 'SHOW_FIRST_ANALYSIS_DEEP_DIVE') {
       setShowRoleplayAnalysis(true);
       setShowFullAnalysisCard(true);
    }
  };

  const handleDeepDiveDismissed = () => {
    console.log("Deep dive dismissed. Current user state:", userDashboardState);
    setShowRoleplayAnalysis(false);
    localStorage.setItem(FIRST_ANALYSIS_VIEWED_KEY, 'true');
    setIsFirstTimeAnalysisView(false);
    setCurrentInsightIndex(0); // Reset index when new cards are loaded
    
    const allInsights: InsightCardData[] = [];
    const analysisMetrics = {
      clarityScore: Math.random() * 100,
      fillerWordsPerMinute: Math.random() * 10, 
      talkListenRatio: Math.random(), 
      engagementLevel: Math.random() * 5, 
      paceWPM: Math.random() * 80 + 110, 
      objectionHandlingSuccessRate: Math.random(),
      positiveLanguageUse: Math.random(), 
      empathyStatementCount: Math.floor(Math.random() * 5),
      questionTypeRatio: Math.random(), 
      specificObjectionResponseQuality: Math.random() * 100, 
      closingEffectivenessScore: Math.random() * 100, 
      rapportBuildingScore: Math.random() * 100,
      transcriptSnippets: [
        { speaker: 'User', text: "So, about the pricing, can you break that down again?", type: 'NEUTRAL' },
        { speaker: 'Client', text: "That sounds much more expensive than I anticipated.", type: 'OBJECTION' },
        { speaker: 'User', text: "Well, if you consider the long-term value and the comprehensive support, it's actually quite competitive. Plus, we offer flexible payment options.", type: 'GOOD_RESPONSE' },
        { speaker: 'User', text: "Uh, yeah, the price... it is what it is, you know?", type: 'POOR_RESPONSE' },
        { speaker: 'Client', text: "I'm not sure this solves our main problem with X.", type: 'CONCERN' },
        { speaker: 'User', text: "That's a great point! Actually, Feature Y directly addresses problem X by doing A, B, and C. Many clients find that pivotal.", type: 'BRILLIANCE'}
      ]
    };

    // DataPointHighlightProps generation (ensure all have cardType: 'DATA_POINT' and onUnderstand)
    // Example: Clarity Score
    if (analysisMetrics.clarityScore > 90) {
      allInsights.push({
        id: 'clarity-exceptional-' + Date.now(), cardType: 'DATA_POINT', title: "Exceptional Clarity!", metricName: "Clarity Score",
        metricValue: Math.round(analysisMetrics.clarityScore), unit: "%",
        contextText: "Your explanations were remarkably clear. A real strength!", sentiment: 'positive',
        onUnderstand: handleUnderstandDataPointQuery, priority: 80 
      });
    } else if (analysisMetrics.clarityScore < 40) {
      allInsights.push({
        id: 'clarity-critical-' + Date.now(), cardType: 'DATA_POINT', title: "Critical: Clarity Needs Focus", metricName: "Clarity Score",
        metricValue: Math.round(analysisMetrics.clarityScore), unit: "%",
        contextText: "Significant parts of your speech were hard to follow. This is a key area for improvement.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 100 
      });
    } else if (analysisMetrics.clarityScore < 60) {
      allInsights.push({
        id: 'clarity-improvement-' + Date.now(), cardType: 'DATA_POINT', title: "Clarity Improvement Needed", metricName: "Clarity Score",
        metricValue: Math.round(analysisMetrics.clarityScore), unit: "%",
        contextText: "Some parts of your speech were a bit hard to follow. Let's work on that!", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 70
      });
    }

    // Filler Words
    if (analysisMetrics.fillerWordsPerMinute > 5) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'filler-critical-' + Date.now(), title: "Critical: High Filler Word Usage", metricName: "Filler Words",
        metricValue: parseFloat(analysisMetrics.fillerWordsPerMinute.toFixed(1)), unit: "per min", targetValue: "< 2",
        contextText: "Excessive filler words significantly impact professionalism. Urgent focus needed.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 95
      });
    } else if (analysisMetrics.fillerWordsPerMinute < 1) {
       allInsights.push({ cardType: 'DATA_POINT', 
        id: 'filler-excellent-' + Date.now(), title: "Excellent: Minimal Filler Words!", metricName: "Filler Words",
        metricValue: parseFloat(analysisMetrics.fillerWordsPerMinute.toFixed(1)), unit: "per min", targetValue: "< 2",
        contextText: "Superb control over filler words, enhancing your credibility!", sentiment: 'positive',
        onUnderstand: handleUnderstandDataPointQuery, priority: 75
      });
    }
    
    // Talk/Listen Ratio
    const talkListenTarget = "40-60%";
    if (analysisMetrics.talkListenRatio > 0.8) { 
       allInsights.push({ cardType: 'DATA_POINT', 
        id: 'talkListen-critical-' + Date.now(), title: "Critical: Dominating Conversation", metricName: "Talk Time",
        metricValue: parseFloat((analysisMetrics.talkListenRatio * 100).toFixed(0)), unit: "%", targetValue: talkListenTarget,
        contextText: "Significantly high talk time. Crucial to create more space for the client.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 90
      });
    } else if (analysisMetrics.talkListenRatio < 0.2) { 
       allInsights.push({ cardType: 'DATA_POINT', 
        id: 'talkListen-low-' + Date.now(), title: "Low Talk Time: Active Listening?", metricName: "Talk Time",
        metricValue: parseFloat((analysisMetrics.talkListenRatio * 100).toFixed(0)), unit: "%", targetValue: talkListenTarget,
        contextText: "Your talk time was low. Ensure you're guiding the conversation and sharing insights effectively.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 60 
      });
    } else if (analysisMetrics.talkListenRatio >= 0.4 && analysisMetrics.talkListenRatio <= 0.6) {
        allInsights.push({ cardType: 'DATA_POINT', 
            id: 'talkListen-ideal-' + Date.now(), title: "Ideal Talk/Listen Balance!", metricName: "Talk Time",
            metricValue: parseFloat((analysisMetrics.talkListenRatio * 100).toFixed(0)), unit: "%", targetValue: talkListenTarget,
            contextText: "Perfectly balanced conversation flow. Excellent work!", sentiment: 'positive',
            onUnderstand: handleUnderstandDataPointQuery, priority: 70
        });
    }

    // Pace
    const paceTarget = "140-160";
    if (analysisMetrics.paceWPM > 180) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'pace-critical-fast-' + Date.now(), title: "Critical: Pace Too Fast", metricName: "Speaking Pace",
        metricValue: Math.round(analysisMetrics.paceWPM), unit: "WPM", targetValue: paceTarget,
        contextText: "Significantly fast pace, likely impacting client comprehension. Needs immediate attention.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 88
      });
    } else if (analysisMetrics.paceWPM < 120) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'pace-slow-' + Date.now(), title: "Pace Too Slow", metricName: "Speaking Pace",
        metricValue: Math.round(analysisMetrics.paceWPM), unit: "WPM", targetValue: paceTarget,
        contextText: "Your pace was quite slow, which might affect engagement or imply uncertainty.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 55
      });
    } else if (analysisMetrics.paceWPM >= 140 && analysisMetrics.paceWPM <= 160) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'pace-ideal-' + Date.now(), title: "Ideal Speaking Pace", metricName: "Speaking Pace",
        metricValue: Math.round(analysisMetrics.paceWPM), unit: "WPM", targetValue: paceTarget,
        contextText: "Your speaking pace was well-calibrated and engaging.", sentiment: 'positive',
        onUnderstand: handleUnderstandDataPointQuery, priority: 60
      });
    }

    // Empathy
    const empathyTarget = "2-3";
    if (analysisMetrics.empathyStatementCount === 0) {
        allInsights.push({ cardType: 'DATA_POINT', 
            id: 'empathy-critical-none-' + Date.now(), title: "Critical: No Empathy Shown", metricName: "Empathy Statements",
            metricValue: analysisMetrics.empathyStatementCount, unit: "statements", targetValue: empathyTarget,
            contextText: "No empathy statements detected. This is crucial for rapport and trust building; major focus area.", sentiment: 'negative',
            onUnderstand: handleUnderstandDataPointQuery, priority: 92
        });
    } else if (analysisMetrics.empathyStatementCount >= 2 && analysisMetrics.empathyStatementCount <=3) {
        allInsights.push({ cardType: 'DATA_POINT', 
            id: 'empathy-good-' + Date.now(), title: "Good Use of Empathy!", metricName: "Empathy Statements",
            metricValue: analysisMetrics.empathyStatementCount, unit: "statements", targetValue: empathyTarget,
            contextText: "You effectively used empathy to connect with the client.", sentiment: 'positive',
            onUnderstand: handleUnderstandDataPointQuery, priority: 65
        });
    }
    
    // Positive Language
    if (analysisMetrics.positiveLanguageUse < 0.5) {
        allInsights.push({ cardType: 'DATA_POINT', 
            id: 'positiveLang-low-' + Date.now(), title: "Low Positive Language", metricName: "Positive Language Ratio",
            metricValue: `${(analysisMetrics.positiveLanguageUse * 100).toFixed(0)}%`, unit: "", targetValue: "> 80%",
            contextText: "More positive framing could improve client reception and confidence.", sentiment: 'negative',
            onUnderstand: handleUnderstandDataPointQuery, priority: 50
        });
    } else if (analysisMetrics.positiveLanguageUse > 0.9) {
        allInsights.push({ cardType: 'DATA_POINT', 
            id: 'positiveLang-high-' + Date.now(), title: "Excellent Positive Framing!", metricName: "Positive Language Ratio",
            metricValue: `${(analysisMetrics.positiveLanguageUse * 100).toFixed(0)}%`, unit: "", targetValue: "> 80%",
            contextText: "Your consistent use of positive language is a great asset!", sentiment: 'positive',
            onUnderstand: handleUnderstandDataPointQuery, priority: 70
        });
    }

    // Question Type
    const questionTarget = "> 60%";
    if (analysisMetrics.questionTypeRatio < 0.3) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'questionType-critical-' + Date.now(), title: "Critical: Questioning Technique", metricName: "Open-Ended Questions",
        metricValue: `${(analysisMetrics.questionTypeRatio * 100).toFixed(0)}%`, unit: "", targetValue: questionTarget,
        contextText: "Mostly closed questions. Focus on asking 'how', 'why', 'tell me more' to encourage detailed responses.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 93
      });
    } else if (analysisMetrics.questionTypeRatio > 0.75) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'questionType-excellent-' + Date.now(), title: "Excellent Questioning!", metricName: "Open-Ended Questions",
        metricValue: `${(analysisMetrics.questionTypeRatio * 100).toFixed(0)}%`, unit: "", targetValue: questionTarget,
        contextText: "Great use of open-ended questions to facilitate deeper conversation.", sentiment: 'positive',
        onUnderstand: handleUnderstandDataPointQuery, priority: 78
      });
    }

    // Objection Quality
    const objectionQualityTarget = "> 80";
    if (analysisMetrics.specificObjectionResponseQuality < 50) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'objResponse-poor-' + Date.now(), title: "Objection Handling Needs Work", metricName: "Response to Price Objection",
        metricValue: `${analysisMetrics.specificObjectionResponseQuality.toFixed(0)}/100`, unit: "", targetValue: objectionQualityTarget,
        contextText: "Response to the price objection was unclear or ineffective. Let's review strategies.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 86
      });
    }

    // Closing Score
    const closingTargetScore = "> 75";
    if (analysisMetrics.closingEffectivenessScore < 50) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'closing-weak-' + Date.now(), title: "Weak Closing Attempt", metricName: "Closing Effectiveness",
        metricValue: `${analysisMetrics.closingEffectivenessScore.toFixed(0)}/100`, unit: "", targetValue: closingTargetScore,
        contextText: "The ask for next steps was hesitant or unclear. Confidence in closing is key.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 89
      });
    } else if (analysisMetrics.closingEffectivenessScore > 85) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'closing-strong-' + Date.now(), title: "Strong Closing!", metricName: "Closing Effectiveness",
        metricValue: `${analysisMetrics.closingEffectivenessScore.toFixed(0)}/100`, unit: "", targetValue: closingTargetScore,
        contextText: "Clear, confident, and effective ask for the next steps. Well done!", sentiment: 'positive',
        onUnderstand: handleUnderstandDataPointQuery, priority: 77
      });
    }

    // Rapport Score
    const rapportTargetScore = "> 70";
    if (analysisMetrics.rapportBuildingScore < 50) {
      allInsights.push({ cardType: 'DATA_POINT', 
        id: 'rapport-low-' + Date.now(), title: "Improve Rapport Building", metricName: "Initial Rapport",
        metricValue: `${analysisMetrics.rapportBuildingScore.toFixed(0)}/100`, unit: "", targetValue: rapportTargetScore,
        contextText: "Struggled to build a strong connection early on. Focus on active listening and finding common ground.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 68
      });
    }

    // Key Moment Card Generation
    const brilliantMoment = analysisMetrics.transcriptSnippets.find(s => s.type === 'BRILLIANCE');
    if (brilliantMoment) {
      allInsights.push({
        id: 'keymoment-brilliance-' + Date.now(), cardType: 'KEY_MOMENT', momentType: 'BRILLIANCE',
        quote: brilliantMoment.text, speaker: brilliantMoment.speaker as 'User' | 'AI' | 'Client',
        skillArea: 'Objection Handling', 
        explanation: "This was a fantastic way to address the client's concern and redirect the conversation.",
        priority: 85, 
        onExploreMoment: handleExploreKeyMoment
      });
    }
    const learningOpportunityMoment = analysisMetrics.transcriptSnippets.find(s => s.type === 'POOR_RESPONSE');
    if (learningOpportunityMoment) {
      allInsights.push({
        id: 'keymoment-learning-' + Date.now(), cardType: 'KEY_MOMENT', momentType: 'LEARNING_OPPORTUNITY',
        quote: learningOpportunityMoment.text, speaker: learningOpportunityMoment.speaker as 'User' | 'AI' | 'Client',
        skillArea: 'Pricing Discussion', 
        explanation: "This response could be strengthened. Consider alternative ways to address price sensitivity.",
        priority: 96, 
        onExploreMoment: handleExploreKeyMoment
      });
    }

    // Resource Spotlight Card Generation
    if (analysisMetrics.clarityScore < 60) {
      allInsights.push({
        id: 'resource-clarity-' + Date.now(), cardType: 'RESOURCE_SPOTLIGHT', skillArea: "Clarity & Conciseness",
        resourceTitle: "Article: The Art of Clear Communication in Sales", resourceType: 'ARTICLE',
        resourceUrl: "https://example.com/article-clarity-sales",
        summary: "Learn techniques to structure your speech, eliminate jargon, and ensure your message is understood.",
        priority: (analysisMetrics.clarityScore < 40 ? 80 : 60),
        onViewResource: handleViewResource
      });
    }
    if (analysisMetrics.questionTypeRatio < 0.4) {
        allInsights.push({
          id: 'resource-questioning-' + Date.now(), cardType: 'RESOURCE_SPOTLIGHT', skillArea: "Effective Questioning",
          resourceTitle: "Guide: Mastering Open-Ended Questions", resourceType: 'MODULE',
          resourceUrl: "https://example.com/guide-open-questions",
          summary: "Unlock deeper client insights by learning how to formulate and use powerful open-ended questions.",
          priority: 75, 
          onViewResource: handleViewResource
        });
      }

    if (allInsights.length === 0) {
        allInsights.push({
            id: 'general-feedback-' + Date.now(), cardType: 'DATA_POINT', 
            title: "Session Snapshot", metricName: "Overall Engagement",
            metricValue: "Review Complete", 
            contextText: "Consider your overall approach and areas you felt strong or could improve. Ask me anything!", sentiment: 'neutral',
            onUnderstand: handleUnderstandDataPointQuery, priority: 10
        });
    }
    const sortedInsights = allInsights.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    setInsightCards(sortedInsights);
    // setUserDashboardState('GENERAL_USE_IDLE'); // Defer this
    setIsFocusedInsightMode(true); // Activate focused mode
    setChatBarInitialQuery('');

    /* --- Start of block to comment out for removed Performance Snapshots ---
    // Populate performance snapshots from the main analysis data and additional metrics
    const newSnapshots: PerformanceSnapshotCardProps[] = [];
    MOCK_ROLEPLAY_ANALYSIS.keyMetrics?.forEach((metric, index) => {
      newSnapshots.push({
        id: `snapshot-km-${index}-${Date.now()}`,
        metricName: metric.label,
        metricValue: metric.value,
        trend: metric.trend as 'up' | 'down' | 'neutral', // Added type assertion
        icon: Zap, // Placeholder icon, consider mapping specific icons
        interpretation: metric.trend === 'up' ? 'Good' : metric.trend === 'down' ? 'Needs Attention' : undefined,
      });
    });

    // Add some from analysisMetrics for variety
    if (analysisMetrics.clarityScore) {
      newSnapshots.push({
        id: `snapshot-clarity-${Date.now()}`,
        metricName: "Clarity Score",
        metricValue: Math.round(analysisMetrics.clarityScore),
        unit: "%",
        trend: analysisMetrics.clarityScore > 80 ? 'up' : analysisMetrics.clarityScore < 50 ? 'down' : 'neutral',
        icon: Lightbulb,
        interpretation: analysisMetrics.clarityScore > 80 ? 'Excellent' : analysisMetrics.clarityScore < 50 ? 'Focus Area' : 'Okay',
      });
    }
    if (analysisMetrics.paceWPM) {
      newSnapshots.push({
        id: `snapshot-pace-${Date.now()}`,
        metricName: "Speaking Pace",
        metricValue: Math.round(analysisMetrics.paceWPM),
        unit: "WPM",
        trend: analysisMetrics.paceWPM > 160 ? 'down' : analysisMetrics.paceWPM < 140 ? 'down' : 'up', // 'up' means good pace (in range)
        icon: RefreshCw, // Example icon
        interpretation: analysisMetrics.paceWPM >= 140 && analysisMetrics.paceWPM <= 160 ? 'Ideal' : 'Review Pace',
      });
    }
    // Add more based on other analysisMetrics as needed

    setPerformanceSnapshots(newSnapshots);
    setCurrentPerformanceSnapshotIndex(0); // Reset index for top carousel
    --- End of block to comment out --- */
  };

  const handleShowNextInsight = () => {
    setCurrentInsightIndex(prevIndex => (prevIndex + 1) % insightCards.length);
  };

  const handleShowPreviousInsight = () => {
    setCurrentInsightIndex(prevIndex => (prevIndex - 1 + insightCards.length) % insightCards.length);
  };

  // --- Restored General Purpose Handlers ---
  const handleUnderstandDataPointQuery = async (details: { metricName: string; metricValue: string | number; sentiment: string }) => {
    const { metricName, metricValue, sentiment } = details;
    let query = "";
    if (sentiment === 'positive') {
      query = `I did well on ${metricName} (value: ${metricValue}). Can you tell me more about why this is good and how I can maintain this?`;
    } else if (sentiment === 'negative') {
      query = `My ${metricName} was ${metricValue}. Can you explain what this means and give me specific tips to improve this aspect?`;
    } else {
      query = `My ${metricName} is ${metricValue}. Can you give me some context or insights about this particular data point?`;
    }
    // setChatBarInitialQuery(query); // Old behavior
    await handleTopChatSendMessage(query); // New: Send message directly
  };

  const handleExploreKeyMoment = async (quote: string, skillArea?: string) => {
    console.log("Exploring key moment:", { quote, skillArea });
    const query = `Tell me more about this moment: \"${quote}\"${skillArea ? ` (related to ${skillArea})` : ''}. Why was it good/bad and how can I learn from it?`;
    // setChatBarInitialQuery(query); // Old behavior
    await handleTopChatSendMessage(query); // New: Send message directly
  };

  const handleViewResource = (url: string, title: string) => {
    console.log(`User wants to view resource: ${title} at ${url}`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleStartAnotherRoleplay = () => {
    setShowRoleplayAnalysis(false); 
    setInsightCards([]); 
    setUserDashboardState('AWAITING_FIRST_ROLEPLAY'); 
    setChatBarInitialQuery('');
    console.log("Starting another roleplay, state set to AWAITING_FIRST_ROLEPLAY");
  };

  const handleExploreTraining = () => {
    console.log("[Dashboard] handleExploreTraining called. Would navigate to training library/modules.");
  };
  
  // --- Handlers for DevToolsPanel ---
  const handleToggleGreetingComplete = () => setGreetingComplete(prev => !prev);
  const handleToggleShowAISummaryCard = () => setShowAISummaryCard(prev => !prev);
  const handleToggleShowExcitementCard = () => setShowExcitementCard(prev => !prev);
  const handleToggleShowRoleplayAnalysis = () => setShowRoleplayAnalysis(prev => !prev);
  const handleToggleIsFirstTimeAnalysisView = () => setIsFirstTimeAnalysisView(prev => !prev);
  const handleToggleShowFullAnalysisCardView = () => setShowFullAnalysisCard(prev => !prev);
  
  const handleResetOnboardingFlow = () => { // This is the main reset for dev panel
    localStorage.removeItem(ONBOARDING_DATA_KEY);
    localStorage.removeItem(NEW_ANALYSIS_PENDING_KEY);
    localStorage.removeItem(USER_ROLEPLAY_KEY);
    localStorage.removeItem(GREETING_COMPLETE_KEY);
    localStorage.removeItem(FIRST_ANALYSIS_VIEWED_KEY);
    localStorage.removeItem(CHAT_LOG_STORAGE_KEY); // Clear chat log on full reset
    localStorage.removeItem(COMPLETED_ROLEPLAYS_COUNT_KEY); // Clear roleplay count
    localStorage.removeItem(REVEALED_FEATURES_STORAGE_KEY); // Clear revealed features
    // Add removal for AISummaryCard specific keys
    localStorage.removeItem('ai_coach_onboarding_complete');
    localStorage.removeItem('ai_coach_messages');

    setShowAISummaryCard(false);
    setShowExcitementCard(false);
    setShowRoleplayAnalysis(false);
    setGreetingComplete(false);
    setUserDashboardState('NEW_USER_NO_DATA'); // Or 'AWAITING_FIRST_ROLEPLAY' if preferred start
    setUserName(userData.name); // Reset name
    localStorage.setItem(USER_NAME_STORAGE_KEY, userData.name);
    setIsFirstTimeAnalysisView(true);
    setHasCompletedRoleplay(false);
    setInsightCards([]);
    setCompletedRoleplaysCount(0); // Reset count state
    setRevealedFeatureIds({}); // Reset revealed features state
    setChatLog([]); // Reset chat log state
    setChatBarInitialQuery('');
    setOnboardingSummaryData(null);
    setRoleplayAnalysisData(null);
    setIsFocusedInsightMode(false); // Reset focused mode
    console.log("Dev Tool: Full Onboarding and State Reset");
    window.location.reload(); // Force refresh to clear all states
  };

  const handleSimulateRoleplayDone = () => { // Renamed from handleSimulateRoleplayDoneDev
    localStorage.setItem(NEW_ANALYSIS_PENDING_KEY, 'true');
    setHasCompletedRoleplay(true);
    localStorage.setItem(USER_ROLEPLAY_KEY, 'true');
    setCurrentAnalysisData({ 
      deepDiveSummary: "Simulated deep dive analysis is ready after your first roleplay!",
      focusedSummary: "Simulated focused feedback is ready for your review.",
      clarity: 75, confidence: 80, engagement: 60,
      // ... other mock data for PostRoleplayAnalysisCard
    });
    setRoleplayAnalysisData(MOCK_ROLEPLAY_ANALYSIS); // Ensure this is populated for teaser
    setCompletedRoleplaysCount(prevCount => prevCount + 1); // Increment count here as well
    
    console.log("Dev Tool: Simulated Roleplay Done. isFirstTimeAnalysisView:", isFirstTimeAnalysisView);
    if (isFirstTimeAnalysisView) {
      setUserDashboardState('SHOW_FIRST_ANALYSIS_DEEP_DIVE');
    } else {
      setUserDashboardState('SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE');
    }
    setShowRoleplayAnalysis(true); 
  };
  
  // --- NEW: Helper function to manage simulated card display logic ---
  const updateSimulatedCards = (newCardToAdd: InsightCardData) => {
    setInsightCards(prevCards => {
      // Rule 1: Filter out any card of the same type as the new card.
      let updatedCards = prevCards.filter(card => card.cardType !== newCardToAdd.cardType);
      
      // Add the new card (it will be the most recent of its type and at the end of the array).
      updatedCards.push(newCardToAdd);
      
      // Rule 2: If more than 2 cards, remove the oldest (which will be at the start of the array).
      if (updatedCards.length > 2) {
        updatedCards.shift(); // Removes the first element
      }
      return updatedCards;
    });
  };

  const handleSimulatePositiveHighlight = () => {
    const positiveCard: DataPointHighlightProps = {
      id: 'dev-positive-' + Date.now(), cardType: 'DATA_POINT', title: "Dev: Great Job!", metricName: "Dev Metric (Positive)",
      metricValue: "100", unit: "%", contextText: "This is a simulated positive highlight.", sentiment: 'positive',
      onUnderstand: handleUnderstandDataPointQuery, priority: 80
    };
    updateSimulatedCards(positiveCard);
  };

  const handleSimulateNegativeHighlight = () => {
    const negativeCard: DataPointHighlightProps = {
      id: 'dev-negative-' + Date.now(), cardType: 'DATA_POINT', title: "Dev: Needs Improvement", metricName: "Dev Metric (Negative)",
      metricValue: "20", unit: "%", contextText: "This is a simulated negative highlight.", sentiment: 'negative',
      onUnderstand: handleUnderstandDataPointQuery, priority: 100
    };
    updateSimulatedCards(negativeCard);
  };

  const handleSimulateNeutralHighlight = () => {
    const neutralCard: DataPointHighlightProps = {
      id: 'dev-neutral-' + Date.now(), cardType: 'DATA_POINT', title: "Dev: FYI", metricName: "Dev Metric (Neutral)",
      metricValue: "N/A", contextText: "This is a simulated neutral highlight.", sentiment: 'neutral',
      onUnderstand: handleUnderstandDataPointQuery, priority: 10
    };
    updateSimulatedCards(neutralCard);
  };

  const handleSimulateMixedHighlights = () => {
    const mixedSet: DataPointHighlightProps[] = [
      { 
        id: 'dev-mixed-pos-' + Date.now(), cardType: 'DATA_POINT', title: "Dev Mixed: Positive Spark", metricName: "Positivity Spark",
        metricValue: "High", contextText: "You showed great enthusiasm!", sentiment: 'positive',
        onUnderstand: handleUnderstandDataPointQuery, priority: 70
      },
      { 
        id: 'dev-mixed-neg-' + Date.now(), cardType: 'DATA_POINT', title: "Dev Mixed: Pacing Issue", metricName: "Speaking Pace",
        metricValue: "Too Fast", unit: "WPM", contextText: "Try to slow down a bit for clarity.", sentiment: 'negative',
        onUnderstand: handleUnderstandDataPointQuery, priority: 90
      },
      {
        id: 'dev-mixed-neu-' + Date.now(), cardType: 'DATA_POINT', title: "Dev Mixed: Talk Time", metricName: "Talk Time",
        metricValue: "15", unit: "min", contextText: "Total duration you spoke during the session.", sentiment: 'neutral',
        onUnderstand: handleUnderstandDataPointQuery, priority: 30
      }
    ];
    // Sort this specific mixed set by priority and pick the highest one to add
    const highestPriorityMixedCard = mixedSet.sort((a,b) => (b.priority || 0) - (a.priority || 0))[0];
    if (highestPriorityMixedCard) {
      updateSimulatedCards(highestPriorityMixedCard);
    }
  };

  const handleClearDataHighlights = () => {
    setInsightCards([]);
    setIsFocusedInsightMode(false); // Also clear focused mode if insights are cleared
  };

  const handleSimulateKeyMomentCard = () => {
    const keyMoment: KeyMomentCardProps = {
      id: 'dev-keymoment-' + Date.now(),
      cardType: 'KEY_MOMENT',
      momentType: 'BRILLIANCE',
      quote: "This is a simulated brilliant moment from the user! Handling objections like a pro.",
      speaker: 'User',
      skillArea: 'Objection Handling',
      explanation: 'Review this simulated key moment.', // Changed explanation
      priority: 100, // Ensure it shows up
      onExploreMoment: handleExploreKeyMoment,
    };
    updateSimulatedCards(keyMoment);
  };

  const handleSimulateResourceSpotlightCard = () => {
    const resourceCard: ResourceSpotlightCardProps = {
      id: 'dev-resource-' + Date.now(),
      cardType: 'RESOURCE_SPOTLIGHT',
      skillArea: 'Product Knowledge',
      resourceTitle: 'Dev Simulated: Advanced Product Guide',
      resourceType: 'MODULE',
      resourceUrl: 'https://example.com/dev-module-product-knowledge',
      summary: 'A deep dive into advanced features and use cases for Product X (simulated).',
      priority: 100, // Ensure it shows up
      onViewResource: handleViewResource,
    };
    updateSimulatedCards(resourceCard);
  };

  // This effect handles the initial "new analysis pending" state
  useEffect(() => {
    const newAnalysisPending = localStorage.getItem(NEW_ANALYSIS_PENDING_KEY);
    if (newAnalysisPending === 'true' && greetingComplete) { // Only trigger if greeting is done
      console.log("New analysis detected by useEffect. First time view:", isFirstTimeAnalysisView);
      
      // Ensure roleplayAnalysisData is populated for the teaser view
      setRoleplayAnalysisData(MOCK_ROLEPLAY_ANALYSIS); 
      setCurrentAnalysisData({ // This might be redundant if MOCK_ROLEPLAY_ANALYSIS is comprehensive
        deepDiveSummary: MOCK_ROLEPLAY_ANALYSIS.deepDiveSummary,
        focusedSummary: MOCK_ROLEPLAY_ANALYSIS.focusedSummary,
        // ... other essential fields from MOCK_ROLEPLAY_ANALYSIS
      });

      if (isFirstTimeAnalysisView) {
        setUserDashboardState('SHOW_FIRST_ANALYSIS_DEEP_DIVE');
      } else {
        setUserDashboardState('SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE');
      }
      setShowRoleplayAnalysis(true); 
    }
  }, [isFirstTimeAnalysisView, greetingComplete]); // Added greetingComplete dependency

  const handleFocusedAnalysisDismissed = () => {
    console.log("Focused analysis dismissed.");
    setShowRoleplayAnalysis(false);
    // Unlike deep dive, we don't necessarily set FIRST_ANALYSIS_VIEWED_KEY here as it might not be the first overall.
    // We should ensure insight cards are repopulated or a general state is set.
    setCurrentInsightIndex(0); // Reset index if new cards are loaded
    
    // Re-use the same logic as deep dive dismissal for populating insight cards
    // This assumes that dismissing any analysis view should lead back to the main insights dashboard.
    const allInsights: InsightCardData[] = [];
    const analysisMetrics = {
      clarityScore: Math.random() * 100,
      fillerWordsPerMinute: Math.random() * 10, 
      talkListenRatio: Math.random(), 
      engagementLevel: Math.random() * 5, 
      paceWPM: Math.random() * 80 + 110, 
      objectionHandlingSuccessRate: Math.random(),
      positiveLanguageUse: Math.random(), 
      empathyStatementCount: Math.floor(Math.random() * 5),
      questionTypeRatio: Math.random(), 
      specificObjectionResponseQuality: Math.random() * 100, 
      closingEffectivenessScore: Math.random() * 100, 
      rapportBuildingScore: Math.random() * 100,
      transcriptSnippets: [
        { speaker: 'User', text: "So, about the pricing, can you break that down again?", type: 'NEUTRAL' },
        { speaker: 'Client', text: "That sounds much more expensive than I anticipated.", type: 'OBJECTION' },
        { speaker: 'User', text: "Well, if you consider the long-term value and the comprehensive support, it's actually quite competitive. Plus, we offer flexible payment options.", type: 'GOOD_RESPONSE' },
        { speaker: 'User', text: "Uh, yeah, the price... it is what it is, you know?", type: 'POOR_RESPONSE' },
        { speaker: 'Client', text: "I'm not sure this solves our main problem with X.", type: 'CONCERN' },
        { speaker: 'User', text: "That's a great point! Actually, Feature Y directly addresses problem X by doing A, B, and C. Many clients find that pivotal.", type: 'BRILLIANCE'}
      ]
    };
    // (The logic for populating allInsights based on analysisMetrics would be identical to handleDeepDiveDismissed)
    // For brevity, assuming it's the same and just calling it here if it were a separate function.
    // For now, copying the essential parts:
    if (analysisMetrics.clarityScore > 90) {
      allInsights.push({
        id: 'clarity-exceptional-' + Date.now(), cardType: 'DATA_POINT', title: "Exceptional Clarity!", metricName: "Clarity Score",
        metricValue: Math.round(analysisMetrics.clarityScore), unit: "%",
        contextText: "Your explanations were remarkably clear. A real strength!", sentiment: 'positive',
        onUnderstand: handleUnderstandDataPointQuery, priority: 80 
      });
    } // ... (add more data point generations as in handleDeepDiveDismissed)
    // Key Moment Card Generation
    const brilliantMoment = analysisMetrics.transcriptSnippets.find(s => s.type === 'BRILLIANCE');
    if (brilliantMoment) {
      allInsights.push({
        id: 'keymoment-brilliance-' + Date.now(), cardType: 'KEY_MOMENT', momentType: 'BRILLIANCE',
        quote: brilliantMoment.text, speaker: brilliantMoment.speaker as 'User' | 'AI' | 'Client',
        skillArea: 'Objection Handling', 
        explanation: "This was a fantastic way to address the client's concern and redirect the conversation.",
        priority: 85, 
        onExploreMoment: handleExploreKeyMoment
      });
    }
     if (allInsights.length === 0) {
        allInsights.push({
            id: 'general-feedback-' + Date.now(), cardType: 'DATA_POINT', 
            title: "Session Snapshot", metricName: "Overall Engagement",
            metricValue: "Review Complete", 
            contextText: "Consider your overall approach and areas you felt strong or could improve. Ask me anything!", sentiment: 'neutral',
            onUnderstand: handleUnderstandDataPointQuery, priority: 10
        });
    }
    const sortedInsights = allInsights.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    setInsightCards(sortedInsights);
    // setUserDashboardState('GENERAL_USE_IDLE'); // Defer this
    setIsFocusedInsightMode(true); // Activate focused mode
    setChatBarInitialQuery('');
  };

  // --- Render Dev Content Function (Restored) ---
  // This function is used by the dev tools to display specific components in isolation.
  const renderDevContent = (
    mode: DevDisplayMode,
    currentUserName: string,
    currentOnboardingSummaryData: any,
    currentRoleplayAnalysisData: any,
    currentAnalysisLoading: boolean,
    currentAnalysisError: string | null,
    onOnboardingCompleteHandler: () => void,
    onStartRoleplayHandler: () => void,
    onNavigateToTrainingHandler: (id: string, type: "module" | "practice") => void,
    onDeepDiveDismissedHandler: () => void,
    onViewFocusedAnalysisHandler: () => void,
    onboardingGoalSkillName?: string
  ): JSX.Element | null => {
    switch (mode) {
      case 'AISUMMARY':
        return (
          <div className="w-full max-w-3xl lg:max-w-4xl">
            <AISummaryCard onOnboardingComplete={onOnboardingCompleteHandler} />
          </div>
        );
      case 'EXCITEMENT':
        return (
          <div className="w-full max-w-3xl lg:max-w-4xl">
            <ExcitementCard
              userName={currentUserName}
              productInfo={currentOnboardingSummaryData?.productInfo || "Product X"}
              audienceInfo={currentOnboardingSummaryData?.audienceInfo || "Prospects"}
              salesStyle={currentOnboardingSummaryData?.salesStyle || "Consultative"}
              salesEnvironment={currentOnboardingSummaryData?.salesEnvironment || "B2B"}
              userAccountStatus={userAccountStatus}
              onExploreDashboard={() => setDevDisplayMode('NORMAL_FLOW')}
            />
          </div>
        );
      case 'DEEP_DIVE_ANALYSIS':
      case 'FOCUSED_ANALYSIS':
        return (
          <div className="w-full max-w-3xl lg:max-w-4xl">
            <PostRoleplayAnalysisCard
              analysis={currentRoleplayAnalysisData || MOCK_ROLEPLAY_ANALYSIS}
              isLoading={currentAnalysisLoading}
              error={currentAnalysisError}
              isFirstAnalysis={mode === 'DEEP_DIVE_ANALYSIS'}
              onNavigateToTraining={onNavigateToTrainingHandler}
              onDeepDiveDismissed={mode === 'DEEP_DIVE_ANALYSIS' ? onDeepDiveDismissedHandler : undefined}
              onboardingGoalSkillName={mode === 'DEEP_DIVE_ANALYSIS' ? onboardingGoalSkillName : undefined}
            />
          </div>
        );
      case 'ANALYSIS_TEASER':
         return (
           <motion.div
             className="w-full max-w-3xl lg:max-w-4xl p-6 bg-white rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow mx-auto my-10 text-center flex flex-col items-center"
             onClick={onViewFocusedAnalysisHandler}
             initial={{ opacity: 0, scale: 0.95, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             transition={{ duration: 0.4, ease: "easeOut" }}
             whileHover={{ y: -5 }}
           >
             <div className="p-3 bg-primary/10 rounded-full mb-4">
                <Sparkles size={28} className="text-primary" />
             </div>
             <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Dev Analysis Teaser Ready
             </h3>
             <p className="text-sm text-gray-600 mb-4 px-3 leading-relaxed line-clamp-2">
                This is a dev teaser for analysis. Click to view.
             </p>
             <div className="mt-auto">
               <Button variant="ghost" className="text-primary hover:text-primary-dark text-sm font-medium">
                 View Dev Analysis <ChevronDown size={16} className="ml-1" />
               </Button>
             </div>
           </motion.div>
         );
      case 'NORMAL_FLOW':
      default:
        return null; // Or some default message like <p>Select a dev display mode.</p>
    }
  };

  // Placeholder handler for the new top-level chat bar
  const handleTopChatSendMessage = async (message: string) => {
    console.log("[Dashboard - TopChatBar] User message sent:", message);
    
    // --- NEW: Ensure chat is open when a message is sent ---
    if (!isChatLogOpen) {
      setIsChatLogOpen(true);
      // Optional: decide if opening full history is desired or just the compact view
      // setShowFullChatHistory(false); // Keep it compact by default when auto-opening
    }
    // --- END NEW ---
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date(),
    };
    // setChatLog(prevLog => [...prevLog, userMessage]); // Original
    // Ensure correct timestamp parsing if loaded from localStorage
    setChatLog(prevLog => {
        const newLog = [...prevLog, userMessage];
        return newLog.map(msg => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
        }));
    });
    
    setChatBarInitialQuery(''); 
    setIsAiTyping(true); // AI starts "typing"

    // Simulate API call and mock AI response
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate 1.2s delay

    let aiResponseText = "I hear you! You said: " + message;
    if (message.toLowerCase().includes("hello") || message.toLowerCase().includes("hi")) {
      aiResponseText = "Hello there! It's great to connect. How can I assist with your sales coaching today?";
    } else if (message.toLowerCase().includes("how are you")) {
      aiResponseText = "I'm operating at peak efficiency! Ready to help you achieve your sales goals.";
    } else if (message.toLowerCase().includes("test")) {
      aiResponseText = "Test acknowledged! Everything seems to be working on my end.";
    } else if (message.toLowerCase().includes("roleplay")) {
      aiResponseText = "Ah, roleplay! A fantastic way to practice. Are you looking to start a new session, or review a past one?";
    } else if (message.toLowerCase().includes("help")) {
      aiResponseText = "I can help with a variety of things, such as: \n- Starting a new roleplay \n- Analyzing your performance \n- Practicing specific skills (e.g., objection handling) \n- Providing information on sales techniques. \nWhat's on your mind?";
    }

    const aiMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: aiResponseText,
      timestamp: new Date(),
    };
    // setChatLog(prevLog => [...prevLog, aiMessage]); // Original
    setChatLog(prevLog => {
        const newLog = [...prevLog, aiMessage];
        return newLog.map(msg => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
        }));
    });
    setIsAiTyping(false); // AI finishes "typing"

    console.log("[Mock AI] Response:", aiResponseText);
  };

  // Effect to handle page scroll for auto-collapsing chat log
  useEffect(() => {
    const SCROLL_THRESHOLD = 50; // Pixels to scroll before chat auto-collapses

    // Effect for page scroll to auto-collapse chat
    const handlePageScroll = () => {
      // console.log('Scroll event triggered. window.scrollY:', window.scrollY, 'isChatLogOpen:', isChatLogOpen, 'showFullChatHistory:', showFullChatHistory, 'userDashboardState:', userDashboardState);
      if (window.scrollY > SCROLL_THRESHOLD && isChatLogOpen && !showFullChatHistory) {
        // console.log('Auto-collapsing chat log due to scroll.');
        setIsChatLogOpen(false);
      }
    };

    window.addEventListener('scroll', handlePageScroll);
    return () => {
      window.removeEventListener('scroll', handlePageScroll);
    };
  }, [isChatLogOpen, showFullChatHistory, userDashboardState]); // Added userDashboardState to dependencies

  // Effect for click outside to collapse chat in Focused Insight Mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatBarRef.current &&
        !chatBarRef.current.contains(event.target as Node) &&
        isFocusedInsightMode &&
        isChatLogOpen &&
        !showFullChatHistory
      ) {
        setIsChatLogOpen(false);
      }
    };

    if (isFocusedInsightMode && isChatLogOpen && !showFullChatHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFocusedInsightMode, isChatLogOpen, showFullChatHistory, setIsChatLogOpen]);

  // --- Handler to reset roleplay count for dev tools ---
  const handleResetRoleplayCount = () => {
    setCompletedRoleplaysCount(0);
    localStorage.setItem(COMPLETED_ROLEPLAYS_COUNT_KEY, '0'); // Ensure count is also set to 0 in storage
    setRevealedFeatureIds({}); // Also reset revealed features when roleplay count resets
    localStorage.removeItem(REVEALED_FEATURES_STORAGE_KEY); // Explicitly remove from storage too
    
    // Determine appropriate state after reset
    // If greeting is complete, user should be prompted for first roleplay again.
    // Otherwise, the normal flow via loadUserData/useEffect will handle initial state (e.g. TypewriterGreeting).
    if (localStorage.getItem(GREETING_COMPLETE_KEY) === 'true') {
      setUserDashboardState('AWAITING_FIRST_ROLEPLAY'); 
    } 
    // No else needed, loadUserData will set initial state like TypewriterGreeting if greeting not complete

    console.log("Dev Tool: Completed Roleplays Count Reset to 0, Revealed Features Cleared, and State possibly reset to AWAITING_FIRST_ROLEPLAY");
  };

  // Modified to send a message to chat instead of navigating directly
  const handleFeatureNavigation = (featureTitle: string) => {
    console.log(`Attempting to generate chat message for feature: ${featureTitle}`);
    const userMessage = `Tell me more about ${featureTitle}.`;
    // Assuming handleTopChatSendMessage is available and handles the async nature
    handleTopChatSendMessage(userMessage);
    // navigate(path); // Old navigation logic removed
  };

  const handleFeatureRevealed = (featureId: string) => {
    setRevealedFeatureIds(prev => {
      const newRevealed = { ...prev, [featureId]: true };
      localStorage.setItem(REVEALED_FEATURES_STORAGE_KEY, JSON.stringify(newRevealed));
      return newRevealed;
    });
  };

  const handleMethodologyDisplayClick = () => {
    console.log("Methodology display clicked. Current methodology:", currentUserMethodology);
    setShowMethodologyChangeModal(true);
  };

  const handleConfirmMethodologyChange = () => {
    console.log("User confirmed methodology change. Setting to 'Pending Selection'. Next step would be to show selection options.");
    setMethodologyBeforeChangeAttempt(currentUserMethodology); // Store current before changing
    setCurrentUserMethodology('Pending Selection');
    setShowMethodologyChangeModal(false);
    setShowMethodologySelectionModal(true); // Open the new selection modal
  };

  // --- NEW Handlers for the MethodologySelectionModal ---
  const handleFinalizeMethodologySelection = (newMethodology: SalesMethodology) => {
    if (newMethodology && newMethodology !== 'Pending Selection') {
      setCurrentUserMethodology(newMethodology);
      console.log("User finalized methodology selection to:", newMethodology);
    }
    setShowMethodologySelectionModal(false);
  };

  const handleCancelMethodologySelection = () => {
    if (methodologyBeforeChangeAttempt) {
      setCurrentUserMethodology(methodologyBeforeChangeAttempt); // Revert to previous
      console.log("User cancelled methodology selection. Reverted to:", methodologyBeforeChangeAttempt);
    }
    setShowMethodologySelectionModal(false);
    setMethodologyBeforeChangeAttempt(null); // Clear the stored value
  };
  // --- END NEW Handlers ---

  // --- NEW: Handler for Instant Onboarding Completion (Dev Tool) ---
  const handleInstantOnboardingComplete = () => {
    console.log("[Dashboard] DEV TOOL: Instant Onboarding Complete triggered.");

    // 1. Set Greeting Complete
    setGreetingComplete(true);
    localStorage.setItem(GREETING_COMPLETE_KEY, 'true');

    // 2. Create and store mock "complete" onboarding data
    const mockOnboardingData = {
      stage: 'complete', // Crucial for handleOnboardingComplete logic
      answer_q1: "Our amazing Product X",
      answer_q2: "Tech-savvy SMB owners",
      answer_q3_experience: "3-5 years", // Example value, might not be directly used by current handleOnboardingComplete
      answer_q4_style: "Consultative",
      businessType: "B2B SaaS", // Corresponds to salesEnvironment in handleOnboardingComplete
      // Add any other fields that might be expected or useful for downstream logic
    };
    localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(mockOnboardingData));

    // 3. Call the existing handleOnboardingComplete to trigger UI updates & methodology suggestion
    handleOnboardingComplete();

    // 4. Ensure other states are consistent (handleOnboardingComplete does some of this)
    // setShowAISummaryCard(false); // handleOnboardingComplete does this
    // setShowExcitementCard(true); // handleOnboardingComplete does this
    
    // 5. Set a sensible dashboard state if needed, though handleExploreDashboard called from ExcitementCard usually does this
    // Forcing it here might be good for instant effect if ExcitementCard is bypassed or for robustness.
    if (localStorage.getItem(USER_ROLEPLAY_KEY) === 'true') {
        if (localStorage.getItem(NEW_ANALYSIS_PENDING_KEY) === 'true') {
            // Logic to show analysis will be triggered by useEffects or handleExploreDashboard
        } else {
            setUserDashboardState('IDLE_PROMPT_NEW_ROLEPLAY');
        }
    } else {
        setUserDashboardState('AWAITING_FIRST_ROLEPLAY');
    }
    
    console.log("[Dashboard] DEV TOOL: Onboarding instantly completed. User state:", userDashboardState);
  };
  // --- END NEW ---


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="dashboard-loading text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <span className="ml-2">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // This determines if the main three-part dashboard (KPIs, Top Chat, Insights) should be shown
  // const showDefaultDashboardLayout = // This logic might need re-evaluation or becomes simpler
  //   greetingComplete &&
  //   !showAISummaryCard &&
  //   !showExcitementCard &&
  //   !showRoleplayAnalysis;

  // Re-introduce showTopChatBar as it's still used in className logic and actuallyShowHubCard
  // const showTopChatBar = greetingComplete && !showAISummaryCard && !showExcitementCard; // This logic might become simpler too

  // Further refine when to show the Hub card itself if the TopLevelAIChatBar is active.
  // Don't show Hub for these states if TopLevelAIChatBar is the main interaction point.
  // const hubShouldBeHiddenWhenTopChatActive = [ // This logic might be affected
  //   'GENERAL_USE_IDLE',
  //   'GENERAL_USE_ACTIVE_GOAL',
  //   'IN_TRAINING_MODULE',
  //   'NEW_CONTENT_AVAILABLE',
  //   'FRESH_ONBOARDING_COMPLETE' 
  // ].includes(userDashboardState);

  // const actuallyShowHubCard = showDefaultDashboardLayout && !(
  //   showTopChatBar && hubShouldBeHiddenWhenTopChatActive
  // );

  return (
    <React.Fragment>
      <AppHeader 
        currentUserMethodology={currentUserMethodology}
        onMethodologyClick={handleMethodologyDisplayClick}
      />
      {isFocusedInsightMode && insightCards.length > 0 ? (
        <div className="flex flex-col items-center justify-start min-h-screen pt-24 md:pt-28 pb-24 bg-slate-50"> {/* Adjusted padding, added bottom padding for chat bar */}
          <motion.div
            className="w-full max-w-xl lg:max-w-2xl px-4 mb-6" // Adjusted width for better centering
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-semibold text-gray-700 mb-2 text-center">Your Latest Insights</h2>
            <p className="text-sm text-gray-500 mb-5 text-center">Review your key takeaways from the last session. Ask your coach any questions!</p>
            {(() => {
              const cardToRender = insightCards[currentInsightIndex];
              if (!cardToRender) return <p className="text-center text-gray-500">No insights to display.</p>;
              // Ensure unique key for re-mounting if card ID changes, for animations
              const cardKey = cardToRender.id || `insight-${currentInsightIndex}`;
              return (
                <div className="relative">
                  {cardToRender.cardType === 'DATA_POINT' && <DataPointHighlightCard key={cardKey} {...cardToRender as DataPointHighlightProps} />}
                  {cardToRender.cardType === 'KEY_MOMENT' && <KeyMomentCard key={cardKey} {...cardToRender as KeyMomentCardProps} />}
                  {cardToRender.cardType === 'RESOURCE_SPOTLIGHT' && <ResourceSpotlightCard key={cardKey} {...cardToRender as ResourceSpotlightCardProps} />}
                  {insightCards.length > 1 && (
                    <>
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full shadow-md z-20">{currentInsightIndex + 1} / {insightCards.length}</div>
                      <Button onClick={handleShowPreviousInsight} variant="ghost" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 border border-gray-400 rounded-full p-2 shadow-lg z-20"><ChevronLeft size={22} /></Button>
                      <Button onClick={handleShowNextInsight} variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 border border-gray-400 rounded-full p-2 shadow-lg z-20"><ChevronRight size={22} /></Button>
                    </>
                  )}
                </div>
              );
            })()}
          </motion.div>

          <Button
            onClick={() => {
              setIsFocusedInsightMode(false);
              // Always go to the general dashboard view when explicitly exiting focused mode
              setUserDashboardState('GENERAL_USE_IDLE');
            }}
            variant="default" // Using default variant for primary action
            className="bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out mb-8"
          >
            <Eye size={18} className="mr-2" />
            Explore Full Dashboard
          </Button>

          <div className="w-full max-w-3xl lg:max-w-4xl mx-auto fixed bottom-0 left-0 right-0 p-3 bg-slate-50/80 backdrop-blur-sm z-20 border-t border-slate-200">
             <TopLevelAIChatBar
                ref={chatBarRef} // Pass the ref
                initialQueryText={chatBarInitialQuery}
                onSendMessage={handleTopChatSendMessage}
                placeholder="Ask about these insights or anything else!"
                messages={chatLog.map(msg => ({
                    ...msg,
                    timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
                }))}
                isAiTyping={isAiTyping}
                isChatLogVisible={isChatLogOpen}
                setIsChatLogVisible={setIsChatLogOpen}
                showFullChatHistory={showFullChatHistory}
                setShowFullChatHistory={setShowFullChatHistory}
              />
          </div>
        </div>
      ) : (
        // Normal Dashboard Layout
        <>
          {(userDashboardState === 'AWAITING_FIRST_ROLEPLAY' || userDashboardState === 'IDLE_PROMPT_NEW_ROLEPLAY') &&
          greetingComplete &&
          !showRoleplayAnalysis ? (
            <div className="flex flex-col h-screen pt-20 bg-white overflow-hidden items-center justify-center p-4">
              <PromptStartRoleplay
                onStart={handleStartRoleplay}
                title={userDashboardState === 'AWAITING_FIRST_ROLEPLAY' ? "Start Your First Sales Roleplay!" : "Ready for Your Next Challenge?"}
                message={userDashboardState === 'AWAITING_FIRST_ROLEPLAY' ? "Welcome to Pitch IQ! Let\'s get you started with your first AI-powered sales coaching session. Click below to begin." : "Sharpen your skills and get valuable feedback. Start a new roleplay session with your AI Coach now!"}
              />
            </div>
          ) : (
            /* Existing three-section layout - Modified for full page scroll */
            <div className="flex flex-col min-h-screen pt-20 bg-white"> {/* Allow content to define height, page will scroll */}
              {/* Data Cards Block - No fixed height, no internal scroll */}
              <div className="py-2 px-4 flex flex-col items-center bg-white"> {/* Changed p-4 to py-2 px-4 */}
                <div className={`w-full items-center flex flex-col`}>
                  {/* Content of the top data section (AISummary, Snapshots, Insight Carousel, etc.) */}
                  {/* ... (Keep existing logic for what to render here based on state) ... */}
                  {devDisplayMode !== 'NORMAL_FLOW' ? (
                    renderDevContent(
                      devDisplayMode,
                      userName,
                      onboardingSummaryData,
                      roleplayAnalysisData,
                      analysisStatus === 'loading',
                      analysisError,
                      handleOnboardingComplete,
                      handleStartRoleplay, // Still pass handleStartRoleplay for dev tools to trigger navigation intent
                      (id, type) => console.log(`DevNav: ${type} ID: ${id}`),
                      handleDeepDiveDismissed,
                      handleViewFullAnalysis,
                      devDisplayMode === 'DEEP_DIVE_ANALYSIS' || devDisplayMode === 'FOCUSED_ANALYSIS' ? "Needs Discovery" : undefined
                    )
                  ) : !greetingComplete ? (
                    <div className="w-full max-w-3xl lg:max-w-4xl mx-auto">
                      <TypewriterGreeting
                        userName={userName}
                        onNameChange={handleNameChange}
                        onComplete={handleGreetingComplete}
                      />
                    </div>
                  ) : showAISummaryCard ? (
                    <div className="w-full max-w-3xl lg:max-w-4xl mx-auto">
                      <AISummaryCard onOnboardingComplete={handleOnboardingComplete} />
                    </div>
                  ) : showExcitementCard ? (
                    <div className="w-full max-w-3xl lg:max-w-4xl mx-auto">
                      <ExcitementCard
                        userName={userName}
                        productInfo={onboardingSummaryData?.productInfo || "Product X"}
                        audienceInfo={onboardingSummaryData?.audienceInfo || "Prospects"}
                        salesStyle={onboardingSummaryData?.salesStyle || "Consultative"}
                        salesEnvironment={onboardingSummaryData?.salesEnvironment || "B2B"}
                        userAccountStatus={userAccountStatus}
                        onExploreDashboard={handleExploreDashboard}
                      />
                    </div>
                  ) : showRoleplayAnalysis ? (
                      <div className="w-full max-w-3xl lg:max-w-4xl">
                         <PostRoleplayAnalysisCard
                            analysis={roleplayAnalysisData || MOCK_ROLEPLAY_ANALYSIS}
                            isLoading={analysisStatus === 'loading'}
                            error={analysisError}
                            isFirstAnalysis={isFirstTimeAnalysisView}
                            onNavigateToTraining={(id, type) => console.log(`Navigating to ${type} ID: ${id}`)}
                            onDeepDiveDismissed={isFirstTimeAnalysisView ? handleDeepDiveDismissed : undefined}
                            onFocusedAnalysisDismissed={!isFirstTimeAnalysisView ? handleFocusedAnalysisDismissed : undefined} // ADDED
                            onboardingGoalSkillName={isFirstTimeAnalysisView ? "Needs Discovery" : undefined}
                            // showFullCard={showFullAnalysisCard}
                          />
                      </div>
                  ) : (
                    <>
                      {/* Insight Card Carousel Removed from this normal view */}
                      {/* The div that previously held the carousel is now gone. */}
                      {/* The InteractiveAnalysisHubCard will be the main content here, */}
                      {/* rendered in the "Bottom Hub Card Section" below. */}
                    </>
                  )}
                </div>
              </div>

                {/* Chat Bar Block - Conditionally render if not showing roleplay analysis */}
                {!showRoleplayAnalysis && !showAISummaryCard && (
                  <div className="p-3 bg-white flex-shrink-0 sticky bottom-0 z-10">
                    <div className="w-full max-w-3xl lg:max-w-4xl mx-auto">
                      <TopLevelAIChatBar
                        ref={chatBarRef} // Pass the ref
                        initialQueryText={chatBarInitialQuery}
                        onSendMessage={handleTopChatSendMessage}
                        placeholder="Ask your coach how you did!"
                        messages={chatLog.map(msg => ({
                            ...msg,
                            timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
                        }))}
                        isAiTyping={isAiTyping}
                        isChatLogVisible={isChatLogOpen}
                        setIsChatLogVisible={setIsChatLogOpen}
                        showFullChatHistory={showFullChatHistory}
                        setShowFullChatHistory={setShowFullChatHistory}
                      />
                    </div>
                  </div>
                )}

                {/* Bottom Hub Card Section - Conditionally render this entire section */}
                {greetingComplete &&
                 !showAISummaryCard &&
                 !showExcitementCard &&
                 !showRoleplayAnalysis &&
                 devDisplayMode === 'NORMAL_FLOW' && // Ensure dev tools aren't overriding
                 ( // And the user state is one that expects a hub card
                  userDashboardState === 'AWAITING_FIRST_ROLEPLAY' ||
                  userDashboardState === 'FIRST_ROLEPLAY_DONE_ANALYSIS_PENDING' ||
                  userDashboardState === 'SUBSEQUENT_ROLEPLAY_DONE_ANALYSIS_PENDING' ||
                  userDashboardState === 'SUBSEQUENT_ANALYSIS_READY' ||
                  userDashboardState === 'GENERAL_USE_IDLE' ||
                  userDashboardState === 'GENERAL_USE_ACTIVE_GOAL' ||
                  userDashboardState === 'IN_TRAINING_MODULE' ||
                  userDashboardState === 'NEW_CONTENT_AVAILABLE'
                  // ROLEPLAY_ACTIVE removed from this condition
                 ) && (
                  <div className="flex-grow py-2 px-4 flex flex-col items-center bg-white pb-4"> {/* Changed p-4 to py-2 px-4 and pb-16 to pb-4 */}
                    <div className="w-full max-w-3xl lg:max-w-4xl mx-auto">
                      <motion.div className="w-full flex flex-col items-center mt-2" initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}> {/* Reduced mt-4 to mt-2 */}
                        <InteractiveAnalysisHubCard
                          userName={userName}
                          userState={userDashboardState}
                          onStartRoleplay={handleStartRoleplay}
                          onViewFocusedAnalysis={handleViewFullAnalysis}
                          // Props for GENERAL_USE_ACTIVE_GOAL (placeholders or dev inputs)
                          activeGoalName={devActiveGoalName || (userDashboardState === 'GENERAL_USE_ACTIVE_GOAL' ? "Improve Objection Handling" : undefined)}
                          activeGoalDescription={devActiveGoalDescription || (userDashboardState === 'GENERAL_USE_ACTIVE_GOAL' ? "Focus on the Acknowledge, Clarify, Respond, Confirm (ACRC) method." : undefined)}
                          onPracticeGoal={userDashboardState === 'GENERAL_USE_ACTIVE_GOAL' ? () => console.log("Practice Goal Clicked") : undefined}
                          onViewGoalRelatedTraining={userDashboardState === 'GENERAL_USE_ACTIVE_GOAL' ? () => console.log("View Goal Training Clicked") : undefined}
                          // Props for IN_TRAINING_MODULE (placeholders or dev inputs)
                          trainingModuleName={devTrainingModuleName || (userDashboardState === 'IN_TRAINING_MODULE' ? "Advanced Negotiation Tactics" : undefined)}
                          trainingModuleProgress={devTrainingModuleProgress || (userDashboardState === 'IN_TRAINING_MODULE' ? "Lesson 2 of 5" : undefined)}
                          onResumeTraining={userDashboardState === 'IN_TRAINING_MODULE' ? () => console.log("Resume Training Clicked") : undefined}
                          onAskAboutTraining={userDashboardState === 'IN_TRAINING_MODULE' ?
                                                (moduleName) => {
                                                  setChatBarInitialQuery(`Tell me more about the "${moduleName}" training module.`);
                                                }
                                                : undefined}
                          // Props for NEW_CONTENT_AVAILABLE (placeholders or dev inputs)
                          newContentTitle={devNewContentTitle || (userDashboardState === 'NEW_CONTENT_AVAILABLE' ? "Fresh Off The Press: New Roleplay Scenarios!" : undefined)}
                          newContentTeaser={devNewContentTeaser || (userDashboardState === 'NEW_CONTENT_AVAILABLE' ? "Challenge yourself with our latest scenarios designed to test your closing skills." : undefined)}
                          onExploreNewContent={userDashboardState === 'NEW_CONTENT_AVAILABLE' ? () => console.log("Explore New Content Clicked") : undefined}
                          onAskAboutNewContent={userDashboardState === 'NEW_CONTENT_AVAILABLE' ?
                                                  (contentTitle) => {
                                                      setChatBarInitialQuery(contentTitle ? `What are the details about "${contentTitle}"?` : "What are the new updates?");
                                                  }
                                                  : undefined}
                        />
                      </motion.div>
                      {/* Button to reveal UnlockableFeaturesGrid */}
                      {!showUnlockableFeaturesSection && (
                        <div className="w-full flex justify-center mt-4 mb-2">
                          <Button
                            variant="outline"
                            className="text-primary hover:text-primary-dark border-primary/40 hover:border-primary/70 bg-primary/5 hover:bg-primary/10 shadow-sm py-3 px-6 rounded-lg transition-all duration-200 ease-in-out group"
                            onClick={() => setShowUnlockableFeaturesSection(true)}
                          >
                            <Sparkles size={18} className="mr-2 text-primary/80 group-hover:text-primary transition-colors duration-200" />
                            Explore Features & Milestones
                          </Button>
                        </div>
                      )}

                      {/* Conditionally render UnlockableFeaturesGrid */}
                      {showUnlockableFeaturesSection && (
                        <UnlockableFeaturesGrid
                          completedRoleplaysCount={completedRoleplaysCount}
                          onFeatureCtaClick={handleFeatureNavigation} // Correct: pass handleFeatureNavigation to the new prop name
                          revealedFeatureIds={revealedFeatureIds}
                          onFeatureRevealed={handleFeatureRevealed}
                        />
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </>
      )}
      {/* DevToolsPanel and its button remain outside, fixed to viewport */}
      {isDevToolsOpen && (
        <DashboardDevToolsPanel 
          currentUserState={userDashboardState}
          setUserState={setUserDashboardState}
          allUserStates={ALL_USER_DASHBOARD_STATES}
          onToggleVisibility={() => setIsDevToolsOpen(false)}
          onResetOnboarding={handleResetOnboardingFlow}
          onSimulateRoleplayDone={handleSimulateRoleplayDone}
          isFirstTimeAnalysisView={isFirstTimeAnalysisView}
          toggleIsFirstTimeAnalysisView={handleToggleIsFirstTimeAnalysisView}
          showFullAnalysisCardView={showFullAnalysisCard}
          toggleShowFullAnalysisCardView={handleToggleShowFullAnalysisCardView} 
          greetingCompleteState={greetingComplete}
          toggleGreetingComplete={handleToggleGreetingComplete}
          showAISummaryCardState={showAISummaryCard}
          toggleShowAISummaryCard={handleToggleShowAISummaryCard}
          showExcitementCardState={showExcitementCard}
          toggleShowExcitementCard={handleToggleShowExcitementCard}
          showRoleplayAnalysisState={showRoleplayAnalysis}
          toggleShowRoleplayAnalysis={handleToggleShowRoleplayAnalysis}
          dataHighlights={insightCards as DataPointHighlightProps[]} 
          onSimulatePositiveHighlight={handleSimulatePositiveHighlight}
          onSimulateNegativeHighlight={handleSimulateNegativeHighlight}
          onSimulateNeutralHighlight={handleSimulateNeutralHighlight}
          onSimulateMixedHighlights={handleSimulateMixedHighlights}
          onClearDataHighlights={handleClearDataHighlights}
          onSimulateKeyMomentCard={handleSimulateKeyMomentCard} 
          onSimulateResourceSpotlightCard={handleSimulateResourceSpotlightCard}
          // Pass new dev input states and setters
          devActiveGoalName={devActiveGoalName}
          setDevActiveGoalName={setDevActiveGoalName}
          devActiveGoalDescription={devActiveGoalDescription}
          setDevActiveGoalDescription={setDevActiveGoalDescription}
          devTrainingModuleName={devTrainingModuleName}
          setDevTrainingModuleName={setDevTrainingModuleName}
          devTrainingModuleProgress={devTrainingModuleProgress}
          setDevTrainingModuleProgress={setDevTrainingModuleProgress}
          devNewContentTitle={devNewContentTitle}
          setDevNewContentTitle={setDevNewContentTitle}
          devNewContentTeaser={devNewContentTeaser}
          setDevNewContentTeaser={setDevNewContentTeaser}
          onResetRoleplayCount={handleResetRoleplayCount} // Pass the new handler
          // --- NEW: Dev tools for methodology ---
          currentUserMethodology={currentUserMethodology}
          setCurrentUserMethodology={setCurrentUserMethodology}
          availableMethodologies={[
            'SPIN Selling', 'Challenger Sale', 'Solution Selling', 
            'Consultative Selling', 'Value Selling', 'Pending Selection', 'AI Recommended'
          ]}
          onInstantOnboardingComplete={handleInstantOnboardingComplete} // <-- Add new prop
          // --- END NEW ---
          // aiOriginalRecommendation={aiOriginalRecommendation} // <-- This line was correctly removed by the user or a previous step, ensure it STAYS REMOVED or is intentionally absent
        />
      )}
      {!isDevToolsOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white hover:text-blue-300 border-gray-700 z-50 rounded-full shadow-lg"
          onClick={() => setIsDevToolsOpen(true)}
          title="Open Developer Tools"
        >
          <Settings2 size={22} />
        </Button>
      )}

      <ConfirmationModal
        isOpen={showMethodologyChangeModal}
        onClose={() => setShowMethodologyChangeModal(false)}
        onConfirm={handleConfirmMethodologyChange}
        title="Change Sales Methodology?"
        message={`Warning: Only change methodologies if you are absolutely sure. \nThis WILL affect your coach\'s understanding of your journey and may take time to adapt.`}
        confirmButtonText="Continue & Choose"
        cancelButtonText="Cancel"
      />

      <MethodologySelectionModal
        isOpen={showMethodologySelectionModal}
        onClose={handleCancelMethodologySelection}
        onConfirm={handleFinalizeMethodologySelection}
        currentMethodology={currentUserMethodology} // This will be 'Pending Selection' when it opens
        availableMethodologies={[
          'SPIN Selling',
          'Challenger Sale',
          'Solution Selling',
          'Consultative Selling',
          'Value Selling',
          // 'AI Recommended' and 'Pending Selection' are typically not user-selectable choices here
        ]}
        aiOriginalRecommendation={aiOriginalRecommendation} // <-- ENSURE THIS LINE REMAINS for MethodologySelectionModal
      />
    </React.Fragment>
  );
};

export default Dashboard; 