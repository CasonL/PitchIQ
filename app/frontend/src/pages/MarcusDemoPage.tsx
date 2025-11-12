/**
 * MarcusDemoPage.tsx
 * Full-page Marcus demo experience
 */

import React from 'react';
import { MarcusDemoFlow } from '../components/voice/charmer/MarcusDemoFlow';
import { useNavigate } from 'react-router-dom';

export const MarcusDemoPage: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    console.log('Marcus demo completed');
    // Could track analytics here
  };

  const handleStartTraining = () => {
    console.log('User wants to start training');
    navigate('/dashboard'); // or wherever your main training lives
  };

  return (
    <div className="w-full h-full">
      <MarcusDemoFlow
        onComplete={handleComplete}
        onStartTraining={handleStartTraining}
      />
    </div>
  );
};

export default MarcusDemoPage;
