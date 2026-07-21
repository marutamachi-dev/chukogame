import test from "node:test";
import assert from "node:assert/strict";
import { buildRankingSlots } from "../src/lib/ranking.js";

const game = (id, cost) => ({ id, purchase: cost == null ? [] : [{ price: cost + 100 }], sale: cost == null ? [] : [{ price: 100 }] });

test("always returns ten ranking slots", () => {
  const slots = buildRankingSlots([game("slow", 500), game("fast", 100)], 10);
  assert.equal(slots.length, 10);
  assert.deepEqual(slots.slice(0, 2).map((slot) => slot.game.id), ["fast", "slow"]);
  assert.deepEqual(slots.slice(2).map((slot) => slot.status), Array(8).fill("collecting"));
});

test("does not assign a rank or price to a collecting slot", () => {
  const slot = buildRankingSlots([], 1)[0];
  assert.deepEqual(slot, { status: "collecting" });
});
