import test from "node:test";
import assert from "node:assert/strict";
import { fetchYahooOffers } from "../scripts/adapters/yahoo-shopping.mjs";

const game = { id: "sample", jan: "4900000000000", title: "Sample Switch Game", genre: "RPG", cover: "SP" };

test("uses only JAN search results and does not fall back to title search", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    return { ok: true, json: async () => ({ hits: [] }) };
  };

  const offers = await fetchYahooOffers(game, { YAHOO_SHOPPING_APP_ID: "test" }, fetchImpl);

  assert.deepEqual(offers, []);
  assert.equal(requests.length, 1);
  assert.match(requests[0], /jan_code=4900000000000/);
  assert.doesNotMatch(requests[0], /query=/);
});
