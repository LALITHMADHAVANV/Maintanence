const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

class TenantError extends Error {
  constructor(message, statusCode) { super(message); this.statusCode = statusCode; }
}
let signedIn = true;
let actor = 'mechanic-1';
let ticket = { attendedBy: 'Assigned Mechanic' };
let users = [{ uid: 'mechanic-1' }];
let tenantError = null;
const output = { exports: {} };
const source = fs.readFileSync('src/app/[company]/assigned-repair/[id]/route.ts', 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: output.exports, Request, Headers, URL, console,
  require(name) {
    if (name === 'next/server') return { NextResponse: {
      json: (body, options) => ({ body, ...options }),
      redirect: (url, options) => ({ location: url.toString(), status: 307, ...options }),
    } };
    if (name === '@/lib/auth') return {
      extractSessionToken: () => 'session', verifySessionToken: () => signedIn ? {} : null,
    };
    if (name === '@/lib/mongodb') return { TenantError, getDatabase: async (req) => {
      assert.equal(req.headers.get('x-company-slug'), 'sahana');
      if (tenantError) throw tenantError;
      return { tenant: 'sahana', sessionUser: { uid: actor }, rawCollection: () => ({
        findOne: async () => ticket,
        find: () => ({ limit: () => ({ toArray: async () => users }) }),
      }) };
    } };
    throw new Error(`Unexpected import: ${name}`);
  },
});
const visit = () => output.exports.GET(new Request('https://maintenance.example.com/sahana/assigned-repair/WO-1'), {
  params: Promise.resolve({ company: 'sahana', id: 'WO-1' }),
});
async function checkTelegramLink() {
  const service = { exports: {} };
  const sent = [];
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/services/telegramService.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: service.exports, URL, console, process: { env: { APP_URL: 'https://maintenance.example.com' } },
    require: () => ({ getCompanyDatabase: async () => ({ db: { collection: () => ({
      findOne: async () => ({ botToken: 'test-token', unit1ChatId: 'test-chat' }),
    }) } }) }),
    fetch: async (_url, request) => {
      sent.push(JSON.parse(request.body));
      return { json: async () => sent.length === 1
        ? { ok: false, description: 'Cannot parse entities' }
        : { ok: true, result: { message_id: 1 } } };
    },
  });
  await service.exports.sendTelegramAlert({
    companySlug: 'sahana', ticketId: 'WO-1', assignedTo: 'Assigned Mechanic', title: 'Repair', category: 'DISPATCH',
  });
  assert.equal(sent.length, 2);
  for (const message of sent) {
    assert.ok(!message.text.includes('Ticket ID:'));
    assert.ok(message.text.endsWith('Broadcast to bloblo'));
    const link = 'https://maintenance.example.com/sahana/assigned-repair/WO-1';
    assert.ok(message.text.includes(link));
    assert.equal(message.reply_markup.inline_keyboard[0][0].url, link);
  }
  console.log('Passed Telegram assignment link and plain-text retry checks.');
}
(async () => {
  let response = await visit();
  assert.equal(response.location, 'https://maintenance.example.com/sahana/dashboard');
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
  actor = 'other-mechanic';
  assert.equal((await visit()).status, 403);
  actor = 'mechanic-1';
  users = [{ uid: 'mechanic-2' }]; // Reassignment invalidates old recipient access.
  assert.equal((await visit()).status, 403);
  users = [{ uid: actor }, { uid: 'duplicate-name' }];
  assert.equal((await visit()).status, 403);
  ticket = { attendedBy: null };
  assert.equal((await visit()).status, 403);
  ticket = null;
  assert.equal((await visit()).status, 404);
  tenantError = new TenantError('Cross-company access denied', 403);
  assert.equal((await visit()).status, 403);
  signedIn = false;
  response = await visit();
  const login = new URL(response.location);
  assert.equal(login.pathname, '/sahana/login');
  assert.equal(login.searchParams.get('next'), '/sahana/assigned-repair/WO-1');
  console.log('Passed 8 Telegram assignment access checks.');
  await checkTelegramLink();
})().catch(error => { console.error(error); process.exitCode = 1; });
