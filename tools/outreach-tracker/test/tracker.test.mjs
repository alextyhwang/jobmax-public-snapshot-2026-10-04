import test from 'node:test';
import assert from 'node:assert/strict';
import { addBusinessDays, nextAction, timestamp } from '../policy.mjs';
import { createCollector } from '../collector.mjs';
import { D1Store } from '../d1-store.mjs';
import { sqliteFixture } from './sqlite-fixture.mjs';

const secret = 'a'.repeat(64), id = 'b'.repeat(48);
function fixture(t) {
  let now = Date.parse('2026-09-21T14:00:00Z');
  const store = new D1Store(sqliteFixture(t));
  const handle = createCollector(store, secret, () => now);
  const request = (path, data, auth = secret, method) => handle(new Request(`https://collector.example${path}`, {
    method: method || (data ? 'POST' : 'GET'), headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined,
  }));
  return { store, request, time: () => now, advance: ms => { now += ms; } };
}

test('New York business days cross weekends, UTC boundaries and daylight saving', () => {
  assert.equal(addBusinessDays('2026-09-18T17:00:00Z', 3), '2026-09-23');
  assert.equal(addBusinessDays('2026-09-21T01:00:00Z', 7), '2026-09-29');
  assert.equal(addBusinessDays('2026-10-30T16:00:00Z', 3), '2026-11-04');
  assert.equal(addBusinessDays('2026-09-18T17:00:00Z', 3, ['2026-09-21']), '2026-09-24');
  assert.throws(() => timestamp('2099-01-01'), /future/);
});

test('agreed follow-up policy prioritizes stops and never treats unknown as unopened', () => {
  const sent = { sentAt: '2026-09-21T14:00:00Z' };
  const healthy = { coverageHealthy: true, reportedOpens: 0, ambiguous: false };
  assert.equal(nextAction(sent, healthy, '2026-09-30T16:00:00Z').status, 'followup-due');
  assert.equal(nextAction(sent, { ...healthy, reportedOpens: 1 }, '2026-09-30').status, 'stopped');
  assert.equal(nextAction(sent, null, '2026-09-30').status, 'unknown');
  assert.equal(nextAction(sent, { ...healthy, ambiguous: true }, '2026-09-30').status, 'unknown');
  for (const key of ['repliedAt', 'declinedAt', 'bouncedAt']) assert.equal(nextAction({ ...sent, [key]: sent.sentAt }, healthy).status, 'stopped');
  assert.equal(nextAction({ ...sent, followupSentAt: '2026-09-30' }, healthy).status, 'complete');
  assert.equal(nextAction({ noteSentAt: '2026-09-18T17:00:00Z' }, null, '2026-09-23T16:00:00Z').status, 'email-due');
});

test('collector protects admin routes and ignores unregistered, draft, and HEAD pixels', async t => {
  const f = fixture(t);
  assert.equal((await f.request('/admin/messages', { id }, 'wrong')).status, 401);
  assert.equal((await f.request('/admin/messages', { id: '../bad' })).status, 400);
  assert.equal((await f.request(`/p/${id}.gif`)).status, 200);
  assert.equal(await f.store.exists(id), null);
  assert.equal((await f.request('/admin/messages', { id })).status, 201);
  await f.request(`/p/${id}.gif`);
  await f.store.heartbeat(f.time());
  await f.request(`/admin/messages/${id}/sent`, { sentAt: new Date(f.time()).toISOString() });
  await f.request(`/p/${id}.gif`, undefined, secret, 'HEAD');
  const summary = await f.store.summary(id, f.time());
  assert.equal(summary.reportedOpens, 0);
  assert.equal(summary.coverageHealthy, true);
  assert.equal((await f.request('/')).status, 404);
  assert.equal((await f.request(`/admin/messages/${'c'.repeat(48)}`)).status, 404);
});

test('real post-send pixel records an open and sender preview quarantines nearby events', async t => {
  const f = fixture(t);
  await f.store.create(id, f.time()); await f.store.heartbeat(f.time()); await f.store.arm(id, f.time(), f.time());
  f.advance(1000);
  const pixel = await f.request(`/p/${id}.gif`);
  assert.equal(pixel.headers.get('content-type'), 'image/gif');
  assert.match(pixel.headers.get('cache-control'), /no-store/);
  assert.equal((await pixel.arrayBuffer()).byteLength, 43);
  assert.equal((await f.store.summary(id, f.time())).reportedOpens, 1);
  await f.request(`/admin/messages/${id}/preview`, {});
  const summary = await f.store.summary(id, f.time());
  assert.equal(summary.reportedOpens, 0);
  assert.equal(summary.ambiguous, true);
  await f.request(`/p/${id}.gif`);
  assert.equal((await f.store.summary(id, f.time())).reportedOpens, 0);
  f.advance(16000); await f.request(`/p/${id}.gif`);
  assert.equal((await f.store.summary(id, f.time())).reportedOpens, 1);
});

test('outages stay uncertain after recovery; delayed sent confirmation is uncertain', async t => {
  const f = fixture(t);
  await f.store.create(id, f.time()); await f.store.heartbeat(f.time()); await f.store.arm(id, f.time(), f.time());
  f.advance(180000);
  assert.equal((await f.store.summary(id, f.time())).coverageHealthy, false);
  await f.store.heartbeat(f.time());
  assert.equal((await f.store.summary(id, f.time())).coverageHealthy, false);
  const second = 'd'.repeat(48);
  await f.store.create(second, f.time());
  const sentAt = f.time(); f.advance(31000); await f.store.arm(second, sentAt, f.time());
  assert.equal((await f.store.summary(second, f.time())).ambiguous, true);
});

test('registration and sent confirmation are idempotent and cannot reset recorded opens', async t => {
  const f = fixture(t);
  await f.store.create(id, f.time()); await f.store.arm(id, f.time(), f.time()); await f.store.open(id, f.time());
  f.advance(10000); await f.store.create(id, f.time()); await f.store.arm(id, f.time(), f.time());
  assert.equal((await f.store.summary(id, f.time())).reportedOpens, 1);
});

test('arming before sending preserves fast recipient opens while excluding pre-send previews', async t => {
  const f = fixture(t);
  await f.store.create(id, f.time()); await f.store.heartbeat(f.time());
  await f.request(`/admin/messages/${id}/ready`, {});
  f.advance(1000); await f.store.open(id, f.time());
  assert.equal((await f.store.summary(id, f.time())).reportedOpens, 0);
  f.advance(1000); const actualSent = f.time();
  f.advance(1000); await f.store.open(id, f.time());
  f.advance(40000); await f.store.arm(id, actualSent, f.time());
  const summary = await f.store.summary(id, f.time());
  assert.equal(summary.reportedOpens, 1);
  assert.equal(summary.ambiguous, false);
  assert.equal(summary.coverageHealthy, true);
});

test('sent-copy preview before manual confirmation remains uncertain', async t => {
  const f = fixture(t);
  await f.store.create(id, f.time()); await f.store.heartbeat(f.time());
  await f.store.prepareSend(id, f.time());
  f.advance(1000); const actualSent = f.time();
  await f.store.open(id, f.time());
  await f.store.preview(id, f.time());
  f.advance(1000); await f.store.arm(id, actualSent, f.time());
  const summary = await f.store.summary(id, f.time());
  assert.equal(summary.reportedOpens, 0);
  assert.equal(summary.ambiguous, true);
  assert.equal(nextAction({ sentAt: new Date(actualSent).toISOString() }, summary).status, 'unknown');
});
