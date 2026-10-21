import { MongoClient, Db } from 'mongodb';

const defaultCloudUri = 'mongodb+srv://lalithmadhavan2005_db_user:5Er1LsAVvAnwrWG2@cluster0.ucek7vf.mongodb.net/maintanence?appName=Cluster0';
const localUri = 'mongodb://127.0.0.1:27017/textech_cmms';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

async function connectClient(): Promise<MongoClient> {
  const primaryUri = (process.env.MONGODB_URI || defaultCloudUri).trim();
  const options = { serverSelectionTimeoutMS: 4000 };
  try {
    const client = new MongoClient(primaryUri, options);
    await client.connect();
    return client;
  } catch (err: unknown) {
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

export async function getDatabase(dbName?: string): Promise<Db> {
  const targetDb = (dbName || process.env.MONGODB_DB_NAME || 'textech_cmms').trim();
  try {
    const client = await clientPromise;
    return client.db(targetDb);
  } catch (err) {
    console.warn('Cached clientPromise failed, connecting directly...');
    const fresh = await connectClient();
    global._mongoClientPromise = Promise.resolve(fresh);
    clientPromise = global._mongoClientPromise;
    return fresh.db(targetDb);
  }
}
