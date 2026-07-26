import assert from "node:assert/strict";
import test from "node:test";

import { authorizeCollectorRequest, collectRakutenGame } from "../supabase/functions/chukogame-rakuten-refresh/collector.mjs";

const game = {
  id: "nsw-8-536485",
  jan: "4902370536485",
  title: "マリオカート8デラックス",
  genre: "レース",
  imageUrl: "https://example.test/cover.jpg",
};

test("rejects a missing collector secret", async () => {
  const authorized = await authorizeCollectorRequest(null, async () => false);
  assert.equal(authorized, false);
});

test("records zero search without loosening validation", async () => {
  const result = await collectRakutenGame(game, {
    applicationId: "app",
    accessKey: "access",
    fetch: async () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
    now: () => "2026-07-26T12:00:00.000Z",
  });

  assert.equal(result.status, "no-search-results");
  assert.deepEqual(result.offers, []);
});

test("sends the Rakuten access key using the documented query parameter", async () => {
  let requestUrl = "";
  await collectRakutenGame(game, {
    applicationId: "app",
    accessKey: "access",
    fetch: async (url) => {
      requestUrl = String(url);
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    },
  });

  assert.equal(new URL(requestUrl).searchParams.get("accessKey"), "access");
});

test("trims copied credential whitespace before calling Rakuten", async () => {
  let requestUrl = "";
  await collectRakutenGame(game, {
    applicationId: " app ",
    accessKey: " access ",
    fetch: async (url) => {
      requestUrl = String(url);
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    },
  });

  const params = new URL(requestUrl).searchParams;
  assert.equal(params.get("applicationId"), "app");
  assert.equal(params.get("accessKey"), "access");
});
