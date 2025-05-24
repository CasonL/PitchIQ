import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, Sparkles } from 'lucide-react';

interface StartFirstRoleplayWidgetProps {
  onStartRoleplay: () => void;
  userName?: string;
  backgroundClass?: string;
}

const StartFirstRoleplayWidget: React.FC<StartFirstRoleplayWidgetProps> = ({
  onStartRoleplay,
  userName,
  backgroundClass = "bg-gradient-to-br from-blue-600 to-indigo-700 text-white"
}) => {
  return (
    <div className={`${backgroundClass} p-8 rounded-xl shadow-xl text-center my-6 w-full max-w-lg mx-auto ring-1 ring-white/10`}>
      <Sparkles size={36} className={`mx-auto mb-4 ${backgroundClass.includes('text-white') ? 'text-yellow-300' : 'text-blue-500'}`} />
      <h3 className={`text-3xl font-bold mb-3 ${!backgroundClass.includes('text-white') ? 'text-gray-800' : ''}`}>
        Welcome, {userName || 'Learner'}!
      </h3>
      <p className={`mb-8 text-md leading-relaxed max-w-md mx-auto ${backgroundClass.includes('text-white') ? 'text-blue-100' : 'text-gray-600'}`}>
        Your journey to sales mastery starts now. Complete your first AI roleplay to unlock personalized feedback and tailored training content.
      </p>
      <Button 
        onClick={onStartRoleplay} 
        size="lg"
        className={`w-full max-w-xs mx-auto py-3.5 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 
                    ${backgroundClass.includes('bg-white') 
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white' 
                        : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-indigo-700'}
                  `}
      >
        <PlayCircle size={20} className="mr-2.5" />
        Start Your First Roleplay
      </Button>
    </div>
  );
};

export default StartFirstRoleplayWidget; 