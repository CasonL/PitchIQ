import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/axios';
import PersonalizationForm from '@/components/personalization/PersonalizationForm';
import CoachDevTools from '@/components/coach/CoachDevTools';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';

// Map backend keys to frontend form keys
const keyMap: Record<string, string> = {
  p_product: 'core_q1_product',
  p_value_prop: 'core_q1_value',
  p_audience: 'core_q2_audience',
  p_sales_context: 'core_q4_style',
  p_sales_methodology: 'core_q4_methodology',
  p_improvement_goal: 'core_q5_goal',
};

const fetchUserProfile = async () => {
  const { data } = await api.get('/api/personalization/profile');
  // Transform the data to match the form's expectations
  const initialData: Record<string, string> = {};
  for (const backendKey in keyMap) {
    if (data[backendKey]) {
      const frontendKey = keyMap[backendKey];
      initialData[frontendKey] = data[backendKey];
    }
  }
  return initialData;
};

const PersonalizeCoachPage = () => {
  const { isAuthenticated } = useAuthContext();
  const { data: initialData, isLoading, isError, error } = useQuery({
    queryKey: ['userProfileForPersonalize'],
    queryFn: fetchUserProfile,
    enabled: isAuthenticated,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Create Your AI Sales Coach</h1>
        <p className="text-center text-gray-500 mb-8">Just 3 quick questions to build your specialist coach. Takes less than 60 seconds.</p>
        
        {isLoading && (
           <div className="flex flex-col items-center justify-center rounded-xl shadow-lg border border-gray-100 bg-white p-8 h-96">
             <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
             <p className="text-lg text-gray-600">Loading your profile...</p>
           </div>
        )}

        {isError && (
            <div className="flex flex-col items-center justify-center rounded-xl shadow-lg border border-gray-100 bg-white p-8 h-96">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-red-700">An Error Occurred</h2>
                <p className="text-gray-600 mt-2">Could not load your profile. Please try refreshing the page.</p>
                <p className="text-sm text-gray-500 mt-1">({error.message})</p>
            </div>
        )}

        {initialData && (
          <PersonalizationForm 
            variant="initial" 
            onSuccessRedirect="/meet-your-coach" 
            initialData={initialData}
          />
        )}
      </div>
      
      {/* Add Dev Tools */}
      <CoachDevTools />
    </div>
  );
};

export default PersonalizeCoachPage; 