import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmailSignupModal from "@/components/EmailSignupModal";
import { Lightbulb, XCircle, Zap, Code2, Users, ArrowRight } from "lucide-react";

const AboutPage: React.FC = () => {
  const founderName = "Cason";
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const handleOpenEmailModal = () => {
    setIsEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar onOpenEmailModal={handleOpenEmailModal} preRelease={true} />
      <main className="flex-grow pt-20 md:pt-24">
        <section id="about-us-content" className="py-16 md:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 md:mb-20">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-outfit font-bold text-gray-900 leading-tight">
                The <span className="text-pitchiq-red">$10k</span> Sales Lesson:
                <br className="hidden sm:block" /> They Didn't Coach Me,
                <br className="hidden sm:block" /> So I Built <span className="text-pitchiq-red">Your</span> Coach.
              </h1>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 mb-16 md:mb-20">
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-lg overflow-hidden shadow-xl flex-shrink-0">
                <img 
                  src="/founder-cason-hoodie.jpg" 
                  alt={`${founderName}, Founder of PitchIQ`}
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="text-left md:max-w-2xl">
                <h2 className="text-2xl md:text-3xl font-outfit font-semibold text-gray-800 mb-4">
                  Hi, I'm {founderName}. PitchIQ was born from my own sales grind.
                </h2>
                <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                  I once invested $10,000 in a sales course, hoping to master the art of selling. Instead, I found generic advice and stalled progress. That expensive lesson wasn't a failure, though—it was a critical spark: traditional sales training was broken, and I wanted to fix it.
                </p>
              </div>
            </div>
            
            <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-pitchiq-red/10 mb-4">
                <Lightbulb className="h-8 w-8 text-pitchiq-red" />
              </div>
              <h3 className="text-2xl md:text-3xl font-outfit font-semibold text-gray-800 mb-3">The Breakthrough: Real Practice, Real Feedback</h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                The real gap wasn't effort—it was the *right kind* of practice. I realized that to truly improve, salespeople need a training ground that's always available, hyper-personalized, and offers immediate, actionable feedback. One-off roleplays or static courses just couldn't provide that.
              </p>
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-pitchiq-red/10 mb-4 mt-6">
                <Code2 className="h-8 w-8 text-pitchiq-red" />
              </div>
              <h3 className="text-2xl md:text-3xl font-outfit font-semibold text-gray-800 mb-3">Building the Coach I Wished Existed</h3>
              <p className="text-lg text-gray-700 leading-relaxed">
                Determined to bridge this gap, I taught myself to code. My mission became clear: to build the AI sales coach I wish I'd had—one that adapts, mentors, and genuinely accelerates growth. That's how PitchIQ was born.
              </p>
            </div>

            <div className="mb-12 md:mb-20 bg-gray-50 p-8 md:p-12 rounded-lg shadow">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-pitchiq-red/10 mb-4">
                    <Zap className="h-8 w-8 text-pitchiq-red" />
                </div>
                <h2 className="text-3xl md:text-4xl font-outfit font-bold text-gray-900">
                  My Struggle is Your Sales Advantage
                </h2>
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-4">
                PitchIQ isn't just another tool; it's the direct result of understanding what truly hinders sales progress. It's designed to help you bypass the frustrations I faced.
              </p>
              <ul className="space-y-3 text-lg text-gray-700 leading-relaxed">
                <li className="flex items-start">
                  <XCircle className="h-6 w-6 text-pitchiq-red mr-3 mt-1 flex-shrink-0" />
                  <span><strong>No More Vague Feedback:</strong> Get precise, AI-driven insights you can actually use.</span>
                </li>
                <li className="flex items-start">
                  <Users className="h-6 w-6 text-pitchiq-red mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Practice That Adapts to You:</strong> Engage in hyper-realistic scenarios tailored to your world, available 24/7.</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-6 w-6 text-pitchiq-red mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Accelerated Growth:</strong> Develop skills faster and sell with unshakable confidence.</span>
                </li>
              </ul>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mt-6">
                I built PitchIQ because every salesperson deserves a smarter, more effective way to master their craft.
              </p>
            </div>

            <div className="text-center pt-8 pb-4 md:pt-12 md:pb-8 border-t border-gray-200">
              <h2 className="text-2xl md:text-3xl font-outfit font-bold text-gray-900 mb-4">
                Ready to Experience the Future of Sales Coaching?
              </h2>
              <p className="text-lg text-gray-700 max-w-xl mx-auto mb-8 leading-relaxed">
                Be among the first to transform your approach with the coach designed from firsthand experience.
              </p>
              <button
                onClick={handleOpenEmailModal}
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pitchiq-red hover:bg-pitchiq-red/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pitchiq-red transition-colors duration-150 group"
              >
                Get Early Access & Transform Your Sales
                <ArrowRight className="ml-3 -mr-1 h-5 w-5 transform transition-transform duration-150 group-hover:translate-x-1" />
              </button>
               <p className="mt-4 text-sm text-gray-600">
                Join the waitlist for founder-only benefits.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <EmailSignupModal isOpen={isEmailModalOpen} onClose={handleCloseEmailModal} />
    </div>
  );
};

export default AboutPage; 