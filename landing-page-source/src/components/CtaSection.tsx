
import React from "react";
import { Button } from "@/components/ui/button";

const CtaSection = () => {
  return (
    <section className="py-16 md:py-24 px-6 md:px-10 lg:px-20 bg-pitchiq-purple-light/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Sales Approach?</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto mb-10">
            Join thousands of sales professionals who are already closing more deals with confidence using PitchIQ's AI-powered practice platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="btn-hover-effect text-lg px-10">Start Free Trial</Button>
            <Button size="lg" variant="outline" className="btn-hover-effect text-lg px-10">Schedule Demo</Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
