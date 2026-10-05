---
name: jobmax-career-ops
description: JobMax application and outreach automation for the candidate's internship search. Use when the user asks to scan job portals, run batch application prep, evaluate or tailor a role, assist with an application form, check the application tracker, plan follow-ups, or connect applications to JobMax outreach/resume/profile evidence.
---

# JobMax Career Ops

## Overview

Use this skill to operate JobMax as the candidate's career command center. Keep JobMax as the source of truth; do not fork or replace it with upstream career-ops.

## Source Files

Load these files as needed:

- Profile: `profile/profile.md`
- Outreach voice and reusable message template: `profile/outreach-template.md`
- Job discovery sources: `applications/job-sources.md`
- Automation telemetry: `automation-runs/runs.jsonl`
- Application answer authority: `profile/application-answers.md`
- Resume workflow (integrated into application operator): `resumes/README.md`, `profile/resume/resume.tex`
- Evidence: `projects/`, `experience/`, `leadership/`
- Outreach: `outreach/`
- Applications: `applications/pipeline.md`, `applications/tracker.md`, `applications/reports/`, `applications/follow-ups.md`

## Commands

For standalone resume generation, also read agents/tailor-resume.md. That
resume-only playbook intentionally excludes application, tracker, discovery,
and outreach work.

Use the local CLI before hand-editing tracker state:

```bash
npm run scan:dry
npm run scan
npm run liveness
npm run tracker:check
npm run apply:queue
npm run followups
npm run batch
```

Every run must log timestamps, duration, token counts (or `null` when the
runtime does not expose them), status, artifacts, and blockers in
`automation-runs/runs.jsonl`.

## Modes

- `resume-only`: When the user asks only to generate, tailor, revise, or rebuild resumes, read agents/tailor-resume.md and stay inside that workflow. Do not load application answers, tracker/pipeline state, outreach files, discovery sources, or application playbooks. Do not run tracker, outreach, or application commands. Read supplied job descriptions directly, load only the closest supported evidence, build requested variants concurrently, perform one final render pass, and log one resume run.
- `scan`: Run `npm run scan:dry` first. If results look relevant, run `npm run scan` to append new leads to `applications/pipeline.md`.
- `batch`: Legacy preparation command. Resume generation now belongs inside the nightly application operator; never submit applications or send messages from batch mode.
- `evaluate`: For a single JD or URL, create or update an evaluation report under `applications/reports/`, score fit against JobMax evidence, and add/update `applications/tracker.md`.
- `nightly-operator`: Run discovery, two-part outreach staging, then process the application queue. Build missing role-specific resumes and verify existing PDFs before reuse; skip and record blockers without stopping the queue.
- `apply-assist`: Read the application form questions or user-provided screenshots/text. Draft copy-paste answers only. Do not answer legal, demographic, work authorization, sponsorship, relocation, salary, disability, veteran, or background-check fields unless the answer is explicitly present in JobMax or provided by the candidate.
- `browser-apply`: For Simplify-assisted form preparation or application submission, read [references/browser-apply.md](references/browser-apply.md) before using browser controls. Use `npm run apply:queue -- --bot job-apply --eligible-only --limit 3 --json` to select candidates, and attach only the verified role-specific PDF produced by the resume workflow.
- `followup`: Run `npm run followups`, then draft short follow-ups for due applications. Record a follow-up only after the candidate confirms it was sent.
- `tracker`: Run `npm run tracker:check`, summarize statuses, stale next actions, and missing links.

## Rules

- Optimize for the candidate's Spring 2027 and Summer 2027 AI-focused SWE internship/co-op search. the candidate is open to Spring (January-May 2027), Summer 2027, or a role spanning both terms.
- For resume generation in every mode, follow the Qualification Coverage process in `resumes/README.md`: treat the candidate's tailor/apply request as standing confirmation of ordinary minimum-qualification technical skills, put those exact tools in Skills, and reserve evidence checks for achievements, project/employer usage, specialist depth, metrics, and controlled application answers.
- Prefer AI product, agent tooling, applied LLM, developer tools, platform, full-stack, and deployed/product engineering roles.
- For prompt engineering, LLM, generative AI, AI-agent, or agentic roles, make the role-specific resume explicitly consider these supported terms: `agentic engineering`, `prompt engineering`, `context engineering`, `LLM evaluation`, `AI agents`, `multi-agent systems`, `subagent architectures`, `MCP`, `tool calling`, `RAG`, `model reliability`, and `token optimization`. Match the job description's exact wording when supported by JobMax evidence, and avoid keyword stuffing.
- For otherwise comparable roles, use the location order in `profile/profile.md`: Bay Area (any city), elsewhere in California, elsewhere on the West Coast, New York City, then remote. This ranking preference does not authorize a relocation, commute, or in-person-availability answer.
- Keep batch mode aggressive but human-in-loop: prepare artifacts, do not submit.
- Preserve truth constraints. Do not invent skills, metrics, dates, links, contacts, or application answers.
- For any LinkedIn message, connection note, email, or X outreach, use `profile/outreach-template.md` and keep one specific reason plus one direct ask. The scheduled no-note connection workflow intentionally sends no note.
- Tie every strong application to both a resume artifact and a referral/outreach path when possible.

Queue ownership, preparation, claim handling, and blocker retries follow
`agents/application-queue.md` (repository-relative). Use `--bot job-apply-2` for
the even bot. Do not reselect blocked work until its recorded retry condition
is verified resolved. Never auto-release an Applying claim.
