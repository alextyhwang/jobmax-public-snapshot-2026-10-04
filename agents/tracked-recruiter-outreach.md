# Tracked recruiter outreach

the candidate confirmed this workflow on 2026-09-20. It supplements role-driven outreach
with up to five qualified recruiters each at Apple and Google. Use it for CRM
contacts whose Next Action contains `[tracked-email]`.

## Prepare the package

1. Read `profile/profile.md`, the company's existing CRM, and only the relevant
   experience evidence. Lead with Paychex AI agents/MCP/LLM evaluation or Real
   Wave production AI work when it fits the specific opening.
2. Verify a specific Spring/Summer 2027 opening and the recruiter's relevant
   university, early-career SWE, or AI responsibility. A company name alone
   does not establish ownership. Keep unverified remit as a blocker.
3. Reconcile current LinkedIn relationship and Gmail conversation history
   through connected Chrome. Existing Pending invitations cannot receive a new
   note; do not duplicate them. Already-connected people need a separately
   reviewed DM version. If note credits or Connect are unavailable, report the
   blocker; this pilot does not silently switch to no-note requests.
4. Prefer published work emails. Treat company-pattern guesses as unverified; retain
   the exact evidence and mark them `guessed`. Gmail suggestions and successful
   LinkedIn email gates do not prove ownership or deliverability. Use one
   best-supported address per recipient, not a list of permutations.
5. Store each package in `outreach/packages/*.json`: recipient identity,
   LinkedIn, email and evidence status, exact role link/ID, why-this-person,
   prior history, connection note, email subject/body, one follow-up draft,
   source links, and remaining send blockers. Render a Markdown review copy
   with `tools/outreach-tracker/render-package.mjs`.

Complete preparation when every drafted person has these fields, unsupported
claims are removed, and blockers are explicit. Fewer than five per company is
valid when additional candidates lack relevant evidence.

## Review and send

A workflow request is not an exact-recipient send approval. Present the exact person and
note/email/follow-up and obtain confirmation for that action. The tracker has
no sending capability; sends happen through the normal LinkedIn/Gmail UI.

Before the first real message, deploy/configure the collector, load the Gmail
extension, and complete the controlled-message smoke test in the
[tracker README](../tools/outreach-tracker/README.md). A unit-test pass alone
does not verify Gmail preserved the tracking image.

Send the personalized connection note after approval and verify Pending.
Record the observed note timestamp. Three New York business days later,
send the approved email unless a conversation has already started. Continue
an existing conversation in its original channel. Verify the actual recipient,
subject, body, and tracking image against the package before sending.

Immediately after Gmail visibly confirms sending, record the actual send time
in the local dashboard. Prepared drafts are not sent records. The extension
arms collection before sending; requests before the actual send time are excluded.
Sending before arming leaves an unobserved interval and makes tracking uncertain.
Record replies, declines, and bounces when observed. Log verified external
actions in the company's CRM without replacing earlier history.

## Follow-up decision

The local tracker implements this policy in `tools/outreach-tracker/policy.mjs`:

- Any reported open: no follow-up, even without a reply.
- A reply, decline, or bounce: stop the sequence.
- No reported open and no reply after seven business days: one reviewed
  follow-up, only if tracking coverage is healthy and there is no known ambiguity.
- Outage, stale collector health, identifiable sender-preview ambiguity, or
  missing tracking setup: unknown; no follow-up based on an unopened assumption.
- After one follow-up: stop. Never generate an automatic resend loop.

Business days are Monday-Friday in America/New_York; holidays are not currently
excluded. Recheck Gmail/LinkedIn replies and collector status immediately before
presenting a due follow-up for approval. An out-of-office reply stops the
automatic sequence; review any later contact separately after the return date.

Keep `[tracked-email]` in the CRM Next Action throughout the pilot. The legacy
`outreach:followups` command excludes these contacts so it cannot override this
policy with an old calendar date. The dashboard is the source of per-email
tracking state, while company CRM files remain the source of relationship history.

## Privacy and operation

Recruiter details, drafts, pairing credentials, and runtime records stay local.
The public collector stores random message IDs, timestamps, event categories,
and health gaps. It does not store email bodies, addresses, names, IPs, or location
analytics. Provider request logs may still contain network metadata; keep
provider observability disabled unless needed for an approved debugging task.

Use free-tier hosting; do not purchase a subscription or enable billing upgrades.
Keep collector URLs stable for already-sent emails. See the tracker README for
deployment, self-preview limitations, and recovery steps.
