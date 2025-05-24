import React from 'react';
import { Button } from '@/components/ui/button';
import { Repeat, BookOpen, Zap } from 'lucide-react';

interface PostAnalysisNextStepsWidgetProps {
  userName?: string;
  onStartAnotherRoleplay: () => void;
  onExploreTraining?: () => void; // Optional for now
  // We could also pass a specific suggestedTrainingId here from the analysis
}

const PostAnalysisNextStepsWidget: React.FC<PostAnalysisNextStepsWidgetProps> = ({
  userName,
  onStartAnotherRoleplay,
  onExploreTraining,
}) => {
  return (
    <div className="bg-white p-8 rounded-xl shadow-xl text-center my-6 w-full max-w-lg mx-auto border border-gray-200/80">
      <div className="mx-auto mb-5 w-fit p-3 bg-green-100 rounded-full">
        <Zap size={28} className="text-green-600" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-3">
        Great Insights, {userName || 'Legend'}!
      </h3>
      <p className="text-gray-600 mb-8 text-md leading-relaxed max-w-md mx-auto">
        You've reviewed your analysis. Ready to put that feedback into practice or dive deeper into specific skills?
      </p>
      <div className="space-y-3 md:space-y-0 md:space-x-4 md:flex md:justify-center">
        <Button 
          onClick={onStartAnotherRoleplay} 
          size="lg"
          className="w-full md:w-auto py-3 text-base font-semibold bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg transition-colors duration-150"
        >
          <Repeat size={18} className="mr-2" />
          Start Another Roleplay
        </Button>
        {onExploreTraining && (
          <Button 
            onClick={onExploreTraining} 
            variant="outline"
            size="lg"
            className="w-full md:w-auto py-3 text-base font-semibold text-red-600 border-red-500 hover:bg-red-50 hover:text-red-700 shadow-sm hover:shadow-md transition-colors duration-150"
          >
            <BookOpen size={18} className="mr-2" />
            Explore Training Library
          </Button>
        )}
      </div>
    </div>
  );
};

export default PostAnalysisNextStepsWidget; 