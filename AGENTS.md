# Public snapshot instructions

This is a frozen public export. Its operational records are empty. Resume files intentionally retain the candidate's public professional and contact details. Acquire new authorization and sourced answers for any application or outreach action; historical personal approvals and connected-account access do not transfer to this snapshot.

# JobMax Agent Instructions

JobMax is the candidate's source of truth for the Spring 2027 and Summer 2027 AI-focused SWE internship/co-op search. the candidate is open to Spring (January-May 2027), Summer 2027, or a role spanning both terms.

## Repository Freshness

- Always run `git fetch origin` at the start of every task before reading repository state or making changes.
- Before editing or committing, compare the current branch with its upstream and integrate upstream changes safely while preserving existing local work.
- Do not repeatedly poll or fetch during a task; fetch again only immediately before a requested push so the push is based on the latest remote state.

## Load Context Progressively

- Start with `profile/profile.md` for the concise profile and source map.
- For application or outreach work, read `.agents/skills/jobmax-career-ops/SKILL.md`, then load only the evidence and playbook relevant to the current role or workflow.
- For standalone resume generation or revision, use the `resume-only` mode in
  `.agents/skills/jobmax-career-ops/SKILL.md` and
  `agents/tailor-resume.md`. Do not load or validate application, tracker,
  discovery, or outreach state unless the user separately requests it.
- Use `profile/application-answers.md` only for controlled application answers. A blank or `TBD` is unknown.
- Prefer direct evidence, live page state, generated artifacts, and validation output over duplicated summaries. Reconcile conflicts back into the appropriate source file.

## Sources Of Truth

| Area | Source |
|---|---|
| Profile and reusable claims | `profile/` |
| Experience, projects, leadership evidence | `experience/`, `projects/`, `leadership/` |
| Applications | `applications/tracker.md` |
| Outreach | Company files under `outreach/` |
| Weekly reviews | `reviews/` |
| Scheduled workflows | `agents/automations.md` |

## Required Validation

- Run `npm test` after changing `scripts/job-search/`.
- Run `npm run tracker:check` and `npm run outreach:check` after changing tracker or CRM data.
- Run `npm run scan:dry` before `npm run scan`.
- Use ISO dates (`YYYY-MM-DD`) in operational records.

## Browser Work

- Use the installed `chrome:control-chrome` skill with the candidate's connected Chrome profile. Use Computer Use only outside the rendered page, such as extension UI or native file pickers.
- Routine navigation and browser housekeeping needed for an authorized workflow do not require permission. Do not close tabs containing unsaved input or an active user workflow.
- If Chrome cannot connect, stop and report that blocker instead of switching browser controllers.

## Action Boundaries

- A request to apply or run the application workflow authorizes submission of each exact role selected by that workflow after the posting, sourced answers, and exact role-specific resume are verified. Ask only for the smallest missing fact or user-only action.
- Treat Simplify autofill as proposed input and verify every field against JobMax. Mark `Applied` only after the application site visibly confirms submission.
- Never infer legal, demographic, work-authorization, sponsorship, salary, relocation, disability, veteran, or background-check answers. Use only explicitly sourced answers.
- Never send a LinkedIn message, email, or follow-up without the candidate's explicit confirmation naming the exact recipient and action.
- The scheduled Nightly LinkedIn Outreach workflow and user-requested reruns have standing intent to prepare and, where browser policy permits, send the specified no-note connection batch. Follow `agents/automations.md` for discovery, duplicate checks, grouped action-time confirmation when required, visible `Pending` verification, and logging. Never approve on the candidate's behalf.
- Attempt CAPTCHAs only through the site's normal visible flow; do not bypass them. One-time authentication remains a user action.

## Record Integrity

Prefer updating an existing record over creating a duplicate. Preserve history and never invent dates, metrics, people, links, outcomes, qualifications, approvals, or visible success states.
