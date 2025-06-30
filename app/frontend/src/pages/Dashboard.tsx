import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { Loader2, RefreshCw, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Zap, Sparkles, Settings2, ThumbsUp, AlertTriangle, Lightbulb } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import SkillRadar from "@/components/dashboard/SkillRadar";
import KeyMetrics from "@/components/dashboard/KeyMetrics";
import AICardSystem from "@/components/dashboard/AICardSystem";
import CallTimeline from "@/components/dashboard/CallTimeline";
import AISummaryCard from "@/components/dashboard/AISummaryCard";
import PostRoleplayAnalysisCard from "@/components/dashboard/PostRoleplayAnalysisCard";
import ExcitementCard from "@/components/dashboard/ExcitementCard";
import InteractiveAnalysisHubCard from '@/components/dashboard/InteractiveAnalysisHubCard';
import type { DataPointHighlightProps } from '@/components/dashboard/widgets/DataPointHighlightCard';
import type { KeyMomentCardProps } from '@/components/dashboard/widgets/KeyMomentCard';
import type { ResourceSpotlightCardProps } from '@/components/dashboard/widgets/ResourceSpotlightCard';
import AppHeader from "@/components/AppHeader";
import TypewriterGreeting from "@/components/TypewriterGreeting";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import DashboardDevToolsPanel from '@/components/dashboard/DashboardDevToolsPanel';
import type { DashboardDevToolsPanelProps } from '@/components/dashboard/DashboardDevToolsPanel';
import TopLevelAIChatBar from '@/components/dashboard/TopLevelAIChatBar';
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import MethodologySelectionModal from "@/components/ui/MethodologySelectionModal";
import "./Dashboard.css";
import PromptStartRoleplay from '@/components/dashboard/PromptStartRoleplay';
import UnlockableFeaturesGrid from '@/components/dashboard/widgets/UnlockableFeaturesGrid';
import FocusedInsightView from '@/components/dashboard/FocusedInsightView';
import AwaitingFirstRoleplayView from '@/components/dashboard/views/AwaitingFirstRoleplayView';
import IdlePromptNewRoleplayView from '@/components/dashboard/views/IdlePromptNewRoleplayView';
import MainDashboardLayout from '@/components/dashboard/views/MainDashboardLayout';
import { useSalesMethodology, SalesMethodology } from '@/hooks/useSalesMethodology';
import { useDashboardDevTools, DevDisplayMode, DEV_MODES } from '@/hooks/useDashboardDevTools';
import PlanSection from '@/components/dashboard/PlanSection';
// Legacy voice training cards removed - using Deepgram Voice Agent only
import DeepgramVoiceAgentCard from '@/components/dashboard/DeepgramVoiceAgentCard';
import SimpleVoiceTraining from '@/components/voice/SimpleVoiceTraining';

// --- Type Definitions ---
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

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
  | 'IDLE_PROMPT_NEW_ROLEPLAY'
  | 'NEW_USER_NO_DATA';

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DashboardOnboardingData {
  answer_q1_product_value: string;
  answer_q1_combined?: string;
  answer_q2_audience?: string;
  answer_q4_style?: string; 
  answer_q4_methodology?: string;
  answer_q5_goal?: string;
  stage: string;
  businessType?: string;
  businessDescription?: string;
  extracted_sales_environment_details?: any;
  productInfo?: string; 
  audienceInfo?: string;
  salesStyle?: string;
  salesEnvironment?: string;
  answer_q1?: string;
  answer_q2?: string;
}

export type InsightCardData = DataPointHighlightProps | KeyMomentCardProps | ResourceSpotlightCardProps;

interface UserData {
  id: number;
  username: string;
  email: string;
  name?: string;
  role?: string;
  member_since?: string;
}

export interface KeyMetrics {
  sessions_count: number;
  training_time_hours: number;
  overall_score: number;
}

export interface SkillRadarData {
  rapport: number;
  discovery: number;
  presentation: number;
  objection_handling: number;
  closing: number;
}

export interface RecentSession {
  id: number;
  start_time: string;
  end_time?: string;
  duration?: number;
  status: string;
}

interface InsightAction {
  id: string;
  label: string;
  icon: string;
}

interface SkillsInsightData {
  id: string;
  skillArea: string;
  explanation: string;
  detailedExplanation?: string;
  score?: number;
  trend?: string;
  actions: InsightAction[];
}

interface CallInsightData {
  id: string;
  callId?: number;
  explanation: string;
  detailedExplanation?: string;
  score?: number;
  trend?: string;
  callSegment?: {
    start: string;
    end: string;
    transcript: string;
  };
  actions: InsightAction[];
}

interface ChallengeInsightData {
  id: string;
  challengeType: string;
  explanation: string;
  detailedExplanation?: string;
  difficulty?: string;
  estimatedTime?: string;
  actions: InsightAction[];
}

export interface AIInsightsApiResponse {
  skills_insights: SkillsInsightData | null;
  call_insights: CallInsightData | null;
  challenge_insights: ChallengeInsightData | null;
  priority_card: 'skills' | 'calls' | 'challenges' | string | null;
}

// Add AiPathState interface
export interface AiPathState {
  isActive: boolean;
  currentStep: number; // or string identifier for more complex paths
  pathType: string | null; // e.g., 'SKILL_IMPROVEMENT', 'CHALLENGE_PRACTICE', 'FIRST_ROLEPLAY_SETUP'
  pathData: any; // Specific data related to the path and step
}

// --- Constants ---
const userData = { id: 1, username: 'demo_user', email: 'demo@example.com', name: 'Cason', role: 'Sales Representative' };
const USER_NAME_STORAGE_KEY = 'pitchiq_user_preferred_name';
const USER_ROLEPLAY_KEY = 'ai_coach_has_completed_roleplay';
const GREETING_COMPLETE_KEY = 'pitchiq_greeting_complete';
const NEW_ANALYSIS_PENDING_KEY = 'pitchiq_new_analysis_pending';
const FIRST_ANALYSIS_VIEWED_KEY = 'pitchiq_first_analysis_viewed';
const CHAT_LOG_STORAGE_KEY = 'pitchiq_chat_log';
const COMPLETED_ROLEPLAYS_COUNT_KEY = 'pitchiq_completed_roleplays_count';
const REVEALED_FEATURES_STORAGE_KEY = 'pitchiq_revealed_features';
const ONBOARDING_DATA_KEY = 'ai_coach_onboarding_data';

const ALL_USER_DASHBOARD_STATES: UserDashboardState[] = [
  'FRESH_ONBOARDING_COMPLETE', 'AWAITING_FIRST_ROLEPLAY', 'FIRST_ROLEPLAY_DONE_ANALYSIS_PENDING',
  'SHOW_FIRST_ANALYSIS_DEEP_DIVE', 'SUBSEQUENT_ROLEPLAY_DONE_ANALYSIS_PENDING', 'SUBSEQUENT_ANALYSIS_READY',
  'SHOW_SUBSEQUENT_ANALYSIS_DEEP_DIVE', 'GENERAL_USE_IDLE', 'GENERAL_USE_ACTIVE_GOAL',
  'IN_TRAINING_MODULE', 'NEW_CONTENT_AVAILABLE', 'IDLE_PROMPT_NEW_ROLEPLAY', 'NEW_USER_NO_DATA'
];

export const MOCK_ROLEPLAY_ANALYSIS = { /* ... Full MOCK_ROLEPLAY_ANALYSIS definition ... */ };

export type DashboardTab = 'aiCoach' | 'myDashboard'; // New type for tabs

const Dashboard = () => {
  const navigate = useNavigate();

  // --- State Declarations (Reinstating some for devTools) ---
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>(localStorage.getItem(USER_NAME_STORAGE_KEY) || userData.name);
  const [userDashboardState, setUserDashboardState] = useState<UserDashboardState>('AWAITING_FIRST_ROLEPLAY');
  const [activeTab, setActiveTab] = useState<DashboardTab>('aiCoach');

  // States required by useDashboardDevTools for handleResetOnboardingFlow
  const [greetingComplete, setGreetingComplete] = useState(false);
  const [showAISummaryCard, setShowAISummaryCard] = useState(false);
  const [showExcitementCard, setShowExcitementCard] = useState(false);
  const [showRoleplayAnalysis, setShowRoleplayAnalysis] = useState(false);
  const [isFirstTimeAnalysisView, setIsFirstTimeAnalysisView] = useState(true);
  const [insightCards, setInsightCards] = useState<InsightCardData[]>([]);
  const [completedRoleplaysCount, setCompletedRoleplaysCount] = useState(0);
  const [revealedFeatureIds, setRevealedFeatureIds] = useState<Record<string, boolean>>({});
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [chatBarInitialQuery, setChatBarInitialQuery] = useState<string | null>(null);
  const [onboardingSummaryData, setOnboardingSummaryData] = useState<DashboardOnboardingData | null>(null);
  const [roleplayAnalysisData, setRoleplayAnalysisData] = useState<any>(null); // Keep as any for now if type is complex and not core to MVP
  const [isFocusedInsightMode, setIsFocusedInsightMode] = useState(false);
  const [hasCompletedRoleplay, setHasCompletedRoleplay] = useState(false);
  const [showSimpleVoiceTraining, setShowSimpleVoiceTraining] = useState(false);

  // --- Custom Hooks ---
  const { currentUserMethodology, handleMethodologyDisplayClick, setCurrentUserMethodology, setAiOriginalRecommendation, aiOriginalRecommendation } = useSalesMethodology();
  
  const devTools = useDashboardDevTools({
    userDashboardState, setUserDashboardState,
    userName, setUserName,
    
    setGreetingComplete,
    setShowAISummaryCard,
    setShowExcitementCard,
    setShowRoleplayAnalysis,
    setIsFirstTimeAnalysisView,
    setInsightCards,
    setCompletedRoleplaysCount,
    setRevealedFeatureIds,
    setChatLog,
    setChatBarInitialQuery,
    setOnboardingSummaryData,
    setRoleplayAnalysisData,
    setIsFocusedInsightMode,
    setHasCompletedRoleplay,
    
    greetingComplete,
    showAISummaryCard,

    USER_NAME_STORAGE_KEY,
    ONBOARDING_DATA_KEY,
    NEW_ANALYSIS_PENDING_KEY,
    USER_ROLEPLAY_KEY,
    GREETING_COMPLETE_KEY,
    FIRST_ANALYSIS_VIEWED_KEY,
    CHAT_LOG_STORAGE_KEY,
    COMPLETED_ROLEPLAYS_COUNT_KEY,
    REVEALED_FEATURES_STORAGE_KEY,
    userDataName: userData.name, 

    currentUserMethodology, 
    setCurrentUserMethodology, 
    aiOriginalRecommendation,
    setAiOriginalRecommendation 
  });

  // --- Simplified Handler Function Definitions ---

  const handleStartMvpRoleplay = () => {
    navigate('/chat');
  };

  const handleViewTraditionalDashboard = () => {
    setActiveTab('myDashboard');
  };

  // --- useEffect Hooks (Simplified for MVP) ---
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderTabNavigation = () => (
    <div className="mb-4 px-4 md:px-8 flex border-b border-slate-200">
      <button
        className={`py-3 px-4 font-medium text-sm md:text-base focus:outline-none ${activeTab === 'aiCoach' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
        onClick={() => setActiveTab('aiCoach')}
      >
        AI Coach
      </button>
      <button
        className={`py-3 px-4 font-medium text-sm md:text-base focus:outline-none ${activeTab === 'myDashboard' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
        onClick={() => setActiveTab('myDashboard')}
      >
        My Dashboard
      </button>
                </div>
              );

  const renderAiCoachTabContentMvp = () => (
    <div className="flex flex-col items-center justify-center flex-grow p-4 md:p-8">
      <button 
        onClick={handleStartMvpRoleplay}
        className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 p-12 text-center group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full max-w-2xl -mt-10"
      >
          <h2 className="text-3xl font-bold text-gray-800">
            Get Started
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Start your AI coaching session.
          </p>
      </button>
          </div>
  );

  const renderMyDashboardContentMvp = () => (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">My Dashboard</h2>
      </div>
      
      {/* Plan Section */}
      <PlanSection className="mb-6" />
      
      {/* Voice Training Card - Featured */}
              {/* Voice Training Options with Cost Comparison */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Choose Your Voice Training Experience</h3>
            <p className="text-sm text-gray-600">Revolutionary AI voice training with multiple approaches</p>
          </div>
          
          {/* Revolutionary Deepgram Voice Agent - Featured */}
          <div className="mb-8">
            <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-purple-300 mb-4">
              <h4 className="font-bold text-purple-900">🚀 REVOLUTIONARY NEW</h4>
              <p className="text-sm text-purple-800">Deepgram Voice Agent API</p>
              <p className="text-xs text-purple-700">Single WebSocket • Natural Conversations • Professional Grade</p>
            </div>
            <DeepgramVoiceAgentCard />
          </div>
          
          {/* Alternative: Simple Voice Training (Uses Standard STT/TTS) */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <div className="text-center mb-4">
              <h4 className="font-semibold text-gray-800">Alternative: Simple Voice Training</h4>
              <p className="text-sm text-gray-600">Uses standard Deepgram STT + TTS (works with any API key)</p>
            </div>
            <div className="flex justify-center">
              <Button 
                onClick={() => setShowSimpleVoiceTraining(true)}
                variant="outline"
                className="px-6 py-2"
              >
                Try Simple Voice Training
              </Button>
            </div>
          </div>
          
          {/* Cost warning removed - using single Deepgram Voice Agent solution */}
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Performance Overview</h3>
          <p className="text-slate-600">Your performance metrics will appear here as you complete more practice sessions.</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Recent Activity</h3>
          <p className="text-slate-600">Your recent coaching sessions and progress will be tracked here.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Insights & Recommendations</h3>
        <p className="text-slate-600">Personalized insights and coaching recommendations will be generated based on your practice sessions.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AppHeader currentUserMethodology={currentUserMethodology} onMethodologyClick={handleMethodologyDisplayClick} />
      
      {/* Make the main area a flex container so the content inside can grow to fill the space */}
      <main className="flex flex-col flex-grow pt-20">
        {renderTabNavigation()}

        {activeTab === 'aiCoach' && renderAiCoachTabContentMvp()}
        {activeTab === 'myDashboard' && renderMyDashboardContentMvp()}
      </main>

      {devTools.isDevToolsOpen && (
        <DashboardDevToolsPanel 
          onToggleVisibility={() => devTools.setIsDevToolsOpen(false)}
          onResetOnboarding={devTools.handleResetOnboardingFlow}
          onSetEmptyDashboardState={() => { devTools.setUserDashboardState('AWAITING_FIRST_ROLEPLAY'); console.log("DEV: Set to Empty (MVP)"); }}
          onSetSingleCardPromptState={() => { devTools.setUserDashboardState('AWAITING_FIRST_ROLEPLAY'); console.log("DEV: Set to Single Card (MVP)"); }}
        />
      )}
      {!devTools.isDevToolsOpen && (
        <Button variant="outline" size="icon" className="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white hover:text-blue-300 border-gray-700 z-50 rounded-full shadow-lg" onClick={() => devTools.setIsDevToolsOpen(true)} title="Open Developer Tools">
          <Settings2 size={22} />
        </Button>
      )}
      
      {/* Simple Voice Training Modal */}
      {showSimpleVoiceTraining && (
        <SimpleVoiceTraining onClose={() => setShowSimpleVoiceTraining(false)} />
      )}
    </div>
  );
};

export default Dashboard; 
