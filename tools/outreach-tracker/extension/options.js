document.querySelector('form').onsubmit = async event => {
  event.preventDefault();
  const token = new FormData(event.target).get('token').trim();
  if (!/^[a-f0-9]{64}$/.test(token)) { document.querySelector('#status').textContent = 'Paste the 64-character code from the dashboard.'; return; }
  await chrome.storage.local.set({ pairingToken: token });
  event.target.reset();
  document.querySelector('#status').textContent = 'Pairing saved. Open Gmail, then use the extension popup.';
};
