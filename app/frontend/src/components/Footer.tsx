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
    <footer className="py-12 md:py-16 px-4 sm:px-6 md:px-10 lg:px-20 bg-gray-900 text-white relative overflow-hidden">
      {/* Geometric Pattern - Bottom Left mirroring hero */}
      <div className="absolute bottom-0 left-0 w-[500px] h-[400px] opacity-15 pointer-events-none">
        <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMax meet">
          {/* Angular pattern mirrored - subtle complement to hero */}
          
          {/* Bottom horizontal lines turning up */}
          <path d="M 150 400 L 0 400 L 0 350 L 50 350" stroke="#DC2626" strokeWidth="2"/>
          <path d="M 0 320 L 80 320 L 80 280 L 120 280" stroke="#DC2626" strokeWidth="2"/>
          <path d="M 0 250 L 110 250 L 110 200 L 160 200" stroke="#DC2626" strokeWidth="2"/>
          
          {/* Left vertical lines turning right */}
          <path d="M 0 200 L 0 120 L 80 120 L 80 80" stroke="#DC2626" strokeWidth="2"/>
          <path d="M 30 400 L 30 220 L 100 220" stroke="#DC2626" strokeWidth="2"/>
          
          {/* Diagonal with angular turn */}
          <path d="M 0 370 L 60 310 L 60 260 L 120 260" stroke="#DC2626" strokeWidth="2"/>
          
          {/* Stepped patterns */}
          <path d="M 0 160 L 40 160 L 40 100 L 100 100 L 100 50" stroke="#DC2626" strokeWidth="2"/>
          <path d="M 70 400 L 70 340 L 140 340 L 140 290" stroke="#DC2626" strokeWidth="2"/>
          
          {/* Angular zigzag */}
          <path d="M 0 290 L 50 290 L 50 240 L 90 240 L 90 190" stroke="#DC2626" strokeWidth="2"/>
          
          {/* Short accent lines */}
          <path d="M 120 400 L 120 360 L 160 360" stroke="#DC2626" strokeWidth="2"/>
          <path d="M 140 220 L 190 220 L 190 170" stroke="#DC2626" strokeWidth="2"/>
        </svg>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Section 1: Brand */}
          <div className="text-center md:text-left">
            <div className="text-2xl sm:text-3xl mb-4 flex justify-center md:justify-start">
              <span className="font-outfit font-bold text-white">Pitch</span><span className="font-saira font-medium text-pitchiq-red">IQ</span>
            </div>
            <p className="text-sm text-white/70 mb-4">
              Practice with AI prospects. Get better at sales. Built for solo sellers who need to close deals.
            </p>
          </div>

          {/* Section 2: Product */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold mb-3 text-base">Product</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
            </ul>
          </div>
          
          {/* Section 3: Connect */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold mb-3 text-base">Connect</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowContactModal(true)}
                className="text-pitchiq-red hover:text-pitchiq-red/80 text-sm transition-colors font-medium flex items-center justify-center md:justify-start"
              >
                <Mail className="mr-2 h-4 w-4" />
                Get in Touch
              </button>
              <div className="flex space-x-4 justify-center md:justify-start">
                <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="LinkedIn">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Twitter">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-white/70 text-sm mb-1">
              © 2025 <span className="font-outfit">Pitch</span><span className="font-saira font-medium text-pitchiq-red">IQ</span>. All rights reserved.
            </p>
            <p className="text-white/50 text-xs">
              That's where we come in.
            </p>
          </div>
          <div className="flex space-x-6 text-xs text-white/60">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="/static/extras/index.html" className="hover:text-pitchiq-red transition-colors">extras</a>
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
