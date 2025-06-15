import React, { Dispatch, SetStateAction, RefObject } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertTriangle } from 'lucide-react';

import TypewriterGreeting from '@/components/TypewriterGreeting';
import KeyMetrics from '@/components/dashboard/KeyMetrics';
import SkillRadar from '@/components/dashboard/SkillRadar';
import AICardSystem from '@/components/dashboard/AICardSystem';
import CallTimeline from '@/components/dashboard/CallTimeline';
import TopLevelAIChatBar from '@/components/dashboard/TopLevelAIChatBar';
import InteractiveAnalysisHubCard from '@/components/dashboard/InteractiveAnalysisHubCard';
import UnlockableFeaturesGrid from '@/components/dashboard/widgets/UnlockableFeaturesGrid';

import type { DevDisplayMode } from '@/hooks/useDashboardDevTools';
import type { 
    UserDashboardState, 
    KeyMetrics as KeyMetricsType,
    SkillRadarData, 
    AIInsightsApiResponse, 
    RecentSession, 
    ChatMessage,
    AiPathState
} from '@/pages/Dashboard';

// Props interface for MainDashboardLayout
interface MainDashboardLayoutProps {
  // Dev Mode Props
  devDisplayMode: DevDisplayMode;
  renderDevContent: (
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
  ) => JSX.Element | null;

  // Greeting Props
  greetingComplete: boolean;
  userName: string;
  handleNameChange: (newName: string) => void;
  handleGreetingComplete: () => void;

  // Main Dashboard Grid Data & Loading States
  isLoading: boolean; 
  dashboardApiError: string | null; 
  insightsApiError: string | null; 
  keyMetricsData: KeyMetricsType | null;
  skillRadarData: SkillRadarData | null;
  aiInsightsData: AIInsightsApiResponse | null;
  recentSessionsData: RecentSession[] | null;
  dashboardApiLoading: boolean; 
  insightsApiLoading: boolean; 

  // TopLevelAIChatBar Props
  chatBarRef: RefObject<HTMLDivElement>;
  chatBarInitialQuery: string | null;
  handleTopChatSendMessage: (message: string) => Promise<void>;
  chatLog: ChatMessage[];
  isAiTyping: boolean;
  isChatLogOpen: boolean;
  setIsChatLogOpen: Dispatch<SetStateAction<boolean>>;
  showFullChatHistory: boolean;
  setShowFullChatHistory: Dispatch<SetStateAction<boolean>>;

  // InteractiveAnalysisHubCard & UnlockableFeaturesGrid Related Props
  userDashboardState: UserDashboardState;
  onStartAiGuidedPath: () => Promise<void>;
  onViewTraditionalDashboard: () => void;
  aiGuidedPath: AiPathState | null;
  handleViewFullAnalysis: () => void;
  devActiveGoalName?: string;
  devActiveGoalDescription?: string;
  devTrainingModuleName?: string;
  devTrainingModuleProgress?: string;
  devNewContentTitle?: string;
  devNewContentTeaser?: string;
  showUnlockableFeaturesSection: boolean;
  setShowUnlockableFeaturesSection: Dispatch<SetStateAction<boolean>>;
  completedRoleplaysCount: number;
  handleFeatureNavigation: (featureTitle: string) => void;
  revealedFeatureIds: Record<string, boolean>;
  handleFeatureRevealed: (featureId: string) => void;
  showDataGrid: boolean; 
  isInConversationalFeedbackMode: boolean;
  onStartConversationalFeedback: () => Promise<void>;
}

const MainDashboardLayout: React.FC<MainDashboardLayoutProps> = ({
  devDisplayMode,
  renderDevContent,
  greetingComplete,
  userName,
  handleNameChange,
  handleGreetingComplete,
  isLoading,
  dashboardApiError,
  insightsApiError,
  keyMetricsData,
  skillRadarData,
  aiInsightsData,
  recentSessionsData,
  dashboardApiLoading,
  insightsApiLoading,
  chatBarRef,
  chatBarInitialQuery,
  handleTopChatSendMessage,
  chatLog,
  isAiTyping,
  isChatLogOpen,
  setIsChatLogOpen,
  showFullChatHistory,
  setShowFullChatHistory,
  userDashboardState,
  onStartAiGuidedPath,
  onViewTraditionalDashboard,
  aiGuidedPath,
  handleViewFullAnalysis,
  devActiveGoalName,
  devActiveGoalDescription,
  devTrainingModuleName,
  devTrainingModuleProgress,
  devNewContentTitle,
  devNewContentTeaser,
  showUnlockableFeaturesSection,
  setShowUnlockableFeaturesSection,
  completedRoleplaysCount,
  handleFeatureNavigation,
  revealedFeatureIds,
  handleFeatureRevealed,
  showDataGrid,
  isInConversationalFeedbackMode,
  onStartConversationalFeedback,
}) => {
  const getThemedPromptContent = () => {
    // Priority 1: Loading state
    if (insightsApiLoading) {
      return {
        title: "Loading Personalized Suggestions...",
        subtitle: "Hang tight while we tailor your next steps.",
        buttonText: "Loading...",
        icon: <Loader2 size={20} className="animate-spin" />,
        disabled: true,
        action: () => {}, // No action while loading
      };
    }

    // Priority 2: Error state
    if (insightsApiError) {
      return {
        title: "Suggestions Unavailable",
        subtitle: "Could not load suggestions right now. You can start a general session or try again later.",
        buttonText: "Start General Session", 
        icon: <AlertTriangle size={20} />,
        disabled: false, 
        action: onStartConversationalFeedback, // Allows starting a conversation even if insights failed
      };
    }

    // Priority 3: Data available
    if (aiInsightsData) {
      let insightTitle = "Explore Your Potential";
      let insightSubtitle = "AI has identified areas for growth and new challenges for you.";
      let insightButtonText = "Talk to Your AI Coach"; // Generic CTA for conversational start

      if (aiInsightsData.priority_card === 'skills' && aiInsightsData.skills_insights) {
        insightTitle = `Focus on: ${aiInsightsData.skills_insights.skillArea}`;
        insightSubtitle = aiInsightsData.skills_insights.explanation;
        insightButtonText = `Discuss ${aiInsightsData.skills_insights.skillArea}`;
      } else if (aiInsightsData.priority_card === 'challenges' && aiInsightsData.challenge_insights) {
        insightTitle = `New Challenge: ${aiInsightsData.challenge_insights.challengeType}`;
        insightSubtitle = aiInsightsData.challenge_insights.explanation;
        insightButtonText = `Discuss ${aiInsightsData.challenge_insights.challengeType}`;
      } else if (aiInsightsData.priority_card === 'calls' && aiInsightsData.call_insights) {
        insightTitle = `Review Key Call Insight`;
        insightSubtitle = aiInsightsData.call_insights.explanation;
        insightButtonText = `Discuss Call Insight`;
      } else {
        // Fallback if priority_card doesn't match or specific insight is null
        insightTitle = "Ready for AI Coaching?";
        insightSubtitle = "Let's explore your progress and identify next steps together.";
        insightButtonText = "Start AI Conversation";
      }
      return {
        title: insightTitle,
        subtitle: insightSubtitle,
        buttonText: insightButtonText,
        icon: <Sparkles size={20} />,
        disabled: false,
        action: onStartConversationalFeedback, 
      };
    }

    // Priority 4: Fallback (e.g., insights not loaded yet, but no error/loading state explicitly)
    return {
      title: "Ready for Your Next Session?",
      subtitle: "Click below to engage with your AI coach and discover personalized insights.",
      buttonText: "Start AI Coaching Session",
      icon: <Sparkles size={20} />,
      disabled: false,
      action: onStartConversationalFeedback, 
    };
  };

  const themedPrompt = getThemedPromptContent();

  // Placeholder for a component that will render the steps of an AI Guided Path
  const AiGuidedPathView = ({ path }: { path: AiPathState | null }) => {
    if (!path || !path.isActive) return null;
    return (
      <div className="w-full max-w-2xl lg:max-w-3xl mx-auto py-10 px-4 bg-slate-50 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-3 text-slate-800">AI Guided Path: {path.pathType || 'Next Steps'}</h3>
        <p className="text-slate-600 mb-2">Current Step: {path.currentStep}</p>
        <div className="p-4 border border-slate-200 rounded-md bg-white min-h-[150px]">
          <p className="text-slate-700 font-medium">Path Data/Content for this step:</p>
          <pre className="text-xs text-slate-500 whitespace-pre-wrap break-all">
            {JSON.stringify(path.pathData, null, 2)}
          </pre>
          {/* TODO: Add actual step content rendering and navigation (Next/Back buttons) */}
        </div>
        <Button onClick={() => { console.log("Attempting to exit path. Actual exit logic needed in Dashboard.tsx via prop."); (path.pathData as any)?.setAiGuidedPath?.(null); /* Example of how one might try to call back - needs proper prop */ }} className="mt-4" variant="outline">Exit Path (Temp)</Button>
      </div>
    );
  };

  const callTimelineSessions = recentSessionsData?.map(session => ({
    id: session.id,
    start_time: session.start_time,
    status: session.status,
    title: `Session ${session.id}`, // Placeholder title
    scenario: 'Roleplay Practice', // Placeholder scenario
    score: Math.floor(Math.random() * 40) + 60, // Placeholder score (60-99)
    duration: session.duration || 0, // Ensure duration is a number, default to 0
  })) || [];

  return (
    <div className="flex flex-col min-h-screen pt-16 bg-white">
      <div className="py-2 px-4 flex flex-col items-center bg-white flex-grow">
        <div className={`w-full items-center flex flex-col flex-grow`}>
          {devDisplayMode !== 'NORMAL_FLOW' ? (
            renderDevContent(
              devDisplayMode,
              userName,
              null,
              null,
              isLoading,
              dashboardApiError || insightsApiError,
              handleGreetingComplete,
              onStartAiGuidedPath,
              (id, type) => console.log(`DevNav: ${type} ID: ${id}`),
              () => console.log("Dev Deep Dive Dismissed"),
              handleViewFullAnalysis,
              devDisplayMode === 'DEEP_DIVE_ANALYSIS' || devDisplayMode === 'FOCUSED_ANALYSIS' ? "Needs Discovery" : undefined
            )
          ) : !greetingComplete ? (
            <div className="w-full max-w-3xl lg:max-w-4xl mx-auto mt-8">
              <TypewriterGreeting
                userName={userName}
                onNameChange={handleNameChange}
                onComplete={handleGreetingComplete}
              />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center flex-grow p-4">
              {showDataGrid ? (
                <div className="dashboard-main-content w-full space-y-6 mb-8">
                  {/* Main Data Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <KeyMetrics data={keyMetricsData} loading={dashboardApiLoading} error={dashboardApiError} />
                    </div>
                    <div className="lg:col-span-1">
                      <SkillRadar data={skillRadarData} loading={dashboardApiLoading} error={dashboardApiError} />
                    </div>
                  </div>
                  <AICardSystem data={aiInsightsData} loading={insightsApiLoading} error={insightsApiError} />
                  <CallTimeline sessions={callTimelineSessions} />
                  <Button onClick={onViewTraditionalDashboard} variant="link" className="mt-4 text-sm">Switch to AI Coach View</Button>
                </div>
              ) : aiGuidedPath && aiGuidedPath.isActive ? (
                <AiGuidedPathView path={aiGuidedPath} />
              ) : isInConversationalFeedbackMode ? (
                <div className="w-full max-w-2xl lg:max-w-3xl mx-auto py-10 px-4 flex flex-col items-center">
                  <h2 className="text-2xl font-semibold mb-2 text-slate-700">AI Coach Conversation</h2>
                  <p className="text-slate-600 mb-6 text-center max-w-lg">Your AI coach has initiated a conversation. Check the chat bar below to respond, ask questions, or discuss your goals.</p>
                  <Button 
                    onClick={onStartAiGuidedPath} 
                    size="lg" 
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out transform hover:-translate-y-0.5 mb-4"
                  >
                    Start Structured Deep Dive
                  </Button>
                  <Button onClick={onViewTraditionalDashboard} variant="link" className="text-sm text-slate-500 hover:text-slate-700">
                    View Full Dashboard
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-xl lg:max-w-2xl mx-auto py-12 flex flex-col items-center text-center">
                  <h2 className="text-3xl font-bold mb-3 text-slate-800 tracking-tight">{themedPrompt.title}</h2>
                  {themedPrompt.subtitle && <p className="text-slate-600 mb-8 text-lg max-w-md">{themedPrompt.subtitle}</p>}
                  <Button 
                    onClick={themedPrompt.action} 
                    size="lg" 
                    className="bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition duration-150 ease-in-out transform hover:-translate-y-1 flex items-center space-x-2.5 disabled:opacity-60 disabled:transform-none disabled:shadow-md text-base leading-snug"
                    disabled={themedPrompt.disabled}
                  >
                    {themedPrompt.icon}
                    <span>{themedPrompt.buttonText}</span>
                  </Button>
                  <Button onClick={onViewTraditionalDashboard} variant="link" className="mt-10 text-sm text-slate-500 hover:text-slate-700">
                    View Full Dashboard
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {devDisplayMode === 'NORMAL_FLOW' && greetingComplete && !aiGuidedPath?.isActive && (
        <div className="w-full max-w-5xl mx-auto px-4 mt-auto pb-4">
          <TopLevelAIChatBar 
              ref={chatBarRef} 
              initialQueryText={chatBarInitialQuery} 
              onSendMessage={handleTopChatSendMessage} 
              messages={chatLog}
              isAiTyping={isAiTyping}
              isChatLogVisible={isChatLogOpen}
              setIsChatLogVisible={setIsChatLogOpen}
              showFullChatHistory={showFullChatHistory}
              setShowFullChatHistory={setShowFullChatHistory}
          />
        </div>
      )}
      
      {devDisplayMode === 'NORMAL_FLOW' && greetingComplete && 
       !aiGuidedPath?.isActive && 
       !isInConversationalFeedbackMode && 
       !showDataGrid && (
        <>
          <div className="w-full max-w-5xl mx-auto mt-4 px-4 pb-2">
            <InteractiveAnalysisHubCard 
                userState={userDashboardState}
                activeGoalName={devActiveGoalName}
                activeGoalDescription={devActiveGoalDescription}
                trainingModuleName={devTrainingModuleName}
                trainingModuleProgress={devTrainingModuleProgress}
                newContentTitle={devNewContentTitle}
                newContentTeaser={devNewContentTeaser}
                onStartRoleplay={onStartConversationalFeedback}
                onViewFocusedAnalysis={handleViewFullAnalysis}
            />
          </div>

          {showUnlockableFeaturesSection && (
            <div className="w-full max-w-5xl mx-auto mt-4 px-4 pb-4">
                <UnlockableFeaturesGrid 
                    completedRoleplaysCount={completedRoleplaysCount}
                    onFeatureCtaClick={handleFeatureNavigation}
                    revealedFeatureIds={revealedFeatureIds}
                    onFeatureRevealed={handleFeatureRevealed}
                />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MainDashboardLayout; 