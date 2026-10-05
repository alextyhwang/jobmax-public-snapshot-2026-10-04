# Automation run telemetry

Every discovery, outreach, and application run gets one JSON record in
`automation-runs/runs.jsonl`. Start a record when the run begins and update it
when the run ends. Use ISO 8601 timestamps and measure duration from those
timestamps. Record token counts supplied by the runtime; use `null` when a
runtime does not expose them. Never estimate token usage.

Required fields:

```json
{"run_id":"2026-08-31T22:00:00Z-job-discovery","workflow":"job-discovery","stage":"discovery","agent":"codex","model":"unknown","started_at":"2026-08-31T22:00:00Z","ended_at":"2026-08-31T22:02:10Z","duration_seconds":130,"input_tokens":null,"output_tokens":null,"total_tokens":null,"status":"completed","source_counts":{"Simplify Jobs":12,"Hiring Cafe":0,"Zero2sudo Instagram":0},"artifacts":[],"blocker":null,"notes":"Browser-only sources reported separately."}
```

The example above is schema-only and must not be copied as a real run. Keep
actual records in `runs.jsonl`; one line per execution, including dry runs and
blocked applications. For a blocked role, retain the blocker and continue to
the next role. The next-morning report should link the run ID and the exact
blocked application records.
