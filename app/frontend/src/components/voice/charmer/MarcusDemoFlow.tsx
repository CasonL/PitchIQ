/**
 * MarcusDemoFlow.tsx
 * Orchestrates the full Marcus demo experience
 * Now uses CharmerController's built-in flow: Landing → Challenge Lobby → Call → Score Reveal
 */

import React from 'react';
import { CharmerController } from './CharmerController';

interface MarcusDemoFlowProps {
  onComplete?: () => void;
  onStartTraining?: () => void;
}

export const MarcusDemoFlow: React.FC<MarcusDemoFlowProps> = ({
  onComplete,
  onStartTraining
}) => {
  // CharmerController now handles the complete flow internally:
  // 1. Landing page with "Start Demo" button
  // 2. Challenge lobby with 3 difficulty tiers
  // 3. Phone ringing + call interface
  // 4. Score reveal with retry/change difficulty
  return (
    <CharmerController
      onCallEnd={onComplete}
      onCallComplete={(data) => {
        console.log('✅ Marcus challenge completed:', data);
        if (onComplete) onComplete();
      }}
      aiModel="gpt-4o"
    />
  );
};

export default MarcusDemoFlow;
