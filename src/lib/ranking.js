import { playCost } from "../data/catalog.js";

export function buildRankingSlots(games, limit = 10) {
  const ranked = [...games]
    .filter((game) => playCost(game) !== null)
    .sort((left, right) => playCost(left) - playCost(right));
  return Array.from({ length: limit }, (_, index) => (
    ranked[index] ? { status: "ranked", game: ranked[index], rank: index + 1 } : { status: "collecting" }
  ));
}
