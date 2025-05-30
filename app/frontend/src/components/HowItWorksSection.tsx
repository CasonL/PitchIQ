import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, Users, Brain, Lightbulb, BarChart3, Sparkles, Target, ArrowRight, ArrowDown, MessageSquare, Play, ClipboardList, Award, TrendingUp, Repeat, ArrowDownRight, ArrowDownLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthContext } from "@/context/AuthContext";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const setupSteps = [
  {
    icon: <Brain size={24} className="text-pitchiq-red" />,
    number: "01",
    title: "Your Offer",
    description: "What you sell + core value",
    delay: "0.1s"
  },
  {
    icon: <Users size={24} className="text-pitchiq-red" />,
    number: "02", 
    title: "Target Audience",
    description: "Who buys from you",
    delay: "0.2s"
  },
  {
    icon: <BarChart3 size={24} className="text-pitchiq-red" />,
    number: "03",
    title: "Sales Context",
    description: "Your cycle + environment",
    delay: "0.3s"
  },
  {
    icon: <Target size={24} className="text-pitchiq-red" />,
    number: "04",
    title: "Methodology",
    description: "Your sales approach",
    delay: "0.4s"
  },
  {
    icon: <Lightbulb size={24} className="text-pitchiq-red" />,
    number: "05",
    title: "Focus Area",
    description: "What to improve",
    delay: "0.5s"
  },
];

// New steps for Part 2: The PitchIQ Improvement Loop
const improvementLoopSteps = [
  {
    icon: <Brain size={36} className="text-blue-600" />,
    title: "Practice with Smart AI Buyers",
    description: "Engage in voice conversations with AI personas that think, adapt, and react like real prospects, complete with unique personalities, needs, and objections.",
  },
  {
    icon: <MessageSquare size={36} className="text-blue-600" />,
    title: "Realistic Sales Scenarios",
    description: "Navigate dynamic roleplays that mirror your actual sales calls, from initial rapport building to closing the deal. The AI lets you lead.",
  },
  {
    icon: <ClipboardList size={36} className="text-blue-600" />,
    title: "Get Expert AI Coaching",
    description: "After each session, receive detailed feedback on your performance—strengths, weaknesses, skill scores, and actionable tips from your AI Sales Coach.",
  },
  {
    icon: <TrendingUp size={36} className="text-blue-600" />,
    title: "See Your Skills Grow",
    description: "Monitor your improvement on your personal dashboard, track key metrics, and identify areas for focused practice.",
  },
];

const HowItWorksSection = () => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const scrollPrev = React.useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect); // Handle reinitialization
    onSelect(); // Set initial state
    return () => { 
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  const scrollTo = (index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  };

  return (
    <section id="how-it-works" className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24 lg:py-32 px-4 md:px-6 lg:px-10 xl:px-20 overflow-hidden sm:overflow-visible">
      <div className="max-w-7xl mx-auto">
        {/* Main Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">How PitchIQ Hones Your Sales Skills</h2>
          <p className="text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto">
            From quick personalization to continuous improvement, here's your path to sales mastery.
          </p>
        </div>

        {/* --- PART 1: Personalize Your Training Ground --- */}
        <div className="mb-16 md:mb-24">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-pitchiq-red/10 text-pitchiq-red px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium mb-4">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
              Step 1: Quick AI-Powered Setup
            </div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-gray-800">5 Questions. Infinite Possibilities.</h3>
            <p className="text-base md:text-lg text-foreground/70 max-w-2xl mx-auto mb-3">
              Answer 5 key questions about your sales world. Our AI instantly gets to work.
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-pitchiq-red" />
              <span className="text-pitchiq-red font-medium text-xs md:text-sm">Approx. 8 minutes to complete</span>
            </div>
          </div>

          {/* Setup Steps Visual - Updated for Zig-Zag on mobile */}
          <div className="relative mb-10 md:mb-12">
            {/* Desktop/Tablet Layout: Grid */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-6">
              {setupSteps.map((step) => (
                <div key={step.number} className="relative text-center animate-fade-in group cursor-default" style={{ animationDelay: step.delay }}>
                  <div className="relative mx-auto mb-4 w-14 h-14 md:w-16 md:h-16 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-pitchiq-red/10 group-hover:bg-pitchiq-red/20 flex items-center justify-center transition-colors duration-300">
                      {step.icon}
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-pitchiq-red rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-base md:text-lg font-semibold mb-2 group-hover:text-pitchiq-red transition-colors duration-300">{step.title}</h3>
                  <p className="text-sm text-foreground/70 px-2">{step.description}</p>
                </div>
              ))}
            </div>

            {/* Mobile Layout: Simplified Zig-Zag List with Arrows */}
            <div className="sm:hidden space-y-24 relative pt-4 flex flex-col items-center">
              {setupSteps.map((step, index) => (
                <div 
                  key={step.number} 
                  className="relative flex flex-col items-center text-center animate-fade-in cursor-default w-full max-w-sm"
                  style={{ animationDelay: step.delay }}
                >
                  <div className="relative w-full">
                    <div className={`relative mb-2 w-12 h-12 group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                      <div className="w-full h-full rounded-full bg-pitchiq-red/10 group-hover:bg-pitchiq-red/20 flex items-center justify-center transition-colors duration-300">
                        {step.icon}
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-pitchiq-red rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {step.number}
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold mb-1 text-gray-800 group-hover:text-pitchiq-red transition-colors duration-300">{step.title}</h3>
                    <p className="text-xs text-gray-600">{step.description}</p>
                  </div>

                  {index < setupSteps.length - 1 && (
                    <div 
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-8 z-10"
                    >
                      {index % 2 === 0 // This condition is no longer relevant for icon type, but kept for structure if needed later. For now, always ArrowDown.
                        ? <div className="p-1 border border-gray-300 rounded-full"><ArrowDown className="h-6 w-6 text-gray-400" /></div>
                        : <div className="p-1 border border-gray-300 rounded-full"><ArrowDown className="h-6 w-6 text-gray-400" /></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Desktop Bracket Lines Visualization */}
          <div className="hidden sm:block relative h-24 md:h-32 mb-4 md:mb-6 pointer-events-none">
            {[0, 1, 2, 3, 4].map((index) => {
              const positions = ['10%', '30%', '50%', '70%', '90%'];
              return (
                <div
                  key={`vline-down-${index}`}
                  className="absolute top-0 w-0.5 bg-gray-300"
                  style={{ left: positions[index], height: '40%', transform: 'translateX(-50%)' }}
                ></div>
              );
            })}
            <div className="absolute w-[80%] h-0.5 bg-gray-300" style={{ top: '40%', left: '10%' }}></div>
            {[0, 1, 3, 4].map((index) => {
              const positions = ['10%', '30%', '70%', '90%'];
              return (
                <div
                  key={`joint-${index}`}
                  className="absolute w-2 h-2 bg-gray-300 rounded-full"
                  style={{ left: positions[index], top: 'calc(40% - 0.25rem)', transform: 'translateX(-50%)' }}
                ></div>
              );
            })}
            <div className="absolute w-0.5 bg-gray-300" style={{ top: '40%', left: '50%', height: '60%', transform: 'translateX(-50%)' }}></div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow duration-300 mx-2 md:mx-0">
            <div className="text-center">
              <Brain className="h-10 w-10 md:h-12 md:w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-bold mb-3 text-gray-800">AI Tailors Your Training</h3>
              <p className="text-sm md:text-base text-foreground/70 max-w-2xl mx-auto">
                PitchIQ's AI analyzes your unique sales DNA—your product, buyers, and challenges—to craft a hyper-realistic training environment and intelligent AI Buyer Personas just for you.
              </p>
            </div>
          </div>
        </div>

        {/* --- PART 2: The PitchIQ Improvement Loop --- */}
        <div>
          <div className="text-center mb-12 md:mb-16">
             <div className="inline-flex items-center gap-2 bg-blue-600/10 text-blue-700 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium mb-4">
              <Repeat className="h-3 w-3 md:h-4 md:w-4" />
              Step 2: The PitchIQ Improvement Loop
            </div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-gray-800">Practice, Get Coached, Master Your Pitch</h3>
            {/* Optional subtitle for Part 2 if needed */}
          </div>

          {/* Desktop Layout: Grid */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {improvementLoopSteps.map((step, index) => (
              <div 
                key={index} 
                className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center md:items-start 
                            ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} md:text-left`}
              >
                <div className={`flex-shrink-0 mb-4 md:mb-0 ${index % 2 === 0 ? 'md:mr-6' : 'md:ml-6'}`}>
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    {step.icon}
                  </div>
                </div>
                <div className={`${index % 2 === 0 ? '' : 'md:text-right'}`}>
                  <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-sm md:text-base text-foreground/70">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Layout: Carousel (Autoplay removed, Dots added) */}
          <div className="md:hidden relative pb-4 px-10">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {improvementLoopSteps.map((step, index) => (
                  <div key={index} className="flex-[0_0_100%] min-w-0 px-2 py-1">
                    <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center text-center h-full">
                      <div className="flex-shrink-0 mb-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                          {step.icon}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h4>
                        <p className="text-sm text-foreground/70">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel Navigation Arrows */}
            <button
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-3 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              aria-label="Previous slide"
            >
              <ChevronLeft size={28} className="text-gray-700" />
            </button>
            <button
              onClick={scrollNext}
              disabled={!canScrollNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-3 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              aria-label="Next slide"
            >
              <ChevronRight size={28} className="text-gray-700" />
            </button>

            {/* Dot Indicators for Mobile Carousel */}
            <div className="flex justify-center items-center space-x-2 pt-4">
              {improvementLoopSteps.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  onClick={() => scrollTo(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out
                    ${index === selectedIndex ? 'bg-blue-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorksSection;

