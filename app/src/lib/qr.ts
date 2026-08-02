/**
 * Minimal QR code generator — byte mode, error correction level M,
 * versions 1–6, all eight masks with standard penalty scoring.
 * Self-contained (no dependencies); returns a boolean matrix.
 */

/* ---------- GF(256) arithmetic for Reed–Solomon ---------- */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]; // × x (leading-first order)
      next[j + 1] ^= gfMul(poly[j], EXP[i]); // × α^i
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Uint8Array(ecLen);
  for (const d of data) {
    const factor = d ^ res[0];
    res.copyWithin(0, 1);
    res[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLen; j++) {
        res[j] ^= gfMul(gen[j + 1] ?? 0, factor);
      }
    }
  }
  return res;
}

/* ---------- capacity tables, EC level M ---------- */

// [totalCodewords, ecPerBlock, blocksGroup1, dataPerBlock1, blocksGroup2, dataPerBlock2]
const VERSIONS_M: [number, number, number, number, number, number][] = [
  [26, 10, 1, 16, 0, 0], // v1
  [44, 16, 1, 28, 0, 0], // v2
  [70, 26, 1, 44, 0, 0], // v3
  [100, 18, 2, 32, 0, 0], // v4
  [134, 24, 2, 43, 0, 0], // v5
  [172, 16, 4, 27, 0, 0], // v6
];
// Versions 7+ would additionally need the 18-bit version-information blocks;
// join URLs fit comfortably in v3–v4, so v6 (108 data bytes) is the ceiling.

const ALIGNMENT: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

/* ---------- matrix construction ---------- */

type Matrix = { size: number; get: (r: number, c: number) => boolean };

export function makeQr(text: string): Matrix {
  const bytes = new TextEncoder().encode(text);

  // pick version
  let version = -1;
  let spec: (typeof VERSIONS_M)[number] | undefined;
  for (let v = 0; v < VERSIONS_M.length; v++) {
    const s = VERSIONS_M[v];
    const dataCw = s[0] - s[1] * (s[2] + s[4]);
    const capacityBits = dataCw * 8;
    const needed = 4 + (v + 1 <= 9 ? 8 : 16) + bytes.length * 8;
    if (needed <= capacityBits) {
      version = v + 1;
      spec = s;
      break;
    }
  }
  if (version === -1 || !spec) throw new Error("qr: payload too long");

  const [total, ecPerBlock, g1, d1, g2, d2] = spec;
  const dataCw = total - ecPerBlock * (g1 + g2);

  // bit stream
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  push(0b0100, 4); // byte mode
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  // terminator + pad to byte
  push(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const data = new Uint8Array(dataCw);
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data[i / 8] = b;
  }
  // pad codewords
  const pads = [0xec, 0x11];
  for (let i = bits.length / 8, k = 0; i < dataCw; i++, k++) data[i] = pads[k % 2];

  // split into blocks + interleave
  const blocks: Uint8Array[] = [];
  let off = 0;
  for (let i = 0; i < g1; i++) {
    blocks.push(data.slice(off, off + d1));
    off += d1;
  }
  for (let i = 0; i < g2; i++) {
    blocks.push(data.slice(off, off + d2));
    off += d2;
  }
  const ecBlocks = blocks.map((b) => rsEncode(b, ecPerBlock));
  const interleaved: number[] = [];
  const maxLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxLen; i++)
    for (const b of blocks) if (i < b.length) interleaved.push(b[i]);
  for (let i = 0; i < ecPerBlock; i++) for (const e of ecBlocks) interleaved.push(e[i]);

  // module matrix
  const size = 17 + version * 4;
  const modules: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array<boolean | null>(size).fill(null),
  );

  const setFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const on =
          dr >= 0 &&
          dr <= 6 &&
          dc >= 0 &&
          dc <= 6 &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        modules[rr][cc] = on;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // timing
  for (let i = 8; i < size - 8; i++) {
    if (modules[6][i] === null) modules[6][i] = i % 2 === 0;
    if (modules[i][6] === null) modules[i][6] = i % 2 === 0;
  }

  // alignment patterns
  const centers = ALIGNMENT[version - 1];
  for (const r of centers) {
    for (const c of centers) {
      if (modules[r][c] !== null) continue; // overlaps finder
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++)
          modules[r + dr][c + dc] =
            Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
    }
  }

  // reserve format areas
  const reserved: [number, number][] = [];
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      reserved.push([8, i], [i, 8]);
    }
  }
  for (let i = 0; i < 8; i++) reserved.push([8, size - 1 - i], [size - 1 - i, 8]);
  for (const [r, c] of reserved) if (modules[r][c] === null) modules[r][c] = false;
  modules[size - 8][8] = true; // dark module

  // data placement (zig-zag), collect coordinates
  const coords: [number, number][] = [];
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (modules[r][c] === null) coords.push([r, c]);
      }
    }
    upward = !upward;
  }
  const dataBits: number[] = [];
  for (const cw of interleaved) for (let i = 7; i >= 0; i--) dataBits.push((cw >> i) & 1);
  while (dataBits.length < coords.length) dataBits.push(0);

  const applyMask = (mask: number): boolean[][] => {
    const m = modules.map((row) => row.slice()) as (boolean | null)[][];
    coords.forEach(([r, c], i) => {
      let bit = dataBits[i] === 1;
      let invert = false;
      switch (mask) {
        case 0:
          invert = (r + c) % 2 === 0;
          break;
        case 1:
          invert = r % 2 === 0;
          break;
        case 2:
          invert = c % 3 === 0;
          break;
        case 3:
          invert = (r + c) % 3 === 0;
          break;
        case 4:
          invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
          break;
        case 5:
          invert = ((r * c) % 2) + ((r * c) % 3) === 0;
          break;
        case 6:
          invert = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
          break;
        default:
          invert = (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      }
      if (invert) bit = !bit;
      m[r][c] = bit;
    });
    return m as boolean[][];
  };

  const writeFormat = (m: boolean[][], mask: number) => {
    // EC level M = 0b00
    const fmt = (0b00 << 3) | mask;
    let rem = fmt << 10;
    const G = 0b10100110111;
    for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= G << (i - 10);
    const bitsF = ((fmt << 10) | rem) ^ 0b101010000010010;
    const at = (r: number, c: number, i: number) => {
      m[r][c] = ((bitsF >> i) & 1) === 1;
    };
    // Copy 1, around the top-left finder (LSB-first ordering per spec).
    for (let i = 0; i <= 5; i++) at(i, 8, i);
    at(7, 8, 6);
    at(8, 8, 7);
    at(8, 7, 8);
    for (let i = 9; i <= 14; i++) at(8, 14 - i, i);
    // Copy 2, split between the right end of row 8 and bottom of column 8.
    for (let i = 0; i <= 7; i++) at(8, size - 1 - i, i);
    for (let i = 8; i <= 14; i++) at(size - 15 + i, 8, i);
  };

  const penalty = (m: boolean[][]): number => {
    let score = 0;
    // rule 1: runs
    for (let pass = 0; pass < 2; pass++) {
      for (let r = 0; r < size; r++) {
        let run = 1;
        for (let c = 1; c < size; c++) {
          const cur = pass === 0 ? m[r][c] : m[c][r];
          const prev = pass === 0 ? m[r][c - 1] : m[c - 1][r];
          if (cur === prev) run++;
          else {
            if (run >= 5) score += run - 2;
            run = 1;
          }
        }
        if (run >= 5) score += run - 2;
      }
    }
    // rule 2: 2×2 blocks
    for (let r = 0; r < size - 1; r++)
      for (let c = 0; c < size - 1; c++) {
        const v = m[r][c];
        if (m[r][c + 1] === v && m[r + 1][c] === v && m[r + 1][c + 1] === v) score += 3;
      }
    // rule 3: finder-like patterns
    const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
    const pat2 = pat1.slice().reverse();
    for (let pass = 0; pass < 2; pass++) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c + 11 <= size; c++) {
          let m1 = true;
          let m2 = true;
          for (let i = 0; i < 11; i++) {
            const v = pass === 0 ? m[r][c + i] : m[c + i][r];
            if (v !== pat1[i]) m1 = false;
            if (v !== pat2[i]) m2 = false;
          }
          if (m1) score += 40;
          if (m2) score += 40;
        }
      }
    }
    // rule 4: dark ratio
    let dark = 0;
    for (const row of m) for (const v of row) if (v) dark++;
    const pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  };

  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = applyMask(mask);
    writeFormat(m, mask);
    const s = penalty(m);
    if (s < bestScore) {
      bestScore = s;
      best = m;
    }
  }
  const grid = best!;
  return { size, get: (r, c) => grid[r][c] };
}

/** Render as a compact SVG path string (1 unit per module). */
export function qrToSvgPath(m: Matrix): { path: string; size: number } {
  let d = "";
  for (let r = 0; r < m.size; r++) {
    let c = 0;
    while (c < m.size) {
      if (m.get(r, c)) {
        let w = 1;
        while (c + w < m.size && m.get(r, c + w)) w++;
        d += `M${c} ${r}h${w}v1h-${w}z`;
        c += w;
      } else c++;
    }
  }
  return { path: d, size: m.size };
}

/** Test-only internals. */
export const __test = { rsEncode, rsGeneratorPoly };
