import { Miniflare } from "miniflare";
import fs from "node:fs";
import path from "node:path";

const APP = "/tmp/claude-0/-home-user-Fifa-tournament/c9ae14bb-b2f4-5a79-aebe-8a187f0f02eb/scratchpad/fearless-draw/app";
const ROOT = path.join(APP, "dist/server");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const modules = [
  { type: "ESModule", path: path.join(ROOT, "server.js") },
  ...walk(ROOT)
    .filter((p) => p !== path.join(ROOT, "server.js"))
    .map((p) => ({ type: p.endsWith(".js") ? "ESModule" : "Text", path: p })),
];

const mf = new Miniflare({
  modules,
  modulesRoot: ROOT,
  compatibilityDate: "2026-07-01",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: { DB: "fearless-local" },
  assets: {
    directory: path.join(APP, "dist/client"),
    binding: "ASSETS",
    routerConfig: { has_user_worker: true },
  },
  bindings: { HF_ENV: "local" },
  port: 8788,
  host: "127.0.0.1",
});
await mf.ready;
console.log("miniflare ready on http://127.0.0.1:8788");
