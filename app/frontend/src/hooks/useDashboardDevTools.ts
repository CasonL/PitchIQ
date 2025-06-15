import React, { useState, useCallback } from 'react';
import type { UserDashboardState, InsightCardData, SalesMethodology, DashboardOnboardingData, ChatMessage } from '@/pages/Dashboard'; // Assuming these types are exported from Dashboard or a shared types file
import AISummaryCard from '@/components/dashboard/AISummaryCard';
import ExcitementCard from '@/components/dashboard/ExcitementCard';
import PostRoleplayAnalysisCard from '@/components/dashboard/PostRoleplayAnalysisCard';
import { MOCK_ROLEPLAY_ANALYSIS } from '@/pages/Dashboard';
import { DataPointHighlightProps } from '@/components/dashboard/widgets/DataPointHighlightCard';
import { KeyMomentCardProps } from '@/components/dashboard/widgets/KeyMomentCard';
import { ResourceSpotlightCardProps } from '@/components/dashboard/widgets/ResourceSpotlightCard';

// --- DevTool Types ---
export type DevDisplayMode = 'NORMAL_FLOW' | 'AISUMMARY' | 'EXCITEMENT' | 'DEEP_DIVE_ANALYSIS' | 'FOCUSED_ANALYSIS' | 'ANALYSIS_TEASER';
export const DEV_MODES: DevDisplayMode[] = ['NORMAL_FLOW', 'AISUMMARY', 'EXCITEMENT', 'DEEP_DIVE_ANALYSIS', 'FOCUSED_ANALYSIS', 'ANALYSIS_TEASER'];

// --- Props for the hook ---
interface UseDashboardDevToolsProps {
  // --- Required for MVP --- 
  userDashboardState: UserDashboardState;
  setUserDashboardState: React.Dispatch<React.SetStateAction<UserDashboardState>>;
  userName: string;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
  
  // --- Required by handleResetOnboardingFlow (must be present) ---
  setGreetingComplete: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAISummaryCard: React.Dispatch<React.SetStateAction<boolean>>;
  setShowExcitementCard: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRoleplayAnalysis: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFirstTimeAnalysisView: React.Dispatch<React.SetStateAction<boolean>>;
  // setShowFullAnalysisCard: React.Dispatch<React.SetStateAction<boolean>> // Not used in simplified reset
  setInsightCards: React.Dispatch<React.SetStateAction<InsightCardData[]>>;
  setCompletedRoleplaysCount: React.Dispatch<React.SetStateAction<number>>;
  setRevealedFeatureIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setChatLog: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setChatBarInitialQuery: React.Dispatch<React.SetStateAction<string | null>>;
  setOnboardingSummaryData: React.Dispatch<React.SetStateAction<DashboardOnboardingData | null>>;
  setRoleplayAnalysisData: React.Dispatch<React.SetStateAction<any>>;
  setIsFocusedInsightMode: React.Dispatch<React.SetStateAction<boolean>>;
  setHasCompletedRoleplay: React.Dispatch<React.SetStateAction<boolean>>;
  // setCurrentAnalysisData: React.Dispatch<React.SetStateAction<any>>; // Not in simplified reset
  
  // Constants for reset (must be present)
  USER_NAME_STORAGE_KEY: string;
  ONBOARDING_DATA_KEY: string;
  NEW_ANALYSIS_PENDING_KEY: string;
  USER_ROLEPLAY_KEY: string;
  GREETING_COMPLETE_KEY: string;
  FIRST_ANALYSIS_VIEWED_KEY: string;
  CHAT_LOG_STORAGE_KEY: string;
  COMPLETED_ROLEPLAYS_COUNT_KEY: string;
  REVEALED_FEATURES_STORAGE_KEY: string;
  userDataName: string; 

  // --- Optional for MVP (or if dev panel UI for them is removed) ---
  greetingComplete?: boolean;
  showAISummaryCard?: boolean;
  showExcitementCard?: boolean;
  showRoleplayAnalysis?: boolean;
  isFirstTimeAnalysisView?: boolean;
  showFullAnalysisCard?: boolean;
  onboardingSummaryData?: DashboardOnboardingData | null;
  roleplayAnalysisData?: any; 
  analysisLoading?: boolean; 
  analysisError?: string | null;
  insightCards?: InsightCardData[];
  currentUserMethodology?: SalesMethodology;
  aiOriginalRecommendation?: SalesMethodology | null;
  chatLog?: ChatMessage[]; 
  
  setCurrentUserMethodology?: React.Dispatch<React.SetStateAction<SalesMethodology>>;
  setAiOriginalRecommendation?: React.Dispatch<React.SetStateAction<SalesMethodology | null>>;
  
  handleOnboardingComplete?: () => void; 
  handleUnderstandDataPointQuery?: (details: { metricName: string; metricValue: string | number; sentiment: string }) => Promise<void>;
  handleExploreKeyMoment?: (quote: string, skillArea?: string) => Promise<void>;
  handleViewResource?: (url: string, title: string) => void;
  onNavigateToTrainingHandler?: (id: string, type: "module" | "practice") => void;
  onDeepDiveDismissedHandler?: () => void;
  onViewFocusedAnalysisHandler?: () => void;
  onStartRoleplayHandler?: () => void; 
  
  ALL_USER_DASHBOARD_STATES?: UserDashboardState[];
  availableMethodologies?: SalesMethodology[];
}

export const useDashboardDevTools = (props: UseDashboardDevToolsProps) => {
  const {
    // Destructure ALL props defined in UseDashboardDevToolsProps
    // Required props:
    userDashboardState, setUserDashboardState, userName, setUserName,
    setGreetingComplete, setShowAISummaryCard, setShowExcitementCard, setShowRoleplayAnalysis,
    setIsFirstTimeAnalysisView, setInsightCards, setCompletedRoleplaysCount,
    setRevealedFeatureIds, setChatLog, setChatBarInitialQuery, setOnboardingSummaryData,
    setRoleplayAnalysisData, setIsFocusedInsightMode, setHasCompletedRoleplay,
    USER_NAME_STORAGE_KEY, ONBOARDING_DATA_KEY, NEW_ANALYSIS_PENDING_KEY, USER_ROLEPLAY_KEY,
    GREETING_COMPLETE_KEY, FIRST_ANALYSIS_VIEWED_KEY, CHAT_LOG_STORAGE_KEY,
    COMPLETED_ROLEPLAYS_COUNT_KEY, REVEALED_FEATURES_STORAGE_KEY, userDataName,

    // Optional props (with defaults or checks as previously established in the interface/hook body)
    greetingComplete = false,
    showAISummaryCard = false,
    showExcitementCard = false, // Added default
    showRoleplayAnalysis = false, // Added default
    isFirstTimeAnalysisView = true, // Added default
    showFullAnalysisCard = false, // Added default
    onboardingSummaryData = null, // Added default
    roleplayAnalysisData = null, // Added default
    analysisLoading = false, // Added default
    analysisError = null, // Added default
    insightCards = [], // Added default
    currentUserMethodology, // Keep as potentially undefined if truly optional for all paths
    aiOriginalRecommendation, // Keep as potentially undefined
    chatLog = [], // Added default
    setCurrentUserMethodology,
    setAiOriginalRecommendation,
    handleOnboardingComplete,
    handleUnderstandDataPointQuery,
    handleExploreKeyMoment,
    handleViewResource,
    onNavigateToTrainingHandler,
    onDeepDiveDismissedHandler,
    onViewFocusedAnalysisHandler,
    onStartRoleplayHandler,
    ALL_USER_DASHBOARD_STATES = [],
    availableMethodologies = []
  } = props;

  // --- DevTool Internal State ---
  const [devDisplayMode, setDevDisplayMode] = useState<DevDisplayMode>('NORMAL_FLOW');
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(true); // Default to true for MVP visibility
  
  // ... (devActiveGoalName, etc. internal states - can be kept or removed if not used by simplified dev panel)

  // --- DevTool Handlers ---
  // handleToggleGreetingComplete and other toggles can be removed if panel UI for them is gone.
  // For MVP, only handleResetOnboardingFlow is critical from existing complex handlers.

  const handleResetOnboardingFlow = useCallback(() => {
    // This function resets all state related to the user's onboarding process and roleplay history.
    // It clears numerous items from localStorage to ensure a fresh start.
    localStorage.removeItem(ONBOARDING_DATA_KEY);
    localStorage.removeItem(NEW_ANALYSIS_PENDING_KEY);
    localStorage.removeItem(USER_ROLEPLAY_KEY);
    localStorage.removeItem(GREETING_COMPLETE_KEY);
    localStorage.removeItem(FIRST_ANALYSIS_VIEWED_KEY);
    localStorage.removeItem(CHAT_LOG_STORAGE_KEY);
    localStorage.removeItem(COMPLETED_ROLEPLAYS_COUNT_KEY);
    localStorage.removeItem(REVEALED_FEATURES_STORAGE_KEY);
    localStorage.removeItem('ai_coach_onboarding_complete');
    localStorage.removeItem('ai_coach_messages');
    localStorage.removeItem('onboarding_complete');

    // Reset React state to initial values.
    setShowAISummaryCard(false);
    setShowExcitementCard(false);
    setShowRoleplayAnalysis(false);
    setGreetingComplete(false);
    setUserDashboardState('NEW_USER_NO_DATA');
    setUserName(userDataName);
    localStorage.setItem(USER_NAME_STORAGE_KEY, userDataName); // Also reset name in storage
    setIsFirstTimeAnalysisView(true);
    setHasCompletedRoleplay(false);
    setInsightCards([]);
    setCompletedRoleplaysCount(0);
    setRevealedFeatureIds({});
    setChatLog([]);
    setChatBarInitialQuery('');
    setOnboardingSummaryData(null);
    setRoleplayAnalysisData(null);
    setIsFocusedInsightMode(false);

    console.log("Dev Tool: Full Onboarding and State Reset");
    // Force a reload to ensure all components re-evaluate the cleared state from scratch.
    window.location.reload();
  }, [
    // Dependencies for useCallback: all state setters and constants from props.
    ONBOARDING_DATA_KEY, NEW_ANALYSIS_PENDING_KEY, USER_ROLEPLAY_KEY, GREETING_COMPLETE_KEY,
    FIRST_ANALYSIS_VIEWED_KEY, CHAT_LOG_STORAGE_KEY, COMPLETED_ROLEPLAYS_COUNT_KEY,
    REVEALED_FEATURES_STORAGE_KEY, userDataName, USER_NAME_STORAGE_KEY,
    setShowAISummaryCard, setShowExcitementCard, setShowRoleplayAnalysis, setGreetingComplete,
    setUserDashboardState, setUserName, setIsFirstTimeAnalysisView, setHasCompletedRoleplay,
    setInsightCards, setCompletedRoleplaysCount, setRevealedFeatureIds, 
    setChatLog, setChatBarInitialQuery,
    setOnboardingSummaryData, setRoleplayAnalysisData, setIsFocusedInsightMode,
  ]);

  // Other handlers like handleSimulateRoleplayDone, handleSimulate...Highlight can be removed for strict MVP
  // if the dev panel UI doesn't trigger them.

  // renderDevContent can be significantly simplified or removed if not used by the MVP dev panel.
  const renderDevContent = () => {
    // For MVP, this might not be needed if the panel only has buttons for reset and simple state changes.
    return React.createElement("div");
  };

  // --- RETURN STATEMENT --- Ensure it includes what Dashboard.tsx needs for the dev panel ---
  return {
    // Essential for MVP Dev Panel UI and functionality in Dashboard.tsx:
    isDevToolsOpen,
    setIsDevToolsOpen,
    handleResetOnboardingFlow,
    setUserDashboardState, // This is crucial. It comes from props.

    // Other properties that might be useful or were part of the original structure, made optional if not core MVP
    devDisplayMode, 
    setDevDisplayMode,
    userName, // Pass through from props if needed by dev panel UI directly (unlikely for MVP)
    setUserName, // Pass through from props
    userDashboardState, // Pass through from props
    
    // Deprecated/Simplified for MVP - can be removed if no longer used by any dev panel elements
    // handleToggleGreetingComplete, 
    // handleToggleShowAISummaryCard,
    // ... other specific toggles ...
    // handleSimulateRoleplayDone,
    // ... other simulation handlers ...
    renderDevContent, // If used, otherwise remove
    
    // Values for potential display in a more complex dev panel (can be omitted for MVP)
    // currentUserMethodology, 
    // aiOriginalRecommendation,
    // ALL_USER_DASHBOARD_STATES,
    // availableMethodologies,
  };
}; 