/**
 * MarcusLobby.tsx
 * Beautiful prep screen before Marcus call - matches landing page aesthetic
 */

import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Phone as CallIcon, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import EmailSignupModal from '@/components/EmailSignupModal';

interface MarcusLobbyProps {
  onStartCall: () => void;
  marcusContext?: 'B2B' | 'B2C';
}

export const MarcusLobby: React.FC<MarcusLobbyProps> = ({ onStartCall, marcusContext = 'B2B' }) => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [showScenarioBanner, setShowScenarioBanner] = useState(true);
  const [startCardAnimation, setStartCardAnimation] = useState(false);

  return (
    <>
      <Navbar preRelease={false} onOpenEmailModal={() => setIsEmailModalOpen(true)} />
      
      <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-32 relative overflow-hidden">
      {/* Subtle decorative pattern - top right */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.04] pointer-events-none">
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 50 0 L 50 80 L 100 80" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 100 0 L 100 40 L 150 40" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 150 0 L 150 120 L 200 120" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 200 0 L 200 80 L 250 80" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 250 0 L 250 60 L 300 60" stroke="#DC2626" strokeWidth="0.5"/>
        </svg>
      </div>

      {/* Subtle decorative pattern - bottom left */}
      <div className="absolute bottom-0 left-0 w-96 h-96 opacity-[0.04] pointer-events-none" style={{ transform: 'rotate(180deg)' }}>
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 50 0 L 50 80 L 100 80" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 100 0 L 100 40 L 150 40" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 150 0 L 150 120 L 200 120" stroke="#DC2626" strokeWidth="0.5"/>
        </svg>
      </div>

      <div className="max-w-5xl w-full relative z-10">
        {/* Floating Scenario Card - Shows First */}
        {showScenarioBanner ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center min-h-[400px]"
          >
            <div className="bg-white border-2 border-gray-900 rounded-3xl p-8 max-w-md shadow-2xl relative">
              <button
                onClick={() => {
                  setShowScenarioBanner(false);
                  setStartCardAnimation(true);
                }}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition-colors"
                aria-label="Got it"
              >
                <X size={22} />
              </button>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">THE SCENARIO</h3>
              </div>
              <p className="text-gray-700 text-base leading-relaxed mb-6">
                You and Marcus met at a networking event last week. He showed interest in your business. You're calling to follow up and tell him more.
              </p>
              <button
                onClick={() => {
                  setShowScenarioBanner(false);
                  setStartCardAnimation(true);
                }}
                className="w-full bg-gray-900 text-white py-3 px-6 rounded-2xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        ) : (
          /* Main Content Grid - Photo Left, Content Right */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-[300px_1fr] gap-12 mb-12"
          >
          {/* Left Column - Photo & Name */}
          <motion.div 
            className="flex flex-col items-center lg:items-start"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-72 h-72 rounded-2xl overflow-hidden shadow-lg border-2 border-black mb-6">
              <img 
                src="/charmer-portrait.png" 
                alt="Marcus Stindle - The Charmer"
                className="w-full h-full object-cover"
              />
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 text-center lg:text-left mb-2">
              Marcus Stindle
            </h1>
            <p className="text-2xl text-red-600 font-medium mb-3">
              The Charmer
            </p>
            <p className="text-gray-600 text-sm text-center lg:text-left mb-6 max-w-md">
              <span className="font-semibold text-gray-900">Runs Stindle Consulting out of Portland.</span> Plays trumpet, drinks too much coffee, loves helping salespeople grow.
            </p>
            
            {/* CTA Button - Only show after scenario dismissal */}
            {!showScenarioBanner && (
              <div className="text-center lg:text-left">
                <Button
                  variant="outlined"
                  onClick={onStartCall}
                  startIcon={<CallIcon />}
                  sx={{
                    bgcolor: 'white',
                    border: '2px solid black',
                    '&:hover': {
                      bgcolor: 'white',
                      border: '2px solid black',
                      transform: 'translateY(-2px)',
                    },
                    color: 'black',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    py: 1,
                    px: 3,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Start Call
                </Button>
                
                <p className="text-gray-600 text-sm mt-3">
                  4-minute interactive training call
                </p>
              </div>
            )}
          </motion.div>

          {/* Right Column - Bio Cards */}
          <div className="flex flex-col justify-center space-y-5">
            <motion.div
              className="bg-green-900/10 rounded-xl p-6 shadow-sm border-2 border-gray-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: startCardAnimation ? 1 : 0 }}
              transition={{ duration: 0.6, delay: startCardAnimation ? 2.5 : 0 }}
            >
              <p className="text-gray-700 text-lg leading-relaxed">
                Sales consultant and competitor. Knows every trick. Perfect prospect—if you can reach him.
              </p>
            </motion.div>
            
            <motion.div
              className="bg-green-900/10 rounded-xl p-6 shadow-sm border-2 border-gray-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: startCardAnimation ? 1 : 0 }}
              transition={{ duration: 0.6, delay: startCardAnimation ? 3.2 : 0 }}
            >
              <p className="text-gray-700 text-lg leading-relaxed">
                Win him over, you're ready for the real world. Lose him, learn exactly why.
              </p>
            </motion.div>
          </div>
        </motion.div>
        )}
      </div>
    </div>
    
    {/* Email Signup Modal */}
    <EmailSignupModal 
      isOpen={isEmailModalOpen} 
      onClose={() => setIsEmailModalOpen(false)} 
    />
  </>
  );
};

export default MarcusLobby;
