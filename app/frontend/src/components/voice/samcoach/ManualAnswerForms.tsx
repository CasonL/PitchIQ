import React, { useEffect, useMemo, useState } from 'react';
import type { StepId } from './flow';

export type PersonaExtras = {
  age_range?: string;
  gender?: 'male' | 'female' | 'no_preference' | 'other' | '';
  races?: string[];
  more_info?: string;
  market_type?: 'B2B' | 'B2C' | 'Both';
};

interface ManualAnswerFormsProps {
  step: StepId | null;
  visibleProduct?: boolean;
  visibleAudience?: boolean;
  onSubmitProduct: (product: string, extras: PersonaExtras) => void;
  onSubmitAudience: (audience: string, extras: PersonaExtras) => void;
  onCancelProduct?: () => void;
  onCancelAudience?: () => void;
  // AI-assisted prefill
  initialProduct?: string;
  initialAudience?: { text?: string; extras?: PersonaExtras };
  bannerProduct?: string;
  bannerAudience?: string;
}

const raceOptions = [
  'Asian',
  'Black',
  'White',
  'Hispanic/Latino',
  'Indigenous',
  'Middle Eastern',
  'South Asian',
  'East Asian',
  'Southeast Asian',
  'Mixed',
  'Other',
];

const ageOptions = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+',
];

const ManualAnswerForms: React.FC<ManualAnswerFormsProps> = ({ step, visibleProduct = false, visibleAudience = false, onSubmitProduct, onSubmitAudience, onCancelProduct, onCancelAudience, initialProduct, initialAudience, bannerProduct, bannerAudience }) => {
  // Separate local states so each form can be filled independently
  const [productInput, setProductInput] = useState('');
  const [audienceInput, setAudienceInput] = useState('');

  // Audience-only demographics & details
  const [age2, setAge2] = useState<string>('');
  const [gender2, setGender2] = useState<PersonaExtras['gender']>('');
  const [races2, setRaces2] = useState<string[]>([]);
  const [more2, setMore2] = useState('');
  const [audB2B, setAudB2B] = useState(false);
  const [audB2C, setAudB2C] = useState(false);

  const showProductForm = step === 'ASK_PRODUCT' && visibleProduct;
  const showAudienceForm = step === 'ASK_AUDIENCE' && visibleAudience;

  // Hydrate product form with initial value when it becomes visible
  useEffect(() => {
    if (showProductForm && initialProduct && !productInput) {
      setProductInput(initialProduct);
    }
  }, [showProductForm, initialProduct, productInput]);

  // Hydrate audience form with initial value/extras when it becomes visible
  useEffect(() => {
    if (!showAudienceForm) return;
    if (initialAudience?.text && !audienceInput) setAudienceInput(initialAudience.text);
    const ex = initialAudience?.extras;
    if (ex) {
      if (ex.age_range) setAge2(ex.age_range);
      if (ex.gender) setGender2(ex.gender);
      if (Array.isArray(ex.races)) setRaces2(ex.races);
      if (ex.more_info) setMore2(ex.more_info);
      if (ex.market_type === 'Both') { setAudB2B(true); setAudB2C(true); }
      else if (ex.market_type === 'B2B') { setAudB2B(true); setAudB2C(false); }
      else if (ex.market_type === 'B2C') { setAudB2B(false); setAudB2C(true); }
    }
  }, [showAudienceForm, initialAudience, audienceInput]);

  const audienceExtras: PersonaExtras = useMemo(() => ({
    age_range: age2 || undefined,
    gender: gender2 || undefined,
    races: races2.length ? races2 : undefined,
    more_info: more2 || undefined,
    market_type: audB2B && audB2C ? 'Both' : audB2B ? 'B2B' : audB2C ? 'B2C' : undefined,
  }), [age2, gender2, races2, more2, audB2B, audB2C]);
  const toggleRace2 = (value: string) => {
    setRaces2((prev) => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  return (
    <div className="mt-3 space-y-4">
      {showProductForm && (
        <form
          className="bg-white rounded-lg p-4 shadow-sm space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const p = productInput.trim();
            if (!p) return;
            onSubmitProduct(p, {});
          }}
        >
          {onCancelProduct && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCancelProduct}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Collapse
              </button>
            </div>
          )}
          {bannerProduct && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">{bannerProduct}</div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900">What do you sell?</label>
            <textarea
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
              placeholder="e.g., Snowboards"
              className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm min-h-[72px] resize-y whitespace-pre-wrap break-words leading-5 focus:outline-none focus:ring-2 focus:ring-red-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const p = productInput.trim();
                  if (p) onSubmitProduct(p, {});
                }
              }}
            />
          </div>

          {productInput.trim().length > 0 && (
            <div>
              <button
                type="submit"
                className="text-sm px-6 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          )}
        </form>
      )}

      {showAudienceForm && (
        <form
          className="bg-white rounded-lg p-4 shadow-sm space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const a = audienceInput.trim();
            if (!a) return;
            onSubmitAudience(a, audienceExtras);
          }}
        >
          {onCancelAudience && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCancelAudience}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Collapse
              </button>
            </div>
          )}
          {bannerAudience && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">{bannerAudience}</div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900">Who do you sell to?</label>
            <textarea
              value={audienceInput}
              onChange={(e) => setAudienceInput(e.target.value)}
              placeholder="e.g., Younger people, mostly males"
              className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm min-h-[72px] resize-y whitespace-pre-wrap break-words leading-5 focus:outline-none focus:ring-2 focus:ring-red-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const a = audienceInput.trim();
                  if (a) onSubmitAudience(a, audienceExtras);
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">Age</label>
              <select
                value={age2}
                onChange={(e) => setAge2(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Any</option>
                {ageOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">Gender</label>
              <select
                value={gender2}
                onChange={(e) => setGender2(e.target.value as PersonaExtras['gender'])}
                className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900">Market</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudB2B(!audB2B)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  audB2B ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                B2B
              </button>
              <button
                type="button"
                onClick={() => setAudB2C(!audB2C)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  audB2C ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                B2C
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900">Background</label>
            <div className="flex flex-wrap gap-2">
              {raceOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRace2(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    races2.includes(r) ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900">Additional details</label>
            <textarea
              value={more2}
              onChange={(e) => setMore2(e.target.value)}
              placeholder="e.g., Likes ice cream, works in tech..."
              className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {audienceInput.trim().length > 0 && (
            <div className="pt-2">
              <button
                type="submit"
                className="text-sm px-6 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default ManualAnswerForms;
