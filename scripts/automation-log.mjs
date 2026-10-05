#!/usr/bin/env node
import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const raw = process.argv.slice(2).join(' ').trim();
if (!raw) {
  console.error('Usage: npm run automation:log -- \'{"workflow":"job-discovery",...}\'');
  process.exit(1);
}

let record;
try { record = JSON.parse(raw); } catch (error) {
  console.error(`Invalid JSON: ${error.message}`);
  process.exit(1);
}
for (const key of ['workflow', 'status', 'started_at', 'ended_at']) {
  if (!record[key]) { console.error(`Missing required field: ${key}`); process.exit(1); }
}
const started = record.started_at ? Date.parse(record.started_at) : NaN;
const ended = record.ended_at ? Date.parse(record.ended_at) : NaN;
if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started) {
  console.error('started_at and ended_at must be valid ISO timestamps with ended_at >= started_at');
  process.exit(1);
}
if (Number.isFinite(started) && Number.isFinite(ended)) record.duration_seconds = Math.max(0, Math.round((ended - started) / 1000));
for (const key of ['input_tokens', 'output_tokens', 'total_tokens']) if (!(key in record)) record[key] = null;
record.run_id ||= `${record.started_at || new Date().toISOString()}-${record.workflow || 'automation'}`;
mkdirSync(join(root, 'automation-runs'), { recursive: true });
appendFileSync(join(root, 'automation-runs', 'runs.jsonl'), `${JSON.stringify(record)}\n`);
console.log(`Logged ${record.run_id}`);
