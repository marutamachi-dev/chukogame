const endpoint = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
const normalizeTitle = (value) => value
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s\u30fb:\uff1a!\uff01?\uff1f'"\u300c\u300d]/g, "");

const titleVariants = (game) => [game.title, ...(game.aliases || [])]
  .flatMap((title) => [
    title,
    String(title).replace(/^\s*ポケモン\s*\(switch\s*2\)\s*/iu, ""),
    String(title).replace(/^\s*\(switch\s*2\)\s*/iu, ""),
  ])
  .map(normalizeTitle)
  .filter((title, index, titles) => title.length >= 8 && titles.indexOf(title) === index);

export function yahooConfigured(env = process.env) {
  return Boolean(env.YAHOO_SHOPPING_APP_ID);
}

export async function fetchYahooOffers(game, env = process.env, fetchImpl = fetch) {
  if (!yahooConfigured(env)) return [];
  const createParams = () => new URLSearchParams({
    appid: env.YAHOO_SHOPPING_APP_ID,
    condition: "used",
    in_stock: "true",
    shipping: "free",
    sort: "+price",
    results: "30",
  });
  const addAffiliate = (params) => {
    if (env.YAHOO_SHOPPING_AFFILIATE_ID) {
      params.set("affiliate_type", "vc");
      params.set("affiliate_id", env.YAHOO_SHOPPING_AFFILIATE_ID);
    }
    return params;
  };
  const request = async (params) => {
    const response = await fetchImpl(`${endpoint}?${params}`);
    if (!response.ok) throw new Error(`Yahoo Shopping API returned ${response.status}`);
    return response.json();
  };
  const observedAt = new Date().toISOString();
  const searches = [
    { jan_code: game.jan },
    { query: game.title },
    ...(game.aliases || []).map((query) => ({ query })),
  ];
  for (const search of searches) {
    const params = addAffiliate(createParams());
    for (const [key, value] of Object.entries(search)) params.set(key, value);
    const offers = toVerifiedOffers((await request(params)).hits || [], game, observedAt);
    if (offers.length) return offers;
  }
  return [];
}

function toVerifiedOffers(items, game, observedAt) {
  const platform = game.platform || "Nintendo Switch";
  const isSwitch2Listing = (title) => /switch(?: |　)*2|\u30b9\u30a4\u30c3\u30c12/iu.test(title || "");
  const verifiedTitles = titleVariants(game);
  return items.filter((item) => (
    String(item.janCode) === String(game.jan)
    && verifiedTitles.some((title) => normalizeTitle(item.name || "").includes(title))
    && (platform === "Nintendo Switch 2" ? isSwitch2Listing(item.name) : !isSwitch2Listing(item.name))
    && item.condition === "used"
    && item.inStock === true
    && Number(item.price) > 0
    && Number(item.shipping?.code) === 2
  )).map((item) => ({
    slug: game.id, jan: game.jan, title: item.name, genre: game.genre, cover: game.cover,
    searches: game.searches, platform, format: "package", edition: "standard",
    condition: "used-standard",
    inStock: item.inStock === true, kind: "purchase", source: "Yahoo! Shopping",
    priceWithShipping: Number(item.price), shippingCode: Number(item.shipping.code), url: item.url,
    directUrl: item.url, verification: "direct-listing", observedAt,
    imageUrl: item.image?.medium || item.image?.url || (item.imageId ? `https://item-shopping.c.yimg.jp/i/g/${item.imageId}` : null),
  }));
}
