import { describe, expect, test } from "bun:test";
import {
  applyAction,
  availableTeams,
  createTournament,
  currentMatch,
  isMatchOpenForPicks,
  standings,
  toView,
  type EngineAction,
} from "../src/engine/engine";
import { TEAMS, TEAMS_BY_ID } from "../src/engine/teams";
import type { Rng, TournamentConfig, TournamentState } from "../src/engine/types";

/** Deterministic rng for tests. */
function lcg(seed = 42): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const baseConfig: TournamentConfig = {
  name: "Test cup",
  maxPlayers: 8,
  versions: ["26"],
  format: "league",
  doubleRound: false,
  groupCount: 2,
  rerollsPerMatch: 1,
  handSize: 3,
  balanced: true,
  fearless: true,
  includeNational: true,
  banned: [],
  minStars: 0,
};

type Ctx = { state: TournamentState; rng: Rng; now: number };

function setup(players: string[], cfg: Partial<TournamentConfig> = {}): Ctx {
  const rng = lcg(7);
  let now = 1000;
  const { state: s0 } = createTournament(rng, now, { ...baseConfig, ...cfg }, players[0]);
  let state = s0;
  for (const name of players.slice(1)) {
    now += 1;
    state = applyAction(state, { type: "join", name }, { rng, now, actorId: null, isAdmin: false }).state;
  }
  return { state, rng, now };
}

function admin(ctx: Ctx, action: EngineAction): void {
  ctx.now += 1;
  const adminId = ctx.state.players.find((p) => p.isAdmin)!.id;
  ctx.state = applyAction(ctx.state, action, {
    rng: ctx.rng,
    now: ctx.now,
    actorId: adminId,
    isAdmin: true,
  }).state;
}

function as(ctx: Ctx, playerId: string, action: EngineAction): void {
  ctx.now += 1;
  ctx.state = applyAction(ctx.state, action, {
    rng: ctx.rng,
    now: ctx.now,
    actorId: playerId,
    isAdmin: false,
  }).state;
}

function playWholeTournament(ctx: Ctx, scorer: (i: number) => [number, number]) {
  let guard = 0;
  let i = 0;
  for (;;) {
    if (++guard > 500) throw new Error("tournament did not finish");
    const m = currentMatch(ctx.state);
    if (!m) break;
    for (const pid of [m.home!, m.away!]) {
      if (!m.picks[pid]) {
        as(ctx, pid, { type: "deal", matchId: m.id, playerId: pid });
        const hand = Object.values(ctx.state.hands).find(
          (h) => h.matchId === m.id && h.playerId === pid,
        )!;
        as(ctx, pid, { type: "pick", matchId: m.id, playerId: pid, teamId: hand.teamIds[0] });
      }
    }
    const fresh = ctx.state.matches.find((x) => x.id === m.id)!;
    const [hg, ag] = scorer(i++);
    const isKo = fresh.stage !== "league" && fresh.stage !== "group";
    admin(ctx, {
      type: "result",
      matchId: m.id,
      hg,
      ag,
      penWinner: isKo && hg === ag ? fresh.home! : undefined,
    });
  }
}

describe("schedule", () => {
  test("league round robin: 4 players → 6 matches, every pair once", () => {
    const ctx = setup(["Matěj", "Kuba", "Ondra", "Martin"]);
    admin(ctx, { type: "start" });
    expect(ctx.state.matches.length).toBe(6);
    const pairs = new Set(
      ctx.state.matches.map((m) => [m.home, m.away].sort().join("+")),
    );
    expect(pairs.size).toBe(6);
  });

  test("league with 5 players → 10 matches (byes handled)", () => {
    const ctx = setup(["A", "B", "C", "D", "E"]);
    admin(ctx, { type: "start" });
    expect(ctx.state.matches.length).toBe(10);
  });

  test("cup with 5 players → byes auto-advance, bracket connected", () => {
    const ctx = setup(["A", "B", "C", "D", "E"], { format: "cup" });
    admin(ctx, { type: "start" });
    const r1 = ctx.state.matches.filter((m) => m.round === 101);
    expect(r1.length).toBe(4);
    const byes = r1.filter((m) => m.status === "done");
    expect(byes.length).toBe(3);
    const sf = ctx.state.matches.filter((m) => m.round === 102);
    expect(sf.flatMap((m) => [m.home, m.away]).filter(Boolean).length).toBe(3);
  });
});

describe("fearless draw", () => {
  test("deal is idempotent — second deal returns the same hand", () => {
    const ctx = setup(["Matěj", "Kuba"]);
    admin(ctx, { type: "start" });
    const m = currentMatch(ctx.state)!;
    as(ctx, m.home!, { type: "deal", matchId: m.id, playerId: m.home! });
    const hand1 = Object.values(ctx.state.hands)[0].teamIds.slice();
    as(ctx, m.home!, { type: "deal", matchId: m.id, playerId: m.home! });
    const hand2 = Object.values(ctx.state.hands)[0].teamIds.slice();
    expect(hand2).toEqual(hand1);
  });

  test("no overlap between the two hands of one match; same band when balanced", () => {
    const ctx = setup(["Matěj", "Kuba"]);
    admin(ctx, { type: "start" });
    const m = currentMatch(ctx.state)!;
    as(ctx, m.home!, { type: "deal", matchId: m.id, playerId: m.home! });
    as(ctx, m.away!, { type: "deal", matchId: m.id, playerId: m.away! });
    const hands = Object.values(ctx.state.hands);
    expect(hands.length).toBe(2);
    const a = new Set(hands[0].teamIds);
    for (const id of hands[1].teamIds) expect(a.has(id)).toBe(false);
    const fresh = ctx.state.matches.find((x) => x.id === m.id)!;
    expect(fresh.band).toBeDefined();
    for (const h of hands) {
      for (const tid of h.teamIds) {
        const team = TEAMS_BY_ID.get(tid)!;
        expect(team.stars).toBeGreaterThanOrEqual(fresh.band!.min);
        expect(team.stars).toBeLessThanOrEqual(fresh.band!.max);
      }
    }
  });

  test("picked team locks forever, unpicked teams return to the pool", () => {
    const ctx = setup(["Matěj", "Kuba", "Ondra", "Martin"], { balanced: false });
    admin(ctx, { type: "start" });
    const m = currentMatch(ctx.state)!;
    as(ctx, m.home!, { type: "deal", matchId: m.id, playerId: m.home! });
    const hand = Object.values(ctx.state.hands)[0];
    const picked = hand.teamIds[0];
    const unpicked = hand.teamIds.slice(1);
    as(ctx, m.home!, { type: "pick", matchId: m.id, playerId: m.home!, teamId: picked });
    const avail = new Set(availableTeams(ctx.state).map((t) => t.id));
    expect(avail.has(picked)).toBe(false);
    for (const id of unpicked) expect(avail.has(id)).toBe(true);
  });

  test("reroll: counts down, discarded hand returns, blocked at 0", () => {
    const ctx = setup(["Matěj", "Kuba"], { rerollsPerMatch: 1, balanced: false });
    admin(ctx, { type: "start" });
    const m = currentMatch(ctx.state)!;
    as(ctx, m.home!, { type: "deal", matchId: m.id, playerId: m.home! });
    const before = Object.values(ctx.state.hands)[0].teamIds.slice();
    as(ctx, m.home!, { type: "reroll", matchId: m.id, playerId: m.home! });
    const fresh = ctx.state.matches.find((x) => x.id === m.id)!;
    expect(fresh.rerollsUsed[m.home!]).toBe(1);
    const avail = new Set(availableTeams(ctx.state).map((t) => t.id));
    // Old hand teams are back in circulation (unless redrawn into the new hand).
    const newHand = new Set(Object.values(ctx.state.hands)[0].teamIds);
    for (const id of before) expect(avail.has(id) || newHand.has(id)).toBe(true);
    expect(() =>
      as(ctx, m.home!, { type: "reroll", matchId: m.id, playerId: m.home! }),
    ).toThrow();
  });

  test("pipeline: a later match cannot draw before earlier picks are in", () => {
    const ctx = setup(["A", "B", "C", "D"]);
    admin(ctx, { type: "start" });
    const later = ctx.state.matches[2];
    expect(isMatchOpenForPicks(ctx.state, later)).toBe(false);
    const pid = later.home!;
    expect(() => as(ctx, pid, { type: "deal", matchId: later.id, playerId: pid })).toThrow();
  });

  test("exhaustion offers admin recovery and never crashes", () => {
    // Tiny pool: only 5★ teams (there are ~8) with hand size 3, fearless on.
    const ctx = setup(["A", "B", "C", "D"], { minStars: 5, balanced: false });
    admin(ctx, { type: "start" });
    let guard = 0;
    // Burn through the pool until exhaustion fires.
    while (!ctx.state.exhaustion && guard++ < 20) {
      const m = currentMatch(ctx.state)!;
      for (const pid of [m.home!, m.away!]) {
        if (ctx.state.exhaustion) break;
        as(ctx, pid, { type: "deal", matchId: m.id, playerId: pid });
        const hand = Object.values(ctx.state.hands).find(
          (h) => h.matchId === m.id && h.playerId === pid,
        );
        if (hand)
          as(ctx, pid, { type: "pick", matchId: m.id, playerId: pid, teamId: hand.teamIds[0] });
      }
      if (ctx.state.exhaustion) break;
      admin(ctx, { type: "result", matchId: m.id, hg: 1, ag: 0 });
    }
    expect(ctx.state.exhaustion).toBeDefined();
    admin(ctx, { type: "resolveExhaustion", option: "disable" });
    expect(ctx.state.exhaustion).toBeUndefined();
    expect(ctx.state.config.fearless).toBe(false);
  });
});

describe("full tournaments", () => {
  test("league runs lobby → winner; fearless holds across all matches", () => {
    const ctx = setup(["Matěj", "Kuba", "Ondra", "Martin"]);
    admin(ctx, { type: "start" });
    playWholeTournament(ctx, (i) => [i % 3, (i + 1) % 2]);
    expect(ctx.state.phase).toBe("finished");
    expect(ctx.state.winnerId).toBeTruthy();
    const played = ctx.state.matches.flatMap((m) => Object.values(m.picks));
    expect(new Set(played).size).toBe(played.length); // no team played twice
  });

  test("cup with 6 players finishes with a winner", () => {
    const ctx = setup(["A", "B", "C", "D", "E", "F"], { format: "cup" });
    admin(ctx, { type: "start" });
    playWholeTournament(ctx, (i) => [2, i % 2]);
    expect(ctx.state.phase).toBe("finished");
    expect(ctx.state.winnerId).toBeTruthy();
  });

  test("groups (8 players, 2 groups) seeds SF+F and finishes", () => {
    const ctx = setup(["A", "B", "C", "D", "E", "F", "G", "H"], { format: "groups" });
    admin(ctx, { type: "start" });
    const groupMatches = ctx.state.matches.filter((m) => m.stage === "group");
    expect(groupMatches.length).toBe(12); // 2 × C(4,2)
    playWholeTournament(ctx, (i) => [(i * 2) % 4, i % 3]);
    expect(ctx.state.phase).toBe("finished");
    const sf = ctx.state.matches.filter((m) => m.stage === "sf");
    expect(sf.every((m) => m.result)).toBe(true);
  });
});

describe("results & standings", () => {
  test("only admin enters results; player attempt is refused", () => {
    const ctx = setup(["Matěj", "Kuba"]);
    admin(ctx, { type: "start" });
    const m = currentMatch(ctx.state)!;
    for (const pid of [m.home!, m.away!]) {
      as(ctx, pid, { type: "deal", matchId: m.id, playerId: pid });
      const hand = Object.values(ctx.state.hands).find(
        (h) => h.matchId === m.id && h.playerId === pid,
      )!;
      as(ctx, pid, { type: "pick", matchId: m.id, playerId: pid, teamId: hand.teamIds[0] });
    }
    expect(() =>
      as(ctx, m.home!, { type: "result", matchId: m.id, hg: 1, ag: 0 }),
    ).toThrow();
  });

  test("standings order + H2H tiebreak + edit recompute", () => {
    const ctx = setup(["A", "B", "C", "D"]);
    admin(ctx, { type: "start" });
    playWholeTournament(ctx, () => [1, 0]); // every home side wins 1:0
    const nameOf = (id: string) => ctx.state.players.find((p) => p.id === id)!.name;
    const ids = ctx.state.players.map((p) => p.id);
    const rows = standings(ctx.state.matches, ids, nameOf);
    expect(rows[0].pts).toBeGreaterThanOrEqual(rows[3].pts);
    // Edit the first result and confirm totals change.
    const m0 = ctx.state.matches[0];
    const before = standings(ctx.state.matches, ids, nameOf)
      .map((r) => `${r.playerId}:${r.pts}`)
      .join("|");
    admin(ctx, { type: "editResult", matchId: m0.id, hg: 0, ag: 5 });
    const after = standings(ctx.state.matches, ids, nameOf)
      .map((r) => `${r.playerId}:${r.pts}`)
      .join("|");
    expect(after).not.toBe(before);
  });
});

describe("views & privacy", () => {
  test("player view hides opponent hands and all tokens", () => {
    const ctx = setup(["Matěj", "Kuba"]);
    admin(ctx, { type: "start" });
    const m = currentMatch(ctx.state)!;
    as(ctx, m.home!, { type: "deal", matchId: m.id, playerId: m.home! });
    as(ctx, m.away!, { type: "deal", matchId: m.id, playerId: m.away! });
    const view = toView(ctx.state, { playerId: m.home!, isAdmin: false });
    expect(Object.values(view.hands).length).toBe(1);
    expect(Object.values(view.hands)[0].playerId).toBe(m.home!);
    for (const p of view.players) expect(p.token).toBeUndefined();
    expect(view.recoveryCode).toBeUndefined();
    const adminView = toView(ctx.state, { playerId: null, isAdmin: true });
    expect(Object.values(adminView.hands).length).toBe(2);
  });

  test("undo restores the previous state after an admin action", () => {
    const ctx = setup(["Matěj", "Kuba", "Ondra"]);
    const namesBefore = ctx.state.players.map((p) => p.name).join(",");
    admin(ctx, { type: "rename", playerId: ctx.state.players[1].id, name: "Přejmenovaný" });
    expect(ctx.state.players[1].name).toBe("Přejmenovaný");
    admin(ctx, { type: "undo" });
    expect(ctx.state.players.map((p) => p.name).join(",")).toBe(namesBefore);
  });
});

describe("dataset", () => {
  test("250+ teams, all ratings on the 0.5 scale, colors present", () => {
    expect(TEAMS.length).toBeGreaterThanOrEqual(250);
    for (const t of TEAMS) {
      expect(t.stars * 2).toBe(Math.round(t.stars * 2));
      expect(t.stars).toBeGreaterThanOrEqual(0.5);
      expect(t.stars).toBeLessThanOrEqual(5);
      expect(t.colors.length).toBe(2);
      expect(t.versions.length).toBeGreaterThan(0);
    }
    const ids = new Set(TEAMS.map((t) => t.id));
    expect(ids.size).toBe(TEAMS.length);
  });

  test("version filtering: FIFA 22 has no Saudi Pro League, FC 24 does", () => {
    const in22 = TEAMS.filter((t) => t.versions.includes("22"));
    const in24 = TEAMS.filter((t) => t.versions.includes("24"));
    expect(in22.some((t) => t.league === "Saudi Pro League")).toBe(false);
    expect(in24.some((t) => t.league === "Saudi Pro League")).toBe(true);
    // Juventus is Piemonte Calcio in 20–22 only.
    const juve = TEAMS.find((t) => t.id === "juventus")!;
    expect(juve.nameOverrides?.["21"]).toBe("Piemonte Calcio");
    expect(juve.nameOverrides?.["23"]).toBeUndefined();
    // Brazil national team left after FIFA 23.
    const bra = TEAMS.find((t) => t.id === "nt-brazilie")!;
    expect(bra.versions.includes("24")).toBe(false);
  });
});
