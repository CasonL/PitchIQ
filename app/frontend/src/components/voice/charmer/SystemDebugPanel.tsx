/**
 * SystemDebugPanel.tsx
 * Real-time visibility into Marcus's AI systems during calls
 * Shows prompts, state changes, and coaching detections as they happen
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Code, Brain, Target, TrendingUp } from 'lucide-react';

export interface SystemDebugEvent {
  timestamp: number;
  type: 'prompt' | 'overseer' | 'strategy' | 'coaching' | 'state';
  title: string;
  data: any;
  color?: string;
}

interface SystemDebugPanelProps {
  events: SystemDebugEvent[];
  isVisible: boolean;
  onToggle: () => void;
}

export const SystemDebugPanel: React.FC<SystemDebugPanelProps> = ({
  events,
  isVisible,
  onToggle
}) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<string>('all');

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'prompt': return <Code className="w-4 h-4" />;
      case 'overseer': return <Brain className="w-4 h-4" />;
      case 'strategy': return <Target className="w-4 h-4" />;
      case 'coaching': return <TrendingUp className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'prompt': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'overseer': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'strategy': return 'text-green-600 bg-green-50 border-green-200';
      case 'coaching': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors z-50"
        title="Show System Debug Panel"
      >
        <Eye className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-white border-l border-t border-gray-300 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-gray-700" />
          <h3 className="font-semibold text-gray-900">System Debug</h3>
          <span className="text-xs text-gray-500">({filteredEvents.length})</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-200 rounded"
          title="Hide Debug Panel"
        >
          <EyeOff className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-2 border-b border-gray-200 text-xs">
        {['all', 'prompt', 'overseer', 'strategy', 'coaching', 'state'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded ${
              filter === f 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            No events yet. Start a call to see system activity.
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const isExpanded = expandedEvents.has(index);
            const time = new Date(event.timestamp).toLocaleTimeString();
            
            return (
              <div
                key={index}
                className={`border rounded p-2 ${getColor(event.type)}`}
              >
                <button
                  onClick={() => toggleEvent(index)}
                  className="w-full flex items-start gap-2 text-left"
                >
                  <div className="mt-0.5">
                    {getIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {event.title}
                      </span>
                      <span className="text-xs opacity-60 whitespace-nowrap">
                        {time}
                      </span>
                    </div>
                    {!isExpanded && (
                      <div className="text-xs opacity-60 truncate mt-1">
                        {typeof event.data === 'string' 
                          ? event.data 
                          : JSON.stringify(event.data).substring(0, 50) + '...'}
                      </div>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-2 p-2 bg-white rounded text-xs font-mono overflow-auto max-h-64">
                    <pre className="whitespace-pre-wrap break-words">
                      {typeof event.data === 'string'
                        ? event.data
                        : JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
