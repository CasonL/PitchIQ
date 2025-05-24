import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sparkles, // Positive
  AlertTriangle, // Negative
  TrendingUp, // Positive Trend
  TrendingDown, // Negative Trend
  Info, // Neutral / Informational
  MessageCircleQuestion, // Button Icon
  Award,
  ThumbsUp,
  Lightbulb
} from 'lucide-react';

export interface DataPointHighlightProps {
  id: string; // For React key
  cardType: 'DATA_POINT'; // Discriminated union type
  title: string;
  metricName: string;
  metricValue: string | number;
  targetValue?: string | number;
  unit?: string; // e.g., "%", "WPM"
  contextText?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  onUnderstand: (details: { metricName: string; metricValue: string | number; sentiment: string }) => void;
  iconOverride?: React.ElementType; // Allow specific icon override if needed
  priority?: number; // Added for sorting and prioritization
}

const DataPointHighlightCard: React.FC<DataPointHighlightProps> = ({
  title,
  metricName,
  metricValue,
  targetValue,
  unit,
  contextText,
  sentiment,
  onUnderstand,
  iconOverride,
}) => {
  let bgColor = 'bg-gray-50';
  let borderColor = 'border-gray-300';
  let textColor = 'text-gray-700';
  let accentColor = 'text-gray-600';
  let IconComponent = iconOverride || Info;

  switch (sentiment) {
    case 'positive':
      bgColor = 'bg-green-50';
      borderColor = 'border-green-400';
      textColor = 'text-green-800';
      accentColor = 'text-green-600';
      IconComponent = iconOverride || ThumbsUp; // Default positive icon
      break;
    case 'negative':
      bgColor = 'bg-red-50';
      borderColor = 'border-red-400';
      textColor = 'text-red-800';
      accentColor = 'text-red-600';
      IconComponent = iconOverride || AlertTriangle; // Default negative icon
      break;
    case 'neutral':
      bgColor = 'bg-blue-50';
      borderColor = 'border-blue-400';
      textColor = 'text-blue-800';
      accentColor = 'text-blue-600';
      IconComponent = iconOverride || Lightbulb; // Default neutral/insight icon
      break;
  }

  return (
    <div className={`p-2 md:p-3 ${bgColor} border-l-4 ${borderColor} rounded-lg shadow-md w-full max-w-2xl mx-auto my-1 transform transition-all hover:shadow-lg duration-300 ease-out`}>
      <div className="flex items-start mb-1">
        <IconComponent size={18} className={`${accentColor} mr-2.5 mt-1 flex-shrink-0`} />
        <div className="flex-grow">
          <h4 className={`text-sm font-semibold ${textColor}`}>{title}</h4>
          {metricName && (
            <p className={`text-xs text-gray-600 dark:text-gray-400`}>
              Focus: <span className={`font-semibold ${textColor}`}>{metricName}</span>
            </p>
          )}
        </div>
      </div>
      
      {metricValue !== undefined && metricValue !== null && (
        <p className={`text-xl font-bold ${accentColor} text-center my-1`}>
          {metricValue}{unit}
          {targetValue && <span className={`text-sm font-normal ${textColor} ml-1.5`}> (Target: {targetValue}{unit})</span>}
        </p>
      )}

      {contextText && (
        <p className={`text-sm ${textColor} italic mb-1 text-center leading-relaxed`}>{contextText}</p>
      )}

      <Button 
        onClick={() => onUnderstand({ metricName, metricValue, sentiment })}
        variant="outline"
        className={`w-full border-${sentiment === 'positive' ? 'green' : sentiment === 'negative' ? 'red' : 'blue'}-500 text-${sentiment === 'positive' ? 'green' : sentiment === 'negative' ? 'red' : 'blue'}-600 hover:bg-${sentiment === 'positive' ? 'green' : sentiment === 'negative' ? 'red' : 'blue'}-100 hover:text-${sentiment === 'positive' ? 'green' : sentiment === 'negative' ? 'red' : 'blue'}-700 font-medium py-1.5 px-4 rounded-md text-sm group mt-0.5`}
      >
        <MessageCircleQuestion size={16} className="mr-1.5 transition-transform duration-300 group-hover:rotate-[5deg]" />
        Understand This Data Point
      </Button>
    </div>
  );
};

export default DataPointHighlightCard; 