import { useMemo, useState } from "react";

import { teamName, teamsForVersions } from "../engine/teams";
import { ALL_VERSIONS, type GameVersion, type TournamentConfig } from "../engine/types";
import { Crest, IconSvg, icons, Spinner } from "./ui";

export const DEFAULT_CONFIG: TournamentConfig = {
  name: "Páteční turnaj",
  maxPlayers: 8,
  versions: ["26"],
  format: "league",
  doubleRound: false,
  groupCount: 2,
  rerollsPerMatch: 0,
  handSize: 3,
  balanced: true,
  fearless: true,
  includeNational: true,
  banned: [],
  minStars: 0,
};

function versionLabel(v: GameVersion): string {
  return Number(v) >= 24 ? `FC ${v}` : `FIFA ${v}`;
}

export function CreateForm({
  mode,
  onSubmit,
}: {
  mode: "remote" | "local";
  onSubmit: (config: TournamentConfig, adminName: string) => Promise<void>;
}) {
  const [config, setConfig] = useState<TournamentConfig>(DEFAULT_CONFIG);
  const [adminName, setAdminName] = useState("");
  const [banOpen, setBanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof TournamentConfig>(k: K, v: TournamentConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const poolCount = useMemo(
    () =>
      teamsForVersions(config.versions, config.includeNational).filter(
        (t) => !config.banned.includes(t.id),
      ).length,
    [config.versions, config.includeNational, config.banned],
  );

  return (
    <form
      className="create-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!adminName.trim() || busy) return;
        setBusy(true);
        await onSubmit(config, adminName.trim());
        setBusy(false);
      }}
    >
      <label className="field">
        <span className="field-label">Tvoje přezdívka (budeš pořadatel i hráč)</span>
        <input
          className="text-input"
          value={adminName}
          maxLength={20}
          required
          placeholder="Např. Matěj"
          onChange={(e) => setAdminName(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">Název turnaje</span>
        <input
          className="text-input"
          value={config.name}
          maxLength={40}
          onChange={(e) => set("name", e.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">Formát</span>
        <div className="radio-cards">
          {(
            [
              ["league", "Každý s každým", "liga, tabulka rozhodne"],
              ["cup", "Pavouk", "prohra = konec"],
              ["groups", "Skupiny + pavouk", "od 4 hráčů"],
            ] as const
          ).map(([id, label, sub]) => (
            <button
              type="button"
              key={id}
              className={"radio-card" + (config.format === id ? " on" : "")}
              aria-pressed={config.format === id}
              onClick={() => set("format", id)}
            >
              <b>{label}</b>
              <span>{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {config.format === "league" ? (
        <ToggleRow
          label="Dvoukolově (každá dvojice dvakrát)"
          value={config.doubleRound}
          onChange={(v) => set("doubleRound", v)}
        />
      ) : null}
      {config.format === "groups" ? (
        <div className="field">
          <span className="field-label">Počet skupin</span>
          <div className="chip-row">
            {([2, 4] as const).map((n) => (
              <button
                type="button"
                key={n}
                className={"chip-btn" + (config.groupCount === n ? " chip-on" : "")}
                onClick={() => set("groupCount", n)}
              >
                {n} skupiny{n === 4 ? " (od 8 hráčů)" : ""}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="field">
        <span className="field-label">Počet míst pro hráče</span>
        <div className="chip-row">
          {[2, 4, 6, 8, 10, 12, 16].map((n) => (
            <button
              type="button"
              key={n}
              className={"chip-btn" + (config.maxPlayers === n ? " chip-on" : "")}
              onClick={() => set("maxPlayers", n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Verze hry (pool = součet vybraných)</span>
        <div className="chip-row chip-wrap">
          {ALL_VERSIONS.map((v) => {
            const on = config.versions.includes(v);
            return (
              <button
                type="button"
                key={v}
                className={"chip-btn" + (on ? " chip-on" : "")}
                aria-pressed={on}
                onClick={() =>
                  set(
                    "versions",
                    on
                      ? config.versions.filter((x) => x !== v)
                      : [...config.versions, v].sort(),
                  )
                }
              >
                {versionLabel(v)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Nové losy (re-roll) na hráče a zápas</span>
        <div className="chip-row">
          {[0, 1, 2, 3].map((n) => (
            <button
              type="button"
              key={n}
              className={"chip-btn" + (config.rerollsPerMatch === n ? " chip-on" : "")}
              onClick={() => set("rerollsPerMatch", n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <ToggleRow
        label="Vyrovnané síly (oba losují ze stejného pásma hvězd)"
        value={config.balanced}
        onChange={(v) => set("balanced", v)}
      />
      <ToggleRow
        label="Zahrnout reprezentace"
        value={config.includeNational}
        onChange={(v) => set("includeNational", v)}
      />

      <div className="field">
        <span className="field-label">Minimální síla týmů</span>
        <div className="chip-row">
          {(
            [
              [0, "bez limitu"],
              [3, "3★+"],
              [3.5, "3,5★+"],
              [4, "4★+"],
            ] as const
          ).map(([n, label]) => (
            <button
              type="button"
              key={n}
              className={"chip-btn" + (config.minStars === n ? " chip-on" : "")}
              onClick={() => set("minStars", n)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Zakázané týmy</span>
        <button type="button" className="chip-btn" onClick={() => setBanOpen(true)}>
          {config.banned.length
            ? `Upravit ban list (${config.banned.length})`
            : "Vybrat zakázané týmy"}
        </button>
      </div>

      <p className="muted-note">
        V osudí bude {poolCount} týmů{config.minStars ? ` (před filtrem síly)` : ""}. Hodnocení
        orientační.
      </p>

      <button
        className="btn-primary"
        type="submit"
        disabled={busy || !adminName.trim() || config.versions.length === 0}
      >
        {busy ? <Spinner /> : null}
        {mode === "remote" ? "Založit turnaj" : "Založit turnaj v nouzovém režimu"}
      </button>

      {banOpen ? (
        <BanPicker
          versions={config.versions}
          includeNational={config.includeNational}
          banned={config.banned}
          onChange={(b) => set("banned", b)}
          onClose={() => setBanOpen(false)}
        />
      ) : null}
    </form>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={"toggle-row" + (value ? " on" : "")}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
    >
      <span>{label}</span>
      <span className="toggle-pill" aria-hidden="true">
        <span className="toggle-dot" />
      </span>
    </button>
  );
}

function BanPicker({
  versions,
  includeNational,
  banned,
  onChange,
  onClose,
}: {
  versions: GameVersion[];
  includeNational: boolean;
  banned: string[];
  onChange: (banned: string[]) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const teams = useMemo(() => {
    const all = teamsForVersions(versions.length ? versions : ["26"], includeNational);
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
    const nq = norm(q);
    const vs = versions.length ? versions : (["26"] as GameVersion[]);
    return all
      .filter(
        (t) =>
          !nq ||
          norm(t.name).includes(nq) ||
          // licensing renames (Piemonte Calcio, Roma FC, …) must be findable
          norm(teamName(t, vs)).includes(nq) ||
          norm(t.league).includes(nq) ||
          norm(t.code).includes(nq),
      )
      .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name, "cs"));
  }, [q, versions, includeNational]);

  const toggle = (id: string) =>
    onChange(banned.includes(id) ? banned.filter((x) => x !== id) : [...banned, id]);

  return (
    <div className="overlay sheet" role="dialog" aria-modal="true" aria-label="Zakázané týmy">
      <div className="overlay-head">
        <button type="button" className="overlay-back" onClick={onClose} aria-label="Hotovo, zavřít">
          <IconSvg d={icons.back} />
        </button>
        <div>
          <p className="overlay-title">Zakázané týmy</p>
          <p className="overlay-kicker">{banned.length} zabanováno · klepnutím přepínáš</p>
        </div>
      </div>
      <input
        className="text-input"
        placeholder="Hledat tým nebo ligu…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Hledat tým"
      />
      <div className="ban-list">
        {teams.slice(0, 120).map((t) => {
          const on = banned.includes(t.id);
          return (
            <button
              type="button"
              key={t.id}
              className={"ban-row" + (on ? " banned" : "")}
              aria-pressed={on}
              onClick={() => toggle(t.id)}
            >
              <Crest team={t} size={26} />
              <span className="ban-name">
                {teamName(t, versions)}
                <em>{t.league}</em>
              </span>
              <span className="ban-mark">{on ? "BAN" : ""}</span>
            </button>
          );
        })}
        {teams.length > 120 ? (
          <p className="muted-note">Zpřesni hledání ({teams.length} výsledků)…</p>
        ) : null}
      </div>
      <div className="overlay-actions">
        <button type="button" className="btn-primary" onClick={onClose}>
          Hotovo ({banned.length} zabanováno)
        </button>
      </div>
    </div>
  );
}
