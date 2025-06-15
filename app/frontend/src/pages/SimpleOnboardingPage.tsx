import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const SimpleOnboardingPage: React.FC = () => {
  const [product, setProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!product.trim()) {
      setError('Please tell us what you\'re selling');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/api/simple-onboarding', {
        product: product.trim()
      });

      if (response.data.success) {
        // Redirect to chat page
        navigate('/chat');
      } else {
        setError('Failed to complete onboarding. Please try again.');
      }
    } catch (err: any) {
      console.error('Simple onboarding error:', err);
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <MessageSquare className="h-8 w-8" />
              <CardTitle className="text-2xl md:text-3xl font-bold">
                Welcome to PitchIQ!
              </CardTitle>
            </div>
            <CardDescription className="text-blue-100 text-lg">
              Let's get you started with AI-powered sales practice in just one simple step.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-800">
                  What are you selling?
                </h3>
              </div>
              
              <p className="text-gray-600">
                Tell us about your product or service so we can personalize your coaching experience.
              </p>
              
              <Textarea
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., CRM software for small businesses, digital marketing services, real estate properties, insurance policies..."
                className="min-h-[120px] text-lg p-4 border-2 border-gray-200 focus:border-blue-500 rounded-xl resize-none"
                maxLength={500}
              />
              
              <div className="flex justify-between text-sm text-gray-500">
                <span>Be as specific as you'd like - this helps us give you better practice scenarios</span>
                <span>{product.length}/500</span>
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-blue-50 rounded-xl p-4 border border-blue-200"
            >
              <h4 className="font-semibold text-blue-800 mb-2">What happens next?</h4>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• Your AI coach will be instantly personalized for your product</li>
                <li>• You'll start practicing sales conversations right away</li>
                <li>• Get real-time feedback and improve your skills</li>
                <li>• 15 free practice sessions per month to get started</li>
              </ul>
            </motion.div>
          </CardContent>

          <CardFooter className="p-8 pt-0">
            <Button
              onClick={handleSubmit}
              disabled={loading || !product.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 text-lg rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Setting up your coach...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Start Practicing Now
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default SimpleOnboardingPage; 