/**
 * MarcusLanding.tsx
 * Landing page for Marcus Challenge demo
 * Clean, minimal hero with single "Start Demo" CTA
 */

import React from 'react';

interface MarcusLandingProps {
  onStartDemo: () => void;
}

export const MarcusLanding: React.FC<MarcusLandingProps> = ({ onStartDemo }) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        {/* Hero Section */}
        <div className="mb-12">
          {/* Marcus Portrait */}
          <div className="w-40 h-40 mx-auto mb-8 rounded-3xl overflow-hidden shadow-2xl border-4 border-black">
            <img 
              src="/charmer-portrait.png" 
              alt="Marcus Stindle"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title */}
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            The Marcus Challenge
          </h1>
          
          {/* Subtitle */}
          <p className="text-2xl text-gray-600 mb-2">
            Master the cold call. Book the meeting.
          </p>
          <p className="text-xl text-gray-500">
            Practice sales with an AI that acts like a real prospect.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={onStartDemo}
          className="
            px-12 py-5 
            bg-red-600 hover:bg-red-700 
            text-white text-xl font-bold 
            rounded-2xl 
            shadow-xl hover:shadow-2xl 
            transform hover:scale-105 
            transition-all duration-200
          "
        >
          Start Demo
        </button>

        {/* Feature Pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <div className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full">
            🎯 3 Difficulty Levels
          </div>
          <div className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full">
            📊 Real-Time Scoring
          </div>
          <div className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full">
            🎤 Voice-First Training
          </div>
          <div className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full">
            🏆 Instant Feedback
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div>
            <div className="text-4xl mb-3">1️⃣</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Choose Your Challenge</h3>
            <p className="text-sm text-gray-600">
              Select from Easy, Medium, or Hard scenarios. Each has unique pain points and objections.
            </p>
          </div>
          <div>
            <div className="text-4xl mb-3">2️⃣</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Call Marcus</h3>
            <p className="text-sm text-gray-600">
              Practice your cold call. Marcus responds like a real prospect—skeptical, guarded, human.
            </p>
          </div>
          <div>
            <div className="text-4xl mb-3">3️⃣</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Get Your Score</h3>
            <p className="text-sm text-gray-600">
              See exactly what worked and what didn't. Retry instantly or try a harder challenge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
