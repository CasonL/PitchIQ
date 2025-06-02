import React, { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface EmailSignupProps {
  id?: string;
}

const EmailSignup = forwardRef<HTMLDivElement, EmailSignupProps>((props, ref) => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

    try {
      const response = await fetch(`${API_BASE_URL}/api/email-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setError('Submission failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting to Netlify Forms:', error);
      setError('Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div 
        id={props.id || "email-signup-success"}
        ref={ref}
        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-md"
      >
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-gray-800">You're on the list!</h3>
          <p className="text-md text-gray-600 mb-6">
            Thanks for joining the PitchIQ waitlist. We'll email you with updates and early access opportunities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-2 text-xs text-gray-500 w-full px-1">
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span>No spam, ever</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span>Unsubscribe anytime</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={props.id || "email-signup-form"}
      ref={ref}
      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-md"
    >
      <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-800 text-center">Join the PitchIQ Waitlist</h3>
      <p className="text-sm text-gray-600 mb-6 text-center">
        Be the first to access AI-powered sales coaching designed for entrepreneurs, startups, and freelancers.
      </p>
      
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-1">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="email"
              placeholder="yourbest@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 text-base py-3"
              aria-label="Email for waitlist"
              disabled={isSubmitting}
            />
          </div>
          {error && <p className="text-red-600 text-xs flex items-center gap-1 mt-1.5 ml-1"><AlertCircle className="h-4 w-4" />{error}</p>}
        </div>

        <Button 
          type="submit" 
          className="w-full text-base py-3 bg-pitchiq-red hover:bg-pitchiq-red/90"
          disabled={isSubmitting || !email}
          aria-live="polite"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Mail className="h-5 w-5 mr-2" /> 
          )}
          {isSubmitting ? "Submitting..." : "Join Waitlist & Get Updates"}
        </Button>
      </form>
          
      <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-2 text-xs mt-6 w-full px-1 text-gray-500">
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span>No spam, ever</span>
        </div>
        <span className="hidden sm:inline">•</span>
        <span>Unsubscribe anytime</span>
      </div>
    </div>
  );
});

export default EmailSignup; 