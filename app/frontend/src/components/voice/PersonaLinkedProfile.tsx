import React from 'react';
import type { PersonaData } from './DualVoiceAgentFlow';
import { ArchetypeBadge } from './ArchetypeBadge';

interface PersonaLinkedProfileProps {
  persona: PersonaData;
  className?: string;
}

// Utility: get initials from full name
const getInitials = (name?: string) => {
  if (!name) return 'AI';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

// Fix common indefinite article issues (e.g., "A African" -> "An African")
const fixIndefiniteArticles = (text: string): string => {
  if (!text) return text;
  return text.replace(/\b([Aa])\s+([AEIOUaeiou])/g, (_m, a: string, v: string) => {
    return (a === 'A' ? 'An' : 'an') + ' ' + v;
  });
};

const PersonaLinkedProfile: React.FC<PersonaLinkedProfileProps> = ({ persona, className = '' }) => {
  const name = persona.name || 'Prospect';
  const role = persona.role || 'Professional';
  const company = persona.company || '';
  const roleText = company ? `${role} at ${company}` : role;

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Archetype Badge */}
      {persona.archetype_name && (
        <div className="flex justify-center">
          <ArchetypeBadge
            archetype_name={persona.archetype_name}
            archetype_emoji={persona.archetype_emoji}
            archetype_tagline={persona.archetype_tagline}
            vocal_quirks={persona.vocal_quirks}
            size="large"
            showQuirks={true}
          />
        </div>
      )}
      
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm p-5 flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {getInitials(name)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900">{name}</h3>
          <p className="text-gray-600 text-sm">{roleText}</p>
          
          {/* Demographics */}
          {(persona.age_range || persona.gender || persona.cultural_background) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {persona.age_range && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                  {persona.age_range} years old
                </span>
              )}
              {persona.gender && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded capitalize">
                  {persona.gender}
                </span>
              )}
              {persona.cultural_background && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                  {persona.cultural_background}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bio & Communication in Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Background */}
        {persona.about_person && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Background</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {fixIndefiniteArticles(persona.about_person)}
            </p>
          </div>
        )}
        
        {/* Communication Style */}
        {persona.communication_style && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Communication</h4>
            <p className="text-sm text-gray-700">
              {typeof persona.communication_style === 'string' 
                ? persona.communication_style 
                : `${persona.communication_style.formality_description || ''}, ${persona.communication_style.chattiness_description || ''}`.replace(/^,\s*/, '')}
            </p>
          </div>
        )}
      </div>

      {/* Pain Points */}
      {persona.pain_points && persona.pain_points.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">Current Challenges</h4>
          <ul className="space-y-2">
            {persona.pain_points.slice(0, 3).map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-red-600 mt-0.5 flex-shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Personality Traits */}
      {persona.personality_traits && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">Personality</h4>
          <div className="flex flex-wrap gap-2">
            {(typeof persona.personality_traits === 'string' ? 
              persona.personality_traits.split(',') : 
              Array.isArray(persona.personality_traits) ? persona.personality_traits : [persona.personality_traits]
            ).map((trait, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                {typeof trait === 'string' ? trait.trim() : trait}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaLinkedProfile;
