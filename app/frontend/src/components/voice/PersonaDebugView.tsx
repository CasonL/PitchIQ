import React from 'react';
import { PersonaData } from './DualVoiceAgentFlow';

export interface PersonaDebugPayload {
  request: { product_service: string; target_market: string };
  api: any; // raw API response
  mapped: PersonaData; // mapped persona used in UI
}

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-2 text-sm">
    <div className="font-semibold min-w-[160px]">{label}</div>
    <div className="flex-1 break-words">{value ?? '—'}</div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-gray-300 rounded-md p-3 bg-white">
    <div className="font-bold mb-2">{title}</div>
    {children}
  </div>
);

const CodeBlock: React.FC<{ obj: any }> = ({ obj }) => (
  <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-x-auto max-h-96">
    {JSON.stringify(obj, null, 2)}
  </pre>
);

const PersonaDebugView: React.FC<PersonaDebugPayload> = ({ request, api, mapped }) => {
  const rawPersona = api?.persona ?? {};
  const personaKeys = Object.keys(rawPersona);
  const keyCount = personaKeys.length;

  const advancedKeys = [
    'contextual_fears',
    'conversation_flow_guidance',
    'emotional_authenticity',
    'communication_struggles',
    'vulnerability_areas',
    'voice_optimized_prompt',
    'speech_patterns',
    'conversation_dynamics',
    'emotional_responsiveness',
    'persuasion_psychology',
  ];
  const presentAdvanced = advancedKeys.filter((k) => k in rawPersona);

  return (
    <div className="space-y-4 text-gray-900">
      <div className="text-lg font-bold">Persona Debug (Temporary)</div>

      <Section title="Request">
        <div className="space-y-1">
          <Row label="product_service" value={request.product_service} />
          <Row label="target_market" value={request.target_market} />
        </div>
      </Section>

      <Section title="API Meta">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Row label="success" value={String(!!api?.success)} />
          <Row label="generation_method" value={api?.generation_method ?? '—'} />
          <Row label="note" value={api?.note ?? '—'} />
          <Row label="diversity_info" value={api?.diversity_info ? JSON.stringify(api.diversity_info) : '—'} />
        </div>
      </Section>

      <Section title="Persona Summary (Raw)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Row label="name" value={rawPersona?.name} />
          <Row label="role" value={rawPersona?.role} />
          <Row label="company" value={rawPersona?.company} />
          <Row label="industry" value={rawPersona?.industry} />
          <Row label="primary_concern" value={rawPersona?.primary_concern} />
          <Row label="consumer_type" value={rawPersona?.consumer_type} />
          <Row label="purchase_context" value={rawPersona?.purchase_context} />
          <Row label="# keys" value={keyCount} />
          <Row label="advanced keys present" value={presentAdvanced.join(', ') || 'none'} />
        </div>
      </Section>

      <Section title="Persona (Mapped for UI)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Row label="name" value={mapped.name} />
          <Row label="role" value={mapped.role} />
          <Row label="company" value={mapped.company} />
          <Row label="industry" value={mapped.industry} />
          <Row label="primary_concern" value={mapped.primary_concern} />
          <Row label="surface_business_info" value={mapped.surface_business_info} />
          <Row label="decision_authority" value={mapped.decision_authority} />
          <Row label="emotional_state" value={mapped.emotional_state} />
        </div>
      </Section>

      <Section title="Raw API Payload">
        <CodeBlock obj={api} />
      </Section>

      <Section title="Raw Persona (api.persona)">
        <CodeBlock obj={rawPersona} />
      </Section>

      <Section title="Mapped PersonaData">
        <CodeBlock obj={mapped} />
      </Section>
    </div>
  );
};

export default PersonaDebugView;
