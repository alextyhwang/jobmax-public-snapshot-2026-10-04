import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { basename, dirname, join, relative } from 'path';

export const STATUS_VALUES = [
  'Discovered',
  'Queued',
  'Evaluated',
  'Tailored',
  'Applying',
  'Applied',
  'Blocked',
  'Follow-up due',
  'Responded',
  'Interview',
  'Offer',
  'Rejected',
  'Closed',
  'Skip',
];

export const TRACKER_COLUMNS = [
  '#',
  'Date',
  'Company',
  'Role',
  'Term',
  'Location',
  'Source URL',
  'Score',
  'Status',
  'Resume',
  'Report',
  'Outreach',
  'Next Action',
  'Notes',
];

export const OUTREACH_STATUS_VALUES = [
  'Researching',
  'Ready',
  'Contacted',
  'Follow-up due',
  'Replied',
  'Chat scheduled',
  'Connected',
  'Referral path',
  'Blocked',
  'Closed',
];

const CLOSED_PATTERNS = [
  /no longer accepting/i,
  /no longer available/i,
  /job has expired/i,
  /position has been filled/i,
  /application closed/i,
  /not found/i,
  /404/i,
];

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function stripComment(line) {
  let inQuote = false;
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && line[i - 1] !== '\\') {
      if (!inQuote) {
        inQuote = true;
        quote = ch;
      } else if (quote === ch) {
        inQuote = false;
      }
    }
    if (ch === '#' && !inQuote) return line.slice(0, i);
  }
  return line;
}

function unquote(value) {
  const v = String(value ?? '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

function sectionLines(text, section) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${section}:\\s*$`).test(stripComment(line).trim()));
  if (start === -1) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const raw = stripComment(lines[i]);
    if (!raw.trim()) continue;
    if (/^\S/.test(raw)) break;
    out.push(raw);
  }
  return out;
}

function listFromSection(text, section, key) {
  const lines = sectionLines(text, section);
  const keyIndex = lines.findIndex((line) => new RegExp(`^\\s{2}${key}:\\s*$`).test(line));
  if (keyIndex === -1) return [];
  const values = [];
  for (let i = keyIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s{2}\S/.test(line) && !/^\s{4}-\s+/.test(line)) break;
    const match = line.match(/^\s{4}-\s+(.+?)\s*$/);
    if (match) values.push(String(unquote(match[1])));
  }
  return values;
}

export function parsePortalsYaml(text) {
  const tracked = [];
  const lines = sectionLines(text, 'tracked_companies');
  let current = null;
  for (const line of lines) {
    const item = line.match(/^\s{2}-\s+name:\s*(.+?)\s*$/);
    if (item) {
      if (current) tracked.push(current);
      current = { name: String(unquote(item[1])) };
      continue;
    }
    const kv = line.match(/^\s{4}([a-zA-Z0-9_]+):\s*(.*?)\s*$/);
    if (kv && current) current[kv[1]] = unquote(kv[2]);
  }
  if (current) tracked.push(current);

  return {
    title_filter: {
      positive: listFromSection(text, 'title_filter', 'positive'),
      negative: listFromSection(text, 'title_filter', 'negative'),
    },
    location_filter: {
      allow: listFromSection(text, 'location_filter', 'allow'),
      block: listFromSection(text, 'location_filter', 'block'),
    },
    tracked_companies: tracked,
  };
}

export function parseJobSourcesMarkdown(text) {
  const rows = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^|]+)\|\s*(https?:\/\/[^|]+)\|\s*([^|]+)\|\s*([^|]*)\|\s*(yes|no)\s*\|\s*$/i);
    if (!match || /^-+$/.test(match[1].trim())) continue;
    rows.push({ name: match[1].trim(), url: match[2].trim(), method: match[3].trim(), feed: match[4].trim(), enabled: match[5].toLowerCase() === 'yes' });
  }
  return rows;
}

function htmlText(value) {
  return String(value || '')
    .replace(/<details[^>]*>|<\/details>|<summary[^>]*>|<\/summary>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&#x2F;|&#47;/g, '/')
    .replace(/\s+/g, ' ').trim()
    .replace(/^\d+\s+locations?\s*/i, '');
}

function cleanLabel(value) {
  return String(value || '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s+[^\p{L}\p{N}]+$/u, '').trim();
}

export function parseSimplifyGithubRows(markdown) {
  const rows = [];
  const sections = String(markdown || '').match(/##[^\n]*(?:Software Engineering|Data Science, AI|Machine Learning)[^\n]*[\s\S]*?(?=\n##\s|$)/gi) || [];
  for (const section of sections) {
    let previousCompany = '';
    for (const row of section.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
      if (cells.length < 5) continue;
      const rawCompany = htmlText(cells[0]);
      const company = cleanLabel(rawCompany.replace(/^↳\s*/, '')) || previousCompany;
      const role = cleanLabel(htmlText(cells[1]));
      const location = htmlText(cells[2]);
      const age = htmlText(cells[4]);
      const apply = [...(cells[3] || '').matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
        .find((match) => /alt=["']Apply["']/i.test(match[2]))?.[1] || '';
      if (!company || !role || !apply) continue;
      previousCompany = company;
      rows.push({ company, title: role, location, url: apply, portal: 'simplify-github', age, term: 'Summer 2027' });
    }
  }
  return rows;
}

export function compileKeyword(keyword) {
  const lower = String(keyword || '').toLowerCase().trim();
  if (!lower) return () => false;
  if (/^[a-z0-9]{2,4}$/.test(lower)) {
    const re = new RegExp(`\\b${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return (value) => re.test(value || '');
  }
  return (value) => String(value || '').toLowerCase().includes(lower);
}

export function buildTitleFilter(titleFilter = {}) {
  const positive = (titleFilter.positive || []).map(compileKeyword);
  const negative = (titleFilter.negative || []).map(compileKeyword);
  return (title) => {
    const value = String(title || '').toLowerCase();
    const hasPositive = positive.length === 0 || positive.some((matcher) => matcher(value));
    const hasNegative = negative.some((matcher) => matcher(value));
    if (!hasPositive || hasNegative) return false;

    const internish = isTargetInternshipTitle(value);
    const targetEngineering = /\b(software|engineer|engineering|ai|ml|llm|agent|platform|full-stack|frontend|backend|developer tools?)\b/i.test(value);
    return internish && targetEngineering;
  };
}

export function isTargetInternshipTitle(title) {
  return /\b(intern|internship|co-?op|coop)\b/i.test(String(title || ''));
}

export function buildLocationFilter(locationFilter = {}) {
  const allowTerms = (locationFilter.allow || []).map((x) => String(x).toLowerCase());
  const block = (locationFilter.block || []).map(compileKeyword);
  const allow = allowTerms.map((term) => ({ term, matcher: compileKeyword(term) }));
  return (location) => {
    const value = String(location || '').toLowerCase();
    if (!value.trim()) return true;
    if (block.some((matcher) => matcher(value))) return false;
    if (allow.length === 0) return true;
    const matches = allow.filter(({ matcher }) => matcher(value));
    if (matches.length === 0) return false;

    // "Remote" alone is acceptable, but "Remote - <non-US geography>" must
    // also contain an explicit allowed US location. This prevents a generic
    // remote token from admitting UK, Europe, Canada, and other regions.
    const onlyRemote = matches.every(({ term }) => term === 'remote');
    if (onlyRemote && !/^remote\s*$/i.test(value)) return false;
    return true;
  };
}

export function locationPreferenceRank(location) {
  const value = String(location || '').trim();
  if (!value) return 0;

  // Keep this order aligned with profile/profile.md. A role with multiple
  // listed locations receives the rank of its highest-priority option.
  const bayArea = /\b(?:san francisco(?: bay area)?|bay area|san jose|oakland|berkeley|palo alto|mountain view|sunnyvale|santa clara|cupertino|redwood city|menlo park|san mateo|south san francisco|daly city|foster city|burlingame|millbrae|fremont|newark|union city|hayward|milpitas|pleasanton|livermore|dublin|san ramon|walnut creek|concord|richmond|emeryville|san rafael|novato|napa|santa rosa|marin county|alameda county|contra costa county|san mateo county|santa clara county)\b/i;
  if (bayArea.test(value)) return 5;

  const california = /\bcalifornia\b|,\s*ca(?:\b|,)|\bca,\s*(?:us|usa|united states)\b/i;
  if (california.test(value)) return 4;

  const washingtonDc = /\b(?:district of columbia|washington,?\s*d\.?c\.?)\b/i;
  const westCoast = /\b(?:west coast|washington state|oregon|seattle|bellevue|redmond|tacoma|spokane|portland|hillsboro|eugene)\b|,\s*(?:wa|or)(?:\b|,)/i;
  if (!washingtonDc.test(value) && westCoast.test(value)) return 3;

  const newYorkCity = /\b(?:new york city|nyc|manhattan|brooklyn|queens|bronx|staten island)\b|\bnew york,\s*ny\b/i;
  if (newYorkCity.test(value)) return 2;

  if (/\bremote\b/i.test(value)) return 1;
  return 0;
}

export function normalizeStatus(raw) {
  const cleaned = String(raw || '').replace(/\*\*/g, '').trim().toLowerCase();
  const aliases = new Map([
    ['discovered', 'Discovered'],
    ['queued', 'Queued'],
    ['evaluated', 'Evaluated'],
    ['tailored', 'Tailored'],
    ['applying', 'Applying'],
    ['applied', 'Applied'],
    ['blocked', 'Blocked'],
    ['follow-up due', 'Follow-up due'],
    ['followup due', 'Follow-up due'],
    ['responded', 'Responded'],
    ['interview', 'Interview'],
    ['offer', 'Offer'],
    ['rejected', 'Rejected'],
    ['closed', 'Closed'],
    ['discarded', 'Closed'],
    ['skip', 'Skip'],
  ]);
  return aliases.get(cleaned) || null;
}

function parseMarkdownTable(content) {
  const rows = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
    if (cells.length < 2) continue;
    if (cells[0] === '#' || /^[-: ]+$/.test(cells.join(''))) continue;
    rows.push(cells);
  }
  return rows;
}

export function parseTracker(content) {
  const rows = parseMarkdownTable(content);
  return rows.map((cells) => {
    const padded = [...cells];
    while (padded.length < TRACKER_COLUMNS.length) padded.push('');
    return Object.fromEntries(TRACKER_COLUMNS.map((column, index) => [column, padded[index] || '']));
  });
}

export function validateTracker(content) {
  const issues = [];
  const header = content.split(/\r?\n/).find((line) => line.trim().startsWith('| # |'));
  if (!header) {
    issues.push('Missing tracker table header.');
  } else {
    const actual = header.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
    if (actual.join('|') !== TRACKER_COLUMNS.join('|')) {
      issues.push(`Tracker columns differ from expected schema: ${TRACKER_COLUMNS.join(', ')}`);
    }
  }

  const rows = parseTracker(content);
  const ids = new Set();
  const urls = new Set();
  for (const row of rows) {
    if (!/^\d+$/.test(row['#'])) issues.push(`Bad application id: ${row['#'] || '(blank)'}`);
    if (ids.has(row['#'])) issues.push(`Duplicate application id: ${row['#']}`);
    ids.add(row['#']);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.Date)) issues.push(`Bad date for #${row['#']}: ${row.Date}`);
    if (!normalizeStatus(row.Status)) issues.push(`Unknown status for #${row['#']}: ${row.Status}`);
    if (row['Source URL'] && urls.has(row['Source URL'])) issues.push(`Duplicate source URL: ${row['Source URL']}`);
    if (row['Source URL']) urls.add(row['Source URL']);
  }
  return { rows, issues };
}

function hasTrackerArtifact(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized !== '' && normalized !== '-' && normalized !== 'tbd';
}

function markdownLinkTarget(value) {
  return String(value || '').match(/\[[^\]]+\]\(([^)]+)\)/)?.[1] || '';
}

export function applicationReadiness(row, { root = null } = {}) {
  const status = normalizeStatus(row.Status);
  const terminal = ['Applying', 'Applied', 'Blocked', 'Follow-up due', 'Responded', 'Interview', 'Offer', 'Rejected', 'Closed', 'Skip'];
  if (!status || terminal.includes(status)) {
    return { state: 'exclude', blockers: [status ? `status is ${status}` : 'unknown status'], resumePdf: '' };
  }

  const blockers = [];
  if (status !== 'Tailored') blockers.push(status === 'Evaluated' ? 'resume not tailored' : 'evaluation not complete');
  if (!/^https?:\/\//i.test(String(row['Source URL'] || '').trim())) blockers.push('source URL missing');
  if (!hasTrackerArtifact(row.Resume)) blockers.push('role-specific resume missing');
  if (!hasTrackerArtifact(row.Report)) blockers.push('evaluation report missing');

  let resumePdf = '';
  const resumeTarget = markdownLinkTarget(row.Resume);
  if (resumeTarget) {
    resumePdf = resumeTarget.replace(/\.tex$/i, '.pdf');
    if (root && !existsSync(join(root, 'applications', resumePdf))) blockers.push('role-specific resume PDF missing');
  } else if (hasTrackerArtifact(row.Resume)) {
    blockers.push('resume link is not a Markdown link');
  }

  return {
    state: blockers.length === 0 ? 'ready' : 'hold',
    blockers,
    resumePdf,
  };
}

export const APPLY_BOTS = ['job-apply', 'job-apply-2'];
export const BLOCKER_CATEGORIES = ['authentication', 'attestation', 'captcha', 'browser', 'platform-review', 'essay', 'missing-answer', 'other'];

// Companion metadata preserves the existing Markdown tracker schema.
export function validateQueueState(state, rows = []) {
  const issues = [];
  const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
  const timestamp = (value) => nonempty(value) && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
  const attemptDate = (value) => timestamp(value) || (nonempty(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
  if (!object(state) || state.version !== 1 || !object(state.roles)) return ['Queue state must have version: 1 and a roles object.'];
  const ids = new Set(rows.map((row) => row['#']));
  for (const [id, entry] of Object.entries(state.roles)) {
    const label = `Queue state #${id}`;
    if (!/^\d+$/.test(id) || !ids.has(id)) issues.push(`${label}: unknown tracker id.`);
    if (!object(entry)) { issues.push(`${label}: expected an object.`); continue; }
    for (const key of Object.keys(entry)) if (!['owner', 'owner_reason', 'blockers'].includes(key)) issues.push(`${label}: unknown field ${key}.`);
    if (entry.owner !== undefined && (!APPLY_BOTS.includes(entry.owner) || !nonempty(entry.owner_reason))) issues.push(`${label}: owner override requires a valid bot and owner_reason.`);
    if (entry.blockers !== undefined && !Array.isArray(entry.blockers)) { issues.push(`${label}: blockers must be an array.`); continue; }
    for (const block of entry.blockers || []) {
      if (!object(block)) { issues.push(`${label}: invalid blocker.`); continue; }
      for (const key of Object.keys(block)) if (!['category', 'detail', 'bot', 'last_attempt_at', 'retry_when', 'resolved_at', 'resolution'].includes(key)) issues.push(`${label}: unknown blocker field ${key}.`);
      if (!BLOCKER_CATEGORIES.includes(block.category) || !APPLY_BOTS.includes(block.bot)
        || !nonempty(block.detail) || !nonempty(block.retry_when) || !attemptDate(block.last_attempt_at)) issues.push(`${label}: blocker requires category, bot, detail, retry_when and ISO last_attempt_at.`);
      if (block.resolved_at !== undefined || block.resolution !== undefined) {
        if (!timestamp(block.resolved_at) || !nonempty(block.resolution) || Date.parse(block.resolved_at) < Date.parse(block.last_attempt_at)) issues.push(`${label}: resolution requires evidence and an ISO resolved_at no earlier than last_attempt_at.`);
      }
    }
  }
  return issues;
}

export function buildApplicationQueue(content, {
  root = null,
  id = null,
  readyOnly = false,
  eligibleOnly = false,
  bot = null,
  queueState = { version: 1, roles: {} },
  limit = 25,
} = {}) {
  if (bot !== null && !APPLY_BOTS.includes(bot)) throw new Error(`Unknown bot: ${bot}`);
  const rows = parseTracker(content);
  const issues = validateQueueState(queueState, rows);
  if (issues.length) throw new Error(issues.join('\n'));
  const priority = { ready: 0, prepare: 1, hold: 2 };
  const score = (row) => Number.parseFloat(String(row.Score || '0')) || 0;
  // A second row must never make an already submitted or claimed URL eligible.
  const occupied = new Set(rows.filter((row) => ['Applying', 'Applied', 'Follow-up due', 'Responded', 'Interview', 'Offer', 'Rejected'].includes(normalizeStatus(row.Status)))
    .map((row) => canonicalizeJobUrl(row['Source URL'])).filter(Boolean));
  return rows
    .filter((row) => id == null || row['#'] === String(id))
    .map((row) => {
      const metadata = queueState.roles[row['#']] || {};
      const owner = metadata.owner || (Number(row['#']) % 2 ? 'job-apply' : 'job-apply-2');
      const status = normalizeStatus(row.Status);
      const history = metadata.blockers || [];
      const pending = history.filter((block) => !block.resolved_at);
      // Resolution is evidence, not a timer or an automatic release of an active claim.
      const retryResolved = status === 'Blocked' && history.length > 0 && pending.length === 0;
      const readiness = applicationReadiness(retryResolved ? { ...row, Status: 'Evaluated' } : row, { root });
      const eligible = (['Evaluated', 'Tailored'].includes(status) || retryResolved)
        && /^https?:\/\//i.test(row['Source URL']) && pending.length === 0
        && !occupied.has(canonicalizeJobUrl(row['Source URL'])) && !/disney/i.test(row.Company);
      let state = readiness.state;
      if (eligible && state !== 'ready') state = 'prepare';
      if (pending.length && !['Applying', 'Applied', 'Closed', 'Skip', 'Rejected', 'Offer', 'Interview', 'Responded', 'Follow-up due'].includes(status)) state = 'hold';
      const blockers = [...readiness.blockers];
      for (const block of pending) blockers.push(`${block.category}: ${block.detail}; retry when ${block.retry_when}`);
      if (occupied.has(canonicalizeJobUrl(row['Source URL'])) && !['Applying', 'Applied'].includes(status)) { state = 'exclude'; blockers.push('source URL already claimed or submitted'); }
      if (/disney/i.test(row.Company)) state = 'exclude';
      return { ...row, ...readiness, state, eligible, owner, blockers, retry: pending };
    })
    .filter((row) => row.state !== 'exclude' && (!bot || row.owner === bot)
      && (!readyOnly || (row.state === 'ready' && row.eligible)) && (!eligibleOnly || row.eligible))
    .sort((a, b) => priority[a.state] - priority[b.state] || score(b) - score(a) || Number(a['#']) - Number(b['#']))
    .slice(0, Math.max(0, Number(limit) || 0));
}

export function extractUrls(content) {
  return [...new Set((content.match(/https?:\/\/[^\s>)|]+/g) || []).map((url) => url.replace(/[.,;]+$/, '')))];
}

export function readSeenUrls(root) {
  const seen = new Set();
  for (const file of ['applications/pipeline.md', 'applications/tracker.md', 'applications/scan-history.tsv']) {
    const full = join(root, file);
    if (existsSync(full)) {
      for (const url of extractUrls(readFileSync(full, 'utf8'))) seen.add(canonicalizeJobUrl(url));
    }
  }
  return seen;
}

function resolveGreenhouse(entry) {
  const explicit = entry.api;
  const source = explicit || entry.careers_url || '';
  const match = source.match(/(?:boards|job-boards)(?:-api)?(?:\.eu)?\.greenhouse\.io\/(?:v1\/boards\/)?([^/?#]+)/);
  if (!match) return null;
  const board = match[1] === 'embed' ? source.match(/[?&]for=([^&#]+)/)?.[1] : match[1];
  return board ? `https://boards-api.greenhouse.io/v1/boards/${board}/jobs` : null;
}

function resolveAshby(entry) {
  const source = entry.api || entry.careers_url || '';
  const match = source.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  return match ? `https://api.ashbyhq.com/posting-api/job-board/${match[1]}?includeCompensation=true` : null;
}

function resolveLever(entry) {
  const source = entry.api || entry.careers_url || '';
  const match = source.match(/jobs\.lever\.co\/([^/?#]+)/);
  return match ? `https://api.lever.co/v0/postings/${match[1]}` : null;
}

function resolveWorkday(entry) {
  return entry.provider === 'workday' && entry.api ? entry.api : null;
}

async function fetchJson(url, { timeoutMs = 20000, method = 'GET', body = null } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      body,
      signal: controller.signal,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function canonicalizeJobUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|ref$|source$|gh_src$|lever-source$|simplify)/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').trim();
  }
}

async function fetchText(url, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function simplifyGithubJobs(source) {
  const feed = source.feed || 'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md';
  const markdown = await fetchText(feed);
  return parseSimplifyGithubRows(markdown);
}

async function greenhouseJobs(entry) {
  const api = resolveGreenhouse(entry);
  if (!api) return null;
  const json = await fetchJson(api);
  return (json.jobs || []).map((job) => ({
    title: job.title || '',
    url: job.absolute_url || '',
    company: entry.name,
    location: job.location?.name || '',
    portal: 'greenhouse',
  })).filter((job) => job.url);
}

async function ashbyJobs(entry) {
  const api = resolveAshby(entry);
  if (!api) return null;
  const json = await fetchJson(api, { timeoutMs: 30000 });
  return (json.jobs || []).map((job) => ({
    title: job.title || '',
    url: job.jobUrl || '',
    company: entry.name,
    location: [job.location, ...(job.secondaryLocations || []).map((loc) => loc.location)].filter(Boolean).join(' / '),
    portal: 'ashby',
  })).filter((job) => job.url);
}

async function leverJobs(entry) {
  const api = resolveLever(entry);
  if (!api) return null;
  const json = await fetchJson(api);
  return (Array.isArray(json) ? json : []).map((job) => ({
    title: job.text || '',
    url: job.hostedUrl || job.applyUrl || '',
    company: entry.name,
    location: job.categories?.location || '',
    portal: 'lever',
  })).filter((job) => job.url);
}

async function workdayJobs(entry) {
  const api = resolveWorkday(entry);
  if (!api) return null;
  const json = await fetchJson(api, {
    method: 'POST',
    body: JSON.stringify({ appliedFacets: {}, limit: 50, offset: 0, searchText: '' }),
  });
  const host = new URL(api).origin;
  return (json.jobPostings || json.jobs || []).map((job) => {
    const path = job.externalPath || job.url || '';
    return {
      title: job.title || '',
      url: path.startsWith('http') ? path : `${host}${path}`,
      company: entry.name,
      location: job.locationsText || job.location || '',
      portal: 'workday',
    };
  }).filter((job) => job.url);
}

export async function fetchProviderJobs(entry) {
  const providers = [greenhouseJobs, ashbyJobs, leverJobs, workdayJobs];
  const errors = [];
  for (const provider of providers) {
    try {
      const jobs = await provider(entry);
      if (jobs) return { jobs, provider: jobs[0]?.portal || provider.name.replace('Jobs', '') };
    } catch (error) {
      errors.push(error.message);
      return { jobs: [], provider: provider.name.replace('Jobs', ''), error: error.message };
    }
  }
  return { jobs: [], provider: 'unsupported', error: errors.join('; ') || 'No supported provider detected' };
}

export async function scanPortals(root, { dryRun = false, now = new Date(), portalsPath = 'applications/portals.yml' } = {}) {
  const config = parsePortalsYaml(readFileSync(join(root, portalsPath), 'utf8'));
  const titleFilter = buildTitleFilter(config.title_filter);
  const locationFilter = buildLocationFilter(config.location_filter);
  const seen = readSeenUrls(root);
  const found = [];
  const skipped = [];

  const sourcesPath = join(root, 'applications/job-sources.md');
  const sources = existsSync(sourcesPath) ? parseJobSourcesMarkdown(readFileSync(sourcesPath, 'utf8')) : [];
  for (const source of sources.filter((item) => item.enabled)) {
    if (source.method.toLowerCase() === 'github_markdown') {
      try {
        const jobs = await simplifyGithubJobs(source);
        const sourceNew = [];
        for (const rawJob of jobs) {
          const job = { ...rawJob, url: canonicalizeJobUrl(rawJob.url) };
          const status = !titleFilter(job.title)
            ? 'title_filter'
            : !locationFilter(job.location)
              ? 'location_filter'
              : seen.has(job.url)
                ? 'duplicate'
                : 'new';
          const enriched = { ...job, source: source.name, status };
          if (status === 'new') sourceNew.push(enriched);
          else skipped.push(enriched);
        }
        sourceNew.sort((a, b) => locationPreferenceRank(b.location) - locationPreferenceRank(a.location) || Number.parseInt(a.age) - Number.parseInt(b.age));
        for (const job of sourceNew.slice(0, 50)) { found.push(job); seen.add(job.url); }
        for (const job of sourceNew.slice(50)) skipped.push({ ...job, status: 'source_cap' });
      } catch (error) {
        skipped.push({ source: source.name, reason: error.message });
      }
    } else {
      skipped.push({ source: source.name, reason: 'browser_ui_required', url: source.url });
    }
  }

  for (const entry of config.tracked_companies.filter((company) => company.enabled !== false)) {
    const result = await fetchProviderJobs(entry);
    if (result.error) skipped.push({ company: entry.name, reason: result.error });
    for (const rawJob of result.jobs) {
      const job = { ...rawJob, url: canonicalizeJobUrl(rawJob.url) };
      const status = !titleFilter(job.title)
        ? 'title_filter'
        : !locationFilter(job.location)
          ? 'location_filter'
          : seen.has(job.url)
            ? 'duplicate'
            : 'new';
      const enriched = { ...job, status };
      if (status === 'new') {
        found.push(enriched);
        seen.add(job.url);
      } else {
        skipped.push(enriched);
      }
    }
  }

  if (!dryRun && found.length > 0) {
    const date = todayIso(now);
    const pipelinePath = join(root, 'applications/pipeline.md');
    const historyPath = join(root, 'applications/scan-history.tsv');
    const pipelineLines = found.map((job) => `- [ ] ${job.company} | ${job.title} | ${job.location || 'TBD'} | ${job.url}`);
    appendFileSync(pipelinePath, `${pipelineLines.join('\n')}\n`);
    const historyLines = found.map((job) => [job.url, date, job.portal, job.title, job.company, 'added', job.location || ''].join('\t'));
    appendFileSync(historyPath, `${historyLines.join('\n')}\n`);
  }

  return { found, skipped };
}

function greenhouseLivenessTarget(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const jobId = parsed.searchParams.get('gh_jid') || parsed.pathname.match(/\/jobs\/(\d+)/)?.[1];
  if (!jobId) return null;

  const boardFromPath = parsed.hostname.endsWith('greenhouse.io')
    ? parsed.pathname.match(/^\/([^/]+)\/jobs\//)?.[1]
    : null;
  const boardByHost = {
    'www.pinterestcareers.com': 'pinterest',
    'careers.airbnb.com': 'airbnb',
  };
  const board = boardFromPath || boardByHost[parsed.hostname];
  return board ? { board, jobId } : null;
}

async function checkGreenhouseLiveness(url) {
  const target = greenhouseLivenessTarget(url);
  if (!target) return null;
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${target.board}/jobs/${target.jobId}`;
  try {
    const response = await fetch(apiUrl, { redirect: 'error' });
    if (!response.ok) {
      return {
        url,
        finalUrl: apiUrl,
        status: response.status,
        active: false,
        reason: `greenhouse-api-${response.status}`,
      };
    }
    const job = await response.json();
    return {
      url,
      finalUrl: job.absolute_url || url,
      status: response.status,
      active: Boolean(job.id || job.title),
      reason: 'greenhouse-api-active',
    };
  } catch (error) {
    return {
      url,
      finalUrl: apiUrl,
      status: 0,
      active: false,
      reason: `greenhouse-api-${error.message}`,
    };
  }
}

function ashbyLivenessTarget(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const match = parsed.hostname === 'jobs.ashbyhq.com'
    ? parsed.pathname.match(/^\/([^/]+)\/([^/?#]+)/)
    : null;
  return match ? { board: match[1], jobId: match[2] } : null;
}

async function checkAshbyLiveness(url) {
  const target = ashbyLivenessTarget(url);
  if (!target) return null;
  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${target.board}?includeCompensation=true`;
  try {
    const response = await fetch(apiUrl, { redirect: 'error' });
    if (!response.ok) {
      return {
        url,
        finalUrl: apiUrl,
        status: response.status,
        active: false,
        reason: `ashby-api-${response.status}`,
      };
    }
    const json = await response.json();
    const job = (json.jobs || []).find((item) => item.id === target.jobId || item.jobUrl?.includes(target.jobId));
    return {
      url,
      finalUrl: job?.jobUrl || url,
      status: response.status,
      active: Boolean(job),
      reason: job ? 'ashby-api-active' : 'ashby-api-missing',
    };
  } catch (error) {
    return {
      url,
      finalUrl: apiUrl,
      status: 0,
      active: false,
      reason: `ashby-api-${error.message}`,
    };
  }
}

export async function checkUrlLiveness(url, { timeoutMs = 15000 } = {}) {
  const greenhouse = await checkGreenhouseLiveness(url);
  if (greenhouse) return greenhouse;
  const ashby = await checkAshbyLiveness(url);
  if (ashby) return ashby;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const text = await response.text();
    const closed = CLOSED_PATTERNS.some((pattern) => pattern.test(text)) || CLOSED_PATTERNS.some((pattern) => pattern.test(response.url));
    const hasJobSignals = /apply|application|responsibilities|requirements|qualifications|job/i.test(text);
    return {
      url,
      finalUrl: response.url,
      status: response.status,
      active: response.ok && !closed && hasJobSignals,
      reason: !response.ok ? `${response.status} ${response.statusText}` : closed ? 'closed-pattern' : hasJobSignals ? 'active-signals' : 'weak-job-signals',
    };
  } catch (error) {
    return { url, finalUrl: url, status: 0, active: false, reason: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export function parsePipeline(content) {
  return content.split(/\r?\n/).map((line, index) => {
    const match = line.match(/^-\s+\[( |x|X)\]\s+(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(https?:\/\/\S+)/);
    if (!match) return null;
    return {
      line,
      index,
      done: match[1].toLowerCase() === 'x',
      company: match[2].trim(),
      role: match[3].trim(),
      location: match[4].trim(),
      url: match[5].trim(),
    };
  }).filter(Boolean);
}

export function scoreRole(item, jdText = '') {
  const title = String(item.role || '').toLowerCase();
  const haystack = `${item.company} ${item.role} ${item.location}`.toLowerCase();
  const jd = String(jdText || '').toLowerCase();
  let score = 1.8;

  if (isTargetInternshipTitle(title)) score += 0.9;
  if (/\b(software|engineer|engineering)\b/i.test(title)) score += 0.4;
  if (/\b(spring 2027|winter 2027)\b/i.test(haystack)) score += 0.4;
  else if (/\b(summer 2027|fall 2026)\b/i.test(haystack)) score += 0.2;

  const targetSignals = ['ai', 'llm', 'agent', 'generative ai', 'developer tools', 'platform', 'full-stack', 'frontend', 'backend'];
  const jdSignals = ['agent', 'llm', 'generative ai', 'developer tools', 'platform', 'full-stack', 'product engineering', 'evaluation', 'developer experience'];
  const evidenceSignals = ['typescript', 'python', 'react', 'angular', '.net', 'node.js', 'postgresql', 'api', 'mcp', 'cloud'];
  score += Math.min(0.6, targetSignals.filter((term) => compileKeyword(term)(title)).length * 0.2);
  score += Math.min(0.8, jdSignals.filter((term) => compileKeyword(term)(jd)).length * 0.12);
  score += Math.min(0.4, evidenceSignals.filter((term) => compileKeyword(term)(jd)).length * 0.05);

  const locationBonus = [0, 0.1, 0.2, 0.3, 0.4, 0.5][locationPreferenceRank(item.location)] || 0;
  score += locationBonus;

  const negatives = ['senior', 'staff', 'principal', 'manager', 'full-time', 'full time', 'new grad', 'hardware', 'firmware', 'quant'];
  for (const term of negatives) if (haystack.includes(term)) score -= 0.6;
  if (!isTargetInternshipTitle(title)) score -= 1.2;
  return Math.max(1, Math.min(5, Number(score.toFixed(1))));
}

function splitMarkdownRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

export function parseOutreachContacts(content, { company = '', file = '' } = {}) {
  const lines = String(content || '').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^\|\s*Name\s*\|\s*Role\s*\|/i.test(line));
  if (headerIndex === -1) return [];
  const headers = splitMarkdownRow(lines[headerIndex]);
  const contacts = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (!line.trim().startsWith('|')) break;
    if (/^\|?\s*[-:]+/.test(line.trim())) continue;
    const cells = splitMarkdownRow(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    contacts.push({ ...record, Company: company, File: file, Line: i + 1 });
  }
  return contacts;
}

function dateFromText(value) {
  return String(value || '').match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] || null;
}

function addDays(date, days) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
}

export function computeOutreachFollowups(contacts, { now = new Date(), defaultWaitDays = 7 } = {}) {
  const today = todayIso(now);
  // This pilot uses per-email opens/replies/coverage; a date alone cannot make it due.
  return contacts.filter((contact) => !String(contact['Next Action'] || '').includes('[tracked-email]')).map((contact) => {
    const status = String(contact.Status || '').trim();
    const lastTouch = dateFromText(contact['Last Touch']);
    const explicitDate = dateFromText(contact['Next Action']);
    const nextDate = explicitDate || (lastTouch ? addDays(lastTouch, defaultWaitDays) : null);
    const due = status === 'Follow-up due'
      || (status === 'Contacted' && nextDate && nextDate <= today);
    const daysOverdue = due && nextDate
      ? Math.max(0, Math.floor((new Date(`${today}T00:00:00Z`) - new Date(`${nextDate}T00:00:00Z`)) / 86400000))
      : 0;
    return { ...contact, NextDate: nextDate || 'TBD', Urgency: due ? 'due' : 'waiting', DaysOverdue: daysOverdue };
  }).filter((contact) => contact.Urgency === 'due')
    .sort((a, b) => b.DaysOverdue - a.DaysOverdue || String(a.Company).localeCompare(String(b.Company)));
}

export function validateOutreachContacts(contacts) {
  const issues = [];
  const identities = new Map();
  for (const contact of contacts) {
    const label = `${contact.Company || contact.File}:${contact.Name || '(blank)'}`;
    if (!contact.Name) issues.push(`${label} is missing a name.`);
    if (!OUTREACH_STATUS_VALUES.includes(contact.Status)) issues.push(`${label} has unknown status: ${contact.Status || '(blank)'}`);
    if (contact.Status === 'Contacted' && !dateFromText(contact['Last Touch'])) {
      issues.push(`${label} is Contacted without an ISO last-touch date.`);
    }
    const identity = `${String(contact.Company || '').toLowerCase()}|${String(contact.LinkedIn || contact.Email || '').trim().toLowerCase()}`;
    if (!identity.endsWith('|') && !identity.endsWith('|tbd') && !identity.endsWith('|-') && !identity.endsWith('|not publicly found')) {
      if (identities.has(identity)) issues.push(`${label} duplicates ${identities.get(identity)} (${identity}).`);
      else identities.set(identity, label);
    }
  }
  return issues;
}

export function applicationFunnel(trackerContent) {
  const rows = parseTracker(trackerContent);
  const counts = Object.fromEntries(STATUS_VALUES.map((status) => [status, 0]));
  for (const row of rows) {
    const status = normalizeStatus(row.Status);
    if (status) counts[status] += 1;
  }
  const active = rows.filter((row) => !['Rejected', 'Closed', 'Skip'].includes(normalizeStatus(row.Status))).length;
  return { total: rows.length, active, counts };
}

export function nextTrackerId(content) {
  const rows = parseTracker(content);
  const max = rows.reduce((acc, row) => Math.max(acc, Number.parseInt(row['#'], 10) || 0), 0);
  return max + 1;
}

function markdownLink(label, target) {
  return `[${label}](${target})`;
}

export async function runBatch(root, { threshold = 3.5, now = new Date(), limit = 10 } = {}) {
  const pipelinePath = join(root, 'applications/pipeline.md');
  const trackerPath = join(root, 'applications/tracker.md');
  const pipelineText = readFileSync(pipelinePath, 'utf8');
  const entries = parsePipeline(pipelineText).filter((entry) => !entry.done).slice(0, limit);
  const trackerText = readFileSync(trackerPath, 'utf8');
  let nextId = nextTrackerId(trackerText);
  const date = todayIso(now);
  const completed = [];
  const updatedLines = pipelineText.split(/\r?\n/);
  const newTrackerRows = [];

  mkdirSync(join(root, 'applications/reports'), { recursive: true });
  mkdirSync(join(root, '.cache/jobmax-job-search'), { recursive: true });

  for (const entry of entries) {
    const liveness = await checkUrlLiveness(entry.url);
    const slug = slugify(`${entry.company}-${entry.role}`);
    const reportRel = `applications/reports/${String(nextId).padStart(3, '0')}-${slug}-${date}.md`;
    const resumeRel = `resumes/roles/${slug}/resume.tex`;
    const outreachRel = `outreach/${slugify(entry.company)}.md`;
    const jdText = await fetchJobText(entry.url, liveness);
    const score = scoreRole(entry, jdText);
    const shouldTailor = liveness.active && isTargetInternshipTitle(entry.role) && score >= threshold;
    const status = shouldTailor ? 'Tailored' : liveness.active ? 'Evaluated' : 'Closed';
    const nextAction = shouldTailor
      ? 'Review tailored resume, draft answers, and referral path before applying'
      : liveness.active
        ? 'Review manually before tailoring'
        : 'Skip unless a fresh posting appears';

    const jdTmp = join(root, '.cache/jobmax-job-search', `${slug}.md`);
    writeFileSync(jdTmp, jdText || `${entry.company} | ${entry.role}\n${entry.url}\n`);

    if (shouldTailor && !existsSync(join(root, 'resumes/roles', slug))) {
      const python = resolvePythonInvocation();
      execFileSync(python.command, [...python.prefix,
        'scripts/new_resume_variant.py',
        '--company', entry.company,
        '--role', entry.role,
        '--jd', relative(root, jdTmp),
        '--source-url', entry.url,
        '--location', entry.location,
        '--slug', slug,
      ], { cwd: root, stdio: 'pipe' });
    }

    const report = buildEvaluationReport(entry, { score, liveness, status, date, resumeRel, outreachRel, jdText });
    writeFileSync(join(root, reportRel), report);

    newTrackerRows.push([
      nextId,
      date,
      entry.company,
      entry.role,
      inferTerm(entry.role),
      entry.location,
      entry.url,
      `${score}/5`,
      status,
      shouldTailor ? markdownLink('resume', `../${resumeRel}`) : '-',
      markdownLink('report', `../${reportRel}`),
      existsSync(join(root, outreachRel)) ? markdownLink('outreach', `../${outreachRel}`) : '-',
      nextAction,
      liveness.reason,
    ]);
    updatedLines[entry.index] = entry.line.replace('- [ ]', '- [x]');
    completed.push({ ...entry, score, status, report: reportRel, resume: shouldTailor ? resumeRel : null });
    nextId++;
  }

  if (newTrackerRows.length > 0) {
    appendFileSync(trackerPath, newTrackerRows.map((row) => `| ${row.join(' | ')} |`).join('\n') + '\n');
    writeFileSync(pipelinePath, updatedLines.join('\n'));
  }

  return completed;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvePythonInvocation() {
  const configured = process.env.PYTHON;
  const candidates = configured
    ? [{ command: configured, prefix: [] }]
    : process.platform === 'win32'
      ? [
          { command: 'python', prefix: [] },
          { command: 'py', prefix: ['-3'] },
          { command: 'python3', prefix: [] },
        ]
      : [
          { command: 'python3', prefix: [] },
          { command: 'python', prefix: [] },
        ];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate.command, [...candidate.prefix, '--version'], { stdio: 'ignore' });
      return candidate;
    } catch {
      // Try the next conventional Python launcher.
    }
  }
  throw new Error('Python 3 was not found. Set the PYTHON environment variable to the Python executable.');
}

async function fetchJobText(url, live = null) {
  const liveness = live || await checkUrlLiveness(url);
  if (!liveness.active) return `${url}\n\nLiveness: ${liveness.reason}\n`;

  const greenhouse = greenhouseLivenessTarget(url);
  if (greenhouse) {
    try {
      const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${greenhouse.board}/jobs/${greenhouse.jobId}`);
      if (response.ok) {
        const job = await response.json();
        return stripHtml([job.title, job.location?.name, job.content].filter(Boolean).join('\n\n')).slice(0, 12000);
      }
    } catch {
      // Fall through to the public posting page.
    }
  }

  const ashby = ashbyLivenessTarget(url);
  if (ashby) {
    try {
      const response = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${ashby.board}?includeCompensation=true`);
      if (response.ok) {
        const json = await response.json();
        const job = (json.jobs || []).find((item) => item.id === ashby.jobId || item.jobUrl?.includes(ashby.jobId));
        if (job) {
          return stripHtml([
            job.title,
            job.location,
            job.descriptionPlain,
            job.descriptionHtml,
            job.description,
          ].filter(Boolean).join('\n\n')).slice(0, 12000);
        }
      }
    } catch {
      // Fall through to the public posting page.
    }
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    return stripHtml(html).slice(0, 12000);
  } catch {
    return `${url}\n`;
  }
}

function inferTerm(role) {
  const lower = String(role || '').toLowerCase();
  if (lower.includes('spring 2027')) return 'Spring 2027';
  if (lower.includes('summer 2027')) return 'Summer 2027';
  if (lower.includes('fall 2026')) return 'Fall 2026';
  return 'TBD';
}

function buildEvaluationReport(entry, { score, liveness, status, date, resumeRel, outreachRel, jdText }) {
  return `# ${entry.company} - ${entry.role}

| Field | Value |
|---|---|
| Date | ${date} |
| Company | ${entry.company} |
| Role | ${entry.role} |
| Location | ${entry.location} |
| Source URL | ${entry.url} |
| Fit score | ${score}/5 |
| Status | ${status} |
| Liveness | ${liveness.active ? 'Active' : 'Not active'} (${liveness.reason}) |

## Role Summary

Batch-prepared from the JobMax application pipeline. Review the original posting before submitting anything.

## Resume Tailoring Plan

- Use the existing JobMax resume truth constraints from \`agents/tailor-resume.md\`.
- Prefer the candidate's AI product, agent tooling, developer tools, full-stack, and deployed software proof.
- Resume artifact: \`${resumeRel}\`.

## Outreach And Referral Plan

- Check \`${outreachRel}\` for known contacts.
- Prefer warm RIT, recruiter, AI team, and product/developer-tools connections.
- Draft a short message with one ask; do not send without the candidate's approval.

## Posting Legitimacy And Liveness

- Final URL: ${liveness.finalUrl}
- HTTP status: ${liveness.status}
- Assessment: ${liveness.active ? 'Proceed, then review manually.' : 'Closed or weak evidence; do not invest tailoring time unless verified.'}

## Draft Application Answers

- Why this role: Connect the posting to the candidate's production AI tooling, agent workflow, and full-stack product experience.
- Relevant project: Choose Chatio Benchmark, Chatio Chat, iMessages Chatbot Server, or Word Hunt based on the JD.
- Additional information: Mention measurable Paychex/Real Wave/project proof only when supported by JobMax source files.

## Saved Posting Text

${(jdText || 'No posting text captured.').slice(0, 12000)}
`;
}

export function parseScanHistory(content) {
  return content.split(/\r?\n/).filter(Boolean).map((line, index) => {
    if (index === 0 && line.startsWith('url\t')) return null;
    const [url, firstSeen, portal, title, company, status = 'added', location = ''] = line.split('\t');
    return { url, firstSeen, portal, title, company, status, location };
  }).filter(Boolean);
}

function roleTokens(title) {
  return new Set(String(title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((token) => token.length > 2 && !['internship', 'intern'].includes(token)));
}

export function rolesSimilar(a, b) {
  const left = roleTokens(a);
  const right = roleTokens(b);
  if (left.size === 0 || right.size === 0) return false;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / Math.min(left.size, right.size) >= 0.5;
}

export function detectReposts(rows, windowDays = 90) {
  const byCompany = new Map();
  for (const row of rows.filter((r) => r.status === 'added')) {
    const key = String(row.company || '').toLowerCase();
    if (!key) continue;
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key).push(row);
  }
  const reposts = [];
  for (const [company, companyRows] of byCompany) {
    for (let i = 0; i < companyRows.length; i++) {
      for (let j = i + 1; j < companyRows.length; j++) {
        const a = companyRows[i];
        const b = companyRows[j];
        const days = Math.abs((Date.parse(a.firstSeen) - Date.parse(b.firstSeen)) / 86400000);
        if (a.url !== b.url && days <= windowDays && rolesSimilar(a.title, b.title)) {
          reposts.push({ company, role: b.title, firstSeen: a.firstSeen, lastSeen: b.firstSeen, urls: [a.url, b.url] });
        }
      }
    }
  }
  return reposts;
}

export function computeFollowups(trackerContent, followupsContent, { now = new Date() } = {}) {
  const apps = parseTracker(trackerContent);
  const history = parseMarkdownTable(followupsContent).map((cells) => ({
    appId: cells[1],
    date: cells[2],
  }));
  const dateNow = new Date(todayIso(now));
  return apps.filter((app) => ['Applied', 'Follow-up due', 'Responded', 'Interview'].includes(normalizeStatus(app.Status))).map((app) => {
    const appHistory = history.filter((item) => item.appId === app['#']);
    const latestFollowup = appHistory.map((item) => item.date).sort().at(-1);
    const anchor = latestFollowup || app.Date;
    const days = Math.floor((dateNow - new Date(anchor)) / 86400000);
    const status = normalizeStatus(app.Status);
    const dueAfter = status === 'Responded' || status === 'Interview' ? 1 : 7;
    return {
      id: app['#'],
      company: app.Company,
      role: app.Role,
      status,
      daysSince: days,
      followups: appHistory.length,
      urgency: days >= dueAfter ? 'due' : 'waiting',
      nextDate: new Date(new Date(anchor).getTime() + dueAfter * 86400000).toISOString().slice(0, 10),
    };
  });
}

export function formatTable(rows, columns) {
  if (rows.length === 0) return 'No rows.';
  const widths = columns.map((column) => Math.max(column.length, ...rows.map((row) => String(row[column] ?? '').length)));
  const render = (row) => `| ${columns.map((column, i) => String(row[column] ?? '').padEnd(widths[i])).join(' | ')} |`;
  return [render(Object.fromEntries(columns.map((c) => [c, c]))), render(Object.fromEntries(columns.map((c, i) => [c, '-'.repeat(widths[i])]))), ...rows.map(render)].join('\n');
}
