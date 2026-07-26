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

export function selectRefreshChunks(value, date = new Date()) {
  if (String(value).trim().toLowerCase() === "all") {
    return Array.from({ length: CHUNK_COUNT }, (_, index) => index);
  }
  return [selectRefreshChunk(value, date)];
}

export function shouldWriteYahooRefresh({ successfulRequests }) {
  return successfulRequests > 0;
}

export function mergeChunkOffers({ previous, refreshed, targetGames, replaceOffer, enabledSources = [] }) {
  const targetIds = new Set(targetGames.map((game) => game.id));
  const targetJans = new Set(targetGames.map((game) => String(game.jan)));
  const enabled = new Set(enabledSources);
  const isTarget = (offer) => targetIds.has(offer.slug) || targetJans.has(String(offer.jan));
  const shouldReplace = replaceOffer || ((offer) => enabled.has(offer.source));
  const retained = previous.filter((offer) => !isTarget(offer) || !shouldReplace(offer));
  return [...retained, ...refreshed];
}
