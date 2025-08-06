import { promises as fs } from 'fs';
import * as path from 'path';
import { faker } from '@faker-js/faker';
import { companyPackageSchema } from '../src/lib/companySchema';
import { v4 as uuidv4 } from 'uuid';

interface GenOptions {
  archetype: string;
  kpiPack: 'growth' | 'profitability' | 'expansion';
  microSegments: string[];
  outDir?: string;
}

function generateFirmographics() {
  return {
    hq_city: faker.location.city(),
    founded: faker.number.int({ min: 2005, max: 2021 }),
    employee_band: faker.helpers.arrayElement(['50-100', '100-200', '200-500']),
    arr_band_musd: faker.helpers.arrayElement(['5-10', '10-20', '20-50']),
    funding_stage: faker.helpers.arrayElement(['Seed', 'Series A', 'Series B', 'Series C']),
  } as const;
}

function fillMetrics(kpiPack: GenOptions['kpiPack']) {
  switch (kpiPack) {
    case 'growth':
      return {
        yoy_growth_pct: faker.number.int({ min: 20, max: 60 }),
        nrr_pct: faker.number.int({ min: 110, max: 130 }),
        ltv_to_cac: Number(faker.finance.amount({ min: 3, max: 6, dec: 1 })),
      };
    case 'profitability':
      return {
        gross_margin_pct: faker.number.int({ min: 60, max: 85 }),
        opex_ratio: faker.number.int({ min: 30, max: 60 }),
        cash_burn_months: faker.number.int({ min: 6, max: 18 }),
      };
    case 'expansion':
      return {
        multi_product_ratio: faker.number.int({ min: 30, max: 70 }),
        geo_split_pct: faker.number.int({ min: 20, max: 60 }),
        upsell_rate: faker.number.int({ min: 10, max: 40 }),
      };
  }
}

export async function generateBusiness(opts: GenOptions) {
  const companyId = `${faker.string.alphanumeric(8)}_${opts.archetype.replace(/\s+/g, '_').toLowerCase()}`;

  const pkg = {
    schema_version: '0.3',
    company_id: companyId,
    industry_archetype: opts.archetype,
    micro_segment: opts.microSegments,
    locale: 'en-US',
    kpi_pack: opts.kpiPack,
    firmographics: generateFirmographics(),
    metrics: fillMetrics(opts.kpiPack),
    live_data_url: '',
    sources: ['synthetic'],
    deal_seed: {
      initiative: faker.company.buzzPhrase(),
      pain_points: [faker.company.catchPhrase()],
      short_term_goal: faker.company.buzzPhrase(),
      long_term_goal: faker.company.buzzPhrase(),
    },
    personas: [],
    curveballs: [],
    scoring_flags: {},
  } as any;

  // Validate
  companyPackageSchema.parse(pkg);

  const outDir = opts.outDir || path.join(__dirname, '../../../business_profiles');
  await fs.mkdir(outDir, { recursive: true });
  const filePath = path.join(outDir, `${companyId}.json`);
  await fs.writeFile(filePath, JSON.stringify(pkg, null, 2), 'utf-8');
  console.log(`✅ Generated ${filePath}`);
}

// CLI
if (require.main === module) {
  const archetype = process.argv[2] || 'Mid-market SaaS';
  const kpiPack = (process.argv[3] as GenOptions['kpiPack']) || 'growth';
  const micro = process.argv[4] ? process.argv[4].split(',') : ['VC_backed'];

  generateBusiness({ archetype, kpiPack, microSegments: micro }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
