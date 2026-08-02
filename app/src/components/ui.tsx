import type { ReactNode } from "react";

import type { Team } from "../engine/types";
import { makeQr, qrToSvgPath } from "../lib/qr";

/* ----------------------------- cut-corner chrome ----------------------------- */

/**
 * Cut-corner container with a real border on the diagonal edge: an outer
 * clipped layer paints the border color, the inner layer re-clips the fill.
 */
export function Cut({
  className = "",
  innerClassName = "",
  borderColor,
  background,
  cut = 12,
  borderWidth = 1,
  children,
}: {
  className?: string;
  innerClassName?: string;
  borderColor?: string;
  background?: string;
  cut?: number;
  borderWidth?: number;
  children?: ReactNode;
}) {
  return (
    <div
      className={`cut ${className}`}
      style={{
        ["--cut" as string]: `${cut}px`,
        ["--cut-bw" as string]: `${borderWidth}px`,
        ...(borderColor ? { ["--cut-bc" as string]: borderColor } : {}),
      }}
    >
      <div
        className={`cut-in ${innerClassName}`}
        style={background ? { background } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

/* ----------------------------- crest ----------------------------- */

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastInk(hex: string): string {
  return luminance(hex) > 0.45 ? "#10151D" : "#F2F6FB";
}

/**
 * Procedural crest: official badges are licensed, so every team gets a shield
 * in its real club colors with the short code — the unlicensed-game way.
 */
export function Crest({ team, size = 40 }: { team: Team; size?: number }) {
  const [c1, c2] = team.colors;
  const ink = contrastInk(c1);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      aria-hidden="true"
      className="crest"
    >
      <path
        d="M20 1 37 6v16c0 10-7 17-17 21C10 39 3 32 3 22V6Z"
        fill={c1}
        stroke="rgba(0,0,0,.55)"
        strokeWidth="1.4"
      />
      <path d="M3 6v16c0 10 7 17 17 21V1Z" fill="rgba(255,255,255,.06)" />
      <path d="M37 6v10L9 38c-2.4-2.2-4.3-4.9-5.3-8L30 4Z" fill={c2} opacity="0.9" />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="700"
        fontSize={team.code.length > 3 ? 11 : 13}
        fill={ink}
        stroke="rgba(0,0,0,.25)"
        strokeWidth="0.4"
        letterSpacing="0.5"
      >
        {team.code}
      </text>
    </svg>
  );
}

/* ----------------------------- stars ----------------------------- */

export function StarMeter({ value, dim = false }: { value: number; dim?: boolean }) {
  return (
    <span className={"stars" + (dim ? " stars-dim" : "")} aria-label={`${value} z 5 hvězd`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            "star-seg" +
            (value >= i ? " on" : value >= i - 0.5 ? " half" : "")
          }
        />
      ))}
      <b className="stars-num">{value.toLocaleString("cs-CZ")}★</b>
    </span>
  );
}

/* ----------------------------- QR ----------------------------- */

export function QrCode({ text, label }: { text: string; label: string }) {
  try {
    const { path, size } = qrToSvgPath(makeQr(text));
    return (
      <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={label} className="qr">
        <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="#F2F6FB" />
        <path d={path} fill="#0B0F16" />
      </svg>
    );
  } catch {
    return null;
  }
}

/* ----------------------------- misc ----------------------------- */

export function IconSvg({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const icons = {
  copy: "M8 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3M4 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z",
  check: "M4 12.5 9.5 18 20 6.5",
  x: "M6 6l12 12M18 6 6 18",
  back: "M15 5l-7 7 7 7",
  spin: "M12 3a9 9 0 1 0 9 9",
  warn: "M12 4 2.5 20h19L12 4Zm0 7v4m0 3v.5",
};

export function Spinner() {
  return (
    <span className="spin" aria-hidden="true">
      <IconSvg d={icons.spin} />
    </span>
  );
}
