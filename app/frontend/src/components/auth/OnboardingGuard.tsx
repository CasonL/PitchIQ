import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const OnboardingGuard = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  const { user, isLoading } = useAuthContext();
  
  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }
  
  // Check both localStorage and backend user data for onboarding completion
  const localStorageComplete = localStorage.getItem('onboarding_complete') === 'true';
  const backendComplete = user?.onboarding_complete || false;
  const selectedTier = localStorage.getItem('selected_tier');
  
  // User must be authenticated and have completed onboarding in backend
  // If there's a mismatch, prefer the backend state (more authoritative)
  const isOnboardingComplete = backendComplete;
  
  // If localStorage disagrees with backend, sync it
  if (localStorageComplete !== backendComplete) {
    localStorage.setItem('onboarding_complete', backendComplete.toString());
  }

  if (!isOnboardingComplete) {
    // First check if user has selected a tier
    if (!selectedTier) {
      // Redirect to tier selection first
      return <Navigate to="/select-plan" state={{ from: location }} replace />;
    }
    
    // If tier is selected but onboarding not complete, redirect to appropriate onboarding
    if (selectedTier === 'enterprise') {
      return <Navigate to="/business-onboarding" state={{ from: location }} replace />;
    } else {
      return <Navigate to="/personalize" state={{ from: location }} replace />;
    }
  }

  return children;
};

export default OnboardingGuard; 