import { createFileRoute } from "@tanstack/react-router";

import { findPlayerByToken, toView } from "../../engine/engine";
import { ensureSchema, loadByCode, requireDb } from "../../lib/api/db.server";

/**
 * Polling endpoint. `?code=&token=&v=` — when `v` matches the stored version
 * the payload is a tiny `{unchanged:true}` so 1.5s polling stays cheap.
 */
export const Route = createFileRoute("/api/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = (url.searchParams.get("code") ?? "").toUpperCase();
        const token = url.searchParams.get("token");
        const since = Number(url.searchParams.get("v") ?? 0);
        const headers = {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        };
        if (!code) {
          return new Response(JSON.stringify({ ok: false, code: "bad_request" }), {
            status: 400,
            headers,
          });
        }
        try {
          const db = requireDb();
          await ensureSchema(db);
          const row = await loadByCode(db, code);
          if (!row) {
            return new Response(
              JSON.stringify({ ok: false, code: "not_found", message: "Turnaj neexistuje." }),
              { status: 404, headers },
            );
          }
          if (since > 0 && since === row.version) {
            return new Response(JSON.stringify({ ok: true, unchanged: true, version: row.version }), {
              headers,
            });
          }
          const player = findPlayerByToken(row.state, token);
          const view = toView(row.state, {
            playerId: player?.id ?? null,
            isAdmin: player?.isAdmin ?? false,
          });
          return new Response(
            JSON.stringify({
              ok: true,
              version: row.version,
              view,
              you: player ? { playerId: player.id, isAdmin: player.isAdmin } : null,
            }),
            { headers },
          );
        } catch (e) {
          console.error(e);
          return new Response(
            JSON.stringify({ ok: false, code: "server_error", message: "Chyba serveru." }),
            { status: 500, headers },
          );
        }
      },
    },
  },
});
