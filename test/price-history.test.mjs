import test from "node:test";
import assert from "node:assert/strict";
import { medianPurchasePrice, trendState } from "../src/lib/price-history.js";

test("uses the middle valid seller price as a market trend baseline", () => {
  assert.equal(medianPurchasePrice([{ price: 4980 }, { price: 5180 }, { price: 5400 }]), 5180);
  assert.equal(medianPurchasePrice([{ price: 4980 }, { price: 5180 }, { price: 5400 }, { price: 8900 }]), 5290);
});

test("does not create a trend baseline from fewer than three sellers", () => {
  assert.equal(medianPurchasePrice([{ price: 4980 }, { price: 5180 }]), null);
});

test("shows collecting until the required price history exists", () => {
  assert.deepEqual(trendState([], 30), { status: "collecting", change: null });
  assert.deepEqual(trendState([{ observedOn: "2026-06-26", medianPurchasePrice: 5000 }, { observedOn: "2026-07-26", medianPurchasePrice: 4680 }], 30), { status: "ready", change: -320 });
});