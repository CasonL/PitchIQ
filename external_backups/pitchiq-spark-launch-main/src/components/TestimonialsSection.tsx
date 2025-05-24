
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
    <section id="testimonials" className="py-16 md:py-24 px-6 md:px-10 lg:px-20 bg-gradient-to-br from-pitchiq-gray-light to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Sales Professionals Say</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Join thousands of sales professionals who have transformed their approach and results with PitchIQ.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Testimonial 
            quote="PitchIQ has completely transformed how I prepare for sales meetings. The AI conversations are incredibly realistic, and the feedback helped me close 30% more deals in just 3 months."
            name="Sarah Johnson"
            position="Enterprise Sales Manager"
            company="TechCorp Inc."
            rating={5}
            delay="0.1s"
          />
          <Testimonial 
            quote="As someone new to sales, I was struggling with objection handling. The practice scenarios in PitchIQ helped me build confidence and develop effective responses that actually work."
            name="Michael Chen"
            position="Account Executive"
            company="GrowthSoft Solutions"
            rating={5}
            delay="0.3s"
          />
          <Testimonial 
            quote="Our entire sales team uses PitchIQ for training. The customizable scenarios match our exact market challenges, and the analytics help us identify skill gaps across the team."
            name="Jessica Rivera"
            position="Sales Director"
            company="NexGen Services"
            rating={4}
            delay="0.5s"
          />
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
