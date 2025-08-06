import { companyPackageSchema, CompanyPackage } from './companySchema';

export async function loadCompany(id: string): Promise<CompanyPackage> {
  try {
    const response = await fetch(`/api/company/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to load company data');
    }

    const data = await response.json();
    const parsed = companyPackageSchema.parse(data);
    return parsed;
  } catch (error) {
    console.error('Error loading company data:', error);
    throw error;
  }
}

// future dynamo placeholder – same return shape
export async function loadCompanyDynamo(id: string): Promise<CompanyPackage> {
  // This can be updated later to call a different API endpoint if needed
  return loadCompany(id);
}
