import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, Rocket, Mail, ArrowRight, DollarSign, Globe, Zap } from "lucide-react";
import ContactModal from "./ContactModal";

const FundingSection = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <>
    <section id="funding" className="py-16 md:py-20 lg:py-24 bg-gradient-to-br from-pitchiq-red/5 via-white to-pitchiq-red/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 xl:px-20">
        
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-pitchiq-red/10 px-6 py-3 rounded-full border border-pitchiq-red/20">
              <Rocket className="w-6 h-6 text-pitchiq-red" />
              <span className="text-lg font-semibold text-pitchiq-red">Investment Opportunity</span>
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-gray-800">
            Join a Solo Founder Building the Future of Sales Training
          </h2>
          
          <p className="text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto">
            I've built a sophisticated AI platform single-handedly in 5 months. Now I'm seeking strategic partners 
            to help me scale this solution and build our first world-class team together.
          </p>
        </div>

        {/* Market Opportunity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 mb-16">
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
            <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Globe className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">$366B Market</h3>
            <p className="text-foreground/70 mb-4">
              Global corporate training market, with sales training representing a significant and growing segment.
            </p>
            <p className="text-sm text-foreground/60">
              Traditional methods are ripe for AI disruption
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
            <div className="bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">Proven Problem</h3>
            <p className="text-foreground/70 mb-4">
              Sales teams waste countless hours on ineffective roleplays while struggling to retain talent who demand modern training.
            </p>
            <p className="text-sm text-foreground/60">
              We've experienced this pain firsthand
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
            <div className="bg-pitchiq-red/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Zap className="h-8 w-8 text-pitchiq-red" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">AI-First Solution</h3>
            <p className="text-foreground/70 mb-4">
              Hyper-personalized training that scales infinitely, delivers instant feedback, and adapts to each user's unique context.
            </p>
            <p className="text-sm text-foreground/60">
              Built by someone who lived the problem
            </p>
          </div>
        </div>

        {/* Traction & Use of Funds */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
          
          {/* Early Traction */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border border-gray-200">
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Solo Founder Achievement</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-pitchiq-red/10 w-12 h-12 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-pitchiq-red" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Growing Waitlist</p>
                  <p className="text-sm text-foreground/70">Early access signups from sales professionals across industries - all organic growth</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/10 w-12 h-12 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Built Solo in 5 Months</p>
                  <p className="text-sm text-foreground/70">Sophisticated AI platform developed single-handedly from personal pain points</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="bg-green-500/10 w-12 h-12 rounded-full flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Lean & Efficient</p>
                  <p className="text-sm text-foreground/70">Zero burn rate so far - maximum runway for scaling with investment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Use of Funds */}
          <div className="bg-gradient-to-br from-pitchiq-red/5 to-pitchiq-red/10 rounded-xl p-8 border border-pitchiq-red/20">
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Building Our First Team</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">Core Team Hiring</span>
                  <span className="text-pitchiq-red font-bold">45%</span>
                </div>
                <p className="text-sm text-foreground/70">Senior AI engineer, sales expert, customer success lead</p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">Product Development</span>
                  <span className="text-pitchiq-red font-bold">35%</span>
                </div>
                <p className="text-sm text-foreground/70">Advanced AI features, integrations, mobile app</p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">Market Penetration</span>
                  <span className="text-pitchiq-red font-bold">20%</span>
                </div>
                <p className="text-sm text-foreground/70">Sales, marketing, strategic partnerships</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-gray-100">
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
            Ready to Transform Sales Training Together?
          </h3>
          <p className="text-lg text-foreground/70 mb-8 max-w-2xl mx-auto">
            Join us in building the future of sales training. Whether you're an investor, advisor, or strategic partner, 
            we'd love to explore how we can work together.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg px-8 py-4"
              onClick={() => setIsContactModalOpen(true)}
            >
              <Mail className="h-5 w-5 mr-2" />
              Get in Touch
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-4 border-pitchiq-red text-pitchiq-red hover:bg-pitchiq-red/5"
              onClick={() => setIsContactModalOpen(true)}
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Investment Inquiry
            </Button>
          </div>
        </div>
      </div>
    </section>

    {/* Contact Modal */}
    <ContactModal 
      isOpen={isContactModalOpen} 
      onClose={() => setIsContactModalOpen(false)} 
    />
    </>
  );
};

export default FundingSection; 