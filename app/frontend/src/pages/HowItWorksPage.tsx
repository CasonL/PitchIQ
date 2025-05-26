import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 pt-24"> {/* Added pt-24 for navbar spacing */}
        <h1 className="text-4xl font-bold mb-8 text-center">How PitchIQ Works</h1>
        
        <div className="bg-white shadow-xl rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-pitchiq-red">Step 1: Choose Your Scenario</h2>
          <p className="text-lg text-gray-700 mb-6">
            Select from a variety of hyper-realistic customer personas and sales situations. Each scenario is designed to challenge you with unique objections, personalities, and pain points.
          </p>
          {/* You can add more steps or detailed content here */}
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-pitchiq-red">Step 2: Engage with the AI</h2>
          <p className="text-lg text-gray-700 mb-6">
            Practice your pitch in a safe, judgment-free environment. Our advanced AI responds dynamically, simulating real customer interactions. Uncover hidden needs and navigate tough questions.
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-pitchiq-red">Step 3: Get Instant Feedback & Coaching</h2>
          <p className="text-lg text-gray-700 mb-6">
            Receive real-time guidance from your AI coach. Identify areas for improvement, learn to amplify discovered pain points, and refine your strategy. Detailed post-call analytics help you track progress.
          </p>
        </div>
        
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4 text-pitchiq-red">Step 4: Master Your Pitch</h2>
          <p className="text-lg text-gray-700 mb-6">
            Iterate and improve with each session. Build the confidence and skills to handle any sales conversation, turning potential objections into closing opportunities.
          </p>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default HowItWorksPage; 