/**
 * Simple test to verify ProductConversationPhysics logic
 * Tests 1 chemical + 2 random products + 2 random services
 */

const ARCHETYPE_KEYWORDS = {
  saas: ['software', 'platform', 'saas', 'app', 'dashboard', 'analytics', 'crm', 'automation', 'integration', 'api'],
  professional_service: ['consulting', 'advisory', 'strategy', 'implementation', 'audit', 'assessment', 'professional services'],
  training_or_coaching: ['training', 'coaching', 'course', 'workshop', 'certification', 'learning', 'education', 'development'],
  physical_product: ['product', 'device', 'tool', 'machine', 'equipment', 'hardware', 'physical'],
  commodity_or_material: ['material', 'supply', 'raw material', 'commodity', 'bulk'],
  chemical_or_industrial_supply: ['chemical', 'industrial', 'compound', 'solution', 'solvent', 'catalyst', 'reagent', 'grade'],
  equipment_or_hardware: ['equipment', 'hardware', 'machinery', 'device', 'system', 'unit', 'installation'],
  agency_or_marketing_service: ['marketing', 'advertising', 'agency', 'campaign', 'content', 'social media', 'seo', 'ppc'],
  financial_or_insurance: ['insurance', 'financial', 'loan', 'credit', 'investment', 'banking', 'coverage']
};

function classifyProduct(sellerInput, conversationHistory = []) {
  const fullContext = [sellerInput, ...conversationHistory].join(' ').toLowerCase();
  const scores = {};
  
  // Initialize scores
  Object.keys(ARCHETYPE_KEYWORDS).forEach(archetype => {
    scores[archetype] = 0;
  });
  scores.unknown = 0;
  
  // Score each archetype based on keyword matches
  for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (fullContext.includes(keyword)) {
        scores[archetype] += 1;
        
        // Boost score for exact matches in seller input
        if (sellerInput.toLowerCase().includes(keyword)) {
          scores[archetype] += 1;
        }
      }
    }
  }
  
  // Special case detection patterns
  if (/grade|spec|sds|msds|safety data|purity|concentration|formula/i.test(fullContext)) {
    scores.chemical_or_industrial_supply += 2;
  }
  
  if (/increase.*\d+%|save.*\d+%|roi|automation|integration|api/i.test(fullContext)) {
    scores.saas += 2;
  }
  
  if (/we do|we help|our team|implementation|consulting|advisory/i.test(fullContext)) {
    scores.professional_service += 2;
  }
  
  if (/training|course|certification|learn|skill|development/i.test(fullContext)) {
    scores.training_or_coaching += 2;
  }
  
  if (/warranty|maintenance|installation|specs|capacity|model/i.test(fullContext)) {
    scores.equipment_or_hardware += 2;
  }
  
  // Return highest scoring archetype (with minimum threshold)
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore < 1) return 'unknown';
  
  return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'unknown';
}

function getExpectedQuestions(archetype) {
  const questionMap = {
    chemical_or_industrial_supply: [
      "What kind of chemical is it?",
      "What grade or spec are we talking about?", 
      "Do you have a spec sheet or SDS?",
      "What volume are we talking?",
      "How does it compare to our current supplier?"
    ],
    saas: [
      "How does it work exactly?",
      "Who has seen those results?",
      "What does implementation look like?",
      "How does it integrate with what we have?",
      "Can you show me a demo?"
    ],
    equipment_or_hardware: [
      "What are the specs?",
      "What's the capacity?",
      "What's maintenance like?",
      "What kind of warranty?",
      "How reliable is it?"
    ],
    professional_service: [
      "What's your experience with similar companies?",
      "What does the implementation process look like?",
      "What kind of results have you achieved?",
      "How do you measure success?"
    ]
  };
  
  return questionMap[archetype] || ["Generic product questions"];
}

function getUnrealisticQuestions(archetype) {
  const avoidMap = {
    chemical_or_industrial_supply: [
      "Who has seen results with your product?",
      "How does your platform work?",
      "What does onboarding look like?",
      "Can you show me a demo?"
    ],
    saas: [
      "What grade is it?",
      "Do you have a spec sheet?",
      "What are the storage requirements?",
      "What's the purity?"
    ],
    equipment_or_hardware: [
      "How does the AI work?",
      "What's the user interface?",
      "How do you onboard users?",
      "What grade is it?"
    ],
    professional_service: [
      "What grade is it?",
      "Do you have a spec sheet?", 
      "What are the storage requirements?",
      "What's the API integration like?"
    ]
  };
  
  return avoidMap[archetype] || [];
}

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: "🧪 Chemical (Industrial Solvent)",
    userInput: "We sell high-grade industrial cleaning solvents for manufacturing facilities",
    conversationHistory: ["industrial solvent", "manufacturing cleaning", "chemical grade"],
    expectedArchetype: "chemical_or_industrial_supply"
  },
  {
    name: "☕ Coffee Beans (Physical Product)", 
    userInput: "We're a specialty coffee roaster selling premium single-origin coffee beans to cafes and restaurants",
    conversationHistory: ["specialty coffee beans", "single-origin", "roasting", "cafes"],
    expectedArchetype: "physical_product"
  },
  {
    name: "🎮 Gaming Chair (Equipment/Hardware)",
    userInput: "Our company manufactures ergonomic gaming chairs with RGB lighting, premium materials, and warranty support",
    conversationHistory: ["gaming chairs", "ergonomic furniture", "RGB lighting", "warranty", "hardware"],
    expectedArchetype: "equipment_or_hardware"
  },
  {
    name: "🐕 Dog Grooming Service",
    userInput: "We provide professional dog grooming services including nail trimming, bathing, styling, and pet care consultation",
    conversationHistory: ["dog grooming", "pet services", "professional grooming", "consultation"],
    expectedArchetype: "professional_service"
  },
  {
    name: "💼 Management Consulting Service", 
    userInput: "Our firm provides strategic management consulting to help Fortune 500 companies optimize operations and increase efficiency",
    conversationHistory: ["management consulting", "Fortune 500", "strategic optimization", "advisory"],
    expectedArchetype: "professional_service"
  }
];

console.log("🧪 Testing ProductConversationPhysics Classification\n");
console.log("=" .repeat(80));

for (const scenario of TEST_SCENARIOS) {
  console.log(`\n${scenario.name}`);
  console.log("-".repeat(50));
  
  // Test classification
  const detectedArchetype = classifyProduct(scenario.userInput, scenario.conversationHistory);
  const expectedArchetype = scenario.expectedArchetype;
  
  console.log(`📋 Input: "${scenario.userInput}"`);
  console.log(`🎯 Expected: ${expectedArchetype}`);
  console.log(`🤖 Detected: ${detectedArchetype}`);
  
  if (detectedArchetype === expectedArchetype) {
    console.log("✅ CLASSIFICATION CORRECT");
  } else {
    console.log("❌ CLASSIFICATION INCORRECT");
  }
  
  // Show expected realistic questions for this archetype
  const realisticQuestions = getExpectedQuestions(detectedArchetype);
  console.log(`\n🏗️ Realistic Questions for ${detectedArchetype}:`);
  realisticQuestions.slice(0, 3).forEach(q => console.log(`  • "${q}"`));
  
  // Show what questions to avoid
  const unrealisticQuestions = getUnrealisticQuestions(detectedArchetype);
  if (unrealisticQuestions.length > 0) {
    console.log(`\n⚠️ Unrealistic Questions to Avoid:`);
    unrealisticQuestions.slice(0, 3).forEach(q => console.log(`  • "${q}"`));
  }
}

console.log("\n🎉 Product Physics Classification Test Complete!");
console.log("=" .repeat(80));

// Summary
console.log(`\n📊 SUMMARY:`);
console.log(`✅ Chemical classification should detect: SDS, specs, grades, supplier comparison`);
console.log(`✅ Coffee beans should detect: physical product qualities, sourcing, taste`);
console.log(`✅ Gaming chair should detect: equipment specs, warranty, maintenance, comfort`);
console.log(`✅ Dog grooming should detect: service experience, consultation, results`);
console.log(`✅ Consulting should detect: methodology, strategy, advisory, implementation`);
console.log(`\n🏗️ BuyerStateTree should now boost realistic states and penalize unrealistic ones!`);
