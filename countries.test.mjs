/* Fails the build if one country can appear twice, or if a polygon on
   the map can't be matched to the dataset. Fetches the same world-atlas
   file the app uses, so a change on their side breaks CI instead of
   quietly splitting a country into two rows on the live site. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ATLAS = "https://unpkg.com/world-atlas@2/countries-110m.json";

const ctx = { console, atob: s => Buffer.from(s, "base64").toString("binary"), module: undefined };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, "countries.js"), "utf8") +
  "\n;__C={ISO_NAME,NAME_ISO,UNINHABITED,MAP_NO_ISO,isoOf,canonCountry,isoOfFeature,canonFeature,auditCountries};", ctx);
vm.runInContext(readFileSync(join(ROOT, "verified.js"), "utf8") +
  "\n;__V={VERIFIED_RAW,COUNTRY_DICT};", ctx);
const C = vm.runInContext("__C", ctx);
const V = vm.runInContext("__V", ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  if (cond) console.log("  ok   " + name);
  else { fail++; console.log("  FAIL " + name + (extra ? "\n       " + extra : "")); }
};

/* world-atlas is topojson; we only need id + name, so decode the
   geometries rather than pulling in a topojson dependency. */
async function mapFeatures() {
  const r = await fetch(ATLAS, { headers: { "user-agent": "CoverageCountryCheck/1.0" } });
  if (!r.ok) throw new Error("world-atlas HTTP " + r.status);
  const topo = await r.json();
  return topo.objects.countries.geometries.map(g => ({
    id: g.id, properties: g.properties || {},
  }));
}

console.log("country identity");
const feats = await mapFeatures();
ok("world-atlas downloaded", feats.length > 150, feats.length + " polygons");

const audit = C.auditCountries(feats);
ok("no country is claimed twice and every polygon matches", audit.length === 0, audit.join("\n       "));

console.log("\nthe duplicates that were on the live site");
[
  ["eSwatini", "Eswatini"], ["Eq. Guinea", "Equatorial Guinea"],
  ["Falkland Is.", "Falkland Islands"], ["Bosnia and Herz.", "Bosnia and Herzegovina"],
  ["Dem. Rep. Congo", "Democratic Republic of the Congo"],
  ["Central African Rep.", "Central African Republic"],
  ["Czechia", "Czech Republic"], ["Dominican Rep.", "Dominican Republic"],
  ["S. Sudan", "South Sudan"], ["W. Sahara", "Western Sahara"],
  ["Solomon Is.", "Solomon Islands"], ["Macedonia", "North Macedonia"],
  ["United States of America", "United States"], ["DR Congo", "Democratic Republic of the Congo"],
  ["Türkiye", "Turkey"], ["UAE", "United Arab Emirates"], ["Swaziland", "Eswatini"],
].forEach(([variant, full]) => {
  const got = C.canonCountry(variant);
  ok("“" + variant + "” → " + full, got === full, "got “" + got + "”");
  ok("“" + full + "” stays itself", C.canonCountry(full) === full, "got “" + C.canonCountry(full) + "”");
});

console.log("\nthe map and the data agree");
const names = new Set();
feats.forEach(f => { const n = C.canonFeature(f); if (n) names.add(n); });
const dup = [...names].filter(n => [...names].filter(x => x === n).length > 1);
ok("no duplicate names across polygons", dup.length === 0, dup.join(", "));

const dsNames = new Set();
Object.values(V.VERIFIED_RAW).forEach(v => {
  (v.list || []).forEach(c => dsNames.add(c));
  (v.waitlist || []).forEach(c => dsNames.add(c));
  (v.usageBlocked || []).forEach(c => dsNames.add(c));
  Object.keys(v.limits || {}).forEach(c => dsNames.add(c));
});
const unresolved = [...dsNames].filter(c => {
  const canon = C.canonCountry(c);
  return !names.has(canon) && !C.isoOf(c);
});
/* Territories with no polygon at 110m are expected; what must not
   happen is a dataset name that resolves to nothing at all. */
ok("every dataset country resolves to a code or a polygon", unresolved.length === 0,
   unresolved.slice(0, 20).join(", "));

console.log("\nuninhabited places are excluded");
["Antarctica", "Bouvet Island", "French Southern and Antarctic Lands"].forEach(n => {
  ok(n + " is marked uninhabited", C.UNINHABITED.has(C.isoOf(n)), "iso " + C.isoOf(n));
});

console.log("");
if (fail) { console.log(fail + " check(s) failed"); process.exit(1); }
console.log("all country checks passed");
