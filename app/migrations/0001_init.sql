-- Fearless Draw schema. Applied by the platform on deploy (app.manifest.json
-- sets "db": true). Additive only — this is live production data.

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency (
  tournament_id TEXT NOT NULL,
  key TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tournaments_code ON tournaments(code);
