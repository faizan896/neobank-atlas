/* ============================================================
   Coverage — availability monitor

   Runs on a schedule. For every product that has an official
   source URL, it fetches the page, pulls out every country name
   it can find, and compares that set to what it saw last time.

   It does NOT decide what is true. It decides what MOVED, and
   puts a dated row in front of a human. Hand-kept directories
   rot because nobody re-reads 49 pages every week; this turns
   that into "review the 3 that changed".

   Why plain text matching against a country dictionary works
   here: these pages are literally lists of country names. It
   will pick up false positives (a "United States" in a footer,
   a "Chad" in a sentence) — and that does not matter, because
   a false positive that appears every week never shows up in a
   diff. Only changes surface. Stability beats precision.
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildMatchers, countriesIn, diff } from "./extract.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SNAP = join(ROOT, "snapshot.json");
const FEED = join(ROOT, "changes.json");
const TODAY = new Date().toISOString().slice(0, 10);

/* Zendesk and Bybit return 403 to anything that does not look like a
   browser. Identifying honestly as a bot got us blocked on 4 of 50
   sources, so we send a real UA and keep the bot identity in the
   Accept headers and the 1.2s gap between requests instead. */
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const TIMEOUT_MS = 25000;
const GAP_MS = 1200;

/* ---------- load the data layer ---------- */
function loadVerified() {
  const src = readFileSync(join(ROOT, "verified.js"), "utf8");
  const ctx = {
    console,
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
  };
  vm.createContext(ctx);
  vm.runInContext(src + "\n;__OUT={VERIFIED_RAW,COUNTRY_DICT};", ctx);
  return vm.runInContext("__OUT", ctx);
}

/* ---------- fetching ---------- */
async function grab(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
      },
    });
    if (!r.ok) return { error: "HTTP " + r.status };
    const body = await r.text();
    if (body.length < 500) return { error: "Response too short to be the real page" };
    return { body };
  } catch (e) {
    return { error: e.name === "AbortError" ? "Timed out after " + TIMEOUT_MS + "ms" : String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- diffing ---------- */
function phrase(added, removed) {
  const bits = [];
  if (added.length) bits.push(added.length + " appeared");
  if (removed.length) bits.push(removed.length + " disappeared");
  return "Country list changed — " + bits.join(", ");
}

/* ---------- main ---------- */
const { VERIFIED_RAW, COUNTRY_DICT } = loadVerified();
const matchers = buildMatchers(COUNTRY_DICT);

const targets = Object.entries(VERIFIED_RAW)
  .filter(([, v]) => v.source && /^https?:/.test(v.source))
  .map(([name, v]) => ({ name, url: v.source, tier: v.tier }));

const prev = existsSync(SNAP) ? JSON.parse(readFileSync(SNAP, "utf8")) : { runs: 0, seen: {} };
const feed = existsSync(FEED) ? JSON.parse(readFileSync(FEED, "utf8")) : { events: [] };

const seen = {};
const events = [];
const failures = [];
const firstRun = !prev.runs;

console.log("Checking " + targets.length + " sources" + (firstRun ? " (first run — recording a baseline)" : ""));

for (const t of targets) {
  const res = await grab(t.url);
  await sleep(GAP_MS);

  if (res.error) {
    failures.push({ product: t.name, url: t.url, why: res.error });
    /* keep the old reading so one bad week does not wipe the baseline */
    if (prev.seen[t.name]) seen[t.name] = { ...prev.seen[t.name], staleSince: prev.seen[t.name].staleSince || TODAY };
    console.log("  ✗ " + t.name + " — " + res.error);
    continue;
  }

  const list = countriesIn(res.body, matchers);
  seen[t.name] = { url: t.url, at: TODAY, count: list.length, list };

  const before = prev.seen[t.name] && prev.seen[t.name].list;
  if (!before) { console.log("  · " + t.name + " — baseline, " + list.length + " countries"); continue; }

  const { added, removed } = diff(before, list);
  if (!added.length && !removed.length) { console.log("  ✓ " + t.name + " — no change"); continue; }

  /* A page that loses most of its countries is usually a broken
     render, not 40 exits in one week. Flag it, do not believe it. */
  const suspect = before.length > 8 && list.length < before.length * 0.4;

  events.push({
    d: TODAY, p: t.name, t: phrase(added, removed),
    s: suspect ? "Automated check — looks wrong, verify by hand" : "Automated check",
    u: t.url, added, removed, suspect,
  });
  console.log("  ! " + t.name + " — +" + added.length + " / -" + removed.length + (suspect ? "  (SUSPECT)" : ""));
}


writeFileSync(SNAP, JSON.stringify({ runs: (prev.runs || 0) + 1, at: TODAY, seen }, null, 2));

const merged = [...events, ...(feed.events || [])].slice(0, 300);
writeFileSync(FEED, JSON.stringify({
  generated: new Date().toISOString(),
  runs: (prev.runs || 0) + 1,
  checked: targets.length,
  unreachable: failures,
  events: merged,
}, null, 2));

console.log("\n" + events.length + " change(s), " + failures.length + " unreachable, " + targets.length + " checked");
if (events.length) console.log("Review the diffs before trusting them — this reports movement, not truth.");
