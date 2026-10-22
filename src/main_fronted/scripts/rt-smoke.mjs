// Protocol-level proof of the chat realtime stack: two users, one conversation,
// a message sent through the SignalR hub by Bob arrives live at Alice.
// Run: node scripts/rt-smoke.mjs   (against a running AppHost on :8088)
import * as signalR from '@microsoft/signalr';

const GW = process.env.GATEWAY_URL || 'http://localhost:8088';
const sub = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).sub;

async function register(email, password, displayName) {
  const r = await fetch(`${GW}/api/account/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!r.ok && r.status !== 409) throw new Error(`register ${email}: ${r.status}`);
}
async function login(email, password) {
  const r = await fetch(`${GW}/connect/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password', client_id: 'social-tests', client_secret: 'secret',
      username: email, password, scope: 'openid profile socialapi offline_access',
    }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return (await r.json()).access_token;
}
async function api(token, path, body) {
  const r = await fetch(`${GW}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
function connect(token) {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${GW}/hubs/chat`, { accessTokenFactory: () => token })
    .build();
}

const stamp = Date.now();
const aliceEmail = `alice.rt.${stamp}@example.com`;
const bobEmail = `bob.rt.${stamp}@example.com`;
const PASS = 'Pass123$';

await register(aliceEmail, PASS, 'Alice RT');
await register(bobEmail, PASS, 'Bob RT');
const aliceTok = await login(aliceEmail, PASS);
const bobTok = await login(bobEmail, PASS);
const aliceId = sub(aliceTok), bobId = sub(bobTok);
console.log('users:', { aliceId, bobId });

const chat = await api(aliceTok, '/api/chats', { type: 'dm', title: null, createdBy: aliceId });
console.log('chat:', chat.id);
await api(aliceTok, '/api/chat-participants', { chatId: chat.id, userId: aliceId, role: 'member' });
await api(aliceTok, '/api/chat-participants', { chatId: chat.id, userId: bobId, role: 'member' });

const alice = connect(aliceTok);
const bob = connect(bobTok);

const received = new Promise((resolve) => {
  alice.on('ReceiveMessage', (m) => resolve(m));
});

await alice.start();
await bob.start();
console.log('both connected (WS auth over access_token OK)');
await alice.invoke('Join', chat.id);
await bob.invoke('Join', chat.id);

await bob.invoke('Send', chat.id, 'text', 'hello from bob — live!', null);

const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT: no live delivery in 5s')), 5000));
const msg = await Promise.race([received, timeout]);
console.log('ALICE RECEIVED LIVE:', { from: msg.senderId, content: msg.content, persistedId: msg.id });
if (msg.senderId !== bobId || !msg.content.includes('hello from bob')) throw new Error('delivered message mismatch');

await alice.stop(); await bob.stop();
console.log('\n✅ REALTIME OK: persisted via service + broadcast to group, delivered live.');
process.exit(0);
