// Assign globally unique usernames while preserving existing passwords and account IDs.
// Run without flags to review counts, or use --apply to save the changes.
require('@next/env').loadEnvConfig(process.cwd());
const { MongoClient } = require('mongodb');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const exports = {};
  const source = ts.transpile(fs.readFileSync(file, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 });
  vm.runInNewContext(source, { exports, require: name => imports[name], process });
  return exports;
}

const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const { defaultUsername, reserveGeneratedUsername } = load('src/lib/usernames.ts');
const apply = process.argv.includes('--apply');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
  try {
    await client.connect();
    const registry = client.db(process.env.REGISTRY_DB_NAME || 'compliance_master');
    const companies = await registry.collection('companies').find({}, { projection: { slug: 1, databaseName: 1 } }).sort({ slug: 1 }).toArray();
    if (!companies.length) throw new Error('No registered companies');
    const accounts = [];
    const claims = new Map((await registry.collection('login_identifiers').find({}).toArray()).map(claim => [claim._id, claim.owner]));
    const owners = new Map();
    const counts = new Map();
    for (const company of companies) {
      const users = client.db(company.databaseName).collection('users');
      const records = await users.find({}, { projection: { uid: 1, email: 1, name: 1, employeeId: 1, username: 1 } }).sort({ _id: 1 }).toArray();
      counts.set(company.slug, { accounts: records.length, alreadySet: 0, assigned: 0, concurrentChanges: 0 });
      for (const user of records) {
        const key = `${company.slug}:${user._id}`;
        accounts.push({ company, users, user, key });
        for (const value of [user.uid, user.email, user.employeeId, user.username]) {
          const identifier = normalize(value);
          if (!identifier) continue;
          if (!owners.has(identifier)) owners.set(identifier, new Set());
          owners.get(identifier).add(key);
        }
      }
    }
    class TenantError extends Error {
      constructor(message, status, code) { super(message); this.code = code; }
    }
    const { reserveLoginIdentifiers } = load('src/lib/loginIdentifiers.ts', {
      './registry': { getAllCompanies: async () => companies },
      './mongodb': { getMongoClient: async () => client, TenantError },
    });
    for (const { company, users, user, key } of accounts) {
      const count = counts.get(company.slug);
      const current = normalize(user.username);
      const uid = user.uid || String(user._id);
      const claimOwner = `${company.slug}:${uid}`;
      const usernameIsUsable = current && !current.includes('@') && current.length <= 254 && user.username.trim() === user.username
        && owners.get(current)?.size === 1 && (!claims.has(current) || claims.get(current) === claimOwner);
      if (usernameIsUsable) { count.alreadySet++; continue; }
      const username = await reserveGeneratedUsername(defaultUsername(user.email || '', user.name || ''), async candidate => {
        const existingOwners = owners.get(candidate);
        if ((existingOwners && (existingOwners.size !== 1 || !existingOwners.has(key))) || (claims.has(candidate) && claims.get(candidate) !== claimOwner)) {
          throw new TenantError('Username already assigned', 409, 'IDENTIFIER_TAKEN');
        }
        if (apply) await reserveLoginIdentifiers(company.slug, uid, [candidate]);
      });
      owners.set(username, new Set([key]));
      claims.set(username, claimOwner);
      if (apply) {
        const result = await users.updateOne({ _id: user._id, username: user.username ?? null }, { $set: { username } });
        if (!result.matchedCount) { count.concurrentChanges++; continue; }
      }
      count.assigned++;
    }
    console.log(JSON.stringify({ mode: apply ? 'applied' : 'preview', companies: Object.fromEntries(counts) }, null, 2));
    if ([...counts.values()].some(count => count.concurrentChanges > 0)) process.exitCode = 1;
  } catch (error) {
    console.error(`Username assignment failed (${error.name}${error.code ? `: ${error.code}` : ''}).`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
