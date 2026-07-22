import test from "node:test";
import assert from "node:assert/strict";
import { mergeChunkOffers, selectRefreshChunk, selectRefreshChunks } from "../src/lib/chunk-refresh.js";

test("selects an explicit chunk and rejects an invalid chunk", () => {
  assert.equal(selectRefreshChunk("4"), 4);
  assert.throws(() => selectRefreshChunk("20"), /GAME_CHUNK/);
});

test("rotates the default chunk deterministically by UTC day", () => {
  const day = new Date("2026-07-22T00:00:00.000Z");
  const next = new Date("2026-07-23T00:00:00.000Z");
  assert.equal(selectRefreshChunk(undefined, next), (selectRefreshChunk(undefined, day) + 1) % 20);
});

test("selects every chunk for a full backfill", () => {
  assert.deepEqual(selectRefreshChunks("all"), Array.from({ length: 20 }, (_, index) => index));
});

test("updates only the target chunk and retains failed target data", () => {
  const previous = [
    { source: "Yahoo", slug: "target", jan: "1", price: 100 },
    { source: "Yahoo", slug: "failed", jan: "2", price: 200 },
    { source: "Yahoo", slug: "other", jan: "3", price: 300 },
    { source: "Manual", slug: "target", jan: "1", price: 400 },
  ];
  const refreshed = [{ source: "Yahoo", slug: "target", jan: "1", price: 110 }];
  const offers = mergeChunkOffers({
    previous, refreshed, failedKeys: new Set(["Yahoo:failed"]),
    targetGames: [{ id: "target", jan: "1" }, { id: "failed", jan: "2" }],
    enabledSources: ["Yahoo"],
  });
  assert.deepEqual(offers.map((offer) => offer.price).sort((a, b) => a - b), [110, 200, 300, 400]);
});
