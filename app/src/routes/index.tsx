import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";

import { CreateForm } from "../components/create-form";
import { Cut, IconSvg, icons } from "../components/ui";
import { createTournamentFn } from "../lib/api/tournament.functions";
import { saveIdentity } from "../lib/client/identity";
import type { TournamentConfig } from "../engine/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Fearless Draw — turnajová losovačka pro FIFA a EA FC" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;1,700&display=swap",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [joinCode, setJoinCode] = useState("");
  const [created, setCreated] = useState<{
    code: string;
    recoveryCode: string;
  } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const submitCreate = async (config: TournamentConfig, adminName: string) => {
    setCreateError(null);
    try {
      const res = await createTournamentFn({ data: { config, adminName } });
      if (!res.ok) {
        setCreateError(res.message ?? "Turnaj se nepodařilo založit.");
        return;
      }
      saveIdentity(res.code, {
        playerId: res.playerId,
        token: res.token,
        isAdmin: true,
        recoveryCode: res.recoveryCode,
      });
      setCreated({ code: res.code, recoveryCode: res.recoveryCode });
    } catch {
      setCreateError(
        "Server je nedostupný. Zkus to znovu, nebo dole spusť nouzový režim na jednom telefonu.",
      );
    }
  };

  return (
    <div className="app home">
      <main className="screen pad">
        <header className="home-hero">
          <p className="home-brand">Fearless Draw</p>
          <h1 className="home-title">
            Turnajová losovačka
            <br />
            pro FIFA a EA FC
          </h1>
          <p className="home-sub">
            Každý hráč na svém telefonu. Server losuje tři týmy, vybíráš jeden — a kdo už
            hrál, toho tým je zamčený. Žádné účty, jen přezdívka a kód.
          </p>
        </header>

        {mode === "menu" ? (
          <div className="home-actions">
            <button className="btn-primary" onClick={() => setMode("create")}>
              Založit turnaj
            </button>
            <button className="btn-ghost" onClick={() => setMode("join")}>
              Připojit se kódem
            </button>
            <Link to="/local" className="home-local-link">
              Nouzový režim — vše na jednom telefonu
            </Link>
          </div>
        ) : null}

        {mode === "join" ? (
          <form
            className="join-form"
            onSubmit={(e) => {
              e.preventDefault();
              const code = joinCode.trim().toUpperCase();
              if (code.length >= 4) void navigate({ to: "/t/$code", params: { code } });
            }}
          >
            <button
              type="button"
              className="overlay-back"
              onClick={() => setMode("menu")}
              aria-label="Zpět"
            >
              <IconSvg d={icons.back} />
            </button>
            <label className="field">
              <span className="field-label">Kód turnaje</span>
              <input
                className="text-input code-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Např. K7XR4"
                maxLength={8}
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
              />
            </label>
            <button className="btn-primary" type="submit" disabled={joinCode.trim().length < 4}>
              Pokračovat
            </button>
          </form>
        ) : null}

        {mode === "create" ? (
          <section>
            <button
              type="button"
              className="overlay-back"
              onClick={() => setMode("menu")}
              aria-label="Zpět"
            >
              <IconSvg d={icons.back} />
            </button>
            {createError ? (
              <div className="error-banner" role="alert">
                <span>{createError}</span>
                <Link to="/local" className="error-banner-link">
                  Nouzový režim
                </Link>
              </div>
            ) : null}
            <CreateForm mode="remote" onSubmit={submitCreate} />
          </section>
        ) : null}

        <footer className="home-foot">
          <p>
            FIFA 17 → EA FC 26 · 270+ týmů · hodnocení orientační · bez účtů a osobních dat
          </p>
        </footer>
      </main>

      {created ? (
        <div className="overlay sheet" role="dialog" aria-modal="true" aria-label="Záchranný kód">
          <p className="overlay-title">Turnaj založen — ulož si záchranný kód</p>
          <p className="overlay-note">
            Když ztratíš telefon nebo se odhlásíš, tímhle kódem získáš pořadatelská práva
            zpět. Nikde jinde ho neuvidíš.
          </p>
          <Cut className="recovery-box" cut={12} borderColor="var(--acc)">
            <p className="recovery-code">{created.recoveryCode}</p>
          </Cut>
          <div className="overlay-actions">
            <button
              className="btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(created.recoveryCode);
                } catch {
                  // the code stays visible above
                }
                void navigate({ to: "/t/$code", params: { code: created.code } });
              }}
            >
              Zkopírovat a vstoupit do lobby
            </button>
            <button
              className="btn-ghost"
              onClick={() => void navigate({ to: "/t/$code", params: { code: created.code } })}
            >
              Mám ho uložený, pokračovat
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
