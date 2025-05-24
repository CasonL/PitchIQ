import React from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles, MessageCircleQuestion, Search } from 'lucide-react'; // Keep Search for now, but MessageCircleQuestion is the target

export interface KeyMomentCardProps {
  id: string;
  cardType: 'KEY_MOMENT';
  momentType: 'BRILLIANCE' | 'LEARNING_OPPORTUNITY';
  quote: string;
  speaker: 'User' | 'AI' | 'Client';
  skillArea?: string;
  explanation: string;
  priority?: number;
  onExploreMoment?: (quote: string, skillArea?: string) => void;
}

const KeyMomentCard: React.FC<KeyMomentCardProps> = ({
  momentType,
  quote,
  speaker,
  skillArea,
  explanation,
  onExploreMoment,
}) => {
  const isBrilliance = momentType === 'BRILLIANCE';
  const IconComponent = isBrilliance ? Sparkles : Lightbulb;
  // Consistent color naming with DataPointHighlightCard
  let bgColor = isBrilliance ? 'bg-green-50' : 'bg-orange-50'; // Brilliance = positive (green), Learning = neutral/negative-ish (orange)
  let borderColor = isBrilliance ? 'border-green-400' : 'border-orange-400';
  let textColor = isBrilliance ? 'text-green-800' : 'text-orange-800';
  let accentColor = isBrilliance ? 'text-green-600' : 'text-orange-600';
  const cardTitle = isBrilliance ? "Moment of Brilliance!" : "Learning Opportunity";

  // If Learning Opportunity should be styled like 'negative' from DataPointHighlightCard:
  if (!isBrilliance) {
    bgColor = 'bg-red-50';
    borderColor = 'border-red-400';
    textColor = 'text-red-800';
    accentColor = 'text-red-600';
  }

  return (
    <div className={`p-2 md:p-3 ${bgColor} border-l-4 ${borderColor} rounded-lg shadow-md w-full max-w-2xl mx-auto my-1 transform transition-all hover:shadow-lg duration-300 ease-out`}>
      <div className="flex items-start mb-1">
        <IconComponent size={18} className={`${accentColor} mr-2.5 mt-1 flex-shrink-0`} />
        <div className="flex-grow">
          <h4 className={`text-sm font-semibold ${textColor}`}>{cardTitle}</h4>
          {skillArea && (
            <p className={`text-xs ${textColor} opacity-80`}> {/* Adjusted opacity class for consistency if needed */}
              Focus: <span className={`font-semibold ${textColor}`}>{skillArea}</span>
            </p>
          )}
        </div>
      </div>
      
      {/* Main content section for quote and explanation */}
      <div className="text-center my-1">
        <blockquote className="mb-1 p-2 rounded-md inline-block">
          <p className={`text-base italic ${textColor} opacity-90 leading-relaxed`}>"{quote}"</p>
          <cite className="block text-xs text-gray-500 mt-0.5 text-right">- {speaker}</cite>
        </blockquote>
      </div>

      {explanation && (
        <p className={`text-sm ${textColor} italic mb-1 text-center leading-relaxed`}>{explanation}</p>
      )}

      {onExploreMoment && (
        <Button 
          onClick={() => onExploreMoment(quote, skillArea)}
          variant="outline"
          className={`w-full border-${isBrilliance ? 'green' : 'red'}-500 text-${isBrilliance ? 'green' : 'red'}-600 hover:bg-${isBrilliance ? 'green' : 'red'}-100 hover:text-${isBrilliance ? 'green' : 'red'}-700 font-medium py-1.5 px-4 rounded-md text-sm group mt-0.5`}
        >
          <MessageCircleQuestion size={16} className="mr-1.5 transition-transform duration-300 group-hover:rotate-[5deg]" />
          Explore This Moment
        </Button>
      )}
    </div>
  );
};

export default KeyMomentCard; 