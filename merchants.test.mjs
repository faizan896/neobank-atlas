/* Fails if the merchants layer mis-reads a BTC Map row, loses a field in
   the cache, or puts a shop in the wrong country. No network: the
   country shapes below are small enough to check by hand. */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("./merchants.js");

let fail = 0;
const ok = (name, cond, extra) => {
  if (cond) console.log("  ok   " + name);
  else { fail++; console.log("  FAIL " + name + (extra ? "\n       " + extra : "")); }
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log("BTC Map rows");
const raw = { id: 7, lat: 38.72, lon: -9.14, name: "Café A Brasileira", address: "Rua Garrett 120",
  icon: "local_cafe", verified_at: "2026-01-02T00:00:00Z" };
const row = M.mNormalize(raw);
ok("a row keeps its place, name and address",
  same(row.ll, [38.72, -9.14]) && row.n === raw.name && row.a === raw.address && row.id === "b7");
ok("the icon becomes a category", row.cat === "Coffee", row.cat);
ok("an unknown icon is spelled out", M.mNormalize({ ...raw, icon: "hair_salon" }).cat === "Hair Salon");
ok("a missing icon reads Other", M.mNormalize({ ...raw, icon: undefined }).cat === "Other");
ok("an untagged row takes BTC", same(row.coins, ["BTC"]) && row.src === "btcmap");
const ln = { "osm:payment:lightning": "yes" }, chain = { "osm:payment:onchain": "yes" };
ok("a Lightning-only row is LN, not BTC", same(M.mNormalize({ ...raw, ...ln }).coins, ["LN"]));
ok("an on-chain row is BTC", same(M.mNormalize({ ...raw, ...chain }).coins, ["BTC"]));
ok("a row tagged with both takes both", same(M.mNormalize({ ...raw, ...ln, ...chain }).coins, ["BTC", "LN"]));
ok("\"no\" is not yes", same(M.mNormalize({ ...raw, "osm:payment:lightning": "no" }).coins, ["BTC"]));

ok("a row with no name is dropped", !M.mValid({ ...raw, name: "" }));
ok("a row with no position is dropped", !M.mValid({ ...raw, lat: null }) && !M.mValid({ ...raw, lon: "1" }));
ok("a row on the equator is kept", M.mValid({ ...raw, lat: 0, lon: 0 }));
ok("null is dropped", !M.mValid(null));

console.log("\nthe cache");
ok("a cached row comes back the same", same(M.mNormalize(M.mUnpack(M.mPack(raw))), row));
const bare = { id: 9, lat: 1, lon: 2, name: "X" };
ok("empty fields survive the cache", same(M.mNormalize(M.mUnpack(M.mPack(bare))), M.mNormalize(bare)));
ok("cached rows are still valid", M.mValid(M.mUnpack(M.mPack(bare))));
[{ ...raw, ...ln }, { ...raw, ...chain }, { ...raw, ...ln, ...chain }].forEach(r =>
  ok("the cache keeps " + M.mNormalize(r).coins.join("+"), same(M.mNormalize(M.mUnpack(M.mPack(r))), M.mNormalize(r))));
ok("a Lightning filter finds a Lightning row",
  M.mMatches(M.mNormalize({ ...raw, ...ln }), "", new Set(["LN"])) && !M.mMatches(row, "", new Set(["LN"])));

console.log("\nunverified flag");
const now = Date.parse("2026-11-01T00:00:00Z");
ok("verified this year is not flagged", !M.mStale(row, now));
ok("verified two years ago is flagged", M.mStale({ ...row, v: "2024-10-01T00:00:00Z" }, now));
ok("never verified is flagged", M.mStale({ ...row, v: null }, now));
ok("curated rows are never flagged", !M.mStale(M.M_STABLE[0], now));

console.log("\nsearch and network filters");
ok("every word must match", M.mMatches(row, "café garrett") && !M.mMatches(row, "café karachi"));
ok("the category is searchable", M.mMatches(row, "coffee"));
ok("an empty search matches", M.mMatches(row, "", new Set()));
ok("a network filter keeps rows that take it", M.mMatches(row, "", new Set(["BTC", "USDC"])));
ok("a network filter drops rows that don't", !M.mMatches(row, "", new Set(["USDC"])));
ok("curated ids are unique", new Set(M.M_STABLE.map(p => p.id)).size === M.M_STABLE.length);

console.log("\nglobe sample");
const many = Array.from({ length: 1000 }, (_, i) => i);
const cut = M.mSample(many, 100);
ok("a long list is cut to the cap", cut.length === 100);
ok("the cut spans the whole list", cut[0] === 0 && cut[99] >= 990);
ok("a short list is left alone", M.mSample(many, 5000) === many);

console.log("\nwhich country a shop is in");
/* [lng, lat] rings. A is a square with a hole; B touches A's east side; C is two islands. */
const sq = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const feats = [
  { name: "A", geometry: { type: "Polygon", coordinates: [sq(0, 0, 10, 10), sq(4, 4, 6, 6)] } },
  { name: "B", geometry: { type: "Polygon", coordinates: [sq(10, 0, 20, 10)] } },
  { name: "C", geometry: { type: "MultiPolygon", coordinates: [[sq(30, 0, 31, 1)], [sq(40, 0, 41, 1)]] } },
  { name: "", geometry: { type: "Polygon", coordinates: [sq(50, 0, 51, 1)] } },
  { name: "D", geometry: null },
];
const idx = M.mIndex(feats, f => f.name);
const inC = (lat, lng, n) => M.mInCountry(lat, lng, n, idx);
ok("a shop inside is in", inC(2, 2, "A") === true);
ok("a shop far away is out", inC(50, 50, "A") === false);
ok("a shop in the hole is out", inC(5, 5, "A") === false);
ok("both islands count", inC(0.5, 30.5, "C") === true && inC(0.5, 40.5, "C") === true);
ok("the sea between the islands does not", inC(0.5, 35, "C") === false);
ok("a shop on the waterfront still counts", inC(5, -0.1, "A") === true);
ok("further out to sea does not", inC(5, -0.5, "A") === false);
ok("a shop just over the border stays in its own country",
  inC(5, 10.05, "B") === true && inC(5, 10.05, "A") === false);
ok("a country with no outline is unknown, not empty", inC(1, 1, "Z") === null && inC(1, 1, "D") === null);
ok("unnamed outlines are ignored", !idx.by.has(""));

ok("every no-outline territory opens on a real spot", Object.values(M.M_SPOTS).every(([lat, lng, z]) =>
  Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && z >= 5 && z <= 14) && "Réunion" in M.M_SPOTS);

console.log("");
if (fail) { console.log(fail + " check(s) failed"); process.exit(1); }
console.log("all merchant checks passed");
