import React, { useState, useEffect } from 'react';
import { Bot, ArrowRight, MessageCircle, Brain, BrainCircuit } from 'lucide-react';
import { DualVoiceAgentInterface } from '@/components/voice/DualVoiceAgentInterface';
import { useUser } from '@/components/common/UserDetailsGate';
import { useSearchParams } from 'react-router-dom';

/**
 * PitchIQ Dual Voice Demo Session
 * This page contains the actual voice interaction.
 */

const DemoContent: React.FC = () => {
  const [userProduct, setUserProduct] = useState<string | null>(null);
  const { fullName } = useUser();
  const [searchParams] = useSearchParams();
  const archetypeId = searchParams.get('archetype');

  const handleProductCaptured = (product: string) => {
    setUserProduct(product);
  };

  if (!userProduct) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-center mb-4">Step 1: Describe Your Product</h2>
        <DualVoiceAgentInterface scenario={null} archetypeId={archetypeId} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-4">Step 2: Roleplay with Your Prospect</h2>
      <p className="text-center text-gray-600 mb-4">We've created a prospect based on your product: <strong>{userProduct}</strong></p>
      <DualVoiceAgentInterface 
        scenario={{
          userProduct: userProduct,
          persona: {
            name: 'Generated Persona',
            role: 'Decision Maker',
            primary_concern: 'ROI and implementation',
            business_details: 'Technology company',
            about_person: 'Experienced decision maker focused on ROI'
          }
        }}
        archetypeId={archetypeId}
      />
    </div>
  );
};

const DemoSessionPage: React.FC = () => {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Live Demo Session
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Engage in a real-time conversation with our AI coach.
          </p>
        </header>
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-6 md:p-8">
            <DemoContent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoSessionPage; 