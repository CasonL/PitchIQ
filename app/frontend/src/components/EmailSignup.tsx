import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, Clock, Users, AlertCircle, Loader2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const EmailSignup = () => {
  const [email, setEmail] = useState("");
  const [earlyAccess, setEarlyAccess] = useState(false);
  const [getUpdates, setGetUpdates] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [remainingCount, setRemainingCount] = useState(30);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Generate a simple computer fingerprint
  const generateFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).substring(0, 32);
  };

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/email-signup/count`);
        if (response.ok) {
          const data = await response.json();
          setRemainingCount(data.remaining_early_access);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    const checkSubmissionStatus = () => {
      const fingerprint = generateFingerprint();
      const submitted = localStorage.getItem(`email_submitted_${fingerprint}`);
      if (submitted) {
        setAlreadySubmitted(true);
      }
    };

    // Listen for highlight events from CTA buttons
    const handleHighlight = () => {
      setIsHighlighted(true);
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setIsHighlighted(false);
      }, 3000);
    };

    // Add event listener for custom highlight event
    window.addEventListener('highlightEmailSignup', handleHighlight);

    loadInitialData();
    checkSubmissionStatus();

    // Cleanup event listener
    return () => {
      window.removeEventListener('highlightEmailSignup', handleHighlight);
    };
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting || alreadySubmitted) return;

    setIsSubmitting(true);
    setError("");

    try {
      const fingerprint = generateFingerprint();
      
      const response = await fetch(`${API_BASE_URL}/api/email-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          early_access: earlyAccess,
          get_updates: getUpdates,
          computer_fingerprint: fingerprint
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        setRemainingCount(data.remaining_early_access);
        localStorage.setItem('email_signup_submitted', 'true');
        
        // Store the specific options selected
        const selectedOptions = {
          earlyAccess: earlyAccess,
          getUpdates: getUpdates
        };
        localStorage.setItem('email_signup_options', JSON.stringify(selectedOptions));
        
        // Emit event to notify parent components
        const signupEvent = new CustomEvent('emailSignupComplete', {
          detail: selectedOptions
        });
        window.dispatchEvent(signupEvent);
        
        // Reset form after 5 seconds
        setTimeout(() => {
          setIsSubmitted(false);
          setEmail("");
          setEarlyAccess(false);
          setGetUpdates(false);
          setIsSubmitting(false);
        }, 5000);
      } else {
        if (data.already_submitted) {
          setAlreadySubmitted(true);
          localStorage.setItem('email_signup_submitted', 'true');
          setError(data.error);
        } else {
          setError(data.error || 'Something went wrong. Please try again.');
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      setError('Network error. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <div id="email-signup" className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-md relative transition-all duration-700 ${isHighlighted ? 'border-pitchiq-red shadow-lg shadow-pitchiq-red/30 ring-2 ring-pitchiq-red/20' : ''}`}>
        {isHighlighted && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pitchiq-red/5 via-pitchiq-red/3 to-transparent pointer-events-none animate-pulse"></div>
        )}
        <div className="flex flex-col items-center text-center relative z-10">
          <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-gray-700">Already Registered!</h3>
          <p className="text-sm text-gray-600 mb-4">
            This computer has already submitted an email signup. Thank you for your interest!
          </p>
          
          {/* 3-point layout */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 w-full">
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              <span>No spam, ever</span>
            </div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>Unsubscribe anytime</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>Launch updates only</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="email-signup" className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-md relative transition-all duration-700 ${isHighlighted ? 'border-pitchiq-red shadow-lg shadow-pitchiq-red/30 ring-2 ring-pitchiq-red/20' : ''}`}>
      {isHighlighted && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pitchiq-red/5 via-pitchiq-red/3 to-transparent pointer-events-none animate-pulse"></div>
      )}
      <div className="flex flex-col items-start relative z-10">
        <h3 className="text-lg font-semibold mb-5 text-gray-700">Join the Early Access List</h3>
        
        {isSubmitted ? (
          <div className="flex flex-col items-center w-full text-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
            <p className="text-green-600 font-medium mb-2">You're on the list! We'll be in touch soon.</p>
            {earlyAccess && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{remainingCount} early access spots remaining</span>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="w-full max-w-sm mb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-600">Be the first to experience PitchIQ</span>
              </div>

              {/* Email Input */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-grow"
                  disabled={isSubmitting}
                />
                <Button 
                  type="submit" 
                  className="bg-pitchiq-red hover:bg-pitchiq-red/90"
                  disabled={isSubmitting || !email}
                >
                  {isSubmitting ? "..." : "Join"}
                </Button>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={earlyAccess}
                    onChange={(e) => setEarlyAccess(e.target.checked)}
                    className="w-4 h-4 text-pitchiq-red bg-gray-100 border-gray-300 rounded focus:ring-pitchiq-red focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Get Early Access</span>
                    <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3" />
                      <span>{remainingCount} spots left</span>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getUpdates}
                    onChange={(e) => setGetUpdates(e.target.checked)}
                    className="w-4 h-4 text-pitchiq-red bg-gray-100 border-gray-300 rounded focus:ring-pitchiq-red focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">Get Updates</span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </form>
        )}

        {/* 3-point layout */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 w-full">
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            <span>No spam, ever</span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <span>Unsubscribe anytime</span>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <span>Launch updates only</span>
        </div>
      </div>
    </div>
  );
};

export default EmailSignup; 