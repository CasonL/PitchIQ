import React, { useState, useEffect, useMemo, FC, Fragment, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';
import {
  InformationCircleIcon,
  LightBulbIcon,
  AcademicCapIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  PresentationChartBarIcon, // For Sales Skills Snapshot
  ArrowTrendingUpIcon, // For Performance Trend
  UserCircleIcon, // Placeholder for AI Coach/Persona
  ChatBubbleBottomCenterTextIcon, // For general text/summary
  CheckCircleIcon, // For success/shining moments
  AdjustmentsHorizontalIcon, // For settings or fine-tuning
  LinkIcon, // For training links
  ArrowTrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

// Interface Definitions (restored and enhanced based on project history and needs)

interface BaseMetric {
  feedback: string;
  idealMin?: number;
  idealMax?: number;
}

interface ValueMetric extends BaseMetric {
  value: number;
}

interface CountMetric extends BaseMetric {
  count: number;
}

interface KeyMetrics {
  pace: ValueMetric;
  clarity: ValueMetric;
  fillerWords: CountMetric;
  energy?: ValueMetric; 
  questionRatio?: ValueMetric; 
  talkListenRatio?: ValueMetric;
}

interface SalesSkillSnapshotItem {
  id: string;
  name: string;
  userScore: number;
  targetScore: number; // Default target
  simulatedTargetScore?: number; // For personalized goal skill
  aiExplanation?: string; // For personalized goal skill
  relevantFeedback?: string;
  trainingLink?: string;
  trainingLinkText?: string;
}

// Using React.ElementType for flexible icon usage
interface FeedbackItem {
  id: string;
  icon?: React.ElementType;
  title: string;
  description: string;
  details?: string | ReactNode; // Can be simple string or complex JSX for more info
  color?: string; // e.g., 'text-green-500', 'text-red-700' (using brand red)
  trainingLink?: string;
  trainingLinkText?: string;
}

interface FocusedArea {
  title: string;
  description: string;
  currentScore?: number;
  targetScore?: number;
  improvementTip?: string;
  trainingLink?: string;
  trainingLinkText?: string;
}

interface PerformanceTrend {
  period: string;
  metricName: string; // e.g. "Overall Score", "Clarity"
  currentValue: number | string;
  previousValue?: number | string;
  changeDescription: string;
  trendIcon?: 'up' | 'down' | 'neutral';
  trendColor?: string; // e.g. 'text-green-500', 'text-red-700'
}

interface PostRoleplayAnalysis {
  overallSummary: string; // Short, impactful summary
  deepDiveSummary: string; // Longer, more detailed summary (can be expandable)
  keyMetrics: KeyMetrics;
  salesSkillsSnapshot: SalesSkillSnapshotItem[];
  additionalFeedback: FeedbackItem[]; // General list of feedback points
  mainFeedback: FeedbackItem; // AI's primary suggestion for improvement
  shiningMoment: FeedbackItem;
  growthEdge: FeedbackItem;
  proTip?: FeedbackItem; // Strategic advice or advanced tip

  // Focused View Specific Data (can reuse some from above or have dedicated fields)
  focusedTakeaway?: string;
  focusedArea?: FocusedArea; // The main area for this focused report
  performanceTrends?: PerformanceTrend[]; // Multiple trends can be shown
}

interface PostRoleplayAnalysisCardProps {
  analysis: PostRoleplayAnalysis | null;
  isFirstAnalysis: boolean; // True for "Deep Dive", false for "Focused Feedback"
  onDeepDiveDismissed?: () => void; // When user dismisses the initial deep dive
  // onExploreMoreFocused?: () -> void; // Example: if focused view has its own expand
  onCollapseFullCard?: () => void; // To return to teaser view
  onboardingGoalSkillName?: string; // User's stated goal from onboarding
  // isExpanded?: boolean; // If the card itself is controlled by a parent for full card expand/collapse
  // onToggleExpand?: () => void; // Parent controls expansion
}

// Helper function to determine color based on score and target
const getScoreColor = (score: number, target: number, lowerBetter: boolean = false): string => {
  if (lowerBetter) {
    if (score <= target) return 'text-green-500'; // Good: at or below target
    if (score <= target * 1.2) return 'text-yellow-500'; // Okay: slightly above target
    return 'text-red-600'; // Needs improvement: significantly above target
  }
  if (score >= target) return 'text-green-500'; // Good: at or above target
  if (score >= target * 0.8) return 'text-yellow-500'; // Okay: close to target
  return 'text-red-600'; // Needs improvement
};

// Helper function for brand color theming
const brandAccentColor = "red-600"; // e.g., text-red-600, bg-red-600
const brandSecondaryColor = "red-700"; // for darker shades or hovers


// ... existing code ...
// Ensure all React hooks (useState, useEffect etc.) are correctly defined or imported if used.
// Ensure all components (motion.div, Link etc.) are correctly defined or imported.

const PostRoleplayAnalysisCard: FC<PostRoleplayAnalysisCardProps> = ({
  analysis,
  isFirstAnalysis,
  onDeepDiveDismissed,
  onCollapseFullCard,
  onboardingGoalSkillName,
}) => {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isPersonalizedFocusExpanded, setIsPersonalizedFocusExpanded] = useState(true); // Default open
  const [isCommStyleExpanded, setIsCommStyleExpanded] = useState(false);
  const [isSalesSkillsSnapshotExpanded, setIsSalesSkillsSnapshotExpanded] = useState(false);
  const [isKeyMomentsExpanded, setIsKeyMomentsExpanded] = useState(false);
  
  // Focused view specific states
  const [isFocusedDetailsExpanded, setIsFocusedDetailsExpanded] = useState(false); // For "Progress Snapshot" and "Roleplay Breakdown"

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  const sectionVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
      },
    }),
  };

  const goalSkill = useMemo(() => {
    if (!analysis || !onboardingGoalSkillName) return null;
    return analysis.salesSkillsSnapshot.find(skill => skill.name === onboardingGoalSkillName);
  }, [analysis, onboardingGoalSkillName]);

  const otherSkills = useMemo(() => {
    if (!analysis) return [];
    if (!onboardingGoalSkillName) return analysis.salesSkillsSnapshot;
    return analysis.salesSkillsSnapshot.filter(skill => skill.name !== onboardingGoalSkillName);
  }, [analysis, onboardingGoalSkillName]);

  const renderSkillBar = (skill: SalesSkillSnapshotItem, isGoalSkill: boolean = false) => {
    const userScorePercent = Math.max(0, Math.min(100, skill.userScore));
    const targetScorePosition = Math.max(0, Math.min(100, isGoalSkill && skill.simulatedTargetScore ? skill.simulatedTargetScore : skill.targetScore));
    const displayTarget = isGoalSkill && skill.simulatedTargetScore ? skill.simulatedTargetScore : skill.targetScore;
    
    let barColor = 'bg-gray-300';
    let textColor = 'text-gray-700';

    if (userScorePercent >= displayTarget) {
      barColor = `bg-green-500`;
      textColor = `text-green-600`;
    } else if (userScorePercent >= displayTarget * 0.8) {
      barColor = `bg-yellow-500`;
      textColor = `text-yellow-600`;
    } else {
      barColor = `bg-${brandAccentColor}`;
      textColor = `text-${brandAccentColor}`;
    }

    return (
      <motion.div key={skill.id} variants={itemVariants} className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{skill.name}</span>
          <span className={`text-sm font-semibold ${textColor}`}>
            {skill.userScore}%
            <span className="text-xs text-gray-500"> / Target: {displayTarget}%</span>
          </span>
        </div>
        <div className="relative w-full bg-gray-200 rounded-full h-2.5">
          <motion.div
            className={`h-2.5 rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${userScorePercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-600"
            initial={{ left: '0%' }}
            animate={{ left: `${targetScorePosition}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            title={`Target: ${displayTarget}%`}
          >
            <div className={`absolute -top-5 left-1/2 transform -translate-x-1/2 px-1.5 py-0.5 text-xs text-white bg-gray-600 rounded-sm whitespace-nowrap ${isGoalSkill ? `ring-2 ring-${brandAccentColor}` : ''}`}>
              {displayTarget}%
            </div>
          </motion.div>
        </div>
        {isGoalSkill && skill.aiExplanation && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.5 }}
            className={`mt-2 text-xs text-gray-600 p-2 bg-red-50 border border-${brandAccentColor} rounded-md`}
          >
            <InformationCircleIcon className={`h-4 w-4 inline mr-1 mb-0.5 text-${brandAccentColor}`} />
            <strong>AI Coach Note:</strong> {skill.aiExplanation}
          </motion.p>
        )}
        {skill.relevantFeedback && <p className="mt-1 text-xs text-gray-500">{skill.relevantFeedback}</p>}
        {skill.trainingLink && skill.trainingLinkText && (
          <Link href={skill.trainingLink} passHref>
            <a className={`mt-1 text-xs text-${brandAccentColor} hover:text-${brandSecondaryColor} font-semibold inline-flex items-center`}>
              {skill.trainingLinkText} <LinkIcon className="h-3 w-3 ml-1" />
            </a>
          </Link>
        )}
      </motion.div>
    );
  };
  
  const renderFeedbackItemCard = (item: FeedbackItem, index: number) => (
    <motion.div
      key={item.id}
      custom={index}
      variants={itemVariants}
      className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start">
        {item.icon && <item.icon className={twMerge("h-6 w-6 mr-3", item.color || `text-${brandAccentColor}`)} />}
        <div>
          <h4 className="text-md font-semibold text-gray-800">{item.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          {item.details && <div className="mt-2 text-xs text-gray-500 prose prose-sm max-w-none">{typeof item.details === 'string' ? <p>{item.details}</p> : item.details}</div>}
          {item.trainingLink && item.trainingLinkText && (
            <Link href={item.trainingLink} passHref>
              <a className={`mt-2 text-sm text-${brandAccentColor} hover:text-${brandSecondaryColor} font-semibold inline-flex items-center`}>
                {item.trainingLinkText} <AcademicCapIcon className="h-4 w-4 ml-1" />
              </a>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (!analysis) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No analysis data available.</p>
        {/* Optional: Add a loading spinner or skeleton here */}
      </div>
    );
  }

  // Section Header Component
  const SectionHeader: FC<{ title: string; icon?: React.ElementType; isOpen?: boolean; onToggle?: () => void; defaultOpen?: boolean; }> = 
    ({ title, icon: Icon, isOpen, onToggle, defaultOpen }) => (
    <motion.div 
      className={twMerge(
        "flex justify-between items-center py-3 px-1 mb-2 cursor-pointer border-b-2",
        isOpen ? `border-${brandAccentColor}` : 'border-gray-200 hover:border-gray-300'
      )}
      onClick={onToggle}
      initial={false} // عشان ما يصير انيميشن اول مرة
    >
      <div className="flex items-center">
        {Icon && <Icon className={twMerge("h-5 w-5 mr-2", isOpen ? `text-${brandAccentColor}` : 'text-gray-500')} />}
        <h3 className={twMerge("text-lg font-semibold", isOpen ? `text-${brandAccentColor}` : 'text-gray-700')}>
          {title}
        </h3>
      </div>
      {onToggle && (isOpen ? <ChevronUpIcon className="h-5 w-5 text-gray-500" /> : <ChevronDownIcon className="h-5 w-5 text-gray-500" />)}
    </motion.div>
  );


  return (
    <motion.div
      className="bg-gray-50 p-4 sm:p-6 rounded-xl shadow-2xl max-w-3xl mx-auto my-8 relative"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {onCollapseFullCard && (
        <button
          onClick={onCollapseFullCard}
          className={`absolute top-4 right-4 text-sm text-gray-500 hover:text-${brandAccentColor} flex items-center transition-colors`}
          title="Collapse Analysis"
        >
          <ChevronUpIcon className="h-4 w-4 mr-1" /> Collapse
        </button>
      )}

      {/* SPACER FOR COLLAPSE BUTTON */}
      {onCollapseFullCard && <div className="h-8"></div>}


      {isFirstAnalysis ? (
        // ================= DEEP DIVE VIEW =================
        <AnimatePresence>
          <motion.div key="deep-dive-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* 1. Overall Performance Summary */}
            <motion.section variants={itemVariants} custom={0} initial="hidden" animate="visible" className="mb-6">
              <SectionHeader 
                title="Overall Performance Summary" 
                icon={ChatBubbleBottomCenterTextIcon} 
                isOpen={isSummaryExpanded} 
                onToggle={() => setIsSummaryExpanded(!isSummaryExpanded)} 
              />
              <AnimatePresence>
                {isSummaryExpanded && (
                  <motion.div 
                    variants={sectionVariants} 
                    initial="hidden" 
                    animate="visible" 
                    exit="exit" 
                    className="prose prose-sm max-w-none text-gray-700 mt-3 px-2 py-2 bg-white rounded-md border border-gray-200 shadow-sm"
                  >
                    <p>{analysis.deepDiveSummary}</p>
                  </motion.div>
                )}
              </AnimatePresence>
               {!isSummaryExpanded && (
                <p className="text-sm text-gray-600 px-1 mt-2 truncate hover:text-clip custom-truncate-2-lines">
                  {analysis.deepDiveSummary}
                </p>
              )}
            </motion.section>

            {/* 2. Your Personalized Focus */}
            {goalSkill && onboardingGoalSkillName && (
              <motion.section variants={itemVariants} custom={1} initial="hidden" animate="visible" className="mb-6 p-4 bg-red-50 border-2 border-dashed border-${brandAccentColor} rounded-lg shadow-md">
                <SectionHeader 
                  title={`Your Personalized Focus: ${onboardingGoalSkillName}`} 
                  icon={SparklesIcon} 
                  isOpen={isPersonalizedFocusExpanded} 
                  onToggle={() => setIsPersonalizedFocusExpanded(!isPersonalizedFocusExpanded)}
                />
                <AnimatePresence>
                  {isPersonalizedFocusExpanded && (
                    <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="mt-4">
                      {renderSkillBar(goalSkill, true)}
                      {/* Additional feedback specific to the goal skill, if not already in renderSkillBar's relevantFeedback */}
                      {analysis.mainFeedback && analysis.mainFeedback.title.toLowerCase().includes(onboardingGoalSkillName.toLowerCase()) && 
                       goalSkill.relevantFeedback !== analysis.mainFeedback.description && (
                         <div className="mt-3 p-3 bg-white rounded-md border border-gray-200 shadow-sm">
                           <h5 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                            <LightBulbIcon className={`h-5 w-5 mr-2 text-${brandAccentColor}`} /> Specific Tip for {onboardingGoalSkillName}:
                           </h5>
                           <p className="text-xs text-gray-600">{analysis.mainFeedback.description}</p>
                           {analysis.mainFeedback.trainingLink && analysis.mainFeedback.trainingLinkText && (
                            <Link href={analysis.mainFeedback.trainingLink} passHref>
                              <a className={`mt-2 text-xs text-${brandAccentColor} hover:text-${brandSecondaryColor} font-semibold inline-flex items-center`}>
                                {analysis.mainFeedback.trainingLinkText} <AcademicCapIcon className="h-4 w-4 ml-1" />
                              </a>
                            </Link>
                          )}
                         </div>
                       )
                      }
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}

            {/* 3. Communication Style Breakdown */}
            <motion.section variants={itemVariants} custom={2} initial="hidden" animate="visible" className="mb-6">
              <SectionHeader title="Communication Style Breakdown" icon={SpeakerWaveIcon} isOpen={isCommStyleExpanded} onToggle={() => setIsCommStyleExpanded(!isCommStyleExpanded)} />
              <AnimatePresence>
                {isCommStyleExpanded && (
                  <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                    {Object.entries(analysis.keyMetrics).map(([key, metric], idx) => {
                      let displayValue = '';
                      let idealRange = '';
                      let unit = '';
                      let lowerIsBetter = false;
                      let actualValue: number | undefined = undefined;
                      let idealMin: number | undefined = metric.idealMin;
                      let idealMax: number | undefined = metric.idealMax;

                      switch (key) {
                        case 'pace':
                        case 'clarity':
                        case 'energy':
                        case 'questionRatio':
                        case 'talkListenRatio':
                          const valueMetric = metric as ValueMetric;
                          displayValue = `${valueMetric.value}`;
                          actualValue = valueMetric.value;
                          unit = (key === 'pace') ? 'WPM' : '%';
                          if (valueMetric.idealMin && valueMetric.idealMax) idealRange = `${valueMetric.idealMin}-${valueMetric.idealMax}${unit ? ` ${unit}` : ''}`;
                          else if (valueMetric.idealMin) idealRange = `> ${valueMetric.idealMin}${unit ? ` ${unit}` : ''}`;
                          else if (valueMetric.idealMax) idealRange = `< ${valueMetric.idealMax}${unit ? ` ${unit}` : ''}`;
                          break;
                        case 'fillerWords':
                          const countMetric = metric as CountMetric;
                          displayValue = `${countMetric.count}`;
                          actualValue = countMetric.count;
                          unit = 'count';
                          if (countMetric.idealMax) idealRange = `< ${countMetric.idealMax}`;
                          lowerIsBetter = true;
                          break;
                        default:
                          // Should not happen if KeyMetrics is well-defined and data matches
                          const unknownMetric = metric as any;
                          displayValue = typeof unknownMetric.value !== 'undefined' ? `${unknownMetric.value}` : (typeof unknownMetric.count !== 'undefined' ? `${unknownMetric.count}` : 'N/A');
                          actualValue = unknownMetric.value || unknownMetric.count;
                          break;
                      }

                      const scoreColor = actualValue !== undefined ? 
                                           getScoreColor(actualValue, idealMin || (idealMax || 0)/2 + (idealMin || 0)/2 , lowerIsBetter) 
                                           : 'text-gray-700';

                      return (
                       <motion.div key={key} custom={idx} variants={itemVariants} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                         <h5 className="text-base font-semibold text-gray-800 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</h5>
                         <div className="flex items-baseline mb-1">
                            <span className={`text-xl font-bold ${scoreColor}`}>{displayValue}</span>
                            {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
                         </div>
                         {idealRange && <p className="text-xs text-gray-500">Recommended: {idealRange}</p>}
                         <p className="text-sm text-gray-600 mt-2">{metric.feedback}</p>
                       </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* 4. Sales Skill Development Areas */}
            <motion.section variants={itemVariants} custom={3} initial="hidden" animate="visible" className="mb-6">
               <SectionHeader title="Further Skill Development Areas" icon={PresentationChartBarIcon} isOpen={isSalesSkillsSnapshotExpanded} onToggle={() => setIsSalesSkillsSnapshotExpanded(!isSalesSkillsSnapshotExpanded)} />
              <AnimatePresence>
                {isSalesSkillsSnapshotExpanded && (
                  <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="mt-3 px-1 space-y-4">
                    {/* AI's Top Recommendation if not the onboarding goal */}
                    {analysis.mainFeedback && (!onboardingGoalSkillName || !analysis.mainFeedback.title.toLowerCase().includes(onboardingGoalSkillName.toLowerCase())) && (
                      <div className={`mb-4 p-3 bg-yellow-50 border border-yellow-400 rounded-lg shadow-sm`}>
                        <h4 className={`text-base font-semibold text-yellow-700 mb-2 flex items-center`}>
                          <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-600" />
                          AI's Top Recommendation:
                        </h4>
                        {renderFeedbackItemCard(analysis.mainFeedback, 0)} 
                      </div>
                    )}
                    {/* Other Skills Snapshot */}
                    {otherSkills.length > 0 ? (
                      <div className="space-y-3">
                        {otherSkills.map((skill, idx) => renderSkillBar(skill))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 py-2">No other specific skill areas to show right now. Great job focusing on {onboardingGoalSkillName || "your development"}!</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* 5. Key Moments & Strategic Insights */}
            <motion.section variants={itemVariants} custom={4} initial="hidden" animate="visible" className="mb-6">
              <SectionHeader title="Key Moments & Strategic Insights" icon={AdjustmentsHorizontalIcon} isOpen={isKeyMomentsExpanded} onToggle={() => setIsKeyMomentsExpanded(!isKeyMomentsExpanded)} />
              <AnimatePresence>
                {isKeyMomentsExpanded && (
                  <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                    {analysis.shiningMoment && renderFeedbackItemCard({ 
                      ...analysis.shiningMoment, 
                      icon: CheckCircleIcon, 
                      color: 'text-green-500', 
                      title: `🌟 Shining Moment: ${analysis.shiningMoment.title}` 
                    }, 0)}
                    {analysis.growthEdge && renderFeedbackItemCard({ 
                      ...analysis.growthEdge, 
                      icon: ExclamationTriangleIcon, 
                      color: `text-${brandAccentColor}`, 
                      title: `🌱 Growth Edge: ${analysis.growthEdge.title}` 
                    }, 1)}
                    {analysis.proTip && renderFeedbackItemCard({ 
                      ...analysis.proTip, 
                      icon: LightBulbIcon, 
                      color: 'text-blue-500', 
                      title: `💡 Pro Tip: ${analysis.proTip.title}` 
                    }, 2)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {onDeepDiveDismissed && (
              <motion.div className="mt-8 text-center" variants={itemVariants} custom={5} initial="hidden" animate="visible">
                <button
                  onClick={onDeepDiveDismissed}
                  className={`bg-${brandAccentColor} hover:bg-${brandSecondaryColor} text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${brandAccentColor}`}
                >
                  Understood, thanks!
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        // ================= FOCUSED FEEDBACK VIEW =================
        <AnimatePresence>
        <motion.div key="focused-feedback-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
          {/* Overall Takeaway */}
          {analysis.focusedTakeaway && (
            <motion.section 
              variants={itemVariants} 
              custom={0} 
              initial="hidden" 
              animate="visible" 
              className={`p-4 bg-${brandAccentColor}-50 rounded-lg border-2 border-dashed border-${brandAccentColor} shadow-md`}
            >
              <h3 className={`text-xl font-semibold text-${brandAccentColor} mb-2 flex items-center`}>
                <ChatBubbleBottomCenterTextIcon className="h-6 w-6 mr-2" /> Your Quick Takeaway
              </h3>
              <p className="text-md text-gray-700">{analysis.focusedTakeaway}</p>
            </motion.section>
          )}

          {/* Main Focused Aspect */}
          {analysis.focusedArea && (
            <motion.section variants={itemVariants} custom={1} initial="hidden" animate="visible" className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-2">
                <SparklesIcon className={`h-6 w-6 mr-2 text-${brandAccentColor}`} />
                <h3 className={`text-xl font-semibold text-gray-800`}>{analysis.focusedArea.title || "Key Focus for This Session"}</h3>
              </div>
              <p className="text-md text-gray-600 mb-2">{analysis.focusedArea.description}</p>
              {analysis.focusedArea.currentScore !== undefined && analysis.focusedArea.targetScore !== undefined && (
                <div className="my-2">
                  {/* Minimal skill bar for focused area - can reuse/adapt renderSkillBar logic if needed or keep simple */}
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Your Score: <span className={`font-bold ${getScoreColor(analysis.focusedArea.currentScore, analysis.focusedArea.targetScore)}`}>{analysis.focusedArea.currentScore}%</span></span>
                    <span className="text-gray-500">Target: {analysis.focusedArea.targetScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getScoreColor(analysis.focusedArea.currentScore, analysis.focusedArea.targetScore).replace('text-','bg-')}`}
                      style={{ width: `${analysis.focusedArea.currentScore}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {analysis.focusedArea.improvementTip && (
                <p className="text-sm text-gray-600 mt-3 bg-yellow-50 p-3 rounded-md border border-yellow-300 flex items-start">
                  <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Quick Tip:</strong> {analysis.focusedArea.improvementTip}</span>
                </p>
              )}
              {analysis.focusedArea.trainingLink && analysis.focusedArea.trainingLinkText && (
                <Link href={analysis.focusedArea.trainingLink} passHref>
                  <a className={`mt-3 text-md text-${brandAccentColor} hover:text-${brandSecondaryColor} font-semibold inline-flex items-center`}>
                    {analysis.focusedArea.trainingLinkText} <AcademicCapIcon className="h-5 w-5 ml-1" />
                  </a>
                </Link>
              )}
            </motion.section>
          )}
          
          {/* Expandable Details: Progress Snapshot & Full Roleplay Breakdown */}
          <motion.section variants={itemVariants} custom={2} initial="hidden" animate="visible">
            <div 
              className={twMerge(
                "flex justify-between items-center py-3 px-4 mb-0 cursor-pointer rounded-t-lg",
                "bg-gray-100 hover:bg-gray-200 transition-colors",
                isFocusedDetailsExpanded && `bg-${brandAccentColor} text-white hover:bg-${brandSecondaryColor}`
              )}
              onClick={() => setIsFocusedDetailsExpanded(!isFocusedDetailsExpanded)}
            >
              <h3 className="text-lg font-semibold flex items-center">
                {isFocusedDetailsExpanded ? 
                  <ChevronUpIcon className="h-5 w-5 mr-2" /> : 
                  <ChevronDownIcon className="h-5 w-5 mr-2" />
                }
                {isFocusedDetailsExpanded ? "Hide Full Breakdown & Progress" : "Show Full Breakdown & Progress"}
              </h3>
            </div>
            <AnimatePresence>
              {isFocusedDetailsExpanded && (
                <motion.div 
                  variants={sectionVariants} initial="hidden" animate="visible" exit="exit" 
                  className="p-4 space-y-6 bg-white rounded-b-lg border border-t-0 border-gray-200 shadow-sm"
                >
                  {/* Performance Trends (Progress Snapshot) */}
                  {analysis.performanceTrends && analysis.performanceTrends.length > 0 && (
                    <section>
                      <h4 className={`text-lg font-semibold text-${brandAccentColor} mb-3 flex items-center`}>
                        <ArrowTrendingUpIcon className="h-5 w-5 mr-2" /> Your Progress Snapshot
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analysis.performanceTrends.map((trend, idx) => (
                          <motion.div 
                            key={idx} 
                            custom={idx} 
                            variants={itemVariants} 
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                          >
                            <p className="text-md font-semibold text-gray-800">{trend.metricName}</p>
                            <div className="flex items-baseline my-1">
                              <span className={`text-2xl font-bold ${trend.trendColor || 'text-gray-900'}`}>{trend.currentValue}</span>
                              {trend.previousValue !== undefined && <span className="text-xs text-gray-500 ml-1.5">(was {trend.previousValue})</span>}
                            </div>
                            <p className="text-sm text-gray-600 flex items-center">
                              {trend.trendIcon === 'up' && <ArrowTrendingUpIcon className={`h-4 w-4 mr-1 ${trend.trendColor || 'text-green-500'}`} />}
                              {trend.trendIcon === 'down' && <ArrowTrendingDownIcon className={`h-4 w-4 mr-1 ${trend.trendColor || 'text-red-500'}`} />}
                              {trend.trendIcon === 'neutral' && <MinusIcon className={`h-4 w-4 mr-1 ${trend.trendColor || 'text-gray-500'}`} />}
                              {trend.changeDescription}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Additional Feedback Items (Full Roleplay Breakdown) */}
                  {analysis.additionalFeedback && analysis.additionalFeedback.length > 0 && (
                     <section>
                      <h4 className={`text-lg font-semibold text-${brandAccentColor} mb-3 mt-6 flex items-center`}>
                        <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" /> Other Insights from Roleplay
                      </h4>
                      <div className="space-y-4">
                        {analysis.additionalFeedback.map((item, idx) => renderFeedbackItemCard(item, idx))}
                      </div>
                    </section>
                  )}
                  {!analysis.performanceTrends?.length && !analysis.additionalFeedback?.length && (
                    <p className="text-gray-500 text-center py-4">No further details to display at this moment.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
          
        </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default PostRoleplayAnalysisCard; 