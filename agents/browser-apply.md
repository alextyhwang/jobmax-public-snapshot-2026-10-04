# Browser apply checklist

Operational checklist for Job Apply / Job Apply 2. Throughput first. Full
policy: `agents/nightly-application-operator.md` and
`agents/automations.md` §3. Answers: `profile/application-answers.md`.

1. `git pull` (ff-only) before claiming work.
2. Follow [the queue and retry protocol](application-queue.md). Select with
   `npm run apply:queue -- --bot job-apply --eligible-only --limit 3 --json`
   (use `job-apply-2` for the even bot).
3. Claim `Applying` and `git push` **before** opening the form.
4. Tailor the resume only if the role PDF is missing; reuse the existing PDF
   when present.
5. Simplify autofill, then verify every field against `profile/profile.md` and
   `profile/application-answers.md` (including SAFE DEFAULTS).
6. Email code → open Gmail (`candidate@example.com`) yourself, enter the
   code, continue. Do not ask the candidate. If the code expired, re-trigger once, then
   move on.
7. Submit when company, role, answers, and PDF are verified. Mark `Applied`
   only after visible submission confirmation; then push.
8. On any blocker, set `Blocked`, release the claim, and record explicit
   blocker/retry metadata per the queue protocol; continue with eligible work.
   Retry only after the recorded condition is verified resolved.
9. Ping the candidate **only** for: portal password not provided, CAPTCHA unsolved after
   normal visible attempts, or a required field with no safe default. Phone/SMS
   → `Blocked: phone verification deferred` and move on (do not ping). Prefer
   finishing near-complete Greenhouse/Ashby/Lever (including rows with resolved email-code
   blockers) before new multi-page Workday/Oracle. Essays → Job Answers first; if
   slow, skip the role and continue.

Never ask the candidate to approve or confirm a submit. No confirmation widgets.
