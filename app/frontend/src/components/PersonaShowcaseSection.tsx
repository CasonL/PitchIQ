import React, { useState } from "react";
import { Brain, Users, Target, Zap, ChevronRight, Play, Sparkles, ChevronDown, ChevronUp, Clock, DollarSign, MessageSquare, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const PersonaShowcaseSection = () => {
  const [activePersona, setActivePersona] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [expandedPersonas, setExpandedPersonas] = useState<number[]>([]);
  const [personaShowMoreStates, setPersonaShowMoreStates] = useState<{[key: number]: boolean}>({});

  const scrollToEmailSignup = () => {
    // Find all elements with email-signup ID
    const elements = document.querySelectorAll('#email-signup');
    let targetElement = null;
    
    // Find the one in the hero section (not the bottom section)
    elements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const parentSection = element.closest('section');
      
      // Check if it's visible and in the hero section (has min-h-screen class)
      if (styles.display !== 'none' && parentSection?.classList.contains('min-h-screen')) {
        targetElement = element;
      }
    });
    
    // If no hero section email found, fall back to any visible one
    if (!targetElement) {
      elements.forEach((element) => {
        const styles = window.getComputedStyle(element);
        if (styles.display !== 'none') {
          targetElement = element;
        }
      });
    }
    
    if (targetElement) {
      // Get current scroll position to avoid cumulative errors
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const elementRect = targetElement.getBoundingClientRect();
      const elementTop = elementRect.top + currentScrollY;
      
      // Use a fixed offset that works well for both mobile and desktop
      const isMobile = window.innerWidth < 768;
      const offset = isMobile ? 80 : 100;
      const targetScrollY = elementTop - offset;
      
      // Ensure we don't scroll past the top of the page
      const finalScrollY = Math.max(0, targetScrollY);
      
      window.scrollTo({
        top: finalScrollY,
        behavior: 'smooth'
      });

      // Trigger highlight effect after scroll completes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('highlightEmailSignup'));
      }, 800); // Delay to allow scroll to complete
    }
  };

  const togglePersonaExpansion = (index: number) => {
    setExpandedPersonas(prev => {
      // If clicking the currently expanded persona, collapse it
      if (prev.includes(index)) {
        return [];
      }
      // Otherwise, expand only this persona (collapse all others)
      return [index];
    });
    
    // Also reset the "show more" state when switching personas
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

  const personaExamples = [
    {
      name: "Sarah Chen",
      role: "VP of Operations",
      company: "TechFlow Solutions",
      industry: "SaaS",
      personality: "Analytical, Budget-Conscious, Detail-Oriented",
      painPoints: ["Manual processes eating up team time", "Struggling to scale operations", "Need ROI justification for every purchase"],
      objections: ["Price concerns", "Implementation timeline", "Integration complexity"],
      decisionStyle: "Data-driven, seeks consensus, risk-averse",
      background: "Based on your 'B2B SaaS' audience targeting operations leaders",
      color: "blue",
      // Extended details for "Show More"
      communicationStyle: "Prefers detailed emails over calls, asks for written proposals, responds within 24-48 hours during business days",
      buyingTriggers: ["Quarterly efficiency reviews", "Board pressure to reduce costs", "Competitor gaining market advantage"],
      negotiationTactics: "Requests multiple vendor comparisons, leverages budget constraints, seeks volume discounts",
      personalMotivations: "Career advancement through operational excellence, recognition from C-suite for cost savings",
      decisionTimeline: "3-6 month evaluation cycle, requires 3+ stakeholder approvals",
      budgetAuthority: "$50K individual approval, $200K+ requires CFO sign-off",
      preferredMeetingStyle: "Structured agendas, data-heavy presentations, follow-up action items",
      stressPoints: "End-of-quarter pressure, integration failures, team resistance to change",
      successMetrics: "20% efficiency improvement, 15% cost reduction, zero downtime during implementation"
    },
    {
      name: "Marcus Rodriguez", 
      role: "Small Business Owner",
      company: "Rodriguez Construction",
      industry: "Construction",
      personality: "Practical, Time-Pressed, Relationship-Focused",
      painPoints: ["Paperwork taking away from actual work", "Crew scheduling nightmares", "Cash flow visibility issues"],
      objections: ["Too complicated for my team", "Don't have time to learn new systems", "What if it breaks?"],
      decisionStyle: "Quick decisions, values simplicity, trusts recommendations",
      background: "Based on your 'Small Business' targeting with construction focus",
      color: "orange",
      // Extended details for "Show More"
      communicationStyle: "Prefers phone calls over emails, available early mornings or evenings, speaks in practical terms",
      buyingTriggers: ["Losing money on inefficient processes", "Crew complaints about tools", "Seasonal business pressures"],
      negotiationTactics: "Asks for references from similar businesses, negotiates payment terms, wants trial periods",
      personalMotivations: "Family business legacy, crew loyalty, community reputation",
      decisionTimeline: "2-4 weeks max, makes gut decisions quickly",
      budgetAuthority: "Full authority up to $25K, discusses larger purchases with spouse/partner",
      preferredMeetingStyle: "On-site visits, hands-on demos, sees actual results",
      stressPoints: "Weather delays, equipment breakdowns, cash flow gaps",
      successMetrics: "Saves 2+ hours daily, crew adoption within 1 week, pays for itself in 6 months"
    },
    {
      name: "Dr. Jennifer Walsh",
      role: "Practice Manager", 
      company: "Westside Medical Group",
      industry: "Healthcare",
      personality: "Compliance-Focused, Patient-Centric, Cautious",
      painPoints: ["Patient data security concerns", "Staff efficiency bottlenecks", "Regulatory compliance headaches"],
      objections: ["HIPAA compliance questions", "Staff training requirements", "Patient privacy concerns"],
      decisionStyle: "Thorough evaluation, seeks multiple opinions, compliance-first",
      background: "Based on your 'Healthcare' targeting with compliance emphasis",
      color: "green",
      // Extended details for "Show More"
      communicationStyle: "Formal written communication, requires documentation, prefers scheduled calls",
      buyingTriggers: ["Regulatory audit findings", "Patient satisfaction scores", "Staff turnover issues"],
      negotiationTactics: "Demands compliance certifications, requires extensive security documentation, seeks peer references",
      personalMotivations: "Patient care quality, regulatory compliance, staff satisfaction",
      decisionTimeline: "6-12 months, extensive vetting process, pilot programs required",
      budgetAuthority: "$15K individual approval, larger purchases need physician partner approval",
      preferredMeetingStyle: "Compliance-focused presentations, security demonstrations, staff impact assessments",
      stressPoints: "Audit preparations, patient complaints, staff training gaps",
      successMetrics: "100% compliance maintained, 25% reduction in administrative time, staff satisfaction improvement"
    }
  ];

  const currentPersona = personaExamples[activePersona];

  // Reusable component for persona details
  const PersonaDetails = ({ persona, isMobile = false, showMoreState, setShowMoreState }: { 
    persona: typeof personaExamples[0], 
    isMobile?: boolean,
    showMoreState: boolean,
    setShowMoreState: (show: boolean) => void
  }) => (
    <div className={`space-y-4 md:space-y-6 ${isMobile ? 'pt-4' : ''}`}>
      {/* Header - only show on mobile dropdowns */}
      {isMobile && (
        <div className="flex items-center gap-3 md:gap-4 mb-4">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-${persona.color}-100 flex items-center justify-center`}>
            <Users className={`h-5 w-5 md:h-6 md:w-6 text-${persona.color}-600`} />
          </div>
          <div>
            <h4 className="text-lg md:text-xl font-bold">{persona.name}</h4>
            <p className="text-sm text-foreground/70">{persona.role}</p>
            <p className="text-xs text-foreground/60">{persona.company}</p>
          </div>
        </div>
      )}

      {/* Basic Info - Always Visible */}
      <div>
        <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60 mb-2">Personality Traits</h4>
        <p className="text-sm md:text-base text-foreground/80">{persona.personality}</p>
      </div>

      <div>
        <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60 mb-2">Key Pain Points</h4>
        <ul className="space-y-1.5 md:space-y-2">
          {persona.painPoints.map((pain, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-pitchiq-red rounded-full mt-2 flex-shrink-0" />
              <span className="text-xs md:text-sm text-foreground/80">{pain}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60 mb-2">Common Objections</h4>
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {persona.objections.map((objection, index) => (
            <span key={index} className="px-2 md:px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs md:text-sm">
              "{objection}"
            </span>
          ))}
        </div>
      </div>

      {/* Show More Content */}
      {showMoreState && (
        <div className="space-y-4 md:space-y-6 border-t pt-4 md:pt-6 animate-fade-in">
          {/* Communication Style */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
              <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60">Communication Style</h4>
            </div>
            <p className="text-xs md:text-sm text-foreground/80">{persona.communicationStyle}</p>
          </div>

          {/* Buying Triggers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
              <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60">Buying Triggers</h4>
            </div>
            <ul className="space-y-1">
              {persona.buyingTriggers.map((trigger, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-foreground/80">{trigger}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Budget & Authority */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60">Budget Authority</h4>
              </div>
              <p className="text-xs md:text-sm text-foreground/80">{persona.budgetAuthority}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60">Decision Timeline</h4>
              </div>
              <p className="text-xs md:text-sm text-foreground/80">{persona.decisionTimeline}</p>
            </div>
          </div>

          {/* Personal Motivations */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
              <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60">Personal Motivations</h4>
            </div>
            <p className="text-xs md:text-sm text-foreground/80">{persona.personalMotivations}</p>
          </div>

          {/* Negotiation Tactics */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
              <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-foreground/60">Negotiation Tactics</h4>
            </div>
            <p className="text-xs md:text-sm text-foreground/80">{persona.negotiationTactics}</p>
          </div>

          {/* Success Metrics */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
            <h4 className="font-semibold text-xs md:text-sm uppercase tracking-wide text-green-700 mb-2">Success Metrics</h4>
            <p className="text-green-800 text-xs md:text-sm">{persona.successMetrics}</p>
          </div>
        </div>
      )}

      {/* Show More/Less Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setShowMoreState(!showMoreState)}
          className="w-full flex items-center justify-center gap-2 text-sm"
        >
          {showMoreState ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {isMobile ? 'Show Less' : 'Show Less Details'}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {isMobile ? 'Show Even More' : 'Show More Details'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 xl:px-20">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-pitchiq-red/10 text-pitchiq-red px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium mb-4">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
            AI Persona Generation
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 px-2">
            Meet Your AI-Generated Prospects
          </h2>
          <p className="text-base md:text-lg text-foreground/70 max-w-3xl mx-auto px-4">
            Based on your 5-step onboarding, our AI creates buyer personas so realistic, you'll forget you're practicing. 
            Each persona has unique personalities, industry-specific challenges, and authentic objection patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* Mobile: Dropdown Cards */}
          <div className="lg:hidden space-y-3 md:space-y-4">
            <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 px-2">Choose a persona type to explore:</h3>
            {personaExamples.map((persona, index) => {
              const isExpanded = expandedPersonas.includes(index);
              const personaShowMore = personaShowMoreStates[index] || false;
              
              return (
                <div
                  key={index}
                  className={`rounded-lg md:rounded-xl border-2 transition-all duration-300 mx-2 md:mx-0 ${
                    isExpanded
                      ? `border-${persona.color}-500 bg-${persona.color}-50`
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Card Header - Always Visible */}
                  <div
                    onClick={() => togglePersonaExpansion(index)}
                    className="p-3 md:p-4 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-base md:text-lg">{persona.name}</h4>
                        <p className="text-sm md:text-base text-foreground/70">{persona.role} • {persona.industry}</p>
                        <p className="text-xs md:text-sm text-foreground/60 mt-1">{persona.background}</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Dropdown Content */}
                  {isExpanded && (
                    <div className="px-3 md:px-4 pb-3 md:pb-4 border-t border-gray-200">
                      <PersonaDetails 
                        persona={persona} 
                        isMobile={true} 
                        showMoreState={personaShowMore} 
                        setShowMoreState={(show) => setPersonaShowMore(index, show)} 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: Original Layout */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8 md:gap-12 items-start col-span-full">
            {/* Left: Persona Selection */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 px-2">Choose a persona type to explore:</h3>
              {personaExamples.map((persona, index) => (
                <div
                  key={index}
                  onClick={() => setActivePersona(index)}
                  className={`p-3 md:p-4 rounded-lg md:rounded-xl border-2 cursor-pointer transition-all duration-300 mx-2 md:mx-0 ${
                    activePersona === index
                      ? `border-${persona.color}-500 bg-${persona.color}-50`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-base md:text-lg">{persona.name}</h4>
                      <p className="text-sm md:text-base text-foreground/70">{persona.role} • {persona.industry}</p>
                      <p className="text-xs md:text-sm text-foreground/60 mt-1">{persona.background}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 md:h-5 md:w-5 transition-transform ${activePersona === index ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Detailed Persona View */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border p-6 md:p-8 mx-2 md:mx-0">
              <div className="flex items-center gap-3 md:gap-4 mb-6">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full bg-${currentPersona.color}-100 flex items-center justify-center`}>
                  <Users className={`h-6 w-6 md:h-8 md:w-8 text-${currentPersona.color}-600`} />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold">{currentPersona.name}</h3>
                  <p className="text-sm md:text-base text-foreground/70">{currentPersona.role}</p>
                  <p className="text-xs md:text-sm text-foreground/60">{currentPersona.company}</p>
                </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                <PersonaDetails persona={currentPersona} isMobile={false} showMoreState={showMore} setShowMoreState={(show) => setShowMore(show)} />
              </div>

              {/* CTA */}
              <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t">
                <div className="flex items-center gap-3">
                  <Play className="h-4 w-4 md:h-5 md:w-5 text-pitchiq-red" />
                  <span className="text-xs md:text-sm text-foreground/70">Ready to practice with {currentPersona.name}?</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 md:mt-16">
          <div className="bg-gradient-to-r from-pitchiq-red/5 to-blue-500/5 rounded-xl md:rounded-2xl p-6 md:p-8 mx-2 md:mx-0">
            <h3 className="text-xl md:text-2xl font-bold mb-3">Your Personas Will Be Even More Specific</h3>
            <p className="text-sm md:text-base text-foreground/70 mb-6 max-w-2xl mx-auto">
              These are just examples. When you complete our 5-step onboarding, the AI creates personas specifically tailored to your product, industry, and target market—with this level of detail and more.
            </p>
            <Button size="lg" className="bg-pitchiq-red hover:bg-pitchiq-red/90 w-full px-4 sm:px-8 sm:w-auto" onClick={scrollToEmailSignup}>
              Reserve My Spot
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PersonaShowcaseSection; 