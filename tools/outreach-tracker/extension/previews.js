(() => {
  let known = new Set();
  const lastReported = new Map();
  async function refresh() {
    try { const result = await chrome.runtime.sendMessage({ type: 'known-ids' }); if (result.data) known = new Set(result.data); } catch { /* Reload Gmail after updating the extension. */ }
  }
  function inspect() {
    for (const image of document.querySelectorAll('img')) {
      const source = `${image.dataset.jobmaxId || ''} ${image.getAttribute('src') || ''} ${image.getAttribute('data-src') || ''}`;
      const id = [...known].find(id => source.includes(id));
      if (!id || image.closest('[contenteditable="true"]')) continue;
      // Gmail may rewrite image URLs. Only identified local IDs are acted on.
      image.removeAttribute('src');
      if (Date.now() - (lastReported.get(id) || 0) < 30_000) continue;
      lastReported.set(id, Date.now());
      chrome.runtime.sendMessage({ type: 'preview', id }).catch(() => {});
    }
  }
  let scheduled = false;
  new MutationObserver(() => {
    if (!scheduled) { scheduled = true; setTimeout(() => { scheduled = false; inspect(); }, 100); }
  }).observe(document, { childList: true, subtree: true });
  refresh().then(inspect);
  setInterval(() => refresh().then(inspect), 30_000);
})();
