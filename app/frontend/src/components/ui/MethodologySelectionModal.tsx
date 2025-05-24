import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './button';
import { X, CheckCircle, ListChecks, Info } from 'lucide-react';
import type { SalesMethodology } from '@/pages/Dashboard'; // Import the type

interface MethodologySelectionModalProps {
  isOpen: boolean;
  onClose: () => void; // For cancelling the selection process
  onConfirm: (selectedMethodology: SalesMethodology) => void; // For confirming the new choice
  currentMethodology: SalesMethodology | null; // This will be 'Pending Selection' when modal opens
  availableMethodologies: SalesMethodology[];
  aiOriginalRecommendation?: SalesMethodology | null; // <-- Add new prop
}

const MethodologySelectionModal: React.FC<MethodologySelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentMethodology, // This prop isn't strictly needed for selection if we manage internal state
  availableMethodologies,
  aiOriginalRecommendation, // <-- Destructure new prop
}) => {
  const [selectedMethodology, setSelectedMethodology] = useState<SalesMethodology | null>(null);
  const [activeDescriptionKey, setActiveDescriptionKey] = useState<string | null>(null); // <-- New state

  // Memoize selectableMethodologies
  const selectableMethodologies = useMemo(() => {
    return availableMethodologies.filter(
      m => m && m !== 'Pending Selection' && m !== 'AI Recommended'
    );
  }, [availableMethodologies]);

  // Descriptions for tooltips
  const methodologyDescriptions: Record<string, string> = {
    'SPIN Selling': "Best for sellers who need to uncover and develop client needs through targeted questioning, especially in complex sales.",
    'Challenger Sale': "Suits sellers who can teach, tailor, and take control by bringing new insights to clients, often in disruptive markets.",
    'Solution Selling': "Ideal for those selling customizable products/services by diagnosing client pain points and offering tailored solutions.",
    'Consultative Selling': "Effective for building long-term advisory relationships by deeply understanding client businesses and co-creating solutions.",
    'Value Selling': "For sellers needing to clearly demonstrate and quantify the economic impact and ROI of their offering for the client."
  };

  useEffect(() => {
    // Only set default when modal opens and no selection is made yet, or if the current selection is no longer valid
    if (isOpen) {
      if (!selectedMethodology || !selectableMethodologies.includes(selectedMethodology)) {
        if (selectableMethodologies.length > 0) {
          setSelectedMethodology(selectableMethodologies[0]); // Default to first selectable
        }
      }
    } else {
      setSelectedMethodology(null); // Clear selection when closed if you want it to reset every time
                                  // Or comment this out to keep last selection when re-opened (before confirm)
      setActiveDescriptionKey(null); // Clear active description when modal closes
    }
  }, [isOpen, selectableMethodologies]); // Removed selectedMethodology from deps to avoid loops with its own setter

  if (!isOpen) return null;

  const handleInfoIconClick = (methodologyKey: string) => {
    if (activeDescriptionKey === methodologyKey) {
      setActiveDescriptionKey(null); // Toggle off if already active
    } else {
      setActiveDescriptionKey(methodologyKey);
    }
  };

  const handleConfirmClick = () => {
    if (selectedMethodology) {
      onConfirm(selectedMethodology);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center p-4 z-[110]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-auto">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center">
            <ListChecks className="text-blue-600 mr-3 h-7 w-7" />
            <h2 className="text-xl font-semibold text-gray-800">Select Your Sales Methodology</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={22} />
          </Button>
        </div>
        
        <div className="mb-6 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Choose the primary sales methodology you'd like your AI coach to focus on. 
            This will tailor feedback and suggestions to align with your chosen approach.
          </p>
          {selectableMethodologies.map((methodology) => (
            methodology && (
              <div key={methodology}>
                <label 
                  className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all duration-150 ease-in-out 
                              ${selectedMethodology === methodology 
                                ? 'bg-blue-50 border-blue-500 shadow-sm' 
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}
                >
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      name="salesMethodology"
                      value={methodology}
                      checked={selectedMethodology === methodology}
                      onChange={() => setSelectedMethodology(methodology)}
                      className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-3"
                    />
                    <span className={`text-sm font-medium ${selectedMethodology === methodology ? 'text-blue-700' : 'text-gray-700'}`}>
                      {methodology}
                      {methodology === aiOriginalRecommendation && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          AI Recommended
                        </span>
                      )}
                    </span>
                  </div>
                  {methodologyDescriptions[methodology] && (
                    <Info 
                      size={18} 
                      className={`text-gray-400 hover:text-blue-600 ml-2 cursor-pointer transition-colors ${activeDescriptionKey === methodology ? 'text-blue-600' : ''}`}
                      onClick={(e) => { 
                        e.preventDefault(); // Prevent label click from toggling radio
                        handleInfoIconClick(methodology);
                      }}
                    />
                  )}
                </label>
                {/* Display description if active */}
                {activeDescriptionKey === methodology && (
                  <div className="p-3 mt-1 mb-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 leading-relaxed shadow-sm">
                    {methodologyDescriptions[methodology]}
                  </div>
                )}
              </div>
            )
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="px-5 py-2">
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleConfirmClick} 
            disabled={!selectedMethodology}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 flex items-center disabled:opacity-70"
          >
            <CheckCircle size={17} className="mr-2" />
            Confirm Selection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MethodologySelectionModal; 