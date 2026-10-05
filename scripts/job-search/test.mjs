import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  applicationReadiness,
  buildApplicationQueue,
  buildLocationFilter,
  buildTitleFilter,
  canonicalizeJobUrl,
  computeFollowups,
  computeOutreachFollowups,
  detectReposts,
  extractUrls,
  locationPreferenceRank,
  normalizeStatus,
  parseJobSourcesMarkdown,
  parseSimplifyGithubRows,
  parsePortalsYaml,
  parseOutreachContacts,
  parseScanHistory,
  parseTracker,
  rolesSimilar,
  scoreRole,
  validateOutreachContacts,
  validateTracker,
  validateQueueState,
} from './lib/core.mjs';

const sources = parseJobSourcesMarkdown(`| Source | URL | Method | Feed | Enabled |\n|---|---|---|---|---|\n| Hiring Cafe | https://hiringcafe.com/jobs | browser_ui |  | yes |\n| Simplify Jobs | https://simplify.jobs/ | github_markdown | https://raw.example/list.md | yes |`);
assert.equal(sources.length, 2);
assert.equal(sources[0].method, 'browser_ui');
assert.equal(sources[1].enabled, true);

const simplify = parseSimplifyGithubRows(`## 💻 Software Engineering Internship Roles\n<table><tr><td><a>Acme</a></td><td>Software Engineer Intern</td><td>San Francisco<br>Remote</td><td><a href="https://simplify.jobs/p/abc">Simplify</a> <a href="https://jobs.acme.example/apply"><img alt="Apply" src="x"></a></td><td>1d</td></tr></table>`);
assert.equal(simplify.length, 1);
assert.equal(simplify[0].company, 'Acme');
assert.equal(simplify[0].url, 'https://jobs.acme.example/apply');
assert.equal(simplify[0].location, 'San Francisco / Remote');
assert.equal(simplify[0].term, 'Summer 2027');
assert.equal(canonicalizeJobUrl('https://example.com/apply?utm_source=Simplify&ref=abc#form'), 'https://example.com/apply');

const yaml = `
title_filter:
  positive:
    - "software engineer intern"
    - "AI"
    - "agent"
  negative:
    - "senior"
location_filter:
  allow:
    - "United States"
    - "Remote"
  block:
    - "India"
tracked_companies:
  - name: OpenAI
    careers_url: https://job-boards.greenhouse.io/openai
    enabled: true
  - name: Example
    careers_url: https://example.com
    enabled: false
`;

const config = parsePortalsYaml(yaml);
assert.equal(config.title_filter.positive.length, 3);
assert.equal(config.tracked_companies.length, 2);
assert.equal(config.tracked_companies[0].enabled, true);
assert.equal(config.tracked_companies[1].enabled, false);

const titleFilter = buildTitleFilter(config.title_filter);
assert.equal(titleFilter('Software Engineer Intern, AI Platform'), true);
assert.equal(titleFilter('Senior Software Engineer Intern'), false);
assert.equal(titleFilter('Product Marketing Director, AI'), false);
assert.equal(titleFilter('Software Engineer, Agent Platform'), false);
assert.equal(titleFilter('Software Engineering Intern, Agent Platform'), true);
assert.equal(titleFilter('Frontend Software Engineer'), false);
assert.equal(titleFilter('Product Designer'), false);

const locationFilter = buildLocationFilter(config.location_filter);
assert.equal(locationFilter('Remote - United States'), true);
assert.equal(locationFilter('Remote - United Kingdom'), false);
assert.equal(locationFilter('Remote'), true);
assert.equal(locationFilter('Bengaluru, India'), false);
assert.equal(locationFilter(''), true);

assert.equal(locationPreferenceRank('San Francisco, CA'), 5);
assert.equal(locationPreferenceRank('Fremont, California'), 5);
assert.equal(locationPreferenceRank('Los Angeles, CA'), 4);
assert.equal(locationPreferenceRank('Portland, OR'), 3);
assert.equal(locationPreferenceRank('West Coast'), 3);
assert.equal(locationPreferenceRank('New York, NY'), 2);
assert.equal(locationPreferenceRank('Remote'), 1);
assert.equal(locationPreferenceRank('Washington, District of Columbia'), 0);

const comparableRole = { company: 'Example', role: 'Software Engineering Intern', location: '' };
const locationScores = [
  'San Francisco, CA',
  'Los Angeles, CA',
  'Seattle, WA',
  'New York, NY',
  'Remote',
].map((location) => scoreRole({ ...comparableRole, location }, ''));
assert.deepEqual([...locationScores].sort((a, b) => b - a), locationScores);
assert.equal(new Set(locationScores).size, locationScores.length);

assert.equal(normalizeStatus('applied'), 'Applied');
assert.equal(normalizeStatus('Followup Due'), 'Follow-up due');
assert.equal(normalizeStatus('nope'), null);

const tracker = `# Application Tracker

| # | Date | Company | Role | Term | Location | Source URL | Score | Status | Resume | Report | Outreach | Next Action | Notes |
|---|------|---------|------|------|----------|------------|-------|--------|--------|--------|----------|-------------|-------|
| 1 | 2026-07-01 | OpenAI | Software Engineer Intern | Spring 2027 | SF | https://example.com/a | 4.2/5 | Applied | [resume](../resumes/roles/x/resume.tex) | [report](../applications/reports/x.md) | - | Follow up | Applied 2026-07-01 |
`;

assert.equal(parseTracker(tracker).length, 1);
assert.deepEqual(validateTracker(tracker).issues, []);

const applyTracker = tracker.replace('| Applied |', '| Tailored |');
assert.equal(applicationReadiness(parseTracker(applyTracker)[0]).state, 'ready');
assert.equal(buildApplicationQueue(applyTracker, { readyOnly: true })[0]['#'], '1');
const evaluatedTracker = applyTracker.replace('| Tailored |', '| Evaluated |');
assert.deepEqual(buildApplicationQueue(evaluatedTracker)[0].blockers, ['resume not tailored']);
assert.equal(buildApplicationQueue(tracker).length, 0);

const badTracker = tracker + '| 1 | bad | OpenAI | Role | TBD | TBD | https://example.com/a | - | Weird | - | - | - | - | - |\n';
assert.ok(validateTracker(badTracker).issues.length >= 3);

assert.deepEqual(extractUrls('A https://example.com/a. B https://example.com/b)'), ['https://example.com/a', 'https://example.com/b']);

const history = parseScanHistory(`url\tfirst_seen\tportal\ttitle\tcompany\tstatus\tlocation
https://a\t2026-07-01\tgreenhouse\tSoftware Engineer Intern\tOpenAI\tadded\tSF
https://b\t2026-08-01\tgreenhouse\tAI Software Engineering Intern\tOpenAI\tadded\tSF
https://c\t2026-08-01\tgreenhouse\tProduct Designer\tOpenAI\tadded\tSF
`);
assert.equal(history.length, 3);
assert.equal(rolesSimilar('Software Engineer Intern', 'AI Software Engineering Intern'), true);
assert.equal(detectReposts(history).length, 1);

const followups = computeFollowups(tracker, '# Follow-up History\n\n| # | App# | Date | Company | Role | Channel | Contact | Notes |\n|---|------|------|---------|------|---------|---------|-------|\n', {
  now: new Date('2026-07-09T00:00:00Z'),
});
assert.equal(followups[0].urgency, 'due');

const outreach = `# Example Outreach

## Contact CRM

| Name | Role | Team | Source URL | Email | LinkedIn | Status | Last Touch | Next Action | Priority | Notes | Relationship History |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Taylor Recruiter | Recruiter | Early career | https://example.com | - | https://linkedin.com/in/taylor | Contacted | 2026-07-01 | Follow up around 2026-07-08 | High | - | Invite sent |
| Morgan Engineer | Engineer | AI | https://example.com/2 | - | https://linkedin.com/in/morgan | Ready | TBD | Send a short note | Medium | - | - |

## Message Log
`;
const outreachContacts = parseOutreachContacts(outreach, { company: 'Example', file: 'outreach/example.md' });
assert.equal(outreachContacts.length, 2);
assert.deepEqual(validateOutreachContacts(outreachContacts), []);
const outreachDue = computeOutreachFollowups(outreachContacts, { now: new Date('2026-07-13T00:00:00Z') });
assert.equal(outreachDue.length, 1);
assert.equal(outreachDue[0].DaysOverdue, 5);
assert.deepEqual(computeOutreachFollowups(outreachContacts.map(contact => ({
  ...contact, Status: 'Follow-up due', 'Next Action': '[tracked-email] Use the tracked outreach dashboard',
})), { now: new Date('2026-09-20T00:00:00Z') }), []);

assert.ok(scoreRole({ company: 'Example', role: 'Software Engineering Intern, AI Platform', location: 'United States' }, 'Build agent tooling with Python, TypeScript, APIs, and cloud systems.') >= 3.5);
assert.ok(scoreRole({ company: 'Example', role: 'Senior AI Engineer', location: 'United States' }, 'AI platform') < 2.5);

// Queue regressions: preparation, ownership, occupied URLs, and explicit retry evidence.
assert.equal(normalizeStatus('Applying'), 'Applying');
assert.deepEqual(validateTracker(tracker.replace('| Applied |', '| Applying |')).issues, []);
const missingPdfQueue = buildApplicationQueue(applyTracker, { root: '/jobmax-test-no-artifacts', eligibleOnly: true });
assert.equal(missingPdfQueue[0].state, 'prepare');
assert.ok(missingPdfQueue[0].blockers.includes('role-specific resume PDF missing'));
assert.equal(buildApplicationQueue(applyTracker, { root: '/jobmax-test-no-artifacts', readyOnly: true }).length, 0);
assert.equal(buildApplicationQueue(evaluatedTracker, { eligibleOnly: true }).length, 1);
assert.equal(buildApplicationQueue(applyTracker.replace('| Tailored |', '| Queued |'), { eligibleOnly: true }).length, 0);
assert.equal(buildApplicationQueue(applyTracker, { bot: 'job-apply-2', eligibleOnly: true }).length, 0);
assert.equal(buildApplicationQueue(applyTracker, { bot: 'job-apply', eligibleOnly: true }).length, 1);
assert.throws(() => buildApplicationQueue(applyTracker, { bot: 'typo' }), /Unknown bot/);
const override = { version: 1, roles: { '1': { owner: 'job-apply-2', owner_reason: 'Explicit test authorization' } } };
assert.equal(buildApplicationQueue(applyTracker, { bot: 'job-apply-2', queueState: override })[0].owner, 'job-apply-2');
assert.equal(buildApplicationQueue(applyTracker, { bot: 'job-apply', queueState: override }).length, 0);
const blocker = { category: 'authentication', bot: 'job-apply', detail: 'Gmail signed out in this bot session', last_attempt_at: '2026-09-08T12:00:00Z', retry_when: 'This bot visibly confirms Gmail is signed in' };
const state = { version: 1, roles: { '1': { blockers: [blocker] } } };
assert.deepEqual(validateQueueState(state, parseTracker(applyTracker)), []);
assert.equal(buildApplicationQueue(applyTracker, { eligibleOnly: true, queueState: state }).length, 0);
assert.equal(buildApplicationQueue(applyTracker, { readyOnly: true, queueState: state }).length, 0);
assert.equal(buildApplicationQueue(applyTracker, { queueState: state })[0].retry[0].detail, blocker.detail);
const blockedTracker = applyTracker.replace('| Tailored |', '| Blocked |');
assert.equal(buildApplicationQueue(blockedTracker, { eligibleOnly: true }).length, 0);
blocker.resolved_at = '2026-09-08T13:00:00Z';
assert.throws(() => buildApplicationQueue(blockedTracker, { queueState: state }), /resolution requires evidence/);
blocker.resolution = 'Bot confirmed inbox visible in its Chrome session';
assert.equal(buildApplicationQueue(blockedTracker, { eligibleOnly: true, queueState: state })[0].state, 'prepare');
assert.equal(buildApplicationQueue(applyTracker.replace('| Tailored |', '| Applying |'), { eligibleOnly: true, queueState: state }).length, 0);
state.roles['1'].blockers.push({ ...blocker, category: 'attestation', resolved_at: undefined, resolution: undefined });
assert.equal(buildApplicationQueue(blockedTracker, { eligibleOnly: true, queueState: state }).length, 0);
assert.ok(validateQueueState({ version: 1, roles: { '999': {} } }, parseTracker(applyTracker)).length);
assert.ok(validateQueueState({ version: 1, roles: { '1': { blokers: [] } } }, parseTracker(applyTracker)).length);
assert.ok(validateQueueState({ version: 1, roles: { '1': { owner: 'job-apply-2' } } }, parseTracker(applyTracker)).length);
const rowLine = tracker.split('\n').find((line) => line.startsWith('| 1 |'));
const duplicateTracker = applyTracker + rowLine.replace('| 1 |', '| 2 |').replace('https://example.com/a', 'https://example.com/a?utm_source=test') + '\n';
assert.equal(buildApplicationQueue(duplicateTracker, { eligibleOnly: true }).length, 0);
assert.equal(buildApplicationQueue(duplicateTracker.replace(/\| Applied \|/g, '| Applying |'), { eligibleOnly: true }).length, 0);
assert.equal(buildApplicationQueue(applyTracker.replace('| OpenAI |', '| Disney |'), { eligibleOnly: true }).length, 0);
const evenTracker = applyTracker + rowLine.replace('| 1 |', '| 2 |').replace('| Applied |', '| Evaluated |').replace('https://example.com/a', 'https://example.com/b') + '\n';
assert.deepEqual(buildApplicationQueue(evenTracker, { bot: 'job-apply-2', eligibleOnly: true }).map((row) => row['#']), ['2']);
assert.equal(buildApplicationQueue(evenTracker, { eligibleOnly: true, limit: 1 }).length, 1);
assert.equal(buildApplicationQueue(evenTracker, { eligibleOnly: true, id: '2' })[0]['#'], '2');
const dateOnlyState = { version: 1, roles: { '1': { blockers: [{ ...blocker, last_attempt_at: '2026-09-08' }] } } };
assert.deepEqual(validateQueueState(dateOnlyState, parseTracker(applyTracker)), []);
dateOnlyState.roles['1'].blockers[0].last_attempt_at = '2026-02-30';
assert.ok(validateQueueState(dateOnlyState, parseTracker(applyTracker)).length);
// CLI option errors must not silently broaden a bot's queue.
const cliPath = fileURLToPath(new URL('./cli.mjs', import.meta.url));
for (const args of [['--bot'], ['--bot', 'unknown'], ['--eligible-onyl'], ['--limit', 'NaN'], ['--limit', '-1']]) {
  const result = spawnSync(process.execPath, [cliPath, 'apply:queue', ...args], { encoding: 'utf8' });
  assert.equal(result.status, 1, args.join(' '));
}
const compact = spawnSync(process.execPath, [cliPath, 'apply:queue', '--bot', 'job-apply-2', '--eligible-only', '--limit', '3', '--json'], { encoding: 'utf8' });
assert.equal(compact.status, 0, compact.stderr);
const candidates = JSON.parse(compact.stdout);
assert.ok(candidates.length <= 3);
assert.ok(candidates.every((row) => row.owner === 'job-apply-2' && row.eligible));
console.log('job-search tests passed');
