chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const LOCAL = 'http://127.0.0.1:4318';
async function api(path, body) {
  const { pairingToken } = await chrome.storage.local.get('pairingToken');
  if (!pairingToken) throw new Error('Open extension options and paste the dashboard pairing code.');
  const response = await fetch(`${LOCAL}/api/${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-JobMax-Token': pairingToken }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  (async () => {
    const trustedPage = sender.url?.startsWith(chrome.runtime.getURL(''));
    if (message.type === 'preview') {
      if (!sender.url?.startsWith('https://mail.google.com/')) throw new Error('Invalid preview source');
      const { tracked = {} } = await chrome.storage.local.get('tracked');
      if (!tracked[message.id]) return {};
      await api('preview', { trackingId: message.id });
      return {};
    }
    if (message.type === 'known-ids') {
      if (!sender.url?.startsWith('https://mail.google.com/')) throw new Error('Invalid source');
      const { tracked = {} } = await chrome.storage.local.get('tracked');
      return Object.keys(tracked);
    }
    if (!trustedPage) throw new Error('Use the extension popup');
    if (message.type === 'state') return api('state');
    if (message.type === 'arm') return api('arm', { trackingId: message.id });
    if (message.type === 'prepare') {
      const result = await api('prepare', message.input);
      const { tracked = {} } = await chrome.storage.local.get('tracked');
      tracked[result.id] = result.packageId;
      await chrome.storage.local.set({ tracked });
      // Block direct sender-side image requests. Proxied previews are quarantined separately.
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1], addRules: [{ id: 1, priority: 1, action: { type: 'block' }, condition: { requestDomains: [new URL(result.pixelUrl).hostname], initiatorDomains: ['mail.google.com'], resourceTypes: ['image'] } }] });
      return result;
    }
    throw new Error('Unknown action');
  })().then(data => respond({ data }), error => respond({ error: error.message }));
  return true;
});
