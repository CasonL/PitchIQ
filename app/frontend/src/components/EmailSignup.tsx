import React, { useState, useEffect, useRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, Clock, Users, AlertCircle, Loader2 } from "lucide-react";
import { useNavbarHeight } from "@/context/NavbarHeightContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const EARLY_ACCESS_SPOTS_KEY = 'pitchiq_early_access_spots';
const PITCHIQ_USER_PREFERENCES_KEY = 'pitchiq_user_preferences';

// Props for EmailSignup
interface EmailSignupProps {
  id?: string; // Add id as an optional prop
}

// Helper to get all preferences
const getAllUserPreferences = (): Record<string, { earlyAccess: boolean; getUpdates: boolean; submittedOn: string }> => {
  try {
    const prefs = localStorage.getItem(PITCHIQ_USER_PREFERENCES_KEY);
    return prefs ? JSON.parse(prefs) : {};
  } catch (error) {
    console.error("Error reading user preferences from localStorage:", error);
    return {};
  }
};

// Helper to set preferences for a specific email
const setUserEmailPreferences = (email: string, earlyAccess: boolean, getUpdates: boolean) => {
  const allPrefs = getAllUserPreferences();
  allPrefs[email.toLowerCase()] = { // Store email in lowercase for consistency
    earlyAccess,
    getUpdates,
    submittedOn: new Date().toISOString(),
  };
  try {
    localStorage.setItem(PITCHIQ_USER_PREFERENCES_KEY, JSON.stringify(allPrefs));
  } catch (error) {
    console.error("Error saving user preferences to localStorage:", error);
  }
};

const EmailSignup = forwardRef<HTMLDivElement, EmailSignupProps>((props, ref) => {
  const { navbarHeight } = useNavbarHeight();
  const [email, setEmail] = useState("");
  const [earlyAccess, setEarlyAccess] = useState(false);
  const [getUpdates, setGetUpdates] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Initialize remainingCount from localStorage or default to 2
  const [remainingCount, setRemainingCount] = useState(() => {
    const storedCount = localStorage.getItem(EARLY_ACCESS_SPOTS_KEY);
    return storedCount !== null ? parseInt(storedCount, 10) : 2;
  });

  const [alreadySubmittedThisDevice, setAlreadySubmittedThisDevice] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(remainingCount === 0);

  // Generate a simple computer fingerprint
  const generateFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no_canvas_support'; // Handle case where canvas context cannot be obtained
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Basic hashing function (alternative to btoa if issues arise, e.g. in non-browser env or special chars)
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return 'fp_' + Math.abs(hash).toString(16); // Make it a bit more filename/key friendly
  };

  // Load initial data on component mount
  useEffect(() => {
    const checkDeviceSubmissionStatus = () => {
      const fingerprint = generateFingerprint();
      const submitted = localStorage.getItem(`email_submitted_${fingerprint}`);
      if (submitted) {
        setAlreadySubmittedThisDevice(true);
      }
    };

    // Listen for highlight events from CTA buttons
    const handleHighlight = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (props.id && customEvent.detail && customEvent.detail.targetId === props.id) {
        setIsHighlighted(true);
        setTimeout(() => {
          setIsHighlighted(false);
        }, 3000);
      } else if (!props.id) {
        setIsHighlighted(true);
        setTimeout(() => {
          setIsHighlighted(false);
        }, 3000);
      }
    };

    // Add event listener for custom highlight event
    window.addEventListener('highlightEmailSignup', handleHighlight);

    checkDeviceSubmissionStatus();

    // Cleanup event listener
    return () => {
      window.removeEventListener('highlightEmailSignup', handleHighlight);
    };
  }, [props.id]);

  // Effect to check if spots are sold out and update localStorage
  useEffect(() => {
    localStorage.setItem(EARLY_ACCESS_SPOTS_KEY, String(remainingCount));
    if (remainingCount === 0) {
      setIsSoldOut(true);
    }
  }, [remainingCount]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting || alreadySubmittedThisDevice) return;

    setIsSubmitting(true);
    setError("");

    // --- Netlify Form Submission Logic ---
    const formDataForNetlify = new URLSearchParams();
    formDataForNetlify.append('form-name', 'early-access-signup');
    formDataForNetlify.append('email', email);
    formDataForNetlify.append('early_access_opt_in', String(earlyAccess));
    formDataForNetlify.append('product_updates_opt_in', String(getUpdates));
    formDataForNetlify.append('computer_fingerprint_field', generateFingerprint());

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formDataForNetlify.toString(),
      });

      if (response.ok) {
        setIsSubmitted(true);
        localStorage.setItem(`email_submitted_${generateFingerprint()}`, 'true');
        setAlreadySubmittedThisDevice(true);

        setUserEmailPreferences(email, earlyAccess, getUpdates);
        
        if (earlyAccess) {
            setRemainingCount(prevCount => Math.max(0, prevCount - 1));
        }
        
        const signupEvent = new CustomEvent('emailSignupComplete', {
          detail: { email: email, earlyAccess: earlyAccess, getUpdates: getUpdates }
        });
        window.dispatchEvent(signupEvent);
        
        setTimeout(() => {
          setIsSubmitting(false);
        }, 5000);
      } else {
        setError('Submission failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting to Netlify Forms:', error);
      setError('Network error or issue submitting form. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Scroll anchor style
  const scrollAnchorStyle: React.CSSProperties = {
    position: 'relative', // So the negatively translated div doesn't affect surrounding layout
    height: 0, // No actual height
    width: '100%',
  };
  const scrollAnchorInnerStyle: React.CSSProperties = {
    transform: `translateY(-${navbarHeight}px)`,
    height: '1px', // Give it a tiny height to be a valid scroll target if needed
    pointerEvents: 'none',
  };

  if (alreadySubmittedThisDevice) {
    return (
      <div 
        id={props.id || "email-signup"}
        ref={ref}
        className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-md relative transition-all duration-700 ease-in-out ${isHighlighted ? 'shadow-glow-red' : ''}`}>
        {isHighlighted && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pitchiq-red/5 via-pitchiq-red/10 to-transparent pointer-events-none animate-pulse"></div>
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
    <div 
      id={props.id || "email-signup"}
      ref={ref}
      className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-md relative transition-all duration-700 ease-in-out ${isHighlighted ? 'shadow-glow-red' : ''}`}>
      {isHighlighted && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pitchiq-red/5 via-pitchiq-red/10 to-transparent pointer-events-none animate-pulse"></div>
      )}
      <div className="flex flex-col items-start relative z-10">
        <h3 className={`text-lg font-semibold mb-5 ${isSoldOut ? 'text-gray-600' : 'text-gray-700'}`}>Join the Waitlist</h3>
        
        {isSubmitted && !isSoldOut ? (
          <div className="flex flex-col items-center w-full text-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
            <p className="text-green-600 font-medium mb-2">You're on the list! We'll be in touch soon.</p>
          </div>
        ) : isSubmitted && isSoldOut ? (
          <div className="flex flex-col items-center w-full text-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
            <p className="text-green-600 font-medium mb-2">You're on the list!</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="yourbest@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`pl-10 text-base py-2.5 ${isSoldOut && !earlyAccess ? 'border-gray-300' : ''}`}
                    aria-label="Email for waitlist"
                    disabled={isSubmitting}
                  />
                </div>
                {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle className="h-4 w-4" />{error}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="earlyAccess"
                  checked={earlyAccess}
                  onChange={(e) => setEarlyAccess(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-pitchiq-red border-gray-300 rounded focus:ring-pitchiq-red/50"
                  disabled={isSubmitting}
                />
                <label htmlFor="earlyAccess" className="text-sm font-medium text-gray-700">
                  Get Early Access
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="getUpdates"
                  checked={getUpdates}
                  onChange={(e) => setGetUpdates(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-pitchiq-red border-gray-300 rounded focus:ring-pitchiq-red/50 disabled:opacity-50"
                  disabled={isSubmitting}
                />
                <label htmlFor="getUpdates" className="text-sm font-medium text-gray-700">
                  Get Product Updates & Feature Sneak Peeks
                </label>
              </div>
            
            <Button 
              type="submit" 
              className={`w-full text-base py-2.5 ${isSubmitting ? 'bg-pitchiq-red/70' : 'bg-pitchiq-red hover:bg-pitchiq-red/90'}`}
              disabled={isSubmitting || !email}
              aria-live="polite"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              {isSubmitting ? "Submitting..." : "Join the Waitlist"}
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-1">
              <Clock className="h-4 w-4" />
              <span>
                {isSoldOut
                  ? earlyAccess
                    ? "Early access spots are currently full, but you'll be on the list for future openings and updates."
                    : "Early access spots are full. Sign up for updates!"
                  : earlyAccess
                    ? "You'll be prioritized for early access!"
                    : "Opt-in for early access consideration."}
              </span>
            </div>
          </form>
          </>
        )}
        
        { !(isSubmitted && !isSoldOut) && (
          <div className={`flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-1 text-xs mt-6 w-full px-1 ${isSoldOut ? 'text-gray-500' : 'text-gray-500'}`}>
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
});

export default EmailSignup; 