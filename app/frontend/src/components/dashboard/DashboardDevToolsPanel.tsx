import React from 'react';
import type { UserDashboardState, SalesMethodology } from '@/pages/Dashboard'; // Assuming Dashboard.tsx exports this
import { Button } from '@/components/ui/button';
import { Settings2, X, RefreshCw, Zap, Eye, EyeOff, ToggleLeft, ToggleRight, ListPlus, ListX, PlusCircle, MinusCircle, InfoIcon, Sparkles, BookOpen, Edit3, Gift, CheckCircle } from 'lucide-react';
import type { DataPointHighlightProps } from './widgets/DataPointHighlightCard'; // Import the type
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, RotateCcw, AlertCircle } from 'lucide-react';

export interface DashboardDevToolsPanelProps {
  currentUserState: UserDashboardState;
  setUserState: (state: UserDashboardState) => void;
  allUserStates: UserDashboardState[];
  onToggleVisibility: () => void; // To close the panel
  onResetOnboarding: () => void;       // New prop
  onSimulateRoleplayDone: () => void;  // New prop
  onInstantOnboardingComplete: () => void; // <-- ADDED NEW PROP
  isFirstTimeAnalysisView: boolean;      // New prop
  toggleIsFirstTimeAnalysisView: () => void; // New prop
  showFullAnalysisCardView: boolean;    // New prop
  toggleShowFullAnalysisCardView: () => void; // New prop
  // New props for main card visibility toggles
  showAISummaryCardState: boolean;
  toggleShowAISummaryCard: () => void;
  showExcitementCardState: boolean;
  toggleShowExcitementCard: () => void;
  showRoleplayAnalysisState: boolean;
  toggleShowRoleplayAnalysis: () => void;
  greetingCompleteState: boolean;
  toggleGreetingComplete: () => void;

  // Data Highlight Props
  dataHighlights: DataPointHighlightProps[];
  onSimulatePositiveHighlight: () => void;
  onSimulateNegativeHighlight: () => void;
  onSimulateNeutralHighlight: () => void;
  onSimulateMixedHighlights: () => void;
  onClearDataHighlights: () => void;
  onSimulateKeyMomentCard?: () => void; // Added for KeyMomentCard simulation
  onSimulateResourceSpotlightCard?: () => void; // Added for ResourceSpotlightCard simulation

  // NEW Props for Hub Card Content Dev Inputs
  devActiveGoalName: string;
  setDevActiveGoalName: (value: string) => void;
  devActiveGoalDescription: string;
  setDevActiveGoalDescription: (value: string) => void;
  devTrainingModuleName: string;
  setDevTrainingModuleName: (value: string) => void;
  devTrainingModuleProgress: string;
  setDevTrainingModuleProgress: (value: string) => void;
  devNewContentTitle: string;
  setDevNewContentTitle: (value: string) => void;
  devNewContentTeaser: string;
  setDevNewContentTeaser: (value: string) => void;
  onResetRoleplayCount: () => void; // Add the new prop here

  // --- NEW: Props for Sales Methodology ---
  currentUserMethodology: SalesMethodology | null; 
  setCurrentUserMethodology: (methodology: SalesMethodology | null) => void; 
  availableMethodologies: SalesMethodology[]; 
  // --- END NEW ---

  // --- NEW: Prop for Extracted Sales Environment Details ---
  extractedSalesEnvDetails?: any;
  // --- END NEW ---

  onInstantOnboardingComplete: () => void; // <-- ADDED NEW PROP FOR DESTRUCTURING
}

const DashboardDevToolsPanel: React.FC<DashboardDevToolsPanelProps> = ({
  currentUserState,
  setUserState,
  allUserStates,
  onToggleVisibility,
  onResetOnboarding,
  onSimulateRoleplayDone,
  onInstantOnboardingComplete,
  isFirstTimeAnalysisView,
  toggleIsFirstTimeAnalysisView,
  showFullAnalysisCardView,
  toggleShowFullAnalysisCardView,
  showAISummaryCardState,
  toggleShowAISummaryCard,
  showExcitementCardState,
  toggleShowExcitementCard,
  showRoleplayAnalysisState,
  toggleShowRoleplayAnalysis,
  greetingCompleteState,
  toggleGreetingComplete,
  // Data Highlight Props
  dataHighlights,
  onSimulatePositiveHighlight,
  onSimulateNegativeHighlight,
  onSimulateNeutralHighlight,
  onSimulateMixedHighlights,
  onClearDataHighlights,
  onSimulateKeyMomentCard, // Added
  onSimulateResourceSpotlightCard, // Added
  // Destructure NEW Props
  devActiveGoalName,
  setDevActiveGoalName,
  devActiveGoalDescription,
  setDevActiveGoalDescription,
  devTrainingModuleName,
  setDevTrainingModuleName,
  devTrainingModuleProgress,
  setDevTrainingModuleProgress,
  devNewContentTitle,
  setDevNewContentTitle,
  devNewContentTeaser,
  setDevNewContentTeaser,
  onResetRoleplayCount, // Destructure the new prop
  // --- NEW: Destructure Sales Methodology Props ---
  currentUserMethodology,
  setCurrentUserMethodology,
  availableMethodologies,
  // --- END NEW ---

  // --- NEW: Destructure Extracted Sales Environment Details Prop ---
  extractedSalesEnvDetails,
  // --- END NEW ---
}) => {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-2xl z-50 w-full max-w-xs border border-gray-700 flex flex-col space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      <div className="flex justify-between items-center pb-2 border-b border-gray-700">
        <h3 className="text-md font-semibold flex items-center">
          <Settings2 size={18} className="mr-2 text-blue-400" />
          Dev Controls
        </h3>
        <Button variant="ghost" size="icon" onClick={onToggleVisibility} className="text-gray-400 hover:text-white h-7 w-7">
          <X size={18} />
        </Button>
      </div>

      {/* UserDashboardState Selector */}
      <div>
        <label htmlFor="userDashboardStateSelect" className="block text-xs font-medium text-gray-300 mb-0.5">
          Hub State:
        </label>
        <select
          id="userDashboardStateSelect"
          value={currentUserState}
          onChange={(e) => setUserState(e.target.value as UserDashboardState)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs text-white"
        >
          {allUserStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* Hub Card Content Inputs */}
      <div className="border-t border-gray-700 pt-2 space-y-1.5">
        <p className="text-xs text-gray-400 mb-1 font-medium flex items-center">
          <Edit3 size={14} className="mr-2 text-cyan-400" /> Hub Card Inputs:
        </p>
        <div className="space-y-1">
          <div>
            <label htmlFor="devActiveGoalName" className="block text-xs text-gray-300 mb-0.5">Active Goal Name:</label>
            <input type="text" id="devActiveGoalName" value={devActiveGoalName} onChange={(e) => setDevActiveGoalName(e.target.value)} placeholder="e.g., Improve Closing Rate" className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="devActiveGoalDescription" className="block text-xs text-gray-300 mb-0.5">Active Goal Desc:</label>
            <input type="text" id="devActiveGoalDescription" value={devActiveGoalDescription} onChange={(e) => setDevActiveGoalDescription(e.target.value)} placeholder="e.g., Focus on asking for the sale..." className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="devTrainingModuleName" className="block text-xs text-gray-300 mb-0.5">Training Module Name:</label>
            <input type="text" id="devTrainingModuleName" value={devTrainingModuleName} onChange={(e) => setDevTrainingModuleName(e.target.value)} placeholder="e.g., SPIN Selling" className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="devTrainingModuleProgress" className="block text-xs text-gray-300 mb-0.5">Training Progress:</label>
            <input type="text" id="devTrainingModuleProgress" value={devTrainingModuleProgress} onChange={(e) => setDevTrainingModuleProgress(e.target.value)} placeholder="e.g., Lesson 3/5 or 60%" className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="devNewContentTitle" className="block text-xs text-gray-300 mb-0.5">New Content Title:</label>
            <input type="text" id="devNewContentTitle" value={devNewContentTitle} onChange={(e) => setDevNewContentTitle(e.target.value)} placeholder="e.g., New Feature Unlocked!" className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="devNewContentTeaser" className="block text-xs text-gray-300 mb-0.5">New Content Teaser:</label>
            <input type="text" id="devNewContentTeaser" value={devNewContentTeaser} onChange={(e) => setDevNewContentTeaser(e.target.value)} placeholder="e.g., Explore the new AI insights..." className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 space-y-1.5">
        <Button onClick={onResetOnboarding} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          <RefreshCw size={14} className="mr-2 text-red-400" /> Reset Onboarding
        </Button>
        <Button onClick={onInstantOnboardingComplete} variant="outline" size="sm" className="w-full justify-start text-xs bg-green-600 hover:bg-green-500 border-green-500 hover:border-green-400 text-white">
          <CheckCircle size={14} className="mr-2 text-white" /> Instant Onboarding
        </Button>
        <Button onClick={onSimulateRoleplayDone} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          <Zap size={14} className="mr-2 text-yellow-400" /> Sim Roleplay Done
        </Button>
        <Button onClick={onResetRoleplayCount} variant="outline" size="sm" className="w-full justify-start text-xs bg-yellow-500 hover:bg-yellow-600 text-black">
          <RotateCcw size={14} className="mr-2" /> Reset Roleplay Count to 0
        </Button>
      </div>
      
      {/* Toggle Buttons for Analysis View */}
      <div className="border-t border-gray-700 pt-2 space-y-1.5">
         <p className="text-xs text-gray-400 mb-0.5">Analysis Card Debug:</p>
        <Button onClick={toggleIsFirstTimeAnalysisView} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          {isFirstTimeAnalysisView ? <EyeOff size={14} className="mr-2 text-purple-400" /> : <Eye size={14} className="mr-2 text-purple-400" />}
          Deep Dive: {isFirstTimeAnalysisView ? 'ON' : 'OFF'}
        </Button>
        <Button onClick={toggleShowFullAnalysisCardView} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          {showFullAnalysisCardView ? <EyeOff size={14} className="mr-2 text-teal-400" /> : <Eye size={14} className="mr-2 text-teal-400" />}
          Full Card: {showFullAnalysisCardView ? 'ON' : 'OFF'}
        </Button>
      </div>

      {/* Main Card Visibility Toggles */}
      <div className="border-t border-gray-700 pt-2 space-y-1.5">
        <p className="text-xs text-gray-400 mb-0.5">Core Card Visibility:</p>
        <Button onClick={toggleGreetingComplete} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          {greetingCompleteState ? <ToggleRight size={14} className="mr-2 text-green-400" /> : <ToggleLeft size={14} className="mr-2 text-gray-500" />}
          Greeting Done: {greetingCompleteState ? 'Y' : 'N'}
        </Button>
        <Button onClick={toggleShowAISummaryCard} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          {showAISummaryCardState ? <ToggleRight size={14} className="mr-2 text-green-400" /> : <ToggleLeft size={14} className="mr-2 text-gray-500" />}
          AI Summary Card: {showAISummaryCardState ? 'Y' : 'N'}
        </Button>
        <Button onClick={toggleShowExcitementCard} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          {showExcitementCardState ? <ToggleRight size={14} className="mr-2 text-green-400" /> : <ToggleLeft size={14} className="mr-2 text-gray-500" />}
          Excitement Card: {showExcitementCardState ? 'Y' : 'N'}
        </Button>
        <Button onClick={toggleShowRoleplayAnalysis} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          {showRoleplayAnalysisState ? <ToggleRight size={14} className="mr-2 text-green-400" /> : <ToggleLeft size={14} className="mr-2 text-gray-500" />}
          Analysis Card: {showRoleplayAnalysisState ? 'Y' : 'N'}
        </Button>
      </div>

      {/* Data Highlight Controls */}
      <div className="border-t border-gray-700 pt-2 space-y-1.5">
        <p className="text-xs text-gray-400 mb-0.5">Data Highlight Controls (Active: {dataHighlights.length}):</p>
        <Button onClick={onSimulatePositiveHighlight} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          <PlusCircle size={14} className="mr-2 text-green-400" /> Sim Positive Highlight
        </Button>
        <Button onClick={onSimulateNegativeHighlight} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          <MinusCircle size={14} className="mr-2 text-red-400" /> Sim Negative Highlight
        </Button>
        <Button onClick={onSimulateNeutralHighlight} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          <InfoIcon size={14} className="mr-2 text-blue-400" /> Sim Neutral Highlight
        </Button>
        <Button onClick={onSimulateMixedHighlights} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          <ListPlus size={14} className="mr-2 text-yellow-400" /> Sim Mixed Highlights
        </Button>
        {onSimulateKeyMomentCard && (
          <Button onClick={onSimulateKeyMomentCard} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
            {/* Consider an icon like MessageSquareText or Sparkles */} 
            <Sparkles size={14} className="mr-2 text-orange-400" /> Sim Key Moment Card
          </Button>
        )}
        {onSimulateResourceSpotlightCard && (
          <Button onClick={onSimulateResourceSpotlightCard} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
            {/* Consider an icon like BookOpen or Library */} 
            <BookOpen size={14} className="mr-2 text-sky-400" /> Sim Resource Card
          </Button>
        )}
        <Button onClick={onClearDataHighlights} variant="outline" size="sm" className="w-full justify-start text-xs bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500">
          <ListX size={14} className="mr-2 text-gray-500" /> Clear Highlights
        </Button>
        {dataHighlights.length > 0 && (
          <div className="mt-2 p-2 bg-gray-700 rounded text-xs max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
            <pre>{JSON.stringify(dataHighlights.map(h => ({ title: h.title, metric: h.metricName, sentiment: h.sentiment })), null, 2)}</pre>
          </div>
        )}
      </div>
      
      {/* --- NEW: Display Extracted Sales Environment Details --- */}
      {extractedSalesEnvDetails && Object.keys(extractedSalesEnvDetails).length > 0 && (
        <div className="border-t border-gray-700 pt-2 space-y-1.5">
          <p className="text-xs text-gray-400 mb-0.5 font-medium flex items-center">
            <BookOpen size={14} className="mr-2 text-indigo-400" /> Extracted Sales Env:
          </p>
          <details className="group bg-gray-750 p-1.5 rounded-md">
            <summary className="text-xs text-gray-300 cursor-pointer group-hover:text-white flex justify-between items-center">
              View Details
              <ChevronDown size={14} className="group-open:hidden" />
              <ChevronUp size={14} className="hidden group-open:inline" />
            </summary>
            <pre className="mt-1 p-2 bg-gray-900 rounded-sm text-xs overflow-x-auto text-gray-200">
              {JSON.stringify(extractedSalesEnvDetails, null, 2)}
            </pre>
          </details>
        </div>
      )}
      {/* --- END NEW --- */}

      {/* Sales Methodology Controls */}
      {availableMethodologies && availableMethodologies.length > 0 && (
        <div className="border-t border-gray-700 pt-2 space-y-1.5">
          <label htmlFor="salesMethodologySelect" className="block text-xs font-medium text-gray-300 mb-0.5">
            Sales Methodology:
          </label>
          <select
            id="salesMethodologySelect"
            value={currentUserMethodology || ''} // Handle null case for value
            onChange={(e) => setCurrentUserMethodology(e.target.value as SalesMethodology /* Corrected type casting */)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs text-white"
          >
            {availableMethodologies.map((methodology) => (
              <option key={methodology} value={methodology}>
                {methodology}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default DashboardDevToolsPanel; 