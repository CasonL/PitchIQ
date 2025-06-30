import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  MessageCircle,
  Phone,
  RefreshCw
} from 'lucide-react';
import { PersonaData, UserProductInfo } from './DualVoiceAgentFlow';

interface PersonaDisplayCardProps {
  persona: PersonaData;
  userProductInfo: UserProductInfo;
  onStartCall: () => void;
  onRegenerate: () => void;
}

export const PersonaDisplayCard: React.FC<PersonaDisplayCardProps> = ({
  persona,
  userProductInfo,
  onStartCall,
  onRegenerate
}) => {
  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Your AI Prospect is Ready!
        </h2>
        <p className="text-gray-600">
          Meet your practice partner - get ready to pitch your {userProductInfo.product}
        </p>
      </div>

      {/* Persona Card */}
      <Card className="flex-1 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">{persona.name}</CardTitle>
                <p className="text-gray-600">{persona.role} at {persona.company}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              {persona.industry}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Business Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Building className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-800">Company Context</h4>
                  <p className="text-sm text-gray-600">{persona.business_details}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-800">Primary Concern</h4>
                  <p className="text-sm text-gray-600">{persona.primary_concern}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <User className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-800">About {persona.name.split(' ')[0]}</h4>
                  <p className="text-sm text-gray-600">{persona.about_person}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <MessageCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-800">Communication Style</h4>
                  <p className="text-sm text-gray-600">{persona.communication_style}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pain Points */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Target className="w-5 h-5 text-red-600" />
              <h4 className="font-medium text-gray-800">Key Pain Points</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {persona.pain_points.map((pain, index) => (
                <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                  {pain}
                </Badge>
              ))}
            </div>
          </div>

          {/* Decision Factors */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-gray-800">Decision Factors</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {persona.decision_factors.map((factor, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-gray-800 mb-2">Ready to Practice?</h4>
            <p className="text-sm text-gray-600 mb-4">
              {persona.name} is waiting for your call. They're interested in solutions for {persona.primary_concern.toLowerCase()}, 
              but they'll need convincing. Use what you know about their pain points and decision factors to craft your pitch!
            </p>
            
            <div className="flex space-x-3">
              <Button 
                onClick={onStartCall}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Phone className="w-4 h-4 mr-2" />
                Start Sales Call
              </Button>
              
              <Button 
                onClick={onRegenerate}
                variant="outline"
                className="px-4"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">💡 Sales Tips</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Start with rapport building - {persona.name} appreciates {persona.communication_style.toLowerCase()} communication</li>
          <li>• Address their main concern: {persona.primary_concern.toLowerCase()}</li>
          <li>• Focus on decision factors: {persona.decision_factors.slice(0, 2).join(' and ')}</li>
          <li>• Be prepared to handle objections about: {persona.pain_points.slice(0, 2).join(' and ')}</li>
        </ul>
      </div>
    </div>
  );
};

export default PersonaDisplayCard; 