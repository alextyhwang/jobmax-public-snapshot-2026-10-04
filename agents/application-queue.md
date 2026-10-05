# Application queue and retry protocol

Use this protocol for Job Apply and Job Apply 2. It governs selection and
retry handling; existing answer authority and visible submission verification
still apply. Mirror this command in external bot profiles when deploying.

## Select and claim

After the workflow's initial Git sync, select a small batch:

```bash
npm run apply:queue -- --bot job-apply --eligible-only --limit 3 --json
npm run apply:queue -- --bot job-apply-2 --eligible-only --limit 3 --json
```

Job Apply owns odd IDs; Job Apply 2 owns even IDs. Explicit authorized
exceptions use `owner` and `owner_reason` in `applications/queue-state.json`.
An override never makes Applied, Applying, terminal, or Disney rows eligible.

`ready` means the existing artifact checks pass; `prepare` means an evaluated
role needs preparation (possibly a PDF or report). Both are selectable. Build
and visually verify a missing PDF; verify an existing role-specific PDF before
reuse. `--ready-only` remains available for artifact inspection, but do not use
it to select all work: PDFs may exist only on the execution host. Every form
still needs posting, evidence, answers, and upload verification.

The command is read-only, not a claim or a reservation. Immediately before
claiming, refresh the queue against the shared tracker. Serialize tracker edits
and Git operations with the other bot on the shared checkout. Set Applying,
record the claiming bot and ISO timestamp in Notes, then commit and push before
opening the form. Inspect the staged diff so another bot's unfinished edits are
not included. On a push failure, stop before opening the form and reconcile
ownership; never discard shared edits or blindly reset the checkout.

Active Applying rows and URLs already claimed/submitted under another row
are excluded. No timeout automatically releases a claim. For an abandoned
claim, confirm with the owning bot that its form is inactive and reconcile any
uncertain submission before changing status. Applied still requires visible
submission confirmation.

## Park and retry

On a blocker, set tracker Status to Blocked, release the claim in Notes, and
append a blocker to that ID in `applications/queue-state.json` in the same
commit. Preserve earlier blocker records. This prevents a Tailored soft-park
from being repeatedly selected. Record the exact question or error without
passwords, codes, or other secrets.

Schema example only — do not copy this as a real event:

```json
{
  "version": 1,
  "roles": {
    "65": {
      "blockers": [{
        "category": "authentication",
        "bot": "job-apply",
        "detail": "Gmail signed out in this bot's Chrome session",
        "last_attempt_at": "2026-09-08T12:00:00Z",
        "retry_when": "This bot verifies Gmail is signed in"
      }]
    }
  }
}
```

For historical backfills, `last_attempt_at` may use the recorded ISO date
(`YYYY-MM-DD`) when no time is known; never invent a time. New attempts should
record timestamps with timezone.

Categories: authentication, attestation, captcha, browser, platform-review,
essay, missing-answer, other. Use platform-review when the platform rejects an
action; detail must say whether the browser/form ever opened. Authentication
readiness is per bot, not shared merely because the filesystem is shared.

Once the condition is actually met, append `resolved_at` (ISO timestamp with
timezone) and `resolution` (observed evidence or exact answer-source reference)
to that blocker. All recorded blockers must be resolved before a Blocked role
returns as prepare. Elapsed time alone is not resolution. Required controlled
answers still come from `profile/application-answers.md` or the candidate's explicit
answer; resolution metadata does not authorize an answer or override a platform
rejection. A new failure gets a new blocker record.

Legacy Blocked rows without metadata stay excluded. Backfill from verified
state when handling them; do not guess that they are resolved. Existing
Tailored soft-parks need review/backfill on adoption before bots use this queue.
The initial metadata backfills the explicit blockers in tracker Notes/Next
Action for #50, #89, and #118; their historical tracker rows remain unchanged.

Run `npm run tracker:check` and `npm run outreach:check` after tracker/metadata
updates. The tracker check validates metadata IDs, owners, blockers, and
resolution evidence. Malformed metadata also stops queue selection.
