import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { TournamentApp } from "../components/tournament-app";
import { IconSvg, icons, Spinner } from "../components/ui";
import { recoverAdminFn } from "../lib/api/tournament.functions";
import { loadIdentity, saveIdentity } from "../lib/client/identity";
import { useRemoteTournament } from "../lib/client/store";

export const Route = createFileRoute("/t/$code")({
  head: ({ params }) => ({
    meta: [{ title: `Turnaj ${params.code} — Fearless Draw` }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;1,700&display=swap",
      },
    ],
  }),
  component: TournamentPage,
});

function TournamentPage() {
  const { code } = Route.useParams();
  const upperCode = code.toUpperCase();
  const [claimed, setClaimed] = useState(false);

  // Claim links (?claim=TOKEN) log this device in as an existing player —
  // used for replacements and admin hand-offs. The playerId is healed from
  // the first poll's `you` echo.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const claim = url.searchParams.get("claim");
      if (claim) {
        saveIdentity(upperCode, { playerId: "", token: claim, isAdmin: false });
        url.searchParams.delete("claim");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      // ignore malformed URLs
    }
    setClaimed(true);
  }, [upperCode]);

  if (!claimed) return <LoadingScreen />;
  return <TournamentInner code={upperCode} />;
}

function TournamentInner({ code }: { code: string }) {
  const store = useRemoteTournament(code);
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/t/${code}`;
  }, [code]);

  if (store.conn === "loading" && !store.view) return <LoadingScreen />;

  if (!store.view) {
    if (store.conn === "offline" || store.conn === "reconnecting") {
      return (
        <FullMessage title="Server je nedostupný">
          <p>Zkontroluj připojení — zkouším to dál. Pokud server nenaběhne, dá se hrát v nouzovém režimu na jednom telefonu.</p>
          <div className="overlay-actions">
            <Link to="/local" className="btn-primary">
              Spustit nouzový režim
            </Link>
          </div>
        </FullMessage>
      );
    }
    return (
      <FullMessage title="Turnaj nenalezen">
        <p>
          Pod kódem <b>{code}</b> žádný turnaj neběží. Zkontroluj překlepy — kód nikdy
          neobsahuje O, 0, I ani 1.
        </p>
        <div className="overlay-actions">
          <Link to="/" className="btn-primary">
            Na úvod
          </Link>
        </div>
      </FullMessage>
    );
  }

  const view = store.view;
  const me = store.identity
    ? view.players.find((p) => p.id === store.identity!.playerId && !p.removed)
    : null;

  if (!me) return <JoinGate code={code} store={store} />;

  return <TournamentApp store={store} joinUrl={joinUrl} />;
}

function JoinGate({
  code,
  store,
}: {
  code: string;
  store: ReturnType<typeof useRemoteTournament>;
}) {
  const view = store.view!;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recovery, setRecovery] = useState("");
  const [recoverMsg, setRecoverMsg] = useState<string | null>(null);
  const players = view.players.filter((p) => !p.removed);
  const full = players.length >= view.config.maxPlayers;
  const running = view.phase !== "lobby";

  return (
    <div className="app">
      <main className="screen pad join-gate">
        <header className="home-hero">
          <p className="home-brand">Fearless Draw</p>
          <h1 className="home-title">{view.config.name}</h1>
          <p className="home-sub">
            Turnaj {code} · {players.length}/{view.config.maxPlayers} hráčů
            {running ? " · už se hraje" : ""}
          </p>
        </header>

        {store.error ? (
          <div className="error-banner" role="alert">
            <span>{store.error.message}</span>
            <button onClick={store.dismissError} aria-label="Zavřít hlášku">
              <IconSvg d={icons.x} size={16} />
            </button>
          </div>
        ) : null}

        {!running && !full ? (
          <form
            className="join-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim() || busy) return;
              setBusy(true);
              await store.dispatch({ type: "join", name: name.trim() });
              setBusy(false);
            }}
          >
            <label className="field">
              <span className="field-label">Tvoje přezdívka</span>
              <input
                className="text-input"
                value={name}
                maxLength={20}
                autoFocus
                placeholder="Např. Kuba"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="btn-primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? <Spinner /> : null}
              Vstoupit do turnaje
            </button>
          </form>
        ) : (
          <div className="join-blocked">
            <p>
              {running
                ? "Turnaj už odstartoval — nové hráče teď přidat nejde. Pokud nahrazuješ vypadlého hráče, požádej pořadatele o QR pro převzetí."
                : "Turnaj je plný. Požádej pořadatele o uvolnění místa."}
            </p>
          </div>
        )}

        <div className="join-players">
          <h2 className="section-title">Kdo už je uvnitř</h2>
          {players.map((p) => (
            <p key={p.id} className="join-player-row">
              <b className="td-code">{p.code}</b> {p.name}
              {p.isAdmin ? <em className="player-tag">Pořadatel</em> : null}
            </p>
          ))}
        </div>

        <button className="link-btn" onClick={() => setRecoverOpen((v) => !v)}>
          Jsem pořadatel a přišel jsem o telefon
        </button>
        {recoverOpen ? (
          <form
            className="join-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setRecoverMsg(null);
              try {
                const res = await recoverAdminFn({
                  data: { code, recoveryCode: recovery.trim() },
                });
                if (!res.ok) {
                  setRecoverMsg(res.message ?? "Kód nesedí.");
                  return;
                }
                saveIdentity(code, {
                  playerId: res.playerId,
                  token: res.token,
                  isAdmin: true,
                });
                store.refresh();
                window.location.reload();
              } catch {
                setRecoverMsg("Server neodpovídá, zkus to znovu.");
              }
            }}
          >
            <label className="field">
              <span className="field-label">Záchranný kód pořadatele</span>
              <input
                className="text-input code-input"
                value={recovery}
                maxLength={12}
                autoCapitalize="characters"
                onChange={(e) => setRecovery(e.target.value.toUpperCase())}
              />
            </label>
            {recoverMsg ? <p className="muted-note">{recoverMsg}</p> : null}
            <button className="btn-ghost" type="submit" disabled={recovery.trim().length < 4}>
              Obnovit pořadatelská práva
            </button>
          </form>
        ) : null}
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="app">
      <div className="fullmsg">
        <Spinner />
        <p>Připojuji k turnaji…</p>
      </div>
    </div>
  );
}

function FullMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app">
      <div className="fullmsg">
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

// Re-exported for the claim flow note in docs; keeps linters quiet about unused import.
void loadIdentity;
