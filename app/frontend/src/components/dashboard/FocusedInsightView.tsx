import React, { Dispatch, SetStateAction, RefObject } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import DataPointHighlightCard, { type DataPointHighlightProps } from '@/components/dashboard/widgets/DataPointHighlightCard';
import KeyMomentCard, { type KeyMomentCardProps } from '@/components/dashboard/widgets/KeyMomentCard';
import ResourceSpotlightCard, { type ResourceSpotlightCardProps } from '@/components/dashboard/widgets/ResourceSpotlightCard';
import TopLevelAIChatBar from '@/components/dashboard/TopLevelAIChatBar';
import type { UserDashboardState } from '@/pages/Dashboard'; // Assuming UserDashboardState is exported from Dashboard.tsx
import type { InsightCardData } from '@/pages/Dashboard'; // Assuming InsightCardData is exported

// Define type for chat messages if not already available globally
interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface FocusedInsightViewProps {
  insightCards: InsightCardData[];
  currentInsightIndex: number;
  handleShowPreviousInsight: () => void;
  handleShowNextInsight: () => void;
  setIsFocusedInsightMode: Dispatch<SetStateAction<boolean>>;
  setUserDashboardState: Dispatch<SetStateAction<UserDashboardState>>;
  chatBarRef: RefObject<HTMLDivElement>;
  chatBarInitialQuery: string | null;
  handleTopChatSendMessage: (message: string) => Promise<void>;
  chatLog: ChatMessage[];
  isAiTyping: boolean;
  isChatLogOpen: boolean;
  setIsChatLogOpen: Dispatch<SetStateAction<boolean>>;
  showFullChatHistory: boolean;
  setShowFullChatHistory: Dispatch<SetStateAction<boolean>>;
  // Add any other specific props identified from Dashboard.tsx's focused mode section
}

const FocusedInsightView: React.FC<FocusedInsightViewProps> = ({
  insightCards,
  currentInsightIndex,
  handleShowPreviousInsight,
  handleShowNextInsight,
  setIsFocusedInsightMode,
  setUserDashboardState,
  chatBarRef,
  chatBarInitialQuery,
  handleTopChatSendMessage,
  chatLog,
  isAiTyping,
  isChatLogOpen,
  setIsChatLogOpen,
  showFullChatHistory,
  setShowFullChatHistory,
}) => {
  return (
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
  );
};

export default FocusedInsightView; 