import React from "react";
import { Star, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-32 md:py-48 px-6 md:px-10 lg:px-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">
              <MessageSquare className="w-6 h-6 text-pitchiq-red" />
              <span className="text-lg font-semibold text-gray-800">Customer Testimonials</span>
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
            Your Success Story Could Be Here
          </h2>
          
          <div className="max-w-3xl mx-auto mb-8">
            <p className="text-lg text-foreground/70 mb-4">
              PitchIQ is brand new and we're looking for our first success stories! 
            </p>
            <p className="text-base text-foreground/60">
              Be among the early adopters who help shape the future of AI-powered sales training. Your feedback and results will help us build the ultimate sales coaching platform.
            </p>
          </div>

          {/* Placeholder testimonial cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 opacity-30">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex mb-4">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star 
                      key={starIndex} 
                      className="w-5 h-5 text-gray-300" 
                    />
                  ))}
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-pitchiq-red/5 border border-pitchiq-red/20 rounded-xl p-8 mb-8">
            <Users className="w-12 h-12 text-pitchiq-red mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Be Our First Success Story
            </h3>
            <p className="text-foreground/70 mb-6">
              Join our early access program and help us create the testimonials that will inspire the next generation of sales professionals.
            </p>
          </div>
        </div>
        
        <div className="text-center">
          <Button 
            size="lg" 
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg px-8 py-4"
            onClick={() => {
              // Find all elements with email-signup ID
              const elements = document.querySelectorAll('#email-signup');
              let targetElement = null;
              
              // Find the one in the hero section (not the bottom section)
              elements.forEach((element) => {
                const styles = window.getComputedStyle(element);
                const parentSection = element.closest('section');
                
                // Check if it's visible and in the hero section (has min-h-screen class)
                if (styles.display !== 'none' && parentSection?.classList.contains('min-h-screen')) {
                  targetElement = element;
                }
              });
              
              // If no hero section email found, fall back to any visible one
              if (!targetElement) {
                elements.forEach((element) => {
                  const styles = window.getComputedStyle(element);
                  if (styles.display !== 'none') {
                    targetElement = element;
                  }
                });
              }
              
              if (targetElement) {
                // Get current scroll position to avoid cumulative errors
                const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
                const elementRect = targetElement.getBoundingClientRect();
                const elementTop = elementRect.top + currentScrollY;
                
                // Use a fixed offset that works well for both mobile and desktop
                const isMobile = window.innerWidth < 768;
                const offset = isMobile ? 80 : 120;
                const targetScrollY = elementTop - offset;
                
                // Ensure we don't scroll past the top of the page
                const finalScrollY = Math.max(0, targetScrollY);
                
                window.scrollTo({
                  top: finalScrollY,
                  behavior: 'smooth'
                });

                // Trigger highlight effect after scroll completes
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('highlightEmailSignup'));
                }, 800); // Delay to allow scroll to complete
              }
            }}
          >
            Join Early Access & Shape Our Success Stories
          </Button>
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
