import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, ArrowRight, Zap, Menu, X } from 'lucide-react'; 
// import { useAuthContext } from "@/context/AuthContext"; // Assuming this might be needed for auth state

interface NavbarProps {
  preRelease?: boolean;
}

// Helper function to get absolute top position of an element
const getAbsoluteTop = (element: HTMLElement | null): number => {
  let posY = 0;
  while (element) {
    posY += element.offsetTop;
    element = element.offsetParent as HTMLElement | null;
  }
  return posY;
};

// Debounce utility
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

const Navbar = ({ preRelease }: NavbarProps) => {
  // const { isAuthenticated, isLoading, logout } = useAuthContext(); // For auth state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const sectionPositionsRef = useRef<Record<string, number>>({});
  const navbarRef = useRef<HTMLElement>(null); // Ref for the nav element itself to get its height dynamically

  const navLinks = [
    { name: 'About Us', href: '/#about-us' },
    { name: 'Features', href: '/#features' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'Testimonials', href: '/#testimonials' },
  ];

  const calculateAndStorePositions = () => {
    // console.log('Recalculating positions');
    const newPositions: Record<string, number> = {};
    navLinks.forEach(link => {
      if (link.href.includes('#')) {
        const sectionId = link.href.substring(2); // Remove '/#'
        const element = document.getElementById(sectionId);
        if (element) {
          newPositions[sectionId] = getAbsoluteTop(element);
        }
      }
    });
    sectionPositionsRef.current = newPositions;
    // console.log('Stored positions:', sectionPositionsRef.current);
  };

  useEffect(() => {
    // Initial calculation
    calculateAndStorePositions();

    // Debounced recalculation on resize
    const debouncedRecalculate = debounce(calculateAndStorePositions, 250);
    window.addEventListener('resize', debouncedRecalculate);

    // Recalculate a bit after load too, for any late-rendering elements or font loads
    const timeoutId = setTimeout(calculateAndStorePositions, 500);


    return () => {
      window.removeEventListener('resize', debouncedRecalculate);
      clearTimeout(timeoutId);
    };
  }, [navLinks]); // navLinks dependency is stable but good practice

  const scrollToSection = (idWithHash: string) => {
    const sectionId = idWithHash.substring(2); // Remove '/#'
    const storedPosition = sectionPositionsRef.current[sectionId];
    
    // Dynamically get navbar height
    const navHeight = navbarRef.current ? navbarRef.current.offsetHeight : 80; // Default to 80 if ref not ready
    const yOffset = -navHeight;

    // console.log(`Scrolling to ${sectionId}, stored: ${storedPosition}, navHeight: ${navHeight}`);

    if (typeof storedPosition === 'number') {
      const y = storedPosition + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      // Fallback if position not found (e.g., element not rendered yet or ID mismatch)
      // This could re-attempt calculation or use the old method as a last resort
      // console.warn(`Position for section ${sectionId} not found, trying direct DOM calculation.`);
      const element = document.getElementById(sectionId);
      if (element) {
        requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const y = rect.top + scrollTop + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        });
      }
    }
    setIsMobileMenuOpen(false);
  };

  const isDashboard = location.pathname.startsWith('/dashboard');

  if (isDashboard) {
    return null; // Don't render the landing page Navbar on dashboard routes
  }

  return (
    <nav ref={navbarRef} className="bg-white/80 backdrop-blur-md fixed w-full z-50 top-0 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
        <div className="flex items-center justify-between h-20">
          <Link to={preRelease ? "/pre-release" : "/"} className="flex items-center space-x-2">
            <span className="text-2xl">
              <span className="font-outfit font-bold text-gray-800">Pitch</span>
              <span className="font-saira font-medium text-pitchiq-red">IQ</span>
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
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
