import React from "react";
import { Users, Target, Lightbulb, TrendingUp, XCircle, Clock, Zap, Code } from "lucide-react";

const AboutUsSection = () => {
  return (
    <section id="about-us" className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 xl:px-20">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">About PitchIQ</h2>
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
              Traditional roleplays are ineffective, tedious to schedule, and waste everyone's time.
            </p>
          </div>
          
          <div className="text-center px-4">
            <div className="bg-blue-500/10 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-2">The Insight</h3>
            <p className="text-sm md:text-base text-foreground/70">
              AI can deliver hyper-realistic scenarios with instant feedback, scaling infinitely.
            </p>
          </div>
          
          <div className="text-center px-4">
            <div className="bg-green-500/10 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-2">The Solution</h3>
            <p className="text-sm md:text-base text-foreground/70">
              PitchIQ: Personalized AI training that actually prepares reps for real conversations.
            </p>
          </div>
        </div>
        
        {/* Founder Section */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl md:rounded-2xl p-6 md:p-8 lg:p-12 border border-gray-200 shadow-lg mx-2 md:mx-0">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-2">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6 text-gray-800">Meet the Solo Founder</h3>
                <div className="space-y-4 text-sm md:text-base lg:text-lg text-foreground/80">
                  <p>
                    <strong>Cason Lamothe</strong> completed over 100 roleplays during COVID and discovered they only taught him one thing: how to talk to people. 
                    The scenarios felt artificial, feedback was inconsistent, and scheduling was a nightmare.
                  </p>
                  <p>
                    Instead of accepting broken training, Cason taught himself to code and built PitchIQ—the solution he wished existed. 
                    <strong> In just 5 months, working solo, he created a sophisticated AI platform</strong> that delivers realistic practice without the scheduling headaches.
                  </p>
                  <p>
                    This isn't just another startup idea. It's a founder who lived the problem, built the solution single-handedly, 
                    and is now ready to scale with the right partners.
                  </p>
                </div>
              </div>
              
              <div className="lg:col-span-1 text-center lg:text-left">
                <div className="bg-pitchiq-red/10 w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-4">
                  <Code className="h-12 w-12 md:h-16 md:w-16 text-pitchiq-red" />
                </div>
                <h4 className="text-lg md:text-xl font-semibold mb-2 text-gray-800">Cason Lamothe</h4>
                <p className="text-sm md:text-base text-pitchiq-red font-medium mb-2">Solo Founder & Developer</p>
                <div className="text-xs md:text-sm text-foreground/60 space-y-1">
                  <p>✓ 100+ roleplays completed</p>
                  <p>✓ Self-taught coding</p>
                  <p>✓ Built in 5 months solo</p>
                  <p>✓ Zero burn rate</p>
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