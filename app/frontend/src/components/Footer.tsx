import React, { useState, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Users, Mail, Clock, ArrowUpCircle, Shield, Building, Headphones } from "lucide-react";
import ContactModal from "./ContactModal";

// Define props for Footer to accept the ref
interface FooterProps {
  emailSignupAnchorRef?: RefObject<HTMLDivElement>; // Optional for now, in case Footer is used elsewhere
}

const Footer = ({ emailSignupAnchorRef }: FooterProps) => {
  const [showContactModal, setShowContactModal] = useState(false);

  const handleScrollToSignup = () => {
    if (emailSignupAnchorRef?.current) {
      console.log('[Footer] Scrolling to emailSignupAnchorRef...');
      emailSignupAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn('[Footer] emailSignupAnchorRef.current is null or not provided.');
    }
  };

  return (
    <>
    <footer className="py-12 md:py-16 px-4 sm:px-6 md:px-10 lg:px-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Enterprise Demo CTA */}
        {emailSignupAnchorRef && (
          <div className="mb-10 text-center">
            <Button 
              onClick={handleScrollToSignup}
              variant="secondary" 
              size="lg"
              className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-base px-6 py-3 sm:text-lg sm:px-8 sm:py-4"
            >
              <Building className="mr-2 h-5 w-5" />
              Schedule Enterprise Demo
            </Button>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Section 1: Brand and Enterprise Value Prop */}
          <div className="text-center md:text-left col-span-1 md:col-span-1">
            <div className="text-2xl sm:text-3xl mb-4 md:mb-6 flex justify-center md:justify-start">
              <span className="font-outfit font-bold text-white">Pitch</span><span className="font-saira font-medium text-pitchiq-red">IQ</span>
            </div>
            <p className="text-sm sm:text-base text-white/70 mb-4 md:mb-6">
              Enterprise-grade AI sales training platform delivering measurable ROI and compliance-ready performance tracking.
            </p>
            <p className="text-xs sm:text-sm text-white/50">
              Trusted by sales organizations worldwide for scalable, secure, and effective sales enablement.
            </p>
          </div>

          {/* Section 2: Enterprise Solutions */}
          <div className="text-center md:text-left col-span-1 md:col-span-1">
            <h3 className="font-semibold mb-3 text-base sm:text-lg md:mb-4">Enterprise Solutions</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">Scalable Training Platform</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Advanced Analytics & ROI</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Compliance Management</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Custom Integrations</a></li>
              <li><a href="#" className="hover:text-white transition-colors">White-label Solutions</a></li>
            </ul>
          </div>

          {/* Section 3: Security & Privacy */}
          <div className="text-center md:text-left col-span-1 md:col-span-1">
            <h3 className="font-semibold mb-3 text-base sm:text-lg md:mb-4">Security & Privacy</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-white/70">
              <li><a href="#" className="hover:text-white transition-colors flex items-center justify-center md:justify-start">
                <Shield className="mr-2 h-4 w-4" />Enterprise Security Standards</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Data Protection & Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Secure Cloud Infrastructure</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security Best Practices</a></li>
            </ul>
          </div>
          
          {/* Section 4: Enterprise Support */}
          <div className="text-center md:text-left col-span-1 md:col-span-1">
            <h3 className="font-semibold mb-3 text-base sm:text-lg md:mb-4">Enterprise Support</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowContactModal(true)}
                className="text-pitchiq-red hover:text-pitchiq-red/80 text-xs sm:text-sm transition-colors font-medium flex items-center justify-center md:justify-start"
              >
                <Headphones className="mr-2 h-4 w-4" />
                Dedicated Account Manager
              </button>
              <p className="text-white/70 text-xs sm:text-sm">24/7 Enterprise Support</p>
              <p className="text-white/70 text-xs sm:text-sm">Custom Implementation</p>
              <p className="text-white/70 text-xs sm:text-sm">Training & Onboarding</p>
              <div className="flex space-x-4 justify-center md:justify-start mt-4">
                <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="LinkedIn">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Twitter">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/20 mt-10 pt-6 md:mt-12 md:pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-white/70 text-xs sm:text-sm mb-1">
              &copy; 2025 <span className="font-outfit">Pitch</span><span className="font-saira font-medium text-pitchiq-red">IQ</span>. All rights reserved.
            </p>
            <p className="text-white/50 text-xs">
              Enterprise-grade sales training platform
            </p>
          </div>
          <div className="flex space-x-6 text-xs text-white/60">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>

    {/* Contact Modal */}
    <ContactModal 
      isOpen={showContactModal} 
      onClose={() => setShowContactModal(false)} 
    />
    </>
  );
};

export default Footer;
