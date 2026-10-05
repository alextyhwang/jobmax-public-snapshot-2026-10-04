CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  armed_at INTEGER,
  preview_until INTEGER,
  ambiguous INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL REFERENCES messages(id),
  at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('reported-open', 'sender-preview'))
);
CREATE INDEX IF NOT EXISTS events_message_time ON events(message_id, at);
CREATE TABLE IF NOT EXISTS health (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  first_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS gaps (
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  PRIMARY KEY(start_at, end_at)
);
