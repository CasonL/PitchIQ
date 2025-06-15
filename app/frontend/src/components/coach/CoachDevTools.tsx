import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { XIcon, RefreshCcwIcon, SquareIcon, Settings2, Trash2, Wand2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import api from '@/lib/axios';

interface CoachDevToolsProps {
  // Optional props - if provided, we'll show the dev tools button
  showDevButton?: boolean;
}

const CoachDevTools: React.FC<CoachDevToolsProps> = ({ showDevButton = true }) => {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile for regeneration - use separate query key to avoid interfering with main page
  const { data: userProfile } = useQuery({
    queryKey: ['userProfileForDevTools'],
    queryFn: async () => {
      const { data } = await api.get('/api/personalization/profile');
      return data;
    },
    enabled: isDevToolsOpen, // Only fetch when dev tools are open
  });

  // Reset onboarding mutation
  const resetOnboardingMutation = useMutation({
    mutationFn: async () => {
      // The API call returns the response which we will use in onSuccess
      const { data } = await api.post('/api/personalization/reset-onboarding');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Onboarding Reset Complete",
        description: "Your coach persona and all related data have been cleared. Redirecting...",
        className: "bg-green-500 text-white",
      });
      
      // 1. Clear ALL localStorage data related to onboarding and coach
      const keysToRemove = [
        'onboarding_complete',
        'personalizationForm-wip',
        'ai_coach_onboarding_complete', 
        'ai_coach_messages',
        'pitchiq_greeting_complete',
        'pitchiq_user_preferred_name',
        'has_used_smart_fill',
        'coach_reset_timestamp'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 2. Clear the entire React Query cache to ensure no stale data is used.
      queryClient.clear();
      
      // 3. Set a timestamp to help other components detect the reset
      localStorage.setItem('coach_reset_timestamp', Date.now().toString());
      
      const redirectUrl = data?.redirect || '/personalize'; // Use backend redirect or fallback
      console.log(`🔄 Onboarding reset. Redirecting to ${redirectUrl} as instructed by backend.`);
      
      // 4. Force a redirect to the URL provided by the backend after a short delay
      setTimeout(() => {
        window.location.assign(redirectUrl);
      }, 1500);
    },
    onError: (error: any) => {
      console.error('Reset onboarding failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast({
        title: "Reset Failed",
        description: `Failed to reset onboarding: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  // Regenerate coach mutation
  const regenerateCoachMutation = useMutation({
    mutationFn: async () => {
      if (!userProfile) {
        throw new Error('No user profile data available');
      }

      // Convert profile data back to form data format for regeneration
      const formData = {
        core_q1_product: userProfile.p_product || '',
        core_q1_value: userProfile.p_value_prop || '',
        core_q2_audience: userProfile.p_audience || '',
        core_q4_style: userProfile.p_sales_context || '',
        core_q4_methodology: userProfile.p_sales_methodology || '',
        core_q5_goal: userProfile.p_improvement_goal || ''
      };

      console.log('🔄 Regenerating coach with data:', formData);
      return await api.post('/api/personalization/regenerate-coach', formData);
    },
    onSuccess: (response) => {
      toast({
        title: "Coach Regenerated!",
        description: "Your AI coach persona has been regenerated with fresh insights.",
        className: "bg-blue-500 text-white",
      });
      
      // Refresh the profile data to show updated coach message
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfileForPersonalize'] });
      queryClient.invalidateQueries({ queryKey: ['userProfileForEnhance'] });
      
      console.log('✅ Coach regenerated successfully:', response.data);
    },
    onError: (error: any) => {
      console.error('Coach regeneration failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      toast({
        title: "Regeneration Failed",
        description: `Failed to regenerate coach: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  const handleResetOnboarding = () => {
    if (confirm('Are you sure you want to reset your onboarding? This will delete your current coach persona and you\'ll need to create a new one.')) {
      resetOnboardingMutation.mutate();
    }
  };

  const handleRegenerateCoach = () => {
    if (!userProfile || !userProfile.p_product) {
      toast({
        title: "No Coach to Regenerate",
        description: "Please create a coach first before regenerating.",
        variant: "destructive",
      });
      return;
    }

    if (confirm('Regenerate your coach persona? This will create a fresh version using your current form data.')) {
      regenerateCoachMutation.mutate();
    }
  };

  const handleClearLocalStorage = () => {
    if (confirm('Clear all localStorage? This will reset form data and preferences.')) {
      // Clear common localStorage keys
      const keysToRemove = [
        'personalizationForm-wip',
        'ai_coach_onboarding_complete', 
        'ai_coach_messages',
        'pitchiq_greeting_complete',
        'pitchiq_user_preferred_name'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast({
        title: "LocalStorage Cleared",
        description: "All cached form data has been cleared.",
        className: "bg-blue-500 text-white",
      });
      
      // Refresh page after clearing
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  if (!showDevButton && !isDevToolsOpen) {
    return null;
  }

  return (
    <>
      {/* Dev Tools Panel */}
      {isDevToolsOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-800 text-white p-4 shadow-xl z-[100] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Coach Dev Tools</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsDevToolsOpen(false)} className="text-slate-400 hover:text-white">
              <XIcon size={20} />
            </Button>
          </div>

          <div className="space-y-4 flex-grow">
            <h3 className="text-lg font-medium text-slate-300 mb-2 border-b border-slate-700 pb-1">Reset Actions</h3>
            
            <Button 
              onClick={handleResetOnboarding} 
              disabled={resetOnboardingMutation.isPending}
              variant="outline" 
              className="w-full bg-red-600 hover:bg-red-700 border-red-700 text-white justify-start"
            >
              <RefreshCcwIcon size={16} className="mr-2" /> 
              {resetOnboardingMutation.isPending ? 'Resetting...' : 'Reset Coach & Onboarding'}
            </Button>
            
            <Button 
              onClick={handleRegenerateCoach}
              disabled={regenerateCoachMutation.isPending}
              variant="outline" 
              className="w-full bg-blue-600 hover:bg-blue-700 border-blue-700 text-white justify-start"
            >
              <Wand2 size={16} className="mr-2" /> 
              {regenerateCoachMutation.isPending ? 'Regenerating...' : 'Regenerate Coach'}
            </Button>
            
            <Button 
              onClick={handleClearLocalStorage}
              variant="outline" 
              className="w-full bg-orange-600 hover:bg-orange-700 border-orange-700 text-white justify-start"
            >
              <Trash2 size={16} className="mr-2" /> Clear LocalStorage
            </Button>
            
            <h3 className="text-lg font-medium text-slate-300 mb-2 pt-4 border-b border-slate-700 pb-1">Quick Actions</h3>
            
            <Button 
              onClick={handleReloadPage}
              variant="outline" 
              className="w-full bg-blue-600 hover:bg-blue-700 border-blue-700 text-white justify-start"
            >
              <SquareIcon size={16} className="mr-2" /> Reload Page
            </Button>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center">Coach Dev Tools v1.0</p>
          </div>
        </div>
      )}

      {/* Dev Tools Toggle Button */}
      {showDevButton && !isDevToolsOpen && (
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white hover:text-blue-300 border-gray-700 z-50 rounded-full shadow-lg" 
          onClick={() => setIsDevToolsOpen(true)} 
          title="Open Coach Developer Tools"
        >
          <Settings2 size={22} />
        </Button>
      )}
    </>
  );
};

export default CoachDevTools; 