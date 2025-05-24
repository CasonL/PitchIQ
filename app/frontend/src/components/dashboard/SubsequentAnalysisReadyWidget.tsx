import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

interface SubsequentAnalysisReadyWidgetProps {
  userName?: string;
  onViewAnalysis: () => void; // Changed prop name for clarity, but could be onViewFullAnalysis
  // We could add a prop for a very short summary snippet if available
  // latestPerformanceHighlight?: string;
}

const SubsequentAnalysisReadyWidget: React.FC<SubsequentAnalysisReadyWidgetProps> = ({
  userName,
  onViewAnalysis,
  // latestPerformanceHighlight,
}) => {
  return (
    <div className="bg-white p-8 rounded-xl shadow-xl text-center my-6 w-full max-w-lg mx-auto border border-gray-200/80 ring-1 ring-primary/5">
      <div className="mx-auto mb-5 w-fit p-3.5 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full shadow-lg">
        <CheckCircle2 size={32} className="text-white" />
      </div>
      <h3 className="text-3xl font-bold text-gray-800 mb-3">
        New Feedback Ready, {userName || 'Achiever'}!
      </h3>
      <p className="text-gray-600 mb-8 text-md leading-relaxed max-w-md mx-auto">
        You're making progress! Your latest focused feedback and performance trends are available.
      </p>
      {/* {latestPerformanceHighlight && (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md mb-6">
          <Sparkles size={16} className="inline mr-2 text-green-500" />
          {latestPerformanceHighlight}
        </p>
      )} */} 
      <Button 
        onClick={onViewAnalysis} 
        size="lg"
        className="w-full max-w-xs mx-auto py-3.5 text-base font-semibold bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white"
      >
        View Focused Feedback
        <ChevronRight size={20} className="ml-2" />
      </Button>
    </div>
  );
};

export default SubsequentAnalysisReadyWidget; 