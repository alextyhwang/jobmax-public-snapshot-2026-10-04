# Job discovery (resume-direct research only)

**Status:** Active. Applications are **halted**. This workflow finds and
shortlists only — it does **not** promote Tailored rows, refill apply queues,
or trigger Job Apply bots.

**Owner:** Job Discovery Grok Bot. Orchestration / daily digest: Job Master.

## Goal

Every weekday, surface a small set of openings that **directly match** the candidate's
resume evidence — not “close enough,” not generic SWE spam.

the candidate's hard fit (from `profile/profile.md`):

- Term: Spring 2027 and/or Summer 2027 intern/co-op (or both)
- Domain: AI product, agent tooling, applied LLM, LLM evaluation, MCP / tool
  calling, developer tools, or full-stack **product** engineering with clear
  AI/agent work in the JD
- Evidence to map against: Paychex AI developer platform + MCP + LLM eval +
  subagents; Real Wave agent interfaces / token optimization; Chatio; Word Hunt
  product metrics; RIT LLM/memory research
- Location preference: Bay Area → rest of CA → West Coast → NYC → remote

## Direct-match bar (keep only if ALL pass)

1. **Role type:** internship / co-op / early-career SWE for Spring or Summer 2027
   (or spanning both). Reject full-time, PhD-only, and off-term unless the candidate asks.
2. **JD ↔ resume:** the posting must explicitly call for at least one of:
   agents, LLM/GenAI product, evaluation, MCP/tooling, RAG/tool-calling,
   developer platforms, or shipping AI product features. A bare “Software
   Engineer Intern” with no AI/product signal is a **reject**.
3. **You can name the fit in one sentence** tying a JD phrase to a real
   resume bullet (Paychex / Real Wave / Chatio / research). If you cannot,
   drop it.
4. **Not on skip lists:** Palantir always. Also skip companies the candidate has
   hard-skipped. Prefer not to re-surface roles already `Applied` on the
   tracker unless the JD is a new posting.

Quality over volume. Target **3–8** keepers per run. Zero is fine.

## Sources

Read `applications/job-sources.md`. Run `npm run scan:dry` from
`/home/box/src/jobmax` before any write. Cap imports, canonicalize URLs,
dedupe against `applications/pipeline.md`, `applications/tracker.md`, and
`applications/scan-history.tsv`.

Hiring Cafe and Zero2sudo are browser-only: capture visible listings with a
direct employer apply URL + observation date. Never scrape undocumented
endpoints or bypass login/CAPTCHA. A blocked source is non-fatal.

After filtering, write keepers to:

- `applications/pipeline.md` (as research leads; do **not** set apply-bot
  claim fields or Tailored-for-apply)
- `applications/research-daily/YYYY-MM-DD.md` — the day’s shortlist for
  outreach (create the folder if needed)

## Daily shortlist file format

```markdown
# Research shortlist YYYY-MM-DD

| # | Company | Role | Term | Why resume-direct | Apply URL | Tracker # |
|---|---------|------|------|-------------------|-----------|-----------|
| 1 | … | … | Summer 2027 | JD asks for agent tooling ↔ Paychex MCP platform | https://… | 123 or new |

## Outreach handoff
For each keeper, Cold Outreach should find: (1) university/SWE/AI recruiter,
(2) hiring manager if public, and/or (3) RIT alumni manager/lead at that company.
Connect on LinkedIn (no-note OK) and/or find a public email. No auto-apply.
```

## Hard rules

- **Research only.** No applications. No pinging Job Apply / Job Apply 2.
- **No spray.** Do not dump dozens of weak matches into the pipeline.
- Log runs to `automation-runs/runs.jsonl`.
- Commit/push only when the shortlist or pipeline actually changed.
- Report to Job Master (preferred) or the candidate: keeper count, one-line fits, path
  to the daily shortlist, blockers. Stay quiet if nothing new.
