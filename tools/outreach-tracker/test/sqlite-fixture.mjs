import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Exercise the real D1 SQL against SQLite, rather than mirroring storage logic in a mock.
// Python is used because the repository's Node 22.3 predates node:sqlite.
export function sqliteFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'jobmax-sqlite-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'test.sqlite');
  const script = `import json,sqlite3,sys
data=json.load(sys.stdin)
db=sqlite3.connect(sys.argv[1])
db.row_factory=sqlite3.Row
with db:
 if 'schema' in data: db.executescript(data['schema'])
 results=[]
 for item in data.get('queries',[]):
  cursor=db.execute(item['sql'],item['args'])
  results.append([dict(row) for row in cursor.fetchall()])
print(json.dumps(results))
db.close()
`;
  const run = data => JSON.parse(execFileSync(process.env.JOBMAX_TEST_PYTHON || 'python', ['-c', script, path], { input: JSON.stringify(data), encoding: 'utf8' }));
  run({ schema: readFileSync(new URL('../schema.sql', import.meta.url), 'utf8') });
  return {
    prepare(sql) {
      return { bind(...args) { return { sql, args, async first() { return run({ queries: [{ sql, args }] })[0][0] || null; }, async run() { run({ queries: [{ sql, args }] }); return { success: true }; } }; } };
    },
    async batch(statements) { run({ queries: statements.map(({ sql, args }) => ({ sql, args })) }); return statements.map(() => ({ success: true })); },
  };
}
