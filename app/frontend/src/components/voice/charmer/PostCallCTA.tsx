import React, { useState } from 'react';
import { Star, TrendingUp, Target, Users } from 'lucide-react';

interface PostCallCTAProps {
  theme: 'dark' | 'light';
  onTryAgain: () => void;
  onSignUp: () => void;
}

export const PostCallCTA: React.FC<PostCallCTAProps> = ({
  theme,
  onTryAgain,
  onSignUp
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRatingClick = (star: number) => {
    setRating(star);
    if (!showFeedback) {
      setShowFeedback(true);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('form-name', 'post-call-feedback');
      formData.append('rating', rating.toString());
      formData.append('feedback', feedback);
      formData.append('timestamp', new Date().toISOString());

      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as any).toString()
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${
      theme === 'dark' ? 'bg-[#0a0f16]' : 'bg-gray-50'
    }`}>
      <div className="max-w-2xl w-full">
        {/* Netlify Forms hidden form for detection */}
        <form name="post-call-feedback" data-netlify="true" hidden>
          <input type="number" name="rating" />
          <input type="text" name="feedback" />
          <input type="text" name="timestamp" />
        </form>

        <form onSubmit={handleSubmitFeedback} className={`rounded-xl p-8 mb-6 ${
          theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-2 text-center ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            How helpful was this session?
          </h2>
          <p className={`text-sm mb-6 text-center ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Your feedback helps us improve PitchIQ
          </p>

          <div className="flex gap-2 mb-6 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRatingClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={48}
                  className={`${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-500 text-yellow-500'
                      : theme === 'dark'
                        ? 'text-gray-600'
                        : 'text-gray-300'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          {showFeedback && (
            <>
              <div className="mb-4">
                <textarea
                  name="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Any specific feedback? (optional)"
                  className={`w-full h-20 p-3 rounded-lg border text-sm resize-none ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={!rating || isSubmitting || submitted}
                className={`w-full py-3 rounded-lg font-medium text-sm transition-all ${
                  !rating || isSubmitting || submitted
                    ? 'opacity-50 cursor-not-allowed'
                    : 'active:scale-98'
                } ${
                  submitted
                    ? theme === 'dark'
                      ? 'bg-green-500/20 border-2 border-green-500/50 text-green-400'
                      : 'bg-green-50 border-2 border-green-500 text-green-700'
                    : theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 border-2 border-white/20 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 text-gray-900'
                }`}
              >
                {submitted ? '✓ Feedback Submitted' : isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </>
          )}
        </form>

        <div className={`rounded-xl p-8 mb-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30'
            : 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300'
        }`}>
          <h3 className={`text-xl font-bold mb-4 text-center ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Ready to Level Up Your Sales Game?
          </h3>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Users size={20} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <div>
                <div className={`font-bold text-sm mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Custom AI Prospects
                </div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Practice with prospects that match your ideal customer profile
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
              }`}>
                <Target size={20} className={theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} />
              </div>
              <div>
                <div className={`font-bold text-sm mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Progressive Training
                </div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Scenarios that build on each other, adapting to your skill level
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
              }`}>
                <TrendingUp size={20} className={theme === 'dark' ? 'text-green-400' : 'text-green-600'} />
              </div>
              <div>
                <div className={`font-bold text-sm mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Performance Tracking
                </div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Track your improvement over time and identify patterns
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onSignUp}
            className={`w-full py-3 rounded-lg font-bold text-base transition-all active:scale-98 ${
              theme === 'dark'
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <button
          onClick={onTryAgain}
          className={`w-full py-3 border rounded-lg text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
              : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700'
          }`}
        >
          Try Another Call
        </button>
      </div>
    </div>
  );
};
