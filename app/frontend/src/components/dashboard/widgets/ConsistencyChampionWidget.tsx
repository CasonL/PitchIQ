import React from 'react';
import { Button } from '@/components/ui/button';
import { Award, MessageSquareHeart } from 'lucide-react'; // Using Award for champion, MessageSquareHeart for understanding positive consistency

interface ConsistencyChampionWidgetProps {
  skillName: string;
  durationContext?: string; // e.g., "over your last 3 sessions"
  onUnderstand: (details: { skillName: string }) => void;
}

const ConsistencyChampionWidget: React.FC<ConsistencyChampionWidgetProps> = ({
  skillName,
  durationContext,
  onUnderstand,
}) => {
  return (
    <div className="p-5 bg-blue-50 border-2 border-blue-300 rounded-xl shadow-lg text-center w-full max-w-md mx-auto my-4 transform transition-all hover:scale-[1.02] duration-300 ease-out">
      <div className="flex justify-center items-center mb-3">
        <Award size={28} className="text-blue-600 mr-2" />
        <h3 className="text-xl font-semibold text-blue-700">Consistency Champion!</h3>
      </div>
      <p className="text-lg text-gray-700 mb-1">
        Amazing consistency in <span className="font-bold text-blue-600">{skillName}</span>!
      </p>
      {durationContext && (
        <p className="text-sm text-blue-600 italic mb-4">{durationContext}</p>
      )}
      <p className="text-sm text-gray-600 mb-4">
        You're building strong, reliable habits. Keep it up!
      </p>
      <Button 
        onClick={() => onUnderstand({ skillName })}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-colors duration-150 text-sm group"
      >
        <MessageSquareHeart size={18} className="mr-2 transition-transform duration-300 group-hover:rotate-[10deg] group-hover:scale-110" />
        Reinforce This Skill
      </Button>
    </div>
  );
};

export default ConsistencyChampionWidget; 