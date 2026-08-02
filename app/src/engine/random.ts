import type { Rng } from "./types";

/**
 * CSPRNG-backed uniform random in [0,1). Works in Workers, browsers and Bun —
 * all expose WebCrypto `crypto.getRandomValues`.
 */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(64);
  let i = buf.length;
  return () => {
    if (i >= buf.length) {
      crypto.getRandomValues(buf);
      i = 0;
    }
    return buf[i++] / 4294967296;
  };
}

/** Unbiased integer in [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draw k distinct elements uniformly at random. */
export function sample<T>(rng: Rng, arr: T[], k: number): T[] {
  return shuffle(rng, arr).slice(0, k);
}

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
/** Join codes avoid O/0/I/1 per the readability requirement. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomId(rng: Rng, len = 16): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ID_ALPHABET[randInt(rng, ID_ALPHABET.length)];
  return s;
}

export function randomJoinCode(rng: Rng, len = 5): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[randInt(rng, CODE_ALPHABET.length)];
  return s;
}

export function randomToken(rng: Rng): string {
  return randomId(rng, 24);
}
