# Resume-only generator

Use this workflow when the candidate asks to generate, tailor, revise, or rebuild one or
more resumes without asking to apply. It is intentionally separate from the
nightly application operator.

## Scope

This workflow may:

- read supplied job descriptions or job URLs;
- create or update role folders under resumes/roles/;
- tailor LaTeX sources from the canonical resume and supported evidence;
- build, render, inspect, and copy final PDFs to output/pdf/;
- write one resume-run telemetry record.

This workflow must not:

- scan for jobs or check posting liveness beyond reading the supplied role;
- update the application pipeline or tracker;
- open or complete an application form;
- load controlled application answers;
- search for outreach contacts or update outreach CRM files;
- run tracker, outreach, follow-up, batch, or application-queue commands.

## Fast path

1. If the candidate explicitly asks to pull, pull once at the beginning while preserving
   local changes. Do not repeatedly chase unrelated commits that land during
   generation.
2. Read only profile/profile.md, resumes/README.md, the canonical resume, the
   supplied job descriptions, and the smallest relevant set of evidence files.
   Prefer the closest existing role variant over reopening every evidence file.
3. For job URLs, extract the job-description body directly. Avoid full browser
   snapshots, console logs, network logs, application pages, and broad web
   searches unless direct extraction fails.
4. For every variant, use the lightweight [Qualification Coverage process](../resumes/README.md#qualification-coverage--required-for-every-variant) in tailoring-notes.md. Classify single-team versus explicit multi-team intake before choosing keyword scope; treat unclear postings as the full role. Use explicitly sourced evidence for ordinary minimum-qualification technical skills, place those exact tools in Skills, record only genuinely unconfirmed preferred or specialist gaps as profile Learning Targets, and keep drafting. Scaffold requested variants, then tailor them as one batch; preserve relevant basics explicitly.
5. Build multiple PDFs concurrently. Render each final page once and revise only
   for a concrete defect: overflow, clipping, sparse layout, weak line balance,
   unsupported claims, or missing role alignment.
6. Compare JD keywords with visible generated LaTeX, separate exact/semantic/absent matches, and record a short recruiter-perspective review. Verify the final PDF retains that content. Degree and graduation date convey the school timeline; omit school-return boilerplate. Copy stable final PDFs to output/pdf/, run the one-page check and git diff --check, then log findings and learning targets once with the run.

## Default content floor

Unless the candidate requests otherwise or the page genuinely cannot fit:

- Paychex gets three to four high-signal bullets, including the supported 55%
  token reduction and current AI-platform evidence such as AI agents, MCP, LLM
  evaluation, context engineering, and subagent architecture.
- RIT Student Researcher gets two concise lines without publishing restricted
  implementation details.
- Real Wave keeps its strongest scale and performance metrics.
- Include two role-relevant projects.
- Keep Bay Area Stem Academy and the RIT Asian Culture Society Event Coordinator
  entry.
- Prefer filling available one-page space with supported evidence over leaving
  large elastic gaps.

## Completion

Success means every requested PDF is one page, visually full but readable,
truth-constrained, role-specific, and available at a stable output path, with a JD-to-LaTeX keyword review and concise recruiter assessment. Report the PDFs, useful matches, and actionable gaps without treating missing learnable skills as a delivery blocker.
