// One-time helper: transforms visual fixtures into source-offer records.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { games } from "../src/data/games.js";

const offers = games.flatMap((game) => [
  ...game.purchase.map((offer) => ({
    slug: game.id, jan: game.jan, title: game.title, genre: game.genre, cover: game.cover,
    searches: game.searches, platform: "Nintendo Switch", format: "package", edition: "standard",
    condition: "used-standard", inStock: true, kind: "purchase", source: offer.name,
    priceWithShipping: offer.price, url: offer.url,
  })),
  ...game.sale.map((offer) => ({
    slug: game.id, jan: game.jan, title: game.title, genre: game.genre, cover: game.cover,
    searches: game.searches, platform: "Nintendo Switch", format: "package", edition: "standard",
    condition: "used-standard", inStock: true, kind: "sale", source: offer.name,
    price: offer.price, url: offer.url,
  })),
]);
const payload = { updatedAt: "2026-07-19T06:00:00+09:00", offers };
await writeFile(resolve(import.meta.dirname, "../data/source-offers.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Seeded ${offers.length} source offers.`);
