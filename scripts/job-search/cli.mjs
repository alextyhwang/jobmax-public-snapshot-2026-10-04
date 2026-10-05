#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import {
  applicationFunnel,
  buildApplicationQueue,
  checkUrlLiveness,
  computeFollowups,
  computeOutreachFollowups,
  detectReposts,
  extractUrls,
  formatTable,
  parseOutreachContacts,
  parsePipeline,
  parseScanHistory,
  parseTracker,
  runBatch,
  scanPortals,
  todayIso,
  validateOutreachContacts,
  validateTracker,
  validateQueueState,
} from './lib/core.mjs';

const root = process.cwd();
const [command = 'help', ...args] = process.argv.slice(2);

function logRun(record) {
  mkdirSync(join(root, 'automation-runs'), { recursive: true });
  appendFileSync(join(root, 'automation-runs', 'runs.jsonl'), `${JSON.stringify(record)}\n`);
}

function has(flag) {
  return args.includes(flag);
}

function valueAfter(flag, fallback = null) {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
}

function loadOutreachContacts() {
  const dir = join(root, 'outreach');
  return readdirSync(dir).filter((file) => file.endsWith('.md') && !['README.md', 'company-template.md'].includes(file)).flatMap((file) => {
    const company = basename(file, '.md').split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    return parseOutreachContacts(readFileSync(join(dir, file), 'utf8'), { company, file: `outreach/${file}` });
  }).filter((contact) => contact.Name && contact.Name !== 'TBD');
}

function loadQueueState() {
  const path = join(root, 'applications', 'queue-state.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { version: 1, roles: {} };
}

async function main() {
  if (command === 'scan') {
    const startedAt = new Date();
    let result;
    try {
      result = await scanPortals(root, { dryRun: has('--dry-run') });
    } catch (error) {
      const endedAt = new Date();
      logRun({ run_id: `${startedAt.toISOString()}-job-discovery`, workflow: 'job-discovery', stage: 'discovery', agent: 'cli', model: 'unknown', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), duration_seconds: Math.round((endedAt - startedAt) / 1000), input_tokens: null, output_tokens: null, total_tokens: null, status: 'failed', source_counts: {}, artifacts: [], blocker: error.message, notes: has('--dry-run') ? 'dry-run' : 'write' });
      throw error;
    }
    const endedAt = new Date();
    const sourceCounts = {};
    for (const item of [...result.found, ...result.skipped]) {
      const source = item.source || item.portal || 'legacy';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }
    logRun({ run_id: `${startedAt.toISOString()}-job-discovery`, workflow: 'job-discovery', stage: 'discovery', agent: 'cli', model: 'unknown', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), duration_seconds: Math.round((endedAt - startedAt) / 1000), input_tokens: null, output_tokens: null, total_tokens: null, status: 'completed', source_counts: sourceCounts, artifacts: has('--dry-run') ? [] : ['applications/pipeline.md', 'applications/scan-history.tsv'], blocker: null, notes: has('--dry-run') ? 'dry-run' : 'write' });
    console.log(`Found ${result.found.length} new matching roles.`);
    if (result.found.length) {
      console.log(formatTable(result.found.map((job) => ({
        Company: job.company,
        Role: job.title,
        Location: job.location || 'TBD',
        URL: job.url,
      })), ['Company', 'Role', 'Location', 'URL']));
    }
    if (has('--show-skipped')) console.log(JSON.stringify(result.skipped, null, 2));
    return;
  }

  if (command === 'liveness') {
    const file = valueAfter('--file');
    const urls = args.filter((arg) => /^https?:\/\//.test(arg));
    if (file) urls.push(...extractUrls(readFileSync(join(root, file), 'utf8')));
    if (urls.length === 0) {
      urls.push(...parsePipeline(readFileSync(join(root, 'applications/pipeline.md'), 'utf8')).filter((item) => !item.done).map((item) => item.url));
      if (!has('--pipeline-only')) {
        const tracker = parseTracker(readFileSync(join(root, 'applications/tracker.md'), 'utf8'));
        urls.push(...tracker.filter((item) => !['Rejected', 'Closed', 'Skip'].includes(item.Status)).map((item) => item['Source URL']).filter(Boolean));
      }
    }
    const results = [];
    for (const url of [...new Set(urls)]) results.push(await checkUrlLiveness(url));
    console.log(formatTable(results.map((item) => ({
      Active: item.active ? 'yes' : 'no',
      Status: item.status,
      Reason: item.reason,
      URL: item.url,
    })), ['Active', 'Status', 'Reason', 'URL']));
    return;
  }

  if (command === 'tracker:check') {
    const trackerPath = join(root, 'applications/tracker.md');
    const result = validateTracker(readFileSync(trackerPath, 'utf8'));
    result.issues.push(...validateQueueState(loadQueueState(), result.rows));
    if (result.issues.length === 0) {
      console.log(`Tracker OK (${result.rows.length} rows).`);
      return;
    }
    console.error(result.issues.map((issue) => `- ${issue}`).join('\n'));
    process.exitCode = 1;
    return;
  }

  if (command === 'followups') {
    const tracker = readFileSync(join(root, 'applications/tracker.md'), 'utf8');
    const followupsPath = join(root, 'applications/follow-ups.md');
    const followups = existsSync(followupsPath) ? readFileSync(followupsPath, 'utf8') : '';
    const rows = computeFollowups(tracker, followups);
    console.log(formatTable(rows.map((row) => ({
      '#': row.id,
      Company: row.company,
      Role: row.role,
      Status: row.status,
      Urgency: row.urgency,
      Next: row.nextDate,
    })), ['#', 'Company', 'Role', 'Status', 'Urgency', 'Next']));
    return;
  }

  if (command === 'apply:queue') {
    const switches = new Set(['--ready-only', '--eligible-only', '--json']);
    const values = new Set(['--bot', '--id', '--limit']);
    for (let i = 0; i < args.length; i++) {
      if (switches.has(args[i])) continue;
      if (!values.has(args[i])) throw new Error(`Unknown queue option: ${args[i]}`);
      const flag = args[i];
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
      if (flag !== '--bot' && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) throw new Error(`${flag} must be a nonnegative integer`);
    }
    const tracker = readFileSync(join(root, 'applications/tracker.md'), 'utf8');
    const rows = buildApplicationQueue(tracker, {
      root,
      id: valueAfter('--id'),
      readyOnly: has('--ready-only'),
      eligibleOnly: has('--eligible-only'),
      bot: valueAfter('--bot'),
      queueState: loadQueueState(),
      limit: Number(valueAfter('--limit', '25')),
    });
    if (has('--json')) {
      console.log(JSON.stringify(rows.map((row) => ({
        id: row['#'], company: row.Company, role: row.Role, owner: row.owner,
        status: row.Status, state: row.state, eligible: row.eligible,
        url: row['Source URL'], resume_pdf: row.resumePdf, report: row.Report,
        blockers: row.blockers, retry: row.retry,
      })), null, 2));
      return;
    }
    console.log(formatTable(rows.map((row) => ({
      '#': row['#'],
      Company: row.Company,
      Role: row.Role,
      Score: row.Score,
      State: row.state,
      Owner: row.owner,
      Blockers: row.blockers.join('; ') || '-',
      URL: row['Source URL'],
    })), ['#', 'Company', 'Role', 'Score', 'State', 'Owner', 'Blockers', 'URL']));
    return;
  }

  if (command === 'outreach:check') {
    const contacts = loadOutreachContacts();
    const issues = validateOutreachContacts(contacts);
    const due = computeOutreachFollowups(contacts);
    console.log(`Outreach CRM: ${contacts.length} contacts; ${due.length} follow-ups due.`);
    if (issues.length === 0) {
      console.log('Outreach schema OK.');
      return;
    }
    console.error(issues.map((issue) => `- ${issue}`).join('\n'));
    process.exitCode = 1;
    return;
  }

  if (command === 'outreach:followups') {
    const limit = Number(valueAfter('--limit', '25'));
    const due = computeOutreachFollowups(loadOutreachContacts()).slice(0, limit);
    console.log(formatTable(due.map((item) => ({
      Company: item.Company,
      Name: item.Name,
      Priority: item.Priority || 'TBD',
      Due: item.NextDate,
      Overdue: `${item.DaysOverdue}d`,
      Action: item['Next Action'] || 'Follow up',
    })), ['Company', 'Name', 'Priority', 'Due', 'Overdue', 'Action']));
    return;
  }

  if (command === 'funnel') {
    const funnel = applicationFunnel(readFileSync(join(root, 'applications/tracker.md'), 'utf8'));
    const rows = Object.entries(funnel.counts).filter(([, count]) => count > 0).map(([Status, Count]) => ({ Status, Count }));
    console.log(`Applications: ${funnel.total} total; ${funnel.active} active.`);
    console.log(formatTable(rows, ['Status', 'Count']));
    return;
  }

  if (command === 'weekly') {
    const trackerText = readFileSync(join(root, 'applications/tracker.md'), 'utf8');
    const followupsPath = join(root, 'applications/follow-ups.md');
    const funnel = applicationFunnel(trackerText);
    const appDue = computeFollowups(trackerText, existsSync(followupsPath) ? readFileSync(followupsPath, 'utf8') : '');
    const contacts = loadOutreachContacts();
    const outreachDue = computeOutreachFollowups(contacts);
    const ready = contacts.filter((contact) => contact.Status === 'Ready').length;
    const date = todayIso();
    const report = `# JobMax Weekly Review - ${date}\n\n## Funnel\n\n- Applications tracked: ${funnel.total}\n- Active applications: ${funnel.active}\n- Applied: ${funnel.counts.Applied}\n- Interviews: ${funnel.counts.Interview}\n- Offers: ${funnel.counts.Offer}\n- Application follow-ups due: ${appDue.filter((item) => item.urgency === 'due').length}\n- Outreach follow-ups due: ${outreachDue.length}\n- Outreach contacts ready: ${ready}\n\n## Highest-Leverage Actions\n\n1. Review the oldest high-priority outreach follow-ups.\n2. Move viable evaluated roles to a concrete apply or skip decision.\n3. Confirm every strong application has both a tailored resume and an outreach path.\n4. Add new proof or outcomes from the week to the evidence vault.\n5. Choose one measurable conversion goal for the next seven days.\n`;
    if (has('--write')) {
      const dir = join(root, 'reviews');
      mkdirSync(dir, { recursive: true });
      const output = join(dir, `${date}.md`);
      writeFileSync(output, report);
      console.log(`Wrote ${output}`);
    } else {
      console.log(report);
    }
    return;
  }

  if (command === 'batch') {
    const threshold = Number(valueAfter('--threshold', '3.5'));
    const limit = Number(valueAfter('--limit', '10'));
    const completed = await runBatch(root, { threshold, limit });
    console.log(`Prepared ${completed.length} pipeline entries.`);
    if (completed.length) {
      console.log(formatTable(completed.map((item) => ({
        Company: item.company,
        Role: item.role,
        Score: `${item.score}/5`,
        Status: item.status,
        Report: item.report,
      })), ['Company', 'Role', 'Score', 'Status', 'Report']));
    }
    return;
  }

  if (command === 'reposts') {
    const rows = parseScanHistory(readFileSync(join(root, 'applications/scan-history.tsv'), 'utf8'));
    const reposts = detectReposts(rows);
    console.log(JSON.stringify(reposts, null, 2));
    return;
  }

  console.log(`JobMax career ops commands:
  npm run scan
  npm run scan:dry
  npm run liveness
  npm run tracker:check
  npm run apply:queue -- --bot job-apply --eligible-only --limit 3 --json
  npm run apply:queue -- --ready-only
  npm run followups
  npm run outreach:check
  npm run outreach:followups
  npm run funnel
  npm run weekly
  npm run batch

Direct:
  node scripts/job-search/cli.mjs reposts`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
