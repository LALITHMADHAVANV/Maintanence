import { MongoClient, Db } from 'mongodb';

const defaultCloudUri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';
const localUri = 'mongodb://127.0.0.1:27017/maintanence';

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

function cleanDbName(raw?: string | null): string {
  if (!raw) return 'maintanence';
  let cleaned = raw.trim();
  // Strip any accidental prefix like 'DB_NAME\t', 'DB_NAME:', 'DB_NAME='
  cleaned = cleaned.replace(/^DB_NAME[\s\t:=]*/i, '').trim();
  cleaned = cleaned.replace(/[\r\n\t]/g, '').trim();

  const lower = cleaned.toLowerCase();
  // Prevent rogue DB creation from legacy defaults or malformed env vars
  if (!cleaned || lower === 'textech_cmms' || lower === 'test' || lower === 'admin' || lower === 'local' || lower === 'db_name') {
    return 'maintanence';
  }
  return cleaned;
}

function resolveDb(client: MongoClient, explicitDbName?: string): Db {
  if (explicitDbName) {
    const cleaned = cleanDbName(explicitDbName);
    return client.db(cleaned);
  }

  // 1. Prefer database defined in URI (e.g. /maintanence)
  try {
    const fromUri = client.db().databaseName;
    if (fromUri) {
      const cleanedUriDb = cleanDbName(fromUri);
      if (cleanedUriDb) {
        return client.db(cleanedUriDb);
      }
    }
  } catch (e) {}

  // 2. Sanitize and use MONGODB_DB_NAME env var
  const cleanedEnv = cleanDbName(process.env.MONGODB_DB_NAME);
  if (cleanedEnv) {
    return client.db(cleanedEnv);
  }

  // 3. Fallback to maintanence
  return client.db('maintanence');
}

export async function getDatabase(dbName?: string): Promise<Db> {
  try {
    const client = await clientPromise;
    return resolveDb(client, dbName);
  } catch (err) {
    console.warn('Cached clientPromise failed, connecting directly...');
    const fresh = await connectClient();
    global._mongoClientPromise = Promise.resolve(fresh);
    clientPromise = global._mongoClientPromise;
    return resolveDb(fresh, dbName);
  }
}
