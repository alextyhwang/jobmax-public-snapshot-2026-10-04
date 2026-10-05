# Nightly application operator

Run after job discovery and outreach staging. Select the strongest eligible roles
with `npm run apply:queue -- --bot job-apply --eligible-only --limit 3 --json`, verify liveness and evidence fit,
and prepare the role-specific resume before each application, reusing a verified
existing PDF when appropriate.
Build and visually verify missing PDFs, then use Simplify autofill or connected
Chrome to complete and verify every form field. Submit only after visible
confirmation and mark `Applied` only then.

Daily target: ten visible submission confirmations per apply bot (Job Apply
and Job Apply 2 each own ten; twenty total). Count confirmed Applied rows for
today, not attempts.

## SPEED / NO-PING (throughput first)

- Do **not** ask the candidate to approve or confirm a submit. No confirmation widgets.
  Submit only when the active user request authorizes the exact role and company, answers, and PDF are verified.
- Do **not** ask the candidate to paste email codes. Open Gmail for
  `candidate@example.com` in **your** connected Chrome session, retrieve the
  newest matching code for that company/portal, enter it, and continue. If the
  code tab expired, re-trigger once, then move on.
- Prefer finishing near-complete Greenhouse/Ashby/Lever forms (including previously parked
  rows whose email-code blocker is now resolved) **before** starting brand-new
  multi-page Workday/Oracle flows.
- On any soft block: record a short note, set Status `Blocked` with explicit retry metadata, and **immediately** claim the next eligible row.
  Never sit waiting on the candidate mid-run.
- Ping the candidate **only** for:
  - a portal password he has not provided
  - CAPTCHA still unsolved after normal visible attempts
  - a required field with no safe default in `profile/application-answers.md`
- Phone/SMS verification: mark `Blocked: phone verification deferred` and move
  on — do **not** ping the candidate.
- Narrative essays: ask Job Answers bot first; if Job Answers is slow, skip
  that role and continue the queue (do not stall the whole run).
- Mark `Applied` only after visible submission confirmation.

## Email verification

Email verification codes (Greenhouse, Oracle CE, Ashby, and similar): open
Gmail for `candidate@example.com` in the connected Chrome session, retrieve
the newest matching code for that company/portal yourself, enter it, and
continue. Do not ask the candidate to paste email codes. Phone/SMS verification is
deferred: record `Blocked: phone verification deferred` and continue to the
next role.

## Hard blockers and queue continuity

If a role is blocked by an unknown required answer with no safe default, a
CAPTCHA that remains unsolved after normal attempts, a portal password the candidate
has not provided, or browser failure, record `Blocked` with the exact reason,
leave it aside, and continue. Do not guess. Continue until ten visible
confirmations for this bot today or the queue is exhausted, then run tracker
and outreach checks and log the run telemetry. Report blocked roles to the candidate
the next morning — not mid-run, except for the hard blockers listed above.

Queue ownership, preparation, claim handling, and blocker retries follow
`agents/application-queue.md` (repository-relative). Use `--bot job-apply-2` for
the even bot. Do not reselect blocked work until its recorded retry condition
is verified resolved. Never auto-release an Applying claim.
