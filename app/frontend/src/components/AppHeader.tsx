import React, { useState } from "react";
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut, ChevronDown, Edit2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import type { SalesMethodology } from "@/pages/Dashboard";

// Define props for AppHeader
interface AppHeaderProps {
  currentUserMethodology?: SalesMethodology | null;
  onMethodologyClick?: () => void;
}

// Dropdown menu component
const UserDropdown = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { logout } = useAuthContext();
  
  if (!isOpen) return null;
  
  const handleLogout = () => {
    console.log('🖱️ Logout button clicked');
    onClose();
    console.log('🚪 Calling logout function from AuthContext');
    logout();
  };
  
  return (
    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg py-1 z-50">
      <Link 
        to="/profile" 
        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        onClick={onClose}
      >
        <User size={16} className="mr-2" />
        Profile
      </Link>
      <Link 
        to="/settings" 
        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        onClick={onClose}
      >
        <Settings size={16} className="mr-2" />
        Settings
      </Link>
      <hr className="my-1" />
      <button 
        onClick={handleLogout}
        className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
      >
        <LogOut size={16} className="mr-2" />
        Logout
      </button>
    </div>
  );
};

const AppHeader: React.FC<AppHeaderProps> = ({ currentUserMethodology, onMethodologyClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  
  console.log('🏗️ AppHeader component rendered - logout functionality should be available');
  
  // Determine which page is active
  const isDashboard = location.pathname.includes('dashboard');
  const isRoleplay = location.pathname.includes('roleplay') || location.pathname.includes('chat');
  
  return (
    <header className="py-3 px-6 md:px-10 lg:px-16 w-full fixed top-0 bg-white z-50 shadow-sm">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold text-pitchiq-red">PitchIQ</Link>
        </div>
        
        {/* Center navigation - Dashboard and Roleplay buttons */}
        <div className="flex items-center gap-2">
          <Link to="/dashboard">
            <Button 
              variant={isDashboard ? "default" : "outline"} 
              className="rounded-full px-4"
            >
              Dashboard
            </Button>
          </Link>
          <Link to="/chat">
            <Button 
              variant={isRoleplay ? "default" : "outline"} 
              className="rounded-full px-4"
            >
              Roleplay
            </Button>
          </Link>
        </div>
        
        {/* User menu and Sales Methodology */}
        <div className="flex items-center gap-3">
          {currentUserMethodology && onMethodologyClick && (
            <button 
              onClick={onMethodologyClick}
              className="flex items-center text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1 rounded-full shadow-sm transition-colors duration-150 cursor-pointer"
              title="Click to review or change your sales methodology"
            >
              <Edit2 size={12} className="mr-1.5" /> 
              {currentUserMethodology}
            </button>
          )}
          <div className="relative">
            <button 
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              onClick={() => {
                console.log('🖱️ User dropdown button clicked, opening:', !isDropdownOpen);
                setIsDropdownOpen(!isDropdownOpen);
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={18} />
              </div>
              <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <UserDropdown 
              isOpen={isDropdownOpen} 
              onClose={() => setIsDropdownOpen(false)} 
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader; 