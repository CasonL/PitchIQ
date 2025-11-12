"use client";

import { DeepgramContextProvider } from "../../context/DeepgramContextProvider";
import { MicrophoneContextProvider } from "../../context/MicrophoneContextProvider";
import { VoiceBotProvider } from "../../context/VoiceBotContextProvider";
import { SamCoachAgentNew } from "./SamCoachAgentNew";

interface SamCoachAgentWrapperProps {
  onPersonaGenerated?: (persona: any) => void;
  className?: string;
}

export const SamCoachAgentWrapper: React.FC<SamCoachAgentWrapperProps> = ({ 
  onPersonaGenerated, 
  className 
}) => {
  return (
    <DeepgramContextProvider>
      <MicrophoneContextProvider>
        <VoiceBotProvider>
          <SamCoachAgentNew 
            onPersonaGenerated={onPersonaGenerated}
            className={className}
          />
        </VoiceBotProvider>
      </MicrophoneContextProvider>
    </DeepgramContextProvider>
  );
};
