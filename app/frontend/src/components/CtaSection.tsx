import React from "react";
import { Button } from "@/components/ui/button";
// import { Link } from 'react-router-dom'; // No longer needed here
import { useAuthContext } from "@/context/AuthContext"; // Import the context hook

const CtaSection = () => {
  // const { isAuthenticated } = useAuth(); // Placeholder
  // const isAuthenticated = false; // TEMP: Replace with actual auth check - REMOVED
  const { isAuthenticated, isLoading } = useAuthContext(); // Use the context

  return (
    <section className="py-24 md:py-32 bg-pitchiq-navy">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to Close More Deals?
        </h2>
        <p className="text-lg md:text-xl text-white/80 mb-10">
          Stop practicing on real customers. Start mastering your pitch with AI.
        </p>
        {!isLoading && (
          <a href={isAuthenticated ? "/dashboard" : "/auth/signup"}>
            <Button size="lg" className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-lg px-10">
              Get Started Free
            </Button>
          </a>
        )}
      </div>
    </section>
  );
};

export default CtaSection;
