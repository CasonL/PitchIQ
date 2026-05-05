/**
 * CallFeedbackForm.tsx
 * Netlify-powered feedback form for post-call review
 * Adapted from Kimi post-sales feedback demo
 */

import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';

interface CallFeedbackFormProps {
  sessionId?: string;
  callDuration?: number;
  onSubmitSuccess?: () => void;
}

export const CallFeedbackForm: React.FC<CallFeedbackFormProps> = ({
  sessionId,
  callDuration,
  onSubmitSuccess
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as any).toString()
      });

      if (!response.ok) throw new Error('Submission failed');

      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      console.error('Form submission error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
          <Star className="w-6 h-6 text-green-500 fill-green-500" />
        </div>
        <p className="text-sm font-semibold text-white mb-1">
          Thanks for the feedback
        </p>
        <p className="text-xs text-gray-400">
          {rating >= 4
            ? "Glad this resonated. We'll keep building."
            : "Noted. Every honest rating makes this better."}
        </p>
      </div>
    );
  }

  return (
    <form
      name="marcus-call-feedback"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* Netlify form detection */}
      <input type="hidden" name="form-name" value="marcus-call-feedback" />
      <input type="hidden" name="bot-field" />
      
      {/* Hidden metadata */}
      <input type="hidden" name="rating" value={rating} />
      <input type="hidden" name="session-id" value={sessionId || ''} />
      <input type="hidden" name="call-duration" value={callDuration || ''} />

      <div>
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
          How was this experience?
        </label>

        {/* Star Rating */}
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-all duration-200"
            >
              <Star
                className={`w-6 h-6 transition-all duration-200 ${
                  star <= (hoverRating || rating)
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">
            {rating > 0
              ? ['', 'Needs work', 'Okay', 'Good', 'Great', 'Excellent'][rating]
              : 'Tap to rate'}
          </span>
        </div>
      </div>

      {/* Feedback Text */}
      <div>
        <label className="text-xs font-medium text-gray-300 mb-1.5 block">
          What stood out? What would make this better?
        </label>
        <textarea
          name="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all resize-none"
          placeholder="Share anything — a bug, a feature idea, or what clicked for you..."
        />
      </div>

      {/* Email */}
      <div>
        <label className="text-xs font-medium text-gray-300 mb-1.5 block">
          Want product updates? (optional)
        </label>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
          placeholder="you@company.com"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-500 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? 'Sending...' : 'Send Feedback'}
      </button>
    </form>
  );
};
