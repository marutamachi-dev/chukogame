import test from "node:test";
import assert from "node:assert/strict";
import { planCatalogReplacement, scoreDemand } from "../src/lib/demand-catalog.js";

test("scores misses twice as strongly as a search", () => {
  assert.equal(scoreDemand({ searchCount: 3, missCount: 2, viewCount: 5 }), 12);
});

test("protects titles listed fewer than seven days and caps replacements at ten", () => {
  const listed = Array.from({ length: 12 }, (_, index) => ({
    jan: `4902370550${String(index).padStart(3, "0")}`,
    demandScore: index,
    listedFrom: index === 0 ? "2026-07-20" : "2026-07-01",
  }));
  const candidates = Array.from({ length: 12 }, (_, index) => ({
    jan: `4988602173${String(index).padStart(3, "0")}`,
    demandScore: 100 - index,
  }));
  const result = planCatalogReplacement({ listed, candidates, today: "2026-07-23" });
  assert.equal(result.removals.length, 10);
  assert.equal(result.additions.length, 10);
  assert.ok(result.removals.every((game) => game.jan !== listed[0].jan));
  assert.deepEqual(result.additions.map((game) => game.jan), candidates.slice(0, 10).map((game) => game.jan));
});

test("does not replace a title unless the candidate demand is strictly greater", () => {
  const result = planCatalogReplacement({
    listed: [{ jan: "4902370550555", demandScore: 5, listedFrom: "2026-07-01" }],
    candidates: [{ jan: "4988602173400", demandScore: 5 }],
    today: "2026-07-23",
  });
  assert.deepEqual(result, { removals: [], additions: [] });
});
