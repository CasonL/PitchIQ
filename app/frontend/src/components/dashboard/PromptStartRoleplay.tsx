import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';

interface PromptStartRoleplayProps {
  onStart: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
}

const PromptStartRoleplay: React.FC<PromptStartRoleplayProps> = ({
  onStart,
  title = "Ready for Your Next Challenge?",
  message = "Sharpen your skills and get valuable feedback. Start a new roleplay session with your AI Coach now!",
  buttonText = "Start New Roleplay"
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl shadow-2xl max-w-lg mx-auto">
      <PlayCircle size={64} className="text-primary mb-6" />
      <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>
      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
        {message}
      </p>
      <Button onClick={onStart} size="lg" className="px-8 py-3 text-lg">
        <PlayCircle size={20} className="mr-2" />
        {buttonText}
      </Button>
    </div>
  );
};

export default PromptStartRoleplay; 