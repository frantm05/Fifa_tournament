import { useCallback, useEffect, useRef, useState } from "react";

import { mutateFn } from "../api/tournament.functions";
import type { EngineAction } from "../../engine/engine";
import { applyAction, toView } from "../../engine/engine";
import { cryptoRng } from "../../engine/random";
import type { TournamentState } from "../../engine/types";
import { EngineActionError } from "../../engine/types";
import { loadIdentity, newIdempotencyKey, saveIdentity, type Identity } from "./identity";

export type ConnState = "loading" | "online" | "reconnecting" | "offline";

export type StoreError = { code: string; message: string };

export type DispatchResult = {
  ok: boolean;
  joinedToken?: string;
  joinedPlayerId?: string;
};

export type TournamentStore = {
  mode: "remote" | "local";
  view: TournamentState | null;
  identity: Identity | null;
  conn: ConnState;
  /** Last mutation error, cleared on the next successful action. */
  error: StoreError | null;
  dismissError: () => void;
  /** Dispatch an engine action. */
  dispatch: (action: EngineAction) => Promise<DispatchResult>;
  refresh: () => void;
};

/* ----------------------------- remote store ----------------------------- */

const POLL_MS = 1600;
const FAILS_BEFORE_RECONNECTING = 2;

export function useRemoteTournament(code: string): TournamentStore {
  const [view, setView] = useState<TournamentState | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [conn, setConn] = useState<ConnState>("loading");
  const [error, setError] = useState<StoreError | null>(null);
  const versionRef = useRef(0);
  const failsRef = useRef(0);
  const busyRef = useRef(false);
  const identityRef = useRef<Identity | null>(null);

  useEffect(() => {
    const id = loadIdentity(code);
    identityRef.current = id;
    setIdentity(id);
  }, [code]);

  const poll = useCallback(async () => {
    if (busyRef.current) return;
    try {
      const token = identityRef.current?.token ?? "";
      const res = await fetch(
        `/api/state?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}&v=${versionRef.current}`,
        { cache: "no-store" },
      );
      const body = (await res.json()) as {
        ok: boolean;
        unchanged?: boolean;
        version?: number;
        view?: TournamentState;
        you?: { playerId: string; isAdmin: boolean } | null;
        code?: string;
        message?: string;
      };
      if (!body.ok) {
        if (body.code === "not_found") {
          setConn("online");
          setView(null);
          versionRef.current = -1; // marks "checked, missing"
          return;
        }
        throw new Error(body.code ?? "poll_failed");
      }
      failsRef.current = 0;
      setConn("online");
      if (!body.unchanged && body.view && body.version !== undefined) {
        versionRef.current = body.version;
        setView(body.view);
      }
      // Heal identity from the server echo (claim links start with playerId "").
      if (body.you && identityRef.current) {
        const cur = identityRef.current;
        if (cur.playerId !== body.you.playerId || cur.isAdmin !== body.you.isAdmin) {
          const next = { ...cur, playerId: body.you.playerId, isAdmin: body.you.isAdmin };
          identityRef.current = next;
          setIdentity(next);
          saveIdentity(code, next);
        }
      }
    } catch {
      failsRef.current++;
      if (failsRef.current >= FAILS_BEFORE_RECONNECTING) {
        setConn((c) => (c === "loading" ? "offline" : "reconnecting"));
      }
    }
  }, [code]);

  useEffect(() => {
    versionRef.current = 0;
    setView(null);
    setConn("loading");
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const loop = async () => {
      if (stopped) return;
      await poll();
      if (stopped) return;
      const hidden = typeof document !== "undefined" && document.hidden;
      timer = setTimeout(loop, hidden ? POLL_MS * 4 : POLL_MS);
    };
    void loop();
    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (timer) clearTimeout(timer);
        void loop();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, poll]);

  const dispatch = useCallback(
    async (action: EngineAction): Promise<DispatchResult> => {
      busyRef.current = true;
      const key = newIdempotencyKey();
      try {
        // One automatic retry with the SAME idempotency key — a lost response
        // is replayed server-side instead of double-applying.
        let lastErr: StoreError | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await mutateFn({
              data: {
                code,
                token: identityRef.current?.token ?? null,
                idempotencyKey: key,
                action,
              },
            });
            if (!res.ok) {
              lastErr = { code: res.code, message: res.message };
              break;
            }
            if (res.view && res.version) {
              versionRef.current = res.version;
              setView(res.view as TournamentState);
            }
            // Adopt the returned identity only when THIS device joined;
            // a "replace" returns a token meant for the replacement's phone.
            if (res.joinedToken && res.joinedPlayerId && action.type === "join") {
              const next: Identity = {
                playerId: res.joinedPlayerId,
                token: res.joinedToken,
                isAdmin: identityRef.current?.isAdmin ?? false,
                recoveryCode: identityRef.current?.recoveryCode,
              };
              identityRef.current = next;
              setIdentity(next);
              saveIdentity(code, next);
            }
            setError(null);
            setConn("online");
            return {
              ok: true,
              joinedToken: res.joinedToken,
              joinedPlayerId: res.joinedPlayerId,
            };
          } catch (e) {
            lastErr = {
              code: "network",
              message: "Spojení se nezdařilo — zkouším znovu…",
            };
            if (attempt === 1) throw e;
            await new Promise((r) => setTimeout(r, 700));
          }
        }
        if (lastErr) setError(lastErr);
        return { ok: false };
      } catch {
        setError({ code: "network", message: "Server neodpovídá. Zkus to za chvíli." });
        return { ok: false };
      } finally {
        busyRef.current = false;
        void poll();
      }
    },
    [code, poll],
  );

  return {
    mode: "remote",
    view,
    identity,
    conn: versionRef.current === -1 ? "online" : conn,
    error,
    dismissError: () => setError(null),
    dispatch,
    refresh: () => void poll(),
  };
}

/* ----------------------------- local fallback store ----------------------------- */

const LOCAL_KEY = "fd_local_tournament";

export function loadLocalState(): TournamentState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TournamentState;
  } catch {
    return null;
  }
}

export function saveLocalState(state: TournamentState | null): void {
  try {
    if (state === null) localStorage.removeItem(LOCAL_KEY);
    else localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    // memory-only fallback keeps working
  }
}

/**
 * Single-device tournament: the whole engine runs in the browser, the admin
 * passes the phone around. Same rules, same screens, no fake sync.
 */
export function useLocalTournament(
  initial: TournamentState | null,
): TournamentStore & {
  setState: (s: TournamentState | null) => void;
  fullState: TournamentState | null;
} {
  const [state, setState] = useState<TournamentState | null>(initial);
  const [error, setError] = useState<StoreError | null>(null);
  const rngRef = useRef(cryptoRng());

  const dispatch = useCallback(async (action: EngineAction): Promise<DispatchResult> => {
    let ok = false;
    setError(null);
    setState((prev) => {
      if (!prev) return prev;
      try {
        const admin = prev.players.find((p) => p.isAdmin);
        const { state: next } = applyAction(prev, action, {
          rng: rngRef.current,
          now: Date.now(),
          // In local mode the device belongs to the admin; player actions are
          // dispatched with the target player id directly.
          actorId:
            "playerId" in action && typeof action.playerId === "string"
              ? action.playerId
              : (admin?.id ?? null),
          isAdmin: true,
        });
        ok = true;
        saveLocalState(next);
        return next;
      } catch (e) {
        if (e instanceof EngineActionError)
          setError({ code: e.code, message: e.message });
        else setError({ code: "unknown", message: "Neznámá chyba." });
        return prev;
      }
    });
    return { ok };
  }, []);

  const adminId = state?.players.find((p) => p.isAdmin)?.id ?? "local";
  return {
    mode: "local",
    view: state ? toView(state, { playerId: adminId, isAdmin: true }) : null,
    fullState: state,
    setState: (s) => {
      setState(s);
      saveLocalState(s);
    },
    identity: state
      ? { playerId: adminId, token: "local", isAdmin: true }
      : null,
    conn: "online",
    error,
    dismissError: () => setError(null),
    dispatch,
    refresh: () => undefined,
  };
}
