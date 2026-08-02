import {
  EngineActionError,
  type GameVersion,
  type Hand,
  type Match,
  type Player,
  type Rng,
  type Team,
  type TournamentConfig,
  type TournamentState,
} from "./types";
import { randomId, randomJoinCode, randomToken, randInt, sample, shuffle } from "./random";
import { teamsForVersions, teamStars, TEAMS_BY_ID } from "./teams";

/* ----------------------------- helpers ----------------------------- */

function err(code: string, message: string): never {
  throw new EngineActionError(code, message);
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function playerCode(name: string, taken: Set<string>): string {
  const base = stripDiacritics(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  let code = (base + "XXX").slice(0, 3);
  let i = 2;
  while (taken.has(code)) {
    code = (base.slice(0, 2) + String(i)).slice(0, 3);
    i++;
  }
  return code;
}

function handKey(matchId: string, playerId: string): string {
  return `${matchId}:${playerId}`;
}

function getMatch(state: TournamentState, matchId: string): Match {
  const m = state.matches.find((x) => x.id === matchId);
  if (!m) err("match_not_found", "Zápas nenalezen.");
  return m;
}

function getPlayer(state: TournamentState, playerId: string): Player {
  const p = state.players.find((x) => x.id === playerId && !x.removed);
  if (!p) err("player_not_found", "Hráč nenalezen.");
  return p;
}

function matchPlayers(m: Match): string[] {
  return [m.home, m.away].filter((x): x is string => x !== null);
}

/* ----------------------------- pool ----------------------------- */

export function basePool(config: TournamentConfig): Team[] {
  return teamsForVersions(config.versions, config.includeNational).filter(
    (t) =>
      !config.banned.includes(t.id) &&
      teamStars(t, config.versions) >= config.minStars,
  );
}

/** Teams available to be dealt right now (fearless locks + outstanding hands). */
export function availableTeams(state: TournamentState): Team[] {
  const lockedIds = state.config.fearless
    ? new Set(state.locked.map((l) => l.teamId))
    : new Set<string>();
  const inHands = new Set(
    Object.values(state.hands).flatMap((h) => h.teamIds),
  );
  return basePool(state.config).filter((t) => !lockedIds.has(t.id) && !inHands.has(t.id));
}

export function poolStats(state: TournamentState) {
  const total = basePool(state.config).length;
  const locked = state.config.fearless ? state.locked.length : 0;
  const inHands = Object.values(state.hands).reduce((n, h) => n + h.teamIds.length, 0);
  return { total, locked, inHands, remaining: total - locked - inHands };
}

/* ----------------------------- schedule ----------------------------- */

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Circle-method round robin; returns rounds of [home, away] pairs. */
function roundRobinRounds(ids: string[]): [string, string][][] {
  const list: (string | null)[] = ids.slice();
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== null && b !== null) {
        // Alternate home/away a bit so the same player is not always first.
        round.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    rounds.push(round);
    // rotate (keep first fixed)
    list.splice(1, 0, list.pop() as string | null);
  }
  return rounds;
}

const KO_STAGE_BY_SIZE: Record<number, "f" | "sf" | "qf" | "r16"> = {
  1: "f",
  2: "sf",
  4: "qf",
  8: "r16",
};

/** Build a full knockout tree for `size` entrants (size is a power of two). */
function buildKnockoutTree(size: number, startOrder: number): Match[] {
  const matches: Match[] = [];
  let order = startOrder;
  let roundSize = size / 2; // matches in the first KO round
  let round = 1;
  const roundsMatches: Match[][] = [];
  while (roundSize >= 1) {
    const stage = KO_STAGE_BY_SIZE[roundSize] ?? "r16";
    const arr: Match[] = [];
    for (let i = 0; i < roundSize; i++) {
      arr.push({
        id: `ko-${round}-${i}`,
        order: order++,
        round: 100 + round,
        stage,
        home: null,
        away: null,
        picks: {},
        rerollsUsed: {},
        status: "pending",
      });
    }
    roundsMatches.push(arr);
    roundSize = roundSize / 2;
    round++;
  }
  for (let r = 0; r < roundsMatches.length - 1; r++) {
    roundsMatches[r].forEach((m, i) => {
      m.nextMatchId = roundsMatches[r + 1][Math.floor(i / 2)].id;
      m.nextSlot = i % 2 === 0 ? "home" : "away";
    });
  }
  for (const arr of roundsMatches) matches.push(...arr);
  return matches;
}

function buildSchedule(state: TournamentState, rng: Rng): Match[] {
  const ids = state.players.filter((p) => !p.removed).map((p) => p.id);
  const cfg = state.config;
  const matches: Match[] = [];
  let order = 1;

  if (cfg.format === "league") {
    const rounds = roundRobinRounds(shuffle(rng, ids));
    const laps = cfg.doubleRound ? 2 : 1;
    for (let lap = 0; lap < laps; lap++) {
      rounds.forEach((round, r) => {
        for (const [a, b] of round) {
          matches.push({
            id: `lg-${lap}-${r}-${matches.length}`,
            order: order++,
            round: lap * rounds.length + r + 1,
            stage: "league",
            home: lap === 0 ? a : b,
            away: lap === 0 ? b : a,
            picks: {},
            rerollsUsed: {},
            status: "pending",
          });
        }
      });
    }
    return matches;
  }

  if (cfg.format === "cup") {
    const shuffled = shuffle(rng, ids);
    const size = nextPow2(shuffled.length);
    const tree = buildKnockoutTree(size, order);
    const firstRound = tree.filter((m) => m.round === 101);
    const byes = size - shuffled.length;
    // Byes go to distinct first-round matches.
    const byeMatchIdx = sample(rng, firstRound.map((_, i) => i), byes);
    const byeSet = new Set(byeMatchIdx);
    let cursor = 0;
    firstRound.forEach((m, i) => {
      m.home = shuffled[cursor++] ?? null;
      if (!byeSet.has(i)) m.away = shuffled[cursor++] ?? null;
    });
    // Resolve byes: lone player advances, match never gets played.
    for (const m of firstRound) {
      if (m.home && !m.away) {
        m.status = "done";
        const next = tree.find((x) => x.id === m.nextMatchId);
        if (next && m.nextSlot) next[m.nextSlot] = m.home;
      }
    }
    return tree;
  }

  // groups + knockout
  const groups: ("A" | "B" | "C" | "D")[] =
    cfg.groupCount === 4 ? ["A", "B", "C", "D"] : ["A", "B"];
  const shuffled = shuffle(rng, ids);
  const byGroup: Record<string, string[]> = {};
  groups.forEach((g) => (byGroup[g] = []));
  shuffled.forEach((id, i) => byGroup[groups[i % groups.length]].push(id));
  groups.forEach((g) => {
    const rounds = roundRobinRounds(byGroup[g]);
    rounds.forEach((round, r) => {
      for (const [a, b] of round) {
        matches.push({
          id: `gr-${g}-${r}-${matches.length}`,
          order: order++,
          round: r + 1,
          stage: "group",
          group: g,
          home: a,
          away: b,
          picks: {},
          rerollsUsed: {},
          status: "pending",
        });
      }
    });
  });
  const koSize = cfg.groupCount === 4 ? 8 : 4; // top 2 advance from each group
  matches.push(...buildKnockoutTree(koSize, order));
  return matches;
}

/* ----------------------------- standings ----------------------------- */

export type StandingRow = {
  playerId: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

function computeRows(matches: Match[], playerIds: string[]): Map<string, StandingRow> {
  const rows = new Map<string, StandingRow>();
  for (const id of playerIds) {
    rows.set(id, { playerId: id, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }
  for (const m of matches) {
    if (!m.result || !m.home || !m.away) continue;
    const h = rows.get(m.home);
    const a = rows.get(m.away);
    if (!h || !a) continue;
    const { hg, ag } = m.result;
    h.mp++;
    a.mp++;
    h.gf += hg;
    h.ga += ag;
    a.gf += ag;
    a.ga += hg;
    if (hg > ag) {
      h.w++;
      a.l++;
      h.pts += 3;
    } else if (hg < ag) {
      a.w++;
      h.l++;
      a.pts += 3;
    } else {
      h.d++;
      a.d++;
      h.pts += 1;
      a.pts += 1;
    }
    h.gd = h.gf - h.ga;
    a.gd = a.gf - a.ga;
  }
  return rows;
}

/** Sort: Pts → GD → GF → head-to-head mini-table → name-stable. */
export function standings(
  matches: Match[],
  playerIds: string[],
  nameOf: (id: string) => string,
): StandingRow[] {
  const rows = [...computeRows(matches, playerIds).values()];
  const cmpBasic = (a: StandingRow, b: StandingRow) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;
  rows.sort(cmpBasic);
  // Resolve remaining ties via head-to-head among the tied set.
  const out: StandingRow[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j < rows.length && cmpBasic(rows[i], rows[j]) === 0) j++;
    const tied = rows.slice(i, j);
    if (tied.length > 1) {
      const ids = tied.map((r) => r.playerId);
      const sub = computeRows(
        matches.filter(
          (m) => m.home && m.away && ids.includes(m.home) && ids.includes(m.away),
        ),
        ids,
      );
      tied.sort((a, b) => {
        const sa = sub.get(a.playerId)!;
        const sb = sub.get(b.playerId)!;
        return (
          sb.pts - sa.pts ||
          sb.gd - sa.gd ||
          sb.gf - sa.gf ||
          nameOf(a.playerId).localeCompare(nameOf(b.playerId), "cs")
        );
      });
    }
    out.push(...tied);
    i = j;
  }
  return out;
}

/* ----------------------------- turn logic ----------------------------- */

/**
 * A match can draw/pick when every earlier real match already has both picks
 * and at most one earlier match is still waiting for its result. That keeps
 * the living-room pipeline: one match on the console, the next one drawing.
 */
export function isMatchOpenForPicks(state: TournamentState, match: Match): boolean {
  if (state.phase !== "playing") return false;
  if (match.status === "done" || !match.home || !match.away) return false;
  let unresolved = 0;
  for (const m of state.matches) {
    if (m.order >= match.order) break;
    if (m.status === "done" || !m.home || !m.away) continue;
    const picksDone = matchPlayers(m).every((p) => m.picks[p]);
    if (!picksDone) return false;
    unresolved++;
  }
  return unresolved <= 1;
}

/** First not-done playable match — what the room is playing right now. */
export function currentMatch(state: TournamentState): Match | undefined {
  return state.matches.find((m) => m.status !== "done" && m.home && m.away);
}

/* ----------------------------- band / dealing ----------------------------- */

const BAND_STEPS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];

function starsOf(state: TournamentState, t: Team): number {
  return teamStars(t, state.config.versions);
}

function pickBand(
  state: TournamentState,
  rng: Rng,
  pool: Team[],
  needed: number,
): { min: number; max: number } | undefined {
  for (const width of [0.5, 1]) {
    const bands = BAND_STEPS.map((hi) => ({ min: hi - width, max: hi })).filter(
      (b) => pool.filter((t) => starsOf(state, t) >= b.min && starsOf(state, t) <= b.max).length >= needed,
    );
    if (bands.length > 0) return bands[randInt(rng, bands.length)];
  }
  return undefined;
}

function dealInternal(
  state: TournamentState,
  rng: Rng,
  now: number,
  matchId: string,
  playerId: string,
): void {
  const match = getMatch(state, matchId);
  if (!matchPlayers(match).includes(playerId)) err("not_in_match", "Tento zápas nehraješ.");
  if (match.result) err("match_done", "Zápas už má výsledek.");
  if (match.picks[playerId]) err("already_picked", "Tým už sis vybral.");
  if (state.hands[handKey(matchId, playerId)]) return; // idempotent
  if (!isMatchOpenForPicks(state, match)) err("not_your_turn", "Tenhle zápas ještě není na řadě.");
  if (state.exhaustion) err("pool_exhausted", "Osudí je vyčerpané — čeká se na rozhodnutí pořadatele.");

  const cfg = state.config;
  let pool = availableTeams(state);

  const opponentId = matchPlayers(match).find((p) => p !== playerId);
  const opponentHasHand = opponentId
    ? Boolean(state.hands[handKey(matchId, opponentId)])
    : false;
  const opponentPicked = opponentId ? Boolean(match.picks[opponentId]) : true;

  if (cfg.balanced) {
    if (!match.band) {
      // Reserve room for the opponent's hand from the same band.
      const needed = cfg.handSize * (opponentHasHand || opponentPicked ? 1 : 2);
      const band = pickBand(state, rng, pool, needed);
      if (band) match.band = band;
    }
    if (match.band) {
      const inBand = pool.filter(
        (t) => starsOf(state, t) >= match.band!.min && starsOf(state, t) <= match.band!.max,
      );
      if (inBand.length >= cfg.handSize) pool = inBand;
      // If the band ran dry meanwhile, fall through to the full pool.
    }
  }

  if (pool.length < cfg.handSize) {
    state.exhaustion = { matchId, playerId, available: pool.length };
    state.history.push({ at: now, type: "exhaustion", matchId, playerId });
    return;
  }

  const teams = sample(rng, pool, cfg.handSize);
  state.hands[handKey(matchId, playerId)] = {
    matchId,
    playerId,
    teamIds: teams.map((t) => t.id),
    dealtAt: now,
  };
  state.history.push({
    at: now,
    type: "deal",
    matchId,
    playerId,
    teamIds: teams.map((t) => t.id),
  });
}

/* ----------------------------- KO plumbing ----------------------------- */

function winnerOf(m: Match): string | null {
  if (!m.result || !m.home || !m.away) return m.status === "done" ? m.home : null;
  const { hg, ag, penWinner } = m.result;
  if (hg > ag) return m.home;
  if (ag > hg) return m.away;
  return penWinner ?? null;
}

function propagateKnockout(state: TournamentState, m: Match): void {
  const w = winnerOf(m);
  if (!w) return;
  if (!m.nextMatchId) {
    if (m.stage === "f") {
      state.phase = "finished";
      state.winnerId = w;
    }
    return;
  }
  const next = getMatch(state, m.nextMatchId);
  if (m.nextSlot) next[m.nextSlot] = w;
}

/** When all group matches are done, seed the knockout tree. */
function maybeSeedKnockout(state: TournamentState): void {
  if (state.config.format !== "groups") return;
  const groupMatches = state.matches.filter((m) => m.stage === "group");
  if (!groupMatches.every((m) => m.status === "done")) return;
  const firstKo = state.matches.find((m) => m.round === 101);
  if (!firstKo || firstKo.home) return; // already seeded
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  const groups = state.config.groupCount === 4 ? ["A", "B", "C", "D"] : ["A", "B"];
  const top: Record<string, string[]> = {};
  for (const g of groups) {
    const ms = groupMatches.filter((m) => m.group === g);
    const ids = [...new Set(ms.flatMap((m) => matchPlayers(m)))];
    top[g] = standings(ms, ids, nameOf)
      .slice(0, 2)
      .map((r) => r.playerId);
  }
  const ko = state.matches.filter((m) => m.round === 101).sort((a, b) => a.order - b.order);
  const pairings: [string, string][] =
    state.config.groupCount === 4
      ? [
          [top.A[0], top.B[1]],
          [top.C[0], top.D[1]],
          [top.B[0], top.A[1]],
          [top.D[0], top.C[1]],
        ]
      : [
          [top.A[0], top.B[1]],
          [top.B[0], top.A[1]],
        ];
  ko.forEach((m, i) => {
    if (pairings[i]) {
      m.home = pairings[i][0];
      m.away = pairings[i][1];
    }
  });
}

function maybeFinishLeague(state: TournamentState): void {
  if (state.config.format !== "league") return;
  if (!state.matches.every((m) => m.status === "done")) return;
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  const ids = state.players.filter((p) => !p.removed).map((p) => p.id);
  const rows = standings(state.matches, ids, nameOf);
  state.phase = "finished";
  state.winnerId = rows[0]?.playerId;
}

/* ----------------------------- actions ----------------------------- */

export type EngineAction =
  | { type: "join"; name: string }
  | { type: "rename"; playerId: string; name: string }
  | { type: "kick"; playerId: string }
  | { type: "replace"; playerId: string; newName: string }
  | { type: "updateConfig"; config: Partial<TournamentConfig> }
  | { type: "start" }
  | { type: "deal"; matchId: string; playerId: string }
  | { type: "reroll"; matchId: string; playerId: string }
  | { type: "pick"; matchId: string; playerId: string; teamId: string }
  | { type: "result"; matchId: string; hg: number; ag: number; penWinner?: string }
  | { type: "editResult"; matchId: string; hg: number; ag: number; penWinner?: string }
  | { type: "resolveExhaustion"; option: "reduce" | "release" | "disable" }
  | { type: "undo" };

export type ActionContext = {
  rng: Rng;
  now: number;
  /** Acting player id, or null for a not-yet-joined visitor. */
  actorId: string | null;
  isAdmin: boolean;
};

const ADMIN_ONLY = new Set([
  "rename",
  "kick",
  "replace",
  "updateConfig",
  "start",
  "result",
  "editResult",
  "resolveExhaustion",
  "undo",
]);

/** Internal undo snapshot attached to the state JSON (admin actions only). */
type StateWithUndo = TournamentState & { _undo?: TournamentState };

export function createTournament(
  rng: Rng,
  now: number,
  config: TournamentConfig,
  adminName: string,
): { state: TournamentState; adminToken: string; recoveryCode: string } {
  if (config.maxPlayers < 2 || config.maxPlayers > 16)
    err("bad_config", "Počet hráčů musí být 2–16.");
  if (config.versions.length === 0) err("bad_config", "Vyber aspoň jednu verzi hry.");
  if (config.handSize < 1 || config.handSize > 5) err("bad_config", "Velikost ruky 1–5.");
  const name = adminName.trim();
  if (!name) err("bad_name", "Zadej přezdívku.");
  const adminToken = randomToken(rng);
  const recoveryCode = randomJoinCode(rng, 8);
  const state: TournamentState = {
    id: randomId(rng),
    code: randomJoinCode(rng, 5),
    createdAt: now,
    phase: "lobby",
    config,
    players: [
      {
        id: randomId(rng, 10),
        name,
        code: playerCode(name, new Set()),
        isAdmin: true,
        token: adminToken,
        joinedAt: now,
      },
    ],
    matches: [],
    hands: {},
    locked: [],
    history: [],
    recoveryCode,
  };
  return { state, adminToken, recoveryCode };
}

export function applyAction(
  prev: TournamentState,
  action: EngineAction,
  ctx: ActionContext,
): { state: TournamentState; joinedToken?: string; joinedPlayerId?: string } {
  const state = clone(prev) as StateWithUndo;
  const { rng, now } = ctx;

  if (ADMIN_ONLY.has(action.type) && !ctx.isAdmin)
    err("forbidden", "Tohle může udělat jen pořadatel.");

  // Keep a single-level undo snapshot before admin mutations.
  if (ctx.isAdmin && action.type !== "undo" && action.type !== "deal") {
    const snap = clone(prev) as StateWithUndo;
    delete snap._undo;
    state._undo = snap;
  }

  switch (action.type) {
    case "join": {
      if (state.phase !== "lobby") err("not_lobby", "Turnaj už běží, připojit se dá jen před startem.");
      const active = state.players.filter((p) => !p.removed);
      if (active.length >= state.config.maxPlayers) err("full", "Turnaj je plný.");
      const name = action.name.trim().slice(0, 20);
      if (!name) err("bad_name", "Zadej přezdívku.");
      if (active.some((p) => p.name.toLowerCase() === name.toLowerCase()))
        err("dup_name", "Tuhle přezdívku už někdo má.");
      const token = randomToken(rng);
      const player: Player = {
        id: randomId(rng, 10),
        name,
        code: playerCode(name, new Set(active.map((p) => p.code))),
        isAdmin: false,
        token,
        joinedAt: now,
      };
      state.players.push(player);
      state.history.push({ at: now, type: "join", playerId: player.id });
      return { state, joinedToken: token, joinedPlayerId: player.id };
    }

    case "rename": {
      const p = getPlayer(state, action.playerId);
      const name = action.name.trim().slice(0, 20);
      if (!name) err("bad_name", "Zadej přezdívku.");
      p.name = name;
      p.code = playerCode(
        name,
        new Set(state.players.filter((x) => x.id !== p.id && !x.removed).map((x) => x.code)),
      );
      state.history.push({ at: now, type: "rename", playerId: p.id, text: name });
      return { state };
    }

    case "kick": {
      if (state.phase !== "lobby")
        err("not_lobby", "Po startu jde hráč jen nahradit, ne odebrat.");
      const p = getPlayer(state, action.playerId);
      if (p.isAdmin) err("cant_kick_admin", "Pořadatele odebrat nejde.");
      p.removed = true;
      state.history.push({ at: now, type: "kick", playerId: p.id });
      return { state };
    }

    case "replace": {
      const p = getPlayer(state, action.playerId);
      const name = action.newName.trim().slice(0, 20);
      if (!name) err("bad_name", "Zadej přezdívku.");
      p.name = name;
      p.code = playerCode(
        name,
        new Set(state.players.filter((x) => x.id !== p.id && !x.removed).map((x) => x.code)),
      );
      p.token = randomToken(rng);
      state.history.push({ at: now, type: "replace", playerId: p.id, text: name });
      return { state, joinedToken: p.token, joinedPlayerId: p.id };
    }

    case "updateConfig": {
      if (state.phase !== "lobby") err("not_lobby", "Nastavení jde měnit jen před startem.");
      state.config = { ...state.config, ...action.config };
      return { state };
    }

    case "start": {
      if (state.phase !== "lobby") err("not_lobby", "Turnaj už odstartoval.");
      const active = state.players.filter((p) => !p.removed);
      if (active.length < 2) err("too_few", "Potřebuješ aspoň 2 hráče.");
      if (state.config.format === "groups" && active.length < 4)
        err("too_few", "Skupiny potřebují aspoň 4 hráče.");
      if (state.config.format === "groups" && state.config.groupCount === 4 && active.length < 8)
        err("too_few", "4 skupiny potřebují aspoň 8 hráčů.");
      const pool = basePool(state.config);
      const perMatchNeed = state.config.handSize * 2;
      if (pool.length < perMatchNeed)
        err("pool_small", "V osudí je málo týmů — uber bany nebo přidej verze.");
      state.matches = buildSchedule(state, rng);
      state.phase = "playing";
      state.history.push({ at: now, type: "start" });
      return { state };
    }

    case "deal": {
      if (!ctx.isAdmin && ctx.actorId !== action.playerId)
        err("forbidden", "Losovat můžeš jen za sebe.");
      dealInternal(state, rng, now, action.matchId, action.playerId);
      return { state };
    }

    case "reroll": {
      if (!ctx.isAdmin && ctx.actorId !== action.playerId)
        err("forbidden", "Nový los můžeš vzít jen za sebe.");
      const match = getMatch(state, action.matchId);
      const key = handKey(action.matchId, action.playerId);
      if (!state.hands[key]) err("no_hand", "Nemáš rozdanou ruku.");
      const used = match.rerollsUsed[action.playerId] ?? 0;
      if (used >= state.config.rerollsPerMatch)
        err("no_rerolls", "Nové losy jsou vyčerpané.");
      match.rerollsUsed[action.playerId] = used + 1;
      const oldTeams = state.hands[key].teamIds;
      delete state.hands[key]; // discarded teams return to the pool
      state.history.push({
        at: now,
        type: "reroll",
        matchId: action.matchId,
        playerId: action.playerId,
        teamIds: oldTeams,
      });
      dealInternal(state, rng, now, action.matchId, action.playerId);
      return { state };
    }

    case "pick": {
      if (!ctx.isAdmin && ctx.actorId !== action.playerId)
        err("forbidden", "Vybrat tým můžeš jen za sebe.");
      const match = getMatch(state, action.matchId);
      const key = handKey(action.matchId, action.playerId);
      const hand = state.hands[key];
      if (!hand) err("no_hand", "Nemáš rozdanou ruku.");
      if (!hand.teamIds.includes(action.teamId)) err("not_in_hand", "Tenhle tým v ruce nemáš.");
      if (
        state.config.fearless &&
        state.locked.some((l) => l.teamId === action.teamId)
      )
        err("team_locked", "Tým už byl mezitím odehrán — vyber jiný.");
      match.picks[action.playerId] = action.teamId;
      delete state.hands[key]; // the two unpicked teams return to the pool
      state.locked.push({
        teamId: action.teamId,
        playerId: action.playerId,
        matchId: action.matchId,
        at: now,
      });
      if (matchPlayers(match).every((p) => match.picks[p])) match.status = "ready";
      state.history.push({
        at: now,
        type: "pick",
        matchId: action.matchId,
        playerId: action.playerId,
        teamId: action.teamId,
        byAdmin: ctx.isAdmin && ctx.actorId !== action.playerId,
      });
      return { state };
    }

    case "result":
    case "editResult": {
      const match = getMatch(state, action.matchId);
      if (!match.home || !match.away) err("match_not_ready", "Zápas ještě nemá oba hráče.");
      if (action.type === "result" && match.result) err("has_result", "Výsledek už je zadaný — použij úpravu.");
      if (action.type === "editResult" && !match.result) err("no_result", "Zápas ještě nemá výsledek.");
      if (!matchPlayers(match).every((p) => match.picks[p]))
        err("picks_missing", "Nejdřív musí oba hráči vylosovat a vybrat tým.");
      const hg = Math.floor(action.hg);
      const ag = Math.floor(action.ag);
      if (hg < 0 || ag < 0 || hg > 99 || ag > 99) err("bad_score", "Neplatné skóre.");
      const isKo = match.stage !== "league" && match.stage !== "group";
      if (isKo && hg === ag) {
        if (!action.penWinner || !matchPlayers(match).includes(action.penWinner))
          err("pen_needed", "Při remíze ve vyřazovacím zápase vyber vítěze penalt.");
      }
      if (action.type === "editResult") {
        // Do not rewrite history if the bracket already moved on.
        if (match.nextMatchId) {
          const next = getMatch(state, match.nextMatchId);
          const nextStarted =
            Object.keys(next.picks).length > 0 || Boolean(next.result);
          const oldWinner = winnerOf(match);
          if (nextStarted) {
            const newWinner =
              hg > ag ? match.home : ag > hg ? match.away : (action.penWinner ?? null);
            if (newWinner !== oldWinner)
              err(
                "bracket_locked",
                "Další zápas pavouka už začal — výsledek jde upravit jen se stejným vítězem.",
              );
          }
          // When the next match has not started, re-propagation below is safe.
        }
      }
      match.result = {
        hg,
        ag,
        penWinner: isKo && hg === ag ? action.penWinner : undefined,
        enteredAt: now,
      };
      match.status = "done";
      state.history.push({
        at: now,
        type: action.type === "result" ? "result" : "result_edit",
        matchId: match.id,
        text: `${hg}:${ag}${match.result.penWinner ? " pen" : ""}`,
      });
      if (match.nextMatchId || match.stage === "f") propagateKnockout(state, match);
      maybeSeedKnockout(state);
      maybeFinishLeague(state);
      return { state };
    }

    case "resolveExhaustion": {
      if (!state.exhaustion) err("no_exhaustion", "Osudí není vyčerpané.");
      const info = state.exhaustion;
      if (action.option === "reduce") {
        if (state.config.handSize <= 1) err("cant_reduce", "Ruka už je nejmenší možná.");
        state.config.handSize -= 1;
      } else if (action.option === "release") {
        // Release the oldest locked third back to the pool (at least handSize).
        const n = Math.max(state.config.handSize, Math.ceil(state.locked.length / 3));
        state.locked.splice(0, n);
      } else {
        state.config.fearless = false;
      }
      state.exhaustion = undefined;
      state.history.push({ at: now, type: "exhaustion", text: action.option });
      // Retry the stuck deal with the relaxed rules.
      dealInternal(state, rng, now, info.matchId, info.playerId);
      const still = state.exhaustion as TournamentState["exhaustion"];
      if (still) {
        // Still exhausted — surface fresh numbers for the admin.
        still.available = availableTeams(state).length;
      }
      return { state };
    }

    case "undo": {
      const snap = state._undo;
      if (!snap) err("nothing_to_undo", "Není co vzít zpět.");
      const restored = clone(snap) as StateWithUndo;
      delete restored._undo;
      restored.history.push({ at: now, type: "undo" });
      return { state: restored };
    }
  }
}

/* ----------------------------- views ----------------------------- */

export type ViewerRole = { playerId: string | null; isAdmin: boolean };

/** Client-facing state: tokens stripped, hands scoped to the viewer. */
export function toView(state: TournamentState, viewer: ViewerRole): TournamentState {
  const v = clone(state) as StateWithUndo;
  delete v._undo;
  delete v.recoveryCode;
  for (const p of v.players) delete p.token;
  if (!viewer.isAdmin) {
    const mine: Record<string, Hand> = {};
    for (const [k, h] of Object.entries(v.hands)) {
      if (h.playerId === viewer.playerId) mine[k] = h;
    }
    v.hands = mine;
    // Draw history details (offered hands) are admin-only.
    v.history = v.history.map((e) =>
      (e.type === "deal" || e.type === "reroll") && e.playerId !== viewer.playerId
        ? { ...e, teamIds: undefined }
        : e,
    );
  }
  return v;
}

export function findPlayerByToken(
  state: TournamentState,
  token: string | null | undefined,
): Player | undefined {
  if (!token) return undefined;
  return state.players.find((p) => p.token === token && !p.removed);
}

export { teamName, teamStars, teamsForVersions, TEAMS_BY_ID } from "./teams";
export type { GameVersion };
