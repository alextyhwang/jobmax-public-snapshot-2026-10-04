const PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='), c => c.charCodeAt(0));
const ID = /^[a-f0-9]{48}$/;
export const HEARTBEAT_TOLERANCE_MS = 150_000;
export const PREVIEW_WINDOW_MS = 15_000;

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function authorized(request, secret) {
  if (!secret || secret.length < 32) return false;
  const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(request.headers.get('authorization') || ''), digest(`Bearer ${secret}`)]);
  return a.reduce((diff, value, i) => diff | (value ^ b[i]), 0) === 0;
}

export function createCollector(store, secret, clock = () => Date.now()) {
  return async request => {
    const url = new URL(request.url);
    const pixel = url.pathname.match(/^\/p\/([a-f0-9]{48})\.gif$/);
    if (pixel && ['GET', 'HEAD'].includes(request.method)) {
      try {
        if (request.method === 'GET') await store.open(pixel[1], clock());
        return new Response(request.method === 'HEAD' ? null : PIXEL, { headers: {
          'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        } });
      } catch {
        // An outage must remain visible to monitoring; never claim successful logging.
        return json({ error: 'Tracking unavailable' }, 503);
      }
    }
    if (!url.pathname.startsWith('/admin/')) return json({ error: 'Not found' }, 404);
    if (!await authorized(request, secret)) return json({ error: 'Unauthorized' }, 401);
    try {
      if (request.method === 'GET' && url.pathname === '/admin/health') return json(await store.health(clock()));
      if (request.method === 'POST' && url.pathname === '/admin/messages') {
        const { id } = await body(request);
        if (!ID.test(id)) return json({ error: 'Invalid ID' }, 400);
        await store.create(id, clock());
        return json({ id }, 201);
      }
      const match = url.pathname.match(/^\/admin\/messages\/([a-f0-9]{48})(?:\/(ready|sent|preview))?$/);
      if (!match) return json({ error: 'Not found' }, 404);
      const [, id, action] = match;
      if (!await store.exists(id)) return json({ error: 'Not found' }, 404);
      if (request.method === 'GET' && !action) return json(await store.summary(id, clock()));
      if (request.method === 'POST' && action === 'ready') {
        await store.prepareSend(id, clock());
        return json({ ready: true });
      }
      if (request.method === 'POST' && action === 'sent') {
        const { sentAt } = await body(request);
        const time = Date.parse(sentAt);
        if (!Number.isFinite(time) || time > clock() + 5000) return json({ error: 'Invalid sent timestamp' }, 400);
        await store.arm(id, time, clock());
        return json(await store.summary(id, clock()));
      }
      if (request.method === 'POST' && action === 'preview') {
        await store.preview(id, clock());
        return json(await store.summary(id, clock()));
      }
      return json({ error: 'Method not allowed' }, 405);
    } catch (error) {
      return json({ error: error instanceof SyntaxError || error.message === 'Body too large' ? 'Invalid request' : 'Collector operation failed' }, error instanceof SyntaxError || error.message === 'Body too large' ? 400 : 503);
    }
  };
}

async function body(request) {
  if (Number(request.headers.get('content-length')) > 2048) throw new Error('Body too large');
  const reader = request.body?.getReader();
  if (!reader) return {};
  let text = '', size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2048) { await reader.cancel(); throw new Error('Body too large'); }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}
