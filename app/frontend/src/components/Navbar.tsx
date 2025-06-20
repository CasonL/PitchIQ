import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, ArrowRight, Zap, Menu, X } from 'lucide-react';
import { useNavbarHeight } from '@/context/NavbarHeightContext';

interface NavbarProps {
  preRelease?: boolean;
  onOpenEmailModal: () => void;
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

// NavbarComponent no longer needs forwardRef
const NavbarComponent = ({ preRelease, onOpenEmailModal }: NavbarProps) => {
  const { setNavbarHeight } = useNavbarHeight();
  const localNavRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const measureAndSetHeight = () => {
      if (localNavRef.current) {
        const height = localNavRef.current.offsetHeight;
        setNavbarHeight(height);
        console.log('[Navbar] Measured height and set in context:', height);
      }
    };

    measureAndSetHeight();

    const debouncedMeasure = debounce(measureAndSetHeight, 150);
    window.addEventListener('resize', debouncedMeasure);
    return () => {
      window.removeEventListener('resize', debouncedMeasure);
    };
  }, [preRelease, setNavbarHeight]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionPositionsRef = useRef<Record<string, number>>({});

  const navLinks = [
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'Blog', href: '/blog' },
  ];

  const calculateAndStorePositions = () => {
    const newPositions: Record<string, number> = {};
    navLinks.forEach(link => {
      if (link.href.startsWith('/#')) {
        const sectionId = link.href.substring(2);
        const element = document.getElementById(sectionId);
        if (element) {
          newPositions[sectionId] = getAbsoluteTop(element);
        }
      }
    });
    sectionPositionsRef.current = newPositions;
  };

  useEffect(() => {
    calculateAndStorePositions();
    const debouncedRecalculate = debounce(calculateAndStorePositions, 250);
    window.addEventListener('resize', debouncedRecalculate);
    const timeoutId = setTimeout(calculateAndStorePositions, 500);
    return () => {
      window.removeEventListener('resize', debouncedRecalculate);
      clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  const scrollToSection = (idWithHash: string) => {
    const sectionId = idWithHash.substring(2);
    const storedPosition = sectionPositionsRef.current[sectionId];
    
    const navHeight = localNavRef.current ? localNavRef.current.offsetHeight : 80; 
    const yOffset = -navHeight;

    if (Object.keys(sectionPositionsRef.current).length === 0) {
        calculateAndStorePositions();
    }

    const attemptScroll = () => {
        const currentStoredPosition = sectionPositionsRef.current[sectionId];
        if (typeof currentStoredPosition === 'number') {
            window.scrollTo({ top: Math.round(currentStoredPosition + yOffset), behavior: 'smooth' });
        } else {
            const element = document.getElementById(sectionId);
            if (element) {
                requestAnimationFrame(() => {
                    const rect = element.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    window.scrollTo({ top: Math.round(rect.top + scrollTop + yOffset), behavior: 'smooth' });
                });
            }
        }
    };

    if (typeof storedPosition !== 'number') {
        setTimeout(attemptScroll, 300);
    } else {
        attemptScroll();
    }

    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const rootPath = preRelease ? "/pre-release" : "/";

    if (href.startsWith('/#')) {
      if (location.pathname === rootPath || location.pathname === "/") {
        scrollToSection(href);
      } else {
        navigate(rootPath + href.substring(1));
      }
    } else {
      navigate(href);
    }
  };

  const handleJoinWaitlistClick = () => {
    onOpenEmailModal();
    setIsMobileMenuOpen(false);
  };

  const isDashboard = location.pathname.startsWith('/dashboard');

  if (isDashboard) {
    return null;
  }

  return (
    <nav ref={localNavRef} className="bg-white/80 backdrop-blur-md fixed w-full z-50 top-0 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">
              <span className="font-outfit font-bold text-gray-800">Pitch</span>
              <span className="font-saira font-medium text-pitchiq-red">IQ</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-gray-600 hover:text-pitchiq-red px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.href ? 'text-pitchiq-red font-semibold' : ''
                }`}
              >
                {link.name}
              </button>
            ))}
            <Button 
              variant="default"
              size="sm" 
              onClick={handleJoinWaitlistClick}
              className="ml-2 bg-pitchiq-red hover:bg-pitchiq-red/90 text-white"
            >
              Join Waitlist
            </Button>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 hover:text-pitchiq-red focus:outline-none">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg py-2">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={(e) => handleNavClick(e, link.href)}
              className={`w-full text-left block text-gray-600 hover:text-pitchiq-red hover:bg-gray-50 px-4 py-3 text-base font-medium transition-colors ${
                location.pathname === link.href ? 'text-pitchiq-red bg-pitchiq-red/5 font-semibold' : ''
              }`}
            >
              {link.name}
            </button>
          ))}
          <div className="px-4 py-3 border-t border-gray-100">
            <Button 
              variant="default"
              size="lg"
              onClick={handleJoinWaitlistClick}
              className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90 text-white"
            >
              Join Waitlist
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavbarComponent;
