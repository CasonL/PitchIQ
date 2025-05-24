import React from "react";
import { Star } from "lucide-react";

interface TestimonialProps {
  quote: string;
  name: string;
  position: string;
  company: string;
  rating: number;
  delay: string;
}

const Testimonial = ({ quote, name, position, company, rating, delay }: TestimonialProps) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm card-hover animate-fade-in" style={{ animationDelay: delay }}>
      <div className="flex mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star 
            key={i} 
            className={`w-5 h-5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
          />
        ))}
      </div>
      <p className="mb-6 text-foreground/80 italic">{quote}</p>
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-foreground/70">{position}, {company}</p>
      </div>
    </div>
  );
};

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-32 md:py-48 px-6 md:px-10 lg:px-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Be Part of the Revolution.</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            PitchIQ is brand new and ready to help you master your sales game.
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-xl font-semibold text-pitchiq-red">
            Be the first to transform your sales skills!
          </p>
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
