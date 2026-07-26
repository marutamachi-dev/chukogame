# Yahoo!ショッピング購入価格更新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yahoo!ショッピングだけを用いて、300件の国内Nintendo Switchパッケージ版の検証済み購入価格を毎日更新する。

**Architecture:** YahooアダプターはJAN検索を最優先し、検証済み候補がない場合だけ正式タイトル、登録済み別名の順で検索する。どの検索結果もJAN完全一致・中古・在庫あり・送料込み・Switch 2除外を満たす場合だけ採用する。更新成功時は対象タイトルのYahooおよび楽天の購入価格を置換し、当日未確認の価格は残さない。

**Tech Stack:** Node.js ESM, Yahoo!ショッピング商品検索API, GitHub Actions, Vite, Node test runner.

## Global Constraints

- 対象はゲームマスターにある国内Nintendo Switchパッケージ版300タイトルだけ。
- 価格の自動取得元はYahoo!ショッピングだけ。楽天・駿河屋への自動リクエストを行わない。
- 採用価格はJAN完全一致、中古、在庫あり、送料込み、正の価格、Switch 2除外を満たすものだけ。
- 当日Yahoo価格なしの対象タイトルは、Yahoo・楽天の購入価格を残さない。
- Yahoo APIの全リクエストが失敗した場合だけ、既存データを維持してジョブを失敗扱いにする。
- 推測価格・タイトルだけの価格・未検証の価格を公開しない。

---

### Task 1: Yahooの検索・検証を二段階化する

**Files:**
- Modify: `scripts/adapters/yahoo-shopping.mjs`
- Modify: `test/yahoo-shopping.test.mjs`

**Interfaces:** `fetchYahooOffers(game, env, fetchImpl)` は検証済み購入オファーだけを返す。`game.jan`、`game.title`、`game.aliases`を利用する。

- [ ] **Step 1: Write failing tests**

```js
test("retries with the formal title after JAN has no verified offer", async () => {
  const requests = [];
  const offers = await fetchYahooOffers(game, env, async (url) => {
    requests.push(String(url));
    return { ok: true, json: async () => ({ hits: requests.length === 2 ? [validHit(game)] : [] }) };
  });
  assert.equal(offers.length, 1);
  assert.match(requests[0], /jan_code=/);
  assert.equal(new URL(requests[1]).searchParams.get("query"), game.title);
});
test("uses an alias after JAN and formal title have no verified offer", async () => {
  const aliasGame = { ...game, aliases: ["Sample Alias"] };
  const requests = [];
  const offers = await fetchYahooOffers(aliasGame, env, async (url) => {
    requests.push(String(url));
    return { ok: true, json: async () => ({ hits: requests.length === 3 ? [validHit(aliasGame)] : [] }) };
  });
  assert.equal(offers.length, 1);
  assert.equal(new URL(requests[2]).searchParams.get("query"), "Sample Alias");
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/yahoo-shopping.test.mjs`

Expected: FAIL because the adapter stops after JAN search.

- [ ] **Step 3: Implement minimum search sequence**

```js
const searches = [{ jan_code: game.jan }, { query: game.title }, ...(game.aliases || []).map((query) => ({ query }))];
for (const search of searches) {
  const offers = verifiedOffers((await request(addSearchParams(createParams(), search))).hits || [], game, observedAt);
  if (offers.length) return offers;
}
return [];
```

`verifiedOffers`内で、検索方法にかかわらず`item.janCode === game.jan`を必須とする。

- [ ] **Step 4: Add rejection tests**

```js
test("never accepts a title-search result with another JAN", async () => {
  const offers = await fetchYahooOffers(game, env, fetchWith([{ ...validHit(game), janCode: "4900000000001" }]));
  assert.deepEqual(offers, []);
});
test("excludes a Switch 2 result with the expected JAN", async () => {
  const offers = await fetchYahooOffers(game, env, fetchWith([{ ...validHit(game), name: "Sample Switch 2 Game 中古" }]));
  assert.deepEqual(offers, []);
});
```

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test test/yahoo-shopping.test.mjs`

Expected: PASS.

```bash
git add scripts/adapters/yahoo-shopping.mjs test/yahoo-shopping.test.mjs
git commit -m "feat: broaden verified Yahoo price search"
```

### Task 2: Yahooだけで購入価格を置換する

**Files:**
- Modify: `src/lib/chunk-refresh.js`
- Modify: `scripts/refresh-sources.mjs`
- Create: `test/yahoo-purchase-refresh.test.mjs`

**Interfaces:** `mergeChunkOffers({ previous, refreshed, targetGames, replaceOffer })` は対象ゲームの`replaceOffer`一致分を削除してから更新分を追加する。

- [ ] **Step 1: Write failing tests**

```js
test("removes old Yahoo and Rakuten purchase offers when Yahoo finds no current price", () => {
  const result = mergeChunkOffers({ previous: [oldYahoo, oldRakuten, sale], refreshed: [], targetGames: [game], replaceOffer });
  assert.deepEqual(result, [sale]);
});
test("writes only when at least one Yahoo request succeeded", () => {
  assert.equal(shouldWriteYahooRefresh({ successfulRequests: 0 }), false);
  assert.equal(shouldWriteYahooRefresh({ successfulRequests: 1 }), true);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/yahoo-purchase-refresh.test.mjs`

Expected: FAIL because Rakuten purchase offers are retained and no write-decision helper exists.

- [ ] **Step 3: Implement source isolation**

```js
const adapters = [{ name: "Yahoo Shopping", source: "Yahoo! Shopping", enabled: yahooConfigured(), fetch: fetchYahooOffers }];
const replaceOffer = (offer) => offer.kind === "purchase" && ["Yahoo! Shopping", "Rakuten Ichiba"].includes(offer.source);
```

Remove target purchase offers satisfying `replaceOffer` before writing current Yahoo results. Do not retain an individual title's old price after a Yahoo zero-result or individual request error. Retain the entire previous file only when every Yahoo HTTP request fails.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test test/yahoo-purchase-refresh.test.mjs test/chunk-refresh.test.mjs`

Expected: PASS.

```bash
git add src/lib/chunk-refresh.js scripts/refresh-sources.mjs test/yahoo-purchase-refresh.test.mjs
git commit -m "fix: replace purchase prices from Yahoo daily"
```

### Task 3: 毎日300件更新をYahoo専用にする

**Files:**
- Modify: `.github/workflows/daily-catalog.yml`
- Modify: `test/demand-workflow.test.mjs`

**Interfaces:** 毎日ジョブは`GAME_CHUNK=all`のまま、Yahooの2つの環境変数だけを`refresh:sources`に渡す。

- [ ] **Step 1: Write failing test**

```js
test("daily refresh provides Yahoo credentials without Rakuten credentials", () => {
  const block = workflow.slice(workflow.indexOf("Refresh marketplace source offers"));
  assert.match(block, /YAHOO_SHOPPING_APP_ID:/);
  assert.doesNotMatch(block, /RAKUTEN_APPLICATION_ID:/);
  assert.doesNotMatch(block, /RAKUTEN_ACCESS_KEY:/);
  assert.match(block, /GAME_CHUNK: \$\{\{ github\.event_name == 'schedule' && 'all'/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/demand-workflow.test.mjs`

Expected: FAIL because Rakuten credentials are currently passed.

- [ ] **Step 3: Update workflow and verify GREEN**

Remove only the Rakuten environment variables from the refresh step; preserve Yahoo credentials and `GAME_CHUNK=all`.

Run: `node --test test/demand-workflow.test.mjs`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/daily-catalog.yml test/demand-workflow.test.mjs
git commit -m "chore: refresh all purchase prices from Yahoo"
```

### Task 4: 本番データ更新と公開確認

**Files:**
- Generated: `data/source-offers.json`
- Generated: `src/data/generated-catalog.js`

- [ ] **Step 1: Run full Yahoo update**

Run: `GAME_CHUNK=all npm run refresh:sources`

Expected: Yahoo 300 requests complete. If every request fails, keep data unchanged and stop.

- [ ] **Step 2: Generate and test**

```bash
npm run build:catalog
npm test
npm run build
```

Expected: all tests and the Vite build pass.

- [ ] **Step 3: Commit and production deploy**

```bash
git add data/source-offers.json src/data/generated-catalog.js
git commit -m "chore: refresh Yahoo purchase prices"
git push origin main
npx vercel@latest --prod --yes
```

- [ ] **Step 4: Verify public URLs**

Verify `/`, `/ranking`, and one game detail page. Confirm a title without a current verified Yahoo price does not show former Yahoo or Rakuten purchase price.
