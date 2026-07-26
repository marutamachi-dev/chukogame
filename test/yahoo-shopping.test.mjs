import test from "node:test";
import assert from "node:assert/strict";
import { fetchYahooOffers } from "../scripts/adapters/yahoo-shopping.mjs";

const game = { id: "sample", jan: "4900000000000", title: "Sample Switch Game", genre: "RPG", cover: "SP" };

const validHit = (target = game) => ({
  janCode: target.jan,
  name: `${target.title} Nintendo Switch 中古`,
  condition: "used",
  inStock: true,
  price: 2150,
  url: "https://store.example.com/game",
  shipping: { code: 1, name: "送料無料" },
});

test("retries with the formal title after JAN has no verified offer", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    return { ok: true, json: async () => ({ hits: requests.length === 2 ? [validHit()] : [] }) };
  };

  const offers = await fetchYahooOffers(game, { YAHOO_SHOPPING_APP_ID: "test" }, fetchImpl);

  assert.equal(offers.length, 1);
  assert.match(requests[0], /jan_code=4900000000000/);
  assert.equal(new URL(requests[1]).searchParams.get("query"), game.title);
});

test("uses an alias after JAN and formal title have no verified offer", async () => {
  const aliasGame = { ...game, aliases: ["Sample Alias"] };
  const requests = [];
  const offers = await fetchYahooOffers(aliasGame, { YAHOO_SHOPPING_APP_ID: "test" }, async (url) => {
    requests.push(String(url));
    return {
      ok: true,
      json: async () => ({
        hits: requests.length === 3 ? [{ ...validHit(aliasGame), name: "Sample Alias Nintendo Switch 中古" }] : [],
      }),
    };
  });

  assert.equal(offers.length, 1);
  assert.equal(new URL(requests[2]).searchParams.get("query"), "Sample Alias");
});

test("excludes a different title even when the API reports the same JAN", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      hits: [{
        janCode: game.jan,
        name: "Different Switch Game",
        condition: "used",
        inStock: true,
        price: 2150,
        url: "https://store.example.com/different-game",
        shipping: { code: 1, name: "送料無料" },
      }],
    }),
  });

  assert.deepEqual(await fetchYahooOffers(game, { YAHOO_SHOPPING_APP_ID: "test" }, fetchImpl), []);
});

test("never accepts a title-search result with another JAN", async () => {
  const offers = await fetchYahooOffers(game, { YAHOO_SHOPPING_APP_ID: "test" }, async () => ({
    ok: true,
    json: async () => ({ hits: [{ ...validHit(), janCode: "4900000000001" }] }),
  }));

  assert.deepEqual(offers, []);
});

test("excludes a Switch 2 result with the expected JAN", async () => {
  const offers = await fetchYahooOffers(game, { YAHOO_SHOPPING_APP_ID: "test" }, async () => ({
    ok: true,
    json: async () => ({ hits: [{ ...validHit(), name: "Sample Switch 2 Game 中古" }] }),
  }));

  assert.deepEqual(offers, []);
});
