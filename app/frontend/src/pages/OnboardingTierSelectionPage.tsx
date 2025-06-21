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

        {/* Security Trust Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="h-8 w-8 text-green-600" />
                <Lock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Your Data Security is Our Priority</h3>
              <p className="text-gray-600">Enterprise-grade encryption protecting your sensitive information</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-black mb-3">Military-Grade Encryption</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Fernet Encryption:</strong> AES-128 with HMAC authentication</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Unique Keys:</strong> Individual encryption key per user/business</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Secure Storage:</strong> Keys stored separately from encrypted data</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-black mb-3">Zero-Access Architecture</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Private by Design:</strong> Only you can decrypt your information</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Financial Standard:</strong> Same encryption used by banks</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Compliance Ready:</strong> Built for enterprise security requirements</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-600 italic">
                Built with Python's cryptography library - the industry standard for secure data protection
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTierSelectionPage; 