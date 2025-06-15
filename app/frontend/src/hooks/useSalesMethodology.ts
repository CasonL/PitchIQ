import { useState, useEffect, useCallback } from 'react';

// --- Sales Methodology Type and Keys (copied from Dashboard.tsx) ---
export type SalesMethodology =
  | 'SPIN Selling'
  | 'Challenger Sale'
  | 'Solution Selling'
  | 'Consultative Selling'
  | 'Value Selling'
  | 'Pending Selection' // User wants to change, but hasn't picked yet
  | 'AI Recommended'    // Default or placeholder before first real suggestion
  | null;               // Not yet determined / Error

const USER_METHODOLOGY_STORAGE_KEY = 'pitchiq_user_methodology';
const AI_ORIGINAL_RECOMMENDATION_KEY = 'pitchiq_ai_original_recommendation';

// --- Custom Hook for Sales Methodology ---
export const useSalesMethodology = () => {
  const [currentUserMethodology, setCurrentUserMethodology] = useState<SalesMethodology>(() => {
    return (localStorage.getItem(USER_METHODOLOGY_STORAGE_KEY) as SalesMethodology) || 'AI Recommended';
  });
  const [showMethodologyChangeModal, setShowMethodologyChangeModal] = useState<boolean>(false);
  const [showMethodologySelectionModal, setShowMethodologySelectionModal] = useState<boolean>(false);
  const [methodologyBeforeChangeAttempt, setMethodologyBeforeChangeAttempt] = useState<SalesMethodology | null>(null);
  const [aiOriginalRecommendation, setAiOriginalRecommendation] = useState<SalesMethodology | null>(() => {
    return localStorage.getItem(AI_ORIGINAL_RECOMMENDATION_KEY) as SalesMethodology | null;
  });

  // Effect to save currentUserMethodology to localStorage
  useEffect(() => {
    if (currentUserMethodology) {
      localStorage.setItem(USER_METHODOLOGY_STORAGE_KEY, currentUserMethodology);
    } else {
      localStorage.removeItem(USER_METHODOLOGY_STORAGE_KEY);
    }
  }, [currentUserMethodology]);

  // Effect to save aiOriginalRecommendation to localStorage
  useEffect(() => {
    if (aiOriginalRecommendation) {
      localStorage.setItem(AI_ORIGINAL_RECOMMENDATION_KEY, aiOriginalRecommendation);
    } else {
      localStorage.removeItem(AI_ORIGINAL_RECOMMENDATION_KEY);
    }
  }, [aiOriginalRecommendation]);

  const handleMethodologyDisplayClick = useCallback(() => {
    console.log("Methodology display clicked. Current methodology:", currentUserMethodology);
    setShowMethodologyChangeModal(true);
  }, [currentUserMethodology, setShowMethodologyChangeModal]);

  const handleConfirmMethodologyChange = useCallback(() => {
    console.log("User confirmed methodology change. Setting to 'Pending Selection'.");
    setMethodologyBeforeChangeAttempt(currentUserMethodology);
    setCurrentUserMethodology('Pending Selection');
    setShowMethodologyChangeModal(false);
    setShowMethodologySelectionModal(true);
  }, [currentUserMethodology, setCurrentUserMethodology, setMethodologyBeforeChangeAttempt, setShowMethodologyChangeModal, setShowMethodologySelectionModal]);

  const handleFinalizeMethodologySelection = useCallback((newMethodology: SalesMethodology) => {
    if (newMethodology && newMethodology !== 'Pending Selection') {
      setCurrentUserMethodology(newMethodology);
      console.log("User finalized methodology selection to:", newMethodology);
    }
    setShowMethodologySelectionModal(false);
  }, [setCurrentUserMethodology, setShowMethodologySelectionModal]);

  const handleCancelMethodologySelection = useCallback(() => {
    if (methodologyBeforeChangeAttempt) {
      setCurrentUserMethodology(methodologyBeforeChangeAttempt);
      console.log("User cancelled methodology selection. Reverted to:", methodologyBeforeChangeAttempt);
    }
    setShowMethodologySelectionModal(false);
    setMethodologyBeforeChangeAttempt(null);
  }, [methodologyBeforeChangeAttempt, setCurrentUserMethodology, setMethodologyBeforeChangeAttempt, setShowMethodologySelectionModal]);

  return {
    currentUserMethodology,
    setCurrentUserMethodology, // Also return setter if Dashboard's handleOnboardingComplete needs it directly
    aiOriginalRecommendation,
    setAiOriginalRecommendation, // Also return setter if Dashboard's handleOnboardingComplete needs it
    showMethodologyChangeModal,
    setShowMethodologyChangeModal, // If needed by parent
    showMethodologySelectionModal,
    setShowMethodologySelectionModal, // If needed by parent
    handleMethodologyDisplayClick,
    handleConfirmMethodologyChange,
    handleFinalizeMethodologySelection,
    handleCancelMethodologySelection,
  };
}; 