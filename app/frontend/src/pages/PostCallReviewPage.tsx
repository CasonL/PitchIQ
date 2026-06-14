import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, FileText, Sparkles, Loader2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SummaryScreen from "../components/feedback/SummaryScreen";
import TimelineScreen from "../components/feedback/TimelineScreen";

type Screen = "summary" | "timeline" | "completion";
type InputMode = "loading" | "transcript" | "demo" | "real";

interface CallMetrics {
  callDuration?: number;
  painPointsFound?: number;
  objectionsHandled?: number;
  objectionsTotal?: number;
  demoScheduled?: boolean;
  readinessScore?: number;
  transcript?: string;
}

interface AIFeedbackResponse {
  readinessScore: number;
  painPointsFound: number;
  objectionsHandled: number;
  objectionsTotal: number;
  demoScheduled: boolean;
  callDuration: number;
  highlights: { text: string; type: "win" | "miss" | "tip" }[];
  sentimentAnalysis: string;
  coachingMoments: Array<{
    timestamp: number;
    title: string;
    insight: string;
    sentimentBefore: number;
    sentimentAfter: number;
  }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pitchiq-8enf.onrender.com';

const PostCallReviewPage = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("summary");
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [hasSufficientData, setHasSufficientData] = useState<boolean>(true);
  const [inputMode, setInputMode] = useState<InputMode>("loading");
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
        setInputMode(sufficient ? "real" : "transcript");
        
        setCallMetrics({
          callDuration: duration,
          painPointsFound: parsed.painPointsFound || parsed.painPoints || 0,
          objectionsHandled: parsed.objectionsHandled || 0,
          objectionsTotal: parsed.objectionsTotal || 2,
          demoScheduled: parsed.demoScheduled || parsed.meetingBooked || false,
          readinessScore: parsed.readinessScore || parsed.overallScore || null
        });
      } else {
        // No call data found - offer transcript input
        setHasSufficientData(false);
        setInputMode("transcript");
      }
    } catch (e) {
      console.error('Failed to parse call metrics:', e);
      setHasSufficientData(false);
      setInputMode("transcript");
    }
  }, []);

  // Analyze transcript with AI
  const analyzeTranscript = async () => {
    if (!transcript.trim()) return;
    
    setIsAnalyzing(true);
    setAiError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback/analyze-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          transcript: transcript.trim(),
          context: 'sales_call'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const data: AIFeedbackResponse = await response.json();
      
      // Store AI-generated metrics
      setCallMetrics({
        callDuration: data.callDuration,
        painPointsFound: data.painPointsFound,
        objectionsHandled: data.objectionsHandled,
        objectionsTotal: data.objectionsTotal,
        demoScheduled: data.demoScheduled,
        readinessScore: data.readinessScore,
        transcript: transcript.trim()
      });
      
      // Also store in localStorage for persistence
      localStorage.setItem('lastCallMetrics', JSON.stringify({
        callDuration: data.callDuration,
        painPointsFound: data.painPointsFound,
        objectionsHandled: data.objectionsHandled,
        objectionsTotal: data.objectionsTotal,
        demoScheduled: data.demoScheduled,
        readinessScore: data.readinessScore,
        source: 'ai_analyzed'
      }));
      
      setInputMode("real");
      setHasSufficientData(true);
      
    } catch (error) {
      console.error('Failed to analyze transcript:', error);
      setAiError('Failed to analyze transcript. Please try again or use demo data.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Use demo data fallback
  const useDemoData = () => {
    setInputMode("demo");
    setHasSufficientData(false);
  };

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
        {/* Transcript Input Mode */}
        {inputMode === "transcript" && screen === "summary" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto px-4 sm:px-6 py-8"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-pitch-orange/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-pitch-orange" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-pitch-text mb-2">
                No Call Data Found
              </h1>
              <p className="text-pitch-secondary">
                Paste a sales call transcript to generate AI feedback, or use demo data.
              </p>
            </div>

            <div className="bg-white border border-pitch-border rounded-2xl p-4 sm:p-6 shadow-sm mb-4">
              <label className="block text-sm font-semibold text-pitch-text mb-2">
                Call Transcript
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your sales call transcript here...

Example:
Rep: Hi Marcus, this is Sarah from PitchIQ. How are you today?
Marcus: I'm good, what is this about?
Rep: I wanted to reach out because I saw you downloaded our guide on sales training...
Marcus: Oh yeah, I was just browsing. We don't really need anything right now.
Rep: I understand. Just curious - what's your biggest challenge with sales training currently?
Marcus: Well, honestly, our reps freeze on objections. It's costing us deals..."
                className="w-full h-64 p-4 border border-pitch-border rounded-xl text-sm text-pitch-text placeholder:text-pitch-tertiary/60 focus:outline-none focus:ring-2 focus:ring-pitch-orange/20 focus:border-pitch-orange resize-none"
                disabled={isAnalyzing}
              />
              
              {aiError && (
                <div className="mt-3 p-3 bg-pitch-red/10 border border-pitch-red/20 rounded-lg text-sm text-pitch-red">
                  {aiError}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={analyzeTranscript}
                  disabled={!transcript.trim() || isAnalyzing}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Feedback
                    </>
                  )}
                </button>
                <button
                  onClick={useDemoData}
                  disabled={isAnalyzing}
                  className="px-5 py-3 border border-pitch-border text-pitch-secondary rounded-xl font-medium text-sm hover:bg-pitch-muted/50 transition-smooth disabled:opacity-50"
                >
                  Use Demo Data
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-pitch-tertiary">
              Your transcript is sent to our AI for analysis and not stored permanently.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={screen + inputMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {screen === "summary" && inputMode !== "transcript" ? (
              <SummaryScreen
                onReview={() => setScreen("timeline")}
                onTryAgain={() => navigate("/")}
                callDuration={callMetrics?.callDuration}
                painPointsFound={callMetrics?.painPointsFound}
                objectionsHandled={callMetrics?.objectionsHandled}
                demoScheduled={callMetrics?.demoScheduled}
                readinessScore={callMetrics?.readinessScore}
                hasSufficientData={hasSufficientData}
                aiGenerated={inputMode === "real" && !!callMetrics?.transcript}
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
