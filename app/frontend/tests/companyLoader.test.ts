import { loadCompany } from '../src/lib/companyLoader';

describe('Company package loader', () => {
  it('validates and loads growth KPI pack profile', async () => {
    const pkg = await loadCompany('cloudlift_saas_mm_01');
    expect(pkg.company_id).toBe('cloudlift_saas_mm_01');
    expect(pkg.kpi_pack).toBe('growth');
    expect(pkg.metrics).toHaveProperty('yoy_growth_pct');
  });
});
