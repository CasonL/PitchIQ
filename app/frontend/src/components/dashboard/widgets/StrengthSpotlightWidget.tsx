import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquarePlus } from 'lucide-react';

interface StrengthSpotlightWidgetProps {
  metricName: string;
  metricValue: string;
  achievementContext?: string;
  onUnderstand: () => void;
}

const StrengthSpotlightWidget: React.FC<StrengthSpotlightWidgetProps> = ({
  metricName,
  metricValue,
  achievementContext,
  onUnderstand,
}) => {
  return (
    <div className="p-5 bg-green-50 border-2 border-green-300 rounded-xl shadow-lg text-center w-full max-w-md mx-auto my-4 transform transition-all hover:scale-[1.02] duration-300 ease-out">
      <div className="flex justify-center items-center mb-3">
        <Sparkles size={28} className="text-green-600 mr-2" />
        <h3 className="text-xl font-semibold text-green-700">Strength Spotlight!</h3>
      </div>
      <p className="text-lg text-gray-700 mb-1">
        You excelled in <span className="font-bold text-green-600">{metricName}</span>
      </p>
      <p className="text-3xl font-bold text-green-500 mb-2">
        {metricValue}
      </p>
      {achievementContext && (
        <p className="text-sm text-green-600 italic mb-4">{achievementContext}</p>
      )}
      <Button 
        onClick={onUnderstand}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-colors duration-150 text-sm group"
      >
        <MessageSquarePlus size={18} className="mr-2 transition-transform duration-300 group-hover:rotate-[15deg]" />
        Understand My Success
      </Button>
    </div>
  );
};

export default StrengthSpotlightWidget; 