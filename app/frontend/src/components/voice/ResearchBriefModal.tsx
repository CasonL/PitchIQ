import React from 'react';
import { PersonaData } from './DualVoiceAgentFlow';

interface ResearchBriefModalProps {
  persona: PersonaData;
  onStartCall: () => void;
  onCancel?: () => void;
}

export const ResearchBriefModal: React.FC<ResearchBriefModalProps> = ({
  persona,
  onStartCall,
  onCancel
}) => {
  const brief = persona.research_brief;

  // If no research brief, just show basic info and start
  if (!brief) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Call?</h2>
          <div className="mb-6">
            <p className="text-lg"><strong>{persona.name}</strong></p>
            <p className="text-gray-600">{persona.role} at {persona.company}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onStartCall}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              📞 Start Call
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold mb-2">📋 Pre-Call Research Brief</h2>
          <p className="text-blue-100">Review what you discovered about your prospect before the call</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Prospect Info */}
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-600">
            <h3 className="text-xl font-bold text-gray-900">{persona.name}</h3>
            <p className="text-gray-600">{persona.role} at {persona.company}</p>
            {persona.industry && (
              <p className="text-sm text-gray-500 mt-1">Industry: {persona.industry}</p>
            )}
          </div>

          {/* Online Presence */}
          {brief.online_presence && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                What You Found Online
              </h4>
              <div className="space-y-2 pl-8">
                {brief.online_presence.website_info && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 font-medium">📄 Website:</span>
                    <p className="text-gray-700">{brief.online_presence.website_info}</p>
                  </div>
                )}
                {brief.online_presence.social_media_status && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 font-medium">📱 Social Media:</span>
                    <p className="text-gray-700">{brief.online_presence.social_media_status}</p>
                  </div>
                )}
                {brief.online_presence.review_summary && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 font-medium">⭐ Reviews:</span>
                    <p className="text-gray-700">{brief.online_presence.review_summary}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business Intelligence */}
          {brief.business_intelligence && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Business Context
              </h4>
              <div className="space-y-2 pl-8">
                {brief.business_intelligence.years_in_business && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">📅</span>
                    <p className="text-gray-700">{brief.business_intelligence.years_in_business}</p>
                  </div>
                )}
                {brief.business_intelligence.location_context && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">📍</span>
                    <p className="text-gray-700">{brief.business_intelligence.location_context}</p>
                  </div>
                )}
                {brief.business_intelligence.competitive_position && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">🏆</span>
                    <p className="text-gray-700">{brief.business_intelligence.competitive_position}</p>
                  </div>
                )}
                {brief.business_intelligence.growth_indicators && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">📈</span>
                    <p className="text-gray-700">{brief.business_intelligence.growth_indicators}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {brief.opportunity_signals && brief.opportunity_signals.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Opportunities You Spotted
              </h4>
              <div className="space-y-2 pl-8">
                {brief.opportunity_signals.map((signal, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-green-600 font-bold">→</span>
                    <p className="text-gray-700">{signal}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red Flags */}
          {brief.red_flags && brief.red_flags.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-orange-700 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Watch Out For
              </h4>
              <div className="space-y-2 pl-8">
                {brief.red_flags.map((flag, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-orange-600 font-bold">!</span>
                    <p className="text-gray-700">{flag}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talking Points */}
          {brief.talking_points && brief.talking_points.length > 0 && (
            <div className="space-y-3 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <h4 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <span className="text-2xl">💬</span>
                Suggested Opening Hooks
              </h4>
              <div className="space-y-3 pl-8">
                {brief.talking_points.map((point, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border-l-4 border-blue-500 shadow-sm">
                    <p className="text-gray-800 font-medium italic">"{point}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 rounded-b-2xl flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onStartCall}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            📞 Start Call
          </button>
        </div>
      </div>
    </div>
  );
};
