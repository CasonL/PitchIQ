import { SELLER_SIGNALS } from '../BuyerTriggerConstants';
import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateClaimUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
  const { recentSellerSignals } = context;

  const mechanicsExplained = recentSellerSignals.includes(SELLER_SIGNALS.EXPLAINED_MECHANISM);
  const proofProvided = recentSellerSignals.includes(SELLER_SIGNALS.PROVIDED_PROOF);
  const sellerStayedVague = recentSellerSignals.includes(SELLER_SIGNALS.VAGUE_CLAIM);
  const sellerDodgedMechanics = recentSellerSignals.includes(SELLER_SIGNALS.DODGED_MECHANICS);

  // Path 1: Seller stayed vague or dodged → skeptical statement
  if (sellerStayedVague || sellerDodgedMechanics) {
    return {
      mode: 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR',
      stage: 'CREDIBILITY',
      internalPosture: "You heard the claim, but the seller hasn't explained it clearly. You're becoming skeptical and less willing to engage.",
      promptGuidance: [
        'Express skepticism briefly',
        'Do not ask a long follow-up',
        'Do not reveal pain points or budget'
      ],
      voiceExamples: [
        '"That still sounds pretty broad."',
        '"Not sure that applies to us."'
      ],
      allowedTopics: ['credibility', 'relevance', 'differentiation'],
      developerNotes: [
        'Seller made bold claim but failed to explain mechanism clearly',
        'Buyer shifts from curiosity to skepticism because clarity was not earned'
      ]
    };
  }

  // Path 2: Mechanics not explained → ask HOW
  if (!mechanicsExplained) {
    return {
      mode: 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR',
      stage: 'MECHANICS',
      internalPosture: "You heard the claim, but you don't understand how they achieve it. You need a simple explanation of the mechanism before proof matters.",
      promptGuidance: [
        'Ask how they achieve the claim',
        'Keep the question brief and direct',
        'Do not reveal pain points or budget'
      ],
      voiceExamples: [
        '"15%? How do you actually do that?"',
        '"Okay, but how does it work?"'
      ],
      allowedTopics: ['mechanics', 'how_it_works', 'process'],
      developerNotes: [
        'Bold claim triggered mechanics question',
        'Mechanism comes before proof - HOW before WHO',
        'Signal-based: mechanicsExplained = false'
      ]
    };
  }

  // Path 3: Mechanics explained but no proof → ask WHO/PROOF
  if (!proofProvided) {
    return {
      mode: 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR',
      stage: 'CREDIBILITY',
      internalPosture: "You understand the basic mechanism, but you don't trust the claim yet. You need proof or a real example.",
      promptGuidance: [
        'Ask for proof or a specific customer example',
        'Stay skeptical but open',
        'Do not reveal pain points or budget yet'
      ],
      voiceExamples: [
        '"Who\'s actually seen that result?"',
        '"Got a real example?"'
      ],
      allowedTopics: ['proof', 'case_studies', 'customer_examples', 'metrics'],
      developerNotes: [
        'Mechanism has been explained, so buyer can now ask for credibility/proof',
        'Signal-based: mechanicsExplained = true, proofProvided = false'
      ]
    };
  }

  // Path 4: Mechanics + proof established → ask FIT/VALUE
  return {
    mode: 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR',
    stage: 'VALUE',
    internalPosture: "The claim is clearer and somewhat credible, but you still need to understand whether it applies to your situation.",
    promptGuidance: [
      'Ask whether the result applies to a business like yours',
      'Share only limited context if asked directly',
      'Do not reveal budget or authority'
    ],
    voiceExamples: [
      '"Was that with a team like ours?"',
      '"Okay, but would that apply to our setup?"'
    ],
    allowedTopics: ['fit', 'relevance', 'customer_similarity'],
    developerNotes: [
      'Mechanics and proof are partially satisfied, so buyer moves toward fit/value evaluation',
      'Signal-based: mechanicsExplained = true, proofProvided = true'
    ]
  };
}
