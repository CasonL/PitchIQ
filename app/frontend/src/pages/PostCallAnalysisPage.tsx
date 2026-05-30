import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Target, TrendingUp, AlertCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface CallMetrics {
  duration: number;
  talkRatio: string;
  discovery: string;
  objections: string;
  criticalMoments: number;
  successfulMoments: number;
}

const PostCallAnalysisPage = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<CallMetrics | null>(null);

  useEffect(() => {
    // Try to get call data from localStorage
    const storedData = localStorage.getItem('lastCallMetrics');
    if (storedData) {
      setMetrics(JSON.parse(storedData));
      // Clear it after reading
      localStorage.removeItem('lastCallMetrics');
    } else {
      // Default metrics for demo
      setMetrics({
        duration: 16,
        talkRatio: "0% user",
        discovery: "0 questions asked",
        objections: "0 handled",
        criticalMoments: 0,
        successfulMoments: 0
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-100/80">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/demo")}
            className="flex items-center gap-2 text-[#5A5A5A] hover:text-brand-orange transition-colors text-sm font-medium px-2 py-2 -ml-2 rounded-lg hover:bg-black/5 min-h-[44px]"
          >
            <ArrowLeft size={16} />
            <span>Back to Demo</span>
          </button>
          <Link to="/" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/5 transition-colors min-h-[44px]">
            <img src="/fox-mascot.webp" alt="PitchIQ" className="w-6 h-6 object-contain" />
            <span className="font-display text-base font-bold text-[#1A1A1A]">PitchIQ</span>
          </Link>
        </div>
      </div>

      <div className="pt-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-[800px] mx-auto px-6 pt-16 pb-12"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-amber flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-4xl font-bold text-[#1A1A1A] mb-2">
              Call Analysis
            </h1>
            <p className="text-[#5A5A5A] text-lg">
              Your performance breakdown with Marcus
            </p>
          </div>

          {metrics && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-brand-orange mb-1">
                    {metrics.duration}s
                  </div>
                  <div className="text-sm text-[#5A5A5A]">Duration</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-brand-orange mb-1">
                    {metrics.talkRatio}
                  </div>
                  <div className="text-sm text-[#5A5A5A]">Talk Ratio</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-brand-orange mb-1">
                    {metrics.discovery}
                  </div>
                  <div className="text-sm text-[#5A5A5A]">Discovery</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-brand-orange mb-1">
                    {metrics.objections}
                  </div>
                  <div className="text-sm text-[#5A5A5A]">Objections</div>
                </div>
              </div>

              {/* Main Feedback */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-brand-orange/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-brand-orange" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#1A1A1A]">
                    Performance Summary
                  </h2>
                </div>

                {metrics.duration < 30 ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-[#1A1A1A] mb-1">Call Ended Early</h3>
                        <p className="text-sm text-[#5A5A5A] leading-relaxed">
                          This call ended after only {metrics.duration} seconds. To get meaningful feedback, 
                          try to engage Marcus in a longer conversation. Ask questions, handle objections, 
                          and work to uncover his needs.
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Tips for Your Next Call:</h3>
                      <ul className="space-y-2 text-sm text-[#5A5A5A]">
                        <li>• Start with a strong opening that captures attention</li>
                        <li>• Ask open-ended questions to understand Marcus's situation</li>
                        <li>• Listen actively and respond to what he shares</li>
                        <li>• Handle objections with empathy and value-focused responses</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">What Went Well</h3>
                      <ul className="space-y-2 text-sm text-[#5A5A5A]">
                        <li>• You completed a full conversation with Marcus</li>
                        <li>• {metrics.successfulMoments} successful moments identified</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Areas for Improvement</h3>
                      <ul className="space-y-2 text-sm text-[#5A5A5A]">
                        <li>• {metrics.criticalMoments} critical moments to review</li>
                        <li>• Focus on asking more discovery questions</li>
                        <li>• Work on handling objections more effectively</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Coming Soon */}
              <div className="bg-gradient-to-br from-brand-orange/5 to-brand-amber/5 border border-brand-orange/20 rounded-2xl p-8 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-orange to-brand-amber flex items-center justify-center shadow-glow">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#1A1A1A]">
                    Advanced Analytics Coming Soon
                  </h2>
                </div>
                <p className="text-[#5A5A5A] text-sm leading-relaxed mb-4">
                  We're building AI-powered moment-by-moment analysis that will show you exactly 
                  where conversations turned and how to improve. You'll get:
                </p>
                <ul className="space-y-2 text-sm text-[#5A5A5A]">
                  <li>• Detailed breakdown of critical moments</li>
                  <li>• Personalized coaching for each interaction</li>
                  <li>• Progress tracking across multiple calls</li>
                  <li>• Industry-specific best practices</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate("/demo")}
                  className="flex-1 px-6 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all text-sm"
                >
                  Try Another Challenge
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex-1 px-6 py-3.5 rounded-full border border-gray-300 text-[#5A5A5A] font-semibold hover:bg-gray-50 transition-all text-sm"
                >
                  Back to Home
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PostCallAnalysisPage;
