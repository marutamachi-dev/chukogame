import test from "node:test";
import assert from "node:assert/strict";
import { buildDemandEvent, normalizeDemandQuery, recordDemandEvent } from "../src/lib/demand-events.js";

test("normalizes whitespace and rejects an empty query", () => {
  assert.equal(normalizeDemandQuery("  マリオ   カート  "), "マリオ カート");
  assert.equal(normalizeDemandQuery("   "), "");
});

test("builds only valid search and view event rows", () => {
  assert.deepEqual(buildDemandEvent({ eventType: "search", query: " マリオ " }), { event_type: "search", query: "マリオ" });
  assert.deepEqual(buildDemandEvent({ eventType: "view", gameJan: "4902370550555" }), { event_type: "view", game_jan: "4902370550555" });
  assert.equal(buildDemandEvent({ eventType: "search_miss", query: " " }), null);
  assert.equal(buildDemandEvent({ eventType: "view", gameJan: "not-a-jan" }), null);
});

test("records a valid row but ignores invalid telemetry", async () => {
  const rows = [];
  const insert = async (row) => rows.push(row);
  await recordDemandEvent({ eventType: "search_miss", query: "  テスト  " }, { insert });
  await recordDemandEvent({ eventType: "view", gameJan: "bad" }, { insert });
  assert.deepEqual(rows, [{ event_type: "search_miss", query: "テスト" }]);
});
