import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="py-4 px-6 md:px-10 lg:px-20 w-full fixed top-0 bg-white/90 backdrop-blur-sm z-50 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-2xl font-bold text-gradient">PitchIQ</div>
        </div>
        
        {/* Desktop menu */}
        <div className="hidden md:flex gap-8">
          <a href="#features" className="text-foreground/80 hover:text-pitchiq-purple transition-colors">Features</a>
          <a href="/how-it-works" className="text-foreground/80 hover:text-pitchiq-purple transition-colors">How It Works</a>
          <a href="#testimonials" className="text-foreground/80 hover:text-pitchiq-purple transition-colors">Testimonials</a>
          <a href="#pricing" className="text-foreground/80 hover:text-pitchiq-purple transition-colors">Pricing</a>
        </div>
        
        <div className="hidden md:block">
          <Button variant="outline" className="mr-2">Sign In</Button>
          <Button>Get Started</Button>
        </div>
        
        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          <Menu className="h-6 w-6" />
        </button>
      </div>
      
      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden py-4 flex flex-col gap-4 animate-fade-in">
          <a href="#features" className="text-foreground/80 hover:text-pitchiq-purple px-2 py-1">Features</a>
          <a href="/how-it-works" className="text-foreground/80 hover:text-pitchiq-purple px-2 py-1">How It Works</a>
          <a href="#testimonials" className="text-foreground/80 hover:text-pitchiq-purple px-2 py-1">Testimonials</a>
          <a href="#pricing" className="text-foreground/80 hover:text-pitchiq-purple px-2 py-1">Pricing</a>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" className="w-full">Sign In</Button>
            <Button className="w-full">Get Started</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
