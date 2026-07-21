import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidJan, validateGameMaster, splitIntoChunks, selectMasterCandidates,
} from "../src/lib/game-master.js";

const game = (index, overrides = {}) => ({
  id: `game-${index}`,
  title: `ゲーム ${index}`,
  jan: `490000000${String(index).padStart(3, "0")}0`,
  genre: "未分類",
  releaseDate: "2024-01-01",
  aliases: [],
  verification: {
    source: "Rakuten Books Game Search API",
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

test("splits exactly 300 games into six stable chunks", () => {
  const chunks = splitIntoChunks(Array.from({ length: 300 }, (_, index) => ({ id: `g-${index}` })));
  assert.deepEqual(chunks.map((chunk) => chunk.length), [50, 50, 50, 50, 50, 50]);
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
