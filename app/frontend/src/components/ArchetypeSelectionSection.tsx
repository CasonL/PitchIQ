import React, { useState, useEffect } from 'react';
import { Lock, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Archetype {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imagePath: string;
  isUnlocked: boolean;
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'charmer',
    name: 'The Charmer',
    tagline: 'Tests you with wit and playful chaos',
    description: 'Uses humor and quick wit to test your adaptability. Wins people over in five seconds. Charismatic and playful with friendly danger.',
    imagePath: '/archetypes/sage.png',
    isUnlocked: true
  },
  {
    id: 'visionary',
    name: 'The Visionary',
    tagline: 'Sees what others miss, bets on the future',
    description: 'Imaginative early adopter who radiates inspiration. Gets excited by big-picture thinking and innovative ideas. Passionate about possibilities.',
    imagePath: '/archetypes/phoenix.png',
    isUnlocked: false
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    tagline: 'Guards resources fiercely, tests your worth',
    description: 'Skeptical gatekeeper who protects their budget and time. You must prove your value to get past their defenses. Witty and sharp, but cuts through fluff.',
    imagePath: '/archetypes/dragon.png',
    isUnlocked: false
  },
  {
    id: 'executive',
    name: 'The Executive',
    tagline: 'Cuts to the chase, demands results now',
    description: 'Fast-paced decision maker with commanding authority. No patience for fluff. Show ROI immediately or lose them. Efficiency personified.',
    imagePath: '/archetypes/builder.png',
    isUnlocked: false
  },
  {
    id: 'analyst',
    name: 'The Analyst',
    tagline: 'Needs to know everything before deciding',
    description: 'Data-driven but personable. Gets genuinely excited by good research and makes jokes about methodology. Thorough, curious, and precise.',
    imagePath: '/archetypes/analyst.png',
    isUnlocked: false
  },
  {
    id: 'pragmatist',
    name: 'The Pragmatist',
    tagline: 'Focused on what actually works in practice',
    description: 'Hands-on and practical. Needs real-world examples and proven results. No drama, no fluff—absolute calm strength and steady focus.',
    imagePath: '/archetypes/pragmatist.png',
    isUnlocked: false
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    tagline: 'Protects against risk and change',
    description: 'Protective and grounded. Needs extensive reassurance and guarantees. Sees danger before you do. Loyal but very hard to win over.',
    imagePath: '/archetypes/guardian.png',
    isUnlocked: false
  },
  {
    id: 'innovator',
    name: 'The Innovator',
    tagline: 'First to try new things, loves innovation',
    description: 'Vibrant early adopter full of ideas and curiosity. Leaning forward, eyes reflecting light and possibility. Enthusiastic about discovery.',
    imagePath: '/archetypes/oracle.png',
    isUnlocked: false
  },
  {
    id: 'diplomat',
    name: 'The Diplomat',
    tagline: 'Relationship above all else',
    description: 'Trust-first buyer with elegant empathy. Conflict dissolves around them. Values long-term partnerships and genuine connection.',
    imagePath: '/archetypes/diplomat.png',
    isUnlocked: false
  },
  {
    id: 'survivalist',
    name: 'The Survivalist',
    tagline: 'Rising from chaos, overwhelmed but fighting',
    description: 'Busy, stressed, juggling too much with tired eyes. Desperate for help but skeptical of promises. Needs quick wins and simplicity above all.',
    imagePath: '/archetypes/jester.png',
    isUnlocked: false
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    tagline: 'Sees the board, plans three moves ahead',
    description: 'Poised and calculating with eyes scanning the distance. Thinks long-term and values strategic alignment. Confident without arrogance.',
    imagePath: '/archetypes/warrior.png',
    isUnlocked: false
  }
];

interface ArchetypeSelectionSectionProps {
  onOpenEmailModal?: () => void;
}

const ArchetypeSelectionSection: React.FC<ArchetypeSelectionSectionProps> = ({ onOpenEmailModal }) => {
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [visibleCards, setVisibleCards] = useState(0);
  const [showScenarioBanner, setShowScenarioBanner] = useState(true);
  const [startCardAnimation, setStartCardAnimation] = useState(false);
  const [showAllArchetypes, setShowAllArchetypes] = useState(false);
  const navigate = useNavigate();

  const handleArchetypeClick = (archetype: Archetype) => {
    if (!archetype.isUnlocked) {
      return;
    }
    setSelectedArchetype(archetype);
    setVisibleCards(0); // Reset card visibility
  };

  const handleClose = () => {
    setSelectedArchetype(null);
    setIsCallStarting(false);
    setVisibleCards(0);
  };
  
  const handleSkipAnimation = () => {
    if (selectedArchetype?.id === 'charmer' && visibleCards < 2) {
      setVisibleCards(visibleCards + 1);
    }
  };

  const handleStartCall = () => {
    if (!selectedArchetype) return;
    
    setIsCallStarting(true);
    console.log('Starting call with archetype:', selectedArchetype.id);
    
    // Special handling for charmer - navigate to Marcus demo with autoStart
    if (selectedArchetype.id === 'charmer') {
      navigate('/demo/marcus?autoStart=true');
      return;
    }
    
    // Navigate to demo session with archetype ID as query parameter
    navigate(`/demo/session?archetype=${selectedArchetype.id}`);
  };

  // Automatic card reveal for Marcus (charmer) - only after scenario dismissal
  useEffect(() => {
    if (selectedArchetype?.id === 'charmer' && startCardAnimation) {
      const timers: NodeJS.Timeout[] = [];
      
      // Card 1 appears after 2.5s
      if (visibleCards < 1) {
        timers.push(setTimeout(() => setVisibleCards(1), 2500));
      }
      // Card 2 appears after 0.7s more (3.2s total)
      if (visibleCards < 2) {
        timers.push(setTimeout(() => setVisibleCards(2), 3200));
      }
      
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [selectedArchetype, visibleCards, startCardAnimation]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (selectedArchetype) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedArchetype]);

  // Auto-collapse when user scrolls past the section
  useEffect(() => {
    const handleScroll = () => {
      const section = document.getElementById('archetype-section');
      if (!section || !showAllArchetypes) return;

      const rect = section.getBoundingClientRect();
      const sectionBottom = rect.bottom;
      const viewportHeight = window.innerHeight;

      // If section has scrolled past viewport (bottom is above top of viewport)
      if (sectionBottom < 0) {
        setShowAllArchetypes(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAllArchetypes]);

  return (
    <section id="archetype-section" className="py-16 sm:py-20 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Pick Your Prospect
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            11 different personalities. Some skeptical. Some rushed. Some cheap. Each one tests you differently.
          </p>
          <p className="text-sm text-pitchiq-red font-semibold">
            (Demo coming very soon)
          </p>
        </div>

        {/* Archetype Grid - Mobile: Show top row + partial second row with fog of war */}
        <div className="relative">
          {/* Grid Container */}
          <div className={`
            grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6
            relative
            ${!showAllArchetypes ? 'md:max-h-none overflow-hidden' : ''}
          `}
          style={!showAllArchetypes ? { maxHeight: '320px' } : {}}
          >
            {ARCHETYPES.map((archetype) => (
              <div
                key={archetype.id}
                onClick={() => handleArchetypeClick(archetype)}
                className={`
                  relative group cursor-pointer
                  bg-white rounded-xl sm:rounded-2xl overflow-hidden
                  border-2 transition-all duration-300
                  ${archetype.isUnlocked 
                    ? 'border-pitchiq-red hover:border-pitchiq-red/80 hover:shadow-2xl hover:scale-105' 
                    : 'border-gray-200 opacity-60 cursor-not-allowed'
                  }
                  ${selectedArchetype?.id === archetype.id ? 'ring-4 ring-pitchiq-red scale-105 shadow-2xl' : ''}
                `}
              >
                {/* Image */}
                <div className="aspect-square relative">
                  <img 
                    src={archetype.imagePath} 
                    alt={archetype.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Lock Overlay */}
                  {!archetype.isUnlocked && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <Lock className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                    </div>
                  )}

                  {/* Unlock Badge */}
                  {archetype.isUnlocked && (
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      DEMO
                    </div>
                  )}
                </div>

                {/* Name & Tagline */}
                <div className="p-2 sm:p-3 md:p-4">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg mb-1">
                    {archetype.name}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 hidden sm:block">
                    {archetype.tagline}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Fog of War Gradient - Only visible on mobile when collapsed */}
          {!showAllArchetypes && (
            <>
              <div className="
                md:hidden
                absolute bottom-0 left-0 right-0 h-48
                bg-gradient-to-t from-background from-50% via-background/99 via-70% to-transparent
                pointer-events-none
                z-0
              "></div>
              
              {/* Show More Link */}
              <div className="md:hidden flex justify-center pt-6 pb-8 relative z-10">
                <button
                  onClick={() => setShowAllArchetypes(true)}
                  className="flex items-center gap-1 text-gray-900 text-sm font-bold hover:text-gray-700 transition-colors"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  Show more
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Overlay */}
      {selectedArchetype && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={handleClose}
        />
      )}

      {/* Slide-out Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          w-full sm:w-[85%] md:w-[600px] lg:w-[700px]
          ${selectedArchetype ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {selectedArchetype && (
          <div className="h-full flex flex-col">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                {selectedArchetype.name}
              </h3>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6" onClick={handleSkipAnimation}>
              {selectedArchetype.id === 'charmer' ? (
                /* Marcus-specific layout */
                <>
                  {showScenarioBanner ? (
                    /* Floating Scenario Card */
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-center min-h-[400px]"
                    >
                      <div className="bg-white border-2 border-gray-900 rounded-3xl p-6 max-w-sm shadow-xl relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowScenarioBanner(false);
                            setStartCardAnimation(true);
                          }}
                          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
                          aria-label="Got it"
                        >
                          <X size={20} />
                        </button>
                        <div className="text-center mb-5">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">THE SCENARIO</h3>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed mb-5">
                          You and Marcus met at a networking event last week. He showed interest in your business. You're calling to follow up and tell him more.
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowScenarioBanner(false);
                            setStartCardAnimation(true);
                          }}
                          className="w-full bg-gray-900 text-white py-2.5 px-5 rounded-2xl font-semibold hover:bg-gray-800 transition-colors text-sm"
                        >
                          Got it
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="grid lg:grid-cols-[280px_1fr] gap-8"
                  >
                  {/* Left Column - Photo & Name */}
                  <div className="flex flex-col items-center lg:items-start">
                    <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-lg border-2 border-black mb-4">
                      <img 
                        src="/charmer-portrait.png" 
                        alt="Marcus Stindle - The Charmer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <h3 className="text-3xl font-bold text-gray-900 text-center lg:text-left mb-2">
                      Marcus Stindle
                    </h3>
                    <p className="text-gray-600 text-sm text-center lg:text-left max-w-xs">
                      <span className="font-semibold text-gray-900">Runs Stindle Consulting out of Portland.</span> Plays trumpet, drinks too much coffee, loves helping salespeople grow.
                    </p>
                  </div>

                  {/* Right Column - Bio Cards */}
                  <div className="flex flex-col justify-center space-y-4">
                    <motion.div 
                      className="bg-green-900/10 rounded-xl p-5 shadow-sm border-2 border-gray-300"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: visibleCards >= 1 ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-gray-700 text-base leading-relaxed">
                        Sales consultant and competitor. Knows every trick. Perfect prospect—if you can reach him.
                      </p>
                    </motion.div>

                    <motion.div 
                      className="bg-green-900/10 rounded-xl p-5 shadow-sm border-2 border-gray-300"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: visibleCards >= 2 ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-gray-700 text-base leading-relaxed">
                        Win him over, you're ready for the real world. Lose him, learn exactly why.
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
                  )}
                </>
              ) : (
                /* Generic archetype layout */
                <>
                  {/* Image */}
                  <div className="mb-6 max-w-xs">
                    <img 
                      src={selectedArchetype.imagePath} 
                      alt={selectedArchetype.name}
                      className="w-full rounded-xl shadow-lg"
                    />
                  </div>

                  {/* Tagline */}
                  <p className="text-pitchiq-red font-semibold text-lg sm:text-xl mb-4">
                    {selectedArchetype.tagline}
                  </p>

                  {/* Description */}
                  <p className="text-gray-700 leading-relaxed text-base sm:text-lg mb-6">
                    {selectedArchetype.description}
                  </p>

                  {/* Additional Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">What You'll Practice:</h4>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• Handling objections under pressure</li>
                      <li>• Building rapport with skeptical buyers</li>
                      <li>• Demonstrating value clearly and quickly</li>
                      <li>• Staying composed when challenged</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Footer with CTA - Only show after scenario dismissal for charmer */}
            {!(selectedArchetype.id === 'charmer' && showScenarioBanner) && (
              <div className="border-t border-gray-200 p-4 sm:p-6 bg-white">
                <Button
                  onClick={handleStartCall}
                  disabled={isCallStarting}
                  size="lg"
                  className={`
                    w-full py-4 sm:py-6 text-base sm:text-lg
                    flex items-center justify-center gap-3
                    transition-all duration-300
                    ${selectedArchetype.id === 'charmer'
                      ? isCallStarting
                        ? 'bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-black text-black hover:bg-gray-50 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                      : isCallStarting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-pitchiq-red hover:bg-pitchiq-red/90 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    }
                  `}
                >
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                  {isCallStarting 
                    ? 'Starting Call...' 
                    : selectedArchetype.id === 'charmer' 
                      ? 'Start Call with Marcus' 
                      : 'Start Demo Call'
                  }
                </Button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  {selectedArchetype.id === 'charmer' 
                    ? '4-minute interactive training call' 
                    : 'Free demo • No credit card required'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ArchetypeSelectionSection;
