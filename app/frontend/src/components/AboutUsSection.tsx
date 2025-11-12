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
            Not Another Enterprise Tool
          </h2>
          <p className="mt-6 text-lg md:text-xl text-gray-600">
            Most sales training tools cost $10K+ and require teams of 50+ reps. They're built for Fortune 500 companies, not solo consultants.
          </p>
          <p className="mt-4 text-lg md:text-xl text-gray-600">
            PitchIQ is different. No setup. No enterprise pricing. No team required. Just you, AI prospects, and a coach who helps you get better—fast.
          </p>
        </div>

        {/* Divider */}
        <div className="w-24 h-px bg-gray-300 mx-auto my-16"></div>

        {/* Final CTA */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 font-outfit text-gray-900">
            Ready to Stop Losing Deals?
          </h3>
          <p className="mt-4 text-lg md:text-xl text-gray-600">
            Get early access. Start practicing before your next big call.
          </p>
          <div className="mt-8">
            <Button 
              onClick={onOpenEmailModal}
              className="bg-red-600 hover:bg-red-700 text-white rounded-md px-8 py-4 text-lg font-semibold"
            >
              Get Early Access <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutUsSection; 