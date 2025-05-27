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
  const [isSoldOut, setIsSoldOut] = useState(false);

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

    checkSubmissionStatus();

    // Cleanup event listener
    return () => {
      window.removeEventListener('highlightEmailSignup', handleHighlight);
    };
  }, []);

  // Effect to check if spots are sold out
  useEffect(() => {
    if (remainingCount === 0) {
      setIsSoldOut(true);
    }
  }, [remainingCount]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting || alreadySubmitted) return;

    setIsSubmitting(true);
    setError("");

    // --- Netlify Form Submission Logic ---
    const formData = new URLSearchParams();
    formData.append('form-name', 'early-access-signup'); // Matches hidden form in index.html
    formData.append('email', email);
    formData.append('early_access_opt_in', String(earlyAccess));
    formData.append('product_updates_opt_in', String(getUpdates));
    formData.append('computer_fingerprint_field', generateFingerprint()); // Match hidden form field

    try {
      const response = await fetch('/', { // POST to the same page path for Netlify
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setRemainingCount(prevCount => Math.max(0, prevCount - 1));
        localStorage.setItem('email_signup_submitted', 'true');
        
        const selectedOptions = {
          earlyAccess: earlyAccess,
          getUpdates: getUpdates
        };
        localStorage.setItem('email_signup_options', JSON.stringify(selectedOptions));
        
        const signupEvent = new CustomEvent('emailSignupComplete', {
          detail: selectedOptions
        });
        window.dispatchEvent(signupEvent);
        
        // Reset form after 5 seconds (or redirect to a thank you page)
        // For Netlify, often a redirect is configured in Netlify UI or via a hidden action input
        setTimeout(() => {
          setIsSubmitted(false);
          setEmail("");
          setEarlyAccess(false);
          setGetUpdates(false);
          setIsSubmitting(false);
        }, 5000);
      } else {
        // Netlify might not return detailed JSON errors for simple form submissions this way
        // It might just be not response.ok if something went wrong with Netlify's processing
        setError('Submission failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting to Netlify Forms:', error);
      setError('Network error or issue submitting form. Please try again.');
      setIsSubmitting(false);
    }
    // --- End Netlify Form Submission Logic ---

    /* 
    // --- OLD Backend Submission Logic ---
    try {
      const fingerprint = generateFingerprint();
      
      const response = await fetch(`${API_BASE_URL}/api/email-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
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
    */
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
          <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-1 text-xs text-gray-500 w-full px-1">
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="whitespace-nowrap">No spam, ever</span>
            </div>
            <div className="w-1 h-1 bg-gray-400 rounded-full hidden sm:block"></div>
            <span className="whitespace-nowrap">Unsubscribe anytime</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full hidden sm:block"></div>
            <span className="whitespace-nowrap">Launch updates only</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="email-signup" className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-md relative transition-all duration-700 ${isHighlighted ? 'border-pitchiq-red shadow-lg shadow-pitchiq-red/30 ring-2 ring-pitchiq-red/20' : ''} ${isSoldOut ? 'bg-gray-200' : ''}`}>
      {isHighlighted && !isSoldOut && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pitchiq-red/5 via-pitchiq-red/3 to-transparent pointer-events-none animate-pulse"></div>
      )}
      <div className="flex flex-col items-start relative z-10">
        <h3 className={`text-lg font-semibold mb-5 ${isSoldOut ? 'text-gray-500' : 'text-gray-700'}`}>Join the Early Access List</h3>
        
        {isSoldOut ? (
          <div className="flex flex-col items-center w-full text-center mb-4">
            <Users className="h-8 w-8 text-gray-500 mb-3" />
            <p className="text-gray-600 font-medium mb-2">All early access spots have been filled!</p>
            <p className="text-sm text-gray-500">Thank you for your interest. Sign up for product updates to hear about future opportunities.</p>
            {/* Optionally, still show a simplified product updates checkbox here if desired */}
          </div>
        ) : isSubmitted ? (
          <div className="flex flex-col items-center w-full text-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
            <p className="text-green-600 font-medium mb-2">You're on the list! We'll be in touch soon.</p>
            {earlyAccess && ( // Only show spots if they opted into early access
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{remainingCount > 0 ? `${remainingCount} early access spots remaining` : "Processing..."}</span>
              </div>
            )}
          </div>
        ) : (
          <form 
            onSubmit={handleEmailSubmit} 
            className="w-full space-y-5"
            aria-busy={isSubmitting}
          >
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="yourbest@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 text-base py-2.5"
                  aria-label="Email for early access"
                  disabled={isSubmitting || isSoldOut}
                />
              </div>
              {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle className="h-4 w-4" />{error}</p>}
            </div>

            <div className="space-y-3">
              <label htmlFor="earlyAccess" className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                <input 
                  type="checkbox" 
                  id="earlyAccess"
                  checked={earlyAccess}
                  onChange={(e) => setEarlyAccess(e.target.checked)}
                  className="h-4 w-4 rounded text-pitchiq-red focus:ring-pitchiq-red/50 border-gray-300 disabled:opacity-50"
                  disabled={isSubmitting || isSoldOut}
                />
                <span>Secure an Early Access Spot (Limited spots available!)</span>
              </label>
              <label htmlFor="getUpdates" className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                <input 
                  type="checkbox" 
                  id="getUpdates"
                  checked={getUpdates}
                  onChange={(e) => setGetUpdates(e.target.checked)}
                  className="h-4 w-4 rounded text-pitchiq-red focus:ring-pitchiq-red/50 border-gray-300 disabled:opacity-50"
                  disabled={isSubmitting || isSoldOut}
                />
                <span>Get Product Updates & Feature Sneak Peeks</span>
              </label>
            </div>
            
            <Button 
              type="submit" 
              className={`w-full text-base py-2.5 ${isSoldOut ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-pitchiq-red hover:bg-pitchiq-red/90'}`}
              disabled={isSubmitting || !email || isSoldOut}
              aria-live="polite"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              {isSubmitting ? "Submitting..." : isSoldOut ? "All Spots Filled" : "Join the Waitlist"}
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-1">
              <Clock className="h-4 w-4" />
              <span>
                {isSoldOut 
                  ? "Early access spots are full." 
                  : earlyAccess 
                    ? remainingCount > 0 ? `${remainingCount} spots remaining - Sign up now!` : "No spots left for early access."
                    : "Opt-in for early access consideration."}
              </span>
            </div>
          </form>
        )}
        
        {/* 3-point layout - shown if not sold out OR if sold out and they haven't just submitted */}
        {(!isSoldOut || (isSoldOut && !isSubmitted)) && (
          <div className={`flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-1 text-xs mt-6 w-full px-1 ${isSoldOut ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="whitespace-nowrap">No spam, ever</span>
            </div>
            <div className="w-1 h-1 bg-gray-400 rounded-full hidden sm:block"></div>
            <span className="whitespace-nowrap">Unsubscribe anytime</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full hidden sm:block"></div>
            <span className="whitespace-nowrap">Launch updates only</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSignup; 