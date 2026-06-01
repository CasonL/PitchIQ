/**
 * Simple test script to verify feedback API endpoints are working
 * 
 * Run this from browser console or as a standalone test
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function testFeedbackAPI() {
  console.log('🧪 Testing Feedback API endpoints...');
  console.log('📍 API Base URL:', API_BASE_URL || 'relative URLs');

  // Test 1: Health check
  try {
    console.log('\n1️⃣ Testing health check endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL}/api/feedback/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }

  // Test 2: Generate feedback
  try {
    console.log('\n2️⃣ Testing feedback generation endpoint...');
    const feedbackResponse = await fetch(`${API_BASE_URL}/api/generate-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `You are generating sales coaching feedback for a warm-lead call.

CONTEXT:
- Warm signal: website_visit (8 days ago)
- Call phase: opening
- Buyer defense: status_quo_shield
- Buyer engagement: guarded → closed
- Rep said: "I noticed that many sales teams struggle to achieve a 15% close rate, and I'd love to share how our advanced AI training has helped teams like yours increase their close rates by up to 20%. Do you have five minutes?"
- Buyer said: "We're pretty happy with our current sales training methods at the moment."
- Trust changed: -20
- Detected mistakes: premature_pitch, ignored_warm_signal, unearned_roi_claim

TASK: Generate practical, evidence-based feedback.

RESPOND WITH JSON:
{
  "whatHappened": "1-2 sentences",
  "whyItDidntWork": "1-2 sentences with confidence level",
  "whatToDoInstead": "Specific behavior change",
  "tryThisLine": "Exact alternative line",
  "whyItWorks": "1 sentence"
}`,
        moment: {
          repUtterance: "I noticed that many sales teams struggle to achieve a 15% close rate...",
          buyerUtterance: "We're pretty happy with our current sales training methods.",
          detectedMistakes: ['premature_pitch', 'ignored_warm_signal'],
          detectedStrengths: []
        }
      })
    });

    if (!feedbackResponse.ok) {
      throw new Error(`HTTP ${feedbackResponse.status}: ${await feedbackResponse.text()}`);
    }

    const feedbackData = await feedbackResponse.json();
    console.log('✅ Feedback generated:', feedbackData);
  } catch (error) {
    console.error('❌ Feedback generation failed:', error);
  }

  // Test 3: Generate quiz
  try {
    console.log('\n3️⃣ Testing quiz generation endpoint...');
    const quizResponse = await fetch(`${API_BASE_URL}/api/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Generate a multiple-choice question that tests understanding of what went wrong.

CONTEXT:
- What happened: Rep led with 20% improvement claim before Marcus agreed there was a problem
- Why it failed: Made Marcus evaluate product before agreeing problem was relevant

REQUIREMENTS:
1. EQUAL LENGTH ANSWERS (±3 words)
2. ALL ANSWERS PSYCHOLOGICALLY PLAUSIBLE
3. NO JARGON IN ANSWERS

RESPOND WITH JSON:
{
  "question": "Why did Marcus reject this approach?",
  "options": [
    {"text": "15-17 word option A", "correct": false, "psychologyPrinciple": "Why plausible"},
    {"text": "15-17 word option B", "correct": true, "psychologyPrinciple": "Why correct"},
    {"text": "15-17 word option C", "correct": false, "psychologyPrinciple": "Why plausible"}
  ],
  "explanation": "Why the correct answer is right",
  "howResponse": "What to do instead"
}`,
        moment: {},
        feedback: {}
      })
    });

    if (!quizResponse.ok) {
      throw new Error(`HTTP ${quizResponse.status}: ${await quizResponse.text()}`);
    }

    const quizData = await quizResponse.json();
    console.log('✅ Quiz generated:', quizData);
  } catch (error) {
    console.error('❌ Quiz generation failed:', error);
  }

  console.log('\n✨ API tests complete!');
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('💡 Run testFeedbackAPI() to test the feedback endpoints');
}
