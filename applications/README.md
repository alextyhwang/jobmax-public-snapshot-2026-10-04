# Applications

This folder is the JobMax application workflow. It keeps job discovery, application status, follow-ups, and evaluation artifacts close to the existing resume, outreach, profile, and project evidence.

## Files

| Path | Purpose |
|---|---|
| `pipeline.md` | Pending job URLs discovered by scans or pasted manually |
| `tracker.md` | Canonical application tracker |
| `scan-history.tsv` | URL dedupe and repost history |
| `follow-ups.md` | Follow-up history after applications are submitted |
| `../profile/application-answers.md` | Explicit authority for controlled or reusable form answers |
| `portals.yml` | Internship-focused scanner configuration |
| `reports/` | Evaluation reports created by batch/evaluation workflows |

## Commands

```bash
npm run scan
npm run scan:dry
npm run liveness
npm run tracker:check
npm run apply:queue
npm run followups
npm run outreach:check
npm run outreach:followups
npm run funnel
npm run weekly
npm run batch
```

Batch mode prepares reports, tracker rows, resume variant folders, and drafts for review. It never submits applications or sends messages.

`npm run apply:queue -- --bot job-apply --eligible-only --limit 3 --json`
returns compact odd-bot candidates; use `job-apply-2` for the even bot.
`prepare` roles may still need a PDF; `--ready-only` retains artifact filtering.
`--id <tracker-id>` narrows inspection. Queue selection is read-only and does
not replace claiming or visible submission verification.

Follow [the queue and retry protocol](../agents/application-queue.md) for
ownership, claims, and `queue-state.json` blocker metadata. The tracker columns
remain unchanged; Applying is a supported active-claim status. Run
`npm run tracker:check` to validate both tracker and metadata.

For Simplify-assisted preparation and submission, follow
[the browser workflow](../.agents/skills/jobmax-career-ops/references/browser-apply.md).
