import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CreateForm } from "../components/create-form";
import { TournamentApp } from "../components/tournament-app";
import { createTournament } from "../engine/engine";
import { cryptoRng } from "../engine/random";
import type { TournamentConfig, TournamentState } from "../engine/types";
import { loadLocalState, useLocalTournament } from "../lib/client/store";

export const Route = createFileRoute("/local")({
  head: () => ({
    meta: [{ title: "Nouzový režim — Fearless Draw" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;1,700&display=swap",
      },
    ],
  }),
  component: LocalPage,
});

function LocalPage() {
  // localStorage is browser-only; hydrate after mount to stay SSR-safe.
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState<TournamentState | null>(null);
  useEffect(() => {
    setInitial(loadLocalState());
    setReady(true);
  }, []);
  if (!ready) return null;
  return <LocalInner initial={initial} />;
}

function LocalInner({ initial }: { initial: TournamentState | null }) {
  const store = useLocalTournament(initial);

  const create = async (config: TournamentConfig, adminName: string) => {
    const { state } = createTournament(cryptoRng(), Date.now(), config, adminName);
    store.setState(state);
  };

  if (!store.fullState) {
    return (
      <div className="app home">
        <main className="screen pad">
          <div className="local-banner" role="status">
            Nouzový režim — turnaj poběží jen na tomto telefonu, který se bude podávat
            dokola. Server není potřeba.
          </div>
          <header className="home-hero">
            <p className="home-brand">Fearless Draw</p>
            <h1 className="home-title">Turnaj na jednom telefonu</h1>
          </header>
          <CreateForm mode="local" onSubmit={create} />
          <footer className="home-foot">
            <Link to="/" className="home-local-link">
              Zpět na úvod
            </Link>
          </footer>
        </main>
      </div>
    );
  }

  return (
    <TournamentApp
      store={store}
      joinUrl={null}
      localBanner
      onExitLocal={() => {
        if (window.confirm("Opravdu ukončit a smazat místní turnaj?")) {
          store.setState(null);
        }
      }}
      localTools={{
        exportState: () => JSON.stringify(store.fullState),
        importState: (raw) => {
          try {
            const parsed = JSON.parse(raw) as TournamentState;
            if (!parsed || !Array.isArray(parsed.players) || !parsed.config) return false;
            store.setState(parsed);
            return true;
          } catch {
            return false;
          }
        },
      }}
    />
  );
}
