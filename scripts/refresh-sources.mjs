import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import rawGameMaster from "../src/data/game-master.json" with { type: "json" };
import { mergeChunkOffers, selectRefreshChunks, shouldWriteYahooRefresh } from "../src/lib/chunk-refresh.js";
import { getGameChunk } from "../src/lib/game-master.js";
import { summarizeSourceRefresh, summarizeZeroResultReasons } from "../src/lib/source-refresh-summary.js";
import { fetchYahooOffers, yahooConfigured } from "./adapters/yahoo-shopping.mjs";

const root = resolve(import.meta.dirname, "..");
const gameMaster = rawGameMaster.map((game) => ({ ...game, cover: "GM" }));
const chunkIndexes = selectRefreshChunks(process.env.GAME_CHUNK);
const targetGames = chunkIndexes.flatMap((chunkIndex) => getGameChunk(gameMaster, chunkIndex));
const sourcePath = resolve(root, "data/source-offers.json");
const previous = JSON.parse(await readFile(sourcePath, "utf8"));
const adapters = [
  { name: "Yahoo Shopping", source: "Yahoo! Shopping", enabled: yahooConfigured(), fetch: fetchYahooOffers },
];
const enabled = adapters.filter((adapter) => adapter.enabled);
for (const adapter of adapters.filter((adapter) => !adapter.enabled)) {
  console.warn(`[source] ${adapter.name}: disabled because required credentials are not configured.`);
}
if (!enabled.length) {
  console.log("No marketplace credentials configured. Keeping the last successful source data.");
  process.exit(0);
}

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const refreshed = [];
const attemptsBySource = new Map(enabled.map((adapter) => [adapter.source, 0]));
const failuresBySource = new Map(enabled.map((adapter) => [adapter.source, 0]));
const zeroResults = [];
let successfulRequests = 0;

for (const adapter of enabled) {
  for (const game of targetGames) {
    attemptsBySource.set(adapter.source, attemptsBySource.get(adapter.source) + 1);
    try {
      const result = { offers: await adapter.fetch(game), zeroResultReason: null };
      const { offers, zeroResultReason } = result;
      refreshed.push(...offers);
      if (zeroResultReason) {
        zeroResults.push({ source: adapter.source, reason: zeroResultReason, gameId: game.id });
      }
      successfulRequests += 1;
    } catch (error) {
      failuresBySource.set(adapter.source, failuresBySource.get(adapter.source) + 1);
      console.warn(`${adapter.name} ${game.id}: ${error.message}`);
    }
    await delay(1100);
  }
}

if (!shouldWriteYahooRefresh({ successfulRequests })) {
  console.warn("All marketplace requests failed. Keeping the last successful source data.");
  process.exitCode = 1;
  process.exit();
}

const offers = mergeChunkOffers({
  previous: previous.offers,
  refreshed,
  targetGames,
  replaceOffer: (offer) => (
    offer.kind === "purchase"
    && (offer.source === "Yahoo! Shopping" || offer.source === "Rakuten Ichiba")
  ),
});
await writeFile(sourcePath, `${JSON.stringify({ updatedAt: new Date().toISOString(), offers }, null, 2)}\n`, "utf8");
for (const summary of summarizeSourceRefresh({ adapters, attemptsBySource, failuresBySource, refreshed })) {
  console.log(`[source] ${summary.name}: requests=${summary.attempts}, failed=${summary.failures}, offers=${summary.offers}, titles=${summary.titles}`);
  if (summary.failures === summary.attempts) {
    console.warn(`::warning title=${summary.name} source refresh failed::All ${summary.attempts} requests failed; previous verified data was retained.`);
  } else if (!summary.offers) {
    console.warn(`::warning title=${summary.name} source returned no offers::${summary.attempts - summary.failures} requests succeeded but returned no matching offers.`);
  }
}
for (const summary of summarizeZeroResultReasons(zeroResults)) {
  console.log(`[source] ${summary.source}: zero-result reason=${summary.reason}, titles=${summary.titles}`);
}
console.log(`Refreshed chunks ${chunkIndexes.join(",")} (${targetGames.length} games) with ${refreshed.length} offers; total retained offers: ${offers.length}.`);
