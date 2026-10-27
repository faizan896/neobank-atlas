/* ============================================================
   Coverage — one country, one identity

   The map (world-atlas 110m) ships abbreviated labels: "Eq. Guinea",
   "Bosnia and Herz.", "Falkland Is.", "eSwatini". The dataset and the
   issuer pages ship full names: "Equatorial Guinea", "Bosnia and
   Herzegovina". Matching the two on text meant the same country showed
   up twice in the picker with the count split between the spellings.

   So the join key is ISO 3166-1 numeric — the code world-atlas already
   carries in feature.id — and every name, from either side, resolves
   through it to exactly one full English name.

   Loads in the browser as globals and in Node through vm, the same way
   verified.js does, so the CI check and the app read one table.
   ============================================================ */

/* iso numeric -> the single name shown everywhere.
   Only countries whose map label, dataset spelling or both need
   settling, plus every territory that has listings but no polygon. */
const ISO_NAME = {
  /* map label differs from the name people actually use */
  "070":"Bosnia and Herzegovina", "090":"Solomon Islands",
  "140":"Central African Republic", "178":"Republic of the Congo",
  "180":"Democratic Republic of the Congo", "203":"Czech Republic",
  "214":"Dominican Republic", "226":"Equatorial Guinea",
  "238":"Falkland Islands", "728":"South Sudan", "732":"Western Sahara",
  "748":"Eswatini", "807":"North Macedonia", "840":"United States",
  "104":"Myanmar", "792":"Turkey", "270":"Gambia", "729":"Sudan",

  /* uninhabited — kept so they can be recognised and then excluded */
  "010":"Antarctica", "074":"Bouvet Island",
  "260":"French Southern and Antarctic Lands",
  "334":"Heard Island and McDonald Islands",
  "239":"South Georgia and the South Sandwich Islands",

  /* too small for a polygon at 110m, but they carry real listings */
  "020":"Andorra", "028":"Antigua and Barbuda", "048":"Bahrain",
  "052":"Barbados", "060":"Bermuda", "092":"British Virgin Islands",
  "132":"Cape Verde", "136":"Cayman Islands", "174":"Comoros",
  "175":"Mayotte", "184":"Cook Islands", "212":"Dominica",
  "234":"Faroe Islands", "254":"French Guiana", "258":"French Polynesia",
  "292":"Gibraltar", "296":"Kiribati", "308":"Grenada", "312":"Guadeloupe",
  "316":"Guam", "336":"Vatican City", "344":"Hong Kong", "438":"Liechtenstein",
  "446":"Macau", "462":"Maldives", "470":"Malta", "474":"Martinique",
  "480":"Mauritius", "492":"Monaco", "500":"Montserrat", "520":"Nauru",
  "531":"Curaçao", "533":"Aruba", "534":"Sint Maarten", "570":"Niue",
  "580":"Northern Mariana Islands", "583":"Micronesia", "584":"Marshall Islands",
  "585":"Palau", "638":"Réunion", "652":"Saint Barthelemy", "654":"Saint Helena",
  "659":"Saint Kitts and Nevis", "660":"Anguilla", "662":"Saint Lucia",
  "663":"Saint Martin", "670":"Saint Vincent and the Grenadines",
  "674":"San Marino", "678":"Sao Tome and Principe", "690":"Seychelles",
  "702":"Singapore", "772":"Tokelau", "776":"Tonga",
  "784":"United Arab Emirates", "796":"Turks and Caicos Islands",
  "798":"Tuvalu", "831":"Guernsey", "832":"Jersey", "833":"Isle of Man",
  "850":"US Virgin Islands", "876":"Wallis and Futuna", "882":"Samoa",

  /* no ISO 3166 code; XK is the de-facto stand-in and the data uses it */
  "XKX":"Kosovo",
};

/* Every spelling either side actually produces, folded onto one code.
   Anything not listed here keeps its own name — the table only has to
   cover disagreements, not all 249 countries. */
const NAME_ISO = {
  "United States of America":"840", "USA":"840", "U.S.":"840", "US":"840",
  "Czechia":"203",
  "Bosnia and Herz.":"070",
  "Central African Rep.":"140", "Central African Republic (the)":"140",
  "Dem. Rep. Congo":"180", "DR Congo":"180", "Congo, Dem. Rep.":"180",
  "Congo (the Democratic Republic of the)":"180",
  "Congo":"178", "Congo, Repub. of the":"178",
  "Dominican Rep.":"214",
  "Eq. Guinea":"226",
  "Falkland Is.":"238",
  "S. Sudan":"728",
  "W. Sahara":"732",
  "eSwatini":"748", "Swaziland":"748",
  "Macedonia":"807",
  "Solomon Is.":"090",
  "Burma":"104", "Burma (Myanmar)":"104",
  "Türkiye":"792", "Turkiye":"792",
  "UAE":"784", "U.A.E.":"784",
  "Cabo Verde":"132",
  "Macao":"446",
  "Curacao":"531",
  "Reunion":"638",
  "Holy See":"336", "Vatican":"336",
  "Micronesia, Fed. St.":"583",
  "Fr. S. Antarctic Lands":"260",
  "Gambia, The":"270", "Sudan (the)":"729",
};

/* Nobody lives here, so nothing can be available here. Shown on the
   globe as plain land, never offered in the picker, never counted. */
const UNINHABITED = new Set(["010","074","260","334","239"]);

/* Map polygons world-atlas ships without an ISO id. Kosovo is in the
   data so it gets the XKX stand-in; the other two are disputed
   territories nothing lists, recorded so the check stays honest
   instead of silently ignoring an unmatched polygon. */
const MAP_NO_ISO = { "Kosovo":"XKX", "N. Cyprus":null, "Somaliland":null };

/* Build the reverse lookup once: canonical name -> code, so a name
   already in its final form resolves without needing a NAME_ISO row. */
const _CANON_ISO = {};
Object.keys(ISO_NAME).forEach(code => { _CANON_ISO[ISO_NAME[code]] = code; });

function isoOf(name) {
  if (name == null) return null;
  const n = String(name).trim();
  return NAME_ISO[n] || _CANON_ISO[n] || null;
}

/* The one function the rest of the app calls. A name in, the single
   agreed name out. Unknown names pass through rather than vanish. */
function canonCountry(name) {
  const code = isoOf(name);
  return code && ISO_NAME[code] ? ISO_NAME[code] : String(name == null ? "" : name).trim();
}

/* world-atlas feature -> code. feature.id is the ISO numeric, zero
   padded; three polygons ship without one and are handled above. */
function isoOfFeature(f) {
  if (!f) return null;
  if (f.id) return String(f.id);
  const n = f.properties && f.properties.name;
  return Object.prototype.hasOwnProperty.call(MAP_NO_ISO, n) ? MAP_NO_ISO[n] : undefined;
}

function canonFeature(f) {
  const code = isoOfFeature(f);
  if (code && ISO_NAME[code]) return ISO_NAME[code];
  return (f && f.properties && f.properties.name) || "";
}

const isUninhabited = nameOrCode =>
  UNINHABITED.has(String(nameOrCode)) || UNINHABITED.has(isoOf(nameOrCode));

/* ---- the check ----
   Fails when two codes would print the same label, when a name folds
   onto a code that has no name, or when a map polygon resolves to
   nothing. Run in the browser (Data health) and in CI. */
function auditCountries(features) {
  const errors = [];

  const byName = {};
  Object.keys(ISO_NAME).forEach(code => {
    const n = ISO_NAME[code];
    (byName[n] = byName[n] || []).push(code);
  });
  Object.keys(byName).forEach(n => {
    if (byName[n].length > 1)
      errors.push("“" + n + "” is claimed by more than one country code: " + byName[n].join(", "));
  });

  Object.keys(NAME_ISO).forEach(variant => {
    const code = NAME_ISO[variant];
    if (!ISO_NAME[code])
      errors.push("“" + variant + "” folds onto code " + code + ", which has no name.");
    if (ISO_NAME[variant])
      errors.push("“" + variant + "” is listed as both a canonical name and a variant.");
  });

  if (features && features.length) {
    const seen = {};
    features.forEach(f => {
      const raw = (f.properties && f.properties.name) || "(unnamed)";
      const code = isoOfFeature(f);
      if (code === undefined) {
        errors.push("Map polygon “" + raw + "” has no country code and no entry to match it.");
        return;
      }
      if (code === null) return;              /* known disputed, deliberately unmatched */
      const name = canonFeature(f);
      if (seen[name] && seen[name] !== code)
        errors.push("“" + name + "” is drawn by two different polygons: " + seen[name] + " and " + code);
      seen[name] = code;
    });
  }
  return errors;
}

if (typeof module !== "undefined" && module.exports)
  module.exports = { ISO_NAME, NAME_ISO, UNINHABITED, MAP_NO_ISO,
    isoOf, canonCountry, isoOfFeature, canonFeature, isUninhabited, auditCountries };
