# Browser Application Workflow

Use this mode for an exact tracker row after the role is evaluated and its role-specific resume is built. The outcome is either a visibly confirmed submission recorded in JobMax or a form paused only for genuinely missing information or an action that cannot be completed with the available controls.

## Browser Surface

- Use the candidate's connected Chrome profile for application pages because Simplify, existing sessions, and saved portal state live there.
- Use Chrome browser control for page navigation, inspection, typing, clicks, and verification.
- Use Computer Use only when the flow requires UI outside the rendered page, such as extension chrome or a native file picker. On Windows, keep the target app visible and the device unlocked while Computer Use runs.
- Do not switch to the built-in browser for convenience; its separate profile does not contain the candidate's Chrome extensions or sessions.

## Preflight

1. Run `npm run tracker:check` and `npm run apply:queue -- --bot job-apply --eligible-only --limit 3 --json`.
2. Select one exact tracker row. Read its report, saved job description, tailoring notes, `profile/profile.md`, and `profile/application-answers.md`.
3. Complete `agents/tailor-resume.md` against the saved job description. Confirm the role-specific `resume.pdf` reported by the queue exists, is the intended one-page artifact, and has been visually checked. Never upload the base or generic Simplify resume when a tailored artifact is linked.
4. Check the exact posting with `npm run liveness -- <source-url>`. Stop if the role is closed or the company/role shown in Chrome does not match the tracker.
5. Do not start a second application for the same source URL or an already-applied tracker row.

## Form Preparation

1. Open the source URL in Chrome and enter the normal application flow.
2. Invoke Simplify where the portal exposes it and wait for autofill to finish.
3. Inspect every field and every application step after autofill. Simplify values are proposed inputs, not authority for controlled answers. Clear any inferred voluntary demographic, disability, or veteran response that is not explicitly sourced.
4. Correct ordinary fields only from JobMax sources. Use the role report and evidence files for narrative answers; keep claims concise and supported.
5. Upload the exact role-specific PDF. Verify the visible filename after upload.
6. Preserve any existing user input. Do not replace a value when its source or meaning is ambiguous.

## Answer Authority

| Field class | Authority | Action |
|---|---|---|
| Name, public contact/profile links, school, degree, graduation | `profile/profile.md` | Fill or verify automatically when the question is unambiguous |
| Skills, experience, projects, metrics, role-interest narratives | Tracker report plus `experience/`, `projects/`, `leadership/`, and the tailored resume | Fill only supported claims |
| Legal, work authorization, sponsorship, salary, relocation, or background-check | Exact answer in `profile/application-answers.md` (including SAFE DEFAULTS) or the candidate's live answer for this application | Otherwise soft-block, note reason, claim next role; never infer beyond listed defaults |
| Optional demographic, disability, or veteran self-identification | Exact answer in `profile/application-answers.md` | Prefer decline / prefer-not-to-say when that option exists; leave blank if truly optional with no decline option |
| Consent, certification, signature, or attestation | The exact statement in `profile/application-answers.md`, the active request, or the candidate's live answer | If the required statement is not explicitly authorized (and is not a listed SAFE DEFAULT such as Microsoft AI-insights), soft-block and continue queue |
| Passive informational notice with no checkbox, choice, signature, certification, or attestation | Visible portal text | Read it and surface material terms in the final review; do not treat it as a separate answer or request a second approval solely for the notice |

`TBD`, a blank cell, an autofilled Simplify value, or a prior application is not an explicit answer for a controlled field. SAFE DEFAULTS in `profile/application-answers.md` (none are included in this public snapshot) are explicit answers for their listed scope only.

## Holds And Questions

- Resolve agent-actionable issues from JobMax and the visible portal without interrupting the candidate. Attempt CAPTCHAs through the normal visible challenge using available browser controls; do not bypass or evade the site's challenge. Escalate only if the CAPTCHA remains unsolved after reasonable normal attempts.
- Email verification codes (Greenhouse, Oracle CE, Ashby, etc.): open Gmail for `candidate@example.com` in the connected Chrome session, retrieve the newest matching code yourself, enter it, and continue. Do not ask the candidate to paste codes. If the code tab expired, re-trigger once, then move on. Phone/SMS: mark `Blocked: phone verification deferred` and continue — do not ping the candidate.
- On soft blocks (missing narrative pending Job Answers, temporary portal glitch): short note, Status `Blocked` with explicit retry metadata, immediately claim the next eligible row. Never sit waiting on the candidate mid-run.
- Ping the candidate only for: portal password not provided, CAPTCHA unsolved after normal visible attempts, or a required field with no safe default. Prefer finishing near-complete Greenhouse/Ashby/Lever (including rows with resolved email-code blockers) before new multi-page Workday/Oracle.
- Do not ask the candidate to approve or confirm a submit. No confirmation widgets. Submit only when the active user request authorizes the exact role and company, answers, and PDF are verified.
- Narrative essays: ask Job Answers first; if Job Answers is slow, skip that role and continue the queue.

## Submission And Recording

1. After verifying the exact posting, every required answer, and the uploaded role-specific resume, click the final submission control once. Do not request separate the candidate approval.
2. Wait for a visible success page, confirmation message, or application identifier. An email-code screen is bot-actionable via Gmail, not an the candidate handoff.
3. Only after visible success, update the tracker row: set `Date` to the ISO submission date, set `Status` to `Applied`, set the next action to monitor/follow up, and add a factual confirmation note. Record a confirmation identifier only if the site displayed one.
4. Run `npm run tracker:check` and `npm run outreach:check` after tracker/CRM edits.

Never send an email, LinkedIn message, or follow-up as part of this workflow.

Also see the short checklist at `agents/browser-apply.md`.

Queue ownership, preparation, claim handling, and blocker retries follow
`agents/application-queue.md` (repository-relative). Use `--bot job-apply-2` for
the even bot. Do not reselect blocked work until its recorded retry condition
is verified resolved. Never auto-release an Applying claim.
