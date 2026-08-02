import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:8788";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SHOTS = process.env.SHOTS === "1";

const errors = [];
function trackPage(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${label}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${label}] PAGEERROR ${e}`));
}

async function newPhone(browser, label) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  trackPage(page, label);
  return { ctx, page, label };
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: `shot-${name}.png`, fullPage: true });
}

let step = "";
function log(s) {
  step = s;
  console.log("→", s);
}

async function drawAndPick(page, label, pickIndex = 0) {
  // Wait for either the deal button or an existing hand button.
  const dealBtn = page.getByRole("button", { name: /Losovat tři týmy/ });
  const showBtn = page.getByRole("button", { name: /Ukázat vylosované týmy/ });
  await Promise.race([
    dealBtn.waitFor({ timeout: 15000 }),
    showBtn.waitFor({ timeout: 15000 }),
  ]);
  if (await dealBtn.isVisible().catch(() => false)) await dealBtn.click();
  else await showBtn.click();
  await page.locator(".team-strap").first().waitFor({ timeout: 10000 });
  // Skip the reveal beat by tapping the note below the cards, read team names.
  await page.locator(".overlay-note").click();
  await page.waitForTimeout(150);
  const names = await page.locator(".strap-name").allTextContents();
  await page.locator(".team-strap").nth(pickIndex).click();
  const confirm = page.getByRole("button", { name: /^Potvrdit: / });
  await confirm.waitFor({ timeout: 5000 });
  const picked = (await confirm.textContent()).replace(/^Potvrdit:\s*/, "").trim();
  await confirm.click();
  await page.locator(".overlay").waitFor({ state: "detached", timeout: 10000 });
  console.log(`   ${label} hand: [${names.join(" | ")}] picked: ${picked}`);
  return { names, picked };
}

async function enterResult(page, hg, ag) {
  await page.getByRole("button", { name: /Zapsat výsledek/ }).click();
  const steppers = page.locator(".stepper");
  for (let i = 0; i < hg; i++) await steppers.nth(0).getByRole("button", { name: /více gólů/ }).click();
  for (let i = 0; i < ag; i++) await steppers.nth(1).getByRole("button", { name: /více gólů/ }).click();
  await page.getByRole("button", { name: /^Zapsat \d+:\d+/ }).click();
  await page.getByRole("button", { name: /potvrdit/i }).click();
  await page.locator(".overlay").waitFor({ state: "detached", timeout: 10000 });
}

const browser = await chromium.launch({ executablePath: CHROME });
try {
  /* ---------- create tournament (admin phone) ---------- */
  log("admin: create tournament");
  const admin = await newPhone(browser, "admin");
  await admin.page.goto(BASE + "/", { waitUntil: "networkidle" });
  await shot(admin.page, "01-home");
  await admin.page.getByRole("button", { name: "Založit turnaj" }).click();
  await admin.page.getByPlaceholder("Např. Matěj").fill("Matěj");
  // 4 places, league stays default
  await admin.page.getByRole("button", { name: "4", exact: true }).first().click();
  await shot(admin.page, "02-create");
  await admin.page.getByRole("button", { name: /^Založit turnaj$/ }).click();
  await admin.page.locator(".recovery-code").waitFor({ timeout: 15000 });
  const recovery = (await admin.page.locator(".recovery-code").textContent()).trim();
  await admin.page.getByRole("button", { name: /Mám ho uložený/ }).click();
  await admin.page.locator(".join-code").waitFor({ timeout: 15000 });
  const code = (await admin.page.locator(".join-code").textContent()).trim();
  console.log("   code:", code, "recovery:", recovery);
  await shot(admin.page, "03-lobby-admin");

  /* ---------- three more phones join ---------- */
  const names = ["Kuba", "Ondra", "Martin"];
  const phones = [];
  for (const n of names) {
    log(`${n}: join by code`);
    const ph = await newPhone(browser, n);
    await ph.page.goto(`${BASE}/t/${code}`, { waitUntil: "networkidle" });
    await ph.page.getByPlaceholder("Např. Kuba").fill(n);
    await ph.page.getByRole("button", { name: "Vstoupit do turnaje" }).click();
    await ph.page.locator(".join-code").waitFor({ timeout: 15000 });
    phones.push(ph);
  }

  log("admin: lobby shows all 4 live");
  await admin.page.locator(".player-row", { hasText: "Martin" }).waitFor({ timeout: 10000 });
  const lobbyCount = await admin.page.locator(".player-row:not(.player-empty)").count();
  if (lobbyCount !== 4) throw new Error(`lobby shows ${lobbyCount} players, expected 4`);
  await shot(admin.page, "04-lobby-full");

  /* ---------- start ---------- */
  log("admin: start tournament");
  await admin.page.getByRole("button", { name: "Spustit turnaj" }).click();
  await admin.page.locator(".live-strip").waitFor({ timeout: 15000 });
  await shot(admin.page, "05-matches");

  const all = [admin, ...phones];
  const byName = Object.fromEntries([["Matěj", admin], ...phones.map((p) => [p.label, p])]);

  /* ---------- play the whole league (6 matches) ---------- */
  const pickedTeams = [];
  for (let m = 0; m < 6; m++) {
    // read current matchup from the admin's live strip: "Zápas X/6 · AAA — BBB"
    await admin.page.locator(".vs-block").waitFor({ timeout: 15000 });
    const codes = await admin.page.locator(".vs-code").allTextContents();
    const nameEls = await admin.page.locator(".vs-name").allTextContents();
    log(`match ${m + 1}: ${nameEls[0]} vs ${nameEls[1]}`);
    for (const who of nameEls) {
      const ph = byName[who];
      if (!ph) throw new Error(`unknown player ${who}`);
      const res = await drawAndPick(ph.page, who, m % 3 === 0 ? 0 : 1);
      pickedTeams.push(res.picked);
    }
    // fearless: no picked team may repeat
    const dupes = pickedTeams.filter((t, i) => pickedTeams.indexOf(t) !== i);
    if (dupes.length) throw new Error(`fearless violated: ${dupes.join(",")}`);
    log(`match ${m + 1}: admin enters result`);
    await enterResult(admin.page, (m % 3) + 1, m % 2);
  }

  /* ---------- finished ---------- */
  log("winner screen");
  await admin.page.locator(".winner-code").waitFor({ timeout: 15000 });
  const winner = (await admin.page.locator(".winner-name").textContent()).trim();
  console.log("   winner:", winner);
  await shot(admin.page, "06-winner");

  // standings visible for a player too
  await phones[0].page.getByRole("button", { name: "Tabulka" }).click();
  await phones[0].page.locator(".standings").waitFor({ timeout: 10000 });
  await shot(phones[0].page, "07-table-player");

  console.log("\nPICKED (all unique):", pickedTeams.length, "teams");
  const consoleErrors = errors.filter(
    (e) => !e.includes("net::ERR_CONNECTION_RESET") && !e.includes("fonts.g"),
  );
  console.log("CONSOLE ERRORS:", consoleErrors.length ? consoleErrors : "none");
  if (consoleErrors.length) process.exitCode = 2;
  console.log("SMOKE OK");
} catch (e) {
  console.error("FAILED at step:", step);
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
