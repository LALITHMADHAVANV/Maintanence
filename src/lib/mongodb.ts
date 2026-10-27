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
 * Helper to get clean collection name (stripping any legacy dot prefix like 'sahana.machines' -> 'machines')
 */
export function cleanColName(name: string): string {
  return name.includes('.') ? name.split('.').pop()! : name;
}

export function colName(collection: string, _tenant?: string): string {
  return cleanColName(collection);
}

/**
 * Proxy wrapper on MongoDB Collection that automatically enforces company scoping.
 */
function wrapTenantCollection<T extends Document = Document>(
  col: Collection<T>,
  tenant: string,
  companyName: string
): Collection<T> {
  const isTexplus = tenant === 'texplus';
  const companyQuery: any = isTexplus
    ? { company: { $regex: /^texplus/i } }
    : {
        $or: [
          { company: { $regex: /^sahana/i } },
          { company: { $regex: /^maintanence/i } },
          { company: { $exists: false } },
          { company: null },
          { company: '' },
        ],
      };

  function mergeCompany(filter?: any) {
    if (!filter || Object.keys(filter).length === 0) {
      return companyQuery;
    }
    if (filter.company !== undefined) {
      return filter;
    }
    return { $and: [companyQuery, filter] };
  }

  return new Proxy(col, {
    get(target, prop, receiver) {
      if (prop === 'find') {
        return (filter?: any, options?: any) => {
          return target.find(mergeCompany(filter), options);
        };
      }
      if (prop === 'findOne') {
        return (filter?: any, options?: any) => {
          return target.findOne(mergeCompany(filter), options);
        };
      }
      if (prop === 'countDocuments') {
        return (filter?: any, options?: any) => {
          return target.countDocuments(mergeCompany(filter), options);
        };
      }
      if (prop === 'insertOne') {
        return (doc: any, options?: any) => {
          if (doc && !doc.company) {
            doc.company = companyName;
          }
          return target.insertOne(doc, options);
        };
      }
      if (prop === 'insertMany') {
        return (docs: any[], options?: any) => {
          if (Array.isArray(docs)) {
            docs.forEach((d) => {
              if (d && !d.company) d.company = companyName;
            });
          }
          return target.insertMany(docs, options);
        };
      }
      if (prop === 'updateOne') {
        return (filter: any, update: any, options?: any) => {
          if (options?.upsert) {
            if (update && update.$set && !update.$set.company) {
              update.$set.company = companyName;
            } else if (update && !update.$set) {
              update.$setOnInsert = { ...(update.$setOnInsert || {}), company: companyName };
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

/**
 * A Db wrapper that routes to unified tables categorized by company name.
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

  get companyName(): string {
    return this.tenant === 'texplus' ? 'Texplus' : 'Sahana Garments Ltd';
  }

  companyFilter(baseFilter?: any): any {
    const isTexplus = this.tenant === 'texplus';
    const compCondition = isTexplus
      ? { company: { $regex: /^texplus/i } }
      : {
          $or: [
            { company: { $regex: /^sahana/i } },
            { company: { $regex: /^maintanence/i } },
            { company: { $exists: false } },
            { company: null },
            { company: '' },
          ],
        };

    if (!baseFilter || Object.keys(baseFilter).length === 0) {
      return compCondition;
    }
    if (baseFilter.company !== undefined) {
      return baseFilter;
    }
    return { $and: [compCondition, baseFilter] };
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    const clean = cleanColName(name);
    return wrapTenantCollection(this._db.collection<T>(clean), this.tenant, this.companyName);
  }

  rawCollection<T extends Document = Document>(name: string): Collection<T> {
    const clean = cleanColName(name);
    return this._db.collection<T>(clean);
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
