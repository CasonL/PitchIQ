/**
 * ResistanceTimeline.tsx
 * Visual timeline showing Marcus's resistance level throughout the call
 */

import React, { useState, useMemo } from 'react';
import { ConversationExchange } from './ConversationTranscript';

interface ResistanceTimelineProps {
  exchanges: ConversationExchange[];
  duration: number;
}

export const ResistanceTimeline: React.FC<ResistanceTimelineProps> = ({ exchanges, duration }) => {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  
  // Extract resistance data points
  const resistanceData = useMemo(() => {
    return exchanges
      .filter(ex => ex.resistanceLevel !== undefined)
      .map(ex => ({
        timestamp: ex.timestamp,
        level: ex.resistanceLevel!,
        speaker: ex.speaker,
        text: ex.text,
        emotion: ex.emotion
      }));
  }, [exchanges]);
  
  if (resistanceData.length === 0) {
    return null;
  }
  
  // Calculate SVG path for resistance line
  const graphWidth = 800;
  const graphHeight = 200;
  const padding = 40;
  const innerWidth = graphWidth - padding * 2;
  const innerHeight = graphHeight - padding * 2;
  
  const maxResistance = 10;
  const maxTime = duration;
  
  const points = resistanceData.map(point => {
    const x = padding + (point.timestamp / maxTime) * innerWidth;
    const y = graphHeight - padding - (point.level / maxResistance) * innerHeight;
    return { x, y, ...point };
  });
  
  const pathData = points.map((point, index) => {
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ');
  
  const formatTime = (timestamp: number): string => {
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getResistanceColor = (level: number): string => {
    if (level >= 8) return '#ef4444'; // red
    if (level >= 6) return '#f59e0b'; // orange
    if (level >= 4) return '#eab308'; // yellow
    return '#10b981'; // green
  };
  
  const getResistanceLabel = (level: number): string => {
    if (level >= 8) return 'Very Defensive';
    if (level >= 6) return 'Guarded';
    if (level >= 4) return 'Neutral';
    return 'Open';
  };
  
  const selected = selectedPoint !== null ? points[selectedPoint] : null;
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
        <span>📊</span>
        Resistance Over Time
      </h3>
      
      <div className="bg-black/30 rounded-2xl p-6">
        {/* SVG Graph */}
        <svg 
          viewBox={`0 0 ${graphWidth} ${graphHeight}`}
          className="w-full h-auto"
        >
          {/* Grid lines */}
          {[0, 2, 4, 6, 8, 10].map(level => {
            const y = graphHeight - padding - (level / maxResistance) * innerHeight;
            return (
              <g key={level}>
                <line
                  x1={padding}
                  y1={y}
                  x2={graphWidth - padding}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fill="#9ca3af"
                  fontSize="12"
                  textAnchor="end"
                >
                  {level}
                </text>
              </g>
            );
          })}
          
          {/* Time axis */}
          {[0, 0.25, 0.5, 0.75, 1].map(fraction => {
            const x = padding + fraction * innerWidth;
            const timestamp = maxTime * fraction;
            return (
              <g key={fraction}>
                <line
                  x1={x}
                  y1={graphHeight - padding}
                  x2={x}
                  y2={graphHeight - padding + 5}
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={graphHeight - padding + 20}
                  fill="#9ca3af"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {formatTime(timestamp)}
                </text>
              </g>
            );
          })}
          
          {/* Resistance zones */}
          <rect
            x={padding}
            y={graphHeight - padding - (10 / maxResistance) * innerHeight}
            width={innerWidth}
            height={(2 / maxResistance) * innerHeight}
            fill="#ef4444"
            fillOpacity="0.1"
          />
          <rect
            x={padding}
            y={graphHeight - padding - (8 / maxResistance) * innerHeight}
            width={innerWidth}
            height={(2 / maxResistance) * innerHeight}
            fill="#f59e0b"
            fillOpacity="0.1"
          />
          
          {/* Resistance line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={selectedPoint === index ? 8 : 6}
                fill={getResistanceColor(point.level)}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-8 transition-all"
                onClick={() => setSelectedPoint(index === selectedPoint ? null : index)}
              />
            </g>
          ))}
        </svg>
        
        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-400">Open (0-3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-400">Neutral (4-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-400">Guarded (6-7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-400">Defensive (8-10)</span>
          </div>
        </div>
        
        {/* Selected Point Details */}
        {selected && (
          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: getResistanceColor(selected.level) }}
                ></div>
                <span className="text-white font-semibold">
                  {formatTime(selected.timestamp)} - {getResistanceLabel(selected.level)} ({selected.level}/10)
                </span>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-gray-400 text-sm min-w-[60px]">
                  {selected.speaker === 'user' ? 'You:' : 'Marcus:'}
                </span>
                <p className="text-gray-300 text-sm leading-relaxed">
                  "{selected.text}"
                </p>
              </div>
              
              {selected.emotion && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Marcus's mood:</span>
                  <span className="text-blue-400">{selected.emotion}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Insights */}
      <div className="mt-4 text-sm text-gray-400">
        <p>
          💡 <strong className="text-white">Tip:</strong> Click any point to see what was said at that moment
        </p>
      </div>
    </div>
  );
};
