/**
 * test-helpers.ts
 * Shared test utilities and mock data generators
 */

import type { MarcusScenario } from '../../MarcusScenarios';
import type { MarcusTraitProfile } from '../../MarcusTraits';

/**
 * Creates a minimal valid MarcusScenario for testing
 */
export function createMockScenario(overrides?: Partial<MarcusScenario>): MarcusScenario {
  const defaultScenario: MarcusScenario = {
    id: 'test-scenario',
    difficulty: 'easy',
    name: 'Test Scenario',
    description: 'Test scenario for unit tests',
    product: 'Test Product',
    productDescription: 'A test product description',
    marcusRole: 'Test Role',
    marcusMood: 'Test Mood',
    traits: createMockTraits(),
    visiblePains: ['Test visible pain'],
    hiddenPains: ['Test hidden pain'],
    objections: ['Test objection'],
    winCondition: {
      requiredDiscoveries: 2,
      requiredObjectionHandling: 1,
      mustBookMeeting: true
    },
    scoringCriteria: {
      permissionOpener: 1,
      discoveryQuestions: 2,
      problemFraming: 2,
      objectionHandling: 2,
      clearClose: 2,
      conciseControl: 1
    },
    exampleDialogue: {
      goodOpener: 'Test opener',
      keyQuestions: ['Test question'],
      objectionHandles: ['Test handle'],
      goodClose: 'Test close'
    }
  };

  return { ...defaultScenario, ...overrides };
}

/**
 * Creates valid MarcusTraitProfile for testing
 */
export function createMockTraits(overrides?: Partial<MarcusTraitProfile>): MarcusTraitProfile {
  const defaultTraits: MarcusTraitProfile = {
    painLevel: 'moderate',
    urgency: 'medium',
    budget: 'available',
    openness: 'curious',
    initialResistance: 5,
    resistanceVolatility: 0.3,
    satisfactionLevel: 5,
    painPoints: ['Test pain point'],
    currentSolution: 'Test current solution',
    decisionTimeframe: 'next quarter',
    primaryConcern: 'quality',
    winConditionExists: true,
    idealOutcome: 'follow-up-scheduled'
  };

  return { ...defaultTraits, ...overrides };
}

/**
 * Creates multiple scenarios with different difficulties
 */
export function createMockScenarios() {
  return {
    easy: createMockScenario({ id: 'easy', difficulty: 'easy' }),
    medium: createMockScenario({ id: 'medium', difficulty: 'medium' }),
    hard: createMockScenario({ id: 'hard', difficulty: 'hard' })
  };
}
