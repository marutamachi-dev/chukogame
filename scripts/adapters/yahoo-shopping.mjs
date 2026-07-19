const endpoint = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";

export function yahooConfigured(env = process.env) {
  return Boolean(env.YAHOO_SHOPPING_APP_ID);
}

export async function fetchYahooOffers(game, env = process.env, fetchImpl = fetch) {
  if (!yahooConfigured(env)) return [];
  const params = new URLSearchParams({
    appid: env.YAHOO_SHOPPING_APP_ID,
    jan_code: game.jan,
    condition: "used",
    sort: "+price",
    results: "30",
  });
  if (env.YAHOO_SHOPPING_AFFILIATE_ID) {
    params.set("affiliate_type", "vc");
    params.set("affiliate_id", env.YAHOO_SHOPPING_AFFILIATE_ID);
  }
  const response = await fetchImpl(`${endpoint}?${params}`);
  if (!response.ok) throw new Error(`Yahoo Shopping API returned ${response.status}`);
  const payload = await response.json();
  return (payload.hits || []).map((item) => ({
    slug: game.id, jan: game.jan, title: item.name, genre: game.genre, cover: game.cover,
    searches: game.searches, platform: "Nintendo Switch", format: "package", edition: "standard",
    condition: /\u4e2d\u53e4/.test(item.name) ? "used-standard" : "unknown",
    inStock: item.in_stock !== false, kind: "purchase", source: "Yahoo! Shopping",
    priceWithShipping: Number(item.price), url: item.url,
    imageUrl: item.image?.medium || item.image?.url || (item.imageId ? `https://item-shopping.c.yimg.jp/i/g/${item.imageId}` : null),
  }));
}