import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimitedFetch } from "../scripts/lib/rate-limited-fetch.mjs";

test("spaces Yahoo requests by the configured interval", async () => {
  const waits = [];
  let now = 0;
  const fetchImpl = async () => ({ ok: true, status: 200 });
  const rateLimitedFetch = createRateLimitedFetch(fetchImpl, {
    minIntervalMs: 2100,
    now: () => now,
    sleep: async (ms) => { waits.push(ms); now += ms; },
  });

  await rateLimitedFetch("https://example.com/one");
  await rateLimitedFetch("https://example.com/two");

  assert.deepEqual(waits, [2100]);
});

test("waits and retries a Yahoo 429 response", async () => {
  const waits = [];
  let calls = 0;
  const rateLimitedFetch = createRateLimitedFetch(async () => {
    calls += 1;
    return calls === 1
      ? { ok: false, status: 429, headers: new Headers({ "retry-after": "3" }) }
      : { ok: true, status: 200, headers: new Headers() };
  }, {
    minIntervalMs: 2100,
    now: () => 0,
    sleep: async (ms) => { waits.push(ms); },
  });

  const response = await rateLimitedFetch("https://example.com");

  assert.equal(response.ok, true);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [3000]);
});
