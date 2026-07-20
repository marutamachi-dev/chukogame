import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { games as gameMaster } from "../src/data/games.js";
import { normalizeTitle } from "../src/lib/price-rules.js";
import { fetchRakutenOffers, rakutenConfigured } from "./adapters/rakuten.mjs";
import { fetchYahooOffers, yahooConfigured } from "./adapters/yahoo-shopping.mjs";
import { fetchSurugayaOffers } from "./adapters/surugaya.mjs";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "data/source-offers.json");
const previous = JSON.parse(await readFile(sourcePath, "utf8"));
const adapters = [
  { name: "Surugaya", source: "駿河屋", enabled: true, fetch: fetchSurugayaOffers },
  { name: "Rakuten", source: "Rakuten Ichiba", enabled: rakutenConfigured(), fetch: fetchRakutenOffers },
  { name: "Yahoo Shopping", source: "Yahoo! Shopping", enabled: yahooConfigured(), fetch: fetchYahooOffers },
];
const enabled = adapters.filter((adapter) => adapter.enabled);
if (!enabled.length) {
  console.log("No marketplace credentials configured. Keeping the last successful source data.");
  process.exit(0);
}

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const gameById = new Map(gameMaster.map((game) => [game.id, game]));
const hasMatchingMasterTitle = (offer) => {
  if (offer.source !== "Yahoo! Shopping") return true;
  const game = gameById.get(offer.slug);
  return Boolean(game && normalizeTitle(offer.title || "").includes(normalizeTitle(game.title)));
};
const retained = previous.offers.filter((offer) => (
  !adapters.some((adapter) => offer.source === adapter.source) && hasMatchingMasterTitle(offer)
));
const refreshed = [];
const failedKeys = new Set();
let successfulRequests = 0;

for (const adapter of enabled) {
  for (const game of gameMaster) {
    try {
      const offers = await adapter.fetch(game);
      refreshed.push(...offers);
      successfulRequests += 1;
    } catch (error) {
      failedKeys.add(`${adapter.source}:${game.id}`);
      console.warn(`${adapter.name} ${game.id}: ${error.message}`);
    }
    await delay(1100);
  }
}

if (!successfulRequests) {
  console.warn("All marketplace requests failed. Keeping the last successful source data.");
  process.exit(0);
}

const fallback = previous.offers.filter((offer) => (
  failedKeys.has(`${offer.source}:${offer.slug}`) && hasMatchingMasterTitle(offer)
));
const offers = [...retained, ...refreshed, ...fallback];
await writeFile(sourcePath, `${JSON.stringify({ updatedAt: new Date().toISOString(), offers }, null, 2)}\n`, "utf8");
console.log(`Refreshed ${refreshed.length} offers; retained ${fallback.length} offers after failed requests.`);
