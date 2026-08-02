import type { D1Database } from "@cloudflare/workers-types";
import { bindings } from "../bindings.server";
import type { TournamentState } from "../../engine/types";

export function requireDb(): D1Database {
  const { DB } = bindings();
  if (!DB) throw new Error("db_missing: D1 binding is not configured");
  return DB;
}

let schemaEnsured = false;

/**
 * The platform applies migrations on deploy; this fallback makes local
 * wrangler dev (and any race right after first deploy) self-healing.
 */
export async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaEnsured) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        state TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL
      )`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS idempotency (
        tournament_id TEXT NOT NULL,
        key TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (tournament_id, key)
      )`,
    ),
  ]);
  schemaEnsured = true;
}

export type TournamentRow = {
  id: string;
  code: string;
  state: TournamentState;
  version: number;
};

export async function loadByCode(
  db: D1Database,
  code: string,
): Promise<TournamentRow | null> {
  const row = await db
    .prepare("SELECT id, code, state, version FROM tournaments WHERE code = ?1")
    .bind(code.toUpperCase())
    .first<{ id: string; code: string; state: string; version: number }>();
  if (!row) return null;
  return { ...row, state: JSON.parse(row.state) as TournamentState };
}

export async function insertTournament(
  db: D1Database,
  state: TournamentState,
  now: number,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO tournaments (id, code, state, version, updated_at) VALUES (?1, ?2, ?3, 1, ?4)",
    )
    .bind(state.id, state.code, JSON.stringify(state), now)
    .run();
}

/** Compare-and-swap write; returns false when someone else won the race. */
export async function casUpdate(
  db: D1Database,
  id: string,
  expectedVersion: number,
  state: TournamentState,
  now: number,
): Promise<boolean> {
  const res = await db
    .prepare(
      "UPDATE tournaments SET state = ?1, version = version + 1, updated_at = ?2 WHERE id = ?3 AND version = ?4",
    )
    .bind(JSON.stringify(state), now, id, expectedVersion)
    .run();
  return (res.meta.changes ?? 0) === 1;
}

export async function getIdempotent(
  db: D1Database,
  tournamentId: string,
  key: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT response FROM idempotency WHERE tournament_id = ?1 AND key = ?2")
    .bind(tournamentId, key)
    .first<{ response: string }>();
  return row?.response ?? null;
}

export async function putIdempotent(
  db: D1Database,
  tournamentId: string,
  key: string,
  response: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      "INSERT OR IGNORE INTO idempotency (tournament_id, key, response, created_at) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(tournamentId, key, response, now)
    .run();
}
