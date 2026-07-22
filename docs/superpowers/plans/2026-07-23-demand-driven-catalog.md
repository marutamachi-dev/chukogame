# 需要連動300タイトル・カタログ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 検索・閲覧需要を安全に記録し、毎日の全300件価格更新と検証済みタイトルの自動入替を実現する。

**Architecture:** ReactクライアントはSupabaseへ追加専用のイベントを送る。GitHub ActionsはSupabase集計から30日間の需要を取得し、Yahoo Shoppingで候補を再検証してから300件マスターを最大10件更新し、その入替後の300件すべてを価格更新する。価格収集が失敗した場合は入替をcommitしない。

**Tech Stack:** React 19、Vite、Node.js 24、GitHub Actions、Supabase Postgres/RLS、Yahoo Shopping API。

## Global Constraints

- 掲載件数は常に300件、JANは重複させない。
- 国内Nintendo Switchパッケージ通常版・JAN確認済みだけを候補にできる。
- Switch 2、DL専売、海外版、JAN未確認は除外する。
- 個人情報、IPアドレス、ユーザーIDを保存しない。
- 全SupabaseテーブルでRLSを有効化し、公開クライアントにはイベントINSERTだけを許可する。
- 日次処理は直近30日を集計し、掲載7日未満は保護、入替は最大10件に制限する。

---

### Task 1: Supabaseのイベント・集計スキーマ

**Files:**
- Create: `supabase/migrations/<generated>_create_chukogame_demand.sql`
- Test: Supabase SQL検証クエリ

**Interfaces:**
- Produces: `public.chukogame_events(event_type, query, game_jan, occurred_on)`
- Produces: `public.chukogame_catalog_state(game_jan, listed_from)`
- Produces: `public.chukogame_catalog_history(removed_jan, added_jan, removed_score, added_score, changed_at)`
- Produces: private workflow-only RPC returning `{query, game_jan, search_count, miss_count, view_count, demand_score}`.

- [ ] **Step 1: Write failing SQL checks**

```sql
select to_regclass('public.chukogame_events') as events_table;
select * from private.chukogame_demand_30d();
```

Expected: first query is null and the second query fails before the migration.

- [ ] **Step 2: Apply the migration**

Create the three tables and indexes; enable RLS; grant `anon` INSERT only for valid event rows; revoke SELECT/UPDATE/DELETE; create a workflow-only aggregate RPC in a non-public schema. The RPC computes `search + miss * 2 + view` over 30 days.

- [ ] **Step 3: Verify migration and security**

Run table inspection, valid and invalid event inserts, aggregate RPC as workflow role, and security advisor. Expected: RLS enabled; invalid input rejected; no public SELECT policy.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat: add catalog demand event schema"
```

### Task 2: Client event recording

**Files:**
- Create: `src/lib/demand-events.js`
- Modify: `src/App.jsx`
- Modify: `package.json`, `package-lock.json`
- Test: `test/demand-events.test.mjs`

**Interfaces:**
- Produces: `normalizeDemandQuery(value): string`
- Produces: `recordDemandEvent({ eventType, query?, gameJan? }): Promise<void>`

- [ ] **Step 1: Write the failing test**

```js
test('normalizes whitespace and rejects an empty query', () => {
  assert.equal(normalizeDemandQuery('  マリオ   カート  '), 'マリオ カート');
  assert.equal(normalizeDemandQuery('   '), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/demand-events.test.mjs`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

Add pinned `@supabase/supabase-js`. Build a client only from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; absent configuration is a no-op. Insert only event type, normalized query, and JAN. In `App.jsx`, record search/search_miss after determining result count and view once per detail route. Telemetry failure never breaks navigation.

- [ ] **Step 4: Run tests**

Run: `node --test test/demand-events.test.mjs && npm test && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/App.jsx src/lib/demand-events.js test/demand-events.test.mjs
git commit -m "feat: record catalog search and view demand"
```

### Task 3: 需要スコアと安全な入替ロジック

**Files:**
- Create: `src/lib/demand-catalog.js`
- Create: `scripts/rebalance-demand-catalog.mjs`
- Test: `test/demand-catalog.test.mjs`

**Interfaces:**
- Produces: `scoreDemand({searchCount, missCount, viewCount}): number`
- Produces: `planCatalogReplacement({listed, candidates, today}): { removals, additions }`

- [ ] **Step 1: Write failing tests**

```js
test('scores misses twice as strongly as a search', () => {
  assert.equal(scoreDemand({ searchCount: 3, missCount: 2, viewCount: 5 }), 12);
});

test('protects titles listed fewer than seven days and caps replacements at ten', () => {
  const result = planCatalogReplacement({ listed, candidates, today: '2026-07-23' });
  assert.ok(result.removals.every((game) => game.listedDays >= 7));
  assert.ok(result.removals.length <= 10);
  assert.equal(result.removals.length, result.additions.length);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/demand-catalog.test.mjs`  
Expected: FAIL because the functions are absent.

- [ ] **Step 3: Write minimal implementation**

Implement score `search + miss * 2 + view`. The script reads private aggregates, verifies candidate query results with Yahoo Shopping and existing `isValidJan`, `hasExcludedProductName`, and package category checks. It skips all rebalancing on aggregate/source failure, preserves exactly 300 unique JANs, protects seven-day listings, and writes history/state only for replacements with strictly higher verified demand.

- [ ] **Step 4: Run tests**

Run: `node --test test/demand-catalog.test.mjs && npm test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/demand-catalog.js scripts/rebalance-demand-catalog.mjs test/demand-catalog.test.mjs
git commit -m "feat: rebalance catalog from verified demand"
```

### Task 4: Daily full-refresh workflow

**Files:**
- Modify: `.github/workflows/daily-catalog.yml`
- Modify: `package.json`, `.env.example`
- Test: `test/demand-workflow.test.mjs`

- [ ] **Step 1: Write failing workflow test**

```js
test('daily workflow uses all chunks before rebalancing', () => {
  assert.match(workflow, /GAME_CHUNK:\s*all/);
  assert.match(workflow, /npm run rebalance:catalog/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/demand-workflow.test.mjs`  
Expected: FAIL because scheduled refresh rotates chunks and has no rebalance command.

- [ ] **Step 3: Write minimal workflow changes**

Scheduled runs run rebalancing first and then set `GAME_CHUNK=all` to refresh the resulting300件全件. Keep the manual chunk override. Add only the required Supabase workflow credentials as GitHub Secrets. Commit source offers, master, catalog, and demand state only after all tests pass.

- [ ] **Step 4: Run tests and build**

Run: `node --test test/demand-workflow.test.mjs && npm test && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/daily-catalog.yml package.json .env.example test/demand-workflow.test.mjs
git commit -m "feat: run full daily demand-driven catalog refresh"
```

### Task 5: Production verification

**Files:**
- Modify: `NEXT_SESSION_HANDOFF.md`

- [ ] **Step 1: Verify production**

Deploy production, submit a known search and a detail view, and verify event insertion and a private aggregate query.

- [ ] **Step 2: Run the workflow once**

Dispatch `game_chunk=all`. Expected: full refresh completes; rebalancing either safely skips without a qualified candidate or commits a 300-title, JAN-unique replacement.

- [ ] **Step 3: Commit handoff**

```bash
git add NEXT_SESSION_HANDOFF.md
git commit -m "docs: record demand-driven catalog rollout"
```
