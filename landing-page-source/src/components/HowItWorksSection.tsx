
import React from "react";
import { Button } from "@/components/ui/button";

const StepCard = ({ number, title, description, delay }: { number: number, title: string, description: string, delay: string }) => {
  return (
    <div className="animate-slide-in" style={{ animationDelay: delay }}>
      <div className="flex items-start gap-5">
        <div className="w-10 h-10 rounded-full bg-pitchiq-purple flex items-center justify-center text-white font-bold flex-shrink-0">
          {number}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-foreground/70">{description}</p>
        </div>
      </div>
    </div>
  );
};

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-16 md:py-24 px-6 md:px-10 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How PitchIQ Works</h2>
              <p className="text-lg text-foreground/70">
                Our AI-powered platform makes it easy to improve your sales skills through practice and feedback.
              </p>
            </div>
            
            <div className="space-y-12">
              <StepCard 
                number={1} 
                title="Choose Your Scenario" 
                description="Select from dozens of industry-specific scenarios or create custom challenges based on your sales needs."
                delay="0.1s"
              />
              <StepCard 
                number={2} 
                title="Practice With AI" 
                description="Engage in a realistic conversation with our AI buyer that adapts to your responses and challenges you."
                delay="0.3s"
              />
              <StepCard 
                number={3} 
                title="Receive Feedback" 
                description="Get detailed analysis of your performance with actionable tips for improvement after each session."
                delay="0.5s"
              />
              <StepCard 
                number={4} 
                title="Track Progress" 
                description="Monitor your improvement over time with detailed metrics and skill development analytics."
                delay="0.7s"
              />
            </div>
            
            <div className="mt-12">
              <Button size="lg" className="btn-hover-effect">Start Practicing Now</Button>
            </div>
          </div>
          
          <div className="bg-pitchiq-gray-light rounded-2xl p-8 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-pitchiq-purple p-4">
                <h3 className="text-white font-medium">Software Demo Scenario</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-pitchiq-purple flex items-center justify-center text-white font-bold flex-shrink-0">AI</div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-sm">I'm interested in your CRM software, but I'm worried about the implementation time. How long does it typically take to get up and running?</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">You</span>
                    </div>
                    <div className="bg-pitchiq-purple/10 rounded-lg p-3">
                      <p className="text-sm">That's a great question. Our implementation typically takes 2-4 weeks, but we have an express option that can get you operational within 7 days if needed. How soon are you looking to have the system in place?</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-pitchiq-purple flex items-center justify-center text-white font-bold flex-shrink-0">AI</div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-sm">We're hoping to be operational within 2 weeks. What resources would we need to dedicate from our side?</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm">Hint</Button>
                    <Button size="sm">Respond</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
