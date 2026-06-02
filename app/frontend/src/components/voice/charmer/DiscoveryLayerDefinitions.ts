/**
 * DiscoveryLayerDefinitions
 * 
 * Defines the layered discovery flows for different product types.
 * Each layer requires specific question types to unlock the next layer.
 */

import { DiscoveryLayerDef } from './BuyerStateTypes';

/**
 * Create discovery layers for sales training products
 * Encourages why/how/what questions to uncover deeper problems
 */
export function createSalesTrainingDiscoveryLayers(): DiscoveryLayerDef[] {
  return [
    {
      layer: 'surface',
      trigger: 'initial_state',
      response: 'We have online courses for the team.',
      hint: '"courses" (plural, vague) - what kind? how\'s it working?'
    },
    {
      layer: 'shallow',
      trigger: 'rep_asks_how_what_about_current',
      response: 'They go through modules and do quizzes. That sort of thing.',
      hint: '"that sort of thing" (dismissive) - is there a problem?',
      requiresOpenEnded: true
    },
    {
      layer: 'problem_surface',
      trigger: 'rep_asks_about_issues',
      response: 'Well... we do see inconsistent usage. A lot of our reps don\'t go through the modules.',
      hint: '"inconsistent usage" - WHY don\'t they complete it?'
    },
    {
      layer: 'root_cause',
      trigger: 'rep_asks_why',
      response: 'Well, it\'s kinda boring I guess.',
      hint: '"boring" - what makes it boring? (leading to "not interactive")',
      requiresOpenEnded: true
    },
    {
      layer: 'confirmation',
      trigger: 'rep_suggests_cause',
      response: 'Yeah, that\'s probably not helping.',
      hint: '"not helping" - what\'s the IMPACT of this?'
    },
    {
      layer: 'impact',
      trigger: 'rep_asks_what_happens',
      response: 'Well... we do see inconsistent performance in calls. Some reps crush it, others struggle. I guess that could be related.',
      hint: 'Breakthrough: Rep connected incomplete training → performance gaps',
      requiresOpenEnded: true,
      breakthrough: true
    }
  ];
}

/**
 * Create discovery layers for SaaS products
 */
export function createSaaSDiscoveryLayers(): DiscoveryLayerDef[] {
  return [
    {
      layer: 'surface',
      trigger: 'initial_state',
      response: 'We use [competitor] right now.',
      hint: 'Mentions current solution - how\'s it working?'
    },
    {
      layer: 'shallow',
      trigger: 'rep_asks_how_what_about_current',
      response: 'It works fine for what we need.',
      hint: '"fine" + "what we need" (minimal) - any issues?',
      requiresOpenEnded: true
    },
    {
      layer: 'problem_surface',
      trigger: 'rep_asks_about_issues',
      response: 'Well, the team does mention some integration headaches.',
      hint: '"integration headaches" - what kind? how often?'
    },
    {
      layer: 'root_cause',
      trigger: 'rep_asks_why',
      response: 'It doesn\'t really play nice with our CRM. Manual data entry, that kind of thing.',
      hint: '"manual data entry" - what\'s the impact?',
      requiresOpenEnded: true
    },
    {
      layer: 'confirmation',
      trigger: 'rep_suggests_cause',
      response: 'Yeah, it\'s definitely a time sink.',
      hint: '"time sink" - how much time? what\'s the cost?'
    },
    {
      layer: 'impact',
      trigger: 'rep_asks_what_happens',
      response: 'Probably 3-4 hours per rep per week. That adds up across the team. Never really calculated the total cost.',
      hint: 'Breakthrough: Rep helped Marcus quantify the hidden cost',
      requiresOpenEnded: true,
      breakthrough: true
    }
  ];
}

/**
 * Create discovery layers for professional services
 */
export function createProfessionalServiceDiscoveryLayers(): DiscoveryLayerDef[] {
  return [
    {
      layer: 'surface',
      trigger: 'initial_state',
      response: 'We handle most of this internally.',
      hint: '"most" (not all) - what don\'t they handle?'
    },
    {
      layer: 'shallow',
      trigger: 'rep_asks_how_what_about_current',
      response: 'Our team manages it. They\'re pretty busy though.',
      hint: '"pretty busy" - capacity issue?',
      requiresOpenEnded: true
    },
    {
      layer: 'problem_surface',
      trigger: 'rep_asks_about_issues',
      response: 'Yeah, we do have a backlog. Some projects get delayed.',
      hint: '"backlog" + "delayed" - why? what\'s causing it?'
    },
    {
      layer: 'root_cause',
      trigger: 'rep_asks_why',
      response: 'We don\'t have enough specialized expertise in-house. So things take longer.',
      hint: '"specialized expertise" - what\'s the impact of delays?',
      requiresOpenEnded: true
    },
    {
      layer: 'confirmation',
      trigger: 'rep_suggests_cause',
      response: 'Yeah, that\'s part of it.',
      hint: '"part of it" - what else? what happens due to delays?'
    },
    {
      layer: 'impact',
      trigger: 'rep_asks_what_happens',
      response: 'We\'ve missed a couple market windows. Competitors shipped first. That hurt.',
      hint: 'Breakthrough: Rep connected lack of expertise → missed opportunities',
      requiresOpenEnded: true,
      breakthrough: true
    }
  ];
}

/**
 * Create generic discovery layers for unknown products
 */
export function createGenericDiscoveryLayers(): DiscoveryLayerDef[] {
  return [
    {
      layer: 'surface',
      trigger: 'initial_state',
      response: 'We\'re doing okay with our current approach.',
      hint: '"okay" (lukewarm) - how\'s it actually working?'
    },
    {
      layer: 'shallow',
      trigger: 'rep_asks_how_what_about_current',
      response: 'It gets the job done, mostly.',
      hint: '"mostly" - what doesn\'t it do?',
      requiresOpenEnded: true
    },
    {
      layer: 'problem_surface',
      trigger: 'rep_asks_about_issues',
      response: 'There are some inefficiencies, I guess.',
      hint: '"inefficiencies" - what kind? where?'
    },
    {
      layer: 'root_cause',
      trigger: 'rep_asks_why',
      response: 'Things take longer than they should. Not sure why exactly.',
      hint: '"take longer" - what\'s the impact?',
      requiresOpenEnded: true
    },
    {
      layer: 'confirmation',
      trigger: 'rep_suggests_cause',
      response: 'Yeah, that could be it.',
      hint: '"could be" - what happens because of this?'
    },
    {
      layer: 'impact',
      trigger: 'rep_asks_what_happens',
      response: 'We probably lose some opportunities. Hard to say exactly how much.',
      hint: 'Breakthrough: Rep helped Marcus see the hidden cost',
      requiresOpenEnded: true,
      breakthrough: true
    }
  ];
}

/**
 * Get appropriate discovery layers based on product archetype
 */
export function getDiscoveryLayersForProduct(archetype?: string, subType?: string): DiscoveryLayerDef[] {
  if (!archetype) {
    return createGenericDiscoveryLayers();
  }

  switch (archetype) {
    case 'training_or_coaching':
      if (subType === 'ai_sales_training' || subType === 'sales_training') {
        return createSalesTrainingDiscoveryLayers();
      }
      return createGenericDiscoveryLayers();
    
    case 'saas':
      return createSaaSDiscoveryLayers();
    
    case 'professional_service':
      return createProfessionalServiceDiscoveryLayers();
    
    default:
      return createGenericDiscoveryLayers();
  }
}
