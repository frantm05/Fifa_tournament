# Fearless Draw

Multiplayer tournament app for FIFA / EA FC game nights. Czech UI, mobile-first.
Live at **https://fearless-draw.higgsfield.app**.

Every player joins from their own phone with a 5-letter code or QR. The core
mechanic is the **fearless draft**: for each match the server deals every
player a hand of 3 teams (CSPRNG, star-band balanced), the player picks one,
the picked team is locked for the rest of the tournament and the unpicked
teams return to the pool immediately.

## Features

- Three formats: round-robin league (single/double), single-elimination cup
  (penalties on draw), groups + knockout — picked at creation.
- 275-team dataset spanning FIFA 17 → FC 26 with per-version availability,
  licensing name overrides (Piemonte Calcio, Roma FC, …) and star overrides.
- Server is the single source of truth: one D1 row per tournament with
  compare-and-swap versioned writes and idempotency-key replay; clients poll
  (~1.6 s) with a version short-circuit.
- Hands are idempotent, keyed `(tournamentId, matchId, playerId)` — refresh or
  a second tab returns the identical hand. Re-rolls decrement server-side and
  block at 0. Pool exhaustion offers admin recovery options.
- Admin tools: results (score + penalty winner), edit with recompute, act on
  behalf of a player, replace player via claim QR, undo, recovery code.
- Local single-device fallback mode (same engine, localStorage, JSON
  export/import) for when the network dies.

## Layout

- `app/` — Cloudflare Worker app (React 19 + TanStack Start SSR + D1). The
  pure isomorphic engine lives in `app/src/engine/`; deployment platform
  scaffold files (`packages/`, lockfile) are not mirrored here.
- `tests/` — engine + QR unit tests (bun test) and Playwright multi-client
  E2E: `e2e-smoke.mjs` (4 phones, full league) and `e2e-matrix.mjs`
  (20-item verification matrix), both run against a local miniflare build
  (`serve.mjs`).

Team star ratings are approximate ("hodnocení orientační").
