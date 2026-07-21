import test from "node:test";
import assert from "node:assert/strict";
import {
  CHUNK_COUNT, GAME_COUNT, MASTER_QUERIES, MASTER_SORTS, cleanCatalogTitle, hasExcludedProductName, isValidJan, validateGameMaster, splitIntoChunks, selectMasterCandidates,
  requestWithRateLimit,
} from "../src/lib/game-master.js";

test("removes retailer and platform boilerplate from catalog titles", () => {
  assert.equal(cleanCatalogTitle("【新品】NSW マリオカート8デラックス"), "マリオカート8デラックス");
  assert.equal(cleanCatalogTitle("任天堂 (Switch)ピクミン3 デラックス 返品種別B"), "ピクミン3 デラックス");
  assert.equal(cleanCatalogTitle("Switch 星のカービィ ディスカバリー"), "星のカービィ ディスカバリー");
  assert.equal(cleanCatalogTitle("在庫あり[メール便OK]【新品】【NS】塊魂アンコール[在庫品]"), "塊魂アンコール");
  assert.equal(cleanCatalogTitle("ゼルダの伝説 ティアーズ オブ ザ キングダム Switch用ソフト(パッケージ版)"), "ゼルダの伝説 ティアーズ オブ ザ キングダム");
});

test("excludes bundles, DLC-included editions, and accessories", () => {
  assert.equal(hasExcludedProductName("マリオカート8 デラックス+コース追加パス"), true);
  assert.equal(hasExcludedProductName("ポケットモンスター バイオレット+ゼロの秘宝"), true);
  assert.equal(hasExcludedProductName("Pokemon GO Plus+"), true);
  assert.equal(hasExcludedProductName("\u30cb\u30f3\u30c6\u30f3\u30c9\u30fc\u30b9\u30a4\u30c3\u30c72\u30bd\u30d5\u30c8"), true);
});

const game = (index, overrides = {}) => ({
  id: `game-${index}`,
  title: `ゲーム ${index}`,
  jan: `490000000${String(index).padStart(3, "0")}0`,
  genre: "未分類",
  releaseDate: "2024-01-01",
  aliases: [],
  verification: {
    source: "Yahoo! Shopping package category API",
    sourceUrl: `https://books.rakuten.co.jp/rb/${index}/`,
    checkedAt: "2026-07-22",
  },
  chunk: Math.floor(index / 50),
  ...overrides,
});

test("validates JAN-13 check digits", () => {
  assert.equal(isValidJan("4902370536485"), true);
  assert.equal(isValidJan("4902370536486"), false);
  assert.equal(isValidJan("123"), false);
});

test("uses independent official sort orders to widen the candidate pool", () => {
  assert.deepEqual(MASTER_SORTS, ["-review_count", "-score", "+price", "-price"]);
  assert.deepEqual(MASTER_QUERIES, ["", "ゲーム", "ソフト"]);
});

test("splits exactly 1000 games into twenty stable chunks", () => {
  const chunks = splitIntoChunks(Array.from({ length: 1000 }, (_, index) => ({ id: `g-${index}` })));
  assert.equal(GAME_COUNT, 1000);
  assert.equal(CHUNK_COUNT, 20);
  assert.deepEqual(chunks.map((chunk) => chunk.length), Array(20).fill(50));
});

test("rejects duplicate identifiers, invalid records, and excluded editions", () => {
  const records = [
    game(0, { jan: "4902370536485" }),
    game(1, { id: "game-0", jan: "4902370550337" }),
    game(2, { jan: "4902370550337" }),
    game(3, { title: "サンプル 限定版", jan: "4902370545319" }),
  ];
  const errors = validateGameMaster(records, { expectedCount: 4, expectedChunkSize: null });
  assert.ok(errors.some((error) => error.includes("duplicate id")));
  assert.ok(errors.some((error) => error.includes("duplicate JAN")));
  assert.ok(errors.some((error) => error.includes("excluded product")));
});

test("accepts a complete verified record", () => {
  const errors = validateGameMaster([game(0, { jan: "4902370536485", chunk: 0 })], {
    expectedCount: 1,
    expectedChunkSize: null,
  });
  assert.deepEqual(errors, []);
});

test("selects popular, recent, then coverage candidates without duplicate JANs", () => {
  const candidate = (jan, title) => ({ jan, title });
  const selected = selectMasterCandidates({
    popular: [candidate("1", "A"), candidate("2", "B"), candidate("3", "C")],
    recent: [candidate("2", "B"), candidate("4", "D")],
    coverage: [candidate("5", "E"), candidate("6", "F")],
  }, { popularCount: 2, recentCount: 1, totalCount: 5 });

  assert.deepEqual(selected.map((item) => item.jan), ["1", "2", "4", "5", "6"]);
  assert.deepEqual(selected.map((item) => item.selectionGroup), ["popular", "popular", "recent", "coverage", "coverage"]);
});

test("waits and retries once after a 429 response", async () => {
  const statuses = [429, 200];
  const waits = [];
  const response = await requestWithRateLimit(
    async () => ({ ok: statuses[0] === 200, status: statuses.shift() }),
    async (milliseconds) => waits.push(milliseconds),
    { retryDelayMs: 65_000 },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(waits, [65_000]);
});
