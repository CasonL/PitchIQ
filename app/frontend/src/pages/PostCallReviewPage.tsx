import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { AdvancedFeedbackDashboard } from "../components/feedback/AdvancedFeedbackDashboard";
import { CallDataProcessor } from "../components/feedback/CallDataProcessor";

const PostCallReviewPage = () => {
  const navigate = useNavigate();
  
  // Generate sophisticated feedback data
  const feedbackData = CallDataProcessor.generateSampleData();

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-100/80">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/post-call-analysis")}
            className="flex items-center gap-2 text-[#5A5A5A] hover:text-brand-orange transition-colors text-sm font-medium px-2 py-2 -ml-2 rounded-lg hover:bg-black/5 min-h-[44px]"
          >
            <ArrowLeft size={16} />
            <span>Back to Analysis</span>
          </button>
          <Link to="/" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/5 transition-colors min-h-[44px]">
            <img src="/fox-mascot.webp" alt="PitchIQ" className="w-6 h-6 object-contain" />
            <span className="font-display text-base font-bold text-[#1A1A1A]">PitchIQ</span>
          </Link>
        </div>
      </div>

      {/* Advanced Feedback Dashboard */}
      <AdvancedFeedbackDashboard
        callMetrics={feedbackData.callMetrics}
        moments={feedbackData.moments}
        onComplete={() => navigate("/")}
      />
    </div>
  );
};

export default PostCallReviewPage;
