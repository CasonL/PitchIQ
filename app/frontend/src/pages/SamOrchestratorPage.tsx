import React, { useEffect, useRef, useState } from "react";
import SamCoachIntroSimple from "@/components/voice/samcoach/SamCoachIntroSimple";
import PersonaGenerationCard from "@/components/voice/PersonaGenerationCard";
import PersonaLinkedProfile from "@/components/voice/PersonaLinkedProfile";
import ProspectAgent from "@/components/voice/ProspectAgent";
import type { PersonaData } from "@/components/voice/DualVoiceAgentFlow";
import { useSimpleLog } from "@/hooks/useSimpleLog";
import ManualAnswerForms, { type PersonaExtras } from "@/components/voice/samcoach/ManualAnswerForms";
import type { StepId } from "@/components/voice/samcoach/flow";
import { ResearchBriefModal } from "@/components/voice/ResearchBriefModal";

const SamOrchestratorPage: React.FC = () => {
  const [handoff, setHandoff] = useState<{ product: string; audience: string; product_extras?: any; audience_extras?: any } | null>(null);
  const [personaDebug, setPersonaDebug] = useState<{
    request: { product_service: string; target_market: string };
    api: any;
    mapped: PersonaData;
  } | null>(null);
  const { log } = useSimpleLog("SamOrchestratorPage");
  const [step, setStep] = useState<StepId | null>(null);
  const [callStarted, setCallStarted] = useState(false);
  const [showResearchBrief, setShowResearchBrief] = useState(false);
  const controlsRef = useRef<{ submitProduct: (p: string, e: PersonaExtras) => void; submitAudience: (a: string, e: PersonaExtras) => void; confirmProduct?: (p: string, e?: PersonaExtras) => void; confirmAudience?: (a: string, e?: PersonaExtras) => void } | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [audienceFormOpen, setAudienceFormOpen] = useState(false);
  const [productText, setProductText] = useState<string>("");
  const [audienceText, setAudienceText] = useState<string>("");
  // Prefill states for AI-assisted confirmation
  const [prefillProduct, setPrefillProduct] = useState<string | null>(null);
  const [prefillAudience, setPrefillAudience] = useState<{ text?: string; extras?: PersonaExtras } | null>(null);
  const [bannerProduct, setBannerProduct] = useState<string | null>(null);
  const [bannerAudience, setBannerAudience] = useState<string | null>(null);

  const quickNormalize = (text: string) => {
    let t = String(text || '').trim();
    t = t.replace(/^(i\s*saw|iso)\b/i, 'I sell');
    t = t.replace(/^(i|we)\s+(sell|offer|provide|do|build|make|deliver)\s+/i, '');
    t = t.replace(/^(it'?s|its|it is)\s+/i, '');
    t = t.replace(/\s+/g, ' ').replace(/^[\s\-_.:,]+|[\s\-_.:,]+$/g, '');
    const acronyms = new Set(['AI','SaaS','CRM','API','B2B','B2C','SEO']);
    return t.split(' ').filter(Boolean).map(w => {
      const core = w.replace(/[()\[\]{}.,!?]/g, '');
      if (acronyms.has(core.toUpperCase())) return core.toUpperCase();
      return core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
    }).join(' ');
  };

  const defaultSuggestionsFor = (field: 'product' | 'audience') => {
    return field === 'product'
      ? [
          'competitive advantage?',
          'niche/specialization?',
          'delivery model (SaaS, coaching, course, consulting)?',
          'type of sales (B2B/B2C)?',
          'primary outcome promised?',
        ]
      : [
          'role/industry?',
          'company size or segment?',
          'geography?',
          'budget authority/seniority?',
          'top pain points?',
        ];
  };

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);

  // Journey stages for progress indicator
  type JourneyStage = 'setup' | 'generating' | 'ready' | 'calling';
  const [journeyStage, setJourneyStage] = useState<JourneyStage>('setup');

  useEffect(() => {
    if (handoff && !personaDebug) {
      setJourneyStage('generating');
    } else if (personaDebug && !callStarted) {
      setJourneyStage('ready');
    } else if (callStarted) {
      setJourneyStage('calling');
    } else {
      setJourneyStage('setup');
    }
  }, [handoff, personaDebug, callStarted]);

  // Unlock audio on first gesture
  useEffect(() => {
    const unlockAudio = () => {
      setAudioUnlocked(true);
      setShowAudioPrompt(false);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio as any);
      window.removeEventListener('keydown', unlockAudio as any);
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      {/* Audio Unlock Prompt */}
      {showAudioPrompt && !audioUnlocked && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-10 max-w-md text-center shadow-2xl border-2 border-black">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Enable Audio</h2>
            <p className="text-gray-600 mb-8 text-sm leading-relaxed">
              PitchIQ uses voice for realistic training. Enable audio to begin your coaching session.
            </p>
            <button
              onClick={() => {
                setAudioUnlocked(true);
                setShowAudioPrompt(false);
              }}
              className="w-full px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              Enable Audio & Continue
            </button>
          </div>
        </div>
      )}

      {/* Progress Stepper */}
      <div className="bg-white border-b border-gray-200 py-5 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {[
              { stage: 'setup', label: 'Setup', icon: 'chat' },
              { stage: 'generating', label: 'Generate', icon: 'ai' },
              { stage: 'ready', label: 'Review', icon: 'user' },
              { stage: 'calling', label: 'Practice', icon: 'phone' },
            ].map((item, idx, arr) => {
              const isActive = journeyStage === item.stage;
              const isPast = arr.findIndex(s => s.stage === journeyStage) > idx;
              
              return (
                <React.Fragment key={item.stage}>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-red-600 text-white shadow-md scale-105'
                          : isPast
                          ? 'bg-black text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {item.icon === 'chat' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                      {item.icon === 'ai' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                      {item.icon === 'user' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {item.icon === 'phone' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors ${
                        isActive ? 'text-red-600 font-semibold' : isPast ? 'text-black' : 'text-gray-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-colors ${
                        isPast ? 'bg-black' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
        {/* Stage 1: Setup - Talk with Sam */}
        {!handoff ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-900 p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-md">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Meet Sam, Your AI Coach</h1>
              <p className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
                Sam will ask about your product and target market to create a realistic practice scenario.
              </p>
            </div>

            {/* Voice Conversation Box */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
              <SamCoachIntroSimple
                autoStart={true}
                exposeControls={(ctrls) => { controlsRef.current = ctrls as any; }}
                onPrefillSuggestion={async (p) => {
                  if (p.type === 'product') {
                    setStep('ASK_PRODUCT');
                    const quick = quickNormalize(p.text);
                    setPrefillProduct(quick || p.text);
                    setBannerProduct("We drafted this based on what you said. Please confirm or edit.");
                    setProductFormOpen(true);
                    try {
                      const resp = await fetch('/api/openai/summarize-field', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: p.text, field: 'product' }),
                      });
                      if (resp.ok) {
                        const { normalized, suggestions } = await resp.json();
                        if (normalized) setPrefillProduct(normalized);
                        if (Array.isArray(suggestions) && suggestions.length) {
                          const top = suggestions.slice(0, 3).join('; ');
                          setBannerProduct(`We drafted this based on what you said. Please confirm or edit. Suggestions: ${top}`);
                        }
                      } else {
                        const sug = defaultSuggestionsFor('product');
                        const top = sug.slice(0, 3).join('; ');
                        setBannerProduct(`We drafted this based on what you said. Please confirm or edit. Suggestions: ${top}`);
                      }
                    } catch {
                      const sug = defaultSuggestionsFor('product');
                      const top = sug.slice(0, 3).join('; ');
                      setBannerProduct(`We drafted this based on what you said. Please confirm or edit. Suggestions: ${top}`);
                    }
                  } else {
                    setStep('ASK_AUDIENCE');
                    const quick = quickNormalize(p.text);
                    setPrefillAudience({ text: quick || p.text });
                    setBannerAudience("We drafted this based on what you said. Please confirm or edit.");
                    setAudienceFormOpen(true);
                    try {
                      const resp = await fetch('/api/openai/summarize-field', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: p.text, field: 'audience' }),
                      });
                      if (resp.ok) {
                        const { normalized, suggestions } = await resp.json();
                        if (normalized) setPrefillAudience({ text: normalized });
                        if (Array.isArray(suggestions) && suggestions.length) {
                          const top = suggestions.slice(0, 3).join('; ');
                          setBannerAudience(`We drafted this based on what you said. Please confirm or edit. Suggestions: ${top}`);
                        }
                      } else {
                        const sug = defaultSuggestionsFor('audience');
                        const top = sug.slice(0, 3).join('; ');
                        setBannerAudience(`We drafted this based on what you said. Please confirm or edit. Suggestions: ${top}`);
                      }
                    } catch {
                      const sug = defaultSuggestionsFor('audience');
                      const top = sug.slice(0, 3).join('; ');
                      setBannerAudience(`We drafted this based on what you said. Please confirm or edit. Suggestions: ${top}`);
                    }
                  }
                }}
                onDataCollected={(data) => {
                  log(`[Page] Handoff received: ${JSON.stringify(data)}`);
                  setStep('DONE');
                  setHandoff({ 
                    product: data.product, 
                    audience: data.audience,
                    product_extras: (data as any).product_extras,
                    audience_extras: (data as any).audience_extras,
                  });
                }}
              />
            </div>

            {/* Inline Forms - Product */}
            {productFormOpen && step === 'ASK_PRODUCT' && (
              <div className="mt-6">
                <div className="bg-white rounded-xl p-5 border-2 border-red-600 shadow-sm">
                  <ManualAnswerForms
                    step={step}
                    visibleProduct={true}
                    visibleAudience={false}
                    initialProduct={prefillProduct ?? undefined}
                    bannerProduct={bannerProduct ?? undefined}
                    onSubmitProduct={(product, extras) => {
                      setProductText(product);
                      setProductFormOpen(false);
                      setPrefillProduct(null);
                      setBannerProduct(null);
                      controlsRef.current?.confirmProduct?.(product, extras);
                    }}
                    onSubmitAudience={() => {}}
                    onCancelProduct={() => setProductFormOpen(false)}
                  />
                </div>
              </div>
            )}

            {/* Inline Forms - Audience */}
            {audienceFormOpen && step === 'ASK_AUDIENCE' && (
              <div className="mt-6">
                <div className="bg-white rounded-xl p-5 border-2 border-red-600 shadow-sm">
                  <ManualAnswerForms
                    step={step}
                    visibleProduct={false}
                    visibleAudience={true}
                    initialAudience={prefillAudience ?? undefined}
                    bannerAudience={bannerAudience ?? undefined}
                    onSubmitProduct={() => {}}
                    onSubmitAudience={(audience, extras) => {
                      setAudienceText(audience);
                      setAudienceFormOpen(false);
                      setPrefillAudience(null);
                      setBannerAudience(null);
                      controlsRef.current?.confirmAudience?.(audience, extras);
                    }}
                    onCancelAudience={() => setAudienceFormOpen(false)}
                  />
                </div>
              </div>
            )}

            {/* Summary Footer - Show what's been captured */}
            {(productText || audienceText) && (
              <div className="mt-6 pt-5 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Captured Information</div>
                <div className="space-y-1 text-sm">
                  {productText && (
                    <div>
                      <span className="font-semibold text-gray-700">Product:</span>{' '}
                      <span className="text-gray-600">{productText}</span>
                    </div>
                  )}
                  {audienceText && (
                    <div>
                      <span className="font-semibold text-gray-700">Target Market:</span>{' '}
                      <span className="text-gray-600">{audienceText}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stage 2: Generating Persona */}
            {!personaDebug && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-900 p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Creating Your Practice Persona</h2>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
                    Generating a realistic AI prospect based on your product and target market.
                  </p>
                </div>
                <PersonaGenerationCard
                  userProductInfo={{ 
                    product: handoff.product, 
                    target_market: handoff.audience,
                    constraints: { product: handoff.product_extras, audience: handoff.audience_extras }
                  }}
                  autoStart={true}
                  onPersonaGenerated={() => {
                    log("[Page] Persona generated");
                  }}
                  onPersonaReadyFull={(payload, persona) => {
                    console.log('[SamOrchestrator] 🔍 DEBUG: Persona data:', persona);
                    console.log('[SamOrchestrator] 🔍 Has research_brief?', !!persona.research_brief);
                    if (persona.research_brief) {
                      console.log('[SamOrchestrator] ✅ Research brief found:', persona.research_brief);
                    } else {
                      console.log('[SamOrchestrator] ❌ No research_brief in persona data');
                    }
                    setPersonaDebug({ request: payload.request, api: payload.api, mapped: persona });
                  }}
                  onError={(e) => log(`[Page] Persona error: ${e}`)}
                />
              </div>
            )}

            {/* Stage 3: Review Persona & Start Call */}
            {personaDebug?.mapped && !callStarted && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-900 p-8 relative overflow-hidden">
                {/* Background Checkmark */}
                <svg 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 text-green-600 opacity-5 pointer-events-none" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>

                <div className="text-center mb-8 relative z-10">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Persona Ready</h2>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
                    Review your AI prospect below, then start your practice call.
                  </p>
                </div>

                <div className="relative z-10">
                  <PersonaLinkedProfile persona={personaDebug.mapped} />
                </div>

                <div className="mt-8 flex flex-col items-center gap-4 relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      // Show research brief if available, otherwise start call directly
                      if (personaDebug?.mapped?.research_brief) {
                        setShowResearchBrief(true);
                      } else {
                        setCallStarted(true);
                      }
                    }}
                    className="w-full max-w-sm px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-base rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Start Practice Call
                  </button>
                  <p className="text-xs text-gray-500 text-center max-w-md leading-relaxed">
                    This is a safe space to practice. The AI will respond realistically based on the persona.
                  </p>
                </div>
              </div>
            )}

            {/* Stage 4: Active Call */}
            {personaDebug?.mapped && callStarted && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-900 p-8">
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-900">Call in Progress</span>
                  </div>
                </div>
                <ProspectAgent
                  persona={personaDebug.mapped}
                  userProductInfo={{ product: handoff.product, target_market: handoff.audience }}
                  autoStart={true}
                  onEndCall={() => setCallStarted(false)}
                />
              </div>
            )}
          </div>
        )}
        </div>

        {/* Research Brief Modal - Shows between persona review and call start */}
        {showResearchBrief && personaDebug?.mapped && (
          <ResearchBriefModal
            persona={personaDebug.mapped}
            onStartCall={() => {
              setShowResearchBrief(false);
              setCallStarted(true);
            }}
            onCancel={() => {
              setShowResearchBrief(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SamOrchestratorPage;
