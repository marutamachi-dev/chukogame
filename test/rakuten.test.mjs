import test from "node:test";
import assert from "node:assert/strict";
import {
  RakutenAuthenticationError,
  fetchRakutenOfferResult,
} from "../scripts/adapters/rakuten.mjs";

const game = { id: "sample", jan: "4900000000000", title: "Sample Switch Game", genre: "RPG", cover: "SP" };
const credentials = { RAKUTEN_APPLICATION_ID: "app", RAKUTEN_ACCESS_KEY: "key" };

test("fails clearly when Rakuten rejects the API credentials", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "Unauthorized" }),
  });

  await assert.rejects(
    fetchRakutenOfferResult(game, credentials, fetchImpl),
    RakutenAuthenticationError,
  );
});

test("fails clearly when Rakuten returns an invalid credential code in a bad request", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ errorCode: "invalid_application_id" }),
  });

  await assert.rejects(
    fetchRakutenOfferResult(game, credentials, fetchImpl),
    RakutenAuthenticationError,
  );
});

test("reports a zero-result reason without relaxing purchase conditions", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ items: [] }) });

  const result = await fetchRakutenOfferResult(game, credentials, fetchImpl);

  assert.deepEqual(result.offers, []);
  assert.equal(result.zeroResultReason, "no-search-results");
});

test("sends the access key in the documented request header", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ items: [] }) };
  };

  await fetchRakutenOfferResult(game, credentials, fetchImpl);

  assert.equal(new URL(request.url).searchParams.has("accessKey"), false);
  assert.equal(request.options.headers.accessKey, credentials.RAKUTEN_ACCESS_KEY);
});
