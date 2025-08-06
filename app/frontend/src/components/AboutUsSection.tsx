import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";

interface AboutUsSectionProps {
  onOpenEmailModal: () => void;
}

const AboutUsSection: React.FC<AboutUsSectionProps> = ({ onOpenEmailModal }) => {
  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="container mx-auto px-6 lg:px-8 text-center">
        
        {/* Founder Story */}
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 font-outfit text-gray-900">
            Enterprise-Grade Sales Training
          </h2>
          <p className="mt-6 text-lg md:text-xl text-gray-600">
            Built for organizations that need to scale sales performance while maintaining compliance standards.
          </p>
          <div className="mt-8">
            <Button 
              variant="outline" 
              className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onOpenEmailModal}
            >
              Contact Our Enterprise Team <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-24 h-px bg-gray-300 mx-auto my-16"></div>

        {/* Final CTA */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 font-outfit text-gray-900">
            Ready to Transform Your Sales Organization?
          </h3>
          <p className="mt-4 text-lg md:text-xl text-gray-600">
            Schedule a demo to see how PitchIQ delivers measurable training ROI.
          </p>
          <div className="mt-8">
            <Button 
              onClick={onOpenEmailModal}
              className="bg-red-600 hover:bg-red-700 text-white rounded-md px-8 py-4 text-lg font-semibold"
            >
              Schedule Enterprise Demo <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutUsSection; 