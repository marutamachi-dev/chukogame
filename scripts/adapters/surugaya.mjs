const endpoint = "https://www.suruga-ya.jp/kaitori/search_buy";

const decodeEntities = (value) => value
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;/g, " ");

const stripTags = (value) => decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

const normalizeTitle = (value) => value
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s\u30fb:\uff1a!\uff01?\uff1f'"\u300c\u300d]/g, "");

export function extractSurugayaOffers(html, game, observedAt = new Date().toISOString()) {
  const rows = html.match(/<tr class="listap[\s\S]*?<\/tr>/g) || [];

  return rows.flatMap((row) => {
    const category = stripTags(row.match(/<div class="category">([\s\S]*?)<\/div>/)?.[1] || "");
    const title = stripTags(row.match(/<h3 class="product-name">([\s\S]*?)<\/h3>/)?.[1] || "");
    const detailId = row.match(/\/kaitori\/kaitori_detail\/(\d+)/)?.[1];
    const price = Number(row.match(new RegExp(`name="kakaku" value="(\\d+)"[^>]*class="kakaku-${detailId}"`))?.[1]);
    const jan = row.match(/\b\d{13}\b/)?.[0] || null;

    if (
      !detailId
      || !Number.isFinite(price)
      || price <= 0
      || !category.includes("ニンテンドースイッチソフト")
      || normalizeTitle(title) !== normalizeTitle(game.title)
    ) return [];

    const directUrl = `https://www.suruga-ya.jp/kaitori/kaitori_detail/${detailId}`;
    return [{
      slug: game.id,
      // Use the JAN shown on the official result page. It is more reliable than
      // a provisional master value and is kept with the direct listing.
      jan: jan || game.jan,
      sourceJan: jan,
      title,
      genre: game.genre,
      cover: game.cover,
      searches: game.searches,
      platform: "Nintendo Switch",
      format: "package",
      edition: "standard",
      condition: "used-standard",
      inStock: true,
      kind: "sale",
      source: "駿河屋",
      price,
      url: directUrl,
      directUrl,
      verification: "direct-listing",
      observedAt,
    }];
  });
}

export async function fetchSurugayaOffers(game, fetchImpl = fetch) {
  const params = new URLSearchParams({
    category: "2",
    search_word: game.title,
    key_flag: "0",
    searchbox: "1",
  });
  const response = await fetchImpl(`${endpoint}?${params}`, {
    headers: { "User-Agent": "ChukoGameKakakuNavi/1.0 (+https://chukogame.vercel.app/)" },
  });
  if (!response.ok) throw new Error(`Surugaya search returned ${response.status}`);
  return extractSurugayaOffers(await response.text(), game);
}
