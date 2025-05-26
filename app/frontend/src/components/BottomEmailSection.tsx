import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail } from "lucide-react";
import EmailSignup from "./EmailSignup";

const BottomEmailSection = () => {
  return (
    <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-10 xl:px-20 text-center">
        <div className="max-w-md mx-auto">
          <EmailSignup />
        </div>
      </div>
    </section>
  );
};

export default BottomEmailSection; 