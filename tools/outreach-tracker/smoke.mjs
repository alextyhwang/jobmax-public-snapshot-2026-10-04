import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { nextAction } from './policy.mjs';

// Synthetic HTTP requests only. No email, recruiter data, or browser interaction.
const configPath = new URL('../../.local/outreach-tracker/config.json', import.meta.url);
const config = JSON.parse(await readFile(configPath, 'utf8'));
const call = async (path, body) => {
  const response = await fetch(`${config.endpoint}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${config.adminToken}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  assert.ok(response.ok, `Collector returned ${response.status}`);
  return response.json();
};
try {
  const health = await call('/admin/health');
  assert.equal(health.healthy, true, 'Wait for a healthy cron heartbeat');
  const unauthorized = await fetch(`${config.endpoint}/admin/health`);
  assert.equal(unauthorized.status, 401);
  const id = randomBytes(24).toString('hex');
  await call('/admin/messages', { id });
  const pixel = `${config.endpoint}/p/${id}.gif`;
  assert.equal((await fetch(pixel)).status, 200);
  assert.equal((await call(`/admin/messages/${id}`)).reportedOpens, 0);
  await call(`/admin/messages/${id}/ready`, {});
  const sentAt = new Date().toISOString();
  await call(`/admin/messages/${id}/sent`, { sentAt });
  assert.equal((await fetch(pixel, { method: 'HEAD' })).status, 200);
  assert.equal((await call(`/admin/messages/${id}`)).reportedOpens, 0);
  const image = await fetch(pixel);
  assert.equal(image.headers.get('content-type'), 'image/gif');
  assert.equal((await image.arrayBuffer()).byteLength, 43);
  const summary = await call(`/admin/messages/${id}`);
  assert.equal(summary.reportedOpens, 1);
  assert.equal(summary.coverageHealthy, true);
  assert.equal(nextAction({ sentAt }, summary).status, 'stopped');
  const result = { checkedAt: new Date().toISOString(), endpoint: config.endpoint, syntheticId: id, summary, status: 'passed', gmailTest: 'not performed' };
  await writeFile(new URL('live-smoke.json', configPath), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Live collector smoke passed. Synthetic evidence: ${fileURLToPath(new URL('live-smoke.json', configPath))}`);
} catch (error) {
  console.error(`Live collector smoke failed: ${error.cause?.code || error.message}`);
  process.exitCode = 1;
}
