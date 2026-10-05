import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextAction, timestamp, validEmail } from './policy.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const equal = (a, b) => typeof a === 'string' && /^[a-f0-9]{64}$/.test(a) && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function createLocalServer({ dataDir = join(root, '.local/outreach-tracker'), packageDir = join(root, 'outreach/packages'), fetcher = fetch } = {}) {
  await mkdir(dataDir, { recursive: true });
  const configPath = join(dataDir, 'config.json');
  const statePath = join(dataDir, 'messages.json');
  const load = async (file, fallback) => {
    try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
  };
  const save = async (file, value) => {
    await writeFile(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    await rename(`${file}.tmp`, file);
  };
  let config = await load(configPath, { localToken: randomBytes(32).toString('hex'), endpoint: '', adminToken: '' });
  await save(configPath, config);
  let messages = await load(statePath, {});
  let pending = Promise.resolve();
  const mutate = fn => {
    const next = pending.then(fn);
    pending = next.catch(() => {});
    return next;
  };
  const packages = async () => {
    let files;
    try { files = await readdir(packageDir); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const result = [];
    for (const file of files.filter(file => file.endsWith('.json')).sort()) {
      const batch = await load(join(packageDir, file), {});
      result.push(...(batch.contacts || []));
    }
    const ids = new Set();
    for (const contact of result) {
      if (!/^[a-z0-9-]+$/.test(contact.id) || ids.has(contact.id)) throw new Error('Invalid or duplicate package contact ID');
      ids.add(contact.id);
    }
    return result;
  };
  const remote = async (path, body) => {
    if (!config.endpoint || !config.adminToken) throw new Error('Configure the public collector first');
    const response = await fetcher(`${config.endpoint}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${config.adminToken}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(8000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Collector returned ${response.status}`);
    return response.json();
  };
  const server = createServer(async (req, res) => {
    const ownHost = `127.0.0.1:${server.address().port}`;
    const origin = req.headers.origin;
    const sameOrigin = !origin || origin === `http://${ownHost}` || origin === `http://localhost:${server.address().port}`;
    const extension = /^chrome-extension:\/\/[a-p]{32}$/.test(origin || '');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const reply = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (![ownHost, `localhost:${server.address().port}`].includes(req.headers.host) || (!sameOrigin && !extension)) return reply({ error: 'Forbidden origin' }, 403);
    if (extension) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-JobMax-Token');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, `http://${ownHost}`);
    const path = url.pathname;
    if (path === '/api/bootstrap' && req.method === 'GET') {
      if (extension || !sameOrigin || !['same-origin', 'none', undefined].includes(req.headers['sec-fetch-site'])) return reply({ error: 'Open the local dashboard to pair' }, 403);
      return reply({ token: config.localToken });
    }
    if (path.startsWith('/api/') && !equal(req.headers['x-jobmax-token'], config.localToken)) return reply({ error: 'Pair the extension with the dashboard' }, 401);
    try {
      if (path === '/api/state' && req.method === 'GET') {
        const contacts = await packages();
        const rows = await Promise.all(contacts.map(async contact => {
          const message = messages[contact.id] || {};
          let tracking = null;
          if (message.trackingId) {
            try { tracking = await remote(`/admin/messages/${message.trackingId}`); } catch { tracking = { coverageHealthy: false, unavailable: true }; }
          }
          return { ...contact, message, tracking, action: nextAction(message, tracking) };
        }));
        return reply({ endpoint: config.endpoint, configured: Boolean(config.adminToken && config.endpoint), contacts: rows });
      }
      if (path === '/api/config' && req.method === 'POST') {
        if (extension) return reply({ error: 'Configure through the dashboard' }, 403);
        const input = await readBody(req);
        const endpoint = new URL(input.endpoint);
        if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !['', '/'].includes(endpoint.pathname)) throw new Error('Use the HTTPS collector origin, without a path or credentials');
        if (!/^[a-f0-9]{64}$/.test(input.adminToken)) throw new Error('Use the 64-character generated collector secret');
        await mutate(async () => {
          const clean = endpoint.origin;
          if (config.endpoint && config.endpoint !== clean && Object.values(messages).some(m => m.trackingId)) throw new Error('Existing tracked emails depend on the current endpoint; archive this runtime before changing it');
          const old = config;
          config = { ...config, endpoint: clean, adminToken: input.adminToken };
          try { await remote('/admin/health'); await save(configPath, config); } catch (error) { config = old; throw error; }
        });
        return reply({ saved: true });
      }
      if (path === '/api/prepare' && req.method === 'POST') {
        const input = await readBody(req);
        return reply(await mutate(async () => {
          const contact = (await packages()).find(c => c.id === input.packageId);
          if (!contact || !validEmail(contact.email?.address)) throw new Error('Select a package with a candidate email address');
          if (contact.sendBlockers?.length) throw new Error(`Resolve package blockers first: ${contact.sendBlockers.join('; ')}`);
          const existing = messages[contact.id] || {};
          const followup = input.phase === 'followup';
          const subject = followup ? `Re: ${contact.emailDraft.subject}` : contact.emailDraft.subject;
          if (input.recipient?.toLowerCase() !== contact.email.address.toLowerCase() || input.subject !== subject) throw new Error('Gmail recipient and subject must match the selected package exactly');
          if (followup) {
            const tracking = existing.trackingId ? await remote(`/admin/messages/${existing.trackingId}`) : null;
            if (nextAction(existing, tracking).status !== 'followup-due') throw new Error('Follow-up is not eligible under the agreed rules');
          } else if (existing.sentAt || existing.repliedAt || existing.declinedAt || existing.bouncedAt) throw new Error('This contact already has a sent email or stopped sequence');
          const key = followup ? 'followupTrackingId' : 'trackingId';
          const id = existing[key] || randomBytes(24).toString('hex');
          await remote('/admin/messages', { id });
          messages[contact.id] = { ...existing, [key]: id, preparedAt: existing.preparedAt || new Date().toISOString() };
          await save(statePath, messages);
          return { id, pixelUrl: `${config.endpoint}/p/${id}.gif`, packageId: contact.id, phase: followup ? 'followup' : 'initial' };
        }));
      }
      if (path === '/api/preview' && req.method === 'POST') {
        const { trackingId } = await readBody(req);
        if (!Object.values(messages).some(m => m.trackingId === trackingId || m.followupTrackingId === trackingId)) throw new Error('Unknown tracking ID');
        await remote(`/admin/messages/${trackingId}/preview`, {});
        return reply({ recorded: true });
      }
      if (path === '/api/arm' && req.method === 'POST') {
        const { trackingId } = await readBody(req);
        if (!Object.values(messages).some(m => m.trackingId === trackingId || m.followupTrackingId === trackingId)) throw new Error('Unknown tracking ID');
        await remote(`/admin/messages/${trackingId}/ready`, {});
        return reply({ ready: true });
      }
      if (path === '/api/event' && req.method === 'POST') {
        const input = await readBody(req);
        return reply(await mutate(async () => {
          if (!(await packages()).some(c => c.id === input.packageId)) throw new Error('Unknown contact');
          const message = messages[input.packageId] || {};
          const key = { 'note-sent': 'noteSentAt', sent: 'sentAt', replied: 'repliedAt', declined: 'declinedAt', bounced: 'bouncedAt', 'followup-sent': 'followupSentAt' }[input.kind];
          if (!key || input.confirmed !== true) throw new Error('Confirm an observed event');
          if (message[key]) throw new Error('This event is already recorded');
          const at = timestamp(input.at || new Date());
          if (key === 'sentAt') {
            if (!message.trackingId) throw new Error('Prepare tracked email first');
            await remote(`/admin/messages/${message.trackingId}/sent`, { sentAt: at });
          }
          if (key === 'followupSentAt') {
            const tracking = message.trackingId ? await remote(`/admin/messages/${message.trackingId}`) : null;
            if (nextAction(message, tracking).status !== 'followup-due') throw new Error('Follow-up is not eligible under the agreed rules');
            if (!message.followupTrackingId) throw new Error('Prepare the follow-up with its own tracking image first');
            await remote(`/admin/messages/${message.followupTrackingId}/sent`, { sentAt: at });
          }
          messages[input.packageId] = { ...message, [key]: at };
          await save(statePath, messages);
          return { recorded: true };
        }));
      }
      const assets = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
      if (req.method === 'GET' && assets[path] && !extension) {
        const asset = assets[path];
        res.writeHead(200, { 'Content-Type': mime[asset.slice(asset.lastIndexOf('.'))] });
        return res.end(await readFile(join(here, 'ui', asset)));
      }
      reply({ error: 'Not found' }, 404);
    } catch (error) { reply({ error: error.message }, 400); }
  });
  return { server, token: config.localToken };
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new Error('Request too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server } = await createLocalServer();
  server.listen(Number(process.env.JOBMAX_TRACKER_PORT || 4318), '127.0.0.1', () => console.log(`JobMax outreach: http://127.0.0.1:${server.address().port}`));
}
