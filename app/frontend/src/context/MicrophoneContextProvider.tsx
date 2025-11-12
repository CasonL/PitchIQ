"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

interface MicrophoneContextType {
  microphone: MediaStreamAudioSourceNode | undefined;
  startMicrophone: () => void;
  setupMicrophone: () => Promise<void>;
  microphoneState: number | null;
  microphoneAudioContext: AudioContext | undefined;
  setMicrophoneAudioContext: (context: AudioContext | undefined) => void;
  processor: ScriptProcessorNode | undefined;
}

const MicrophoneContext = createContext<MicrophoneContextType | undefined>(undefined);

interface MicrophoneContextProviderProps {
  children: ReactNode;
}

const MicrophoneContextProvider = ({ children }: MicrophoneContextProviderProps) => {
  /**
   * Possible microphone states:
   * - not setup - null
   * - setting up - 0
   * - ready - 1
   * - open - 2
   * - paused - 3
   */
  const [microphoneState, setMicrophoneState] = useState<number | null>(null);
  const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | undefined>();
  const [microphoneAudioContext, setMicrophoneAudioContext] = useState<AudioContext | undefined>();
  const [processor, setProcessor] = useState<ScriptProcessorNode | undefined>();

  const setupMicrophone = async () => {
    setMicrophoneState(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          volume: 1.0,
          echoCancellation: true,
          noiseSuppression: false,
          latency: 0,
        },
      });

      const microphoneAudioContext = new AudioContext();
      const microphone = microphoneAudioContext.createMediaStreamSource(stream);
      const processor = microphoneAudioContext.createScriptProcessor(4096, 1, 1);

      setMicrophone(microphone);
      setMicrophoneAudioContext(microphoneAudioContext);
      setProcessor(processor);
      setMicrophoneState(1);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.name !== "NotFoundError" && err.name !== "NotAllowedError") {
        console.log(err.name);
      }
    }
  };

  const startMicrophone = useCallback(() => {
    if (microphone && processor && microphoneAudioContext) {
      microphone.connect(processor);
      processor.connect(microphoneAudioContext.destination);
      setMicrophoneState(2);
    }
  }, [processor, microphoneAudioContext, microphone]);

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        startMicrophone,
        setupMicrophone,
        microphoneState,
        microphoneAudioContext,
        setMicrophoneAudioContext,
        processor,
      }}
    >
      {children}
    </MicrophoneContext.Provider>
  );
};

function useMicrophone() {
  const context = useContext(MicrophoneContext);
  if (!context) {
    throw new Error("useMicrophone must be used within a MicrophoneContextProvider");
  }
  return context;
}

export { MicrophoneContextProvider, useMicrophone };
