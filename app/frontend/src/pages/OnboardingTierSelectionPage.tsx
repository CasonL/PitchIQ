import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  ArrowRight,
  Target,
  Zap,
  Crown,
  Shield,
  Lock
} from 'lucide-react';

const OnboardingTierSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing tier selection on page load
    localStorage.removeItem('selected_tier');
  }, []);

  const handleTierSelect = (tier: string, redirectPath: string) => {
    localStorage.setItem('selected_tier', tier);
    navigate(redirectPath);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <h1 className="text-4xl font-outfit font-bold text-black">
              Pitch<span className="font-saira font-medium text-red-600">IQ</span>
            </h1>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          
          {/* Basic Plan */}
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="flex items-center mb-4">
              <Target className="h-6 w-6 text-black mr-3" />
              <h3 className="text-xl font-bold text-black">Basic</h3>
            </div>
            <div className="mb-6">
              <div className="text-3xl font-bold text-red-600 mb-2">Free</div>
              <p className="text-gray-600">Perfect for getting started</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Personal AI coaching</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Voice analysis & feedback</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">10 sales roleplays/month</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Industry-specific scenarios</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Performance tracking</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Advanced analytics</span>
              </li>
            </ul>
            <button
              onClick={() => handleTierSelect('basic', '/personalize')}
              className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>

          {/* Professional Plan */}
          <div className="bg-white border-2 border-red-600 rounded-lg p-8 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <div className="flex items-center mb-4">
              <Zap className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-xl font-bold text-black">Professional</h3>
            </div>
            <div className="mb-6">
              <div className="text-3xl font-bold text-red-600 mb-2">$20<span className="text-lg text-gray-600">/month</span></div>
              <p className="text-gray-600">For serious sales professionals</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Everything in Basic</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">30 sales roleplays/month</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Real-time conversation insights</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Priority support</span>
              </li>
            </ul>
            <button
              onClick={() => handleTierSelect('professional', '/personalize')}
              className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="flex items-center mb-4">
              <Crown className="h-6 w-6 text-black mr-3" />
              <h3 className="text-xl font-bold text-black">Enterprise</h3>
            </div>
            <div className="mb-6">
              <div className="text-3xl font-bold text-red-600 mb-2">Contact Sales</div>
              <p className="text-gray-600">For teams and organizations</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Everything in Professional</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Compliance ready training</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Custom AI model training</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Team management tools</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Advanced security & encryption</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-600 mr-3" />
                <span className="text-gray-700">Dedicated account manager</span>
              </li>
            </ul>
            <button
              onClick={() => handleTierSelect('enterprise', '/business-onboarding')}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              Contact Sales
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Security Reminder */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Protected by AES-128 encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTierSelectionPage; 