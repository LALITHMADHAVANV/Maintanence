import type { MongoClient } from 'mongodb';
import { companyRoutes, type CompanyRouteConfig } from '@/config/company-routes';
import { getCompaniesCollection, invalidateRegistryCache } from '@/lib/registry';

export function getEnabledCompanyRoute(company: string, project: string): CompanyRouteConfig | null {
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(company) || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(project)) return null;
  const config = Object.hasOwn(companyRoutes, company) ? companyRoutes[company] : undefined;
  if (!config?.enabled || !config.projects.includes(project)) return null;
  if (!/^[a-zA-Z0-9_-]{1,63}$/.test(config.databaseName)) throw new Error('Invalid database name in company route configuration.');
  return config;
}

export async function provisionCompanyRoute(client: MongoClient, slug: string, config: CompanyRouteConfig): Promise<boolean> {
  const companies = getCompaniesCollection(client);
  let company = await companies.findOne({ slug });
  if (company && !company.active) return false;

  // Preserve the database mapping already registered for this company.
  const databaseName = company?.databaseName || config.databaseName;
  const database = client.db(databaseName);
  const exists = await database.listCollections({}, { nameOnly: true }).hasNext();
  if (!exists && !config.createDatabaseIfMissing) return false;

  // MongoDB physically creates a missing database on the first collection write.
  // An existing database is reused without inserting demo data or changing users.
  if (!exists) {
    try {
      await database.createCollection('users');
    } catch (error) {
      // Two first visits may provision the same database concurrently.
      if (!(error instanceof Error && 'code' in error && error.code === 48)) throw error;
    }
  }

  if (!company) {
    const now = new Date().toISOString();
    try {
      await companies.updateOne({ slug }, { $setOnInsert: {
        slug, name: config.name, databaseName, active: true, createdAt: now, updatedAt: now,
      } }, { upsert: true });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error;
    }
    invalidateRegistryCache();
    company = await companies.findOne({ slug });
  }
  return Boolean(company?.active);
}
