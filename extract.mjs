/* Country extraction, kept separate so it can be tested without
   touching the network. See monitor.mjs for why text matching is
   good enough here: stable false positives never enter a diff. */

/* Wording drifts without meaning drifting. Fold the common variants
   so "USA" -> "United States" is not reported as a change. */
export const ALIAS = {
  "usa": "United States", "u.s.": "United States", "u.s.a.": "United States",
  "united states of america": "United States",
  "uk": "United Kingdom", "great britain": "United Kingdom",
  "uae": "United Arab Emirates", "u.a.e.": "United Arab Emirates",
  "türkiye": "Turkey", "turkiye": "Turkey",
  "burma": "Myanmar", "swaziland": "eSwatini",
  "czech rep.": "Czech Republic", "czechia": "Czech Republic",
  "korea, south": "South Korea", "korea, north": "North Korea",
  "democratic people's republic of korea": "North Korea",
  "russian federation": "Russia", "mainland china": "China",
  "hong kong sar": "Hong Kong", "méxico": "Mexico",
  "congo, dem. rep.": "Democratic Republic of the Congo",
  "congo (the democratic republic of the)": "Democratic Republic of the Congo",
  "congo, repub. of the": "Republic of the Congo",
  "gambia, the": "Gambia", "sudan (the)": "Sudan",
  "syrian arab republic": "Syria", "iran (islamic republic of)": "Iran",
  "central african republic (the)": "Central African Republic",
  "venezuela (bolivarian republic of)": "Venezuela",
  "viet nam": "Vietnam",
};

const rx = (s) =>
  new RegExp("(?<![\\p{L}])" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}])", "iu");

export function buildMatchers(dict) {
  const out = [];
  for (const name of dict) out.push([rx(name), name]);
  for (const [alias, canonical] of Object.entries(ALIAS)) out.push([rx(alias), canonical]);
  return out;
}

/* Accented characters arrive as entities more often than as UTF-8,
   and several country names carry them (México, Türkiye, Curaçao).
   Miss the decode and those countries silently vanish from the diff. */
const NAMED = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë",
  aacute: "á", agrave: "à", acirc: "â", auml: "ä", atilde: "ã", aring: "å",
  iacute: "í", igrave: "ì", icirc: "î", iuml: "ï",
  oacute: "ó", ograve: "ò", ocirc: "ô", ouml: "ö", otilde: "õ", oslash: "ø",
  uacute: "ú", ugrave: "ù", ucirc: "û", uuml: "ü",
  ntilde: "ñ", ccedil: "ç", szlig: "ß", aelig: "æ", eth: "ð", thorn: "þ",
  ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", ndash: "-", mdash: "-",
};

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z0-9#]+);/gi, (m, n) => {
      const v = NAMED[n.toLowerCase()];
      return v === undefined ? m : v;
    });
}

/* Strip tags and script/style bodies. We want prose and table cells,
   not the class names of a Tailwind build. */
export function textOf(html) {
  return decodeEntities(
    html
      .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ");
}

export function countriesIn(html, matchers) {
  const text = textOf(html);
  const found = new Set();
  for (const [re, name] of matchers) if (re.test(text)) found.add(name);
  return [...found].sort();
}

export function diff(before, after) {
  const b = new Set(before), a = new Set(after);
  return {
    added: after.filter((c) => !b.has(c)),
    removed: before.filter((c) => !a.has(c)),
  };
}
