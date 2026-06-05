/**
 * AdvancedFeedbackDashboard.tsx
 * Sophisticated feedback system matching the exact design and animations from demo
 * Replaces the basic feedback form with professional-grade coaching
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw, Mic, Play, CheckCircle } from 'lucide-react';

interface CallMetrics {
  readinessScore: number;
  duration: string;
  painFound: number;
  objectionsHandled: string;
  demoScheduled: string;
  sentiment: Array<{
    timestamp: number;
    value: number;
    label: string;
  }>;
  tags: Array<{
    text: string;
    type: 'success' | 'warning' | 'info';
  }>;
}

interface FeedbackMoment {
  id: string;
  title: string;
  category: string;
  beforeScore: number;
  afterScore?: number;
  scenario: string;
  userResponse?: string;
  feedback: {
    summary: string;
    psychologyCheck: {
      question: string;
      options: Array<{
        letter: 'A' | 'B' | 'C';
        text: string;
        isCorrect: boolean;
        explanation: string;
      }>;
    };
    whyItMatters: string;
    howToImprove: string;
  };
}

interface AdvancedFeedbackDashboardProps {
  callMetrics: CallMetrics;
  moments: FeedbackMoment[];
  onComplete?: () => void;
}

export const AdvancedFeedbackDashboard: React.FC<AdvancedFeedbackDashboardProps> = ({
  callMetrics,
  moments,
  onComplete
}) => {
  const [currentView, setCurrentView] = useState<'overview' | 'moment'>('overview');
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const currentMoment = moments[currentMomentIndex];

  const handleAnswerSelect = (letter: string) => {
    setSelectedAnswer(letter);
    setShowExplanation(true);
  };

  const handleNextMoment = () => {
    if (currentMomentIndex < moments.length - 1) {
      setCurrentMomentIndex(currentMomentIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHasRecorded(false);
    } else {
      onComplete?.();
    }
  };

  const handlePrevMoment = () => {
    if (currentMomentIndex > 0) {
      setCurrentMomentIndex(currentMomentIndex - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHasRecorded(false);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // Simulate recording for 3 seconds
    setTimeout(() => {
      setIsRecording(false);
      setHasRecorded(true);
    }, 3000);
  };

  if (currentView === 'overview') {
    return (
      <div className="min-h-screen bg-[#F8F7F5] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">
              Good effort, room to grow
            </h1>
          </div>

          {/* Readiness Score Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#E5E5E5"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ 
                    strokeDashoffset: 2 * Math.PI * 40 * (1 - callMetrics.readinessScore / 100)
                  }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#F97316]">
                    {callMetrics.readinessScore}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Readiness Score Label */}
          <div className="text-center mb-2">
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">
              READINESS SCORE
            </p>
            <p className="text-sm text-green-600 flex items-center justify-center gap-1">
              <ArrowRight className="w-4 h-4" />
              +12 from last call
            </p>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#F97316] mb-1">
                {callMetrics.duration}
              </div>
              <div className="text-xs font-medium text-gray-600 uppercase">
                DURATION
              </div>
              <div className="text-xs text-gray-500">
                Aim for 2-5 min
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {callMetrics.painFound}
              </div>
              <div className="text-xs font-medium text-gray-600 uppercase">
                PAIN FOUND
              </div>
              <div className="text-xs text-gray-500">
                Go deeper
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {callMetrics.objectionsHandled}
              </div>
              <div className="text-xs font-medium text-gray-600 uppercase">
                OBJECTIONS HANDLED
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {callMetrics.demoScheduled}
              </div>
              <div className="text-xs font-medium text-gray-600 uppercase">
                DEMO SCHEDULED
              </div>
            </div>
          </div>

          {/* Sentiment Graph */}
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-4">
              SENTIMENT
            </h3>
            <div className="relative h-32">
              <svg className="w-full h-full" viewBox="0 0 400 120">
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="40" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 24" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Sentiment line */}
                <motion.path
                  d={`M 0,${120 - callMetrics.sentiment[0]?.value * 1.2} ${callMetrics.sentiment.map((point, i) => 
                    `L ${(i / (callMetrics.sentiment.length - 1)) * 400},${120 - point.value * 1.2}`
                  ).join(' ')}`}
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
                
                {/* Key moments */}
                {callMetrics.sentiment.map((point, i) => (
                  <motion.circle
                    key={i}
                    cx={(i / (callMetrics.sentiment.length - 1)) * 400}
                    cy={120 - point.value * 1.2}
                    r="4"
                    fill={point.label === 'Demo scheduled' ? '#10B981' : '#F97316'}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.2, duration: 0.3 }}
                  />
                ))}
              </svg>
              
              {/* Labels */}
              <div className="absolute top-2 left-4 text-xs text-gray-500">
                Pivoted to Q4
              </div>
              <div className="absolute top-2 right-4 text-xs text-green-600">
                Demo scheduled
              </div>
              <div className="absolute bottom-2 left-1/3 text-xs text-red-600">
                Led with features
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {callMetrics.tags.map((tag, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tag.type === 'success' ? 'bg-green-100 text-green-700' :
                  tag.type === 'warning' ? 'bg-red-100 text-red-700' :
                  'bg-orange-100 text-orange-700'
                }`}
              >
                {tag.text}
              </motion.span>
            ))}
          </div>

          {/* Practice Moments Button */}
          <div className="text-center">
            <motion.button
              onClick={() => setCurrentView('moment')}
              className="bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#EA580C] transition-colors shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🎯 Practice Moment
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header with scores */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 uppercase">
              FIRST TRY
            </div>
            <div className="text-3xl font-bold text-red-600">
              {currentMoment.beforeScore}
            </div>
            <div className="text-xs text-gray-500">
              {currentMoment.category}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 uppercase">
              AFTER PRACTICE
            </div>
            <div className="text-3xl font-bold text-gray-400">
              {hasRecorded ? (
                <span className="text-green-600">{currentMoment.afterScore || '7.8'}</span>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 mx-auto mb-1"></div>
                  <div className="text-xs">?</div>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Practice to unlock
            </div>
          </div>
        </div>

        {/* Practice Moment Button */}
        <div className="text-center mb-8">
          <motion.button
            onClick={() => setCurrentView('moment')}
            className="bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#EA580C] transition-colors shadow-lg flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🎯 Practice Moment
          </motion.button>
        </div>

        {/* Psychology Check */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-[#F97316] flex items-center justify-center">
              <span className="text-white text-xs font-bold">🧠</span>
            </div>
            <h3 className="font-semibold text-lg">Sales Psychology Check</h3>
          </div>
          
          <p className="text-gray-700 mb-6">
            {currentMoment.feedback.psychologyCheck.question}
          </p>

          <div className="space-y-3 mb-6">
            {currentMoment.feedback.psychologyCheck.options.map((option) => (
              <motion.button
                key={option.letter}
                onClick={() => handleAnswerSelect(option.letter)}
                disabled={showExplanation}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedAnswer === option.letter
                    ? option.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : showExplanation && option.isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                whileHover={!showExplanation ? { scale: 1.01 } : {}}
              >
                <div className="flex items-start gap-3">
                  <span className="font-bold text-gray-600">{option.letter}.</span>
                  <span className="text-gray-700">{option.text}</span>
                  {showExplanation && option.isCorrect && (
                    <span className="text-green-600 ml-auto">Correct</span>
                  )}
                  {showExplanation && selectedAnswer === option.letter && !option.isCorrect && (
                    <span className="text-red-600 ml-auto">Incorrect</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t pt-4"
              >
                <h4 className="font-semibold text-[#F97316] mb-2 uppercase text-sm">
                  WHY THIS MATTERS
                </h4>
                <p className="text-gray-700 mb-4">
                  {currentMoment.feedback.whyItMatters}
                </p>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#F97316]">💡</span>
                  <span className="font-semibold text-sm">How?</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Practice Mode */}
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 mb-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Practice Mode</h3>
              <button className="text-gray-400 hover:text-gray-600">
                Close
              </button>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-sm text-gray-600 uppercase mb-2">
                SCENARIO
              </h4>
              <p className="text-gray-700">
                {currentMoment.scenario}
              </p>
            </div>

            <div className="text-center">
              {!isRecording && !hasRecorded && (
                <motion.button
                  onClick={handleStartRecording}
                  className="bg-[#F97316] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto hover:bg-[#EA580C] transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Mic className="w-5 h-5" />
                  Record Your Response
                </motion.button>
              )}
              
              {isRecording && (
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600">Recording...</span>
                </div>
              )}
              
              {hasRecorded && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 justify-center text-green-600"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Done ✓</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevMoment}
            disabled={currentMomentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Prev
          </button>
          
          <span className="text-sm text-gray-500">
            {currentMomentIndex + 1} / {moments.length}
          </span>
          
          <button
            onClick={handleNextMoment}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
