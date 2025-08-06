import { z } from 'zod';

export const kpiPackEnum = z.enum(['growth', 'profitability', 'expansion']);
export const meetingMoodEnum = z.enum(['cautious', 'neutral', 'excited']);
export const localeEnum = z.enum(['en-US', 'en-GB']);

export const companyPackageSchema = z.object({
  schema_version: z.literal('0.3'),
  company_id: z.string().min(1),
  industry_archetype: z.string().min(1),
  micro_segment: z.array(z.string()).nonempty(),
  locale: localeEnum,
  kpi_pack: kpiPackEnum,
  firmographics: z.object({
    hq_city: z.string(),
    founded: z.number().int(),
    employee_band: z.string(),
    arr_band_musd: z.string(),
    funding_stage: z.string(),
  }),
  metrics: z.record(z.string(), z.number().or(z.string())),
  live_data_url: z.string().optional(),
  sources: z.array(z.string()),
  deal_seed: z.object({
    initiative: z.string(),
    pain_points: z.array(z.string()),
    short_term_goal: z.string(),
    long_term_goal: z.string(),
  }),
  // TODO: personas will be re-enabled when SAM persona service is integrated
  personas: z.array(
    z.object({
      persona_id: z.string(),
      title: z.string(),
      meeting_mood: meetingMoodEnum.optional(),
      personal_kpis: z.array(z.string()),
      communication_style: z.string(),
      memory: z.array(
        z.object({
          fact: z.string(),
          locked: z.boolean(),
        })
      ),
      objection_storyboards: z.array(
        z.object({
          thread_id: z.string(),
          min_gap_sec: z.number().optional(),
          turns: z.array(z.record(z.string(), z.any())),
        })
      ),
    })
  ).optional(),
  curveballs: z.array(
    z.object({
      event: z.string(),
      trigger: z.string(),
      text: z.string(),
    })
  ),
  scoring_flags: z.record(z.string(), z.boolean().or(z.string()).or(z.number())),
});

export type CompanyPackage = z.infer<typeof companyPackageSchema>;
