const $ = selector => document.querySelector(selector);
let token;
const notice = text => { $('#notice').textContent = text; };
async function api(path, body) {
  const response = await fetch(`/api/${path}`, { method: body ? 'POST' : 'GET', headers: { 'X-JobMax-Token': token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
function el(tag, text, cls) { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; }
function button(label, fn) {
  const node = el('button', label); node.type = 'button';
  node.addEventListener('click', async () => { node.disabled = true; try { await fn(); } catch (error) { notice(error.message); } finally { node.disabled = false; } });
  return node;
}
function link(label, url) {
  const node = el('a', label);
  if (/^https:\/\//.test(url || '')) { node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
  return node;
}
async function refresh() {
  const state = await api('state');
  $('#connection').textContent = state.configured ? `Collector configured: ${state.endpoint}` : 'Not deployed yet. Packages are available; tracking needs a public endpoint.';
  $('#settings [name=endpoint]').value = state.endpoint;
  const nodes = state.contacts.map(contact => {
    const card = el('article');
    card.append(el('h3', `${contact.name} · ${contact.company}`), el('p', contact.role));
    card.append(el('p', `${contact.action.status}${contact.action.due ? ` · ${contact.action.due}` : ''}: ${contact.action.reason}`, 'status'));
    card.append(link('LinkedIn profile', contact.linkedin), document.createTextNode(' · '), link(contact.opening.title, contact.opening.url));
    card.append(el('p', contact.whyThisPerson));
    card.append(el('p', `Email: ${contact.email?.address || 'Not found'} (${contact.email?.status || 'unknown'}). ${contact.email?.evidence || ''}`, 'muted'));
    card.append(el('p', `History: ${contact.history}`, 'muted'));
    if (contact.sendBlockers?.length) card.append(el('p', `Before sending: ${contact.sendBlockers.join('; ')}`, 'blocker'));
    const drafts = el('details'); drafts.append(el('summary', 'Review note and email drafts'));
    for (const [name, text] of [['Connection note', contact.connectionNote], ['Email subject', contact.emailDraft.subject], ['Email', contact.emailDraft.body], ['Follow-up subject', `Re: ${contact.emailDraft.subject}`], ['Follow-up', contact.followupDraft]]) {
      drafts.append(el('h4', name), el('pre', text), button(`Copy ${name.toLowerCase()}`, async () => { await navigator.clipboard.writeText(text); notice(`${name} copied.`); }));
    }
    card.append(drafts);
    if (contact.tracking) card.append(el('p', `Reported opens: ${contact.tracking.reportedOpens ?? 'unknown'}${contact.tracking.ambiguous ? ' · sender preview / unobserved interval' : ''}`, 'muted'));
    const actions = el('div', '', 'actions');
    for (const [label, kind] of [['Record note sent', 'note-sent'], ['Record email sent', 'sent'], ['Record reply', 'replied'], ['Record decline', 'declined'], ['Record bounce', 'bounced'], ['Record follow-up sent', 'followup-sent']]) {
      actions.append(button(label, async () => {
        if (!confirm(`${label} for ${contact.name}? Confirm only after observing this in LinkedIn or Gmail. This does not send anything.`)) return;
        const at = prompt('Actual event time (ISO timestamp). For email, confirm promptly after sending.', new Date().toISOString());
        if (!at) return;
        await api('event', { packageId: contact.id, kind, at, confirmed: true });
        notice('Observed event recorded.'); await refresh();
      }));
    }
    card.append(actions);
    return card;
  });
  $('#contacts').replaceChildren(...(nodes.length ? nodes : [el('p', 'No packages prepared yet.')]));
}
try {
  token = (await (await fetch('/api/bootstrap')).json()).token;
  $('#pair').onclick = async () => { try { await navigator.clipboard.writeText(token); notice('Pairing code copied. Paste it into the JobMax extension options.'); } catch (error) { notice(error.message); } };
  $('#refresh').onclick = () => refresh().catch(error => notice(error.message));
  $('#settings').onsubmit = async event => {
    event.preventDefault();
    try { await api('config', Object.fromEntries(new FormData(event.target))); event.target.adminToken.value = ''; notice('Collector connected.'); await refresh(); } catch (error) { notice(error.message); }
  };
  await refresh();
} catch (error) { notice(error.message); }
