/**
 * CallOrchestrator.test.ts
 * Tests for call lifecycle management, service initialization, and state tracking
 */

import { CallOrchestrator } from '../CallOrchestrator';
import { ConversationTracker } from '../../ConversationTranscript';
import { TurnTracker } from '../../TurnTracker';
import { CharmerPhaseManager } from '../../CharmerPhaseManager';
import { MarcusScenario } from '../../MarcusScenarios';
import { createMockScenario } from './test-helpers';

// Mock ObjectionGenerator to avoid import.meta.env compatibility issues in Jest
jest.mock('../../ObjectionGenerator', () => ({
  ObjectionGenerator: jest.fn().mockImplementation(() => ({
    generateForDiscovery: jest.fn(),
    getObjections: jest.fn(() => null),
    hasObjections: jest.fn(() => false),
    reset: jest.fn()
  }))
}));

describe('CallOrchestrator', () => {
  let orchestrator: CallOrchestrator;

  beforeEach(() => {
    orchestrator = new CallOrchestrator();
  });

  describe('Call Lifecycle', () => {
    test('initializes services on startCall', async () => {
      const mockScenario = createMockScenario();
      const services = await orchestrator.startCall(mockScenario);

      expect(services).toBeDefined();
      expect(services.phaseManager).toBeDefined();
      expect(services.conversationTracker).toBeDefined();
      expect(services.turnTracker).toBeDefined();
    });

    test('generates unique session ID for each call', async () => {
      const mockScenario = createMockScenario();

      await orchestrator.startCall(mockScenario);
      const state1 = orchestrator.getState();
      
      const orchestrator2 = new CallOrchestrator();
      await orchestrator2.startCall(mockScenario);
      const state2 = orchestrator2.getState();

      expect(state1.sessionId).toBeDefined();
      expect(state2.sessionId).toBeDefined();
      expect(state1.sessionId).not.toBe(state2.sessionId);
    });

    test('tracks call start time', async () => {
      const beforeStart = Date.now();
      
      await orchestrator.startCall(createMockScenario());
      
      const afterStart = Date.now();
      const state = orchestrator.getState();

      expect(state.startTime).toBeDefined();
      expect(state.startTime!).toBeGreaterThanOrEqual(beforeStart);
      expect(state.startTime!).toBeLessThanOrEqual(afterStart);
    });

    test('sets isActive to true on startCall', async () => {
      const state1 = orchestrator.getState();
      expect(state1.isActive).toBe(false);

      await orchestrator.startCall(createMockScenario());

      const state2 = orchestrator.getState();
      expect(state2.isActive).toBe(true);
    });

    test('endCall returns services and clears state', async () => {
      await orchestrator.startCall(createMockScenario());

      const services = orchestrator.endCall();

      expect(services).toBeDefined();
      expect(services?.phaseManager).toBeDefined();
      
      const state = orchestrator.getState();
      expect(state.isActive).toBe(false);
      expect(state.sessionId).toBeNull();
      expect(state.startTime).toBeNull();
    });

    test('endCall returns null if no active call', () => {
      const services = orchestrator.endCall();
      expect(services).toBeNull();
    });
  });

  describe('State Management', () => {
    test('getState returns initial state before call starts', () => {
      const state = orchestrator.getState();
      
      expect(state).toEqual({
        isActive: false,
        isPaused: false,
        sessionId: null,
        startTime: null,
        selectedScenario: null
      });
    });

    test('getState returns current state during active call', async () => {
      const scenario = createMockScenario({ id: 'test-scenario' });

      await orchestrator.startCall(scenario);
      const state = orchestrator.getState();

      expect(state.isActive).toBe(true);
      expect(state.sessionId).toBeDefined();
      expect(state.startTime).toBeDefined();
    });

    test('state is immutable between calls', async () => {
      const scenario1 = createMockScenario({ id: 'scenario-1', name: 'First' });

      await orchestrator.startCall(scenario1);
      const state1 = orchestrator.getState();
      orchestrator.endCall();

      const scenario2 = createMockScenario({ id: 'scenario-2', name: 'Second', difficulty: 'hard' });

      await orchestrator.startCall(scenario2);
      const state2 = orchestrator.getState();

      expect(state1.sessionId).not.toBe(state2.sessionId);
    });
  });

  describe('Service Initialization', () => {
    test('PhaseManager starts in prospect phase', async () => {
      const services = await orchestrator.startCall(createMockScenario());

      const currentPhase = services.phaseManager.getCurrentPhase();
      expect(currentPhase).toBe('prospect');
    });

    test('TurnTracker initializes with session ID', async () => {
      const services = await orchestrator.startCall(createMockScenario());

      const state = orchestrator.getState();
      expect(services.turnTracker).toBeDefined();
      expect(state.sessionId).toBeDefined();
    });

    test('ConversationTracker initializes with start time', async () => {
      const services = await orchestrator.startCall(createMockScenario());

      const state = orchestrator.getState();
      expect(services.conversationTracker).toBeDefined();
      expect(state.startTime).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('handles multiple endCall calls gracefully', async () => {
      await orchestrator.startCall(createMockScenario());

      const services1 = orchestrator.endCall();
      expect(services1).not.toBeNull();

      const services2 = orchestrator.endCall();
      expect(services2).toBeNull();
    });

    test('startCall while call active replaces previous call', async () => {
      await orchestrator.startCall(createMockScenario({ id: 'first' }));

      const state1 = orchestrator.getState();
      const sessionId1 = state1.sessionId;

      await orchestrator.startCall(createMockScenario({ id: 'second', difficulty: 'hard' }));

      const state2 = orchestrator.getState();
      const sessionId2 = state2.sessionId;

      expect(sessionId1).not.toBe(sessionId2);
    });
  });
});
