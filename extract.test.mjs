/* Fixtures modelled on the real pages: an Intercom table (Crypto.com),
   a Zendesk heading list (Gnosis Pay), and a prose paragraph (Bybit).
   No network — this tests the parser, not the internet. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildMatchers, countriesIn, textOf, diff } from "./extract.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ctx = { console, atob: (s) => Buffer.from(s, "base64").toString("binary") };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, "verified.js"), "utf8") + "\n;__D=COUNTRY_DICT;", ctx);
const M = buildMatchers(vm.runInContext("__D", ctx));

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  → " + extra : "")); }
};

const TABLE = `<html><head><style>.us{color:red}</style></head><body>
<table><tr><td>Afghanistan</td><td>AF / AFG</td></tr>
<tr><td>Bangladesh</td><td>BD / BGD</td></tr>
<tr><td>Korea, North</td><td>KP / PRK</td></tr>
<tr><td>Swaziland</td><td>SZ / SWZ</td></tr>
<tr><td>Mainland China</td><td>CN</td></tr></table>
<script>var x="Norway"</script></body></html>`;

const HEADINGS = `<div><h4>Argentina</h4><h4>Austria</h4><h4>Czech Rep.</h4>
<h4>M&eacute;xico</h4><h4>United Kingdom</h4><p>Not French Foreign Territories.</p></div>`;

const PROSE = `<p>Bybit does not offer services to Users in the United States,
the Chinese Mainland, Hong Kong, Singapore, Canada, or the U.A.E.</p>`;

console.log("textOf");
ok("drops script bodies", !textOf(TABLE).includes("Norway"));
ok("drops style bodies", !textOf(TABLE).includes("color:red"));
ok("decodes entities", textOf(HEADINGS).includes("México"));

console.log("\ncountriesIn");
const a = countriesIn(TABLE, M);
ok("reads a table", a.includes("Afghanistan") && a.includes("Bangladesh"));
ok("folds 'Korea, North'", a.includes("North Korea"), a.join(","));
ok("folds 'Swaziland'", a.includes("eSwatini"), a.join(","));
ok("folds 'Mainland China'", a.includes("China"));
ok("ignores scripted text", !a.includes("Norway"));

const b = countriesIn(HEADINGS, M);
ok("reads headings", b.includes("Argentina") && b.includes("Austria"));
ok("folds 'Czech Rep.'", b.includes("Czech Republic"), b.join(","));
ok("folds accents", b.includes("Mexico"), b.join(","));

const c = countriesIn(PROSE, M);
ok("reads prose", c.includes("United States") && c.includes("Hong Kong"));
ok("folds 'U.A.E.'", c.includes("United Arab Emirates"), c.join(","));

console.log("\nword boundaries");
ok("'Oman' not found inside 'Romania'", !countriesIn("<p>Romania</p>", M).includes("Oman"));
ok("'India' not found inside 'Indian Ocean'", !countriesIn("<p>the Indian Ocean</p>", M).includes("India"));
ok("'Chad' still found alone", countriesIn("<p>Chad</p>", M).includes("Chad"));

console.log("\ndiff");
const d1 = diff(["France", "Spain"], ["France", "Italy"]);
ok("spots an addition", d1.added.join() === "Italy");
ok("spots a removal", d1.removed.join() === "Spain");
ok("quiet when identical", (() => { const d = diff(["A", "B"], ["B", "A"]); return !d.added.length && !d.removed.length; })());

console.log("\nstability (the property the monitor relies on)");
const noisy1 = countriesIn(TABLE + "<footer>Contact us in Ireland</footer>", M);
const noisy2 = countriesIn(TABLE + "<footer>Contact us in Ireland</footer>", M);
const dn = diff(noisy1, noisy2);
ok("a repeated false positive never enters a diff", !dn.added.length && !dn.removed.length);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
