# Roadmap

The prototype proves the interface. The product is the **country-verification layer** — the data nobody maintains.

---

## 1. Backend (2 weeks)

Supabase. The whole schema is one table plus a view.

```sql
create table reports (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,          -- matches neobankbeat entity name
  country      text not null,          -- normalised ISO country name
  outcome      text not null,          -- signup_ok | kyc_reject | card_ok
                                       -- onramp_ok | offramp_ok | offramp_no
                                       -- fee_diff | blocked
  detail       text,
  fx_observed  numeric,                -- if outcome = fee_diff
  reporter_id  uuid references auth.users(id),
  status       text default 'pending', -- pending | approved | rejected
  created_at   timestamptz default now()
);

create index on reports (provider, country, status);

-- what the map actually renders
create view availability as
select provider, country,
  count(*) filter (where outcome in ('signup_ok','card_ok'))       as works,
  count(*) filter (where outcome in ('kyc_reject','blocked'))      as blocked,
  count(*) filter (where outcome = 'offramp_ok')                   as offramp_ok,
  count(*) filter (where outcome = 'offramp_no')                   as offramp_no,
  max(created_at)                                                  as last_report
from reports where status = 'approved'
group by provider, country;
```

Then the globe paints from **verified** data, not from what companies claim. That is the whole thesis.

**Anti-abuse from day one.** Providers have every incentive to farm positive reports and bury negative ones. Minimum: auth required, one report per user per provider per country, rate limits, Turnstile, and manual review of anything that flips a country from blocked to working.

## 2. Freshness (ongoing)

Availability changes constantly — a provider can drop a country overnight. Same trap that kills every directory.

- Show `LAST CONFIRMED` on every provider × country pair.
- Reports older than 6 months grey out and stop counting toward the map colour.
- Ask reporters to re-confirm at 90 days, one click.

## 3. SEO surface (2 weeks)

The traffic is all long-tail, high-intent:

- `/pakistan` — every provider that works in Pakistan
- `/redotpay/pakistan` — one provider, one country, verified
- `/pakistan/off-ramp` — providers that can pay out to a local bank

These pages are the entire acquisition strategy. They need to be server-rendered, so move to Next.js before writing them.

## 4. Money

Referral. Crypto cards pay real CPA and most already run public programmes. Two rules, or the product is worthless:

1. Referral links are marked, on every single one.
2. Ranking never depends on payout. If a provider is blocked in the user's country, it says so — even if it pays the most.

The moment ranking is for sale, the verification layer is worth nothing, and verification is the only thing here that is hard to copy.

## 5. Risks

**neobankbeat can build the map in a weekend.** The map is not the moat. The verified country data is. Ship reports early, get real volume, and stay the source they would rather link to than rebuild.

**Cold start.** Reports need users; users need reports. Seed it manually — pick 5 countries with high demand and bad information (Pakistan, Nigeria, Argentina, Egypt, Vietnam), sign up to the top 15 providers from each, and record what actually happens. That is unglamorous and it is the job.

**No financial advice.** This lists what providers do and what users report. It does not recommend where anyone should keep money.
