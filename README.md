# Neobank Atlas

**Which crypto neobank actually works in your country?**

Click a country on the globe. See every hybrid and web3-native neobank that lists it — plus what each one *doesn't* tell you.

**Live:** https://neobank-atlas.vercel.app

## Why this exists

The [neobankbeat](https://www.neobankbeat.com) dataset tracks 368 neobanks under MIT. It is the best open dataset in this space. But the three fields users actually need are the three emptiest:

| Field | Coverage (368 entities) |
|---|---|
| Any `countries` list | **167** — 45% |
| `services` (on-ramp / off-ramp / IBAN) | **24** — 6.5% |
| `fx_markup` (real FX fee) | **21** — 5.7% |

Of the 114 crypto neobanks (hybrid + web3-native), only 63 publish a country list, 16 publish ramps, and 6 publish FX fees. Thirty-one entries just say `"Global"`.

So "which card works in Pakistan, can I off-ramp to my bank, and what is the real FX cost" is a question the open data **cannot answer today**. That gap is the product.

## What it does

- **3D globe, clickable countries.** Each country is shaded by how many providers list it. Click one to filter the directory to it; click again to go back to the world view.
- **Provider detail with brand theming.** Selecting a provider re-themes the whole interface — globe included — in that company's colour.
- **Gaps shown, not hidden.** Where a provider publishes nothing, the field reads `NOT PUBLISHED — UNVERIFIED` instead of being quietly omitted. Missing data is a visible, dashed badge in the list.
- **Community reports.** Anyone can add what actually happened: signup accepted, KYC rejected, off-ramp worked, fees differed. Reports attach to a provider *and* a country — the missing dimension.
- **Filters** by wave (hybrid / web3-native) and by required capability (on-ramp, off-ramp, IBAN, crypto cards, …).

## Data

Base layer is fetched live from neobankbeat's `data.json` through a Vercel rewrite at `/nb-data.json` — their endpoint does not send CORS headers, so a same-origin proxy is required. An offline sample is bundled so the page is never blank.

Country strings are normalised before matching: `"European Union"` expands to its 27 members, `"UAE" → "United Arab Emirates"`, `"Türkiye" → "Turkey"`, and so on. `"Global"` is shown as a claim, not painted onto every country.

**City-states.** world-atlas at 110m resolution has no polygon for Singapore, Hong Kong or Gibraltar — which between them are home to 12 provider listings, including RedotPay and KAST. They are unreachable by clicking the globe, so the **country picker** in the filters covers every country in the data and marks these `too small to plot`.

## Mobile

Two breakpoints (940px / 600px). On phones the globe shrinks to 26vh, the title and CTA stack full-width, filters collapse behind a disclosure so results are visible without scrolling, detail fields switch to label-above-value, and the report form becomes a bottom sheet. Inputs are 16px so iOS doesn't zoom on focus.

Base data © neobankbeat, MIT. This project adds the country-verification layer on top.

## Run locally

```bash
python3 -m http.server 8000
```

The `/nb-data.json` proxy only exists on Vercel, so locally the app falls back to the bundled sample.

## Status

Prototype. Reports are stored in `localStorage`, so they are visible only to the person who submitted them. See [`ROADMAP.md`](./ROADMAP.md) for the backend, moderation and monetisation plan.

## Tech

Vanilla HTML/CSS/JS · [globe.gl](https://globe.gl) (Three.js) · [world-atlas](https://github.com/topojson/world-atlas) · [neobankbeat data](https://www.neobankbeat.com/data.json)

## Licence

MIT
