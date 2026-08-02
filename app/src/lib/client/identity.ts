/**
 * Per-tournament identity, kept in memory first and mirrored to localStorage
 * inside try/catch — storage failing must never break the app.
 */

export type Identity = {
  playerId: string;
  token: string;
  isAdmin: boolean;
  recoveryCode?: string;
};

const memory = new Map<string, Identity>();

function storageKey(code: string): string {
  return `fd_id_${code.toUpperCase()}`;
}

export function loadIdentity(code: string): Identity | null {
  const mem = memory.get(code.toUpperCase());
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(storageKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    if (!parsed.playerId || !parsed.token) return null;
    memory.set(code.toUpperCase(), parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function saveIdentity(code: string, id: Identity): void {
  memory.set(code.toUpperCase(), id);
  try {
    localStorage.setItem(storageKey(code), JSON.stringify(id));
  } catch {
    // storage unavailable — memory copy keeps the session alive
  }
}

export function clearIdentity(code: string): void {
  memory.delete(code.toUpperCase());
  try {
    localStorage.removeItem(storageKey(code));
  } catch {
    // ignore
  }
}

/** Random idempotency key for one mutation attempt (client-side, not secret). */
export function newIdempotencyKey(): string {
  try {
    const buf = new Uint8Array(12);
    crypto.getRandomValues(buf);
    return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}
