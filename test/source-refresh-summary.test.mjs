import assert from "node:assert/strict";
import test from "node:test";
import { summarizeSourceRefresh } from "../src/lib/source-refresh-summary.js";

test("reports each enabled marketplace separately, including a zero-result source", () => {
  const summary = summarizeSourceRefresh({
    adapters: [
      { name: "Rakuten", source: "Rakuten Ichiba", enabled: true },
      { name: "Yahoo Shopping", source: "Yahoo! Shopping", enabled: true },
      { name: "Surugaya", source: "駿河屋", enabled: true },
    ],
    attemptsBySource: new Map([["Rakuten Ichiba", 300], ["Yahoo! Shopping", 300], ["駿河屋", 300]]),
    failuresBySource: new Map([["Rakuten Ichiba", 300], ["Yahoo! Shopping", 0], ["駿河屋", 2]]),
    refreshed: [
      { source: "Yahoo! Shopping", slug: "game-a" },
      { source: "Yahoo! Shopping", slug: "game-a" },
      { source: "駿河屋", jan: "4900000000001" },
    ],
  });

  assert.deepEqual(summary, [
    { name: "Rakuten", source: "Rakuten Ichiba", attempts: 300, failures: 300, offers: 0, titles: 0 },
    { name: "Yahoo Shopping", source: "Yahoo! Shopping", attempts: 300, failures: 0, offers: 2, titles: 1 },
    { name: "Surugaya", source: "駿河屋", attempts: 300, failures: 2, offers: 1, titles: 1 },
  ]);
});
