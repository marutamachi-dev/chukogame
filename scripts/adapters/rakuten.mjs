const endpoint = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

export function rakutenConfigured(env = process.env) {
  return Boolean(env.RAKUTEN_APPLICATION_ID && env.RAKUTEN_ACCESS_KEY);
}

export async function fetchRakutenOffers(game, env = process.env, fetchImpl = fetch) {
  if (!rakutenConfigured(env)) return [];
  const params = new URLSearchParams({
    applicationId: env.RAKUTEN_APPLICATION_ID,
    accessKey: env.RAKUTEN_ACCESS_KEY,
    keyword: game.jan || game.title,
    format: "json",
    formatVersion: "2",
    hits: "30",
    sort: "+itemPrice",
    elements: "itemName,itemPrice,itemUrl,affiliateUrl,availability,mediumImageUrls",
  });
  if (env.RAKUTEN_AFFILIATE_ID) params.set("affiliateId", env.RAKUTEN_AFFILIATE_ID);
  const response = await fetchImpl(`${endpoint}?${params}`);
  if (!response.ok) throw new Error(`Rakuten API returned ${response.status}`);
  const payload = await response.json();
  return (payload.items || []).map((item) => ({
    slug: game.id, jan: game.jan, title: item.itemName, genre: game.genre, cover: game.cover,
    searches: game.searches, platform: "Nintendo Switch", format: "package", edition: "standard",
    condition: /\u4e2d\u53e4/.test(item.itemName) ? "used-standard" : "unknown",
    inStock: Number(item.availability) === 1, kind: "purchase", source: "Rakuten Ichiba",
    priceWithShipping: Number(item.itemPrice), url: item.affiliateUrl || item.itemUrl,
    imageUrl: item.mediumImageUrls?.[0]?.imageUrl || item.mediumImageUrls?.[0] || item.imageUrl || null,
  }));
}