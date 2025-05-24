import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, BookOpen, Zap, Sparkles, ArrowUp, ArrowDown, Minus, Star, Target, Bot, TrendingUp, Award, AlertTriangle, Lightbulb, MessageCircle, BarChart3, TrendingDown, Focus, Frown, Meh, Smile } from 'lucide-react';
import './PostRoleplayAnalysisCard.css';

interface FeedbackPoint {
  id: string;
  summary: string;
  details: string;
  relatedTraining?: {
    id: string;
    title: string;
    type: 'module' | 'practice';
  }[];
  positiveTrait?: string;
  desiredOutcome?: string;
  benefit?: string;
  specificAction?: string;
}

// NEW Interface for Sales Skills Snapshot items
interface SalesSkillSnapshotItem {
  skillName: string;
  userScore: number;    // e.g., 0-100
  targetScore: number;  // e.g., 0-100
  summary?: string;     // Optional brief AI observation
}

// NEW Interface for the main focused area
interface FocusedArea {
  title: string; // e.g., "Refining Your Questioning Technique"
  keyPoints: string[]; // e.g., ["Ask more open-ended questions", "Use follow-up questions to dig deeper"]
  lessonSuggestion: {
    id: string;
    title: string;
    type: 'module' | 'practice';
  };
}

// NEW Interface for performance trend items
interface PerformanceTrend {
  metricName: string; // e.g., "Pacing", "Clarity Score", "Objection Handling"
  currentValue: string; // e.g., "150 WPM", "85%", "Good"
  previousValue: string; // e.g., "170 WPM", "75%", "Needs Improvement"
  trend: 'improved' | 'declined' | 'stable' | 'new'; // 'new' if it's a new metric being tracked
  summary?: string; // Optional AI comment on this specific trend
  averageBenchmark?: string; // e.g., "140-160 WPM", "80-90%"
  benchmarkLabel?: string; // e.g., "Avg. Range:", "Top Performers:"
}

interface PostRoleplayAnalysisCardProps {
  analysis: {
    // --- Fields for Deep Dive View (isFirstAnalysis = true) ---
    deepDiveSummary?: string;
    performanceNarrativeParagraph1?: string; // New field for narrative
    performanceNarrativeParagraph2?: string; // New field for narrative
    keyMetrics?: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
    salesSkillsSnapshot?: SalesSkillSnapshotItem[];
    
    // --- Fields for BOTH Deep Dive & Focused View (though used differently) ---
    mainFeedback: FeedbackPoint; 
    additionalFeedback: FeedbackPoint[]; 

    // --- NEW Fields PRIMARILY for Focused View (isFirstAnalysis = false) ---
    focusedSummary?: string; // The brief overall takeaway for the focused view
    focusedArea?: FocusedArea; // The specific area to concentrate on, with key points and a lesson
    performanceTrends?: PerformanceTrend[]; // Comparison with past performance
  } | null;
  isLoading: boolean;
  error: string | null;
  onNavigateToTraining: (trainingId: string, type: 'module' | 'practice') => void;
  isFirstAnalysis?: boolean;
  onDeepDiveDismissed?: () => void;
  onboardingGoalSkillName?: string;
  onFocusedAnalysisDismissed?: () => void;
}

type SatisfactionRating = null | 'unhappy' | 'neutral' | 'happy';

const PostRoleplayAnalysisCard: React.FC<PostRoleplayAnalysisCardProps> = ({
  analysis,
  isLoading,
  error,
  onNavigateToTraining,
  isFirstAnalysis,
  onDeepDiveDismissed,
  onboardingGoalSkillName,
  onFocusedAnalysisDismissed,
}) => {
  console.log('[PRA Card] isFirstAnalysis:', isFirstAnalysis);
  console.log('[PRA Card] salesSkillsSnapshot prop:', JSON.stringify(analysis?.salesSkillsSnapshot));
  // console.log('[PRA Card PROPS] isFirstAnalysis:', isFirstAnalysis, 'typeof onDeepDiveDismissed:', typeof onDeepDiveDismissed, 'onDeepDiveDismissed itself:', onDeepDiveDismissed);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);
  const [isSalesSkillsSnapshotExpanded, setIsSalesSkillsSnapshotExpanded] = useState(false);
  const [isFocusedDetailsExpanded, setIsFocusedDetailsExpanded] = useState(false);
  const [satisfactionRating, setSatisfactionRating] = useState<SatisfactionRating>(null);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [textFeedback, setTextFeedback] = useState('');
  const [feedbackSentMessageVisible, setFeedbackSentMessageVisible] = useState(false);

  const feedbackSectionRef = useRef<HTMLDivElement>(null); // Ref for the feedback section
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea

  const toggleFeedbackExpansion = (id: string) => {
    setExpandedFeedbackId(expandedFeedbackId === id ? null : id);
  };

  const handleSatisfactionRate = (rating: SatisfactionRating) => {
    const newRating = satisfactionRating === rating ? null : rating;
    setSatisfactionRating(newRating);

    if (newRating !== null) {
      setShowFeedbackInput(true);
    } else {
      setShowFeedbackInput(false);
      setTextFeedback(''); // Clear text if no rating is selected
    }
    // If changing from one rating to another, showFeedbackInput remains true, textFeedback is preserved.

    // Window scroll logic is now moved to the useEffect
  };

  useEffect(() => {
    // Scroll the entire feedback section into view when the text input appears or disappears,
    // ensuring the main dismiss button at the bottom of this section is visible.
    if (showFeedbackInput && feedbackSectionRef.current) {
      setTimeout(() => {
        // Check again inside timeout in case state changed rapidly
        if (feedbackSectionRef.current && showFeedbackInput) { 
          feedbackSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          // After the section is in view, ensure the whole window scrolls to the very bottom
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      }, 350); // Increased timeout to 350ms to ensure motion.div animation completes
    } else if (!showFeedbackInput && satisfactionRating !== null && feedbackSectionRef.current) {
      // If feedback input is hidden (e.g. after sending text feedback) but a rating is still selected,
      // gently scroll to ensure the buttons are still well-positioned.
      setTimeout(() => {
        if (feedbackSectionRef.current && satisfactionRating !== null) { // Check rating again
          feedbackSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100); // Keep this potentially shorter or adjust if needed
    }
  }, [showFeedbackInput, satisfactionRating]); // Re-run if showFeedbackInput or satisfactionRating changes

  const handleTextFeedbackChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextFeedback(event.target.value);
  };

  const handleSendTextFeedback = () => {
    console.log('User Feedback Submitted:', { 
      rating: satisfactionRating,
      text: textFeedback 
    });
    // Here you would typically send this data to your backend

    setTextFeedback('');
    setShowFeedbackInput(false); // Hide input after sending
    // Keep satisfactionRating as is, don't reset it here.
    
    setFeedbackSentMessageVisible(true);
    setTimeout(() => {
      setFeedbackSentMessageVisible(false);
    }, 2500); // Show message for 2.5 seconds
  };

  if (isLoading) {
    return (
      <div className="pra-card pra-loading">
        <p>Loading analysis...</p>
        {/* Add a spinner or skeleton loader here */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pra-card pra-error">
        <p>Error loading analysis: {error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="pra-card pra-no-data">
        <p>No analysis data available at the moment.</p>
        <p>Complete a roleplay session to see your feedback!</p>
      </div>
    );
  }

  const renderFeedbackItem = (item: FeedbackPoint, isMain: boolean) => (
    <div
      key={item.id}
      className={`mb-3 p-4 rounded-lg border ${isMain ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} cursor-pointer`}
      onClick={() => toggleFeedbackExpansion(item.id)}
    >
      <div className="flex justify-between items-center">
        <h4 className={`text-sm font-semibold ${isMain ? 'text-red-700' : 'text-gray-700'}`}>{item.summary}</h4>
        {expandedFeedbackId === item.id ? <ChevronUp size={18} className={isMain ? 'text-red-600' : 'text-gray-600'} /> : <ChevronDown size={18} className={isMain ? 'text-red-600' : 'text-gray-600'} />}
      </div>
      {expandedFeedbackId === item.id && (
        <div
          className="mt-2 text-xs text-gray-600 leading-relaxed"
        >
          <p>{item.details}</p>
          {item.relatedTraining && item.relatedTraining.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-semibold text-gray-700 mb-1">Suggested Next Steps:</h5>
              <ul className="space-y-1">
                {item.relatedTraining.map(training => (
                  <li key={training.id} 
                      onClick={() => onNavigateToTraining(training.id, training.type)}
                      className="flex items-center text-red-600 hover:text-red-800 hover:underline cursor-pointer transition-colors"
                  >
                    {training.type === 'module' ? <BookOpen size={14} className="mr-1.5" /> : <Zap size={14} className="mr-1.5" />}
                    <span>{training.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Brand colors - Red for accents, white/light grays for backgrounds
  const brandRed = "text-red-600"; // Example, adjust to your specific shade e.g., text-brand-red
  const brandRedBorder = "border-red-500";
  const brandRedBgLight = "bg-red-50";

  // Define new navy and light blue theme colors
  const brandNavy = "text-blue-800";
  const brandNavyBorder = "border-blue-700"; // Changed from brandRedBorder for Sec I
  const brandNavyBgLight = "bg-blue-50"; // Changed from brandRedBgLight for Sec I

  // --- Theme Colors for Deep Dive Analysis Card ---
  const deepDiveCardBg = "bg-slate-100"; // Premium neutral base for the whole card
  const deepDiveCardBorder = "border-2 border-amber-300 shadow-xl shadow-black/20"; // Softer gold border

  // Gold Accent Theme (for specific highlight sections within Deep Dive)
  const goldAccentBg = "bg-amber-100 hover:bg-amber-200 transition-all duration-300 ease-out"; // Lighter gold, subtle hover
  const goldAccentBorder = "border-amber-300 ring-1 ring-amber-200 ring-inset"; // Softer gold border and ring
  const goldAccentIconColor = "text-amber-700"; // Darker icon for better contrast on amber-100
  const goldAccentTitleColor = "text-neutral-800 font-bold";
  const goldAccentTextColor = "text-neutral-700";
  // --- End Theme Colors ---

  const getTrendIndicatorDetails = (trendStatus: PerformanceTrend['trend']) => {
    switch (trendStatus) {
      case 'improved':
        return { Icon: ArrowUp, textColor: 'text-green-700', bgColor: 'bg-green-100', label: 'Improved' };
      case 'declined':
        return { Icon: ArrowDown, textColor: 'text-red-700', bgColor: 'bg-red-100', label: 'Declined' };
      case 'stable':
        return { Icon: Minus, textColor: 'text-yellow-700', bgColor: 'bg-yellow-100', label: 'Stable' };
      case 'new':
        return { Icon: Sparkles, textColor: 'text-blue-700', bgColor: 'bg-blue-100', label: 'New' };
      default:
        return { Icon: Minus, textColor: 'text-gray-700', bgColor: 'bg-gray-100', label: 'Unknown' };
    }
  };

  return (
    <motion.div
      className={`overflow-hidden rounded-xl shadow-xl mx-auto my-5 w-full max-w-3xl font-sans ${isFirstAnalysis ? `${deepDiveCardBg} ${deepDiveCardBorder}` : 'bg-white'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6 md:p-8 space-y-6">
        {/* --- DEEP DIVE SECTIONS (only if isFirstAnalysis is true) --- */}
        {isFirstAnalysis ? (analysis && (
          <motion.div className="space-y-8"> {/* Using div for now, was motion.div */}
            {/* Explicit Deep Dive Banner - GOLD ACCENT */}
            <div className={`py-3 px-5 ${goldAccentBg} ${goldAccentBorder} rounded-lg -mt-2 mb-6 shadow-md`}> 
              <h2 className={`text-xl ${goldAccentTitleColor} text-center flex items-center justify-center`}>
                <Award size={22} className={`mr-2.5 ${goldAccentIconColor}`} />
                Deep Dive Analysis
              </h2>
            </div>

            {/* Section I: Overall Performance Summary - Standard styling for contrast */}
            {analysis.deepDiveSummary && (
              <motion.section // Was motion.section
                className={`p-5 rounded-lg shadow-md bg-white border border-gray-200`} 
              >
                <h3 className={`text-lg font-semibold text-gray-700 mb-3 flex items-center`}> {/* Using brandNavy for title consistency */}
                  <Sparkles size={20} className={`mr-2 ${brandNavy}`} /> 
                  Overall Performance Summary
                </h3>
                <p className={`text-sm text-gray-700 leading-relaxed`}>
                  {analysis.deepDiveSummary}
                </p>
              </motion.section>
            )}
            {/* Section II: Your Personalized Focus - Standard styling for contrast */}
            {onboardingGoalSkillName && analysis.salesSkillsSnapshot && analysis.salesSkillsSnapshot.find(skill => skill.skillName === onboardingGoalSkillName) && (() => {
              const goalSkill = analysis.salesSkillsSnapshot!.find(skill => skill.skillName === onboardingGoalSkillName)!;
              const simulatedTargetScore = Math.min(100, goalSkill.userScore + 15); 
              
              let barColorClass = 'bg-red-400';
              const pointsFromSimulatedTarget = simulatedTargetScore - goalSkill.userScore;
              if (goalSkill.userScore >= simulatedTargetScore) barColorClass = 'bg-green-500';
              else if (pointsFromSimulatedTarget <= 20) barColorClass = 'bg-yellow-400';

              let scoreTextColorClass = 'text-red-600';
              if (goalSkill.userScore >= simulatedTargetScore) scoreTextColorClass = 'text-green-600';
              else if (pointsFromSimulatedTarget <= 20) scoreTextColorClass = 'text-yellow-600';

              const userScorePercent = Math.max(0, Math.min(100, (goalSkill.userScore / 100) * 100));
              const simulatedTargetPercent = Math.max(0, Math.min(100, (simulatedTargetScore / 100) * 100));

              return (
                <motion.section // Was motion.section
                  className={`mb-0 p-5 rounded-xl shadow-md bg-white border border-gray-200`} 
                >
                  <h3 className={`text-lg font-semibold text-gray-700 mb-3 flex items-center`}> {/* Existing brandRed styling */}
                    <Star size={22} className={`inline mr-2 text-yellow-400 fill-yellow-400`} /> 
                    Your Personalized Focus: {goalSkill.skillName}
                  </h3>
                  <p className={`text-sm ${brandNavy} mb-4`}>
                    You mentioned wanting to improve <strong>{goalSkill.skillName}</strong>. Based on this session, a good initial target is <strong>{simulatedTargetScore}</strong>. Let's track your progress!
                  </p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Current Performance</span>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">
                        Score: <span className={`font-bold ${scoreTextColorClass}`}>{goalSkill.userScore}</span>
                      </span>
                      <span className="mx-1">|</span>
                      <span className="font-medium text-gray-700">New Target: {simulatedTargetScore}</span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-gray-200 rounded-full relative overflow-hidden">
                    <motion.div // Was motion.div
                      className={`${barColorClass} h-full rounded-full`}
                      style={{ width: `${userScorePercent}%` }}
                    />
                    <motion.div // Was motion.div
                      className={`absolute top-0 bottom-0 w-1 ${brandRed} transform -translate-x-1/2 shadow-md`}
                      style={{ left: `${simulatedTargetPercent}%` }}
                    />
                  </div>
                  {goalSkill.summary && <p className={`text-xs ${brandRed} opacity-75 mt-2 leading-snug`}><em>{goalSkill.summary}</em></p>}
                  {/* Placeholder for relevant feedback & training link */}
                  <div className="mt-4 pt-3 border-t border-red-200">
                     <p className="text-xs text-gray-600 mb-1">Next step: Review feedback on asking open-ended questions.</p>
                     <button className={`text-xs ${brandRed} hover:underline`}>Go to Detailed Feedback</button>
                  </div>
                </motion.section>
              );
            })()} 
            {/* Section III: Communication Style Breakdown */}
            {analysis.keyMetrics && analysis.keyMetrics.length > 0 && (
              <motion.section // Was motion.section
                className="p-5 rounded-lg shadow-md bg-gray-50 border border-gray-200"
              >
                <h3 className={`text-lg font-semibold text-gray-700 mb-3 flex items-center`}>
                  <MessageCircle size={20} className={`mr-2 ${brandRed}`} />
                  Communication Style Breakdown
                </h3>
                <div className="space-y-3">
                  {analysis.keyMetrics.map((metric, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">{metric.label}</span>
                        <span className={`font-semibold ${
                          metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? (metric.label === 'Filler Words' || metric.label === 'Pace' ? 'text-green-600' : 'text-red-600') : 'text-gray-700'
                        }`}>
                          {metric.value}
                          {metric.trend === 'up' && <ArrowUp size={14} className="inline ml-1" />}
                          {metric.trend === 'down' && <ArrowDown size={14} className="inline ml-1" />}
                          {metric.trend === 'neutral' && <Minus size={14} className="inline ml-1" />}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
            {/* MOVED Section: Coach's Notes (formerly Personalized Performance Journey) - GOLD ACCENT */}
            {isFirstAnalysis && (analysis.performanceNarrativeParagraph1 || analysis.performanceNarrativeParagraph2) && (
              <motion.section
                className={`p-5 rounded-lg shadow-md ${goldAccentBg} ${goldAccentBorder}`}
              >
                <h3 className={`${goldAccentTitleColor} text-xl font-semibold mb-4 flex items-center`}>
                  <Zap size={22} className={`mr-2 ${goldAccentIconColor}`} />
                  Coach's Notes
                </h3>
                {analysis.performanceNarrativeParagraph1 && (
                  <p className={`text-base ${goldAccentTextColor} leading-relaxed mb-3`}>
                    {analysis.performanceNarrativeParagraph1}
                  </p>
                )}
                {analysis.performanceNarrativeParagraph2 && (
                  <p className={`text-base ${goldAccentTextColor} leading-relaxed`}>
                    {analysis.performanceNarrativeParagraph2}
                  </p>
                )}
              </motion.section>
            )}
            {/* Section IV: Key Sales Skills Snapshot */}
            {analysis.salesSkillsSnapshot && analysis.salesSkillsSnapshot.length > 0 && (
              <motion.section // Was motion.section
                className="p-5 rounded-lg shadow-md bg-gray-50 border border-gray-200"
              >
                <div 
                  className="flex justify-between items-center cursor-pointer mb-3"
                  onClick={() => setIsSalesSkillsSnapshotExpanded(!isSalesSkillsSnapshotExpanded)}
                >
                  <h3 className={`text-lg font-semibold text-gray-700 flex items-center`}>
                    <BarChart3 size={20} className={`mr-2 ${brandRed}`} />
                    Key Sales Skills Snapshot
                  </h3>
                  {isSalesSkillsSnapshotExpanded ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
                </div>

                {isSalesSkillsSnapshotExpanded && (
                  <motion.div> {/* Was motion.div for animation */}
                    <div className="space-y-3 pt-2">
                      {analysis.salesSkillsSnapshot.map((skill, index) => {
                        const userPercent = (skill.userScore / 100) * 100;
                        const targetPercent = (skill.targetScore / 100) * 100;
                        let barColor = '';
                        if (skill.userScore <= 20) {
                          barColor = 'bg-red-500';
                        } else if (skill.userScore <= 40) { // 21-40
                          barColor = 'bg-orange-400';
                        } else if (skill.userScore <= 60) { // 41-60
                          barColor = 'bg-yellow-400';
                        } else if (skill.userScore <= 80) { // 61-80
                          barColor = 'bg-lime-500';
                        } else { // 81-100
                          barColor = 'bg-green-500';
                        }
                        return (
                          <div key={index} className="text-sm">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-medium text-gray-700">{skill.skillName}</span>
                              <span className="text-xs text-gray-500">
                                You: {skill.userScore} / Target: {skill.targetScore}
                              </span>
                            </div>
                            <div className="h-2.5 w-full bg-gray-200 rounded-full relative">
                              <div 
                                className={`h-2.5 rounded-full ${barColor}`}
                                style={{ width: `${userPercent}%` }}
                              ></div>
                              <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-gray-600 transform -translate-x-1/2"
                                style={{ left: `${targetPercent}%` }}
                                title={`Target: ${skill.targetScore}`}
                              ></div>
                            </div>
                            {skill.summary && (
                              <p className="text-xs text-gray-500 mt-1 leading-tight"><em>{skill.summary}</em></p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </motion.section>
            )}
            {/* Section V: Detailed Feedback Breakdown */}
            {analysis.mainFeedback && (
              <motion.section // Was motion.section
                className="p-5 rounded-lg shadow-md bg-gray-50 border border-gray-200"
              >
                <h3 className={`text-lg font-semibold text-gray-700 mb-3 flex items-center`}>
                  <Lightbulb size={20} className={`mr-2 ${brandRed}`} />
                  Detailed Feedback Breakdown
                </h3>
                {renderFeedbackItem(analysis.mainFeedback, true)}
                {analysis.additionalFeedback && analysis.additionalFeedback.map(item => renderFeedbackItem(item, false))}
              </motion.section>
            )}
          </motion.div>
        )) : (
          // --- START: FOCUSED VIEW (isFirstAnalysis === false) ---
          analysis && ( // Outer check for analysis object for focused view
            <div className="space-y-6"> {/* Main wrapper for focused view sections */}
              {/* Section A: Focused Summary */}
              {analysis.focusedSummary && (
                <motion.div // Was motion.div
                  className={`p-5 rounded-lg shadow-md ${brandNavyBgLight} border border-blue-200 mb-6`}
                >
                  <h3 className={`text-lg font-semibold ${brandNavy} mb-2 flex items-center`}>
                    <Target size={20} className={`mr-2 ${brandNavy}`} />
                    This Session's Focus
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {analysis.focusedSummary}
                  </p>
                </motion.div>
              )}
              {/* Section B: Your Key Focus Area */}
              {analysis.focusedArea && (
                <motion.section 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="p-5 rounded-lg shadow-md bg-white border border-gray-200"
                >
                  <h3 className={`text-lg font-semibold ${brandRed} mb-3 flex items-center`}>
                    <Focus size={20} className={`mr-2 ${brandRed}`} /> {/* Changed Icon */}
                    Your Key Focus Area: {analysis.focusedArea.title}
                  </h3>
                  {analysis.focusedArea.keyPoints && analysis.focusedArea.keyPoints.length > 0 && (
                    <ul className="list-disc list-inside space-y-1.5 mb-4 pl-1 text-sm text-gray-700">
                      {analysis.focusedArea.keyPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  )}
                  {analysis.focusedArea.lessonSuggestion && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Suggested Next Step:</h4>
                      <button
                        onClick={() => onNavigateToTraining(analysis.focusedArea!.lessonSuggestion.id, analysis.focusedArea!.lessonSuggestion.type)}
                        className={`flex items-center text-sm ${brandRed} hover:underline hover:text-red-700 transition-colors group`}
                      >
                        {analysis.focusedArea.lessonSuggestion.type === 'module' ? <BookOpen size={16} className="mr-1.5 group-hover:text-red-700" /> : <Zap size={16} className="mr-1.5 group-hover:text-red-700" />}
                        <span>{analysis.focusedArea.lessonSuggestion.title}</span>
                      </button>
                    </div>
                  )}
                </motion.section>
              )}
              {/* Section C: Performance Trends */}
              {analysis.performanceTrends && analysis.performanceTrends.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="p-6 rounded-xl shadow-lg bg-white border border-gray-200"
                >
                  <h3 className={`text-xl font-semibold text-gray-800 mb-6 flex items-center`}>
                    <TrendingUp size={22} className={`mr-2.5 ${brandRed}`} />
                    Performance Trends
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.performanceTrends
                      .filter(trend => 
                        ['improved', 'declined', 'new'].includes(trend.trend) ||
                        (onboardingGoalSkillName && trend.metricName.toLowerCase() === onboardingGoalSkillName.toLowerCase())
                      )
                      .map((trend, index) => {
                        const { Icon: TrendIcon, textColor, bgColor, label: trendLabel } = getTrendIndicatorDetails(trend.trend);
                        return (
                          <div key={index} className="bg-white p-4 rounded-lg shadow-md border border-gray-100 flex flex-col space-y-2 hover:shadow-lg transition-shadow duration-150">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-md font-semibold text-gray-700 leading-tight">{trend.metricName}</h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
                                <TrendIcon size={12} className="mr-1" />
                                {trendLabel}
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{trend.currentValue}</p>
                            {(trend.previousValue || trend.trend === 'new') && (
                              <p className="text-xs text-gray-500">
                                {trend.trend === 'new' ? 
                                  (trend.previousValue && trend.previousValue !== 'N/A' ? `Previously: ${trend.previousValue} (Now tracked as New)` : 'Newly Tracked Metric') :
                                  (trend.previousValue !== 'N/A' ? `Previously: ${trend.previousValue}` : '')
                              }
                            </p>
                          )}
                            {trend.summary && (
                              <p className="text-xs text-gray-600 pt-2 border-t border-gray-200">
                                <em>{trend.summary}</em>
                              </p>
                            )}
                            {trend.averageBenchmark && trend.benchmarkLabel && (
                              <div className="mt-auto pt-2 border-t border-gray-200">
                                 <p className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded-md">
                                    <span className="font-semibold">{trend.benchmarkLabel}</span> {trend.averageBenchmark}
                                 </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </motion.section>
              )}
            </div>
          )
          // --- END: FOCUSED VIEW ---
        )}

        {/* --- DISMISS BUTTONS --- */}
        {(isFirstAnalysis && onDeepDiveDismissed) || (!isFirstAnalysis && onFocusedAnalysisDismissed) ? (
          <div ref={feedbackSectionRef} className="mt-6 pt-6 border-t border-gray-200 text-center space-y-4">
            {/* Satisfaction Rating UI */}
            <div>
              <p className="text-sm text-gray-600 mb-2">How helpful was this analysis?</p>
              <div className="flex justify-center space-x-3 mb-3">
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleSatisfactionRate('unhappy')}
                  className={`p-2 rounded-full transition-colors duration-150 
                              ${satisfactionRating === 'unhappy' ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-red-100 text-gray-600'}`}
                  title="Not Helpful"
                >
                  <Frown size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleSatisfactionRate('neutral')}
                  className={`p-2 rounded-full transition-colors duration-150 
                              ${satisfactionRating === 'neutral' ? 'bg-yellow-500 text-white' : 'bg-gray-200 hover:bg-yellow-100 text-gray-600'}`}
                  title="It's Okay"
                >
                  <Meh size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleSatisfactionRate('happy')}
                  className={`p-2 rounded-full transition-colors duration-150 
                              ${satisfactionRating === 'happy' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-green-100 text-gray-600'}`}
                  title="Helpful!"
                >
                  <Smile size={20} />
                </motion.button>
              </div>

              {/* Text Feedback Input Area */}
              {showFeedbackInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }} // mt-3
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <textarea
                    ref={textareaRef}
                    value={textFeedback}
                    onChange={handleTextFeedbackChange}
                    placeholder="Any other thoughts? (Optional)"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
                    rows={3}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleSendTextFeedback}
                    disabled={!textFeedback.trim()} // Disable if textarea is empty or only whitespace
                    className={`mt-2 px-4 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 
                                ${textFeedback.trim() ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    Send Thoughts
                  </motion.button>
                </motion.div>
              )}
              {/* Feedback Sent Message */}
              {feedbackSentMessageVisible && (
                 <motion.p 
                    initial={{ opacity: 0, y: 10}}
                    animate={{ opacity: 1, y: 0}}
                    exit={{ opacity: 0, y: -10}}
                    className="text-xs text-green-600 mt-2"
                 >
                    Thanks for your feedback!
                 </motion.p>
              )}
            </div>

            {/* Existing Dismiss Button */}
            {isFirstAnalysis && onDeepDiveDismissed && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onDeepDiveDismissed}
                className="px-8 py-2.5 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                Got It, Show Me My Dashboard!
              </motion.button>
            )}
            {!isFirstAnalysis && onFocusedAnalysisDismissed && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onFocusedAnalysisDismissed}
                className="px-8 py-2.5 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                Understood, Back to Dashboard
              </motion.button>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default PostRoleplayAnalysisCard; 