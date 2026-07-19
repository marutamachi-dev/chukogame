const endpoint = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";

export function yahooConfigured(env = process.env) {
  return Boolean(env.YAHOO_SHOPPING_APP_ID);
}

export async function fetchYahooOffers(game, env = process.env, fetchImpl = fetch) {
  if (!yahooConfigured(env)) return [];
  const createParams = () => new URLSearchParams({
    appid: env.YAHOO_SHOPPING_APP_ID,
    condition: "used",
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
  const janParams = addAffiliate(createParams());
  janParams.set("jan_code", game.jan);
  const payload = await request(janParams);
  const observedAt = new Date().toISOString();
  return (payload.hits || []).filter((item) => (
    String(item.janCode) === String(game.jan)
    && item.condition === "used"
    && item.inStock === true
    && (Number(item.shipping?.code) === 1 || /送料無料/.test(item.shipping?.name || ""))
  )).map((item) => ({
    slug: game.id, jan: game.jan, title: item.name, genre: game.genre, cover: game.cover,
    searches: game.searches, platform: "Nintendo Switch", format: "package", edition: "standard",
    condition: "used-standard",
    inStock: item.inStock === true, kind: "purchase", source: "Yahoo! Shopping",
    priceWithShipping: Number(item.price), url: item.url,
    directUrl: item.url, verification: "direct-listing", observedAt,
    imageUrl: item.image?.medium || item.image?.url || (item.imageId ? `https://item-shopping.c.yimg.jp/i/g/${item.imageId}` : null),
  }));
}
