import React, { useState, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";
// import { Link } from "react-router-dom"; // No longer needed here
import { useAuthContext } from "@/context/AuthContext"; // Import the context hook
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuthContext(); // Use the context

  // Define backend base URL (ensure .env file has VITE_BACKEND_URL)
  // const backendUrl = import.meta.env.VITE_BACKEND_URL || ''; // No longer needed for relative links

  return (
    <nav className="py-4 px-6 md:px-10 lg:px-20 w-full fixed top-0 bg-white/90 backdrop-blur-sm z-50 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <a href="/" className="text-2xl font-bold text-pitchiq-red">PitchIQ</a>
        </div>
        
        {/* Desktop menu */}
        <div className="hidden md:flex gap-8">
          <a href="#features" className="text-foreground/80 hover:text-pitchiq-red transition-colors">Features</a>
          <a href="#how-it-works" className="text-foreground/80 hover:text-pitchiq-red transition-colors">How It Works</a>
          <a href="#testimonials" className="text-foreground/80 hover:text-pitchiq-red transition-colors">Testimonials</a>
          <a href="#pricing" className="text-foreground/80 hover:text-pitchiq-red transition-colors">Pricing</a>
          <Link to="/chat" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600">
            Try Voice Chat
          </Link>
        </div>
        
        <div className="hidden md:block">
          {isLoading ? (
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          ) : (
            <>
              {isAuthenticated ? (
                // Use path to new React dashboard
                <a href="/dashboard">
                  <Button variant="outline" className="mr-2">Dashboard</Button>
                </a>
              ) : (
                // Use relative path, let proxy handle it
                <a href="/auth/login">
                  <Button variant="outline" className="mr-2">Sign In</Button>
                </a>
              )}
              {/* Use relative paths for signup/dashboard link */}
              <a href={isAuthenticated ? "/dashboard" : "/auth/signup"}>
                <Button className="bg-pitchiq-red hover:bg-pitchiq-red/90">Get Started Free</Button>
              </a>
            </>
          )}
        </div>
        
        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          <Menu className="h-6 w-6" />
        </button>
      </div>
      
      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden py-4 flex flex-col gap-4 animate-fade-in">
          <a href="#features" className="text-foreground/80 hover:text-pitchiq-red px-2 py-1">Features</a>
          <a href="#how-it-works" className="text-foreground/80 hover:text-pitchiq-red px-2 py-1">How It Works</a>
          <a href="#testimonials" className="text-foreground/80 hover:text-pitchiq-red px-2 py-1">Testimonials</a>
          <a href="#pricing" className="text-foreground/80 hover:text-pitchiq-red px-2 py-1">Pricing</a>
          <div className="flex flex-col gap-2 pt-2">
            {isLoading ? (
              <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <>
                {isAuthenticated ? (
                  // Use path to new React dashboard
                  <a href="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">Dashboard</Button>
                  </a>
                ) : (
                  // Use relative path, let proxy handle it
                  <a href="/auth/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </a>
                )}
                 {/* Use relative paths for signup/dashboard link */}
                <a href={isAuthenticated ? "/dashboard" : "/auth/signup"} onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90">Get Started Free</Button>
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
