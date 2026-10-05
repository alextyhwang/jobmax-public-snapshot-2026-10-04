import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.argv[2] || 'outreach/packages/2026-09-20-apple-google.json');
const batch = JSON.parse(await readFile(path, 'utf8'));
const lines = [`# Apple and Google recruiter package`, '', `Prepared: ${batch.preparedOn}. Drafts only; no notes or emails sent.`, '', batch.summary, '',
  '## Shortlist', '', '| Recruiter | Company | Work email | Evidence | Ready to send? |', '|---|---|---|---|---|'];
for (const c of batch.contacts) lines.push(`| [${c.name}](${c.linkedin}) | ${c.company} | ${c.email.address} | ${c.email.status} | ${c.sendBlockers.length ? 'Hold: reconcile history/remit' : 'Needs the candidate's exact-message approval and live checks'} |`);
lines.push('', 'Published means a source lists the address; it is not proof of current delivery. Guessed addresses are candidates, not confirmed addresses. Gmail recognition alone does not verify ownership.', '', '## Roles and evidence', '', ...batch.roles.map(r => `- [${r.title}](${r.url}) (${r.id}): ${r.notes}`), '', '## Excluded contacts', '', ...batch.excluded.map(c => `- **${c.name}:** ${c.reason} [Source](${c.source})`));
for (const c of batch.contacts) {
  lines.push('', `## ${c.name} · ${c.company}`, '', `**Role:** ${c.role}`, '', `**Why this person:** ${c.whyThisPerson}`, '', `**History:** ${c.history}`, '', `**Email:** ${c.email.address} — ${c.email.status}. ${c.email.evidence}`, '', `**Opening:** [${c.opening.title}](${c.opening.url})`, '', `**Before sending:** ${c.sendBlockers.length ? c.sendBlockers.join('; ') : 'Check the live LinkedIn relationship, email thread, role and exact draft with the candidate. No send approval has been given.'}`, '', `**Sources:** ${c.sources.map((s, i) => `[${i + 1}](${s})`).join(', ')}`, '', '### Connection note', '', c.connectionNote, '', 'For an existing pending invitation, do not send another invitation or pretend the old invitation contained this note. If already connected, review a DM version separately.', '', '### Email', '', `Subject: ${c.emailDraft.subject}`, '', c.emailDraft.body, '', '### Follow-up draft', '', c.followupDraft, '', 'Eligible only after seven New York business days with no reported open or reply, healthy tracking coverage, and no prior follow-up. One follow-up maximum; exact-message approval remains required.');
}
lines.push('', '## Operation', '', 'Use `npm run outreach:serve` for the local dashboard. Setup and testing instructions: [tracker README](../../tools/outreach-tracker/README.md). Workflow: [tracked recruiter outreach](../../agents/tracked-recruiter-outreach.md).', '', 'Source JSON is authoritative for these drafts. Regenerate this review copy with `node tools/outreach-tracker/render-package.mjs`.', '');
await writeFile(path.replace(/\.json$/, '.md'), lines.join('\n'));
console.log(`Rendered ${batch.contacts.length} recruiter packages.`);
