# Supabase price collector design

## Goal

Move Rakuten purchase-price collection out of GitHub Actions while preserving
the static, crawlable 300-title catalog. Do not publish inferred prices or
unverified trade-in prices.

## Scope

### Rakuten purchase prices

- A private Supabase Edge Function fetches the 300 active domestic Nintendo
  Switch package titles from Rakuten.
- Rakuten credentials live only in Supabase Edge Function secrets.
- Each request is matched to the verified JAN/title and the existing strict
  used, in-stock, shipping-included conditions remain unchanged.
- The function stores raw verified offers, per-title results, and the run
  status in Supabase.
- A scheduled invocation runs daily. Authentication failure aborts the run;
  zero-search and no-verified-match results are counted separately.

### Static catalog handoff

- GitHub Actions no longer calls Rakuten.
- It reads the latest successful Supabase snapshot using its existing
  service-role credential, merges it with the catalog, and generates the
  static catalog and SEO pages as it does today.
- A failed or incomplete collector run leaves the last successful snapshot
  intact, so production prices are never erased by a failed refresh.

### Trade-in prices

- Disable the unpermitted direct Surugaya collector in the scheduled flow.
- Keep previously verified values only until their normal freshness policy
  expires; otherwise show that a current price is unavailable.
- Add a provider adapter boundary for a future contracted official API or CSV
  feed. It must provide a source URL, observed time, exact JAN/title, and a
  numeric trade-in value before publication.

## Data model

- `chukogame_source_offers`: current verified raw offers by source, JAN and
  listing URL.
- `chukogame_source_refresh_runs`: immutable run audit with source, timing,
  counts, failure class and error summary.
- `chukogame_source_refresh_results`: per-title status for zero results and
  matching outcomes.

All tables use RLS. Only the Edge Function and GitHub Actions service roles
write them. The public client receives no service-role key and no raw source
table access.

## Schedule and security

- Supabase Cron invokes the Edge Function with an internal secret held in
  Vault; the Edge Function rejects public calls without that secret.
- Function JWT verification is disabled only because the function implements
  an exact internal-secret authorization check itself; no browser client
  receives the secret or access to the endpoint.
- Rakuten credentials are never logged, returned by the function, committed,
  or copied into GitHub Actions.

## Verification and rollback

1. Run a 50-title collector batch from Supabase.
2. Confirm a successful Rakuten response and verify stored offer/title counts.
3. Run the GitHub static-catalog sync without external marketplace requests.
4. Verify that the generated catalog count and production detail page prices
   agree with the stored snapshot.
5. If the collector fails, retain the latest successful snapshot and report
   the failure in the run audit.

## Acceptance criteria

- GitHub Actions does not make a Rakuten request.
- Rakuten response failures no longer fail a static catalog build when a last
  successful snapshot exists.
- The catalog publishes only offers satisfying the current validation rules.
- Every published Rakuten offer can be traced to a stored source URL and
  observed timestamp.
- No trade-in price is synthesized while an approved provider feed is absent.
