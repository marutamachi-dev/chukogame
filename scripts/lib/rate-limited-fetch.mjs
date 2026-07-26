const defaultRetryAfterMs = 60_000;

function retryAfterMs(response) {
  const value = response.headers?.get?.("retry-after");
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : defaultRetryAfterMs;
}

export function createRateLimitedFetch(fetchImpl = fetch, {
  minIntervalMs = 2100,
  maxRetries = 2,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let lastRequestAt = null;

  const waitForSlot = async () => {
    if (lastRequestAt !== null) {
      const remaining = minIntervalMs - (now() - lastRequestAt);
      if (remaining > 0) await sleep(remaining);
    }
    lastRequestAt = now();
  };

  return async (...args) => {
    for (let attempt = 0; ; attempt += 1) {
      await waitForSlot();
      const response = await fetchImpl(...args);
      if (response.status !== 429 || attempt >= maxRetries) return response;

      await sleep(retryAfterMs(response));
      lastRequestAt = now() - minIntervalMs;
    }
  };
}
