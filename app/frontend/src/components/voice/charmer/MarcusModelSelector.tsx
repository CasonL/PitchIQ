/**
 * MarcusModelSelector.tsx
 * UI component for selecting which AI model Marcus uses
 */

import React from 'react';
import { MARCUS_AI_MODELS } from './CharmerAIService';

interface MarcusModelSelectorProps {
  selectedModel: keyof typeof MARCUS_AI_MODELS;
  onModelChange: (model: keyof typeof MARCUS_AI_MODELS) => void;
  disabled?: boolean;
}

const MODEL_LABELS: Record<keyof typeof MARCUS_AI_MODELS, string> = {
  'gpt-4o-mini': 'GPT-4o-mini (Fast, Less Polite)',
  'claude-sonnet': 'Claude Sonnet (Baseline)',
  'gpt-4o': 'GPT-4o (Slower, Smarter)',
  'llama-70b': 'Llama 70B (Open Source)',
  'mistral': 'Mistral Large (European)'
};

export const MarcusModelSelector: React.FC<MarcusModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        AI Model
      </label>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as keyof typeof MARCUS_AI_MODELS)}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {Object.keys(MARCUS_AI_MODELS).map((model) => (
          <option key={model} value={model}>
            {MODEL_LABELS[model as keyof typeof MARCUS_AI_MODELS]}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500">
        Testing different models to reduce question frequency
      </p>
    </div>
  );
};
