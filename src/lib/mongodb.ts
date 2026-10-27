import { MongoClient, Db, Collection, Document } from 'mongodb';

const defaultCloudUri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';
const localUri = 'mongodb://127.0.0.1:27017/maintanence';

// The ONE database that holds all tenants as prefixed collections
const PRIMARY_DB = 'maintanence';

// Tenant name mappings
const TENANT_ALIASES: Record<string, string> = {
  sahana: 'sahana',
  maintanence: 'sahana',
  texplus: 'texplus',
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
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
    return client;
  } catch (err: unknown) {
    if (primaryUri !== defaultCloudUri && isValidMongoUri(defaultCloudUri)) {
      console.warn(`Configured MongoDB URI failed (${(err as any)?.message || err}). Falling back to default cloud cluster...`);
      try {
        const cloudClient = new MongoClient(defaultCloudUri, options);
        await cloudClient.connect();
        return cloudClient;
      } catch (cloudErr) {
        console.warn('Default cloud fallback failed:', (cloudErr as any)?.message || cloudErr);
      }
    }
    if (primaryUri !== localUri) {
      console.warn(`Primary MongoDB failed (${(err as any)?.message || err}). Falling back to local MongoDB at ${localUri}...`);
      try {
        const fallbackClient = new MongoClient(localUri, options);
        await fallbackClient.connect();
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
 * Extract tenant slug from a Request, header string, email, or cookie.
 * Always returns 'sahana' or 'texplus' (never a database name).
 */
export function extractTenant(target?: string | Request | null): string {
  if (!target) return 'sahana';

  // 1. If a Request object was provided, extract tenant from headers, cookies, or query
  if (typeof target === 'object' && 'headers' in target) {
    const req = target as Request;

    // Header: x-tenant-id
    const headerTenant = req.headers.get('x-tenant-id') || req.headers.get('x-company') || req.headers.get('x-user-email');
    if (headerTenant) {
      return extractTenant(headerTenant);
    }

    // Cookie: cmms_tenant=...
    const cookieHeader = req.headers.get('cookie') || '';
    const cookieMatch = cookieHeader.match(/cmms_tenant=([^;]+)/i);
    if (cookieMatch && cookieMatch[1]) {
      return extractTenant(decodeURIComponent(cookieMatch[1].trim()));
    }

    // URL Query: ?tenant=... or ?company=...
    try {
      const url = new URL(req.url);
      const q = url.searchParams.get('tenant') || url.searchParams.get('company') || url.searchParams.get('email');
      if (q) return extractTenant(q);
    } catch {}

    return 'sahana';
  }

  // 2. If a string was provided (e.g. an email or company name)
  const str = String(target).toLowerCase().trim();
  if (str.includes('texplus')) return 'texplus';
  if (str.includes('sahana') || str === 'maintanence') return 'sahana';

  // Check alias table
  if (TENANT_ALIASES[str]) return TENANT_ALIASES[str];

  return 'sahana';
}

// Keep old name as alias for backward-compat with any code that still calls extractTenantDb
export const extractTenantDb = extractTenant;

/**
 * Returns the prefixed collection name for a given tenant.
 * e.g. colName('machines', 'texplus') => 'texplus.machines'
 *      colName('machines', 'sahana')  => 'sahana.machines'
 */
export function colName(collection: string, tenant: string): string {
  const slug = TENANT_ALIASES[tenant] || tenant || 'sahana';
  return `${slug}.${collection}`;
}

/**
 * A thin Db-like wrapper that auto-prefixes all collection access by tenant.
 */
export class TenantDb {
  constructor(
    public readonly _db: Db,
    public readonly tenant: string
  ) {}

  get databaseName(): string {
    return this.tenant;
  }

  get rawDb(): Db {
    return this._db;
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    return this._db.collection<T>(colName(name, this.tenant));
  }
}

/**
 * Returns a TenantDb scoped to the correct tenant inside the PRIMARY_DB.
 * All collections are automatically prefixed: e.g. sahana.machines, texplus.machines.
 */
export async function getDatabase(target?: string | Request): Promise<TenantDb> {
  let client: MongoClient;
  try {
    client = await clientPromise;
  } catch (err) {
    console.warn('Cached clientPromise failed, connecting directly...');
    client = await connectClient();
    global._mongoClientPromise = Promise.resolve(client);
    clientPromise = global._mongoClientPromise;
  }
  const tenant = extractTenant(target);
  const db = client.db(PRIMARY_DB);
  return new TenantDb(db, tenant);
}
