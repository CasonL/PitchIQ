
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      position: "Small Business Owner",
      company: "Bright Ideas Marketing",
      content: "PitchIQ has been a game-changer for my small team. We've improved our close rates by 27% in just two months!",
      rating: 5
    },
    {
      name: "Michael Chen",
      position: "Freelance Consultant",
      company: "Chen Consulting",
      content: "As a solo consultant, I couldn't afford expensive sales training. PitchIQ gives me the practice I need at a price that works.",
      rating: 5
    },
    {
      name: "Lisa Rodriguez",
      position: "Sales Manager",
      company: "Innovate Solutions",
      content: "My team practices with PitchIQ before important client meetings. It's like having a personal sales coach for each rep.",
      rating: 5
    }
  ];

  const [current, setCurrent] = useState(0);

  const next = () => {
    setCurrent((current + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrent((current - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section id="testimonials" className="py-16">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by <span className="gradient-text">Small Businesses</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See what our customers are saying about their experience with PitchIQ.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative">
            <div className="flex items-center mb-6">
              {[...Array(testimonials[current].rating)].map((_, index) => (
                <Star key={index} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-lg md:text-xl italic mb-6">"{testimonials[current].content}"</p>
            <div>
              <p className="font-bold">{testimonials[current].name}</p>
              <p className="text-gray-600">{testimonials[current].position}, {testimonials[current].company}</p>
            </div>
          </div>

          <div className="flex items-center mt-8 space-x-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={prev}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Previous</span>
            </Button>

            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    current === index ? 'bg-pitchiq-blue-600' : 'bg-gray-300'
                  }`}
                  onClick={() => setCurrent(index)}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={next}
            >
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
