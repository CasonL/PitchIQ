/**
 * LearnMoreModal.tsx
 * Educational modal explaining scenario value propositions
 */

import React from 'react';
import { MarcusScenario } from './MarcusScenarios';

interface LearnMoreModalProps {
  scenario: MarcusScenario;
  onClose: () => void;
}

interface EducationSection {
  heading: string;
  content?: string;
  bullets?: string[];
  highlight?: boolean;
}

interface ScenarioEducation {
  title: string;
  sections: EducationSection[];
}

const getScenarioEducation = (scenarioId: string): ScenarioEducation | null => {
  switch (scenarioId) {
    case 'website-audit':
      return {
        title: 'Why Website Refresh Matters',
        sections: [
          {
            heading: 'Your Website is Your First Impression',
            content: 'Before a prospect ever picks up the phone, they\'re researching you online. Your website communicates whether you\'re **current, credible, and worth their time**.'
          },
          {
            heading: 'An outdated website costs you',
            bullets: [
              'Lost trust - prospects question if you can deliver modern solutions',
              'Missed opportunities - potential clients leave before contacting you',
              'Competitive disadvantage - rivals with better sites win before you compete',
              'Wasted marketing - ads and referrals bounce off a poor website experience'
            ]
          },
          {
            heading: 'What a Modern Website Delivers',
            bullets: [
              'Credibility that converts visitors into leads',
              'Clear value proposition that differentiates you',
              'Mobile-friendly experience that matches how people research',
              'Foundation for growth - SEO, content marketing, automation'
            ]
          },
          {
            heading: 'The Real Cost',
            content: 'It\'s not about aesthetics. It\'s about **every prospect who researched you and chose someone else** because your website didn\'t earn their trust. That\'s revenue walking away before you ever knew they existed.',
            highlight: true
          }
        ]
      };
    case 'promotional-swag':
      return {
        title: 'Why Promotional Materials Matter',
        sections: [
          {
            heading: 'Retention is Cheaper Than Acquisition',
            content: 'Acquiring a new customer costs **5-25x more** than keeping an existing one. Promotional materials aren\'t "nice-to-have" - they\'re a retention and relationship tool.'
          },
          {
            heading: 'What Thoughtful Gifts Actually Do',
            bullets: [
              'Keep your brand visible daily (coffee mugs, notebooks, desk items)',
              'Strengthen relationships through thoughtful gestures at key moments',
              'Trigger conversations and referrals ("Where\'d you get that?")',
              'Show appreciation that builds loyalty beyond transactions'
            ]
          },
          {
            heading: 'The Business Impact',
            bullets: [
              'Repeat business - clients remember who valued them',
              'Referrals - branded items spark organic conversations',
              'Top-of-mind awareness - when they need you again, they think of you first',
              'Differentiation - thoughtful gifts set you apart from competitors who do nothing'
            ]
          },
          {
            heading: 'The Real Value',
            content: 'This isn\'t about mugs or pens. It\'s about **staying connected, building loyalty, and turning one-time buyers into long-term partners**. That\'s how businesses grow without constantly chasing new leads.',
            highlight: true
          }
        ]
      };
    default:
      return null;
  }
};

export const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ scenario, onClose }) => {
  const education = getScenarioEducation(scenario.id);
  
  if (!education) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {education.title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-6">
            {education.sections.map((section, idx) => (
              <div key={idx} className={section.highlight ? 'bg-red-50 p-4 rounded-lg border-l-4 border-red-600' : ''}>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {section.heading}
                </h3>
                {section.content && (
                  <p className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ 
                    __html: section.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-red-600">$1</strong>') 
                  }} />
                )}
                {section.bullets && (
                  <ul className="mt-2 space-y-2">
                    {section.bullets.map((bullet, bulletIdx) => (
                      <li key={bulletIdx} className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">•</span>
                        <span className="text-gray-700">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
