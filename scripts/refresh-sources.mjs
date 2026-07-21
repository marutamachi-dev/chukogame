import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import rawGameMaster from "../src/data/game-master.json" with { type: "json" };
import { mergeChunkOffers, selectRefreshChunk } from "../src/lib/chunk-refresh.js";
import { getGameChunk } from "../src/lib/game-master.js";
import { normalizeTitle } from "../src/lib/price-rules.js";
import { fetchRakutenOffers, rakutenConfigured } from "./adapters/rakuten.mjs";
import { fetchYahooOffers, yahooConfigured } from "./adapters/yahoo-shopping.mjs";
import { fetchSurugayaOffers } from "./adapters/surugaya.mjs";

const root = resolve(import.meta.dirname, "..");
const gameMaster = rawGameMaster.map((game) => ({ ...game, cover: "GM" }));
const chunkIndex = selectRefreshChunk(process.env.GAME_CHUNK);
const targetGames = getGameChunk(gameMaster, chunkIndex);
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
const gameByJan = new Map(gameMaster.map((game) => [String(game.jan), game]));
const hasMatchingMasterTitle = (offer) => {
  if (offer.source !== "Yahoo! Shopping") return true;
  const game = gameById.get(offer.slug) || gameByJan.get(String(offer.jan));
  if (!game) return false;
  const offerTitle = normalizeTitle(offer.title || "");
  return [game.title, ...(game.aliases || [])].some((title) => {
    const normalized = normalizeTitle(title);
    return offerTitle.includes(normalized) || normalized.includes(offerTitle);
  });
};
const refreshed = [];
const failedKeys = new Set();
let successfulRequests = 0;

for (const adapter of enabled) {
  for (const game of targetGames) {
    try {
      const offers = await adapter.fetch(game);
      refreshed.push(...offers);
      successfulRequests += 1;
    } catch (error) {
      failedKeys.add(`${adapter.source}:${game.id}`);
      failedKeys.add(`${adapter.source}:${game.jan}`);
      console.warn(`${adapter.name} ${game.id}: ${error.message}`);
    }
    await delay(1100);
  }
}

if (!successfulRequests) {
  console.warn("All marketplace requests failed. Keeping the last successful source data.");
  process.exit(0);
}

const offers = mergeChunkOffers({
  previous: previous.offers.filter(hasMatchingMasterTitle),
  refreshed,
  failedKeys,
  targetGames,
  enabledSources: enabled.map((adapter) => adapter.source),
});
await writeFile(sourcePath, `${JSON.stringify({ updatedAt: new Date().toISOString(), offers }, null, 2)}\n`, "utf8");
console.log(`Refreshed chunk ${chunkIndex} (${targetGames.length} games) with ${refreshed.length} offers; total retained offers: ${offers.length}.`);
