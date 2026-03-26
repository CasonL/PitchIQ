/**
 * CharmerServicesContext - Provides centralized service instances to components
 * 
 * Benefits:
 * - Single source of truth for service instances
 * - Easier testing (can inject mock services)
 * - Cleaner dependency management
 * - Automatic cleanup on unmount
 */

import React, { createContext, useRef, ReactNode } from 'react';
import { CallOrchestrator } from '../services/CallOrchestrator';
import { TranscriptProcessor } from '../services/TranscriptProcessor';
import { ResponseCoordinator } from '../services/ResponseCoordinator';
import { PostCallAnalyzer } from '../services/PostCallAnalyzer';

export interface CharmerServices {
  callOrchestrator: CallOrchestrator;
  transcriptProcessor: TranscriptProcessor;
  responseCoordinator: ResponseCoordinator;
  postCallAnalyzer: PostCallAnalyzer;
}

export const CharmerServicesContext = createContext<CharmerServices | null>(null);

interface CharmerServicesProviderProps {
  children: ReactNode;
}

export function CharmerServicesProvider({ children }: CharmerServicesProviderProps) {
  // Create service instances once and keep them stable
  const servicesRef = useRef<CharmerServices | null>(null);

  if (!servicesRef.current) {
    console.log('🏗️ [CharmerServicesProvider] Initializing services');
    
    servicesRef.current = {
      callOrchestrator: new CallOrchestrator((state) => {
        console.log('📞 [CallOrchestrator] State changed:', state);
      }),
      transcriptProcessor: new TranscriptProcessor(),
      responseCoordinator: new ResponseCoordinator(),
      postCallAnalyzer: new PostCallAnalyzer()
    };
  }

  return (
    <CharmerServicesContext.Provider value={servicesRef.current}>
      {children}
    </CharmerServicesContext.Provider>
  );
}
