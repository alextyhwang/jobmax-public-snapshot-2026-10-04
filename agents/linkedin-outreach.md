# LinkedIn cold outreach (recruiters + RIT team leads)

**Status:** Reusable playbook; inactive in this public snapshot.

**Tracked recruiter pilot:** For contacts whose CRM Next Action contains
`[tracked-email]`, use [tracked-recruiter-outreach.md](tracked-recruiter-outreach.md)
instead of this playbook's no-note Connect and calendar-only follow-up steps.
This pilot requires personalized notes and exact-recipient message approval.

**Owner:** Cold Outreach Grok Bot (`5ffb5548-80af-4af3-9375-b155d8d9db4b`). Auth is browser-only on **that** bot’s Chrome (separate desktop from LinkedIn Outreach).

**LinkedIn Outreach bot:** retired connect-farm owner. Does not run this playbook.

## Hard rules

1. **Connection requests:** you may send Connects without waiting on the candidate (use no note / skip note when LinkedIn allows).
2. **Messages need the candidate's permit.** Any connection-note text, LinkedIn DM, InMail, or follow-up: show the candidate the exact draft for the exact person and send only after he says yes (or edits it).
3. **Sound human.** Drafts must pass a “would a student actually type this?” check. Use `profile/outreach-template.md` as a **starting point**, then vary wording. Run Humanizer patterns: no em dashes, no “I’m passionate / excited / aligns with,” no triple stacks, no sales cadence.
4. **Halt:** If Job Master / the candidate has a full JobMax halt, still only stage/draft — no sends until halt is lifted **and** he permits each message.

## Goal

For roles on today’s `applications/research-daily/` shortlist (resume-direct
matches from Job Discovery):

1. University / SWE / AI recruiters for that company/role  
2. Hiring managers when publicly identifiable  
3. RIT alumni who manage or nearly manage a team there  

Also fine: priority Bay AI/product companies when the shortlist is empty.
Respect the current user-provided do-not-contact list.

**No-note Connects:** send only when the active user request authorizes the batch.  
**Messages:** still need his OK on the exact draft.  
**Emails:** prefer public/work emails from company pages, LinkedIn contact info, or ≥3 company-format guesses when LinkedIn gates Connect on email.  
**Noise:** do not stream mid-step updates to Job Master/the candidate. One batch report when the run finishes (or when blocked on login/CAPTCHA).

Log in `outreach/<company>.md`.

## Who to find

**Recruiters:** university / campus / early career / SWE / AI / emerging talent recruiters.

**RIT leads:** Education shows RIT **and** title/signal shows managing a team. Prefer Bay / remote-US. Skip students, interns, pure ICs.

## Daily staging batch

Up to **3 recruiters** + **3 RIT leads**. Quality over volume.

## Flow

1. `git pull --ff-only`
2. Pick companies; open/create CRM files
3. Search LinkedIn in Cold Outreach Chrome; duplicate-check CRM
4. Stage rows (`Ready`) with why-this-person notes
5. Draft message (recruiter vs RIT-lead). Humanize. Put draft in Notes
6. Send no-note Connect when possible; verify Pending
7. If you want a note/DM: draft it, report to the candidate for permit, send only after yes
8. Verify send; log Message Log; Status `Contacted`; commit CRM
9. Report what was sent

## Follow-ups

One follow-up after ~7–10 days only if connected and silent — **still needs the candidate's permit** on the exact follow-up text.

## Not this workflow

- Blank no-note Connect farming unrelated to research targets  
- Auto-sending **messages** without per-message approval  
- InMail that spends credits unless the candidate asks  
- Applications / resume tailoring / apply-queue refill  
