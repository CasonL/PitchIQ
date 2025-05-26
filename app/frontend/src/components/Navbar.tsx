import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, ArrowRight, Zap, Menu, X } from 'lucide-react'; 
// import { useAuthContext } from "@/context/AuthContext"; // Assuming this might be needed for auth state

interface NavbarProps {
  preRelease?: boolean;
}

const Navbar = ({ preRelease }: NavbarProps) => {
  // const { isAuthenticated, isLoading, logout } = useAuthContext(); // For auth state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'About Us', href: '/#about-us' },
    { name: 'Features', href: '/#features' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'Testimonials', href: '/#testimonials' },
  ];

  // Simplified scroll to section logic, ensure IDs exist on your page sections
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id.substring(2)); // Remove '/#'
    if (element) {
      const yOffset = -80; // Navbar height offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({top: y, behavior: 'smooth'});
    }
    setIsMobileMenuOpen(false); // Close mobile menu on click
  };

  const isDashboard = location.pathname.startsWith('/dashboard');

  if (isDashboard) {
    return null; // Don't render the landing page Navbar on dashboard routes
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md fixed w-full z-50 top-0 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
        <div className="flex items-center justify-between h-20">
          <Link to={preRelease ? "/pre-release" : "/"} className="flex items-center space-x-2">
            <span className="font-bold text-2xl">
              <span className="text-gray-800">Pitch</span>
              <span className="text-pitchiq-red">IQ</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={(e) => {
                  if (link.href.includes('#')) {
                    e.preventDefault();
                    scrollToSection(link.href);
                  } else {
                    // For direct links, use Link component instead
                    window.location.href = link.href;
                  }
                }}
                className="text-gray-600 hover:text-pitchiq-red px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {link.name}
              </button>
            ))}
            <Button asChild className="bg-pitchiq-red hover:bg-pitchiq-red/90">
              <Link to={preRelease ? "/#email-signup" : "/dashboard"} onClick={(e) => {
                if (preRelease && location.pathname === '/pre-release' && "/#email-signup".includes('#')) {
                    e.preventDefault();
                    scrollToSection("/#email-signup");
                } else if (preRelease && "/#email-signup".includes('#')) {
                    // allow navigation to /pre-release first, then scroll in a useEffect or similar
                }
              }}>
                {preRelease ? 'Join Waitlist' : 'Go to Dashboard'} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 hover:text-pitchiq-red focus:outline-none">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg py-2">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={(e) => {
                if (link.href.includes('#')) {
                  e.preventDefault();
                  scrollToSection(link.href);
                } else {
                  setIsMobileMenuOpen(false); // Close for direct links too
                  window.location.href = link.href;
                }
              }}
              className="w-full text-left block text-gray-600 hover:text-pitchiq-red hover:bg-gray-50 px-4 py-3 text-base font-medium transition-colors"
            >
              {link.name}
            </button>
          ))}
          <div className="px-4 py-3">
            <Button asChild className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90">
              <Link to={preRelease ? "/#email-signup" : "/dashboard"} onClick={(e) => {
                if (preRelease && location.pathname === '/pre-release' && "/#email-signup".includes('#')) {
                    e.preventDefault();
                    scrollToSection("/#email-signup");
                } else if (preRelease && "/#email-signup".includes('#')) {
                    // allow navigation to /pre-release first, then scroll in a useEffect or similar
                    setIsMobileMenuOpen(false);
                } else {
                    setIsMobileMenuOpen(false);
                }
              }}>
                 {preRelease ? 'Join Waitlist' : 'Go to Dashboard'} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
