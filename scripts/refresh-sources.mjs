import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generatedGames } from "../src/data/generated-catalog.js";
import { fetchRakutenOffers, rakutenConfigured } from "./adapters/rakuten.mjs";
import { fetchYahooOffers, yahooConfigured } from "./adapters/yahoo-shopping.mjs";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "data/source-offers.json");
const previous = JSON.parse(await readFile(sourcePath, "utf8"));
const adapters = [
  { name: "Rakuten", enabled: rakutenConfigured(), fetch: fetchRakutenOffers },
  { name: "Yahoo Shopping", enabled: yahooConfigured(), fetch: fetchYahooOffers },
];
const enabled = adapters.filter((adapter) => adapter.enabled);
if (!enabled.length) {
  console.log("No marketplace credentials configured. Keeping the last successful source data.");
  process.exit(0);
}

const offers = previous.offers.filter((offer) => !["Rakuten Ichiba", "Yahoo! Shopping"].includes(offer.source));
const failures = [];
for (const game of generatedGames) {
  const settled = await Promise.allSettled(enabled.map((adapter) => adapter.fetch(game)));
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") offers.push(...result.value);
    else failures.push(`${enabled[index].name}: ${result.reason.message}`);
  });
}
if (failures.length) console.warn(`Partial refresh failures:\n${failures.join("\n")}`);
if (!offers.length) throw new Error("Refresh produced no usable offers; previous data is retained.");
await writeFile(sourcePath, `${JSON.stringify({ updatedAt: new Date().toISOString(), offers }, null, 2)}\n`, "utf8");
console.log(`Refreshed ${offers.length} source offers from ${enabled.map((adapter) => adapter.name).join(", ")}.`);