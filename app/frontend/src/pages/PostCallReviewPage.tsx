import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SummaryScreen from "../components/feedback/SummaryScreen";
import TimelineScreen from "../components/feedback/TimelineScreen";

type Screen = "summary" | "timeline" | "completion";

interface CallMetrics {
  callDuration?: number;
  painPointsFound?: number;
  objectionsHandled?: number;
  objectionsTotal?: number;
  demoScheduled?: boolean;
  readinessScore?: number;
}

const PostCallReviewPage = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("summary");
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [hasSufficientData, setHasSufficientData] = useState<boolean>(true);

  // Load real call data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lastCallMetrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        const duration = parsed.callDuration || parsed.duration || 0;
        
        // Check if call was long enough for meaningful feedback (90s threshold)
        const sufficient = duration >= 90;
        setHasSufficientData(sufficient);
        
        setCallMetrics({
          callDuration: duration,
          painPointsFound: parsed.painPointsFound || parsed.painPoints || 0,
          objectionsHandled: parsed.objectionsHandled || 0,
          objectionsTotal: parsed.objectionsTotal || 2,
          demoScheduled: parsed.demoScheduled || parsed.meetingBooked || false,
          readinessScore: parsed.readinessScore || parsed.overallScore || null
        });
      } else {
        // No call data found - will use demo data
        setHasSufficientData(false);
      }
    } catch (e) {
      console.error('Failed to parse call metrics:', e);
      setHasSufficientData(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-pitch-cream">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-pitch-border/50">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/post-call-analysis")}
            className="flex items-center gap-2 text-pitch-secondary hover:text-pitch-orange transition-colors text-sm font-medium px-2 py-2 -ml-2 rounded-lg hover:bg-black/5 min-h-[44px]"
          >
            <ArrowLeft size={16} />
            <span>Back to Analysis</span>
          </button>
          <Link to="/" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/5 transition-colors min-h-[44px]">
            <img src="/fox-mascot.webp" alt="PitchIQ" className="w-6 h-6 object-contain" />
            <span className="font-display text-base font-bold text-pitch-text">PitchIQ</span>
          </Link>
        </div>
      </div>

      <main className="pt-14 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {screen === "summary" ? (
              <SummaryScreen
                onReview={() => setScreen("timeline")}
                onTryAgain={() => navigate("/")}
                callDuration={callMetrics?.callDuration}
                painPointsFound={callMetrics?.painPointsFound}
                objectionsHandled={callMetrics?.objectionsHandled}
                demoScheduled={callMetrics?.demoScheduled}
                readinessScore={callMetrics?.readinessScore}
                hasSufficientData={hasSufficientData}
              />
            ) : screen === "timeline" ? (
              <TimelineScreen onComplete={() => setScreen("completion")} />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-pitch-green/20 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-pitch-text mb-2">Review Complete!</h2>
                  <p className="text-pitch-secondary mb-8">You've completed your coaching session.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setScreen("summary")}
                      className="px-5 py-2.5 bg-white border border-pitch-border text-pitch-text rounded-xl font-medium hover:bg-pitch-muted transition-smooth"
                    >
                      Back to Summary
                    </button>
                    <button
                      onClick={() => navigate("/")}
                      className="px-5 py-2.5 bg-pitch-orange text-white rounded-xl font-medium hover:bg-pitch-orange/90 transition-smooth"
                    >
                      Return Home
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PostCallReviewPage;
