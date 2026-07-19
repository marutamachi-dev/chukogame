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
  let payload = await request(janParams);
  if (!(payload.hits || []).length) {
    const titleParams = addAffiliate(createParams());
    titleParams.set("query", game.title);
    payload = await request(titleParams);
  }
  return (payload.hits || []).map((item) => ({
    slug: game.id, jan: game.jan, title: item.name, genre: game.genre, cover: game.cover,
    searches: game.searches, platform: "Nintendo Switch", format: "package", edition: "standard",
    condition: "used-standard",
    inStock: item.in_stock !== false, kind: "purchase", source: "Yahoo! Shopping",
    priceWithShipping: Number(item.price), url: item.url,
    imageUrl: item.image?.medium || item.image?.url || (item.imageId ? `https://item-shopping.c.yimg.jp/i/g/${item.imageId}` : null),
  }));
}