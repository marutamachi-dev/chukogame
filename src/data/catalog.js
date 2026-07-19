import { catalogUpdatedAt, generatedGames } from "./generated-catalog.js";

export const games = generatedGames;
export const updatedAt = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  timeZone: "Asia/Tokyo",
}).format(new Date(catalogUpdatedAt));

export const yen = (value) => value == null ? "-" : `${value.toLocaleString("ja-JP")}円`;
export const cheapestBuy = (game) => game?.purchase?.length ? Math.min(...game.purchase.map((item) => item.price)) : null;
export const highestSale = (game) => game.sale?.length ? Math.max(...game.sale.map((item) => item.price)) : null;
export const playCost = (game) => {
  const purchase = cheapestBuy(game);
  const sale = highestSale(game);
  return purchase == null || sale == null ? null : purchase - sale;
};
