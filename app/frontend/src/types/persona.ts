/**
 * Persona interface for voice agent interactions
 * Defines the structure of a persona used in voice agent conversations
 */
export interface Persona {
  id: string | null;
  name: string;
  role: string;
  company: string;
  description_narrative: string;
  personality_traits: string[];
  base_reaction_style?: string;
  intelligence_level_generated?: string;
  primary_personality_trait_generated?: string;
  trait_metrics?: Record<string, number>;
  voice_id?: string;
}
