import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, ArrowRight, Check, Zap, Star, MessageCircle, AlertCircle, Shuffle, User, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/context/AuthContext';

interface DemoPersona {
  coachName: string;
  expertise: string;
  insight: string;
  approach: string;
  callToAction: string;
}

interface ApiCoachPersona {
  name: string;
  expertise: string;
  background: string;
  approach: string;
  goal_insight: string;
  market_analysis: string;
  coaching_approach: string;
  unique_value: string;
}

// Quick-fill examples with ultra-concise coaches
const QUICK_FILL_EXAMPLES = [
  {
    input: "SaaS project management software",
    coach: {
      coachName: "Sarah",
      expertise: "SaaS Objection Specialist",
      insight: "Small business owners fear team adoption and switching costs more than price.",
      approach: "Turn 'too expensive' into ROI demonstrations with concrete time savings.",
      callToAction: "Ready to close more SaaS deals?"
    }
  },
  {
    input: "Healthcare marketing consulting",
    coach: {
      coachName: "Marcus",
      expertise: "Healthcare Marketing Expert",
      insight: "Providers need HIPAA-compliant strategies that build patient trust.",
      approach: "Lead with regulatory expertise and proven case studies, not just tactics.",
      callToAction: "Let's build your healthcare authority."
    }
  },
  {
    input: "Handmade artisanal pottery",
    coach: {
      coachName: "Elena",
      expertise: "Artisan Brand Storyteller",
      insight: "Mindful consumers buy meaning and connection, not just products.",
      approach: "Share your craft journey and connect art to their values.",
      callToAction: "Ready to monetize your passion?"
    }
  },
  {
    input: "Cybersecurity for banks",
    coach: {
      coachName: "David",
      expertise: "FinTech Security Specialist",
      insight: "Banks need compliance expertise, not just technical solutions.",
      approach: "Speak their language: ROI, regulations, and reputation protection.",
      callToAction: "Let's secure your cybersec sales."
    }
  },
  {
    input: "AI automation for manufacturing",
    coach: {
      coachName: "Dr. Chen",
      expertise: "Industrial AI Specialist",
      insight: "Engineers are skeptical and need proof of minimal disruption.",
      approach: "Lead with metrics, timelines, and real implementation case studies.",
      callToAction: "Ready to revolutionize manufacturing?"
    }
  },
  {
    input: "Personal injury law practice",
    coach: {
      coachName: "Victoria",
      expertise: "Legal Client Developer",
      insight: "Clients are scared and overwhelmed by insurance companies.",
      approach: "Combine legal expertise with genuine empathy and advocacy positioning.",
      callToAction: "Let's build your practice."
    }
  }
];

type DemoState = 'input' | 'processing' | 'result';

interface InteractiveDemoSectionProps {
  onSignupClick?: () => void;
}

const InteractiveDemoSection: React.FC<InteractiveDemoSectionProps> = ({ onSignupClick }) => {
  const { isAuthenticated, user, isLoading } = useAuthContext();
  const [demoState, setDemoState] = useState<DemoState>('input');
  const [input, setInput] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<DemoPersona | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [isRealAI, setIsRealAI] = useState(false);
  const [isQuickFill, setIsQuickFill] = useState(false);

  // Check for demo override via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const forceDemo = urlParams.get('demo') === 'true';

  const convertApiPersonaToDemoPersona = (apiPersona: ApiCoachPersona): DemoPersona => {
    // Make API responses concise too
    const insight = (apiPersona.market_analysis || apiPersona.goal_insight || '').split('.')[0] + '.';
    const approach = (apiPersona.coaching_approach || apiPersona.approach || '').split('.')[0] + '.';
    
    return {
      coachName: apiPersona.name,
      expertise: apiPersona.expertise,
      insight: insight.length > 80 ? insight.substring(0, 80) + '...' : insight,
      approach: approach.length > 80 ? approach.substring(0, 80) + '...' : approach,
      callToAction: `Ready to master ${input.toLowerCase()} sales?`
    };
  };

  const getFallbackPersona = (input: string): DemoPersona => {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('software') || lowerInput.includes('saas') || lowerInput.includes('app') || lowerInput.includes('platform')) {
      return QUICK_FILL_EXAMPLES[0].coach;
    }
    if (lowerInput.includes('consulting') || lowerInput.includes('advisor') || lowerInput.includes('strategy')) {
      return QUICK_FILL_EXAMPLES[1].coach;
    }
    return QUICK_FILL_EXAMPLES[0].coach;
  };

  const handleQuickFill = (exampleInput: string, exampleCoach: DemoPersona) => {
    setInput(exampleInput);
    setIsQuickFill(true);
    
    setTimeout(() => {
      handleGenerate(exampleInput, exampleCoach);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const matchingExample = QUICK_FILL_EXAMPLES.find(ex => ex.input === input.trim());
    if (matchingExample) {
      handleGenerate(input, matchingExample.coach);
      setIsQuickFill(true);
    } else {
      handleGenerate(input);
      setIsQuickFill(false);
    }
  };

  const handleGenerate = async (inputText: string, presetCoach?: DemoPersona) => {
    setDemoState('processing');
    setProcessingStep(0);
    setIsRealAI(false);

    const steps = ['Analyzing context...', 'Generating coach...', 'Finalizing...'];

    for (let i = 0; i < steps.length; i++) {
      setTimeout(() => setProcessingStep(i), i * 400);
    }

    if (presetCoach) {
      setTimeout(() => {
        setSelectedPersona(presetCoach);
        setIsRealAI(false);
        setDemoState('result');
      }, 1500);
    } else {
      try {
        // Step 1: Generate the personalization
        const response = await fetch('/api/personalization/personalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product: inputText.trim(),
            audience: "my target customers",
            goal: "improve my sales conversations"
          })
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Personalize Response:', result);
        
        if (result.success) {
          // Step 2: Fetch the generated coach from profile
          const profileResponse = await fetch('/api/personalization/profile', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!profileResponse.ok) {
            throw new Error(`Profile fetch failed: ${profileResponse.status}`);
          }

          const profileData = await profileResponse.json();
          console.log('Profile Response:', profileData);
          
          // Check if we have coach data in the profile
          if (profileData && profileData.coach) {
            console.log('Using profile coach data');
            const persona = convertApiPersonaToDemoPersona(profileData.coach);
            setSelectedPersona(persona);
            setIsRealAI(true);
          } else if (profileData && profileData.name) {
            console.log('Using direct profile data');
            const persona = convertApiPersonaToDemoPersona(profileData);
            setSelectedPersona(persona);
            setIsRealAI(true);
          } else if (profileData && profileData.coach_persona) {
            console.log('Using coach_persona field');
            // Parse the coach_persona string to extract coach info
            const coachText = profileData.coach_persona;
            
            // Create a coach object from the text and other profile data
            const coachData = {
              name: 'Alex', // Default name, could parse from coach_persona if needed
              expertise: 'Sales Excellence Specialist', // Could extract from coach_persona
              approach: 'Personalized coaching approach tailored to your business.',
              market_analysis: `Specialized coaching for ${profileData.p_product || 'your business'}.`,
              coaching_approach: 'Strategic sales guidance based on your specific goals.',
              unique_value: 'AI-powered personalized coaching'
            };
            
            const persona = convertApiPersonaToDemoPersona(coachData);
            setSelectedPersona(persona);
            setIsRealAI(true);
          } else {
            console.log('No coach data in profile:', profileData);
            throw new Error('No coach data found in profile');
          }
        } else {
          throw new Error('Personalization request failed');
        }

        setTimeout(() => {
          setDemoState('result');
        }, 1500);

      } catch (error) {
        console.log('API call failed, using fallback persona:', error);
        
        setTimeout(() => {
          const fallbackPersona = getFallbackPersona(inputText);
          setSelectedPersona(fallbackPersona);
          setIsRealAI(false);
          setDemoState('result');
        }, 1500);
      }
    }
  };

  const handleTryAgain = () => {
    setInput('');
    setDemoState('input');
    setSelectedPersona(null);
    setProcessingStep(0);
    setIsRealAI(false);
    setIsQuickFill(false);
  };

  // If user is authenticated and onboarded, show dashboard CTA instead of demo
  // (unless forceDemo parameter is set)
  if (isAuthenticated && user?.onboarding_complete && !forceDemo) {
    return (
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Side-by-side layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Welcome Message */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center mb-6">
                <User className="h-6 w-6 text-pitchiq-red mr-3" />
                <span className="text-sm font-medium text-pitchiq-red uppercase tracking-wider">
                  Welcome Back
                </span>
              </div>
              
              <h2 className="font-outfit font-bold text-2xl md:text-3xl lg:text-4xl text-gray-900 mb-6 leading-tight">
                Your AI Coach is <br />
                <span className="text-pitchiq-red">Ready to Practice</span>
              </h2>
              
              <div className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
                <p className="mb-4">Welcome back, {user.email.split('@')[0]}!</p>
                <p>Your personalized AI sales coach is set up and ready for training sessions.</p>
              </div>

              {/* Features */}
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Coach Ready</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>24/7 Practice</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Progress Tracking</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Dashboard CTA */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-2xl border-0 overflow-hidden">
                <CardContent className="p-6 md:p-8 min-h-[400px] flex flex-col justify-center">
                  <div className="text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-pitchiq-red/10 rounded-full mb-4">
                      <BarChart3 className="h-8 w-8 text-pitchiq-red" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Your Training Dashboard
                    </h3>
                    
                    <p className="text-gray-600 mb-6">
                      Practice with your personalized AI coach, track your progress, and master your sales conversations.
                    </p>

                    <div className="space-y-4">
                      <Button 
                        onClick={() => {
                          console.log('🎯 Dashboard button clicked - navigating to /dashboard');
                          window.location.href = '/dashboard';
                        }}
                        size="lg"
                        className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90 text-white py-4 shadow-lg hover:shadow-xl transition-all duration-300 group"
                      >
                        <BarChart3 className="mr-2 h-5 w-5" />
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-150 group-hover:translate-x-1" />
                      </Button>

                      <div className="text-sm text-gray-500">
                        Start practicing immediately with your AI coach
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
      </section>
    );
  }

  // For anonymous users, show the full demo experience
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Side-by-side layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Title & Description */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-8"
          >
            <div className="flex items-center mb-6">
              <Sparkles className="h-6 w-6 text-pitchiq-red mr-3" />
              <span className="text-sm font-medium text-pitchiq-red uppercase tracking-wider">
                Interactive Demo
              </span>
            </div>
            
            <h2 className="font-outfit font-bold text-2xl md:text-3xl lg:text-4xl text-gray-900 mb-6 leading-tight">
              Generate Your <br />
              <span className="text-pitchiq-red">AI Sales Coach</span>
            </h2>
            
            <div className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              <p className="mb-4">Try our AI coach generator right now:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Describe your own business</li>
                <li>Watch as we create a specialized coach that understands your market</li>
              </ol>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Real AI Personalization</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>No Credit Card</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>24/7 Practice</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm shadow-2xl border-0 overflow-hidden">
              <CardContent className="p-6 md:p-8 min-h-[600px]">
                <AnimatePresence mode="wait">
                  
                  {/* Input Form */}
                  {demoState === 'input' && (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-pitchiq-red/10 rounded-full mb-4">
                          <Sparkles className="h-6 w-6 text-pitchiq-red" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Describe Your Business
                        </h3>
                        <p className="text-sm text-gray-600">
                          Get a personalized AI sales coach in seconds.
                        </p>
                      </div>

                      {/* Quick Fill Examples - Now integrated */}
                      <div className="space-y-3 mb-6">
                        <p className="text-sm font-medium text-gray-700">Try these examples:</p>
                        <div className="grid gap-2">
                          {QUICK_FILL_EXAMPLES.slice(0, 3).map((example, index) => (
                            <motion.button
                              key={index}
                              onClick={() => handleQuickFill(example.input, example.coach)}
                              disabled={demoState === 'processing'}
                              className="text-left p-3 rounded-lg border border-gray-200 hover:border-pitchiq-red/50 hover:bg-pitchiq-red/5 transition-all text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed group"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center justify-between">
                                <span>"{example.input}"</span>
                                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-pitchiq-red transition-colors" />
                              </div>
                            </motion.button>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const randomExample = QUICK_FILL_EXAMPLES[Math.floor(Math.random() * QUICK_FILL_EXAMPLES.length)];
                            handleQuickFill(randomExample.input, randomExample.coach);
                          }}
                          disabled={demoState === 'processing'}
                          className="text-sm text-pitchiq-red hover:text-pitchiq-red/80 flex items-center disabled:opacity-50"
                        >
                          <Shuffle className="h-4 w-4 mr-1" />
                          Try Random Example
                        </button>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-gray-500">Or describe your business</span>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                          <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="e.g., AI productivity software for remote teams..."
                            className="text-sm py-4 px-4 border-2 border-gray-200 focus:border-pitchiq-red transition-colors"
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          size="lg"
                          disabled={!input.trim()}
                          className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90 text-white py-4 shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate My AI Coach
                          <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-150 group-hover:translate-x-1" />
                        </Button>
                      </form>
                    </motion.div>
                  )}

                  {/* Processing State */}
                  {demoState === 'processing' && (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="text-center py-8"
                    >
                      <div className="mb-6">
                        <Loader2 className="h-10 w-10 text-pitchiq-red animate-spin mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {isQuickFill ? 'Generating Demo Coach' : 'Creating Personal Coach'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {processingStep < 3 ? 
                            ['Analyzing context...', 'Generating coach...', 'Finalizing...'][processingStep] :
                            'Almost ready...'
                          }
                        </p>
                      </div>
                      <div className="space-y-2">
                        {[0, 1, 2].map((step) => (
                          <motion.div
                            key={step}
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: processingStep >= step ? 1 : 0.3 }}
                            className="flex items-center justify-center text-xs text-gray-500"
                          >
                            <Check className={`h-3 w-3 mr-2 ${processingStep >= step ? 'text-green-500' : 'text-gray-300'}`} />
                            {['Analysis', 'Generation', 'Complete'][step]}
                          </motion.div>
                        ))}
                      </div>
                      <div className="mt-4 text-xs text-gray-400">
                        "{input.length > 40 ? input.substring(0, 40) + '...' : input}"
                      </div>
                    </motion.div>
                  )}

                  {/* Result State */}
                  {demoState === 'result' && selectedPersona && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-4"
                    >
                      {/* Only show badge for Real AI */}
                      {isRealAI && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center justify-center"
                        >
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <Zap className="h-3 w-3 mr-1" />
                            Real AI Coach
                          </div>
                        </motion.div>
                      )}

                      {/* Coach Introduction - Clean Header */}
                      <div className="text-center pb-3 border-b border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          Meet {selectedPersona.coachName}
                        </h3>
                        <p className="text-sm text-pitchiq-red font-medium">
                          {selectedPersona.expertise}
                        </p>
                      </div>

                      {/* Coach Insights - Ultra Compact */}
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start">
                            <MessageCircle className="h-4 w-4 text-pitchiq-red mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1 text-sm">Key Insight</h4>
                              <p className="text-gray-700 text-sm">{selectedPersona.insight}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-pitchiq-red/5 rounded-lg p-3">
                          <div className="flex items-start">
                            <Zap className="h-4 w-4 text-pitchiq-red mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1 text-sm">Approach</h4>
                              <p className="text-gray-700 text-sm">{selectedPersona.approach}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Call to Action */}
                      <div className="text-center pt-3">
                        <p className="text-sm font-medium text-gray-900 mb-4">
                          "{selectedPersona.callToAction}"
                        </p>
                        <div className="flex flex-col gap-3">
                          <Button 
                            onClick={onSignupClick}
                            size="lg"
                            className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90 text-white py-3 shadow-lg hover:shadow-xl transition-all duration-300 group"
                          >
                            Get My Personalized Coach
                            <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-150 group-hover:translate-x-1" />
                          </Button>
                          <Button 
                            onClick={handleTryAgain}
                            variant="outline"
                            size="sm"
                            className="border border-gray-300 hover:border-pitchiq-red hover:text-pitchiq-red text-sm py-2"
                          >
                            Try Another Business
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default InteractiveDemoSection; 