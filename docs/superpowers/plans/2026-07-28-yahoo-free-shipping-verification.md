# Yahoo! Shopping 完全送料無料検証 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yahoo! Shoppingの購入価格を、完全送料無料と確認できる通常中古在庫だけへ限定する。

**Architecture:** Yahoo検索リクエストで完全送料無料・在庫ありへ絞り込み、応答レコードでも送料コード2を必須にする。ソースオファーへ送料コードを保存し、全件再取得して古いYahoo購入価格を置換する。

**Tech Stack:** Node.js ESM、Node test runner、Yahoo! Shopping V3 API、Vite

## Global Constraints

- 対象は国内Nintendo Switchパッケージ版の検証済み300タイトルだけとする。
- `shipping.code === 2` 以外のYahoo販売価格は掲載しない。
- Yahooで当日価格が取れないタイトルに古いYahoo/Rakuten購入価格を残さない。
- 買取価格、ジャンル、需要による入替は変更しない。

---

### Task 1: 完全送料無料条件をテストで固定する

**Files:**
- Modify: `test/yahoo-shopping.test.mjs`

**Interfaces:**
- Consumes: `fetchYahooOffers(game, env, fetchImpl)`.
- Produces: APIリクエストと応答送料コードの回帰テスト。

- [ ] **Step 1: Write failing tests for the request and response contract**

```js
test("requests only in-stock free-shipping Yahoo offers", async () => {
  const requests = [];
  await fetchYahooOffers(game, { YAHOO_SHOPPING_APP_ID: "test" }, async (url) => {
    requests.push(new URL(url));
    return { ok: true, json: async () => ({ hits: [] }) };
  });
  assert.equal(requests[0].searchParams.get("shipping"), "free");
  assert.equal(requests[0].searchParams.get("in_stock"), "true");
});

test("rejects settings-none and conditional-free shipping offers", async () => {
  const offers = await fetchYahooOffers(game, { YAHOO_SHOPPING_APP_ID: "test" }, async () => ({
    ok: true,
    json: async () => ({ hits: [
      { ...validHit(), shipping: { code: 1, name: "設定なし" } },
      { ...validHit(), shipping: { code: 3, name: "条件付き送料無料" } },
    ] }),
  }));
  assert.deepEqual(offers, []);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test test/yahoo-shopping.test.mjs`

Expected: FAIL because the request lacks `shipping=free`/`in_stock=true` and code 1 or 3 is accepted.

### Task 2: Yahooアダプターで完全送料無料を強制する

**Files:**
- Modify: `scripts/adapters/yahoo-shopping.mjs:11-63`
- Modify: `test/yahoo-shopping.test.mjs`

**Interfaces:**
- Produces: オファーに `shippingCode: 2` が保存される。
- Consumes: Yahoo V3 `shipping.code`.

- [ ] **Step 1: Implement the minimal filter and evidence field**

```js
const createParams = () => new URLSearchParams({
  appid: env.YAHOO_SHOPPING_APP_ID,
  condition: "used", in_stock: "true", shipping: "free", sort: "+price", results: "30",
});

// response filter
&& Number(item.shipping?.code) === 2

// mapped source offer
shippingCode: Number(item.shipping.code),
```

- [ ] **Step 2: Run focused tests and confirm they pass**

Run: `node --test test/yahoo-shopping.test.mjs test/yahoo-purchase-refresh.test.mjs`

Expected: PASS; only code2 remains eligible and a no-result response still clears stale purchase data.

- [ ] **Step 3: Commit the verified adapter change**

Run: `git add scripts/adapters/yahoo-shopping.mjs test/yahoo-shopping.test.mjs && git commit -m "fix: require verified Yahoo free shipping"`

### Task 3: 全300タイトルのYahoo購入価格を再取得・配信する

**Files:**
- Modify: `data/source-offers.json`
- Modify: `src/data/generated-catalog.js`

**Interfaces:**
- Consumes: `npm.cmd run refresh:sources` and `npm.cmd run build:catalog`.
- Produces: 送料コード2だけを起点にした公開カタログ。

- [ ] **Step 1: Run a full source refresh through the scheduled workflow**

Run: GitHub Actions `Daily catalog refresh` with `GAME_CHUNK=all`.

Expected: Yahoo requests use 1 query/second以上の間隔を維持し、全300件を置換する。失敗時はログで失敗理由を確認し、全リクエスト失敗なら古いデータを保持する安全策を維持する。

- [ ] **Step 2: Build and validate generated data**

Run: `npm.cmd run build:catalog && npm.cmd test && npm.cmd run build`

Expected: 全テスト・ビルドが成功し、Yahoo購入オファーが `shippingCode === 2` だけで構成される。

- [ ] **Step 3: Push, deploy, and verify public routes**

Run: `git push origin main && npx.cmd vercel@latest --prod --yes`

Verify: `https://chukogame.vercel.app/`, `/ranking`, and one game detail page show the updated catalog and no longer claim a condition that the collector does not enforce.
