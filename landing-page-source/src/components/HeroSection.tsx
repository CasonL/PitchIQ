import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  
  const startDemo = () => {
    // Navigate to Marcus demo (adjust path based on your routing)
    window.location.href = '/charmer'; // or navigate('/charmer') if using client-side routing
  };
  
  return (
    <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-10 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Copy */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-red-600">
              Stop Guessing, Start Closing.
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8">
              Practice with Marcus. Master real sales conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button 
                size="lg" 
                onClick={startDemo}
                className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg px-8 btn-hover-effect shadow-lg"
              >
                Try Free Demo
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-pitchiq-red text-pitchiq-red hover:bg-pitchiq-red/10 text-lg px-8"
              >
                Get Started Free
              </Button>
            </div>
          </div>
          
          {/* Right side - Marcus Portrait (clickable demo) */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative group">
              <button
                onClick={startDemo}
                className="relative transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pitchiq-red/50 rounded-3xl"
                aria-label="Start demo with Marcus"
              >
                <img 
                  src="/charmer-portrait.png" 
                  alt="Marcus - Your AI Sales Prospect"
                  className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-3xl shadow-2xl border-4 border-black object-cover"
                />
                
                {/* Hover overlay with play indicator */}
                <div className="absolute inset-0 bg-pitchiq-red/0 group-hover:bg-pitchiq-red/20 rounded-3xl transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-full p-6 shadow-xl">
                    <svg className="w-12 h-12 text-pitchiq-red" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </button>
              
              {/* Marcus label */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-2 rounded-full font-bold whitespace-nowrap shadow-lg">
                Meet Marcus
              </div>
              
              {/* Animated pulse ring */}
              <div className="absolute inset-0 rounded-3xl border-4 border-pitchiq-red animate-pulse opacity-50 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
