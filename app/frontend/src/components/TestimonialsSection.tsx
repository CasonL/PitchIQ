import React, { useState } from "react";
import { Star, Users, MessageSquare, ChevronLeft, ChevronRight, Zap, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';

interface TestimonialsSectionProps {
  onOpenEmailModal: () => void;
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ onOpenEmailModal }) => {
  const handleTriggerEmailSignup = () => {
    onOpenEmailModal();
    // The modal itself will dispatch the highlight event for 'modal-email-signup'
  };

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Define placeholder data structure if you want more specific placeholders
  const testimonialPlaceholders = [
    {
      id: 1,
      quoteLines: ["w-full", "w-4/5", "w-3/4"],
      nameLine: "w-1/2",
      positionLine: "w-2/3",
    },
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonialPlaceholders.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonialPlaceholders.length) % testimonialPlaceholders.length);
  };

  const goToTestimonial = (index: number) => {
    setCurrentTestimonial(index);
  };

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
          
          {/* Testimonial Carousel */}
          <div className="relative max-w-xl mx-auto mb-12">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${testimonialPlaceholders.length > 1 ? currentTestimonial * 100 : 0}%)` }}
              >
                {testimonialPlaceholders.map((placeholder) => (
                  <div key={placeholder.id} className="w-full flex-shrink-0 px-2">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 opacity-50 min-h-[180px]">
                      <div className="flex mb-3">
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <Star 
                            key={starIndex} 
                            className="w-4 h-4 text-gray-300" 
                          />
                        ))}
                      </div>
                      <div className="space-y-1 mb-3">
                        {placeholder.quoteLines.map((widthClass, qlIndex) => (
                          <div key={qlIndex} className={`h-3 bg-gray-200 rounded ${widthClass}`}></div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className={`h-3 bg-gray-200 rounded ${placeholder.nameLine}`}></div>
                        <div className={`h-2 bg-gray-200 rounded ${placeholder.positionLine}`}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons - Conditionally render if more than one testimonial */}
            {testimonialPlaceholders.length > 1 && (
              <>
                <button 
                  onClick={prevTestimonial} 
                  className="absolute top-1/2 -left-4 md:-left-8 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md border border-gray-200 transition-colors z-10"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button 
                  onClick={nextTestimonial} 
                  className="absolute top-1/2 -right-4 md:-right-8 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md border border-gray-200 transition-colors z-10"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </>
            )}

            {/* Dot Indicators - Conditionally render if more than one testimonial */}
            {testimonialPlaceholders.length > 1 && (
              <div className="flex justify-center space-x-2 mt-6">
                {testimonialPlaceholders.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToTestimonial(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors
                      ${currentTestimonial === index ? 'bg-pitchiq-red' : 'bg-gray-300 hover:bg-gray-400'}`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center">
          <Button 
            size="lg" 
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg px-8 py-4"
            onClick={handleTriggerEmailSignup}
          >
            Join Early Access
          </Button>
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
