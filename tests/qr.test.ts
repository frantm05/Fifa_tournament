import { expect, test } from "bun:test";
import { makeQr } from "../src/lib/qr";
// @ts-expect-error external test-only dep from the pwtest sandbox
import jsQR from "../../../pwtest/node_modules/jsqr/dist/jsQR.js";

function decode(text: string): string | null {
  const m = makeQr(text);
  const scale = 4;
  const quiet = 4 * scale;
  const px = m.size * scale + quiet * 2;
  const rgba = new Uint8ClampedArray(px * px * 4);
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const r = Math.floor((y - quiet) / scale);
      const c = Math.floor((x - quiet) / scale);
      const dark = r >= 0 && r < m.size && c >= 0 && c < m.size && m.get(r, c);
      const v = dark ? 0 : 255;
      const i = (y * px + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
      rgba[i + 3] = 255;
    }
  }
  const res = jsQR(rgba, px, px);
  return res?.data ?? null;
}

test("QR encodes and decodes join URLs", () => {
  for (const text of [
    "https://fearless-draw.higgsfield.app/t/K7XR4M",
    "https://fearless-draw.higgsfield.app/t/ABCDE?x=1",
    "krátký",
    "A".repeat(100),
  ]) {
    expect(decode(text)).toBe(text);
  }
});
