import { MongoClient, Db, Collection, Document } from 'mongodb';
import { validateActiveCompany, getCompanyBySlug, CompanyRecord, ensureRegistryInitialized } from './registry';
import { verifySessionToken, extractSessionToken, SessionPayload } from './auth';

const defaultCloudUri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/?appName=Cluster0';
const localUri = 'mongodb://127.0.0.1:27017';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export class TenantError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'TENANT_ERROR'
  ) {
    super(message);
    this.name = 'TenantError';
  }
}

export class TenantNotFoundError extends TenantError {
  constructor(slug: string) {
    super(`Workspace "${slug}" not found in company registry`, 404, 'WORKSPACE_NOT_FOUND');
    this.name = 'TenantNotFoundError';
  }
}

export class TenantInactiveError extends TenantError {
  constructor(slug: string) {
    super(`Workspace "${slug}" is inactive or suspended`, 403, 'WORKSPACE_INACTIVE');
    this.name = 'TenantInactiveError';
  }
}

export class CrossTenantAccessError extends TenantError {
  constructor(authenticatedSlug: string, requestedSlug: string) {
    super(
      `Access denied: Authenticated workspace "${authenticatedSlug}" cannot access data belonging to "${requestedSlug}"`,
      403,
      'CROSS_TENANT_ACCESS_FORBIDDEN'
    );
    this.name = 'CrossTenantAccessError';
  }
}

function isValidMongoUri(uri?: string | null): boolean {
  if (!uri) return false;
  const trimmed = uri.trim();
  if (
    trimmed.includes('...') ||
    trimmed.includes('<username>') ||
    trimmed.includes('<password>') ||
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.includes('your_')
  ) {
    return false;
  }
  if (!trimmed.startsWith('mongodb://') && !trimmed.startsWith('mongodb+srv://')) {
    return false;
  }
  if (trimmed.startsWith('mongodb+srv://') && !trimmed.includes('@')) {
    return false;
  }
  return true;
}

function getPrimaryUri(): string {
  const envUri = (process.env.MONGODB_URI || '').trim();
  if (isValidMongoUri(envUri)) {
    return envUri;
  }
  return defaultCloudUri;
}

async function connectClient(): Promise<MongoClient> {
  const primaryUri = getPrimaryUri();
  const options = { serverSelectionTimeoutMS: 9000, connectTimeoutMS: 9000 };
  try {
    const client = new MongoClient(primaryUri, options);
    await client.connect();
    // Warm-up registry
    await ensureRegistryInitialized(client);
    return client;
  } catch (err: unknown) {
    if (primaryUri !== defaultCloudUri && isValidMongoUri(defaultCloudUri)) {
      console.warn(`Primary MongoDB URI failed, attempting default cloud cluster...`);
      try {
        const cloudClient = new MongoClient(defaultCloudUri, options);
        await cloudClient.connect();
        await ensureRegistryInitialized(cloudClient);
        return cloudClient;
      } catch (cloudErr) {
        console.warn('Default cloud fallback failed:', (cloudErr as any)?.message || cloudErr);
      }
    }
    if (primaryUri !== localUri) {
      console.warn(`Falling back to local MongoDB at ${localUri}...`);
      try {
        const fallbackClient = new MongoClient(localUri, options);
        await fallbackClient.connect();
        await ensureRegistryInitialized(fallbackClient);
        return fallbackClient;
      } catch (fallbackErr) {
        console.warn('Local MongoDB fallback also failed:', (fallbackErr as any)?.message || fallbackErr);
        throw err;
      }
    }
    throw err;
  }
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connectClient();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = connectClient();
}

export default clientPromise;

/**
 * Returns the singleton MongoClient instance
 */
export async function getMongoClient(): Promise<MongoClient> {
  try {
    return await clientPromise;
  } catch {
    const fresh = await connectClient();
    global._mongoClientPromise = Promise.resolve(fresh);
    clientPromise = global._mongoClientPromise;
    return fresh;
  }
}

/**
 * Normalizes input slug to standard clean format
 */
export function normalizeCompanySlug(raw?: string | null): string {
  if (!raw) return '';
  return String(raw).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
}

/**
 * Validates company and returns its dedicated database.
 * Reuses the MongoDB connection efficiently.
 */
export async function getCompanyDatabase(companySlug: string): Promise<{ db: Db; company: CompanyRecord }> {
  const client = await getMongoClient();
  const cleanSlug = normalizeCompanySlug(companySlug);
  
  if (!cleanSlug) {
    throw new TenantError('Company slug is required', 400);
  }

  const { valid, company, error } = await validateActiveCompany(client, cleanSlug);
  if (!valid || !company) {
    if (error && error.includes('inactive')) {
      throw new TenantInactiveError(cleanSlug);
    }
    throw new TenantNotFoundError(cleanSlug);
  }

  // Reuses the MongoClient connection to access the tenant's isolated database
  const db = client.db(company.databaseName);
  return { db, company };
}

/**
 * Helper to get clean collection name
 */
export function cleanColName(name: string): string {
  return name.includes('.') ? name.split('.').pop()! : name;
}

/**
 * TenantDb encapsulates a dedicated company database instance
 */
export class TenantDb {
  constructor(
    public readonly _db: Db,
    public readonly company: CompanyRecord,
    public readonly sessionUser?: SessionPayload | null
  ) {}

  get databaseName(): string {
    return this.company.databaseName;
  }

  get rawDb(): Db {
    return this._db;
  }

  get tenant(): string {
    return this.company.slug;
  }

  get companyName(): string {
    return this.company.name;
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    const clean = cleanColName(name);
    const rawCol = this._db.collection<T>(clean);
    const companyName = this.company.name;
    const companySlug = this.company.slug;

    // Attach company metadata on new documents automatically
    return new Proxy(rawCol, {
      get(target, prop, receiver) {
        if (prop === 'insertOne') {
          return (doc: any, options?: any) => {
            if (doc && typeof doc === 'object') {
              if (!doc.company) doc.company = companyName;
              if (!doc.companySlug) doc.companySlug = companySlug;
            }
            return target.insertOne(doc, options);
          };
        }
        if (prop === 'insertMany') {
          return (docs: any[], options?: any) => {
            if (Array.isArray(docs)) {
              docs.forEach((d) => {
                if (d && typeof d === 'object') {
                  if (!d.company) d.company = companyName;
                  if (!d.companySlug) d.companySlug = companySlug;
                }
              });
            }
            return target.insertMany(docs, options);
          };
        }
        if (prop === 'updateOne') {
          return (filter: any, update: any, options?: any) => {
            if (options?.upsert) {
              if (update && update.$set) {
                if (!update.$set.company) update.$set.company = companyName;
                if (!update.$set.companySlug) update.$set.companySlug = companySlug;
              } else if (update && !update.$set) {
                update.$setOnInsert = {
                  ...(update.$setOnInsert || {}),
                  company: companyName,
                  companySlug: companySlug,
                };
              }
            }
            return target.updateOne(filter, update, options);
          };
        }
        const val = Reflect.get(target, prop, receiver);
        return typeof val === 'function' ? val.bind(target) : val;
      },
    });
  }

  rawCollection<T extends Document = Document>(name: string): Collection<T> {
    return this._db.collection<T>(cleanColName(name));
  }
}

/**
 * Authoritatively resolves tenant company and dedicated database from an API request.
 * Enforces strict multi-tenant isolation:
 * - Checks cryptographic session token first.
 * - Compares with any client-supplied company slug. Rejects cross-tenant attempts with 403 Forbidden.
 * - If unauthenticated (e.g. login), validates slug against central registry.
 */
export async function resolveTenantFromRequest(req: Request): Promise<{
  db: Db;
  company: CompanyRecord;
  sessionUser: SessionPayload | null;
}> {
  const client = await getMongoClient();

  // 1. Check for cryptographically signed session token
  const token = extractSessionToken(req);
  const sessionUser = token ? verifySessionToken(token) : null;

  // 2. Extract any client-supplied company slug from header, cookie, or URL query
  let clientSuppliedSlug = '';
  
  // Headers
  const headerSlug = req.headers.get('x-company-slug') || req.headers.get('x-company') || req.headers.get('x-tenant-id');
  if (headerSlug) clientSuppliedSlug = normalizeCompanySlug(headerSlug);

  // Cookie
  if (!clientSuppliedSlug) {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookieMatch = cookieHeader.match(/cmms_active_company=([^;]+)/i) || cookieHeader.match(/cmms_tenant=([^;]+)/i);
    if (cookieMatch && cookieMatch[1]) {
      clientSuppliedSlug = normalizeCompanySlug(decodeURIComponent(cookieMatch[1]));
    }
  }

  // URL query
  if (!clientSuppliedSlug) {
    try {
      const url = new URL(req.url);
      const q = url.searchParams.get('company') || url.searchParams.get('tenant') || url.searchParams.get('companySlug');
      if (q) clientSuppliedSlug = normalizeCompanySlug(q);
    } catch {}
  }

  // 3. If user is authenticated, their session token is authoritative
  if (sessionUser && sessionUser.companySlug) {
    const authSlug = normalizeCompanySlug(sessionUser.companySlug);

    // Cross-tenant tampering defense:
    // If the frontend explicitly supplied a different company slug than the session token, REJECT!
    if (clientSuppliedSlug && clientSuppliedSlug !== authSlug) {
      throw new CrossTenantAccessError(authSlug, clientSuppliedSlug);
    }

    const { db, company } = await getCompanyDatabase(authSlug);
    return { db, company, sessionUser };
  }

  // 4. For unauthenticated requests (e.g. login, registry checks, public lookup):
  // Resolve client-supplied slug or fallback to default
  const targetSlug = clientSuppliedSlug || 'esstee';
  const { db, company } = await getCompanyDatabase(targetSlug);
  return { db, company, sessionUser: null };
}

/**
 * Universal getDatabase helper compatible with legacy routes and modern requests.
 * Automatically selects the appropriate dedicated database (e.g. compliance_esstee, compliance_texplus).
 */
export async function getDatabase(target?: string | Request): Promise<TenantDb> {
  if (target && typeof target === 'object' && 'headers' in target) {
    const { db, company, sessionUser } = await resolveTenantFromRequest(target as Request);
    return new TenantDb(db, company, sessionUser);
  }

  let slug = 'esstee';
  if (typeof target === 'string' && target.trim()) {
    const lower = target.toLowerCase().trim();
    if (lower.includes('texplus')) slug = 'texplus';
    else if (lower.includes('esstee') || lower.includes('sahana')) slug = 'esstee';
    else slug = normalizeCompanySlug(lower) || 'esstee';
  }

  const { db, company } = await getCompanyDatabase(slug);
  return new TenantDb(db, company, null);
}

// Keep legacy alias for backward compatibility
export const extractTenant = (target?: string | Request | null): string => {
  if (!target) return 'esstee';
  if (typeof target === 'object' && 'headers' in target) {
    const h = (target as Request).headers.get('x-company-slug') || (target as Request).headers.get('x-tenant-id');
    if (h) return normalizeCompanySlug(h);
    return 'esstee';
  }
  const s = String(target).toLowerCase();
  if (s.includes('texplus')) return 'texplus';
  return 'esstee';
};
export const extractTenantDb = extractTenant;
export const colName = (c: string) => cleanColName(c);
