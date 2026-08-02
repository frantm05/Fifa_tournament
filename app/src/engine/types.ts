/** Game versions covered: FIFA 17 … EA FC 26, keyed "17".."26". */
export type GameVersion =
  | "17"
  | "18"
  | "19"
  | "20"
  | "21"
  | "22"
  | "23"
  | "24"
  | "25"
  | "26";

export const ALL_VERSIONS: GameVersion[] = [
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
];

export type Team = {
  id: string;
  /** 2–4 letter display code used on procedural crests and tickers. */
  code: string;
  name: string;
  league: string;
  nation: string;
  /** Baseline star rating (latest version), 0.5 steps on the 0.5–5 scale. */
  stars: number;
  /** Versions of the game this team appears in. */
  versions: GameVersion[];
  /** Licensing reality: e.g. Juventus = "Piemonte Calcio" in 20–22. */
  nameOverrides?: Partial<Record<GameVersion, string>>;
  starOverrides?: Partial<Record<GameVersion, number>>;
  /** [primary, secondary] hex colors for the procedural crest. */
  colors: [string, string];
  national?: boolean;
};

export type TournamentFormat = "league" | "cup" | "groups";

export type TournamentConfig = {
  name: string;
  maxPlayers: number;
  versions: GameVersion[];
  format: TournamentFormat;
  /** League only: play each pairing twice. */
  doubleRound: boolean;
  /** Groups only: 2 or 4 groups. */
  groupCount: 2 | 4;
  rerollsPerMatch: number;
  handSize: number;
  balanced: boolean;
  fearless: boolean;
  includeNational: boolean;
  banned: string[];
  /** Minimum stars filter for the pool (0 = off). */
  minStars: number;
};

export type Player = {
  id: string;
  name: string;
  /** 3-letter broadcast code (MAT, KUB…), unique per tournament. */
  code: string;
  isAdmin: boolean;
  /** Present only server-side; stripped from all client views. */
  token?: string;
  removed?: boolean;
  joinedAt: number;
};

export type MatchStage = "league" | "group" | "r16" | "qf" | "sf" | "f";

export type MatchResult = {
  hg: number;
  ag: number;
  /** Winner of penalties, required when hg === ag in a knockout match. */
  penWinner?: string;
  enteredAt: number;
};

export type Match = {
  id: string;
  order: number;
  round: number;
  stage: MatchStage;
  group?: "A" | "B" | "C" | "D";
  home: string | null;
  away: string | null;
  /** Cup plumbing: where the winner goes. */
  nextMatchId?: string;
  nextSlot?: "home" | "away";
  picks: Record<string, string>;
  rerollsUsed: Record<string, number>;
  /** Star band both hands are drawn from when balancing is on. */
  band?: { min: number; max: number };
  result?: MatchResult;
  status: "pending" | "ready" | "done";
};

export type Hand = {
  matchId: string;
  playerId: string;
  teamIds: string[];
  dealtAt: number;
};

export type LockedTeam = {
  teamId: string;
  playerId: string;
  matchId: string;
  at: number;
};

export type HistoryEvent = {
  at: number;
  type:
    | "join"
    | "start"
    | "deal"
    | "reroll"
    | "pick"
    | "result"
    | "result_edit"
    | "rename"
    | "kick"
    | "replace"
    | "exhaustion"
    | "undo"
    | "fallback_note";
  matchId?: string;
  playerId?: string;
  byAdmin?: boolean;
  teamIds?: string[];
  teamId?: string;
  text?: string;
};

export type ExhaustionInfo = {
  matchId: string;
  playerId: string;
  /** How many teams are actually available right now. */
  available: number;
};

export type TournamentState = {
  id: string;
  code: string;
  createdAt: number;
  phase: "lobby" | "playing" | "finished";
  config: TournamentConfig;
  players: Player[];
  matches: Match[];
  hands: Record<string, Hand>;
  locked: LockedTeam[];
  history: HistoryEvent[];
  /** Set when a deal could not be completed; cleared by admin resolution. */
  exhaustion?: ExhaustionInfo;
  /** Admin recovery code (server-side only, stripped from views). */
  recoveryCode?: string;
  winnerId?: string;
};

/** Uniform random in [0,1) backed by a CSPRNG. */
export type Rng = () => number;

export type EngineError = { code: string; message: string };

export class EngineActionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
