import React from 'react';
import { Button } from '@/components/ui/button';
import { XIcon, RefreshCcwIcon, SquareIcon, LayoutPanelLeftIcon } from 'lucide-react'; // Added new icons
// Removed unused type imports like UserDashboardState, DevDisplayMode, DataPointHighlightProps etc.

export interface DashboardDevToolsPanelProps {
  onToggleVisibility: () => void;
  onResetOnboarding: () => void;
  onSetEmptyDashboardState: () => void;
  onSetSingleCardPromptState: () => void;
  // All other props are removed
}

const DashboardDevToolsPanel: React.FC<DashboardDevToolsPanelProps> = ({
  onToggleVisibility,
  onResetOnboarding,
  onSetEmptyDashboardState,
  onSetSingleCardPromptState,
}) => {
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-slate-800 text-white p-4 shadow-xl z-[100] overflow-y-auto flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Dev Tools</h2>
        <Button variant="ghost" size="icon" onClick={onToggleVisibility} className="text-slate-400 hover:text-white">
          <XIcon size={20} />
        </Button>
      </div>

      <div className="space-y-4 flex-grow">
        <h3 className="text-lg font-medium text-slate-300 mb-2 border-b border-slate-700 pb-1">Core Resets</h3>
        <Button onClick={onResetOnboarding} variant="outline" className="w-full bg-red-600 hover:bg-red-700 border-red-700 text-white justify-start">
          <RefreshCcwIcon size={16} className="mr-2" /> Reset Full Onboarding
        </Button>
        
        <h3 className="text-lg font-medium text-slate-300 mb-2 pt-4 border-b border-slate-700 pb-1">Dashboard States</h3>
        <Button onClick={onSetEmptyDashboardState} variant="outline" className="w-full bg-sky-600 hover:bg-sky-700 border-sky-700 text-white justify-start">
          <LayoutPanelLeftIcon size={16} className="mr-2" /> Set to Empty Dashboard
        </Button>
        <Button onClick={onSetSingleCardPromptState} variant="outline" className="w-full bg-amber-600 hover:bg-amber-700 border-amber-700 text-white justify-start">
          <SquareIcon size={16} className="mr-2" /> Set to Single Card Prompt
        </Button>

        {/* All other controls (dropdowns, checkboxes, input fields, simulation buttons) are removed */}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">Simplified Dev Panel</p>
      </div>
    </div>
  );
};

export default DashboardDevToolsPanel; 