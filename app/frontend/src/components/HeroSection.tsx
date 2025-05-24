import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Check, MessageSquareQuote } from "lucide-react";
// import { Link } from "react-router-dom"; // No longer needed here
import { useAuthContext } from "@/context/AuthContext"; // Import the context hook

// --- Timestamps (Shifted back 1s) ---
const HEADACHE_TIMESTAMP = 14;
const TRUST_TIMESTAMP = 15;
const LONG_TIME_TIMESTAMP = 20;
// ------------------------------------

interface FeedbackItem {
  id: number;
  message: string;
  timeoutId?: NodeJS.Timeout; // Optional: Store timeout ID for individual clearing
}

const HeroSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // --- State changed to handle multiple feedbacks ---
  const [activeFeedbacks, setActiveFeedbacks] = useState<FeedbackItem[]>([]);
  // --- State for Context Phrase Pop-up ---
  const [contextPhrase, setContextPhrase] = useState<string | null>(null);
  const [contextPhraseId, setContextPhraseId] = useState<number | null>(null);
  // --------------------------------------------------
  const feedbackShown = useRef<{ [key: string]: boolean }>({});

  const audioRef = useRef<HTMLAudioElement>(null);
  // Removed progressBarRef as it's not used for seeking currently
  const notificationSoundRef = useRef<HTMLAudioElement>(null);
  // Ref to store the synchronized timeout for context+feedback pairs
  const synchronizedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to store individual feedback timeouts
  const feedbackTimeoutsRef = useRef<{ [id: number]: NodeJS.Timeout }>({});
   // Ref to store individual context phrase timeouts (when not synchronized)
  const contextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // const { isAuthenticated } = useAuth(); // Placeholder: Get auth state
  const { isAuthenticated, isLoading } = useAuthContext(); // Use the context

  // --- Helper to clear all active timeouts ---
  const clearAllTimeouts = () => {
    if (synchronizedTimeoutRef.current) {
      clearTimeout(synchronizedTimeoutRef.current);
      synchronizedTimeoutRef.current = null;
    }
     if (contextTimeoutRef.current) { // Clear independent context timeout
      clearTimeout(contextTimeoutRef.current);
      contextTimeoutRef.current = null;
    }
    Object.values(feedbackTimeoutsRef.current).forEach(clearTimeout);
    feedbackTimeoutsRef.current = {};
  };

  // --- Cleanup timeouts on unmount ---
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);


  // Load duration metadata
  useEffect(() => {
     if (audioRef.current) {
      const setAudioData = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
          setCurrentTime(audioRef.current.currentTime);
        }
      }
      audioRef.current.addEventListener('loadedmetadata', setAudioData);
      // Cleanup listener on component unmount or dependency change
      return () => {
         audioRef.current?.removeEventListener('loadedmetadata', setAudioData);
      }
    }
  }, []); // No dependencies needed here usually

  // Handle time updates for progress bar and feedback triggers
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return; // Guard clause if audioRef is null

    const handleTimeUpdate = () => {
      // No need to check audioElement again, already checked above
      setCurrentTime(audioElement.currentTime);
      const now = audioElement.currentTime;

      // --- Trigger 1: "causing headaches" (SYNCHRONIZED) ---
      // Use >= and < to trigger only once within the second
      if (now >= HEADACHE_TIMESTAMP && now < HEADACHE_TIMESTAMP + 1 && !feedbackShown.current.headachePair) {
        console.log("Triggering headache pair at:", now);
        feedbackShown.current.headachePair = true; // Mark pair as triggered
        showSynchronizedPair("causing headaches", "Emphasized pain point", 3000);
      }

      // --- Trigger 2: "Created trust" (INDEPENDENT) ---
      if (now >= TRUST_TIMESTAMP && now < TRUST_TIMESTAMP + 1 && !feedbackShown.current.trustFeedback) {
         console.log("Triggering trust feedback at:", now);
        feedbackShown.current.trustFeedback = true;
        showFeedback("Created trust", 2000);
      }

      // --- Trigger 3: "Two years?" (SYNCHRONIZED) ---
      // Use >= and < to trigger only once within the second
      if (now >= LONG_TIME_TIMESTAMP && now < LONG_TIME_TIMESTAMP + 1 && !feedbackShown.current.longTimePair) { 
          console.log("Triggering longTime pair at:", now);
          feedbackShown.current.longTimePair = true; // Use a single flag for the pair
          // Call showSynchronizedPair with 3000ms duration
          showSynchronizedPair("Two years?", "Correctly highlighted urgency", 3000); 
      }
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    // Cleanup listener
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPlaying]); // Re-run when isPlaying changes (to add/remove listener)

  // Handle audio ending
  useEffect(() => {
    const audioElement = audioRef.current;
     if (!audioElement) return; // Guard clause

    const handleAudioEnd = () => {
       console.log("Audio ended");
      setIsPlaying(false);
      setCurrentTime(0);
      feedbackShown.current = {};
      setActiveFeedbacks([]);
      setContextPhrase(null);
      setContextPhraseId(null);
      clearAllTimeouts(); // Clear any lingering timeouts
    };
    audioElement.addEventListener('ended', handleAudioEnd);
    // Cleanup listener
    return () => {
      audioElement.removeEventListener('ended', handleAudioEnd);
    };
  }, []); // No dependencies needed, effect runs once

  // --- Function to show SYNCHRONIZED context phrase + feedback ---
  const showSynchronizedPair = (phrase: string, feedbackMessage: string, durationMs: number) => {
     console.log(`Showing synchronized pair: "${phrase}" / "${feedbackMessage}" for ${durationMs}ms`);
     // Play sound once for the pair
     if (notificationSoundRef.current) {
       notificationSoundRef.current.currentTime = 0;
       notificationSoundRef.current.play().catch(e => {
         console.error("Error playing notification sound:", e);
         // Continue with the rest of the function even if sound fails
       });
     }

    const contextId = Date.now();
    const feedbackId = contextId + 1; // Simple way to ensure unique ID

    // Show context phrase
    setContextPhrase(phrase);
    setContextPhraseId(contextId);

    // Show feedback message
    const newFeedbackItem: FeedbackItem = { id: feedbackId, message: feedbackMessage };
    setActiveFeedbacks(currentFeedbacks => [...currentFeedbacks, newFeedbackItem]);

    // Clear previous synchronized timeout if any
    if (synchronizedTimeoutRef.current) {
        console.log("Clearing previous synchronized timeout");
        clearTimeout(synchronizedTimeoutRef.current);
    }

    // Set a *single* timeout to clear both
    synchronizedTimeoutRef.current = setTimeout(() => {
      console.log(`Synchronized timeout firing for contextId: ${contextId}, feedbackId: ${feedbackId}`);
      // Clear context phrase - check ID to prevent race conditions if triggered fast
      setContextPhraseId(currentId => {
          if (currentId === contextId) {
              setContextPhrase(null); // Clear phrase state only if ID matches
              return null;
          }
          return currentId;
      });
      // Clear specific feedback item
      setActiveFeedbacks(currentFeedbacks =>
        currentFeedbacks.filter(item => item.id !== feedbackId)
      );
      synchronizedTimeoutRef.current = null; // Clear the ref
    }, durationMs);
  };


 // --- Function to show the blue context phrase pop-up (INDEPENDENT TIMEOUT) ---
 // Used for "that's a long time" where durations differ
 const showContextPhrase = (phrase: string, durationMs: number = 3000) => {
     console.log(`Showing context phrase: "${phrase}" for ${durationMs}ms`);
    const uniqueId = Date.now();

     // Clear previous independent context timeout if any
    if (contextTimeoutRef.current) {
        console.log("Clearing previous independent context timeout");
        clearTimeout(contextTimeoutRef.current);
    }

    setContextPhrase(phrase);
    setContextPhraseId(uniqueId);

    // Use the separate contextTimeoutRef for independent timing
    contextTimeoutRef.current = setTimeout(() => {
        console.log(`Independent context timeout firing for ID: ${uniqueId}`);
         // Clear context phrase - check ID
         setContextPhraseId(currentId => {
            if (currentId === uniqueId) {
                setContextPhrase(null);
                return null;
            }
            return currentId;
        });
        contextTimeoutRef.current = null; // Clear the ref
    }, durationMs);
 };


  // --- Function to show INDEPENDENT feedback pop-up ---
  const showFeedback = (message: string, durationMs: number = 5000) => {
     console.log(`Showing independent feedback: "${message}" for ${durationMs}ms`);
     // Play sound for independent feedback
     if (notificationSoundRef.current) {
       notificationSoundRef.current.currentTime = 0;
       notificationSoundRef.current.play().catch(e => {
         console.error("Error playing notification sound:", e);
         // Continue with the rest of the function even if sound fails
       });
     }

    const newFeedbackItem: FeedbackItem = {
      id: Date.now(),
      message: message,
    };
    setActiveFeedbacks(currentFeedbacks => [...currentFeedbacks, newFeedbackItem]);

    // Clear existing timeout for this ID if somehow it exists (safety)
    const existingTimeoutId = feedbackTimeoutsRef.current[newFeedbackItem.id];
    if (existingTimeoutId) {
        console.log(`Clearing existing timeout for feedback ID: ${newFeedbackItem.id}`);
        clearTimeout(existingTimeoutId);
    }

    // Store the timeout ID
    feedbackTimeoutsRef.current[newFeedbackItem.id] = setTimeout(() => {
      console.log(`Independent feedback timeout firing for ID: ${newFeedbackItem.id}`);
      setActiveFeedbacks(currentFeedbacks =>
        currentFeedbacks.filter(item => item.id !== newFeedbackItem.id)
      );
      // Clean up ref *after* filtering state
      delete feedbackTimeoutsRef.current[newFeedbackItem.id];
    }, durationMs);
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        console.log("Pausing audio");
        audioRef.current.pause();
        // We are NOT clearing timeouts on pause
      } else {
        // If starting from beginning or resuming after end
        if (audioRef.current.currentTime === 0 || audioRef.current.ended) {
           console.log("Resetting state and clearing timeouts before play");
          feedbackShown.current = {};
          setActiveFeedbacks([]);
          setContextPhrase(null);
          setContextPhraseId(null);
          clearAllTimeouts(); // Clear timeouts on restart
        }
        console.log("Playing audio");
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Calculate progress for the bar
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="min-h-screen flex flex-col justify-center pt-64 md:pt-80 pb-32 md:pb-48 px-6 md:px-10 lg:px-20">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="order-1 md:order-1">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            Stop Guessing,<br /> <span className="text-pitchiq-red">Start Closing.</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-8 max-w-xl">
            Practice smarter with AI roleplay. Build confidence, master objections, and win more deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {!isLoading && (
                <a href={isAuthenticated ? "/dashboard" : "/auth/signup"}>
                  <Button size="lg" className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg px-8">Get Started Free</Button>
                </a>
              )}
            </div>
            <div className="mt-10 flex items-center gap-6">
            <div className="flex -space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-pitchiq-red border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-pitchiq-navy border-2 border-white"></div>
            </div>
            <p className="text-sm text-foreground/70">
                Be among the first to revolutionize your pitch.
            </p>
            </div>
          </div>
          <div className="order-2 md:order-2 relative">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 pb-16 border border-gray-200 shadow-md relative">
            <div className="flex flex-col items-start">
                <h3 className="text-lg font-semibold mb-5 text-gray-700">Hear PitchIQ in Action:</h3>

                <audio ref={audioRef} src="/demo.mp3" preload="metadata"></audio>
                <audio ref={notificationSoundRef} src="/notification.mp3" preload="auto"></audio>

                <div className="flex items-center w-full max-w-sm gap-3">
                    <Button
                        onClick={togglePlayPause}
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full text-pitchiq-red hover:bg-pitchiq-red/10 flex-shrink-0"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-pitchiq-red" />}
                    </Button>

                    <div className="flex-grow h-2 bg-gray-300 rounded-full overflow-hidden cursor-default">
                        <div
                        className="h-full bg-pitchiq-red rounded-full transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    </div>
            </div>

            <div className="absolute top-4 right-6 flex flex-col items-end gap-2 z-20 pointer-events-none">
                {contextPhrase && (
                    <div
                    key={`context-${contextPhraseId}`}
                    className="px-4 py-2 bg-pitchiq-navy text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap flex items-center gap-2 animate-fade-in"
                    >
                    <MessageSquareQuote className="h-4 w-4" />
                    "{contextPhrase}"
                    </div>
                )}

                {activeFeedbacks.map((feedbackItem) => (
                    <div
                    key={`feedback-${feedbackItem.id}`}
                    className="px-4 py-2 bg-green-600/90 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap flex items-center gap-2 animate-fade-in"
                    >
                    <Check className="h-4 w-4" />
                    <span>{feedbackItem.message}</span>
                    </div>
                ))}
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

