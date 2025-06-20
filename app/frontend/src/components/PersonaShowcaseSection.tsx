import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Zap, Target, Users, Sparkles, Play, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

const personaData = [
  {
    name: "Sales Development Rep (SDR)",
    icon: <Zap size={28} className="text-pitchiq-red" />,
    description: "Master outreach, objection handling, and book more qualified meetings with AI-powered practice.",
    details: [
      "Practice cold calls & email sequences",
      "Get instant feedback on your tone & clarity",
      "Learn to overcome common objections effectively",
      "Improve your qualification skills"
    ],
    color: "red"
  },
  {
    name: "Account Executive (AE)",
    icon: <Target size={28} className="text-pitchiq-blue" />,
    description: "Refine your discovery calls, product demos, and closing techniques to seal more deals.",
    details: [
      "Perfect your discovery call questions",
      "Deliver compelling and concise product demos",
      "Practice negotiation and closing strategies",
      "Analyze your sales conversations for improvement"
    ],
    color: "blue"
  },
  {
    name: "Sales Manager",
    icon: <Users size={28} className="text-pitchiq-green" />,
    description: "Equip your team with consistent, high-quality training and track their progress effortlessly.",
    details: [
      "Create custom training scenarios for your team",
      "Monitor individual and team performance",
      "Identify skill gaps and provide targeted coaching",
      "Standardize your sales methodology"
    ],
    color: "green"
  }
];

interface PersonaShowcaseSectionProps {
  onOpenEmailModal: () => void;
}

const PersonaShowcaseSection: React.FC<PersonaShowcaseSectionProps> = ({ onOpenEmailModal }) => {
  const [activePersona, setActivePersona] = useState(0);
  const [expandedPersonas, setExpandedPersonas] = useState<number[]>([]);
  const [personaShowMoreStates, setPersonaShowMoreStates] = useState<{[key: number]: boolean}>({});

  const handleTriggerEmailSignup = () => {
    onOpenEmailModal();
    // Modal handles highlight dispatch
  };

  const togglePersonaExpansion = (index: number) => {
    setExpandedPersonas(prev => {
      if (prev.includes(index)) {
        return [];
      }
      return [index];
    });
    
    if (!expandedPersonas.includes(index)) {
      setPersonaShowMoreStates(prev => ({
        ...prev,
        [index]: false
      }));
    }
  };

  const setPersonaShowMore = (index: number, show: boolean) => {
    setPersonaShowMoreStates(prev => ({
      ...prev,
      [index]: show
    }));
  };

  return (
    <section id="personas" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Train for Your Specific Role
          </h2>
          <p className="mt-4 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Pitch IQ offers tailored practice scenarios for every member of your sales team, from SDRs to seasoned AEs and managers.
          </p>
        </div>

        {/* Desktop Layout: Tabs and Content */}
        <div className="hidden lg:flex gap-8">
          {/* Left: Tab Buttons */}
          <div className="w-1/3 space-y-4">
            {personaData.map((persona, index) => (
              <button
                key={persona.name}
                onClick={() => setActivePersona(index)}
                className={`w-full text-left p-6 rounded-lg transition-all duration-200 ease-in-out transform hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 group 
                  ${activePersona === index 
                    ? `bg-pitchiq-${persona.color}/10 text-pitchiq-${persona.color} ring-pitchiq-${persona.color}` 
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 ring-transparent"}
                `}
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg bg-pitchiq-${persona.color}/20 mr-4 group-hover:scale-110 transition-transform duration-200`}>
                    {React.cloneElement(persona.icon as React.ReactElement, { className: `text-pitchiq-${persona.color}`})}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{persona.name}</h3>
                  </div>
                </div>
                {activePersona === index && (
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                    {persona.description}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Right: Content Area */}
          <div className="w-2/3 bg-gray-50 p-8 rounded-lg shadow-lg">
            {personaData.map((persona, index) => (
              <div key={persona.name} className={`${activePersona === index ? "block" : "hidden"}`}>
                <div className="flex items-start mb-6">
                    <div className={`p-4 rounded-lg bg-pitchiq-${persona.color}/20 mr-6`}>
                        {React.cloneElement(persona.icon as React.ReactElement, { size: 36, className: `text-pitchiq-${persona.color}`})}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{persona.name}</h3>
                        <p className="text-gray-600 text-md leading-relaxed">{persona.description}</p>
                    </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {persona.details.slice(0, personaShowMoreStates[index] ? persona.details.length : 3).map((detail, i) => (
                    <li key={i} className="flex items-start">
                      <Play size={18} className={`text-pitchiq-${persona.color} mr-3 mt-1 flex-shrink-0`} />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
                {persona.details.length > 3 && (
                  <Button 
                    variant="link"
                    onClick={() => setPersonaShowMore(index, !personaShowMoreStates[index])}
                    className={`text-pitchiq-${persona.color} hover:text-pitchiq-${persona.color}/80 px-0 text-sm`}
                  >
                    {personaShowMoreStates[index] ? "Show Less" : "Show More Features"}
                    {personaShowMoreStates[index] ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet Layout: Accordion Style */}
        <div className="lg:hidden space-y-4">
          {personaData.map((persona, index) => (
            <div key={persona.name} className={`rounded-lg border border-gray-200 overflow-hidden 
              ${expandedPersonas.includes(index) ? `bg-pitchiq-${persona.color}/5` : 'bg-white'}
            `}>
              <button
                onClick={() => togglePersonaExpansion(index)}
                className="w-full text-left p-4 sm:p-6 focus:outline-none transition-colors duration-200 ease-in-out"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 sm:p-3 rounded-lg bg-pitchiq-${persona.color}/20 mr-3 sm:mr-4`}>
                      {React.cloneElement(persona.icon as React.ReactElement, { className: `text-pitchiq-${persona.color}`})}
                    </div>
                    <h3 className="text-md sm:text-lg font-semibold text-gray-900">{persona.name}</h3>
                  </div>
                  {expandedPersonas.includes(index) ? 
                    <ChevronUp size={20} className={`text-pitchiq-${persona.color}`} /> : 
                    <ChevronDown size={20} className="text-gray-500" />
                  }
                </div>
                {/* Content of the button (like persona.description) is omitted for now */}
              </button>
              {expandedPersonas.includes(index) && (
                <div className="p-4 sm:p-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">{persona.description}</p>
                  <ul className="space-y-2 mb-4">
                    {persona.details.slice(0, personaShowMoreStates[index] ? persona.details.length : 3).map((detail, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <Play size={16} className={`text-pitchiq-${persona.color} mr-2.5 mt-0.5 flex-shrink-0`} />
                        <span className="text-gray-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {persona.details.length > 3 && (
                    <Button 
                      variant="link"
                      onClick={(e) => { e.stopPropagation(); setPersonaShowMore(index, !personaShowMoreStates[index]); }}
                      className={`text-pitchiq-${persona.color} hover:text-pitchiq-${persona.color}/80 px-0 text-xs`}
                    >
                      {personaShowMoreStates[index] ? "Show Less Details" : "Show More Details"}
                      {personaShowMoreStates[index] ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg md:text-xl text-gray-700 mb-6">
            Ready to see how Pitch IQ can transform your sales skills?
          </p>
          <Button 
            size="lg" 
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-lg px-10 py-3 group"
            onClick={handleTriggerEmailSignup}
          >
            Get Early Access 
            <ChevronRight size={22} className="ml-2 -mr-1 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PersonaShowcaseSection; 