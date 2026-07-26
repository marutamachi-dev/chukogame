# Supabase Rakuten Price Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect verified Rakuten purchase offers in Supabase and build the static catalog only from the latest successful snapshot.

**Architecture:** A secret-authorized Edge Function writes a private run audit and offer snapshot. Six Supabase Cron jobs invoke stable 50-title chunks from 05:00 to 05:50 JST, keeping each run below the 400-second wall-clock limit. GitHub reads the successful snapshots and never calls Rakuten or Surugaya.

**Tech Stack:** Supabase Postgres, Vault, pg_cron, pg_net, Deno Edge Functions, Node.js, @supabase/supabase-js, GitHub Actions.

## Global Constraints

- Preserve exactly 300 verified domestic Nintendo Switch package titles.
- Publish only used, in-stock, shipping-included, exact JAN/title purchase offers.
- Keep credentials out of code, generated files, browser clients, and logs.
- Retain the last successful snapshot after a failed collector run.
- Do not synthesize a trade-in price without a contracted official feed.

---

### Task 1: Private collector storage and daily schedule

**Files:**
- Create: `supabase/migrations/20260726140000_create_chukogame_source_collector.sql`
- Create: `test/source-collector-schema.test.mjs`

**Interfaces:** Creates `chukogame_source_refresh_runs`, `chukogame_source_refresh_results`, and `chukogame_source_offers`; schedules `chukogame-rakuten-chunk-0` through `chukogame-rakuten-chunk-5` at 20:00 through 20:50 UTC.

- [ ] **Step 1: Write the failing test**

```js
test("collector tables are private and cron is declared", async () => {
  const sql = await readFile("supabase/migrations/20260726140000_create_chukogame_source_collector.sql", "utf8");
  assert.match(sql, /chukogame_source_refresh_runs/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /chukogame-rakuten-chunk-0/);
  assert.match(sql, /chukogame-rakuten-chunk-5/);
});
```

- [ ] **Step 2: Verify RED**

Run `node --test test/source-collector-schema.test.mjs`. Expected: fail because the migration is absent.

- [ ] **Step 3: Implement migration**

Create a run table with source, timestamps, status (`running|succeeded|failed`), requested title count, verified offer/title counts, zero-search count, no-verified-match count, and non-secret error summary. Create a current-offer table keyed by `(source, jan, listing_url)` with title, game id, price, observed time, JSON payload, and run id. Create a per-title result table keyed by `(refresh_run_id, game_id)`. Enable RLS, revoke `anon` and `authenticated`, and grant only `service_role`. Enable `pg_net`, `pg_cron`, and Vault. Store a random `chukogame_collector_secret` in Vault and create six cron `net.http_post` calls with chunk bodies `0` through `5` at 20:00, 20:10, 20:20, 20:30, 20:40, and 20:50 UTC.

- [ ] **Step 4: Verify GREEN and apply**

Run `node --test test/source-collector-schema.test.mjs`, apply the migration to `ibsstozurckxibhnhquu`, and query `pg_tables` for the three tables. Expected: all tables exist with RLS enabled.

- [ ] **Step 5: Commit**

Run `git add supabase/migrations/20260726140000_create_chukogame_source_collector.sql test/source-collector-schema.test.mjs` then `git commit -m "feat: add private source collector storage"`.

### Task 2: Secret-authorized Rakuten Edge Function

**Files:**
- Create: `supabase/functions/chukogame-rakuten-refresh/index.ts`
- Create: `supabase/functions/chukogame-rakuten-refresh/deno.json`
- Create: `test/rakuten-edge-function.test.mjs`

**Interfaces:** Consumes `POST { chunk?: 0|1|2|3|4|5|"all" }` with `x-collector-secret`. Produces `{ runId, status, requestedTitles, verifiedOffers, verifiedTitles, zeroSearch, noVerifiedMatch }`.

- [ ] **Step 1: Write failing tests**

```js
test("rejects a missing collector secret", async () => {
  assert.equal((await handleRefresh(new Request("https://x", { method: "POST" }), deps)).status, 401);
});
test("records zero search without loosening validation", async () => {
  const result = await collectGame(game, { fetch: async () => jsonResponse({ items: [] }) });
  assert.equal(result.status, "no-search-results");
});
```

- [ ] **Step 2: Verify RED**

Run `node --test test/rakuten-edge-function.test.mjs`. Expected: fail because the functions do not exist.

- [ ] **Step 3: Implement function**

Read `RAKUTEN_APPLICATION_ID`, `RAKUTEN_ACCESS_KEY`, and `CHUKOGAME_COLLECTOR_SECRET` from `Deno.env`. Reject every request with an incorrect secret. Send `applicationId` as a query parameter and `accessKey` as a request header. Preserve only items whose normalized title matches the master, contain used/Switch terms, are in stock, and include shipping. Create a running audit, write every title outcome, upsert only verified offers, and mark success only after all titles complete. Mark authentication errors failed without deleting the prior snapshot or logging credentials.

- [ ] **Step 4: Verify GREEN and deploy**

Run `node --test test/rakuten-edge-function.test.mjs`. Deploy with JWT verification disabled only because the mandatory custom secret check protects the endpoint. Set the three secrets in Supabase, invoke chunk `0`, then query the latest audit. Expected: a successful run and no credential in logs.

- [ ] **Step 5: Commit**

Run `git add supabase/functions/chukogame-rakuten-refresh test/rakuten-edge-function.test.mjs` then `git commit -m "feat: collect Rakuten prices in Supabase"`.

### Task 3: Static catalog snapshot sync

**Files:**
- Create: `src/lib/supabase-source-snapshot.js`
- Create: `scripts/sync-supabase-source-offers.mjs`
- Create: `test/supabase-source-sync.test.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/daily-catalog.yml`
- Modify: `scripts/refresh-sources.mjs`

**Interfaces:** Produces `npm run sync:supabase-offers`. It reads only the latest successful run and leaves `data/source-offers.json` unchanged when no success exists.

- [ ] **Step 1: Write failing tests**

```js
test("selects only the latest successful run", () => {
  assert.equal(selectLatestSuccessfulSnapshot(runs, offers).run.id, "new");
});
test("retains existing data without a successful snapshot", () => {
  assert.deepEqual(mergeSupabaseSnapshot(previous, null), previous);
});
```

- [ ] **Step 2: Verify RED**

Run `node --test test/supabase-source-sync.test.mjs`. Expected: fail because snapshot helpers do not exist.

- [ ] **Step 3: Implement sync and workflow update**

Use existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to read the latest successful Rakuten offers, convert them to the current source-offer format, and atomically merge them with non-Rakuten offers. Add `sync:supabase-offers` to `package.json`. Replace the workflow marketplace refresh step with the sync command and remove all Rakuten credentials from GitHub Actions. Disable direct Surugaya collection there while retaining old verified data until the freshness policy removes it.

- [ ] **Step 4: Verify GREEN and commit**

Run `node --test test/supabase-source-sync.test.mjs test/demand-workflow.test.mjs`, then `npm.cmd test` and `npm.cmd run build`. Commit with `git commit -m "feat: build catalog from Supabase price snapshot"`.

### Task 4: Trade-in safety and release

**Files:**
- Modify: `src/lib/price-rules.js`
- Modify: `src/App.jsx`
- Test: `test/price-rules.test.mjs`
- Test: `test/detail-page.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
test("removes stale trade-in offers without an official refresh", () => {
  assert.deepEqual(buildCatalog([expiredSaleOffer], now, [game])[0].sale, []);
});
test("shows the current trade-in price as unavailable", () => {
  assert.match(renderedDetailHtml, /現在確認できる買取価格がありません/);
});
```

- [ ] **Step 2: Verify RED, implement, and verify GREEN**

Run `node --test test/price-rules.test.mjs test/detail-page.test.mjs` and confirm failure. Add freshness handling and the exact unavailable copy, then rerun and confirm pass.

- [ ] **Step 3: Release verification**

Run all six collector chunks, confirm each daily audit succeeded, trigger static sync, deploy Vercel production, and verify the home page, ranking, and one detail page. Commit with `git commit -m "fix: show unavailable trade-in prices safely"`.
