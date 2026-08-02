import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  applyAction,
  createTournament,
  findPlayerByToken,
  toView,
  type EngineAction,
} from "../../engine/engine";
import { EngineActionError, type TournamentState } from "../../engine/types";
import { cryptoRng } from "../../engine/random";
import {
  casUpdate,
  ensureSchema,
  getIdempotent,
  insertTournament,
  loadByCode,
  putIdempotent,
  requireDb,
} from "./db.server";

/* ----------------------------- schemas ----------------------------- */

const versionEnum = z.enum(["17", "18", "19", "20", "21", "22", "23", "24", "25", "26"]);

const configSchema = z.object({
  name: z.string().min(1).max(40),
  maxPlayers: z.number().int().min(2).max(16),
  versions: z.array(versionEnum).min(1),
  format: z.enum(["league", "cup", "groups"]),
  doubleRound: z.boolean(),
  groupCount: z.union([z.literal(2), z.literal(4)]),
  rerollsPerMatch: z.number().int().min(0).max(3),
  handSize: z.number().int().min(1).max(5),
  balanced: z.boolean(),
  fearless: z.boolean(),
  includeNational: z.boolean(),
  banned: z.array(z.string()).max(400),
  minStars: z.number().min(0).max(5),
});

const actionSchema: z.ZodType<EngineAction> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), name: z.string().min(1).max(20) }),
  z.object({ type: z.literal("rename"), playerId: z.string(), name: z.string().min(1).max(20) }),
  z.object({ type: z.literal("kick"), playerId: z.string() }),
  z.object({ type: z.literal("replace"), playerId: z.string(), newName: z.string().min(1).max(20) }),
  z.object({ type: z.literal("updateConfig"), config: configSchema.partial() }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("deal"), matchId: z.string(), playerId: z.string() }),
  z.object({ type: z.literal("reroll"), matchId: z.string(), playerId: z.string() }),
  z.object({ type: z.literal("pick"), matchId: z.string(), playerId: z.string(), teamId: z.string() }),
  z.object({
    type: z.literal("result"),
    matchId: z.string(),
    hg: z.number().int().min(0).max(99),
    ag: z.number().int().min(0).max(99),
    penWinner: z.string().optional(),
  }),
  z.object({
    type: z.literal("editResult"),
    matchId: z.string(),
    hg: z.number().int().min(0).max(99),
    ag: z.number().int().min(0).max(99),
    penWinner: z.string().optional(),
  }),
  z.object({
    type: z.literal("resolveExhaustion"),
    option: z.enum(["reduce", "release", "disable"]),
  }),
  z.object({ type: z.literal("undo") }),
]) as z.ZodType<EngineAction>;

/* ----------------------------- helpers ----------------------------- */

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; code: string; message: string };

function apiErr(code: string, message: string): ApiErr {
  return { ok: false, code, message };
}

function viewFor(state: TournamentState, token: string | null) {
  const player = findPlayerByToken(state, token);
  return {
    view: toView(state, {
      playerId: player?.id ?? null,
      isAdmin: player?.isAdmin ?? false,
    }),
    playerId: player?.id ?? null,
    isAdmin: player?.isAdmin ?? false,
  };
}

/* ----------------------------- endpoints ----------------------------- */

export const createTournamentFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      config: configSchema,
      adminName: z.string().min(1).max(20),
    }),
  )
  .handler(async ({ data }) => {
    const db = requireDb();
    await ensureSchema(db);
    const rng = cryptoRng();
    const now = Date.now();
    // Retry a few times in the (unlikely) case of a join-code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { state, adminToken, recoveryCode } = createTournament(
        rng,
        now,
        data.config,
        data.adminName,
      );
      try {
        await insertTournament(db, state, now);
        return {
          ok: true as const,
          code: state.code,
          playerId: state.players[0].id,
          token: adminToken,
          recoveryCode,
        };
      } catch (e) {
        if (attempt === 4) throw e;
      }
    }
    return apiErr("create_failed", "Turnaj se nepodařilo založit, zkuste to znovu.");
  });

export const mutateFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(4).max(8),
      token: z.string().nullable(),
      idempotencyKey: z.string().min(8).max(64),
      action: actionSchema,
    }),
  )
  .handler(async ({ data }) => {
    const db = requireDb();
    await ensureSchema(db);
    const rng = cryptoRng();

    const first = await loadByCode(db, data.code);
    if (!first) return apiErr("not_found", "Turnaj s tímto kódem neexistuje.");

    // Idempotent replay: return the stored outcome, plus a fresh view.
    const cached = await getIdempotent(db, first.id, data.idempotencyKey);
    if (cached) {
      const fresh = (await loadByCode(db, data.code)) ?? first;
      const stored = JSON.parse(cached) as {
        joinedToken?: string;
        joinedPlayerId?: string;
      };
      const { view } = viewFor(
        fresh.state,
        stored.joinedToken ?? data.token,
      );
      return {
        ok: true as const,
        replayed: true,
        version: fresh.version,
        view,
        ...stored,
      };
    }

    // Single-writer via CAS: reload + reapply on conflict.
    for (let attempt = 0; attempt < 6; attempt++) {
      const row = attempt === 0 ? first : await loadByCode(db, data.code);
      if (!row) return apiErr("not_found", "Turnaj s tímto kódem neexistuje.");
      const actor = findPlayerByToken(row.state, data.token);
      const isJoin = data.action.type === "join";
      if (!actor && !isJoin)
        return apiErr("bad_token", "Tvé připojení už neplatí — načti stránku znovu.");

      const now = Date.now();
      let outcome;
      try {
        outcome = applyAction(row.state, data.action, {
          rng,
          now,
          actorId: actor?.id ?? null,
          isAdmin: actor?.isAdmin ?? false,
        });
      } catch (e) {
        if (e instanceof EngineActionError) return apiErr(e.code, e.message);
        throw e;
      }

      const wrote = await casUpdate(db, row.id, row.version, outcome.state, now);
      if (!wrote) continue; // lost the race — reload and reapply

      const stored = JSON.stringify({
        joinedToken: outcome.joinedToken,
        joinedPlayerId: outcome.joinedPlayerId,
      });
      await putIdempotent(db, row.id, data.idempotencyKey, stored, now);

      const effectiveToken = outcome.joinedToken ?? data.token;
      const { view } = viewFor(outcome.state, effectiveToken);
      return {
        ok: true as const,
        version: row.version + 1,
        view,
        joinedToken: outcome.joinedToken,
        joinedPlayerId: outcome.joinedPlayerId,
      };
    }
    return apiErr("busy", "Server má teď moc požadavků najednou — zkus to hned znovu.");
  });

export const recoverAdminFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(4).max(8),
      recoveryCode: z.string().min(4).max(12),
    }),
  )
  .handler(async ({ data }) => {
    const db = requireDb();
    await ensureSchema(db);
    const row = await loadByCode(db, data.code);
    if (!row) return apiErr("not_found", "Turnaj s tímto kódem neexistuje.");
    if (row.state.recoveryCode !== data.recoveryCode.toUpperCase())
      return apiErr("bad_recovery", "Záchranný kód nesedí.");
    const admin = row.state.players.find((p) => p.isAdmin && !p.removed);
    if (!admin?.token) return apiErr("no_admin", "Pořadatel v turnaji chybí.");
    return {
      ok: true as const,
      token: admin.token,
      playerId: admin.id,
    };
  });
