# Fearless Draw — design brief

- **Design read** — a living-room tool for 2–16 friends running a FIFA/EA FC
  tournament from their phones; the register is match-night tension, not a
  marketing page. Legible at arm's length, at 50% brightness, in one hand.
- **Concept spine** — "the tournament control room": every screen is an
  operator's console for one job (join, draw, record, rank). The draw reveal is
  the single theatrical beat; everything else is calm instrumentation.
- **Delivery tier** — editorial (utility app; micro-motion only, 120–250 ms,
  ease-out, on state change). No scroll journey — this is an app, not a page.
- **Animation mode: non-animated — functional realtime tournament tool per
  user's build brief (motion 120–250 ms on state change only).**

The client picks one of three complete directions rendered as a live preview
(three key screens each, realistic Czech data). All three respect: one accent
spent only on the screen's primary action; WCAG AA; 44 px targets; no
horizontal scroll at 320 px; no emoji icons; designed empty/loading/error/
reconnecting/exhausted states.

## Direction A — „Přenos" (broadcast)

- **Palette**: pitch `#0B0F16`, panel `#141B26`, line `#273244`, text
  `#EDF2F9`, dim `#8FA0B5`, accent amber `#FFC400` (primary action only),
  live-dot red `#FF4646` (status only, never a control).
- **Type**: display **Barlow Condensed** 600/700 caps (TV numerals & straps),
  body **Barlow** 400/600, data = Barlow Condensed with `tabular-nums`.
- **Layout**: lower-third straps; 45° clipped card corners; 4 px team rule on
  the left of rows; scoreboard header strip.
- **Signature**: the team reveal as a broadcast lower-third sliding strap with
  a segmented star meter and the skewed "JSI NA ŘADĚ" chip.

## Direction B — „Program" (editorial minimal)

- **Palette**: paper `#FFFFFF`, ink `#101318`, gray `#5A6572`, rule
  `#E4E7EC`, accent Swiss red `#E63312` (primary action only).
- **Type**: one family — **Archivo** (800 display tight, 500/400 text) plus
  **IBM Plex Mono** 500 for every number, score, code (printed-programme feel).
- **Layout**: strict 8 px grid, 2 px ink top-rules per section (no hairline
  broadsheet rules), match list as a printed fixture programme, oversized real
  match numerals (actual sequence, not decoration).
- **Signature**: the draw hand as three printed "match tickets"; picking one
  stamps it with a red corner mark.

## Direction C — „Kabinet" (retro arcade, PS2-era menus, disciplined)

- **Palette**: field navy `#0A1A3C`, panel `#12295E`, panel-hi `#1D3C82`,
  text `#F2F5FF`, dim `#93A5CE`, accent gold `#FFB92E` (selection + primary
  action only).
- **Type**: display **Saira Condensed** 700 caps with a slight CSS skew
  (speed), body **Titillium Web**, numbers **Share Tech Mono**.
- **Layout**: full-width selection bars (console menu rows) with a gold notch
  and ▸ caret on the active row; diagonal-stripe header banner (subtle CSS
  texture, no images); footer hint bar.
- **Signature**: the team reveal as a trading card with a static gloss sweep;
  the blinking ▸ caret (gated by `prefers-reduced-motion`).

## Self-critique vs. anti-goals

- No purple/blue-pink gradients, no glassmorphism, no emoji icons anywhere.
- A is dark+amber — not the banned near-black+acid-green / graphite+ember
  combos (amber is a broadcast scoreboard color, used only on one action).
- B is white+ink+red — explicitly not cream+serif+terracotta; rules are 2 px
  ink bars, not broadsheet hairlines; the mono is the data voice.
- C is navy+gold — a period-correct sports-menu scheme, not an AI-glow theme;
  bevels are 1 px light borders, no blurred shadows.
- Numbered elements (match 03, fixture list) are real sequence data.
- Each direction has exactly one accent and it is reserved for the single
  primary action of each screen.
