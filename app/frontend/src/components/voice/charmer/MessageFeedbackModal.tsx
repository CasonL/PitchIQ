/**
 * MessageFeedbackModal.tsx
 * AI-generated feedback for individual messages during calls
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@mui/material';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface MessageFeedbackModalProps {
  message: Message;
  scenario?: any;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  onClose: () => void;
}

interface FeedbackData {
  whatHappened: string;
  whyItMatters: string;
  betterApproach?: string;
  skillTagged: string;
}

export const MessageFeedbackModal: React.FC<MessageFeedbackModalProps> = ({
  message,
  scenario,
  conversationHistory,
  onClose
}) => {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateFeedback();
  }, []);

  const generateFeedback = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/openai/message-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: message.content,
          role: message.role,
          conversationHistory: conversationHistory,
          scenario: scenario
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback);
    } catch (err) {
      console.error('Error generating feedback:', err);
      setError('Failed to generate feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    const secs = Math.floor(timestamp / 1000);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const isUser = message.role === 'user';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl font-bold text-gray-900">
            Message Analysis
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Original Message */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {isUser ? 'What You Said' : 'Marcus\'s Response'}
            </p>
            <div className={`px-4 py-3 rounded-2xl ${
              isUser 
                ? 'bg-red-50 text-gray-900 border border-red-200' 
                : 'bg-gray-100 text-gray-900 border border-gray-300'
            }`}>
              <p className="text-sm leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              <p className="ml-3 text-gray-600">Analyzing message...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-900">{error}</p>
              <Button
                onClick={generateFeedback}
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Feedback */}
          {feedback && !loading && (
            <div className="space-y-4">
              {/* What Happened */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs font-semibold text-blue-900 uppercase mb-2">
                  What Happened
                </p>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {feedback.whatHappened}
                </p>
              </div>

              {/* Why It Matters */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <p className="text-xs font-semibold text-purple-900 uppercase mb-2">
                  Why It Matters
                </p>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {feedback.whyItMatters}
                </p>
              </div>

              {/* Better Approach */}
              {feedback.betterApproach && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs font-semibold text-green-900 uppercase mb-2">
                    Better Approach
                  </p>
                  <p className="text-sm text-gray-900 leading-relaxed italic">
                    💡 "{feedback.betterApproach}"
                  </p>
                </div>
              )}

              {/* Skill Tagged */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-semibold text-gray-500">SKILL:</span>
                <span className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-full">
                  {feedback.skillTagged}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-3xl">
          <Button
            onClick={onClose}
            variant="contained"
            fullWidth
            sx={{
              bgcolor: '#dc2626',
              '&:hover': { bgcolor: '#b91c1c' },
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              borderRadius: 2
            }}
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
};
