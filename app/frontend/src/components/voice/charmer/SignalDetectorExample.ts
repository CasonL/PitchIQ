/**
 * SignalDetectorExample.ts
 * Testing signal detection on real messages
 */

import { SignalDetector } from './SignalDetector';

const detector = new SignalDetector();

// Test on user's actual opener
const userOpener = "Hi marcus, it's cason from PitchIQ. Do you have 5 minutes to talk about your sales team?";
console.log('\n=== TESTING USER OPENER ===');
console.log('Message:', userOpener);
console.log('\nDetected Signals:');

const signals = detector.detect(userOpener);
const sorted = detector.sortByPosition(signals);

sorted.forEach(signal => {
  console.log(`\n[${signal.type}] confidence: ${signal.confidence}`);
  console.log(`  text: "${signal.text}"`);
  console.log(`  position: ${signal.position}`);
});

console.log(`\n\nTotal signals detected: ${signals.length}`);
console.log('Signal types:', [...new Set(signals.map(s => s.type))].join(', '));

// Test on better alternative
const betterOpener = "Quick one—I help teams reduce ramp time. How are you handling onboarding now?";
console.log('\n\n=== TESTING BETTER ALTERNATIVE ===');
console.log('Message:', betterOpener);
console.log('\nDetected Signals:');

const betterSignals = detector.detect(betterOpener);
const betterSorted = detector.sortByPosition(betterSignals);

betterSorted.forEach(signal => {
  console.log(`\n[${signal.type}] confidence: ${signal.confidence}`);
  console.log(`  text: "${signal.text}"`);
  console.log(`  position: ${signal.position}`);
});

console.log(`\n\nTotal signals detected: ${betterSignals.length}`);
console.log('Signal types:', [...new Set(betterSignals.map(s => s.type))].join(', '));

// Test on complex message with multiple mechanics
const complexMessage = "Hey John, do you have 2 minutes? I work with sales teams to improve ramp time and thought this might be relevant.";
console.log('\n\n=== TESTING COMPLEX MESSAGE ===');
console.log('Message:', complexMessage);
console.log('\nDetected Signals:');

const complexSignals = detector.detect(complexMessage);
const complexSorted = detector.sortByPosition(complexSignals);

complexSorted.forEach(signal => {
  console.log(`\n[${signal.type}] confidence: ${signal.confidence}`);
  console.log(`  text: "${signal.text}"`);
  console.log(`  position: ${signal.position}`);
});

console.log(`\n\nTotal signals detected: ${complexSignals.length}`);
console.log('Signal types:', [...new Set(complexSignals.map(s => s.type))].join(', '));

// Export for testing
export { detector, userOpener, betterOpener, complexMessage };
