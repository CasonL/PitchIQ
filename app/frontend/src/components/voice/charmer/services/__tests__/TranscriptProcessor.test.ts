/**
 * TranscriptProcessor.test.ts
 * Critical path tests for transcript processing, echo filtering, and utterance stitching
 */

import { TranscriptProcessor } from '../TranscriptProcessor';

describe('TranscriptProcessor', () => {
  let processor: TranscriptProcessor;

  beforeEach(() => {
    processor = new TranscriptProcessor();
  });

  afterEach(() => {
    processor.reset();
  });

  describe('Echo Filtering', () => {
    test('filters exact match echo', () => {
      processor.setLastMarcusMessage('Hello there, how are you?');
      const result = processor.processTranscript('Hello there, how are you?', true);
      
      expect(result).toBeNull();
    });

    test('filters partial echo - user transcript starts with Marcus message', () => {
      processor.setLastMarcusMessage('Hey there, how can I help you today?');
      const result = processor.processTranscript('Hey there', true);
      
      expect(result).toBeNull();
    });

    test('filters partial echo - Marcus message starts with user transcript', () => {
      processor.setLastMarcusMessage('Hello');
      const result = processor.processTranscript('Hello there friend', true);
      
      expect(result).toBeNull();
    });

    test('filters echo with case insensitivity', () => {
      processor.setLastMarcusMessage('HELLO THERE');
      const result = processor.processTranscript('hello there', true);
      
      expect(result).toBeNull();
    });

    test('passes through non-echo content', () => {
      processor.setLastMarcusMessage('Hi, I am Marcus');
      const result = processor.processTranscript('My name is John', true);
      
      expect(result).not.toBeNull();
      expect(result?.text).toBe('My name is John');
    });

    test('filters echo with 10+ char prefix match', () => {
      processor.setLastMarcusMessage('This is a very long message from Marcus');
      const result = processor.processTranscript('This is a very long message with different ending', true);
      
      expect(result).toBeNull();
    });

    test('passes through short similar prefixes (< 10 chars)', () => {
      processor.setLastMarcusMessage('Hi Marcus');
      const result = processor.processTranscript('Hi there', true);
      
      expect(result).not.toBeNull();
      expect(result?.text).toBe('Hi there');
    });
  });

  describe('Utterance Count Management', () => {
    test('increments utterance count for each final transcript', () => {
      const result1 = processor.processTranscript('First message', true);
      expect(result1?.utteranceNumber).toBe(1);

      const result2 = processor.processTranscript('Second message', true);
      expect(result2?.utteranceNumber).toBe(2);

      const result3 = processor.processTranscript('Third message', true);
      expect(result3?.utteranceNumber).toBe(3);
    });

    test('does not increment for partial transcripts', () => {
      const result1 = processor.processTranscript('Partial...', false);
      expect(result1).toBeNull();

      const result2 = processor.processTranscript('Final message', true);
      expect(result2?.utteranceNumber).toBe(1);
    });

    test('resets utterance count on reset()', () => {
      processor.processTranscript('First', true);
      processor.processTranscript('Second', true);
      
      processor.reset();
      
      const result = processor.processTranscript('After reset', true);
      expect(result?.utteranceNumber).toBe(1);
    });
  });

  describe('Quality Assessment', () => {
    test('returns null for very short final transcripts (<=3 chars)', () => {
      const result = processor.processTranscript('hi', true);
      expect(result).toBeNull();
    });

    test('returns null for whitespace-only transcripts', () => {
      const result = processor.processTranscript('   ', true);
      expect(result).toBeNull();
    });

    test('returns null for empty transcripts', () => {
      const result = processor.processTranscript('', true);
      expect(result).toBeNull();
    });

    test('passes through valid short messages (> 3 chars)', () => {
      const result = processor.processTranscript('okay', true);
      expect(result).not.toBeNull();
      expect(result?.text).toBe('okay');
    });

    test('trims whitespace from transcripts', () => {
      const result = processor.processTranscript('  hello there  ', true);
      expect(result?.text).toBe('hello there');
    });
  });

  describe('Partial Transcript Handling', () => {
    test('ignores partial transcripts', () => {
      const result = processor.processTranscript('This is a partial...', false);
      expect(result).toBeNull();
    });

    test('processes only when isFinal is true', () => {
      processor.processTranscript('Partial 1', false);
      processor.processTranscript('Partial 2', false);
      const result = processor.processTranscript('Final message', true);
      
      expect(result).not.toBeNull();
      expect(result?.utteranceNumber).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles null lastMarcusMessage gracefully', () => {
      const result = processor.processTranscript('User message', true);
      
      expect(result).not.toBeNull();
      expect(result?.text).toBe('User message');
    });

    test('handles special characters in echo detection', () => {
      processor.setLastMarcusMessage('Hey! How\'s it going?');
      const result = processor.processTranscript('Hey! How\'s it going?', true);
      
      expect(result).toBeNull();
    });

    test('handles numbers and punctuation', () => {
      processor.setLastMarcusMessage('Call me at 555-1234');
      const result = processor.processTranscript('My number is 555-9876', true);
      
      expect(result).not.toBeNull();
    });

    test('returns consistent structure for valid transcripts', () => {
      const result = processor.processTranscript('Test message', true);
      
      expect(result).toEqual({
        text: 'Test message',
        utteranceNumber: 1,
        isValid: true,
        qualityIssues: undefined
      });
    });
  });

  describe('Reset Functionality', () => {
    test('clears utterance count', () => {
      processor.processTranscript('Message 1', true);
      processor.processTranscript('Message 2', true);
      
      processor.reset();
      
      const result = processor.processTranscript('After reset', true);
      expect(result?.utteranceNumber).toBe(1);
    });

    test('clears last Marcus message', () => {
      processor.setLastMarcusMessage('Previous Marcus message');
      processor.reset();
      
      const result = processor.processTranscript('Previous Marcus message', true);
      expect(result).not.toBeNull(); // Should not be filtered as echo
    });
  });
});
