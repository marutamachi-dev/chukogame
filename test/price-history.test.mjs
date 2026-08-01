import test from "node:test";
import assert from "node:assert/strict";
import { buildTrendPeriods, formatTrendDate, groupHistorySnapshots, medianPurchasePrice, observedDateInJst, trendState } from "../src/lib/price-history.js";

test("uses the middle valid seller price as a market trend baseline", () => {
  assert.equal(medianPurchasePrice([{ price: 4980 }, { price: 5180 }, { price: 5400 }]), 5180);
  assert.equal(medianPurchasePrice([{ price: 4980 }, { price: 5180 }, { price: 5400 }, { price: 8900 }]), 5290);
});

test("does not create a trend baseline from fewer than three sellers", () => {
  assert.equal(medianPurchasePrice([{ price: 4980 }, { price: 5180 }]), null);
});

test("shows collecting until the required price history exists", () => {
  assert.deepEqual(trendState([], 30), { status: "collecting", change: null });
  assert.deepEqual(trendState([{ observedOn: "2026-06-26", medianPurchasePrice: 5000 }, { observedOn: "2026-07-26", medianPurchasePrice: 4680 }], 30), {
    status: "ready", change: -320, baselineDate: "2026-06-26", latestDate: "2026-07-26",
  });
});

test("builds 7, 14, and 28 day results from verified history", () => {
  const snapshots = [
    { observedOn: "2026-07-01", medianPurchasePrice: 5000 },
    { observedOn: "2026-07-08", medianPurchasePrice: 4900 },
    { observedOn: "2026-07-15", medianPurchasePrice: 4700 },
    { observedOn: "2026-07-22", medianPurchasePrice: 4700 },
    { observedOn: "2026-07-29", medianPurchasePrice: 4800 },
  ];

  assert.deepEqual(buildTrendPeriods(snapshots), [
    { label: "直近7日（比較日 7/22 → 7/29）", days: 7, status: "ready", change: 100, baselineDate: "2026-07-22", latestDate: "2026-07-29" },
    { label: "直近14日（比較日 7/15 → 7/29）", days: 14, status: "ready", change: 100, baselineDate: "2026-07-15", latestDate: "2026-07-29" },
    { label: "直近28日（比較日 7/1 → 7/29）", days: 28, status: "ready", change: -200, baselineDate: "2026-07-01", latestDate: "2026-07-29" },
  ]);
});

test("groups only active verified history by JAN for the browser payload", () => {
  assert.deepEqual(groupHistorySnapshots([
    { game_jan: "490", observed_on: "2026-07-29", median_purchase_price: "4800.00" },
    { game_jan: "490", observed_on: "2026-07-22", median_purchase_price: "4700.00" },
    { game_jan: "999", observed_on: "2026-07-29", median_purchase_price: "1000.00" },
  ], new Set(["490"])), {
    "490": [
      { observedOn: "2026-07-22", medianPurchasePrice: 4700 },
      { observedOn: "2026-07-29", medianPurchasePrice: 4800 },
    ],
  });
});

test("records the daily snapshot using the Japan calendar date", () => {
  assert.equal(observedDateInJst(new Date("2026-08-01T17:00:00Z")), "2026-08-02");
  assert.equal(observedDateInJst(new Date("2026-08-01T14:59:59Z")), "2026-08-01");
});

test("formats comparison dates without an unnecessary year", () => {
  assert.equal(formatTrendDate("2026-07-26"), "7/26");
});
