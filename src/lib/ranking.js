import { playCost } from "../data/catalog.js";

export function buildRankingSlots(games, limit = 10) {
  const ranked = [...games]
    .filter((game) => playCost(game) !== null)
    .sort((left, right) => playCost(left) - playCost(right));
  return Array.from({ length: limit }, (_, index) => (
    ranked[index] ? { status: "ranked", game: ranked[index], rank: index + 1 } : { status: "collecting" }
  ));
}

export function buildVerifiedRanking(games, limit) {
  return [...games]
    .filter((game) => playCost(game) !== null)
    .sort((left, right) => playCost(left) - playCost(right))
    .slice(0, limit)
    .map((game, index) => ({ game, rank: index + 1 }));
}
