import React from 'react';
import { Button } from '@/components/ui/button';
import { Library, MessageCircleQuestion, ExternalLink } from 'lucide-react'; // Keep ExternalLink for now, target MessageCircleQuestion

export interface ResourceSpotlightCardProps {
  id: string;
  cardType: 'RESOURCE_SPOTLIGHT';
  skillArea: string;
  resourceTitle: string;
  resourceType: 'ARTICLE' | 'VIDEO' | 'MODULE';
  resourceUrl: string;
  summary?: string;
  priority?: number;
  onViewResource?: (url: string, title: string) => void;
}

const ResourceSpotlightCard: React.FC<ResourceSpotlightCardProps> = ({
  skillArea,
  resourceTitle,
  resourceType,
  resourceUrl,
  summary,
  onViewResource,
}) => {
  // Consistent color naming and theme with DataPointHighlightCard (neutral)
  const bgColor = 'bg-blue-50';
  const borderColor = 'border-blue-400';
  const textColor = 'text-blue-800';
  const accentColor = 'text-blue-600';
  const IconComponent = Library; // Icon for the header
  const cardTitle = "Resource Spotlight";

  const handleViewResource = () => {
    if (onViewResource) {
      onViewResource(resourceUrl, resourceTitle);
    } else {
      window.open(resourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const resourceTypeDisplay = resourceType.charAt(0) + resourceType.slice(1).toLowerCase();

  return (
    <div className={`p-2 md:p-3 ${bgColor} border-l-4 ${borderColor} rounded-lg shadow-md w-full max-w-2xl mx-auto my-1 transform transition-all hover:shadow-lg duration-300 ease-out`}>
      <div className="flex items-start mb-1">
        <IconComponent size={18} className={`${accentColor} mr-2.5 mt-1 flex-shrink-0`} />
        <div className="flex-grow">
          <h4 className={`text-sm font-semibold ${textColor}`}>{cardTitle}</h4>
          <p className={`text-xs ${textColor} opacity-80`}>
            Focus: <span className={`font-semibold ${textColor}`}>{skillArea}</span>
          </p>
        </div>
      </div>
      
      {/* Main content section for resource details */}
      <div className="text-center my-1">
        <h5 className={`text-xl font-bold ${accentColor} mb-0.5`}>{resourceTitle}</h5>
        <p className={`text-xs ${textColor} opacity-90 mb-1`}>Type: {resourceTypeDisplay}</p>
      </div>

      {summary && (
        <p className={`text-sm ${textColor} italic mb-1 text-center leading-relaxed`}>{summary}</p>
      )}

      <Button 
        onClick={handleViewResource}
        variant="outline"
        className={`w-full border-blue-500 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-medium py-1.5 px-4 rounded-md text-sm group mt-0.5`}
      >
        {/* Using ExternalLink here makes semantic sense for opening a resource */}
        <ExternalLink size={16} className="mr-1.5 transition-transform duration-300 group-hover:scale-110" />
        View {resourceTypeDisplay}
      </Button>
    </div>
  );
};

export default ResourceSpotlightCard; 