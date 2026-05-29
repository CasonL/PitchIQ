/**
 * BuyerStateProductNodes
 * 
 * Pure functions that create product-specific buyer state node definitions.
 * Subtypes here MUST match what BuyerStateScoring.getStateRealismForProduct() looks for.
 */

import { BuyerStateType } from './BuyerStateTypes';

export type ProductNodeDef = {
  stateType: BuyerStateType;
  stateSubtype: string | null;
  stateName: string;
  stateDescription: string;
  expectedBehaviors: string[];
  baseConfidence: number;
  hardTriggers: string[];
  softTriggers: string[];
  minTurns?: number;
};

export function buildProofBehaviors(productPhysics: any): string[] {
  if (!productPhysics?.archetype) {
    return ['"Tell me more about..."', 'Asking for case studies/proof', 'Probing for catches'];
  }
  switch (productPhysics.archetype) {
    case 'saas':
      return [
        '"Who else is using this platform?"',
        '"What kind of ROI have your clients seen?"',
        '"Can you provide references from similar companies?"'
      ];
    case 'chemical_or_industrial_supply':
      return [
        '"Can you provide certificates of analysis?"',
        '"Do you have an SDS I can review?"',
        '"What quality standards do you meet?"'
      ];
    case 'professional_service':
      return [
        '"Can you share client references?"',
        '"What results have you achieved for similar companies?"',
        '"What happens if the project doesn\'t meet expectations?"'
      ];
    default:
      return ['"Tell me more about..."', 'Asking for case studies/proof', 'Probing for catches'];
  }
}

export function createClarificationNode(productPhysics?: any): ProductNodeDef {
  if (!productPhysics?.archetype) {
    return {
      stateType: 'clarification', stateSubtype: 'politely_curious',
      stateName: 'Politely Curious',
      stateDescription: 'Marcus is willing to hear more, but keeping it brief.',
      expectedBehaviors: ['Asks "What\'s this about?"', 'Brief, open-ended responses', 'Checking time/urgency'],
      baseConfidence: 40,
      hardTriggers: ['rep_provides_clear_value_statement'],
      softTriggers: ['rep_asks_permission_to_continue', 'rep_personalizes_opening'],
      minTurns: 2
    };
  }
  switch (productPhysics.archetype) {
    case 'saas':
      return {
        stateType: 'clarification', stateSubtype: 'platform_integration_clarity',
        stateName: 'Platform Integration Clarity',
        stateDescription: 'Marcus wants to understand the technical fit.',
        expectedBehaviors: productPhysics.naturalQuestions?.slice(0, 3) || [
          'Asks "What kind of platform is this?"',
          '"How does it integrate with our current systems?"',
          '"What problem does this solve exactly?"'
        ],
        baseConfidence: 45,
        hardTriggers: ['rep_provides_clear_value_statement'],
        softTriggers: ['rep_asks_permission_to_continue', 'rep_personalizes_opening'],
        minTurns: 2
      };
    case 'chemical_or_industrial_supply':
      return {
        stateType: 'clarification', stateSubtype: 'spec_grade_clarity',
        stateName: 'Spec Grade Clarity',
        stateDescription: 'Marcus needs technical specifications.',
        expectedBehaviors: productPhysics.naturalQuestions?.slice(0, 3) || [
          'Asks "What kind of chemical/material is this?"',
          '"Do you have an SDS or spec sheet?"',
          '"What grade or purity level?"'
        ],
        baseConfidence: 45,
        hardTriggers: ['rep_provides_clear_value_statement'],
        softTriggers: ['rep_asks_permission_to_continue', 'rep_personalizes_opening'],
        minTurns: 2
      };
    case 'professional_service':
      return {
        stateType: 'clarification', stateSubtype: 'implementation_timeline_clarity',
        stateName: 'Implementation Timeline Clarity',
        stateDescription: 'Marcus wants to understand the service scope.',
        expectedBehaviors: productPhysics.naturalQuestions?.slice(0, 3) || [
          'Asks "What type of service are you offering?"',
          '"How long does implementation typically take?"',
          '"What\'s your experience in our industry?"'
        ],
        baseConfidence: 45,
        hardTriggers: ['rep_provides_clear_value_statement'],
        softTriggers: ['rep_asks_permission_to_continue', 'rep_personalizes_opening'],
        minTurns: 2
      };
    case 'training_or_coaching':
      // Use subtype for more specific nodes
      if (productPhysics.subType === 'ai_sales_training' || productPhysics.subType === 'sales_training') {
        return {
          stateType: 'clarification', stateSubtype: 'ai_training_skepticism',
          stateName: 'AI Training Skepticism',
          stateDescription: 'Marcus is curious but skeptical about AI replacing human coaching.',
          expectedBehaviors: [
            '"So this is AI coaching? How does that work exactly?"',
            '"Can AI really understand the nuances of sales?"',
            '"What makes this better than our current training?"',
            '"Do the reps actually use it?"'
          ],
          baseConfidence: 45,
          hardTriggers: ['rep_explains_ai_benefits', 'rep_shares_success_metrics'],
          softTriggers: ['rep_acknowledges_skepticism', 'rep_compares_to_human_coaching'],
          minTurns: 2
        };
      }
      // Default training node
      return {
        stateType: 'clarification', stateSubtype: 'training_effectiveness',
        stateName: 'Training Effectiveness',
        stateDescription: 'Marcus wants proof that training actually works.',
        expectedBehaviors: [
          '"What kind of training is this?"',
          '"How do you measure results?"',
          '"What\'s the time commitment?"'
        ],
        baseConfidence: 40,
        hardTriggers: ['rep_provides_roi_data'],
        softTriggers: ['rep_shares_case_study'],
        minTurns: 2
      };
    default:
      return createClarificationNode(null);
  }
}

export function createDistractedNode(_productPhysics?: any): ProductNodeDef {
  return {
    stateType: 'distrust', stateSubtype: 'guarded_skeptical',
    stateName: 'Guarded Skeptical',
    stateDescription: 'Marcus is defensive, assumes this is a sales pitch.',
    expectedBehaviors: ['"I\'m not interested"', '"We\'re all set"', 'Short, dismissive responses'],
    baseConfidence: 35,
    hardTriggers: ['rep_launches_into_pitch_immediately'],
    softTriggers: ['rep_sounds_scripted', 'rep_ignores_context'],
    minTurns: 2
  };
}

export function createTimingNode(_productPhysics?: any): ProductNodeDef {
  return {
    stateType: 'timing_concern', stateSubtype: 'busy_professional',
    stateName: 'Busy But Professional',
    stateDescription: 'Marcus is genuinely busy but willing to be polite.',
    expectedBehaviors: ['"Can you make this quick?"', '"What do you need?"', 'Checking calendar/time'],
    baseConfidence: 25,
    hardTriggers: ['rep_respects_time'],
    softTriggers: ['rep_asks_about_timing', 'rep_offers_to_reschedule'],
    minTurns: 1
  };
}

export function createEngagedNode(productPhysics?: any): ProductNodeDef {
  if (!productPhysics?.archetype) {
    return {
      stateType: 'buying_signal', stateSubtype: 'engaged_asking',
      stateName: 'Engaged & Asking',
      stateDescription: 'Marcus sees potential relevance and wants to learn more.',
      expectedBehaviors: ['Asks specific questions', 'Shares context about his situation', 'Exploring fit'],
      baseConfidence: 60,
      hardTriggers: ['rep_asks_good_discovery_question'],
      softTriggers: ['rep_demonstrates_product_understanding', 'rep_shares_relevant_example'],
      minTurns: 3
    };
  }
  switch (productPhysics.archetype) {
    case 'saas':
      return {
        stateType: 'buying_signal', stateSubtype: 'platform_integration_interest',
        stateName: 'Platform Integration Interest',
        stateDescription: 'Marcus is exploring technical implementation.',
        expectedBehaviors: [
          '"How many users can we have on this?"',
          '"What\'s the onboarding process like?"',
          '"Can you show me a quick demo?"'
        ],
        baseConfidence: 60,
        hardTriggers: ['rep_asks_good_discovery_question'],
        softTriggers: ['rep_demonstrates_product_understanding', 'rep_shares_relevant_example'],
        minTurns: 3
      };
    case 'chemical_or_industrial_supply':
      return {
        stateType: 'buying_signal', stateSubtype: 'volume_supply_interest',
        stateName: 'Volume Supply Interest',
        stateDescription: 'Marcus is exploring supply logistics.',
        expectedBehaviors: [
          '"What volumes do you typically supply?"',
          '"What are your lead times?"',
          '"Do you handle shipping and storage?"'
        ],
        baseConfidence: 60,
        hardTriggers: ['rep_asks_good_discovery_question'],
        softTriggers: ['rep_demonstrates_product_understanding', 'rep_shares_relevant_example'],
        minTurns: 3
      };
    case 'professional_service':
      return {
        stateType: 'buying_signal', stateSubtype: 'implementation_service_interest',
        stateName: 'Implementation Service Interest',
        stateDescription: 'Marcus is exploring project scope.',
        expectedBehaviors: [
          '"What does your typical project timeline look like?"',
          '"Can you share some case studies?"',
          '"What\'s your team\'s background?"'
        ],
        baseConfidence: 60,
        hardTriggers: ['rep_asks_good_discovery_question'],
        softTriggers: ['rep_demonstrates_product_understanding', 'rep_shares_relevant_example'],
        minTurns: 3
      };
    case 'training_or_coaching':
      // Use subtype for AI-specific engagement
      if (productPhysics.subType === 'ai_sales_training' || productPhysics.subType === 'sales_training') {
        return {
          stateType: 'buying_signal', stateSubtype: 'ai_training_exploration',
          stateName: 'AI Training Exploration',
          stateDescription: 'Marcus is intrigued by the AI approach and exploring fit.',
          expectedBehaviors: [
            '"How realistic are these AI conversations?"',
            '"Can it handle our specific objections?"',
            '"What metrics do you track?"',
            '"How quickly do reps improve?"',
            '"Do you integrate with our CRM?"'
          ],
          baseConfidence: 65,
          hardTriggers: ['rep_demonstrates_ai_capabilities', 'rep_shares_roi_metrics'],
          softTriggers: ['rep_addresses_ai_concerns', 'rep_shows_customization'],
          minTurns: 3
        };
      }
      return {
        stateType: 'buying_signal', stateSubtype: 'training_roi_interest',
        stateName: 'Training ROI Interest',
        stateDescription: 'Marcus wants to understand training effectiveness.',
        expectedBehaviors: [
          '"How do you measure improvement?"',
          '"What\'s the typical ROI?"',
          '"How much time commitment?"'
        ],
        baseConfidence: 60,
        hardTriggers: ['rep_shares_success_metrics'],
        softTriggers: ['rep_relates_to_pain_points'],
        minTurns: 3
      };
    default:
      return createEngagedNode(null);
  }
}

export function createProofNode(productPhysics?: any): ProductNodeDef {
  if (!productPhysics?.archetype) {
    return {
      stateType: 'risk_concern', stateSubtype: 'interested_cautious',
      stateName: 'Interested But Cautious',
      stateDescription: 'Marcus likes what he hears but wants proof.',
      expectedBehaviors: ['"Tell me more about..."', 'Asking for case studies/proof', 'Probing for catches'],
      baseConfidence: 30,
      hardTriggers: ['rep_makes_bold_claim_without_proof'],
      softTriggers: ['rep_provides_social_proof', 'rep_shares_metrics'],
      minTurns: 2
    };
  }
  switch (productPhysics.archetype) {
    case 'saas':
      return {
        stateType: 'risk_concern', stateSubtype: 'platform_validation_concern',
        stateName: 'Platform Validation Concern',
        stateDescription: 'Marcus wants proof of platform effectiveness.',
        expectedBehaviors: buildProofBehaviors(productPhysics),
        baseConfidence: 30,
        hardTriggers: ['rep_makes_bold_claim_without_proof'],
        softTriggers: ['rep_provides_social_proof', 'rep_shares_metrics'],
        minTurns: 2
      };
    case 'chemical_or_industrial_supply':
      return {
        stateType: 'risk_concern', stateSubtype: 'sds_compliance_concern',
        stateName: 'SDS Compliance Concern',
        stateDescription: 'Marcus needs quality and safety validation.',
        expectedBehaviors: buildProofBehaviors(productPhysics),
        baseConfidence: 30,
        hardTriggers: ['rep_makes_bold_claim_without_proof'],
        softTriggers: ['rep_provides_social_proof', 'rep_shares_metrics'],
        minTurns: 2
      };
    case 'professional_service':
      return {
        stateType: 'risk_concern', stateSubtype: 'implementation_service_validation',
        stateName: 'Implementation Service Validation',
        stateDescription: 'Marcus wants proof of service delivery.',
        expectedBehaviors: buildProofBehaviors(productPhysics),
        baseConfidence: 30,
        hardTriggers: ['rep_makes_bold_claim_without_proof'],
        softTriggers: ['rep_provides_social_proof', 'rep_shares_metrics'],
        minTurns: 2
      };
    default:
      return createProofNode(null);
  }
}
