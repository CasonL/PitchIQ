import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Brain, TrendingUp, Users } from "lucide-react";

const HowItWorks = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-10 lg:px-20">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gradient">
            How PitchIQ Works
          </h1>
          <p className="text-xl md:text-2xl text-foreground/70 mb-8 max-w-3xl mx-auto">
            Transform your sales performance with AI-powered coaching in just four simple steps
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 px-6 md:px-10 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Step 1 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pitchiq-purple to-pitchiq-red rounded-full flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
                1
              </div>
              <div className="mb-4">
                <Mic className="w-8 h-8 mx-auto text-pitchiq-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Record Your Pitch</h3>
              <p className="text-foreground/70">
                Practice your sales pitch using our voice recording feature. Speak naturally as you would with a real prospect.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pitchiq-purple to-pitchiq-red rounded-full flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
                2
              </div>
              <div className="mb-4">
                <Brain className="w-8 h-8 mx-auto text-pitchiq-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Analysis</h3>
              <p className="text-foreground/70">
                Our advanced AI analyzes your tone, pace, confidence level, and messaging effectiveness in real-time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pitchiq-purple to-pitchiq-red rounded-full flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="mb-4">
                <TrendingUp className="w-8 h-8 mx-auto text-pitchiq-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Get Instant Feedback</h3>
              <p className="text-foreground/70">
                Receive detailed insights and personalized recommendations to improve your delivery and messaging.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pitchiq-purple to-pitchiq-red rounded-full flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
                4
              </div>
              <div className="mb-4">
                <Users className="w-8 h-8 mx-auto text-pitchiq-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Close More Deals</h3>
              <p className="text-foreground/70">
                Apply your improved skills in real sales situations and watch your conversion rates soar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Process Section */}
      <section className="py-16 px-6 md:px-10 lg:px-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gradient">
            The Science Behind PitchIQ
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Advanced Voice Analysis</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <ArrowRight className="w-5 h-5 text-pitchiq-purple mt-1 mr-3" />
                  <span><strong>Tone Analysis:</strong> Detect confidence, enthusiasm, and persuasiveness in your voice</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="w-5 h-5 text-pitchiq-purple mt-1 mr-3" />
                  <span><strong>Pace Detection:</strong> Ensure optimal speaking speed for maximum impact</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="w-5 h-5 text-pitchiq-purple mt-1 mr-3" />
                  <span><strong>Filler Word Tracking:</strong> Identify and reduce "ums," "ahs," and other distractors</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="w-5 h-5 text-pitchiq-purple mt-1 mr-3" />
                  <span><strong>Emotional Intelligence:</strong> Gauge emotional resonance and authenticity</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold mb-6">Personalized Coaching</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <ArrowRight className="w-5 h-5 text-pitchiq-purple mt-1 mr-3" />
                  <span><strong>Industry-Specific Training:</strong> Tailored feedback for your specific market</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="w-5 h-5 text-pitchiq-purple mt-1 mr-3" />
                  <span><strong>Role-Based Scenarios:</strong> Practice for different sales situations</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="w-5 h-5 text-pitchiq-purple mt-1 mr-3" />
                  <span><strong>Progress Tracking:</strong> Monitor improvement over time with detailed analytics</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="w-5 h-5 text-pitchiq-purple mt-1 mr-3" />
                  <span><strong>Competitive Benchmarking:</strong> See how you stack up against top performers</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 md:px-10 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gradient">
            Ready to Transform Your Sales Performance?
          </h2>
          <p className="text-xl text-foreground/70 mb-8">
            Join thousands of sales professionals who are already closing more deals with PitchIQ
          </p>
          <Button size="lg" className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg px-8 btn-hover-effect">
            Get Started Free
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorks; 