import { useEffect, useMemo, useRef, useState } from "react";

import {
  currentMatch,
  isMatchOpenForPicks,
  poolStats,
  standings,
  teamName,
  teamStars,
  TEAMS_BY_ID,
} from "../engine/engine";
import type {
  Hand,
  Match,
  Player,
  Team,
  TournamentState,
} from "../engine/types";
import type { TournamentStore } from "../lib/client/store";
import { Crest, Cut, IconSvg, icons, QrCode, Spinner, StarMeter } from "./ui";

/* ============================= helpers ============================= */

type Ctx = {
  store: TournamentStore;
  view: TournamentState;
  me: Player | null;
  isAdmin: boolean;
  name: (id: string | null) => string;
  code: (id: string | null) => string;
  team: (id: string) => Team | undefined;
  tName: (id: string) => string;
  tStars: (id: string) => number;
  handFor: (matchId: string, playerId: string) => Hand | undefined;
};

function useCtx(store: TournamentStore): Ctx | null {
  const view = store.view;
  return useMemo(() => {
    if (!view) return null;
    const players = new Map(view.players.map((p) => [p.id, p]));
    const me = store.identity
      ? (view.players.find((p) => p.id === store.identity!.playerId) ?? null)
      : null;
    return {
      store,
      view,
      me,
      isAdmin: Boolean(me?.isAdmin),
      name: (id) => (id ? (players.get(id)?.name ?? "?") : "?"),
      code: (id) => (id ? (players.get(id)?.code ?? "???") : "—"),
      team: (id) => TEAMS_BY_ID.get(id),
      tName: (id) => {
        const t = TEAMS_BY_ID.get(id);
        return t ? teamName(t, view.config.versions) : id;
      },
      tStars: (id) => {
        const t = TEAMS_BY_ID.get(id);
        return t ? teamStars(t, view.config.versions) : 0;
      },
      handFor: (matchId, playerId) => view.hands[`${matchId}:${playerId}`],
    };
  }, [store, view, store.identity]);
}

function stageLabel(m: Match, view: TournamentState): string {
  switch (m.stage) {
    case "league":
      return `${m.round}. kolo`;
    case "group":
      return `Skupina ${m.group} · ${m.round}. kolo`;
    case "r16":
      return "Čtvrtfinále"; // 8-entrant tree top round
    case "qf":
      return view.config.groupCount === 4 || view.config.format === "cup"
        ? "Čtvrtfinále"
        : "Semifinále";
    case "sf":
      return "Semifinále";
    case "f":
      return "Finále";
  }
}

/* ============================= shell ============================= */

export type LocalTools = {
  exportState: () => string;
  importState: (raw: string) => boolean;
};

export function TournamentApp({
  store,
  joinUrl,
  localBanner,
  onExitLocal,
  localTools,
}: {
  store: TournamentStore;
  joinUrl: string | null;
  localBanner?: boolean;
  onExitLocal?: () => void;
  localTools?: LocalTools;
}) {
  const ctx = useCtx(store);
  const [tab, setTab] = useState<"matches" | "table" | "pool" | "more">("matches");

  if (!ctx) return null;
  const { view } = ctx;

  return (
    <div className="app">
      {localBanner ? (
        <div className="local-banner" role="status">
          <IconSvg d={icons.warn} size={15} />
          <span>
            Nouzový režim — turnaj běží jen na tomto telefonu. Nic se neukládá na server.
          </span>
        </div>
      ) : null}
      <ConnBanner store={store} />
      <ErrorBanner store={store} />

      {view.phase === "lobby" ? (
        <Lobby ctx={ctx} joinUrl={joinUrl} />
      ) : (
        <>
          <LiveStrip ctx={ctx} />
          {view.exhaustion ? <ExhaustionPanel ctx={ctx} /> : null}
          {tab === "matches" &&
            (view.phase === "finished" ? <Finished ctx={ctx} /> : <MatchesTab ctx={ctx} />)}
          {tab === "table" && <TableTab ctx={ctx} />}
          {tab === "pool" && <PoolTab ctx={ctx} />}
          {tab === "more" && (
            <MoreTab ctx={ctx} joinUrl={joinUrl} onExitLocal={onExitLocal} localTools={localTools} />
          )}
          <nav className="tabbar" aria-label="Sekce">
            {(
              [
                ["matches", view.phase === "finished" ? "Výsledek" : "Zápasy"],
                ["table", "Tabulka"],
                ["pool", "Osudí"],
                ["more", "Více"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={"tabbar-btn" + (tab === id ? " active" : "")}
                aria-current={tab === id ? "page" : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

function ConnBanner({ store }: { store: TournamentStore }) {
  if (store.conn === "reconnecting" || store.conn === "offline") {
    return (
      <div className="conn-banner" role="status">
        <Spinner />
        <span>Znovu se připojuji…</span>
      </div>
    );
  }
  return null;
}

function ErrorBanner({ store }: { store: TournamentStore }) {
  if (!store.error) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{store.error.message}</span>
      <button onClick={store.dismissError} aria-label="Zavřít hlášku">
        <IconSvg d={icons.x} size={16} />
      </button>
    </div>
  );
}

function LiveStrip({ ctx }: { ctx: Ctx }) {
  const { view } = ctx;
  const cur = currentMatch(view);
  const done = view.matches.filter((m) => m.status === "done" && m.home && m.away).length;
  const total = view.matches.filter((m) => m.home && m.away).length;
  return (
    <div className="live-strip" aria-label="Stav turnaje">
      <span className="live-dot" aria-hidden="true" />
      <b>ŽIVĚ</b>
      <span className="live-sep">·</span>
      {view.phase === "finished" ? (
        <span>Turnaj dohrán</span>
      ) : cur ? (
        <span>
          Zápas {done + 1}/{total} · {ctx.code(cur.home)} — {ctx.code(cur.away)}
        </span>
      ) : (
        <span>Čeká se na rozpis</span>
      )}
    </div>
  );
}

/* ============================= lobby ============================= */

function Lobby({ ctx, joinUrl }: { ctx: Ctx; joinUrl: string | null }) {
  const { view, isAdmin, store } = ctx;
  const players = view.players.filter((p) => !p.removed);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — the visible URL still works
    }
  };

  return (
    <main className="screen lobby">
      <header className="masthead">
        <span className="masthead-brand">Fearless Draw</span>
        <span className="masthead-meta">
          Lobby · {players.length}/{view.config.maxPlayers}
        </span>
      </header>

      <section className="pad">
        <h1 className="visually-hidden">Lobby turnaje {view.config.name}</h1>
        <p className="kicker">{view.config.name} · kód pro připojení</p>
        <p className="join-code">{view.code}</p>
        {joinUrl ? (
          <>
            <div className="join-row">
              <button className="chip-btn" onClick={copyLink}>
                <IconSvg d={copied ? icons.check : icons.copy} size={15} />
                {copied ? "Zkopírováno" : "Kopírovat odkaz"}
              </button>
              <span className="join-url">{joinUrl.replace(/^https?:\/\//, "")}</span>
            </div>
            <Cut className="qr-box" cut={14}>
              <QrCode text={joinUrl} label={`QR kód pro připojení: ${joinUrl}`} />
              <p>Hráč naskenuje, napíše přezdívku a je v turnaji. Nic se neinstaluje.</p>
            </Cut>
          </>
        ) : null}

        <div className="player-list">
          {players.map((p) => (
            <Cut key={p.id} className="player-row-cut" cut={10}>
              <div className="player-row">
                <span className="player-code">{p.code}</span>
                <span className="player-name">
                  {p.name}
                  {p.isAdmin ? <em className="player-tag">Pořadatel</em> : null}
                </span>
                {isAdmin ? (
                  <span className="player-actions">
                    <button
                      className="mini-btn"
                      onClick={() => setRenaming(p.id)}
                      aria-label={`Přejmenovat hráče ${p.name}`}
                    >
                      Přejmenovat
                    </button>
                    {!p.isAdmin ? (
                      <button
                        className="mini-btn mini-danger"
                        onClick={() => void store.dispatch({ type: "kick", playerId: p.id })}
                        aria-label={`Odebrat hráče ${p.name}`}
                      >
                        Odebrat
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </Cut>
          ))}
          {players.length < view.config.maxPlayers ? (
            store.mode === "local" && isAdmin ? (
              <AddPlayerLocal ctx={ctx} />
            ) : (
              <div className="player-row player-empty">
                Volné místo — čeká na hráče ({players.length}/{view.config.maxPlayers})
              </div>
            )
          ) : null}
        </div>

        <ConfigSummary ctx={ctx} />
      </section>

      {renaming ? (
        <NameDialog
          title="Přejmenovat hráče"
          initial={players.find((p) => p.id === renaming)?.name ?? ""}
          onCancel={() => setRenaming(null)}
          onSubmit={async (name) => {
            await store.dispatch({ type: "rename", playerId: renaming, name });
            setRenaming(null);
          }}
        />
      ) : null}

      <footer className="actionbar">
        {isAdmin ? (
          <button
            className="btn-primary"
            disabled={busy || players.length < 2}
            onClick={async () => {
              setBusy(true);
              await store.dispatch({ type: "start" });
              setBusy(false);
            }}
          >
            {busy ? <Spinner /> : null}
            {players.length < 2 ? "Čeká se na hráče (min. 2)" : "Spustit turnaj"}
          </button>
        ) : (
          <p className="waiting-note">Čekáme, až pořadatel spustí turnaj.</p>
        )}
      </footer>
    </main>
  );
}

function ConfigSummary({ ctx }: { ctx: Ctx }) {
  const c = ctx.view.config;
  const fmt =
    c.format === "league"
      ? `každý s každým${c.doubleRound ? " · dvoukolově" : ""}`
      : c.format === "cup"
        ? "vyřazovací pavouk"
        : `skupiny (${c.groupCount}) + pavouk`;
  const versions = c.versions.map((v) => (Number(v) >= 24 ? `FC ${v}` : `FIFA ${v}`)).join(", ");
  return (
    <div className="config-summary">
      <p>
        <b>{fmt}</b> · verze {versions}
      </p>
      <p>
        Nové losy: {c.rerollsPerMatch}/zápas · ruka {c.handSize} týmů · vyrovnané síly:{" "}
        {c.balanced ? "ano" : "ne"} · reprezentace: {c.includeNational ? "ano" : "ne"}
        {c.banned.length ? ` · zabanováno: ${c.banned.length}` : ""}
      </p>
      <p className="config-note">Hodnocení týmů je orientační (0,5–5★).</p>
    </div>
  );
}

/* ============================= matches tab ============================= */

function MatchesTab({ ctx }: { ctx: Ctx }) {
  const { view } = ctx;
  const playable = view.matches.filter((m) => m.home && m.away);
  const done = playable.filter((m) => m.status === "done");
  const upcoming = playable.filter((m) => m.status !== "done");
  const cur = upcoming[0];
  const next = upcoming.slice(1, 4);

  return (
    <main className="screen">
      {cur ? <CurrentMatchCard ctx={ctx} match={cur} /> : null}
      {upcoming.length > 1 ? (
        <section className="pad">
          <h2 className="section-title">Další na řadě</h2>
          {next.map((m) => (
            <MatchRow key={m.id} ctx={ctx} match={m} />
          ))}
          {upcoming.length - 1 > next.length ? (
            <p className="muted-note">… a dalších {upcoming.length - 1 - next.length}</p>
          ) : null}
        </section>
      ) : null}
      {done.length ? (
        <section className="pad">
          <h2 className="section-title">Odehráno</h2>
          {[...done].reverse().map((m) => (
            <MatchRow key={m.id} ctx={ctx} match={m} />
          ))}
        </section>
      ) : null}
      {view.matches.some((m) => !m.home || !m.away) ? (
        <p className="muted-note pad">
          Zápasy pavouka se doplní, jakmile budou známí postupující.
        </p>
      ) : null}
    </main>
  );
}

function PickState({ ctx, match, playerId }: { ctx: Ctx; match: Match; playerId: string }) {
  const picked = match.picks[playerId];
  if (picked) {
    const t = ctx.team(picked);
    return (
      <span className="pickstate picked">
        {t ? <Crest team={t} size={26} /> : null}
        <span>{ctx.tName(picked)}</span>
      </span>
    );
  }
  const hand = ctx.handFor(match.id, playerId);
  return (
    <span className="pickstate">
      {hand ? "má los v ruce" : "čeká na los"}
    </span>
  );
}

function CurrentMatchCard({ ctx, match }: { ctx: Ctx; match: Match }) {
  const { view, me, isAdmin, store } = ctx;
  const [overlayFor, setOverlayFor] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const open = isMatchOpenForPicks(view, match);
  const bothPicked = [match.home!, match.away!].every((p) => match.picks[p]);
  const iPlay = me && (match.home === me.id || match.away === me.id);
  const myPick = me ? match.picks[me.id] : undefined;
  const myHand = me ? ctx.handFor(match.id, me.id) : undefined;
  const myTurn = Boolean(iPlay && open && !myPick);

  // Auto-open the reveal when my hand arrives.
  const prevHand = useRef(false);
  useEffect(() => {
    const has = Boolean(myHand);
    if (has && !prevHand.current && me) setOverlayFor(me.id);
    prevHand.current = has;
  }, [myHand, me]);

  return (
    <section className="pad">
      <Cut className="current-card" cut={16} borderColor={myTurn ? "var(--acc)" : undefined}>
        <div className="current-head">
          <span className="current-stage">{stageLabel(match, view)}</span>
          {match.band ? (
            <span className="band-chip">
              pásmo {match.band.min.toLocaleString("cs-CZ")}–
              {match.band.max.toLocaleString("cs-CZ")}★
            </span>
          ) : null}
        </div>
        {myTurn ? (
          <div className="turn-chip" role="status">
            <span>Jsi na řadě</span>
          </div>
        ) : null}
        <div className="vs-block">
          <div className="vs-side">
            <span className="vs-code">{ctx.code(match.home)}</span>
            <span className="vs-name">{ctx.name(match.home)}</span>
            <PickState ctx={ctx} match={match} playerId={match.home!} />
          </div>
          <span className="vs-x" aria-hidden="true">
            VS
          </span>
          <div className="vs-side">
            <span className="vs-code">{ctx.code(match.away)}</span>
            <span className="vs-name">{ctx.name(match.away)}</span>
            <PickState ctx={ctx} match={match} playerId={match.away!} />
          </div>
        </div>

        <div className="current-actions">
          {iPlay && myTurn && !myHand ? (
            <button
              className="btn-primary"
              onClick={async () => {
                const res = await store.dispatch({
                  type: "deal",
                  matchId: match.id,
                  playerId: me!.id,
                });
                if (res.ok) setOverlayFor(me!.id);
              }}
            >
              Losovat tři týmy
            </button>
          ) : null}
          {iPlay && myHand && !myPick ? (
            <button className="btn-primary" onClick={() => setOverlayFor(me!.id)}>
              Ukázat vylosované týmy
            </button>
          ) : null}
          {iPlay && myPick && !bothPicked ? (
            <p className="status-note">Tvůj tým je zamčený. Čeká se na soupeře.</p>
          ) : null}
          {!iPlay && !bothPicked ? (
            <p className="status-note">
              {open ? "Hráči si losují týmy…" : "Čeká, až skončí předchozí zápas."}
            </p>
          ) : null}
          {bothPicked && !match.result ? (
            isAdmin ? (
              <button className="btn-primary" onClick={() => setResultOpen(true)}>
                Zapsat výsledek
              </button>
            ) : (
              <p className="status-note">Hraje se. Výsledek zapíše pořadatel.</p>
            )
          ) : null}

          {isAdmin && !bothPicked && open ? (
            <div className="admin-onbehalf">
              {[match.home!, match.away!]
                .filter((p) => !match.picks[p] && p !== me?.id)
                .map((p) => (
                  <button
                    key={p}
                    className="mini-btn"
                    onClick={async () => {
                      if (!ctx.handFor(match.id, p)) {
                        await store.dispatch({ type: "deal", matchId: match.id, playerId: p });
                      }
                      setOverlayFor(p);
                    }}
                  >
                    Losovat za: {ctx.name(p)}
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      </Cut>

      {overlayFor ? (
        <DrawOverlay
          ctx={ctx}
          match={match}
          playerId={overlayFor}
          onClose={() => setOverlayFor(null)}
        />
      ) : null}
      {resultOpen ? (
        <ResultSheet ctx={ctx} match={match} onClose={() => setResultOpen(false)} />
      ) : null}
    </section>
  );
}

function MatchRow({ ctx, match }: { ctx: Ctx; match: Match }) {
  const { isAdmin } = ctx;
  const [editOpen, setEditOpen] = useState(false);
  const r = match.result;
  const homePick = match.picks[match.home ?? ""];
  const awayPick = match.picks[match.away ?? ""];
  return (
    <div className="match-row">
      <div className="match-row-main">
        <span className="match-row-stage">{stageLabel(match, ctx.view)}</span>
        <div className="match-row-line">
          <span className={"mr-side" + (r && r.hg > r.ag ? " mr-win" : "")}>
            {ctx.code(match.home)}
            {homePick && ctx.team(homePick) ? <Crest team={ctx.team(homePick)!} size={20} /> : null}
          </span>
          <span className="mr-score">
            {r ? (
              <>
                {r.hg}:{r.ag}
                {r.penWinner ? (
                  <em className="mr-pen">
                    pen. {ctx.code(r.penWinner)}
                  </em>
                ) : null}
              </>
            ) : (
              "–:–"
            )}
          </span>
          <span className={"mr-side mr-right" + (r && r.ag > r.hg ? " mr-win" : "")}>
            {awayPick && ctx.team(awayPick) ? <Crest team={ctx.team(awayPick)!} size={20} /> : null}
            {ctx.code(match.away)}
          </span>
        </div>
        {homePick || awayPick ? (
          <p className="match-row-teams">
            {homePick ? ctx.tName(homePick) : "?"} — {awayPick ? ctx.tName(awayPick) : "?"}
          </p>
        ) : null}
      </div>
      {isAdmin && r ? (
        <button className="mini-btn" onClick={() => setEditOpen(true)}>
          Upravit
        </button>
      ) : null}
      {editOpen ? (
        <ResultSheet ctx={ctx} match={match} edit onClose={() => setEditOpen(false)} />
      ) : null}
    </div>
  );
}

/* ============================= draw overlay ============================= */

function DrawOverlay({
  ctx,
  match,
  playerId,
  onClose,
}: {
  ctx: Ctx;
  match: Match;
  playerId: string;
  onClose: () => void;
}) {
  const { store, view } = ctx;
  const hand = ctx.handFor(match.id, playerId);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const onBehalf = ctx.me?.id !== playerId;
  const needsGate = ctx.store.mode === "local" && onBehalf;
  const [gatePassed, setGatePassed] = useState(!needsGate);
  const rerollsLeft =
    view.config.rerollsPerMatch - (match.rerollsUsed[playerId] ?? 0);

  // Reveal beat: straps slide in, then flip — tap anywhere to skip.
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(t);
  }, [hand?.dealtAt]);

  useEffect(() => {
    setSelected(null);
  }, [hand?.dealtAt]);

  if (!hand) return null;

  if (!gatePassed) {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-label="Předání telefonu">
        <div className="overlay-head">
          <button className="overlay-back" onClick={onClose} aria-label="Zavřít">
            <IconSvg d={icons.back} />
          </button>
          <p className="overlay-title">Předej telefon</p>
        </div>
        <div className="gate">
          <p className="gate-code">{ctx.code(playerId)}</p>
          <p className="gate-name">{ctx.name(playerId)}</p>
          <p className="overlay-note">Los je tajný — na obrazovku se dívá jen {ctx.name(playerId)}.</p>
        </div>
        <div className="overlay-actions">
          <button className="btn-primary" onClick={() => setGatePassed(true)}>
            Jsem {ctx.name(playerId)} — ukázat los
          </button>
        </div>
      </div>
    );
  }

  const pick = async () => {
    if (!selected || busy) return;
    setBusy(true);
    const res = await store.dispatch({
      type: "pick",
      matchId: match.id,
      playerId,
      teamId: selected,
    });
    setBusy(false);
    if (res.ok) onClose();
  };

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Vylosované týmy"
      onClick={() => setRevealed(true)}
    >
      <div className="overlay-head">
        <button className="overlay-back" onClick={onClose} aria-label="Zavřít losování">
          <IconSvg d={icons.back} />
        </button>
        <div>
          <p className="overlay-kicker">
            {onBehalf && ctx.store.mode !== "local"
              ? `Losuješ za: ${ctx.name(playerId)}`
              : "Tvůj los"}{" "}
            · {stageLabel(match, view)}
          </p>
          <p className="overlay-title">
            {ctx.name(match.home)} — {ctx.name(match.away)}
          </p>
        </div>
      </div>
      {match.band ? (
        <p className="overlay-band">
          pásmo síly {match.band.min.toLocaleString("cs-CZ")}–
          {match.band.max.toLocaleString("cs-CZ")}★
        </p>
      ) : null}

      <div className={"hand" + (revealed ? " revealed" : "")}>
        {hand.teamIds.map((tid, i) => {
          const t = ctx.team(tid);
          if (!t) return null;
          const sel = selected === tid;
          return (
            <button
              key={tid}
              className={"team-strap" + (sel ? " selected" : "")}
              style={{ ["--strap-i" as string]: i, ["--team-c" as string]: t.colors[0] }}
              onClick={(e) => {
                e.stopPropagation();
                setRevealed(true);
                setSelected(sel ? null : tid);
              }}
              aria-pressed={sel}
            >
              <span className="strap-face">
                <Crest team={t} size={44} />
                <span className="strap-text">
                  <span className="strap-league">{t.league}</span>
                  <span className="strap-name">{ctx.tName(tid)}</span>
                  <StarMeter value={ctx.tStars(tid)} />
                </span>
                {sel ? (
                  <span className="strap-sel" aria-hidden="true">
                    <IconSvg d={icons.check} size={17} />
                  </span>
                ) : null}
              </span>
              <span className="strap-cover" aria-hidden="true">
                ?
              </span>
            </button>
          );
        })}
      </div>

      <p className="overlay-note">
        Vybraný tým se zamkne pro celý turnaj. Zbylé dva se hned vrací do osudí.
      </p>

      <div className="overlay-actions">
        <button className="btn-primary" disabled={!selected || busy} onClick={pick}>
          {busy ? <Spinner /> : null}
          {selected ? `Potvrdit: ${ctx.tName(selected)}` : "Vyber jeden tým"}
        </button>
        <button
          className="btn-ghost"
          disabled={rerollsLeft <= 0 || busy}
          onClick={async (e) => {
            e.stopPropagation();
            setBusy(true);
            await store.dispatch({ type: "reroll", matchId: match.id, playerId });
            setBusy(false);
            setRevealed(false);
          }}
        >
          {rerollsLeft > 0
            ? `Losovat znovu (zbývá ${rerollsLeft})`
            : "Losovat znovu — vyčerpáno (0)"}
        </button>
      </div>
    </div>
  );
}

/* ============================= result sheet ============================= */

function ResultSheet({
  ctx,
  match,
  edit = false,
  onClose,
}: {
  ctx: Ctx;
  match: Match;
  edit?: boolean;
  onClose: () => void;
}) {
  const { store, view } = ctx;
  const [hg, setHg] = useState(match.result?.hg ?? 0);
  const [ag, setAg] = useState(match.result?.ag ?? 0);
  const [pen, setPen] = useState<string | null>(match.result?.penWinner ?? null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const isKo = match.stage !== "league" && match.stage !== "group";
  const needsPen = isKo && hg === ag;

  const submit = async () => {
    setBusy(true);
    const res = await store.dispatch({
      type: edit ? "editResult" : "result",
      matchId: match.id,
      hg,
      ag,
      penWinner: needsPen ? (pen ?? undefined) : undefined,
    });
    setBusy(false);
    if (res.ok) onClose();
  };

  const Stepper = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
  }) => (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`${label}: méně gólů`}
        >
          −
        </button>
        <b aria-live="polite">{value}</b>
        <button onClick={() => onChange(Math.min(30, value + 1))} aria-label={`${label}: více gólů`}>
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="overlay sheet" role="dialog" aria-modal="true" aria-label="Zápis výsledku">
      <div className="overlay-head">
        <button className="overlay-back" onClick={onClose} aria-label="Zavřít zápis výsledku">
          <IconSvg d={icons.back} />
        </button>
        <div>
          <p className="overlay-kicker">
            {edit ? "Úprava výsledku" : "Zápis výsledku"} · {stageLabel(match, view)}
          </p>
          <p className="overlay-title">
            {ctx.name(match.home)} — {ctx.name(match.away)}
          </p>
        </div>
      </div>

      <div className="result-grid">
        <Stepper value={hg} onChange={(v) => { setHg(v); setConfirming(false); }} label={ctx.name(match.home)} />
        <Stepper value={ag} onChange={(v) => { setAg(v); setConfirming(false); }} label={ctx.name(match.away)} />
      </div>

      {needsPen ? (
        <div className="pen-pick">
          <p>Remíza ve vyřazovacím zápase — kdo vyhrál penalty?</p>
          <div className="pen-btns">
            {[match.home!, match.away!].map((p) => (
              <button
                key={p}
                className={"chip-btn" + (pen === p ? " chip-on" : "")}
                onClick={() => { setPen(p); setConfirming(false); }}
              >
                {ctx.name(p)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overlay-actions">
        {!confirming ? (
          <button
            className="btn-primary"
            disabled={needsPen && !pen}
            onClick={() => setConfirming(true)}
          >
            {edit ? "Upravit na" : "Zapsat"} {hg}:{ag}
            {needsPen && pen ? ` (pen. ${ctx.name(pen)})` : ""}
          </button>
        ) : (
          <button className="btn-primary btn-confirm" disabled={busy} onClick={submit}>
            {busy ? <Spinner /> : null}
            Opravdu {edit ? "změnit" : "zapsat"} — potvrdit
          </button>
        )}
        {confirming ? (
          <button className="btn-ghost" onClick={() => setConfirming(false)}>
            Zpět k úpravě
          </button>
        ) : null}
        {edit ? (
          <p className="overlay-note">Po uložení se tabulka i pavouk přepočítají.</p>
        ) : null}
      </div>
    </div>
  );
}

/* ============================= table tab ============================= */

function StandingsTable({
  ctx,
  matches,
  playerIds,
  caption,
}: {
  ctx: Ctx;
  matches: Match[];
  playerIds: string[];
  caption?: string;
}) {
  const rows = standings(matches, playerIds, (id) => ctx.name(id));
  return (
    <div className="table-wrap">
      {caption ? <h3 className="table-caption">{caption}</h3> : null}
      <table className="standings">
        <thead>
          <tr>
            <th scope="col" className="th-name">
              Hráč
            </th>
            <th scope="col">Z</th>
            <th scope="col">V</th>
            <th scope="col">R</th>
            <th scope="col">P</th>
            <th scope="col">Skóre</th>
            <th scope="col">B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.playerId} className={i === 0 ? "row-lead" : undefined}>
              <td className="td-name">
                <b className="td-code">{ctx.code(r.playerId)}</b> {ctx.name(r.playerId)}
              </td>
              <td>{r.mp}</td>
              <td>{r.w}</td>
              <td>{r.d}</td>
              <td>{r.l}</td>
              <td>
                {r.gf}:{r.ga}
              </td>
              <td className="td-pts">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bracket({ ctx }: { ctx: Ctx }) {
  const { view } = ctx;
  const ko = view.matches.filter((m) => m.round >= 100).sort((a, b) => a.order - b.order);
  if (!ko.length) return null;
  const rounds = [...new Set(ko.map((m) => m.round))].sort();
  return (
    <div className="bracket">
      {rounds.map((r) => {
        const ms = ko.filter((m) => m.round === r);
        return (
          <div key={r} className="bracket-round">
            <h3 className="table-caption">{stageLabel(ms[0], view)}</h3>
            {ms.map((m) => (
              <Cut key={m.id} className="tie-cut" cut={10}>
                <div className="tie">
                  {[
                    { p: m.home, g: m.result?.hg },
                    { p: m.away, g: m.result?.ag },
                  ].map((side, i) => {
                    const winner =
                      m.result && m.home && m.away
                        ? m.result.hg === m.result.ag
                          ? m.result.penWinner === side.p
                          : i === 0
                            ? m.result.hg > m.result.ag
                            : m.result.ag > m.result.hg
                        : false;
                    return (
                      <div key={i} className={"tie-row" + (winner ? " tie-win" : "")}>
                        <span className="tie-player">
                          {side.p ? (
                            <>
                              <b className="td-code">{ctx.code(side.p)}</b> {ctx.name(side.p)}
                            </>
                          ) : (
                            <span className="tie-tbd">postupující…</span>
                          )}
                        </span>
                        <span className="tie-score">
                          {m.status === "done" && !m.result && i === 1 ? "bye" : (side.g ?? "–")}
                        </span>
                      </div>
                    );
                  })}
                  {m.result?.penWinner ? (
                    <p className="tie-pen">penalty: {ctx.name(m.result.penWinner)}</p>
                  ) : null}
                </div>
              </Cut>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TableTab({ ctx }: { ctx: Ctx }) {
  const { view } = ctx;
  const ids = view.players.filter((p) => !p.removed).map((p) => p.id);
  return (
    <main className="screen pad">
      <h2 className="section-title">Tabulka a pavouk</h2>
      {view.config.format === "league" ? (
        <StandingsTable ctx={ctx} matches={view.matches} playerIds={ids} />
      ) : null}
      {view.config.format === "groups"
        ? (view.config.groupCount === 4 ? ["A", "B", "C", "D"] : ["A", "B"]).map((g) => {
            const ms = view.matches.filter((m) => m.group === g);
            const gids = [...new Set(ms.flatMap((m) => [m.home, m.away]))].filter(
              (x): x is string => Boolean(x),
            );
            return (
              <StandingsTable
                key={g}
                ctx={ctx}
                matches={ms}
                playerIds={gids}
                caption={`Skupina ${g}`}
              />
            );
          })
        : null}
      <Bracket ctx={ctx} />
    </main>
  );
}

/* ============================= pool tab ============================= */

function PoolTab({ ctx }: { ctx: Ctx }) {
  const { view } = ctx;
  const stats = poolStats(view);
  const byPlayer = new Map<string, typeof view.locked>();
  for (const l of view.locked) {
    const arr = byPlayer.get(l.playerId) ?? [];
    arr.push(l);
    byPlayer.set(l.playerId, arr);
  }
  return (
    <main className="screen pad">
      <h2 className="section-title">Osudí</h2>
      <div className="pool-stats">
        <Cut className="pool-stat" cut={10}>
          <div className="pool-stat-in">
            <b>{stats.remaining}</b>
            <span>v osudí</span>
          </div>
        </Cut>
        <Cut className="pool-stat" cut={10}>
          <div className="pool-stat-in">
            <b>{stats.locked}</b>
            <span>zamčeno</span>
          </div>
        </Cut>
        <Cut className="pool-stat" cut={10}>
          <div className="pool-stat-in">
            <b>{stats.total}</b>
            <span>celkem</span>
          </div>
        </Cut>
      </div>
      <p className="muted-note">
        Fearless: {view.config.fearless ? "zapnuto — odehrané týmy se už neobjeví" : "vypnuto"}
        {view.config.banned.length ? ` · zabanováno ${view.config.banned.length} týmů` : ""} ·
        hodnocení orientační
      </p>

      {view.players
        .filter((p) => !p.removed)
        .map((p) => {
          const locks = byPlayer.get(p.id) ?? [];
          if (!locks.length) return null;
          return (
            <div key={p.id} className="locked-group">
              <h3 className="table-caption">
                {p.name} <span className="muted-note">({locks.length})</span>
              </h3>
              <div className="locked-list">
                {locks.map((l) => {
                  const t = ctx.team(l.teamId);
                  return t ? (
                    <span key={l.teamId + l.matchId} className="locked-item">
                      <Crest team={t} size={22} />
                      {ctx.tName(l.teamId)}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
    </main>
  );
}

function ExhaustionPanel({ ctx }: { ctx: Ctx }) {
  const { view, isAdmin, store } = ctx;
  const ex = view.exhaustion!;
  return (
    <div className="pad">
      <Cut className="exhaust" cut={14} borderColor="var(--live)">
        <div className="exhaust-in">
          <p className="exhaust-title">Osudí je skoro prázdné</p>
          <p>
            Pro los hráče {ctx.name(ex.playerId)} zbývá jen {ex.available}{" "}
            {ex.available === 1 ? "tým" : ex.available < 5 ? "týmy" : "týmů"} (potřeba{" "}
            {view.config.handSize}). Vyber, jak pokračovat:
          </p>
          {isAdmin ? (
            <div className="exhaust-actions">
              <button
                className="btn-ghost"
                onClick={() => void store.dispatch({ type: "resolveExhaustion", option: "reduce" })}
              >
                Zmenšit ruku na {view.config.handSize - 1}
              </button>
              <button
                className="btn-ghost"
                onClick={() => void store.dispatch({ type: "resolveExhaustion", option: "release" })}
              >
                Uvolnit nejstarší zamčené týmy
              </button>
              <button
                className="btn-ghost"
                onClick={() => void store.dispatch({ type: "resolveExhaustion", option: "disable" })}
              >
                Vypnout fearless do konce
              </button>
            </div>
          ) : (
            <p className="muted-note">Rozhodne pořadatel.</p>
          )}
        </div>
      </Cut>
    </div>
  );
}

/* ============================= more tab ============================= */

function MoreTab({
  ctx,
  joinUrl,
  onExitLocal,
  localTools,
}: {
  ctx: Ctx;
  joinUrl: string | null;
  onExitLocal?: () => void;
  localTools?: LocalTools;
}) {
  const { view, isAdmin, store } = ctx;
  const [replacing, setReplacing] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const players = view.players.filter((p) => !p.removed);

  return (
    <main className="screen pad">
      <h2 className="section-title">Historie losování</h2>
      <div className="history">
        {[...view.history]
          .reverse()
          .slice(0, 60)
          .map((e, i) => {
            const who = e.playerId ? ctx.name(e.playerId) : "";
            let text = "";
            switch (e.type) {
              case "join":
                text = `${who} se připojil`;
                break;
              case "start":
                text = "Turnaj odstartoval";
                break;
              case "deal":
                text = `${who} si vylosoval${e.teamIds ? ": " + e.teamIds.map((t) => ctx.tName(t)).join(", ") : " tři týmy"}`;
                break;
              case "reroll":
                text = `${who} vzal nový los${e.teamIds ? " (vrátil: " + e.teamIds.map((t) => ctx.tName(t)).join(", ") + ")" : ""}`;
                break;
              case "pick":
                text = `${who} hraje za ${e.teamId ? ctx.tName(e.teamId) : "?"}${e.byAdmin ? " (za něj vybral pořadatel)" : ""}`;
                break;
              case "result":
                text = `Výsledek ${e.text}`;
                break;
              case "result_edit":
                text = `Úprava výsledku na ${e.text}`;
                break;
              case "rename":
                text = `Přejmenování na ${e.text}`;
                break;
              case "replace":
                text = `Hráče přebírá ${e.text}`;
                break;
              case "kick":
                text = `${who} odebrán`;
                break;
              case "exhaustion":
                text = e.text ? `Osudí: řešení „${e.text}“` : "Osudí vyčerpáno";
                break;
              case "undo":
                text = "Poslední akce vrácena zpět";
                break;
              default:
                text = e.type;
            }
            return (
              <p key={i} className="history-row">
                {text}
              </p>
            );
          })}
        {view.history.length === 0 ? <p className="muted-note">Zatím prázdné.</p> : null}
      </div>

      {isAdmin ? (
        <>
          <h2 className="section-title">Nástroje pořadatele</h2>
          <div className="admin-tools">
            {view.phase !== "lobby"
              ? players.map((p) => (
                  <div key={p.id} className="admin-player-row">
                    <span>
                      <b className="td-code">{p.code}</b> {p.name}
                    </span>
                    <span>
                      <button className="mini-btn" onClick={() => setRenaming(p.id)}>
                        Přejmenovat
                      </button>
                      {!p.isAdmin ? (
                        <button className="mini-btn" onClick={() => setReplacing(p.id)}>
                          Nahradit
                        </button>
                      ) : null}
                    </span>
                  </div>
                ))
              : null}
            <button className="btn-ghost" onClick={() => void store.dispatch({ type: "undo" })}>
              Vzít poslední akci zpět
            </button>
          </div>
        </>
      ) : null}

      {localTools ? <LocalToolsPanel tools={localTools} /> : null}

      <h2 className="section-title">O aplikaci</h2>
      <p className="muted-note">
        Fearless Draw — losování týmů pro FIFA/EA FC turnaje. Hodnocení týmů je orientační.
        Žádné účty, žádná osobní data; turnaj žije pod kódem {view.code}.
        {joinUrl ? ` Odkaz: ${joinUrl.replace(/^https?:\/\//, "")}` : ""}
      </p>
      {onExitLocal ? (
        <button className="btn-ghost" onClick={onExitLocal}>
          Ukončit nouzový režim (smaže místní turnaj)
        </button>
      ) : null}

      {renaming ? (
        <NameDialog
          title="Přejmenovat hráče"
          initial={players.find((p) => p.id === renaming)?.name ?? ""}
          onCancel={() => setRenaming(null)}
          onSubmit={async (name) => {
            await store.dispatch({ type: "rename", playerId: renaming, name });
            setRenaming(null);
          }}
        />
      ) : null}
      {replacing ? (
        <NameDialog
          title={`Nahradit hráče ${ctx.name(replacing)}`}
          note="Náhradník převezme rozehrané zápasy i zamčené týmy. Po uložení se ukáže odkaz a QR pro jeho telefon."
          initial=""
          onCancel={() => setReplacing(null)}
          onSubmit={async (name) => {
            const res = await store.dispatch({
              type: "replace",
              playerId: replacing,
              newName: name,
            });
            setReplacing(null);
            if (res.ok && res.joinedToken && joinUrl && store.mode === "remote") {
              setClaimUrl(`${joinUrl}?claim=${res.joinedToken}`);
            }
          }}
        />
      ) : null}
      {claimUrl ? (
        <div className="overlay sheet" role="dialog" aria-modal="true" aria-label="Předání hráče">
          <div className="overlay-head">
            <button className="overlay-back" onClick={() => setClaimUrl(null)} aria-label="Zavřít">
              <IconSvg d={icons.back} />
            </button>
            <p className="overlay-title">Přihlášení náhradníka</p>
          </div>
          <p className="overlay-note">
            Náhradník naskenuje tento QR (nebo dostane odkaz) a je rovnou přihlášený jako hráč.
            Odkaz funguje jen pro něj — nikam ho neposílej veřejně.
          </p>
          <Cut className="qr-box" cut={14}>
            <QrCode text={claimUrl} label="QR pro přihlášení náhradníka" />
            <p className="join-url">{claimUrl.replace(/^https?:\/\//, "")}</p>
          </Cut>
          <div className="overlay-actions">
            <button
              className="btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(claimUrl);
                } catch {
                  // visible URL still works
                }
                setClaimUrl(null);
              }}
            >
              Zkopírovat odkaz a zavřít
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function NameDialog({
  title,
  note,
  initial,
  onSubmit,
  onCancel,
}: {
  title: string;
  note?: string;
  initial: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <div className="overlay sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlay-head">
        <button className="overlay-back" onClick={onCancel} aria-label="Zavřít">
          <IconSvg d={icons.back} />
        </button>
        <p className="overlay-title">{title}</p>
      </div>
      {note ? <p className="overlay-note">{note}</p> : null}
      <input
        className="text-input"
        value={name}
        maxLength={20}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="Přezdívka"
        aria-label="Přezdívka"
      />
      <div className="overlay-actions">
        <button className="btn-primary" disabled={!name.trim()} onClick={() => onSubmit(name)}>
          Uložit
        </button>
      </div>
    </div>
  );
}

/* ============================= finished ============================= */

function Finished({ ctx }: { ctx: Ctx }) {
  const { view } = ctx;
  const winner = view.players.find((p) => p.id === view.winnerId);
  const ids = view.players.filter((p) => !p.removed).map((p) => p.id);
  return (
    <main className="screen pad">
      <Cut className="winner-card" cut={18} borderColor="var(--acc)">
        <div className="winner-in">
          <p className="kicker">Vítěz turnaje {view.config.name}</p>
          <p className="winner-code">{winner?.code ?? "???"}</p>
          <p className="winner-name">{winner?.name ?? "Neznámý"}</p>
        </div>
      </Cut>
      {view.config.format === "league" ? (
        <StandingsTable ctx={ctx} matches={view.matches} playerIds={ids} caption="Konečná tabulka" />
      ) : (
        <Bracket ctx={ctx} />
      )}
    </main>
  );
}


function AddPlayerLocal({ ctx }: { ctx: Ctx }) {
  const [name, setName] = useState("");
  return (
    <form
      className="add-player"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        void ctx.store.dispatch({ type: "join", name: name.trim() });
        setName("");
      }}
    >
      <input
        className="text-input"
        value={name}
        maxLength={20}
        placeholder="Jméno dalšího hráče"
        aria-label="Jméno dalšího hráče"
        onChange={(e) => setName(e.target.value)}
      />
      <button className="chip-btn" type="submit" disabled={!name.trim()}>
        Přidat hráče
      </button>
    </form>
  );
}

function LocalToolsPanel({ tools }: { tools: LocalTools }) {
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <h2 className="section-title">Záloha turnaje</h2>
      <div className="admin-tools">
        <button
          className="btn-ghost"
          onClick={async () => {
            const data = tools.exportState();
            try {
              await navigator.clipboard.writeText(data);
              setMsg("Záloha zkopírována do schránky.");
            } catch {
              setShowExport(true);
            }
          }}
        >
          Zkopírovat zálohu (JSON)
        </button>
        {showExport ? (
          <textarea
            className="text-input export-area"
            readOnly
            value={tools.exportState()}
            aria-label="Záloha turnaje"
            onFocus={(e) => e.currentTarget.select()}
          />
        ) : null}
        <textarea
          className="text-input export-area"
          placeholder="Sem vlož zálohu pro obnovení…"
          value={importText}
          aria-label="Vložit zálohu"
          onChange={(e) => setImportText(e.target.value)}
        />
        <button
          className="btn-ghost"
          disabled={!importText.trim()}
          onClick={() => {
            const ok = tools.importState(importText.trim());
            setMsg(ok ? "Turnaj obnoven ze zálohy." : "Tohle není platná záloha.");
            if (ok) setImportText("");
          }}
        >
          Obnovit ze zálohy
        </button>
        {msg ? <p className="muted-note">{msg}</p> : null}
      </div>
    </>
  );
}
