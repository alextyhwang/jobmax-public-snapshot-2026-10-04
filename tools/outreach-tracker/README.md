# JobMax email tracker

Footer-free tracking for reviewed, single-recipient Gmail drafts. Gmail sends
the email; this tool only prepares a pixel and records observed events. The
local dashboard reads `outreach/packages/*.json` and applies the agreed
[outreach policy](../../agents/tracked-recruiter-outreach.md).

## Components

- `server.mjs`: localhost-only dashboard/API. Keeps recruiter records, drafts,
  credentials, and message-to-person mapping on this computer.
- `extension/`: unpacked Chrome MV3 extension. Adds a pixel only after the user
  clicks its action and the Gmail recipient, subject, and body match a package.
- `worker.mjs`: Cloudflare Worker plus D1. Public route serves a transparent GIF;
  authenticated admin routes register opaque IDs and read events. No PII is
  intentionally stored in D1. No remote dashboard or outbound email capability.
- `policy.mjs`: New York business-day rules and stop conditions.

## Local dashboard

From the repository root, run `npm run outreach:serve`, then open
<http://127.0.0.1:4318/>. It works for reviewing packages before deployment.
Runtime data lives in ignored `.local/outreach-tracker/`; preserve this directory
when updating code. Back up its JSON files privately. It includes secrets.
The extension currently uses port 4318; keep that default.

For an attended session use the foreground command. To run in the background on
Windows, start Node with `Start-Process -WindowStyle Hidden` and redirect logs
into `.local/outreach-tracker/`. It does not need to run while a recipient opens
the email: the hosted collector continues receiving events. It must run while
preparing Gmail drafts, classifying local previews, or viewing the dashboard.

## Public deployment

Use the existing Cloudflare account on Workers Free. The verified current
[Workers free limits](https://developers.cloudflare.com/workers/platform/limits/)
include 100,000 requests/day. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
includes free allowances; hitting a limit causes failed operations, not reliable
zero-open evidence. This tool does not upgrade the account.

The repository's Node 22.3 can run the dashboard. Current Wrangler needs a newer
Node: these commands use an isolated Node 22.22 without changing the global Node.
Run from `tools/outreach-tracker/`:

```powershell
npx --yes --package=node@22.22.0 --package=wrangler@4.135.0 wrangler login --scopes account:read user:read workers:write workers_scripts:write d1:write
npx --yes --package=node@22.22.0 --package=wrangler@4.135.0 wrangler d1 create jobmax-outreach-tracker
```

Authenticate with your own account. Put the returned database ID in
`wrangler.jsonc` (an ID is not a secret), then apply the schema and deploy:

```powershell
npx --yes --package=node@22.22.0 --package=wrangler@4.135.0 wrangler d1 execute jobmax-outreach-tracker --remote --file schema.sql
npx --yes --package=node@22.22.0 --package=wrangler@4.135.0 wrangler deploy
```

Generate a 32-byte random secret as 64 hex characters, keep it in the local
password store/config, and pass it via standard input to:

```powershell
npx --yes --package=node@22.22.0 --package=wrangler@4.135.0 wrangler secret put ADMIN_TOKEN
```

Never commit the secret or paste it into the Gmail extension. Enter the deployed
`https://…workers.dev` origin and that secret in the dashboard settings. Admin
routes reject short/missing secrets. The initial deployment remains unusable
for preparation until the secret is set.

The one-minute cron records collector health. Wait for its first successful
heartbeat before testing. New cron triggers can take
[up to 15 minutes to propagate](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
A gap over 150 seconds is retained and makes affected
messages ineligible for no-open follow-ups, even after recovery. This is sampled
health, not proof of uninterrupted delivery: brief outages between samples can
still escape observation.

## Load and pair the extension

1. In Chrome's extension management UI, enable Developer mode, choose Load
   unpacked, and select this directory's `extension` folder.
2. In the local dashboard, click **Copy extension pairing code**. Paste it into
   the extension's options page. This is a separate local secret; it grants no
   direct Cloudflare access.
3. Refresh Gmail after installing/reloading the extension.
4. Resolve factual `sendBlockers` in the package JSON only when fresh evidence
   supports it; approval of the workflow itself does not clear those blockers.
5. Open one new compose window. Paste the package's one recipient, subject and
   body. Additional signatures, CC/BCC, multiple drafts and reply composers are
   rejected in this first version. Commit the address chip before tracking.
6. Click the extension and **Add tracking image**. It never clicks Send.
7. After the exact draft is approved, send it yourself. Immediately record
   **email sent** in the dashboard using the actual timestamp. Until that
   confirmation, the dashboard reports no opens. The extension arms collection
   after inserting the image and before you send; requests before the recorded
   actual send time are excluded. Sending before arming creates an unobserved
   interval and is marked uncertain. If arming fails, leave the draft unsent and
   retry after resolving the collector connection.

## Required controlled-message smoke test

A due follow-up uses its own tracking ID. Open a new compose with the original
subject prefixed by `Re: ` and the package's follow-up text. The popup offers
that package only when the initial email is eligible. Record **follow-up sent**
after actual sending. This version does not edit Gmail's inline reply composer;
the matching subject does not guarantee Gmail will thread the new message.

No recruiter messages should be sent until this passes. A controlled email to
an address the candidate owns still needs his exact-recipient send approval.

- Create a separate test package with an owned recipient and exact subject/body.
- Confirm the inserted pixel exists in the draft, then send after approval and
  record the actual sent time promptly.
- Confirm the received email has no footer and retains the HTTPS tracking image.
- With images enabled, open it in a separate recipient browser/profile. Refresh
  the dashboard and verify a reported open stops follow-ups.
- Verify draft previews and HEAD checks do not create reported opens. Open the
  sent copy with the extension active: an identifiable proxy preview should be
  classified uncertain rather than used to justify a follow-up.
- Record a reply/bounce in the dashboard and verify the sequence stops.

The backend tests and Worker dry-run are not substitutes for this Gmail test.
Gmail's changing DOM and image rewriting must be checked in the connected profile.

## Open interpretation and sender previews

Opens mean image requests, not proven reading. Recipient-side proxies,
prefetching and blocked images retain their usual limitations. Direct tracking
image requests from the sender's Gmail tab are blocked by an extension rule.
Unarmed draft/test requests are ignored; armed pre-send requests are excluded
using the actual sent timestamp. The extension
recognizes its own IDs in visible sent-message images and quarantines events
within 15 seconds of that preview; ambiguous messages cannot qualify for a
no-open follow-up. A real recipient open in the same interval can be quarantined
too. Other devices, disabled extensions, opaque proxy rewrites, or an offline
local server may prevent self-preview identification. Do not claim complete
self-open exclusion. Use the dashboard instead of repeatedly opening Sent mail.

The dashboard requires manually recorded replies, declines and bounces. It does
not read your inbox. Before acting on a due follow-up, check both Gmail and
LinkedIn for a response and refresh tracking. A dashboard event button records
an observation; it does not send a message or grant permission to send one.

## Validation

```powershell
npm run outreach:test
npm test
npm run tracker:check
npm run outreach:check
node tools/outreach-tracker/smoke.mjs
```

The tracker suite uses Node's test runner and Python 3's SQLite to exercise the
actual D1 statements (the repository's Node version predates `node:sqlite`).
Set `JOBMAX_TEST_PYTHON` to an alternative Python executable if necessary.
The server needs only Node; Python is a test dependency, not a runtime service.
The smoke command checks the deployed collector using a synthetic opaque ID;
it sends no email. It retains that test ID and writes evidence to the ignored
`.local/outreach-tracker/live-smoke.json` file. It requires a healthy heartbeat.

Build verification, from this directory:

```powershell
npx --yes --package=node@22.22.0 --package=wrangler@4.135.0 wrangler deploy --dry-run --outdir ../../.local/outreach-tracker/worker-build
```

## Recovery

Keep the public hostname and message IDs stable. Local-server downtime does not
stop the remote collector. Collector failures, stale cron health and quota errors
produce unknown tracking coverage. Restarting or reconfiguring a collector must
not reset those gaps to healthy. Preserve D1 and local message mappings. Do not
delete/recreate D1 to clear an unknown status.
