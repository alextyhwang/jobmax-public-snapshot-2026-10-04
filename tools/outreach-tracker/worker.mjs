import { createCollector } from './collector.mjs';
import { D1Store } from './d1-store.mjs';

export default {
  fetch(request, env) { return createCollector(new D1Store(env.DB), env.ADMIN_TOKEN)(request); },
  scheduled(_event, env, context) { context.waitUntil(new D1Store(env.DB).heartbeat(Date.now())); },
};
