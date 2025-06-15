import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import axios from 'axios';

const STORAGE_KEY = 'personalizationForm-wip';

interface QuestionDetails {
  title: string;
  question: string;
  placeholder: string;
  minWords?: number;
  skippable?: boolean;
}

interface PersonalizationFormProps {
  variant?: 'initial' | 'full';
  onSuccessRedirect?: string;
  initialData?: Partial<Record<OnboardingStage, string>>;
}

// --- Copied from AISummaryCard.tsx ---
const ONBOARDING_QUESTIONS: Record<string, QuestionDetails> = {
  core_q1_product: {
    title: "The Pitch",
    question: "Let's set the stage. What is the product or service you're selling?",
    placeholder: "e.g., We sell a cloud-based project management software for small to medium-sized businesses.",
    minWords: 5,
  },
  core_q1_value: {
    title: "The Hook",
    question: "And what's the magic? What core problem do you solve that makes customers say 'wow'?",
    placeholder: "e.g., It helps teams organize tasks, track progress, and collaborate in real-time, which saves them time and reduces confusion.",
    minWords: 5,
  },
  core_q2_audience: {
    title: "The Audience",
    question: "Every great performance needs an audience. Who is your ideal customer? Be specific!",
    placeholder: "e.g., VPs of Marketing at SaaS companies with 50-250 employees.",
    minWords: 5,
  },
  core_q4_style: {
    title: "The Arena",
    question: "Now, describe your sales arena. A few quick details help us tailor the simulation:\n\n• Who do you sell to? (B2B, B2C, etc.)\n• What's your average sales cycle length?\n• How long is a typical main interaction?",
    placeholder: "e.g., B2B, sales cycle is about 2 months, main interaction is a 45-minute demo call.",
    skippable: true,
  },
  core_q4_methodology: {
    title: "Your Playbook",
    question: "What's your sales playbook? If you have a specific methodology like Challenger, Consultative, or SPIN, let us know. If not, no worries—just say 'General' and we'll start there.",
    placeholder: "e.g., Challenger sale.",
    skippable: true,
  },
  core_q5_goal: {
    title: "Your Goal",
    question: "To win the game, you need a goal. What's the #1 sales skill you want to sharpen right now?",
    placeholder: "e.g., I want to master handling pricing objections.",
    minWords: 3,
  }
};

type OnboardingStage = keyof typeof ONBOARDING_QUESTIONS;
const INITIAL_STAGE_SEQUENCE: OnboardingStage[] = ['core_q1_product', 'core_q2_audience', 'core_q5_goal'];
const FULL_STAGE_SEQUENCE = Object.keys(ONBOARDING_QUESTIONS) as OnboardingStage[];

// --- Component ---
const PersonalizationForm = ({ variant = 'full', onSuccessRedirect = '/dashboard', initialData }: PersonalizationFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const STAGE_SEQUENCE = useMemo(() => {
    return variant === 'initial' ? INITIAL_STAGE_SEQUENCE : FULL_STAGE_SEQUENCE;
  }, [variant]);

  const STOP_WORDS = new Set([
    // Articles, Prepositions, Conjunctions
    'a', 'an', 'the', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'from', 'to', 'up', 'down', 'out', 'and', 'but', 'or', 'if', 'as',
    // Pronouns
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'us', 'them', 'myself', 'yourself',
    // Common Verbs (often state-of-being or low-value)
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'can', 'should', 'would',
    'go', 'goes', 'going', 'went', 'get', 'gets', 'getting', 'got', 'make', 'makes', 'making', 'made', 'see', 'sees', 'saw', 'seen', 'say', 'says', 'said', 'tell', 'tells', 'told', 'try', 'tries', 'tried',
    // Vague/Filler Words
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'some', 'any', 'all', 'every', 'thing', 'things', 'stuff', 'kind', 'sort', 'type', 'something', 'anything', 'everything', 'nothing',
    'just', 'very', 'really', 'quite', 'so', 'too', 'actually', 'basically', 'literally', 'definitely', 'absolutely', 'certainly', 'good', 'bad', 'great', 'nice'
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<OnboardingStage, string>>(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const parsedSavedData = savedData ? JSON.parse(savedData) : {};
    return {
      core_q1_product: initialData?.core_q1_product || parsedSavedData.core_q1_product || '',
      core_q1_value: initialData?.core_q1_value || parsedSavedData.core_q1_value || '',
      core_q2_audience: initialData?.core_q2_audience || parsedSavedData.core_q2_audience || '',
      core_q4_style: initialData?.core_q4_style || parsedSavedData.core_q4_style || '',
      core_q4_methodology: initialData?.core_q4_methodology || parsedSavedData.core_q4_methodology || '',
      core_q5_goal: initialData?.core_q5_goal || parsedSavedData.core_q5_goal || '',
    };
  });
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const currentStageKey = STAGE_SEQUENCE[currentStep];
  const questionDetails = ONBOARDING_QUESTIONS[currentStageKey];

  const mutation = useMutation({
    mutationFn: (newProfileData: Record<OnboardingStage, string>) => {
      console.log('Submitting personalization data:', newProfileData);
      return api.post('/api/personalization/personalize', newProfileData);
    },
    onSuccess: (response) => {
      console.log('Personalization successful:', response.data);

      // Set onboarding complete in both localStorage and clear form data
      localStorage.setItem('onboarding_complete', 'true');
      localStorage.removeItem(STORAGE_KEY); // Clear form work-in-progress data

      toast({
        title: "Coach Personalized!",
        description: "You're ready to start your training.",
      });

      // Navigate to meet-your-coach page (the proper next step)
      // Use longer timeout to ensure backend state is fully committed
      setTimeout(() => {
        navigate('/meet-your-coach');
      }, 500);
    },
    onError: (error: any) => {
      console.error('Personalization failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "You need to be logged in to personalize your coach. Redirecting to login...",
          variant: "destructive",
        });
        navigate('/login');
      } else if (axios.isAxiosError(error) && error.response?.status === 409) {
        // Handle "Coach already exists" case - this happens after reset sometimes
        const data = error.response.data;
        console.log('Coach already exists, clearing form data and redirecting...', data);
        
        // Clear the form data since we don't need to recreate
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem('onboarding_complete', 'true');
        
        toast({
          title: "Coach Already Created",
          description: data.message || "You already have a personalized coach. Redirecting to your coach page...",
          className: "bg-blue-500 text-white",
        });
        
        // Use the redirect path from backend or default
        const redirectPath = data.redirect || '/meet-your-coach';
        console.log('Redirecting to:', redirectPath);
        setTimeout(() => navigate(redirectPath), 1500);
      } else {
        toast({
          title: "Uh oh! Something went wrong.",
          description: `There was a problem saving your personalization: ${errorMessage}`,
          variant: "destructive",
        });
      }
    }
  });

  const handleNext = () => {
    console.log('handleNext called - currentStep:', currentStep, 'totalSteps:', STAGE_SEQUENCE.length);
    
    const currentQuestion = ONBOARDING_QUESTIONS[currentStageKey];
    const words = formData[currentStageKey].toLowerCase().trim().split(/\s+/).filter(Boolean);
    const meaningfulWordCount = words.filter(word => !STOP_WORDS.has(word)).length;

    console.log('Current form data:', formData);
    console.log('Current stage key:', currentStageKey);
    console.log('Meaningful word count:', meaningfulWordCount, 'Required:', currentQuestion.minWords);

    if (currentQuestion.minWords && meaningfulWordCount < currentQuestion.minWords) {
      setError(`Please provide at least ${currentQuestion.minWords} descriptive words.`);
      return;
    }

    if (currentStep < STAGE_SEQUENCE.length - 1) {
      console.log('Moving to next step');
      setCurrentStep(currentStep + 1);
      setError(null);
    } else {
      // Handle form submission
      console.log('Final step reached - submitting form');
      setError(null);
      mutation.mutate(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSkip = () => {
    if (questionDetails.skippable && currentStep < STAGE_SEQUENCE.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setError(null);
    setFormData({
      ...formData,
      [currentStageKey]: e.target.value,
    });
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STAGE_SEQUENCE.map((stageKey, index) => (
            <React.Fragment key={stageKey}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    currentStep > index ? 'bg-green-500 text-white' : 
                    currentStep === index ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > index ? <Check size={20} /> : index + 1}
                </div>
                <p className={`mt-2 text-xs text-center w-20 truncate ${currentStep >= index ? 'font-semibold' : ''}`}>{ONBOARDING_QUESTIONS[stageKey].title}</p>
              </div>
              {index < STAGE_SEQUENCE.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${currentStep > index ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 whitespace-pre-wrap">{questionDetails.question}</h2>
        <Textarea
          value={formData[currentStageKey]}
          onChange={handleInputChange}
          rows={6}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
          placeholder={questionDetails.placeholder || "Your answer here..."}
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          variant="outline"
        >
          <ChevronLeft size={16} className="mr-2" />
          Previous
        </Button>
        <div className="flex items-center gap-x-2">
            {questionDetails.skippable && (
                <Button onClick={handleSkip} variant="ghost" disabled={mutation.isPending}>
                    Skip
                </Button>
            )}
            <Button onClick={handleNext} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finishing...
              </>
            ) : currentStep === STAGE_SEQUENCE.length - 1 ? (
              'Finish'
            ) : (
              'Next'
            )}
            {currentStep < STAGE_SEQUENCE.length - 1 && !mutation.isPending && <ChevronRight size={16} className="ml-2" />}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonalizationForm;