import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles, ChevronRight } from 'lucide-react';

interface FirstAnalysisReadyWidgetProps {
  userName?: string;
  onViewFullAnalysis: () => void;
  // highlightSnippet?: string; // Optional: For a teaser
}

const FirstAnalysisReadyWidget: React.FC<FirstAnalysisReadyWidgetProps> = ({
  userName,
  onViewFullAnalysis,
  // highlightSnippet,
}) => {
  return (
    <div className="bg-white p-8 rounded-xl shadow-xl text-center my-6 w-full max-w-lg mx-auto border border-gray-200/80 ring-1 ring-primary/10">
      <div className="mx-auto mb-5 w-fit p-3.5 bg-gradient-to-br from-red-500 to-orange-400 rounded-full shadow-lg">
        <Zap size={32} className="text-white" />
      </div>
      <h3 className="text-3xl font-bold text-gray-800 mb-3">
        Your In-Depth Analysis is Ready, {userName || 'Champion'}!
      </h3>
      <p className="text-gray-600 mb-8 text-md leading-relaxed max-w-md mx-auto">
        Great job on completing your first roleplay! Dive into your personalized feedback to uncover key insights and accelerate your growth.
      </p>
      {/* {highlightSnippet && (
        <p className="text-sm text-indigo-700 bg-indigo-50 p-3 rounded-md mb-6 italic">
          <Sparkles size={16} className="inline mr-2 text-indigo-500" />
          {highlightSnippet}
        </p>
      )} */} 
      <Button 
        onClick={onViewFullAnalysis} 
        size="lg"
        className="w-full max-w-xs mx-auto py-3.5 text-base font-semibold bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white"
      >
        View Full Analysis
        <ChevronRight size={20} className="ml-2" />
      </Button>
    </div>
  );
};

export default FirstAnalysisReadyWidget; 