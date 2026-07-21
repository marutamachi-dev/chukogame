const excludedWords = [
  "\u30b8\u30e3\u30f3\u30af", "\u7bb1\u306a\u3057", "\u7279\u5178", "\u9650\u5b9a\u7248",
  "\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9", "\u6d77\u5916\u7248", "\u672c\u4f53", "\u5468\u8fba\u6a5f\u5668",
];
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeTitle(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\u30fb:\uff1a!\uff01?\uff1f'"\u300c\u300d]/g, "");
}

function isFresh(offer, now) {
  const observedAt = Date.parse(offer.observedAt);
  return Number.isFinite(observedAt) && observedAt <= now.getTime() && now.getTime() - observedAt <= MAX_AGE_MS;
}

function isDirectListing(offer) {
  if (offer.verification !== "direct-listing" || !offer.directUrl) return false;
  try {
    const url = new URL(offer.directUrl);
    return url.pathname !== "/" && !url.pathname.includes("/search");
  } catch {
    return false;
  }
}

export function isEligibleOffer(offer, now = new Date()) {
  if (offer.platform !== "Nintendo Switch" || offer.format !== "package") return false;
  if (offer.condition !== "used-standard" || offer.inStock !== true) return false;
  if (!isDirectListing(offer) || !isFresh(offer, now)) return false;
  if (!Number.isFinite(offer.kind === "purchase" ? offer.priceWithShipping : offer.price)) return false;
  return !excludedWords.some((word) => offer.title.includes(word));
}

export function calculatePlayCost(purchaseOffers, saleOffers) {
  if (!purchaseOffers.length || !saleOffers.length) return null;
  return Math.min(...purchaseOffers.map((offer) => offer.priceWithShipping)) - Math.max(...saleOffers.map((offer) => offer.price));
}

function groupKey(offer) {
  if (offer.slug) return `slug:${offer.slug}`;
  return offer.jan || `${normalizeTitle(offer.title)}:${offer.platform}:${offer.edition}`;
}

export function buildCatalog(rawOffers, now = new Date().toISOString(), gameMaster = []) {
  const nowDate = new Date(now);
  const groups = new Map();
  const masterById = new Map(gameMaster.map((game) => [game.id, game]));
  const masterByJan = new Map(gameMaster.map((game) => [String(game.jan), game]));
  for (const offer of rawOffers) {
    if (!isEligibleOffer(offer, nowDate)) continue;
    const game = gameMaster.length
      ? masterById.get(offer.slug) || masterByJan.get(String(offer.jan))
      : null;
    if (gameMaster.length) {
      if (!game || String(offer.jan) !== String(game.jan)) continue;
      const offerTitle = normalizeTitle(offer.title || "");
      const gameTitles = [game.title, ...(game.aliases || [])].map(normalizeTitle);
      if (!gameTitles.some((title) => offerTitle.includes(title) || title.includes(offerTitle))) continue;
    }
    const key = game ? `slug:${game.id}` : groupKey(offer);
    const group = groups.get(key) || { purchase: [], sale: [], exemplar: game || offer };
    group[offer.kind].push(offer);
    groups.set(key, group);
  }
  for (const game of gameMaster) {
    const key = game.id ? `slug:${game.id}` : game.jan || `${normalizeTitle(game.title)}:Nintendo Switch:standard`;
    if (!groups.has(key)) groups.set(key, { purchase: [], sale: [], exemplar: game });
  }
  return [...groups.values()].map((group) => {
    const purchase = group.purchase.sort((a, b) => a.priceWithShipping - b.priceWithShipping);
    const sale = group.sale.sort((a, b) => b.price - a.price);
    return {
      id: group.exemplar.id || group.exemplar.slug, jan: group.exemplar.jan ?? null, title: group.exemplar.title,
      genre: group.exemplar.genre, cover: group.exemplar.cover, searches: group.exemplar.searches ?? 0,
      aliases: group.exemplar.aliases ?? [], releaseDate: group.exemplar.releaseDate ?? null,
      verification: group.exemplar.verification ?? null,
      imageUrl: purchase.find((offer) => offer.imageUrl)?.imageUrl ?? group.exemplar.imageUrl ?? null,
      purchase: purchase.map(({ source, priceWithShipping, url }) => ({ name: source, price: priceWithShipping, url })),
      sale: sale.map(({ source, price, url }) => ({ name: source, price, url })),
      updatedAt: now,
    };
  });
}
