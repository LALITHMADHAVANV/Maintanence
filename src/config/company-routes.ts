export interface CompanyRouteConfig {
  enabled: boolean;
  name: string;
  projects: string[];
  databaseName: string;
  createDatabaseIfMissing: boolean;
}

// After editing, restart the app (rebuild when running in production).
// Only these enabled company/project combinations can provision a database.
export const companyRoutes: Record<string, CompanyRouteConfig> = {
  sahana: {
    enabled: true,
    name: 'Sahana',
    projects: ['project', 'maintenance'],
    databaseName: 'compliance_sahana',
    createDatabaseIfMissing: true,
  },
  texplus: {
    enabled: true,
    name: 'Texplus',
    projects: ['project', 'maintenance'],
    databaseName: 'compliance_texplus',
    createDatabaseIfMissing: true,
  },
  // Example: enable this entry, or copy it with your actual company slug.
  companyname: {
    enabled: false,
    name: 'Company Name',
    projects: ['project'],
    databaseName: 'compliance_companyname',
    createDatabaseIfMissing: true,
  },
};
