import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, Rocket, Mail, ArrowRight, DollarSign, Globe, Zap, Code, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import ContactModal from "@/components/ContactModal"; // Adjusted path assuming ContactModal is in @/components
import Navbar from "@/components/Navbar"; // Import Navbar

const InvestmentOpportunityPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isStoryExpanded, setIsStoryExpanded] = useState(false); // State for story expansion

  return (
    <>
      <Navbar preRelease={false} /> {/* Ensure preRelease is false for correct nav behavior */}
      <section id="funding" className="pt-24 md:pt-28 lg:pt-32 pb-12 md:pb-16 lg:pb-20 bg-gradient-to-br from-pitchiq-red/5 via-white to-pitchiq-red/10">
        {/* Adjusted pt (padding-top) on the section to account for fixed navbar height if necessary */}
        {/* The original py-16 md:py-20 lg:py-24 might be too much if navbar takes space, or it might be fine, needs testing */}
        {/* For now, keeping original section padding but noting it might need adjustment for navbar overlap */}
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
              Join Me in Building the Future of Sales Training
            </h2>
            
            <p className="text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto">
              I've built a sophisticated AI platform single-handedly in 5 months. Now I'm seeking strategic partners 
              to help me scale this solution and build our first world-class team together.
            </p>
          </div>

          {/* Founder Section - Integrated from AboutUsSection - Now Collapsible */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl md:rounded-2xl p-6 md:p-8 lg:p-12 border border-gray-200 shadow-lg mx-2 md:mx-0 mb-12 md:mb-16">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-2">
                  <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">My Story: The Drive Behind PitchIQ</h3>
                  </div>
                  {/* Desktop: Always visible image/details on right, story on left */}
                  {/* Mobile/Tablet: Story text collapsible */} 
                  <div className={`space-y-4 text-sm md:text-base lg:text-lg text-foreground/80 transition-all duration-500 ease-in-out overflow-hidden ${isStoryExpanded || window.innerWidth >= 1024 ? 'max-h-screen opacity-100' : 'max-h-20 opacity-70 lg:max-h-screen lg:opacity-100'}`}>
                    <p>
                      I completed over 100 roleplays during COVID and discovered they only taught me one thing: how to talk to people. 
                      The scenarios felt artificial, feedback was inconsistent, and scheduling was a nightmare.
                    </p>
                    { (isStoryExpanded || window.innerWidth >= 1024) && (
                      <>
                        <p>
                          Instead of accepting broken training, I taught myself to code and built PitchIQ—the solution I wished existed. 
                          In just 5 months, working solo, I created this sophisticated AI platform that delivers realistic practice without the scheduling headaches.
                        </p>
                        <p>
                          This isn't just another startup idea for me. I lived the problem, built the solution single-handedly, 
                          and am now ready to scale with the right partners.
                        </p>
                      </>
                    )}
                  </div>
                  <Button 
                    variant="link" 
                    onClick={() => setIsStoryExpanded(!isStoryExpanded)} 
                    className={`mt-3 text-pitchiq-red hover:text-pitchiq-red/80 px-0 ${window.innerWidth >= 1024 ? 'lg:hidden' : ''}`}
                  >
                    {isStoryExpanded ? "Show Less" : "Read Full Story"}
                    {isStoryExpanded ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                  </Button>
                </div>
                
                <div className="lg:col-span-1 text-center lg:text-left mt-6 lg:mt-0">
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
                    {/* Left part: Icon, Name, Title */}
                    <div className="flex-shrink-0 text-center lg:text-left">
                      <div className="bg-pitchiq-red/10 w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-4">
                        <Code className="h-12 w-12 md:h-16 md:h-16 text-pitchiq-red" />
                      </div>
                      <h4 className="text-lg md:text-xl font-semibold mb-1 text-gray-800">Cason Lamothe</h4>
                      <p className="text-sm md:text-base text-pitchiq-red font-medium mb-2 lg:mb-0">Solo Founder & Developer</p>
                    </div>
                    {/* Right part: Small points (checklist) */}
                    <div className="text-xs md:text-sm text-foreground/60 space-y-1 mt-2 lg:mt-0 lg:pl-4">
                      <p className="flex items-center"><CheckCircle size={14} className="text-green-500 mr-1.5 flex-shrink-0" /> 100+ roleplays completed</p>
                      <p className="flex items-center"><CheckCircle size={14} className="text-green-500 mr-1.5 flex-shrink-0" /> Self-taught coding</p>
                      <p className="flex items-center"><CheckCircle size={14} className="text-green-500 mr-1.5 flex-shrink-0" /> Built in 5 months solo</p>
                      <p className="flex items-center"><CheckCircle size={14} className="text-green-500 mr-1.5 flex-shrink-0" /> Zero burn rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                Traditional methods are ripe for AI disruption.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">The Core Problems We Address</h3>
              <p className="text-foreground/70 mb-4">
                I saw firsthand how ineffective traditional roleplays are—they're a significant time drain for managers and reps alike, and often fail to deliver consistent results. Individuals frequently lack access to streamlined, impactful sales training. This challenge is magnified by the steep costs associated with hiring and onboarding new sales talent, which translates to wasted resources, financial loss, and critical missed opportunities.
              </p>
              <p className="text-sm text-foreground/60">
                PitchIQ is engineered to tackle these critical pain points head-on.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="bg-pitchiq-red/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Zap className="h-8 w-8 text-pitchiq-red" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">My AI-First Solution</h3>
              <p className="text-foreground/70 mb-4">
                I designed PitchIQ to offer hyper-personalized training that scales infinitely, delivers instant feedback, and adapts to each user's unique context.
              </p>
              <p className="text-sm text-foreground/60">
                Because I lived the problem, I built the solution I needed.
              </p>
            </div>
          </div>

          {/* Traction & Use of Funds - This section now has some redundancy with the above, consider merging or refining */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
            
            {/* Early Traction / My Achievements */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border border-gray-200">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">My Achievements So Far</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-pitchiq-red/10 w-12 h-12 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-pitchiq-red" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Growing Organic Waitlist</p>
                    <p className="text-sm text-foreground/70">Early access signups from sales professionals across industries - achieved with zero marketing spend.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/10 w-12 h-12 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Built Solo in 5 Months</p>
                    <p className="text-sm text-foreground/70">I developed this sophisticated AI platform single-handedly, driven by my personal experience of the problem.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="bg-green-500/10 w-12 h-12 rounded-full flex items-center justify-center">
                    <Rocket className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Lean & Efficient</p>
                    <p className="text-sm text-foreground/70">Zero burn rate so far - maximizing runway for scaling with our future investment.</p>
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
                  <p className="text-sm text-foreground/70">To bring on a senior AI engineer, a sales expert, and a customer success lead.</p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">Product Development</span>
                    <span className="text-pitchiq-red font-bold">35%</span>
                  </div>
                  <p className="text-sm text-foreground/70">For advanced AI features, crucial integrations, and developing a mobile app.</p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">Market Penetration</span>
                    <span className="text-pitchiq-red font-bold">20%</span>
                  </div>
                  <p className="text-sm text-foreground/70">To fuel our sales, marketing efforts, and establish strategic partnerships.</p>
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

export default InvestmentOpportunityPage; 