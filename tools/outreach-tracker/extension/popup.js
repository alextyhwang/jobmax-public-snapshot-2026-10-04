const select = document.querySelector('#package');
const status = document.querySelector('#status');
const attach = document.querySelector('#attach');
let contacts = [];
async function call(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (result.error) throw new Error(result.error);
  return result.data;
}
try {
  const state = await call({ type: 'state' });
  contacts = state.contacts.filter(c => c.email?.address && (!c.message.sentAt || c.action.status === 'followup-due') && !c.sendBlockers?.length);
  for (const contact of contacts) {
    const option = document.createElement('option'); option.value = contact.id; option.textContent = `${contact.name} · ${contact.company}${contact.message.sentAt ? ' · follow-up' : ''}`; select.append(option);
  }
  attach.disabled = !contacts.length || !state.configured;
  status.textContent = !state.configured ? 'Configure the public endpoint in the dashboard first.' : contacts.length ? 'Select the matching package.' : 'No eligible packages. Resolve the listed blockers first.';
} catch (error) { status.textContent = error.message; }

// This function executes only after the user presses Add tracking image.
export function inspectDraft() {
  const boxes = [...document.querySelectorAll('[contenteditable="true"][role="textbox"]')].filter(node => node.getClientRects().length);
  const drafts = boxes.map(body => ({ body, form: body.closest('[role="dialog"]') || body.closest('form') })).filter(({ form }) => form?.querySelector('input[name="subjectbox"]'));
  if (drafts.length !== 1) return { error: 'Keep exactly one new compose window open. Replies and multiple drafts are not supported yet.' };
  const { body, form } = drafts[0];
  const addresses = new Set([...form.querySelectorAll('[email], [data-hovercard-id], input[name="to"], input[name="cc"], input[name="bcc"]')].map(node => node.getAttribute('email') || node.getAttribute('data-hovercard-id') || node.value).filter(value => value?.includes('@')).map(value => value.trim().toLowerCase()));
  if (addresses.size !== 1) return { error: 'Use one recipient, with no CC or BCC. Commit the recipient chip before tracking.' };
  return { recipient: [...addresses][0], subject: form.querySelector('input[name="subjectbox"]').value, text: body.innerText, existingId: body.querySelector('img[data-jobmax-id]')?.dataset.jobmaxId };
}

function insertPixel(pixelUrl, id, expected) {
  const boxes = [...document.querySelectorAll('[contenteditable="true"][role="textbox"]')].filter(node => node.getClientRects().length);
  const drafts = boxes.map(body => ({ body, form: body.closest('[role="dialog"]') || body.closest('form') })).filter(({ form }) => form?.querySelector('input[name="subjectbox"]'));
  if (drafts.length !== 1) throw new Error('Draft changed. Try again.');
  const { body, form } = drafts[0];
  const recipients = new Set([...form.querySelectorAll('[email], [data-hovercard-id], input[name="to"], input[name="cc"], input[name="bcc"]')].map(node => node.getAttribute('email') || node.getAttribute('data-hovercard-id') || node.value).filter(value => value?.includes('@')).map(value => value.trim().toLowerCase()));
  if (recipients.size !== 1 || [...recipients][0] !== expected.recipient || form.querySelector('input[name="subjectbox"]').value !== expected.subject || body.innerText !== expected.text) throw new Error('Draft changed while preparing. Try again.');
  if (body.querySelector('img[data-jobmax-id]')) throw new Error('This draft already contains a tracking image.');
  const image = document.createElement('img');
  image.width = 1; image.height = 1; image.alt = ''; image.dataset.jobmaxId = id;
  image.src = pixelUrl; image.style.cssText = 'width:1px;height:1px;border:0;';
  body.append(image);
  body.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  return body.querySelector(`img[data-jobmax-id="${id}"]`)?.src === pixelUrl;
}

attach.onclick = async () => {
  attach.disabled = true;
  try {
    const contact = contacts.find(c => c.id === select.value);
    const followup = Boolean(contact.message.sentAt);
    const existingTrackingId = followup ? contact.message.followupTrackingId : contact.message.trackingId;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.startsWith('https://mail.google.com/')) throw new Error('Open the Gmail draft tab first.');
    const [{ result: draft }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: inspectDraft });
    if (!draft || draft.error) throw new Error(draft?.error || 'Could not inspect draft');
    if (draft.existingId && draft.existingId !== existingTrackingId) throw new Error('This draft contains tracking for a different package.');
    const normalize = text => text.replace(/\s+/g, ' ').trim();
    if (normalize(draft.text) !== normalize(followup ? contact.followupDraft : contact.emailDraft.body)) throw new Error('The draft text must match the package. Update the package first if you edited the message.');
    const prepared = await call({ type: 'prepare', input: { packageId: contact.id, recipient: draft.recipient, subject: draft.subject, phase: followup ? 'followup' : 'initial' } });
    if (!draft.existingId) {
      const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: insertPixel, args: [prepared.pixelUrl, prepared.id, draft] });
      if (!result) throw new Error('Image insertion was not verified. Do not assume tracking is attached.');
    }
    await call({ type: 'arm', id: prepared.id });
    status.textContent = `Tracking image attached. Review and send yourself, then record “${followup ? 'follow-up sent' : 'email sent'}” in the dashboard. This button has not sent anything.`;
  } catch (error) { status.textContent = error.message; } finally { attach.disabled = false; }
};
