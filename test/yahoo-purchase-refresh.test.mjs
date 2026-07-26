import test from "node:test";
import assert from "node:assert/strict";
import { mergeChunkOffers, shouldWriteYahooRefresh } from "../src/lib/chunk-refresh.js";

const game = { id: "target", jan: "4900000000000" };
const oldYahoo = { source: "Yahoo! Shopping", kind: "purchase", slug: game.id, jan: game.jan, price: 100 };
const oldRakuten = { source: "Rakuten Ichiba", kind: "purchase", slug: game.id, jan: game.jan, price: 120 };
const sale = { source: "駿河屋", kind: "sale", slug: game.id, jan: game.jan, price: 80 };

const replaceOffer = (offer) => offer.kind === "purchase" && ["Yahoo! Shopping", "Rakuten Ichiba"].includes(offer.source);

test("removes old Yahoo and Rakuten purchase offers when Yahoo finds no current price", () => {
  const result = mergeChunkOffers({ previous: [oldYahoo, oldRakuten, sale], refreshed: [], targetGames: [game], replaceOffer });
  assert.deepEqual(result, [sale]);
});

test("writes only when at least one Yahoo request succeeded", () => {
  assert.equal(shouldWriteYahooRefresh({ successfulRequests: 0 }), false);
  assert.equal(shouldWriteYahooRefresh({ successfulRequests: 1 }), true);
});
