import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";

interface AboutUsSectionProps {
  onOpenEmailModal: () => void;
}

const AboutUsSection: React.FC<AboutUsSectionProps> = ({ onOpenEmailModal }) => {
  const founderName = "Cason";

  return (
    <section id="about-us" className="py-16 md:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        <div className="mb-10 md:mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-pitchiq-red/10 mb-4">
            <Users className="h-8 w-8 text-pitchiq-red" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-outfit font-bold text-gray-900 leading-tight mb-4">
            From Frustration to <span className="text-pitchiq-red">Founder</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto mb-6">
            PitchIQ was born from a real sales grind and a $10k lesson in what traditional coaching often lacks. Discover the story behind the AI sales coach built to give you the edge I never had.
          </p>
          <Link to="/about-us">
            <Button variant="outline" className="text-pitchiq-red border-pitchiq-red hover:bg-pitchiq-red/5 hover:text-pitchiq-red group">
              Meet the Founder & Learn Our Story
              <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-150 group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="pt-8 border-t border-gray-200">
          <h3 className="text-xl md:text-2xl font-outfit font-semibold text-gray-800 mb-3">
            Ready to Skip the Struggle?
          </h3>
          <p className="text-md text-gray-600 max-w-lg mx-auto mb-6">
            Get early access to the sales coach designed to accelerate your success.
          </p>
          <Button
            onClick={onOpenEmailModal}
            variant="default"
            size="lg"
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white group"
          >
            Join the Waitlist
            <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-150 group-hover:translate-x-1" />
          </Button>
        </div>

      </div>
    </section>
  );
};

export default AboutUsSection; 