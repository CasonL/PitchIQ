import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle, ArrowRight, Sparkles, ChevronDown, Target, Users, Zap, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';
import { marked } from 'marked';
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from 'framer-motion';
import CoachDevTools from '@/components/coach/CoachDevTools';

interface UserProfile {
  name?: string;
  coach_persona?: string;
  p_value_prop?: string;
  p_sales_context?: string;
  p_sales_methodology?: string;
  p_product?: string;
  p_audience?: string;
  p_improvement_goal?: string;
}

interface ParsedCoachMessage {
  coachName: string;
  insights: string;
  plan: string;
  callToAction: string;
}

const fetchUserProfile = async (): Promise<UserProfile> => {
  try {
    console.log('🔍 Fetching user profile from /api/personalization/profile...');
    const response = await api.get('/api/personalization/profile');
    console.log('📋 Profile response:', response);
    
    // Check if response is HTML instead of JSON
    if (typeof response.data === 'string') {
      console.error('🚨 Profile API returned HTML instead of JSON:', response.data.substring(0, 200));
      throw new Error('Profile API returned HTML instead of JSON - likely an authentication issue');
    }
    
    // Additional validation to ensure we have a proper UserProfile object
    if (!response.data || typeof response.data !== 'object') {
      console.error('🚨 Profile API returned invalid data type:', typeof response.data);
      throw new Error('Profile API returned invalid data format');
    }
    
    return response.data;
  } catch (error) {
    console.error('🚨 Error fetching user profile:', error);
    throw error;
  }
};

// Modified parseCoachMessage to extract better prospect insights
const parseCoachMessage = (message: string, profile: UserProfile): ParsedCoachMessage => {
  console.log('🔍 Parsing coach message:', message.substring(0, 200) + '...');
  
  // Helper function to clean text
  const cleanText = (text: string): string => {
    if (!text) return '';
    let cleaned = text
      .replace(/^I sell\s*/i, '')
      .replace(/\s*I sell\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
  };

  const lines = message.split('\n').filter(line => line.trim());
  
  // Extract coach name from header (after "Meet" and before comma)
  const headerLine = lines.find(line => line.includes('Meet') || line.includes('coach'));
  let coachName = 'Your Coach';
  if (headerLine) {
    const nameMatch = headerLine.match(/Meet\s+([^,.\n]+)|coach\s+([^,.\n]+)/i);
    if (nameMatch) {
      coachName = (nameMatch[1] || nameMatch[2] || '').trim();
      if (coachName) {
        coachName = coachName.replace(/^(is|named|called)\s+/i, '');
      }
    }
  }

  // Split into paragraphs for better content extraction
  const paragraphs = message.split('\n\n').filter(p => p.trim() && p.length > 50);
  console.log('📋 Paragraphs found:', paragraphs.length);
  paragraphs.forEach((p, i) => console.log(`   ${i}: ${p.substring(0, 100)}...`));
  
  // Extract audience info from profile for fallbacks
  const audience = profile?.p_audience || 'your target audience';
  const product = profile?.p_product || 'your solution';
  
  // Create more meaningful defaults
  let insights = `${audience} face unique challenges in their industry. They prioritize practical solutions that deliver measurable results.`;
  let plan = `I'll help you master conversations with ${audience.toLowerCase()} through targeted practice scenarios.`;
  let callToAction = `Ready to master your conversations?`;
  
  if (paragraphs.length >= 1) {
    // Look for prospect psychology/insights content
    // This should contain words like "challenges", "priorities", "decision-making", "pressure", etc.
    const insightsParagraph = paragraphs.find(p => 
      (p.includes('challenges') || p.includes('prioritize') || p.includes('pressure') || 
       p.includes('decision') || p.includes('struggle') || p.includes('face') ||
       p.includes('tend to') || p.includes('typically') || p.includes('often') ||
       p.includes('understand') || p.includes('dynamics') || p.includes('nature')) &&
      !p.toLowerCase().includes('i\'ll help') && !p.toLowerCase().includes('coach') &&
      !p.toLowerCase().includes('i see you\'re working')
    );
    
    if (insightsParagraph) {
      console.log('✅ Found insights paragraph:', insightsParagraph.substring(0, 150) + '...');
      // Extract prospect insights - take first 2 sentences max
      const sentences = insightsParagraph.split('. ');
      if (sentences.length > 2) {
        insights = sentences.slice(0, 2).join('. ') + '.';
      } else {
        insights = insightsParagraph.trim();
      }
      // Clean up common AI prefixes
      insights = insights.replace(/^I see you're working with[^.]*\.\s*/i, '');
      insights = insights.replace(/^These (prospects|customers|clients)[^.]*\.\s*/i, '');
    } else {
      console.log('❌ No insights paragraph found');
    }
    
    // Look for coaching/training plan content - be more specific
    // This should NOT contain product descriptions but actual coaching methodology
    const planParagraph = paragraphs.find(p => 
      (p.toLowerCase().includes('i\'ll help') || p.toLowerCase().includes('as your') || 
       p.toLowerCase().includes('together') || p.toLowerCase().includes('practice') ||
       p.toLowerCase().includes('through realistic') || p.toLowerCase().includes('master') ||
       p.toLowerCase().includes('scenarios') || p.toLowerCase().includes('approach')) &&
      p !== insightsParagraph &&
      !p.toLowerCase().includes('i see you\'re working') &&
      !p.toLowerCase().includes('sales training solutions') &&
      !p.toLowerCase().includes('automated ai roleplays')
    );
    
    if (planParagraph) {
      console.log('✅ Found plan paragraph:', planParagraph.substring(0, 150) + '...');
      // Extract coaching plan - take full paragraph or reasonable length
      plan = planParagraph.trim();
      
      // Only truncate if it's extremely long (over 500 characters)
      if (plan.length > 500) {
        const sentences = plan.split('. ');
        // Take first 2-3 sentences that fit within 500 chars
        let result = '';
        for (let i = 0; i < sentences.length && result.length < 450; i++) {
          result += sentences[i] + (i < sentences.length - 1 ? '. ' : '');
        }
        plan = result;
      }
    } else {
      console.log('❌ No plan paragraph found, using fallback');
      // If no proper coaching plan found, create one based on the audience
      plan = `I'll help you master conversations with ${audience.toLowerCase()} through targeted practice scenarios and strategic coaching.`;
    }
  }
  
  // Final fallback if insights still look like product description
  if (insights.toLowerCase().includes('i see you\'re working with') || 
      insights.toLowerCase().includes(product.toLowerCase().substring(0, 20))) {
    insights = `Your prospects in this market are results-driven professionals who evaluate solutions based on ROI and practical implementation. They typically require clear evidence of value before making decisions.`;
  }

  console.log('🎯 Final parsed content:', {
    coachName: coachName || 'Your Coach',
    insights: (insights || `Working with ${audience.toLowerCase()} focused on ${product.toLowerCase()}.`).substring(0, 100) + '...',
    plan: (plan || `Targeted coaching for ${product} success.`).substring(0, 100) + '...'
  });

  return {
    coachName: coachName || 'Your Coach',
    insights: insights || `Working with ${audience.toLowerCase()} focused on ${product.toLowerCase()}.`,
    plan: plan || `Targeted coaching for ${product} success.`,
    callToAction: callToAction || 'Ready to master your conversations?'
  };
};

const MeetYourCoachPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for user profile - MOVED TO TOP so it's available to all useEffect hooks
  const { data: profile, isLoading, isError, error } = useQuery<UserProfile, Error>({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    retry: (failureCount, error) => {
      // Don't retry if we get HTML (authentication issue)
      if (error.message?.includes('HTML instead of JSON')) {
        console.log('🚫 Not retrying due to HTML response (auth issue)');
        return false;
      }
      // Default retry logic for other errors
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [isContentUpdating, setIsContentUpdating] = useState(false);
  const [enhancementData, setEnhancementData] = useState({
    core_q1_value: '',
    core_q4_style: '',
    core_q4_methodology: ''
  });
  const [isSmartFillLoading, setIsSmartFillLoading] = useState(false);
  
  // Add state for AI-generated coaching content
  const [parsedMessage, setParsedMessage] = useState<ParsedCoachMessage | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  
  // Simplified coach bubble state - single state to rule them all
  const [coachBubbleState, setCoachBubbleState] = useState<{
    isVisible: boolean;
    stage: 'hidden' | 'coach' | 'sentence1' | 'sentence2' | 'sentence3' | 'choices';
    showChoices: boolean;
  }>({
    isVisible: false,
    stage: 'hidden',
    showChoices: false
  });

  const [isABTestGroup, setIsABTestGroup] = useState(false);
  const [abTestRun, setAbTestRun] = useState(false);
  
  // Add state to track if Smart Fill has been used
  const [hasUsedSmartFill, setHasUsedSmartFill] = useState(() => {
    // Check localStorage to persist Smart Fill usage across page reloads
    const saved = localStorage.getItem('has_used_smart_fill');
    return saved === 'true';
  });

  // Add state to track if we just arrived from personalization
  const [hasCheckedInitialProfile, setHasCheckedInitialProfile] = useState(false);

  // Save Smart Fill usage state to localStorage
  useEffect(() => {
    localStorage.setItem('has_used_smart_fill', hasUsedSmartFill.toString());
  }, [hasUsedSmartFill]);

  // **COMPREHENSIVE RESET DETECTION** - Check for onboarding reset and clear all state
  useEffect(() => {
    const checkForReset = () => {
      const resetTimestamp = localStorage.getItem('coach_reset_timestamp');
      const lastKnownReset = sessionStorage.getItem('last_known_reset');
      
      // Only process reset if:
      // 1. There's actually a reset timestamp
      // 2. It's different from our last known reset  
      // 3. We don't have a valid profile with coach_persona (indicating an actual reset)
      // 4. We're not still loading profile data
      if (resetTimestamp && 
          resetTimestamp !== lastKnownReset && 
          !isLoading &&
          profile !== undefined &&
          (!profile || !profile.coach_persona)) {
        
        console.log('🔄 Explicit reset detected! Clearing all local state...');
        
        // Reset all local state
        setHasUsedSmartFill(false);
        setCurrentStep(0);
        setIsFormFocused(false);
        setIsContentUpdating(false);
        setEnhancementData({
          core_q1_value: '',
          core_q4_style: '',
          core_q4_methodology: ''
        });
        setIsSmartFillLoading(false);
        setParsedMessage(null);
        setIsGeneratingContent(false);
        setCoachBubbleState({
          isVisible: false,
          stage: 'hidden',
          showChoices: false
        });
        setIsABTestGroup(false);
        setAbTestRun(false);
        
        // Update our last known reset timestamp
        sessionStorage.setItem('last_known_reset', resetTimestamp);
        
        // Clear the reset timestamp flag since we've handled it
        localStorage.removeItem('coach_reset_timestamp');
        
        console.log('✅ Local state reset complete');
        
        // Show a toast to confirm reset
        toast({
          title: "Coach Reset Complete",
          description: "All enhancement data has been cleared. You can now create a new coach.",
          className: "bg-blue-500 text-white",
        });
        
        // Don't redirect here - let the normal useEffect handle it
        return;
      }
      
      // If there's a reset timestamp but we have a valid coach, just clear the timestamp
      // This prevents false positives from stale timestamps
      if (resetTimestamp && profile && profile.coach_persona) {
        console.log('🧹 Clearing stale reset timestamp - coach exists');
        localStorage.removeItem('coach_reset_timestamp');
        sessionStorage.setItem('last_known_reset', resetTimestamp);
      }
    };
    
    // Check for reset whenever profile data changes
    checkForReset();
  }, [profile, isLoading, toast]);

  // Legacy reset detection (keep for backward compatibility)
  useEffect(() => {
    // Listen for onboarding reset events (you'll need to implement this trigger)
    const handleOnboardingReset = () => {
      localStorage.removeItem('has_used_smart_fill');
      setHasUsedSmartFill(false);
    };
    
    // You can trigger this from your reset onboarding functionality
    window.addEventListener('onboarding-reset', handleOnboardingReset);
    return () => window.removeEventListener('onboarding-reset', handleOnboardingReset);
  }, []);

  // Generate content when profile loads or changes (now synchronous)
  useEffect(() => {
    if (profile && profile.coach_persona) {
      setIsGeneratingContent(true);
      try {
        const content = parseCoachMessage(profile.coach_persona, profile);
        setParsedMessage(content);
      } catch (error) {
        console.error('Failed to parse coach content:', error);
        // Use basic fallback
        setParsedMessage({
          coachName: 'Your Coach',
          insights: 'Your coach is ready to help you succeed.',
          plan: 'Personalized coaching for your specific needs.',
          callToAction: 'Ready to start practicing?'
        });
      } finally {
        setIsGeneratingContent(false);
      }
    }
  }, [profile]);

  // Load existing data into form with intelligent auto-population
  useEffect(() => {
    if (profile) {
      setEnhancementData({
        // Value Proposition: Use saved OR auto-populate from original "core problem" answer
        core_q1_value: profile.p_value_prop || '',
        
        // Sales Context: Use saved OR leave empty for user to enhance
        core_q4_style: profile.p_sales_context || '',
        
        // Sales Methodology: Use saved OR leave empty for user to enhance  
        core_q4_methodology: profile.p_sales_methodology || ''
      });
    }
  }, [profile]);

  // Handle profile loading errors and redirect logic
  useEffect(() => {
    // Handle authentication/API errors first
    if (isError && error) {
      console.error('🚨 Profile query error:', error);
      
      // If we get HTML response (authentication issue), redirect to login
      if (error.message?.includes('HTML instead of JSON')) {
        console.log('🔐 Authentication issue detected, redirecting to login');
        navigate('/login');
        return;
      }
      
      // For other errors, show a toast and redirect to personalize
      toast({
        title: "Error Loading Profile",
        description: "There was a problem loading your profile. Redirecting to setup.",
        variant: "destructive",
      });
      navigate('/personalize');
      return;
    }
    
    // Add a small delay on first load to allow profile to fully load
    if (!hasCheckedInitialProfile && !isLoading && !isError) {
      const timer = setTimeout(() => {
        setHasCheckedInitialProfile(true);
      }, 1000); // Give time for profile to load after navigation
      
      return () => clearTimeout(timer);
    }

    // Only redirect if we have fully checked and profile definitively has no coach
    // Also check if the profile is a valid object (not HTML or other invalid data)
    if (hasCheckedInitialProfile && 
        profile !== undefined && 
        profile !== null && 
        !isLoading && 
        !isError &&
        typeof profile === 'object' &&
        !Array.isArray(profile) &&
        !profile.coach_persona) {
      console.log('No coach persona found after full check, redirecting to /personalize', { 
        profile: typeof profile === 'object' ? 'valid object' : profile, 
        hasCoachPersona: !!profile.coach_persona,
        profileKeys: profile && typeof profile === 'object' ? Object.keys(profile) : 'invalid profile',
        isLoading
      });
      navigate('/personalize');
    } else if (profile && typeof profile === 'object' && profile.coach_persona) {
      console.log('Coach persona exists, staying on page', { 
        hasCoachPersona: !!profile.coach_persona,
        coachPersonaLength: profile.coach_persona ? profile.coach_persona.length : 0
      });
    } else if (profile && typeof profile !== 'object') {
      console.error('🚨 Profile is not a valid object, ignoring redirect logic', {
        profileType: typeof profile,
        profilePreview: String(profile).substring(0, 100)
      });
    }
  }, [profile, navigate, hasCheckedInitialProfile, isLoading, isError, error, toast]);

  // Initialize A/B test group on component mount, only after profile loads
  useEffect(() => {
    // Only run the A/B test if we have the profile and we haven't run it before
    if (profile && !abTestRun) {
      // Check for forced group assignment (for testing)
      const forcedGroup = localStorage.getItem('force_ab_group');
      let abTestValue;
      
      if (forcedGroup === 'animated') {
        abTestValue = true;
      } else if (forcedGroup === 'regular') {
        abTestValue = false;
      } else {
        // Simple A/B test - 50% get the animated experience
        abTestValue = Math.random() < 0.5;
      }
      
      setIsABTestGroup(abTestValue);
      setAbTestRun(true); // Mark the test as run
      
      // Log for analytics (you can replace with actual analytics)
      console.log(`A/B Test: User assigned to ${abTestValue ? 'Animated Coach' : 'Regular'} group ${forcedGroup ? '(FORCED)' : '(RANDOM)'}`);
      
      // Track A/B test assignment
      trackEvent('smart_fill_ab_test_assigned', {
        group: abTestValue ? 'animated' : 'regular',
        assignment_method: forcedGroup ? 'forced' : 'random',
        user_id: profile.name || 'anonymous' // profile is guaranteed to exist here
      });
    }
  }, [profile, abTestRun]);

  // Create a subtle typing sound for immersion
  const createTypingSound = () => {
    // REMOVED: Audio context creation - no longer needed
    // const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // const oscillator = audioContext.createOscillator();
    // const gainNode = audioContext.createGain();
    
    // ... rest of audio code removed
  };

  // Initialize typing sound on component mount
  useEffect(() => {
    // REMOVED: Audio initialization - no longer needed
    // audioRef.current = { play: createTypingSound } as any;
  }, []);

  // Enhanced bubble timing sequence with cleanup and error handling
  useEffect(() => {
    if (coachBubbleState.stage === 'hidden') return;
    
    let timeoutId: NodeJS.Timeout;
    
    const executeStageTransition = () => {
      switch (coachBubbleState.stage) {
        case 'coach':
          // Stage 1: Show "COACH" immediately, wait 1.5s for first sentence
          timeoutId = setTimeout(() => {
            setCoachBubbleState(prev => ({ ...prev, stage: 'sentence1' }));
          }, 1500);
          break;
          
        case 'sentence1':
          // Stage 2: Show first sentence, wait 0.5s for second sentence
          timeoutId = setTimeout(() => {
            setCoachBubbleState(prev => ({ ...prev, stage: 'sentence2' }));
          }, 500);
          break;
          
        case 'sentence2':
          // Stage 3: Show second sentence, wait 0.5s for third sentence
          timeoutId = setTimeout(() => {
            setCoachBubbleState(prev => ({ ...prev, stage: 'sentence3' }));
          }, 500);
          break;
          
        case 'sentence3':
          // Stage 4: Show third sentence, wait 0.5s then show choices
          timeoutId = setTimeout(() => {
            setCoachBubbleState(prev => ({
              ...prev,
              stage: 'choices',
              showChoices: true
            }));
          }, 500);
          break;
          
        case 'choices':
          // Final stage - choices are visible, no further transitions
          break;
      }
    };

    executeStageTransition();

    // Cleanup function to prevent memory leaks
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [coachBubbleState.stage]);

  const enhanceMutation = useMutation({
    mutationFn: async (data: typeof enhancementData) => {
      // Use the same API instance that handles CSRF tokens
      return await api.post('/api/personalization/personalize', data);
    },
    onSuccess: (response) => {
      // Start the dramatic fade effect
      setIsContentUpdating(true);
      
      // Mark Smart Fill as used (but keep the enhanced data visible)
      setHasUsedSmartFill(true);
      
      toast({
        title: "Coach Enhanced!",
        description: "Your AI coach has been updated with your additional details.",
        className: "bg-green-500 text-white",
      });
      
      // Refresh the profile data to show updated coach message
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      // End the fade effect after content updates
      setTimeout(() => {
        setIsContentUpdating(false);
      }, 600);
    },
    onError: (error: any) => {
      console.error('Enhancement failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      toast({
        title: "Enhancement Failed",
        description: `There was a problem updating your coach: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  const handleEnhance = () => {
    // Check if there are any changes to enhance
    const hasChanges = 
      enhancementData.core_q1_value.trim() !== (profile?.p_value_prop || '').trim() ||
      enhancementData.core_q4_style.trim() !== (profile?.p_sales_context || '').trim() ||
      enhancementData.core_q4_methodology.trim() !== (profile?.p_sales_methodology || '').trim();

    if (!hasChanges) {
      toast({
        title: "No Changes",
        description: "Please fill in at least one field to enhance your coach.",
        variant: "destructive",
      });
      return;
    }
    
    // Track enhance button click
    trackEvent('enhance_coach_clicked', {
      ab_group: isABTestGroup ? 'animated' : 'regular',
      has_value_prop: !!enhancementData.core_q1_value.trim(),
      has_sales_context: !!enhancementData.core_q4_style.trim(),
      has_methodology: !!enhancementData.core_q4_methodology.trim(),
      total_fields_filled: [
        enhancementData.core_q1_value.trim(),
        enhancementData.core_q4_style.trim(), 
        enhancementData.core_q4_methodology.trim()
      ].filter(Boolean).length
    });
    
    console.log('Submitting enhancement data:', enhancementData);
    enhanceMutation.mutate(enhancementData);
  };

  const handleSmartFill = async () => {
    if (!profile) return;
    
    // Prevent multiple uses of Smart Fill
    if (hasUsedSmartFill) {
      toast({
        title: "Smart Fill Already Used",
        description: "You can only use Smart Fill once per session.",
        variant: "destructive",
      });
      return;
    }
    
    // Track smart fill button click
    trackEvent('smart_fill_clicked', {
      ab_group: isABTestGroup ? 'animated' : 'regular'
    });
    
    // Check if user is in A/B test group for animated experience
    if (isABTestGroup) {
      // Start the clean linear sequence
      setCoachBubbleState({
        isVisible: true,
        stage: 'coach',
        showChoices: false
      });
      
      // Track animation started
      trackEvent('coaching_bubble_sequence_started', {
        ab_group: 'animated'
      });
    } else {
      // Regular smart fill for control group - direct enhancement
      handleEnhanceChoice();
    }
  };

  const handleEnhanceChoice = async () => {
    // User chose to enhance - perform the smart fill
    setCoachBubbleState({
      isVisible: false,
      stage: 'hidden',
      showChoices: false
    });
    
    trackEvent('coaching_bubble_enhance_chosen', {
      ab_group: 'animated'
    });
    
    await performSmartFill();
  };

  const handleDismissChoice = () => {
    // User chose to dismiss - close the bubble
    setCoachBubbleState({
      isVisible: false,
      stage: 'hidden',
      showChoices: false
    });
    
    trackEvent('coaching_bubble_dismissed', {
      ab_group: 'animated'
    });
  };

  const performSmartFill = async () => {
    try {
      setIsSmartFillLoading(true);
      
      // Mark Smart Fill as used
      setHasUsedSmartFill(true);
      
      // Track smart fill API call start
      trackEvent('smart_fill_api_started', {
        ab_group: isABTestGroup ? 'animated' : 'regular'
      });
      
      // Call premium backend Smart Fill API
      const response = await api.post('/api/personalization/smart-fill');
      const { enhancements } = response.data;
      
      // Apply the premium AI-generated enhancements
      setEnhancementData({
        core_q1_value: enhancements.value_proposition || enhancementData.core_q1_value,
        core_q4_style: enhancements.sales_context || enhancementData.core_q4_style,
        core_q4_methodology: enhancements.sales_methodology || enhancementData.core_q4_methodology
      });
      
      // Track successful smart fill
      trackEvent('smart_fill_completed', {
        ab_group: isABTestGroup ? 'animated' : 'regular',
        fields_filled: Object.keys(enhancements).length
      });
      
      toast({
        title: "Smart Fill Complete!",
        description: "Premium AI enhancements have been applied to your coach.",
        className: "bg-blue-500 text-white",
      });
      
    } catch (error: any) {
      console.error('Smart Fill failed:', error);
      
      // Track smart fill failure
      trackEvent('smart_fill_failed', {
        ab_group: isABTestGroup ? 'animated' : 'regular',
        error: error.message
      });
      
      toast({
        title: "Smart Fill Failed",
        description: "There was a problem generating enhancements.",
        variant: "destructive",
      });
    } finally {
      setIsSmartFillLoading(false);
    }
  };

  // Analytics tracking function
  const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
    // Simple console logging for now - replace with your analytics service
    console.log(`Analytics Event: ${eventName}`, {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...properties
    });
    
    // You can replace this with your analytics service (e.g., Mixpanel, Google Analytics, etc.)
    // Example: analytics.track(eventName, properties);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-lg text-gray-600">Meeting your new AI Coach...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">{error?.message}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!profile?.coach_persona) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Coach Persona Found</h2>
          <p className="text-gray-600 mb-4">Let's create your personalized AI coach first.</p>
          <Link to="/personalize">
            <Button>Create Your Coach</Button>
          </Link>
        </div>
      </div>
    );
  }

  const coachSteps = [
    {
      title: "Know Your Prospects",
      icon: Users,
      content: parsedMessage?.insights || '',
      color: "from-gray-800 to-gray-900"
    },
    {
      title: "My Training Plan", 
      icon: Zap,
      content: parsedMessage?.plan || '',
      color: "from-gray-800 to-gray-900"
    },
    {
      title: "Ready to Dominate?",
      icon: Target,
      content: parsedMessage?.callToAction || '',
      color: "from-gray-800 to-gray-900"
    }
  ];

  const nextStep = () => {
    if (currentStep < coachSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progressPercentage = coachSteps.length > 1 ? (currentStep / (coachSteps.length - 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-rose-100">
      <div className="container mx-auto px-4 py-6">
        {/* PitchIQ Header - Balanced Size */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Pitch<span className="text-red-600">IQ</span>
            </h1>
            <p className="text-lg text-gray-600">Your AI coach is ready to make you unstoppable</p>
          </div>
        </div>

        <div className="flex gap-7 max-w-7xl mx-auto">
          {/* Main Content Area - 60% */}
          <div className={`flex-[3] max-w-none transition-opacity duration-500 ${
            isContentUpdating ? 'opacity-0' : 'opacity-100'
          }`}>
            {/* Coach Introduction Card - Medium Size */}
            <Card className="mb-7 shadow-lg border-red-100">
              <CardContent className="p-7">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-white">{parsedMessage?.coachName.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold text-gray-900">Meet {parsedMessage?.coachName}</h2>
                      {/* Enhancement Status Badge */}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (profile?.p_value_prop || profile?.p_sales_context || profile?.p_sales_methodology) 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {(profile?.p_value_prop || profile?.p_sales_context || profile?.p_sales_methodology) 
                          ? 'Enhanced' 
                          : 'Not enhanced'
                        }
                      </div>
                    </div>
                    <p className="text-base text-gray-600">
                      Your AI sparring partner for sales success
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step-by-Step Progress Cards - Balanced Spacing */}
            <div className="space-y-5">
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-5">
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              {/* Current Step Card - Medium Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="shadow-lg overflow-hidden border-red-100">
                    <CardContent className="p-0">
                      <div className={`bg-gradient-to-r ${coachSteps[currentStep].color} p-5 text-white`}>
                        <div className="flex items-center gap-3">
                          {React.createElement(coachSteps[currentStep].icon, { className: "h-7 w-7" })}
                          <h3 className="text-xl font-bold">{coachSteps[currentStep].title}</h3>
                        </div>
                      </div>
                      <div className="p-7">
                        <p className="text-base text-gray-700 leading-relaxed">
                          {coachSteps[currentStep].content}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons - Balanced */}
              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex gap-2">
                  {coachSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentStep 
                          ? 'bg-red-500 scale-125' 
                          : index <= currentStep 
                          ? 'bg-red-300' 
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {currentStep < coachSteps.length - 1 ? (
                  <Button
                    onClick={nextStep}
                    className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Link to="/chat">
                    <Button className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-6 py-2">
                      Start Sparring Session
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Enhancement Panel - 40% */}
          <div className={`flex-[2] flex-shrink-0 transition-opacity duration-500 ${
            isContentUpdating ? 'opacity-60 pointer-events-none' : 'opacity-100'
          }`}>
            <Card className="sticky top-6 shadow-lg border-red-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-red-500" />
                    Enhance Coach
                  </h3>
                  <div className="relative">
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={handleSmartFill}
                      disabled={isSmartFillLoading || isContentUpdating || hasUsedSmartFill}
                      className={`flex items-center gap-1 text-xs ${
                        hasUsedSmartFill 
                          ? 'border-gray-200 text-gray-400 bg-gray-50' 
                          : 'border-red-200 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {isSmartFillLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : hasUsedSmartFill ? (
                        <>✓</>
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      {hasUsedSmartFill ? 'Used' : 'Smart Fill'}
                    </Button>
                    
                    {/* Redesigned Animated Coaching Bubble */}
                    <AnimatePresence>
                      {coachBubbleState.isVisible && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="absolute top-full mt-3 right-0 w-80 bg-gray-900 text-white p-4 rounded-lg shadow-2xl z-50 border border-gray-700"
                        >
                          {/* Speech bubble arrow */}
                          <div className="absolute -top-2 right-8 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                          
                          <div className="text-sm">
                            {/* Always show COACH title */}
                            <div className="font-bold text-red-400 mb-2 text-xs tracking-wider">COACH</div>
                            
                            {/* Linear progression of content based on stage */}
                            <div className="leading-relaxed text-gray-100 space-y-2">
                              {coachBubbleState.stage !== 'coach' && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  Nice try, but top performers know their pitch cold.
                                </motion.div>
                              )}
                              
                              {(coachBubbleState.stage === 'sentence2' || 
                                coachBubbleState.stage === 'sentence3' || 
                                coachBubbleState.stage === 'choices') && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  Think you can beat the AI?
                                </motion.div>
                              )}
                              
                              {(coachBubbleState.stage === 'sentence3' || 
                                coachBubbleState.stage === 'choices') && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  Here's your starting point...
                                </motion.div>
                              )}
                            </div>
                            
                            {/* Choice buttons appear at the end */}
                            {coachBubbleState.showChoices && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.3 }}
                                className="flex gap-2 mt-4 pt-3 border-t border-gray-700"
                              >
                                <Button
                                  size="sm"
                                  onClick={handleEnhanceChoice}
                                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                                >
                                  Enhance
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleDismissChoice}
                                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 text-xs font-medium"
                                >
                                  I'll Type
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Value Proposition
                    </label>
                    <Textarea
                      placeholder="What makes your offering unstoppable?"
                      value={enhancementData.core_q1_value}
                      onChange={(e) => setEnhancementData(prev => ({
                        ...prev,
                        core_q1_value: e.target.value
                      }))}
                      onFocus={() => setIsFormFocused(true)}
                      onBlur={() => setIsFormFocused(false)}
                      disabled={isContentUpdating}
                      className="h-24 resize-none text-sm border-red-100 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sales Context
                    </label>
                    <Textarea
                      placeholder="Describe your selling environment..."
                      value={enhancementData.core_q4_style}
                      onChange={(e) => setEnhancementData(prev => ({
                        ...prev,
                        core_q4_style: e.target.value
                      }))}
                      onFocus={() => setIsFormFocused(true)}
                      onBlur={() => setIsFormFocused(false)}
                      disabled={isContentUpdating}
                      className="h-24 resize-none text-sm border-red-100 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sales Methodology
                    </label>
                    <Textarea
                      placeholder="Your preferred approach..."
                      value={enhancementData.core_q4_methodology}
                      onChange={(e) => setEnhancementData(prev => ({
                        ...prev,
                        core_q4_methodology: e.target.value
                      }))}
                      onFocus={() => setIsFormFocused(true)}
                      onBlur={() => setIsFormFocused(false)}
                      disabled={isContentUpdating}
                      className="h-24 resize-none text-sm border-red-100 focus:border-red-500"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleEnhance}
                  disabled={enhanceMutation.isPending || isContentUpdating}
                  className="w-full mt-5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  {enhanceMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enhance Coach
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Add Dev Tools */}
      <CoachDevTools />
    </div>
  );
  };
  
export default MeetYourCoachPage; 