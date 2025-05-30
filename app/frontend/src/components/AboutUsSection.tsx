import React from "react";
import { Target, Lightbulb, TrendingUp, XCircle, Clock, Zap, Code, ArrowRight } from "lucide-react";
import { Link } from 'react-router-dom';

const AboutUsSection = () => {
  return (
    <section id="about-us" className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 xl:px-20">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            About <span className="font-outfit">Pitch</span><span className="font-saira font-medium text-pitchiq-red">IQ</span>
          </h2>
          <p className="text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto px-4">
            Built by a solo founder who experienced the pain of ineffective sales training firsthand, 
            then taught himself to code and created the solution he wished existed.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          <div className="text-center px-4">
            <div className="bg-pitchiq-red/10 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-6 w-6 md:h-8 md:w-8 text-pitchiq-red" />
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-2">The Problem</h3>
            <p className="text-sm md:text-base text-foreground/70">
              Current sales training is often broken: roleplays are a time-sink, individuals lack streamlined coaching, and costly onboarding drains resources.
            </p>
          </div>
          
          <div className="text-center px-4">
            <div className="bg-blue-500/10 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-2">The Insight</h3>
            <p className="text-sm md:text-base text-foreground/70">
              AI offers a breakthrough: hyper-realistic, scalable practice with instant feedback, available 24/7, saving valuable time and resources.
            </p>
          </div>
          
          <div className="text-center px-4">
            <div className="bg-green-500/10 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-2">The Solution</h3>
            <p className="text-sm md:text-base text-foreground/70">
              PitchIQ: Personalized AI coaching that streamlines training, makes practice effective, and accelerates ramp-up, maximizing ROI.
            </p>
          </div>
        </div>
        
        {/* Founder Section */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl md:rounded-2xl p-6 md:p-8 lg:p-12 border border-gray-200 shadow-lg mx-2 md:mx-0">
          <div className="max-w-4xl mx-auto">
            <div>
              <div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6 text-gray-800 text-center lg:text-left">Meet the Solo Founder</h3>
                <div className="space-y-4 text-sm md:text-base lg:text-lg text-foreground/80 mb-8 text-center lg:text-left">
                  <p>
                    Frustrated by ineffective sales roleplays, <strong>Cason Lamothe</strong> taught himself to code and single-handedly built PitchIQ in just 5 months—the AI-powered training solution he wished existed. This is a founder-led venture born from direct experience, ready to scale with the right partners.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 text-left">
                  {/* Insight 1 */}
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-pitchiq-red/30">
                    <div className="flex items-center mb-2">
                      <Zap className="w-6 h-6 text-yellow-500 mr-2 flex-shrink-0" />
                      <h4 className="font-semibold text-gray-700 text-sm md:text-base">0% Burn Rate</h4>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600">Efficient operations and capital management from day one.</p>
                  </div>
                  {/* Insight 2 */}
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-pitchiq-red/30">
                    <div className="flex items-center mb-2">
                      <TrendingUp className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" />
                      <h4 className="font-semibold text-gray-700 text-sm md:text-base">Large TAM</h4>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600">Tapping into the expansive SalesTech & EdTech markets.</p>
                  </div>
                  {/* Insight 3 */}
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-pitchiq-red/30">
                    <div className="flex items-center mb-2">
                      <Target className="w-6 h-6 text-red-500 mr-2 flex-shrink-0" />
                      <h4 className="font-semibold text-gray-700 text-sm md:text-base">Disruptive AI</h4>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600">Innovative AI poised to redefine industry standards.</p>
                  </div>
                </div>

                {/* Learn More CTA - Centered */}
                <div className="text-center"> 
                  <Link
                    to="/investment-opportunity"
                    className="inline-flex items-center bg-pitchiq-red hover:bg-pitchiq-red/90 text-white font-outfit font-semibold py-2.5 px-6 rounded-lg text-sm md:text-base transition duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    Learn More About Investment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUsSection; 