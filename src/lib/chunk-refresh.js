import { CHUNK_COUNT } from "./game-master.js";

export function selectRefreshChunk(value, date = new Date()) {
  if (value !== undefined && value !== "") {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= CHUNK_COUNT) {
      throw new RangeError(`GAME_CHUNK must be an integer from 0 to ${CHUNK_COUNT - 1}`);
    }
    return index;
  }
  return Math.floor(date.getTime() / 86_400_000) % CHUNK_COUNT;
}

export function mergeChunkOffers({ previous, refreshed, failedKeys, targetGames, enabledSources }) {
  const targetIds = new Set(targetGames.map((game) => game.id));
  const targetJans = new Set(targetGames.map((game) => String(game.jan)));
  const enabled = new Set(enabledSources);
  const isTarget = (offer) => targetIds.has(offer.slug) || targetJans.has(String(offer.jan));
  const retained = previous.filter((offer) => !enabled.has(offer.source) || !isTarget(offer));
  const fallback = previous.filter((offer) => (
    enabled.has(offer.source)
    && isTarget(offer)
    && (failedKeys.has(`${offer.source}:${offer.slug}`) || failedKeys.has(`${offer.source}:${offer.jan}`))
  ));
  return [...retained, ...refreshed, ...fallback];
}
