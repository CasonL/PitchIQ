import React from 'react';
import PromptStartRoleplay from '@/components/dashboard/PromptStartRoleplay';

interface IdlePromptNewRoleplayViewProps {
  handleStartRoleplay: () => void;
  // userName?: string; // If PromptStartRoleplay ever needs it directly from here
}

const IdlePromptNewRoleplayView: React.FC<IdlePromptNewRoleplayViewProps> = ({
  handleStartRoleplay,
  // userName,
}) => {
  return (
    <div className="flex flex-col h-screen pt-20 bg-white overflow-hidden items-center justify-center p-4">
      <PromptStartRoleplay
        onStart={handleStartRoleplay}
        title={"Ready for Your Next Challenge?"}
        message={"Sharpen your skills and get valuable feedback. Start a new roleplay session with your AI Coach now!"}
        // userName={userName} // If needed
      />
    </div>
  );
};

export default IdlePromptNewRoleplayView; 