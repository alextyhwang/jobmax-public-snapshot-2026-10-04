# Job discovery sources

This is the single source list for the lightweight scanner. The CLI consumes
the `github_markdown` row. `browser_ui` rows are intentionally reported as
pending browser work because these sites do not publish a stable, authorized
job-feed API.

| Source | URL | Method | Feed | Enabled |
|---|---|---|---|---|
| Hiring Cafe | https://hiringcafe.com/jobs | browser_ui |  | yes |
| Simplify Jobs | https://simplify.jobs/ | github_markdown | https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md | yes |
| Zero2sudo Instagram | https://www.instagram.com/zero2sudo/ | browser_ui | https://beacons.ai/zero2sudo | yes |

## Browser capture rules

- Open the visible Hiring Cafe jobs UI in the connected Chrome session. Use
  narrow Spring 2027, Summer 2027, AI, and software-engineering filters, and
  record only listings whose employer application URL is visible.
- Open `@zero2sudo` and inspect the current bio link and visible Stories. Story
  links are ephemeral, so record the observed URL and date immediately. The
  current Beacons page links to the Direct Consideration newsletter and a
  public Notion career-links page. These are secondary resources, not a stable
  jobs API, so verify each destination visibly before importing a role.

Useful destinations currently visible from Beacons include
`https://directconsideration.beehiiv.com/` and
`https://zero2sudo.notion.site/helpful-links`. Treat both as browser/manual
secondary sources because their contents and links can change.
- Do not scrape undocumented endpoints, bypass a login or CAPTCHA, or use a
  third-party Instagram scraper. A blocked browser source is a non-fatal
  `browser_ui_required` result; continue with the other sources.

## Normalization

Keep the direct employer application URL, source name, observed date, title,
location, and term. Deduplicate against `applications/pipeline.md`,
`applications/tracker.md`, and `applications/scan-history.tsv` before writing.
Only Spring 2027, Summer 2027, or roles explicitly spanning both terms are in
scope.
