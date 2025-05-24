import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MessageSquare, BarChart2, Target, BookOpen, Zap, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserDashboardState, PositiveFeedbackContext } from '@/pages/Dashboard'; // Import PositiveFeedbackContext
import MinimalAIChatBar from './MinimalAIChatBar'; // Import new component
import StartFirstRoleplayWidget from './StartFirstRoleplayWidget'; // Import new component
import AnalysisPendingWidget from './AnalysisPendingWidget'; // Import new widget
import SubsequentAnalysisReadyWidget from './SubsequentAnalysisReadyWidget'; // Import new widget
import StrengthSpotlightWidget from './widgets/StrengthSpotlightWidget'; // Import the new widget
import ConsistencyChampionWidget from './widgets/ConsistencyChampionWidget'; // Import new widget
import DataPointHighlightCard, { DataPointHighlightProps } from './widgets/DataPointHighlightCard'; // Import generic card and its props

interface StrengthSpotlightData {
  metricName: string;
  metricValue: string;
  achievementContext?: string;
}

interface ConsistencyChampionData {
  skillName: string;
  durationContext?: string;
}

// Make sure to export the props interface
export interface InteractiveAnalysisHubCardProps {
  userName?: string;
  userState: UserDashboardState; // Add userState prop
  onStartRoleplay?: () => void; // Add this prop for the widget
  onViewFocusedAnalysis?: () => void; // Renamed from onViewFullAnalysis, maps to SubsequentAnalysisReadyWidget
  strengthSpotlightData?: StrengthSpotlightData; // New prop for strength data
  consistencyChampionData?: ConsistencyChampionData; // Add prop for consistency data
  onUnderstandPositiveFeedback?: (context: PositiveFeedbackContext) => void; // Updated generic handler prop
  // NEW props for GENERAL_USE_ACTIVE_GOAL
  activeGoalName?: string;
  activeGoalDescription?: string;
  onPracticeGoal?: () => void; // Optional: Handler to start a practice session for the goal
  onViewGoalRelatedTraining?: () => void; // Optional: Handler to view training related to the goal
  // chatBarInitialQuery?: string | null; // REMOVED - Will be handled by TopLevelAIChatBar
  // Add other data props as needed for different states
  // latestAnalysisTeaser?: any;
  // NEW props for IN_TRAINING_MODULE
  trainingModuleName?: string;
  trainingModuleProgress?: string; // e.g., "Lesson 3/5" or "50%"
  onResumeTraining?: () => void;
  onAskAboutTraining?: (moduleName: string) => void; // Handler to pre-fill chat about training
  // NEW props for NEW_CONTENT_AVAILABLE
  newContentTitle?: string;
  newContentTeaser?: string;
  onExploreNewContent?: () => void;
  onAskAboutNewContent?: (contentTitle?: string) => void;
}

const InteractiveAnalysisHubCard: React.FC<InteractiveAnalysisHubCardProps> = ({
  userName,
  userState,
  onStartRoleplay,
  onViewFocusedAnalysis, // Renamed and to be used by SubsequentAnalysisReadyWidget
  strengthSpotlightData, // Destructure new prop
  consistencyChampionData, // Destructure new prop
  onUnderstandPositiveFeedback, // Destructure updated handler
  // Destructure NEW props
  activeGoalName,
  activeGoalDescription,
  onPracticeGoal,
  onViewGoalRelatedTraining,
  // chatBarInitialQuery, // REMOVED
  // latestAnalysisTeaser,
  trainingModuleName,
  trainingModuleProgress,
  onResumeTraining,
  onAskAboutTraining,
  // Destructure NEW props
  newContentTitle,
  newContentTeaser,
  onExploreNewContent,
  onAskAboutNewContent,
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // This internal expansion might be rethought later

  // Card's own animation for appearing (if not handled by parent)
  const initialCardAnimation = {
    opacity: 0,
    scale: 0.95,
    y: 20
  };
  const animateCardAnimation = {
    opacity: 1,
    scale: 1,
    y: 0
  };
  const cardTransition = { duration: 0.4, ease: "easeOut" };

  // handleChatSendMessage can be removed if no other internal chat originates here.
  // const handleChatSendMessage = (message: string) => {
  //   console.log("[InteractiveHub] Chat message sent:", message);
  //   // TODO: Integrate with actual chat service
  // };

  const renderContentForState = () => {
    const maybeStrengthSpotlight = strengthSpotlightData && onUnderstandPositiveFeedback && (
      <StrengthSpotlightWidget
        metricName={strengthSpotlightData.metricName}
        metricValue={strengthSpotlightData.metricValue}
        achievementContext={strengthSpotlightData.achievementContext}
        onUnderstand={() => onUnderstandPositiveFeedback({
          type: 'STRENGTH_SPOTLIGHT',
          data: { metricName: strengthSpotlightData.metricName, metricValue: strengthSpotlightData.metricValue }
        })}
      />
    );

    const maybeConsistencyChampion = consistencyChampionData && onUnderstandPositiveFeedback && (
      <ConsistencyChampionWidget
        skillName={consistencyChampionData.skillName}
        durationContext={consistencyChampionData.durationContext}
        onUnderstand={(details) => onUnderstandPositiveFeedback({
          type: 'CONSISTENCY_CHAMPION',
          data: { skillName: details.skillName }
        })}
      />
    );

    // Render DataPointHighlightCards if they exist
    // const highlightCards = dataHighlights && dataHighlights.length > 0 && onUnderstandDataPoint && (
    //   <div className="space-y-3 mb-4">
    //     {dataHighlights.map((highlight) => (
    //       <DataPointHighlightCard
    //         key={highlight.id}
    //         {...highlight} // Spread all props from the highlight object
    //         onUnderstand={onUnderstandDataPoint} // Pass the handler from Dashboard.tsx
    //       />
    //     ))}
    //   </div>
    // );

    switch (userState) {
      case 'AWAITING_FIRST_ROLEPLAY':
        return (
          <StartFirstRoleplayWidget 
            userName={userName} 
            onStartRoleplay={onStartRoleplay} 
            backgroundClass="bg-white text-gray-700 shadow-xl ring-1 ring-black ring-opacity-5"
          />
        );
      case 'FIRST_ROLEPLAY_DONE_ANALYSIS_PENDING':
        return (
          <>
            <AnalysisPendingWidget />
          </>
        );
      case 'SUBSEQUENT_ROLEPLAY_DONE_ANALYSIS_PENDING': // MVP: Reuses AnalysisPendingWidget
        return (
          <>
            <AnalysisPendingWidget message="Processing your latest roleplay data..." />
          </>
        );
      case 'SUBSEQUENT_ANALYSIS_READY':
        return (
          <>
            {onViewFocusedAnalysis && (
              <SubsequentAnalysisReadyWidget
                userName={userName}
                onViewAnalysis={onViewFocusedAnalysis} // Prop name for widget is onViewAnalysis
              />
            )}
          </>
        );
      case 'GENERAL_USE_IDLE':
        return (
          <div className="w-full my-2 p-3 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl shadow-xl ring-1 ring-blue-100 transition-all hover:shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <Zap size={28} className="text-blue-500 mb-2 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-800 mb-0.5">
                Welcome back, {userName || 'Sales Pro'}!
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Ready to sharpen your skills or explore insights?
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-center">
                {onStartRoleplay && (
                  <Button 
                    onClick={onStartRoleplay} 
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all w-full sm:w-auto text-sm"
                    size="sm" // Smaller button size
                  >
                    <Sparkles size={16} className="mr-1.5" /> Start New Roleplay
                  </Button>
                )}
                {/* Placeholder for future buttons - uncomment and implement when ready */}
                {/* 
                <Button 
                  variant="outline" 
                  className="text-blue-600 border-blue-500 hover:bg-blue-50 hover:text-blue-700 font-semibold py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition-all w-full sm:w-auto text-base"
                  size="lg"
                  // onClick={handleReviewPerformance} // Define this handler
                >
                  <BarChart2 size={18} className="mr-2" /> Review Performance
                </Button>
                <Button 
                  variant="outline" 
                  className="text-gray-600 border-gray-400 hover:bg-gray-50 hover:text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition-all w-full sm:w-auto text-base"
                  size="lg"
                  // onClick={handleExploreTraining} // Define this handler
                >
                  <BookOpen size={18} className="mr-2" /> Explore Training
                </Button> 
                */}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Or use the chat bar above to ask specific questions.
              </p>
            </div>
          </div>
        );
      case 'GENERAL_USE_ACTIVE_GOAL': // MVP
        return (
          <div className="w-full my-2 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-xl ring-1 ring-indigo-100 transition-all hover:shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <Target size={28} className="text-indigo-500 mb-2" />
              <h3 className="text-lg font-semibold text-gray-800 mb-0.5">
                Your Current Focus
              </h3>
              <p className="text-xl font-bold text-indigo-700 mb-1">
                {activeGoalName || 'Refining Your Pitch'} 
              </p>
              <p className="text-sm text-gray-600 mb-3 px-3">
                {activeGoalDescription || 'Let\'s work together to make your sales approach even more effective. Every bit of practice helps!'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-center">
                {onPracticeGoal && (
                  <Button 
                    onClick={onPracticeGoal} 
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <Zap size={16} className="mr-1.5" /> Practice This Goal
                  </Button>
                )}
                {onViewGoalRelatedTraining && (
                  <Button 
                    onClick={onViewGoalRelatedTraining}
                    variant="outline"
                    className="text-indigo-600 border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <BookOpen size={16} className="mr-1.5" /> See Related Training
                  </Button>
                )}
              </div>
              {!onPracticeGoal && !onViewGoalRelatedTraining && (
                <p className="text-sm text-gray-500 mt-4">
                  Keep focusing on this area. Your AI Coach is here to help via the chat bar above.
                </p>
              )}
            </div>
          </div>
        );
      case 'IN_TRAINING_MODULE': // MVP
        return (
          <div className="w-full my-2 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-xl ring-1 ring-teal-100 transition-all hover:shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <BookOpen size={28} className="text-teal-500 mb-2" />
              <h3 className="text-lg font-semibold text-gray-800 mb-0.5">
                Currently In Training
              </h3>
              <p className="text-xl font-bold text-teal-700 mb-1">
                {trainingModuleName || 'Sales Fundamentals'}
              </p>
              {trainingModuleProgress && (
                <p className="text-sm text-gray-600 mb-3">
                  Progress: {trainingModuleProgress}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-center">
                {onResumeTraining && (
                  <Button 
                    onClick={onResumeTraining} 
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <Zap size={16} className="mr-1.5" /> Resume Training
                  </Button>
                )}
                {onAskAboutTraining && trainingModuleName && (
                  <Button 
                    onClick={() => onAskAboutTraining(trainingModuleName!)}
                    variant="outline"
                    className="text-teal-600 border-teal-500 hover:bg-teal-50 hover:text-teal-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <MessageSquare size={16} className="mr-1.5" /> Ask About This
                  </Button>
                )}
              </div>
              {!onResumeTraining && (
                <p className="text-sm text-gray-500 mt-4">
                  Continue your learning journey. Your AI Coach is ready to assist via the chat bar above.
                </p>
              )}
            </div>
          </div>
        );
      case 'NEW_CONTENT_AVAILABLE': // MVP
        return (
          <div className="w-full my-2 p-3 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl shadow-xl ring-1 ring-rose-100 transition-all hover:shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <motion.div initial={{ scale: 1 }} animate={{ scale: [1, 1.1, 1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>
                <Gift size={28} className="text-rose-500 mb-2" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-800 mb-0.5">
                New For You!
              </h3>
              <p className="text-xl font-bold text-rose-700 mb-1">
                {newContentTitle || 'Updated Training Modules'}
              </p>
              <p className="text-sm text-gray-600 mb-3 px-3">
                {newContentTeaser || 'We\'ve added new resources and scenarios to help you grow.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-center">
                {onExploreNewContent && (
                  <Button 
                    onClick={onExploreNewContent} 
                    className="bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <Sparkles size={16} className="mr-1.5" /> Explore New Content
                  </Button>
                )}
                {onAskAboutNewContent && (
                  <Button 
                    onClick={() => onAskAboutNewContent(newContentTitle)}
                    variant="outline"
                    className="text-rose-600 border-rose-500 hover:bg-rose-50 hover:text-rose-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <MessageSquare size={16} className="mr-1.5" /> Ask About This
                  </Button>
                )}
              </div>
              {!onExploreNewContent && (
                 <p className="text-sm text-gray-500 mt-4">
                  Discover the latest enhancements. Feel free to ask your AI Coach about them via the chat bar above.
                </p>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div className="w-full text-center p-8 bg-white rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Interactive Hub</h3>
            <p className="text-sm text-gray-500 mb-4">
              Current State: <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{userState}</span> (MVP View)
            </p>
            {/* <MinimalAIChatBar
              onSendMessage={handleChatSendMessage}
              initialQueryText={chatBarInitialQuery}
            /> */}
          </div>
        );
    }
  };

  // The outer motion.div's animation is now primarily handled by the parent Dashboard.tsx
  // This component might not need its own complex entry animation anymore,
  // but keeping a simple one or removing it if parent handles all entry.
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: "circOut" }}
      className="w-full flex flex-col items-center space-y-2" // Added space-y-2 for multiple cards
    >
      {renderContentForState()}
    </motion.div>
  );
};

export default InteractiveAnalysisHubCard; 