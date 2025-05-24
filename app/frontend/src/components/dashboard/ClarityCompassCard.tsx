import React, { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, ChevronRight, ChevronLeft, Lightbulb, TrendingUp, Send, Sparkles, MessageSquareQuote } from 'lucide-react';

// Define the types for the props if any (e.g., feedback data)
interface ClarityCompassCardProps {
  // userName?: string; // Removed userName prop
  // Example: feedbackData: FeedbackDataType;
}

// Define the structure for different facets of the compass
type CompassFacetType = 
  // Removed 'greeting' facet
  | 'pivotalMoment' 
  | 'methodologyWisdom' 
  | 'mindsetNudge' 
  | 'skillSnapshot' 
  | 'pathForward';

// Interface for the data structure of each facet, making specific fields optional
interface FacetUIData {
  title: string;
  icon: React.ElementType; 
  content: string;
  details?: string;
  tip?: string;
  affirmation?: string;
  progress?: string;
  note?: string;
  action?: string;
}

const ClarityCompassCard: React.FC<ClarityCompassCardProps> = (/*{ userName = "User" }*/): ReactNode => { // Removed userName prop
  const [currentFacet, setCurrentFacet] = useState<CompassFacetType>('pivotalMoment'); // Start with pivotalMoment

  // Mock data for MVP - conforming to FacetUIData
  const mockData: Record<CompassFacetType, FacetUIData> = {
    // Removed greeting data
    pivotalMoment: {
      title: "Spotlight Pivotal Moment",
      icon: MessageSquareQuote,
      content: "In your last roleplay, when the prospect said they 'weren\'t sure about the budget,' you successfully pivoted by asking about the cost of inaction. This was a key turning point!",
      details: "You asked: 'Understanding the budget is important, but could we explore what challenges you\'d continue to face if this issue isn\'t addressed?'"
    },
    methodologyWisdom: {
      title: "Methodology-Matched Wisdom (Consultative)",
      icon: Sparkles,
      content: "That pivot aligns well with Consultative Selling - focusing on understanding deeper needs before discussing price. Great job diagnosing before prescribing!",
      tip: "Next time, you could follow up with another open-ended question to further explore the implications, like 'What impact does that challenge have on your team\'s overall goals?'"
    },
    mindsetNudge: {
      title: "Growth Mindset Nudge",
      icon: Lightbulb,
      content: "Embracing budget discussions as opportunities to reinforce value, rather than as obstacles, is a powerful mindset shift. You demonstrated that here.",
      affirmation: "I am confident in discussing value and budget effectively."
    },
    skillSnapshot: {
      title: "Skill Evolution Snapshot",
      icon: TrendingUp,
      content: "Focus Skill: Objection Handling",
      progress: "Improved: You successfully navigated 2 of 3 budget-related concerns this session, up from 1 of 3 previously.",
      note: "Keep practicing varied objection scenarios!"
    },
    pathForward: {
      title: "Path Forward",
      icon: Send,
      content: "For your next session, let\'s try a scenario with a prospect who has a very specific technical objection related to your product.",
      action: "Suggestion: Select the 'Technical Deep Dive' scenario type."
    }
  };

  const facetOrder: CompassFacetType[] = ['pivotalMoment', 'methodologyWisdom', 'mindsetNudge', 'skillSnapshot', 'pathForward']; // Removed greeting

  const currentIndex = facetOrder.indexOf(currentFacet);

  const navigateTo = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % facetOrder.length 
      : (currentIndex - 1 + facetOrder.length) % facetOrder.length;
    setCurrentFacet(facetOrder[newIndex]);
  };

  const renderFacetContent = () => {
    const data = mockData[currentFacet];
    const IconComponent = data.icon;

    // Removed conditional class for greeting
    const contentClassName = "text-gray-600";

    return (
      <motion.div
        key={currentFacet} 
        initial={{ opacity: 0, x: 50 }} // Standard slide-in for all facets now
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="p-6 h-full flex flex-col"
      >
        <div className="flex items-center mb-4">
          <IconComponent className="w-7 h-7 mr-3 text-blue-500" /> {/* Standard icon color */}
          <h3 className="text-xl font-semibold text-gray-700">{data.title}</h3> {/* Standard title color */}
        </div>
        <div className={`${contentClassName} space-y-3 flex-grow`}>
          {/* Removed TypingEffect for greeting */}
          <p>{data.content}</p>
          {data.details && <p className="text-sm text-gray-500 italic mt-2 p-2 bg-slate-50 rounded">{data.details}</p>}
          {data.tip && <p className="text-sm text-blue-600 mt-2 p-2 bg-blue-50 rounded"><span className="font-semibold">Actionable Tip:</span> {data.tip}</p>}
          {data.affirmation && <p className="text-sm text-green-600 mt-2 p-2 bg-green-50 rounded"><span className="font-semibold">Affirmation:</span> {data.affirmation}</p>}
          {data.progress && <p className="text-sm text-purple-600 mt-2 p-2 bg-purple-50 rounded"><span className="font-semibold">Progress:</span> {data.progress}</p>}
          {data.note && <p className="text-sm text-gray-500 mt-1">{data.note}</p>}
          {data.action && <p className="text-sm text-indigo-600 mt-2 p-2 bg-indigo-50 rounded"><span className="font-semibold">Suggestion:</span> {data.action}</p>}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ minHeight: '400px' }}>
        <div className="relative h-full flex flex-col justify-between">
          {/* Content Area */}
          <div className="flex-grow">
            <AnimatePresence mode='wait'>
              {renderFacetContent()}
            </AnimatePresence>
          </div>

          {/* Navigation & Progress Dots */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => navigateTo('prev')}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                aria-label="Previous Insight"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              
              <div className="flex space-x-2">
                {facetOrder.map((facet, index) => (
                  <button
                    key={facet}
                    onClick={() => setCurrentFacet(facet)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentIndex === index ? 'bg-blue-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to ${mockData[facet].title}`}
                  />
                ))}
              </div>

              <button 
                onClick={() => navigateTo('next')}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                aria-label="Next Insight"
              >
                <ChevronRight className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClarityCompassCard; 