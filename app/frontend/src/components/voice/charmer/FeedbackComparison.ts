/**
 * FeedbackComparison.ts
 * Head-to-head comparison: Old boolean bucket system vs New multi-mechanic system
 * Testing on user's actual opener and other examples
 */

import { SignalDetector } from './SignalDetector';
import { MechanicInferenceEngine } from './MechanicInferenceEngine';
import { FeedbackPrioritizer } from './FeedbackPrioritizer';

const detector = new SignalDetector();
const inferenceEngine = new MechanicInferenceEngine();
const prioritizer = new FeedbackPrioritizer();

// === TEST CASE 1: User's Actual Opener ===
console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  TEST CASE 1: User\'s Actual Opener                           ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const userOpener = "Hi Marcus, it's Cason from PitchIQ. Do you have 5 minutes to talk about your sales team?";

console.log('MESSAGE:', userOpener);
console.log('\n--- OLD SYSTEM (Boolean Buckets) ---');
const oldFeedback1 = `Build rapport before asking business questions.

Your opening lacks warmth. You jumped straight to asking about their sales team without establishing a personal connection first.

Try starting with "How are you?" or acknowledging something personal before diving into business.`;

console.log(oldFeedback1);

console.log('\n--- NEW SYSTEM (Multi-Mechanic) ---');
const signals1 = detector.detect(userOpener);
const mechanics1 = inferenceEngine.infer(signals1);
const feedback1 = prioritizer.prioritize(mechanics1, userOpener);

if (feedback1) {
  console.log(prioritizer.formatForDisplay(feedback1));
  
  console.log('\n--- IMPROVEMENT ANALYSIS ---');
  const comparison1 = prioritizer.compareWithOldSystem(feedback1, oldFeedback1);
  console.log(comparison1.improvement);
}

// === TEST CASE 2: Better Alternative ===
console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  TEST CASE 2: Better Alternative                             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const betterOpener = "I work with sales teams struggling with rep ramp consistency. Curious whether onboarding speed is a focus for you right now.";

console.log('MESSAGE:', betterOpener);

const signals2 = detector.detect(betterOpener);
const mechanics2 = inferenceEngine.infer(signals2);
const feedback2 = prioritizer.prioritize(mechanics2, betterOpener);

if (feedback2) {
  console.log('\n--- NEW SYSTEM ANALYSIS ---');
  console.log(prioritizer.formatForDisplay(feedback2));
} else {
  console.log('\n✓ No critical issues detected - strong opener');
}

// === TEST CASE 3: Permission with Value (Mixed) ===
console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  TEST CASE 3: Permission with Value After                    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const mixedOpener = "Hey John, do you have 2 minutes? I work with sales teams to improve ramp time and thought this might be relevant.";

console.log('MESSAGE:', mixedOpener);
console.log('\n--- OLD SYSTEM ---');
const oldFeedback3 = `You're building some rapport with the greeting, but you need to ask more discovery questions to understand their needs before pitching.`;

console.log(oldFeedback3);

console.log('\n--- NEW SYSTEM ---');
const signals3 = detector.detect(mixedOpener);
const mechanics3 = inferenceEngine.infer(signals3);
const feedback3 = prioritizer.prioritize(mechanics3, mixedOpener);

if (feedback3) {
  console.log(prioritizer.formatForDisplay(feedback3));
  
  console.log('\n--- IMPROVEMENT ANALYSIS ---');
  const comparison3 = prioritizer.compareWithOldSystem(feedback3, oldFeedback3);
  console.log(comparison3.improvement);
}

// === TEST CASE 4: Apologetic Opening ===
console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  TEST CASE 4: Apologetic Opening                             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const apologeticOpener = "Sorry to bother you, but I just wanted to see if you have a quick second to talk about improving your sales process?";

console.log('MESSAGE:', apologeticOpener);

const signals4 = detector.detect(apologeticOpener);
const mechanics4 = inferenceEngine.infer(signals4);
const feedback4 = prioritizer.prioritize(mechanics4, apologeticOpener);

if (feedback4) {
  console.log('\n--- NEW SYSTEM ---');
  console.log(prioritizer.formatForDisplay(feedback4));
}

// === SUMMARY STATISTICS ===
console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  DETECTION STATISTICS                                        ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const allTests = [
  { name: 'User Opener', signals: signals1, mechanics: mechanics1 },
  { name: 'Better Alternative', signals: signals2, mechanics: mechanics2 },
  { name: 'Mixed Opener', signals: signals3, mechanics: mechanics3 },
  { name: 'Apologetic', signals: signals4, mechanics: mechanics4 }
];

allTests.forEach(test => {
  console.log(`\n${test.name}:`);
  console.log(`  Signals detected: ${test.signals.length}`);
  console.log(`  Mechanics inferred: ${test.mechanics.length}`);
  console.log(`  Priority 1 (critical): ${test.mechanics.filter(m => m.priority === 1).length}`);
  console.log(`  Priority 2 (important): ${test.mechanics.filter(m => m.priority === 2).length}`);
  console.log(`  Priority 3 (minor): ${test.mechanics.filter(m => m.priority === 3).length}`);
});

// === KEY TAKEAWAYS ===
console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  KEY TAKEAWAYS                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log(`
✓ OLD SYSTEM PROBLEMS:
  - Vague labels: "build rapport", "engage better"
  - No evidence: What exactly triggered the feedback?
  - No sequence awareness: Can't distinguish order
  - Boolean thinking: Forces complex behavior into buckets
  - Generic advice: "Try starting with 'How are you?'"

✓ NEW SYSTEM IMPROVEMENTS:
  - Precise mechanics: "permission_without_value"
  - Evidence-backed: Cites exact text that triggered detection
  - Sequence-aware: "before" vs "after" matters
  - Multi-mechanic: Detects 3-5 signals per message
  - Actionable rewrites: Shows specific alternatives

✓ NEXT STEPS:
  1. Integrate into CharmerController (narrow slice)
  2. A/B test on real calls
  3. Measure reduction in vague feedback
  4. Find false positives
  5. Only then add state transition mapping
`);

export { detector, inferenceEngine, prioritizer };
