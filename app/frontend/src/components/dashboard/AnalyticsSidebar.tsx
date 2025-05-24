import React from 'react';

interface AnalyticsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AnalyticsSidebar: React.FC<AnalyticsSidebarProps> = ({ isOpen, onClose }) => {
  // TODO: Fetch and display actual analytics data
  // TODO: Build Admin section

  return (
    <div className={`analytics-sidebar ${isOpen ? 'open' : ''}`}> 
      <div className="p-6 border-l h-full bg-background overflow-y-auto">
        {/* Header with Close Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Analytics & Admin</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded hover:bg-accent"
            aria-label="Close analytics sidebar"
          >
            {/* Close Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Placeholder for Analytics Content */}
        <div className="mb-8">
            <h3 className="text-lg font-medium mb-3">Performance Analytics</h3>
            <div className="p-4 border rounded bg-muted text-center">
                <p className="text-sm text-muted-foreground">(Detailed charts, graphs, session history will appear here.)</p>
            </div>
        </div>

        {/* Placeholder for Admin Section */}
        <div>
            <h3 className="text-lg font-medium mb-3">Admin: Training Scenarios</h3>
             <div className="p-4 border rounded bg-muted text-center">
                <p className="text-sm text-muted-foreground">(List of scenarios, AI assignments, goals will appear here.)</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSidebar; 