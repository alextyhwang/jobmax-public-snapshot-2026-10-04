import { HEARTBEAT_TOLERANCE_MS, PREVIEW_WINDOW_MS } from './collector.mjs';

export class D1Store {
  constructor(db) { this.db = db; }
  query(sql, ...args) { return this.db.prepare(sql).bind(...args); }
  exists(id) { return this.query('SELECT id FROM messages WHERE id = ?', id).first(); }
  create(id, now) { return this.query('INSERT OR IGNORE INTO messages(id, created_at) VALUES (?, ?)', id, now).run(); }
  prepareSend(id, now) { return this.query('UPDATE messages SET armed_at = COALESCE(armed_at, ?) WHERE id = ?', now, id).run(); }
  async arm(id, sentAt, now) {
    const message = await this.query('SELECT * FROM messages WHERE id = ?', id).first();
    if (sentAt < message.created_at) throw new Error('Sent time precedes registration');
    // Sending before collection was armed leaves an unobservable interval.
    await this.query('UPDATE messages SET sent_at = ?, armed_at = COALESCE(armed_at, ?), ambiguous = CASE WHEN COALESCE(armed_at, ?) > ? THEN 1 ELSE ambiguous END WHERE id = ? AND sent_at IS NULL', sentAt, now, now, sentAt, id).run();
  }
  async open(id, now) {
    await this.query("INSERT INTO events(message_id, at, kind) SELECT id, ?, CASE WHEN preview_until >= ? THEN 'sender-preview' ELSE 'reported-open' END FROM messages WHERE id = ? AND armed_at IS NOT NULL", now, now, id).run();
  }
  async preview(id, now) {
    await this.db.batch([
      this.query('UPDATE messages SET preview_until = ?, ambiguous = CASE WHEN armed_at IS NOT NULL THEN 1 ELSE ambiguous END WHERE id = ?', now + PREVIEW_WINDOW_MS, id),
      this.query("UPDATE events SET kind = 'sender-preview' WHERE message_id = ? AND at BETWEEN ? AND ?", id, now - PREVIEW_WINDOW_MS, now + PREVIEW_WINDOW_MS),
    ]);
  }
  async heartbeat(now) {
    await this.db.batch([
      this.query('INSERT OR IGNORE INTO gaps(start_at, end_at) SELECT last_at, ? FROM health WHERE id = 1 AND ? - last_at > ?', now, now, HEARTBEAT_TOLERANCE_MS),
      this.query('INSERT INTO health(id, first_at, last_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET last_at = MAX(last_at, excluded.last_at)', now, now),
    ]);
  }
  async health(now) {
    const row = await this.query('SELECT * FROM health WHERE id = 1').first();
    return { healthy: Boolean(row && now - row.last_at <= HEARTBEAT_TOLERANCE_MS), firstAt: row?.first_at ?? null, lastAt: row?.last_at ?? null };
  }
  async summary(id, now) {
    const message = await this.query('SELECT * FROM messages WHERE id = ?', id).first();
    const stats = await this.query("SELECT COUNT(*) AS count, MIN(at) AS first_at, MAX(at) AS last_at FROM events WHERE message_id = ? AND at >= ? AND kind = 'reported-open'", id, message.sent_at ?? Number.MAX_SAFE_INTEGER).first();
    const health = await this.health(now);
    const gap = await this.query('SELECT start_at FROM gaps WHERE end_at >= ? AND start_at <= ? LIMIT 1', message.sent_at ?? now, now).first();
    return { id, reportedOpens: stats.count, firstOpenAt: stats.first_at, lastOpenAt: stats.last_at,
      armedAt: message.armed_at, ambiguous: Boolean(message.ambiguous),
      coverageHealthy: Boolean(message.sent_at && health.healthy && health.firstAt <= message.sent_at && !gap),
    };
  }
}
