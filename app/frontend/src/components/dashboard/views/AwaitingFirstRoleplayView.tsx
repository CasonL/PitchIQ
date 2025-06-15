import React from 'react';
import PromptStartRoleplay from '@/components/dashboard/PromptStartRoleplay';
import AICardSystem from '@/components/dashboard/AICardSystem';
import { Loader2, AlertTriangle, RefreshCw, Lightbulb } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { AIInsightsApiResponse } from '@/pages/Dashboard'; // Assuming type is exported from Dashboard.tsx

interface AwaitingFirstRoleplayViewProps {
  showGetStartedOptions: boolean;
  handleStartRoleplay: () => void; // This will be used for PromptStartRoleplay onStart and retry buttons
  insightsApiLoading: boolean;
  insightsApiError: string | null;
  aiInsightsData: AIInsightsApiResponse | null;
  // userName?: string; // If PromptStartRoleplay needs it and it comes from Dashboard state
}

const AwaitingFirstRoleplayView: React.FC<AwaitingFirstRoleplayViewProps> = ({
  showGetStartedOptions,
  handleStartRoleplay,
  insightsApiLoading,
  insightsApiError,
  aiInsightsData,
  // userName, // If passed
}) => {
  return (
    <>
      {/* Sub-case 1.1: Initial view, Get Started card not yet clicked */}
      {!showGetStartedOptions && (
        <div className="flex flex-col h-screen pt-20 bg-white overflow-hidden items-center justify-center p-4">
          <PromptStartRoleplay 
            onStart={handleStartRoleplay} 
            title={"Start Your First Sales Roleplay!"} 
            message={"Welcome to Pitch IQ! Let's get you started with your first AI-powered sales coaching session. Click below to begin."}
            // Pass userName here if it was part of props and needed by PromptStartRoleplay
            // userName={userName}
          />
        </div>
      )}
      {/* Sub-case 1.2: Get Started card clicked, show options or loading/error states */}
      {showGetStartedOptions && (
         <div className="mt-6 flex flex-col items-center justify-center p-4 min-h-screen pt-20"> {/* Ensure it takes screen height and centers */}
          {insightsApiLoading && (
            <div className="flex flex-col justify-center items-center p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-semibold text-gray-700">Loading your personalized suggestions...</p>
              <p className="text-sm text-gray-500">This may take a moment.</p>
            </div>
          )}
          {insightsApiError && (
            <div className="text-red-500 text-center p-4 bg-red-50 border border-red-300 rounded-lg shadow-md max-w-md">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                <p className="font-semibold text-lg text-red-700">Could Not Load Suggestions</p>
              </div>
              <p className="text-sm text-red-600 mb-3">We encountered an issue: {insightsApiError}.</p>
              <Button onClick={handleStartRoleplay} variant="outline" size="sm" className="border-red-500 text-red-600 hover:bg-red-100">
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>
          )}
          {!insightsApiLoading && !insightsApiError && aiInsightsData && (
            <div className="w-full max-w-3xl lg:max-w-4xl"> {/* AICardSystem container */}
              <AICardSystem 
                data={aiInsightsData} 
                loading={insightsApiLoading} 
                error={insightsApiError}
              />
            </div>
          )}
          {/* Fallback if no data, no error, not loading (e.g., API returns empty successfully but no specific cards) */}
          {!insightsApiLoading && !insightsApiError && !aiInsightsData && (
            <div className="text-center p-8 bg-gray-50 border border-gray-200 rounded-lg shadow-md max-w-md">
              <Lightbulb className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-700 mb-1">No Suggestions Available</p>
              <p className="text-sm text-gray-500 mt-1 mb-3">It seems there are no specific insights or suggestions for you at this moment. This could be temporary.</p>
               <Button onClick={handleStartRoleplay} variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-100">
                <RefreshCw className="mr-2 h-4 w-4" /> Check for Suggestions
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AwaitingFirstRoleplayView; 