const endpoint = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

const normalize = (value) => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s\u30fb:\uff1a!\uff01?\uff1f'"\u300c\u300d]/g, "");

export class RakutenAuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RakutenAuthenticationError";
  }
}

export async function authorizeCollectorRequest(secret, verifySecret) {
  if (!secret) return false;
  return Boolean(await verifySecret(secret));
}

export async function collectRakutenGame(game, { applicationId, accessKey, fetch, now = () => new Date().toISOString() }) {
  applicationId = String(applicationId || "").trim();
  accessKey = String(accessKey || "").trim();
  if (!applicationId || !accessKey) throw new RakutenAuthenticationError("Rakuten credentials are not configured");

  const params = new URLSearchParams({
    applicationId,
    accessKey,
    keyword: game.jan,
    format: "json",
    formatVersion: "2",
    hits: "30",
    sort: "+itemPrice",
    elements: "itemName,itemPrice,itemUrl,affiliateUrl,availability,mediumImageUrls,postageFlag,itemCode",
  });
  const response = await fetch(`${endpoint}?${params}`, {
    headers: {
      accept: "application/json",
      "user-agent": "chukogame-price-collector/1.0 (+https://chukogame.vercel.app/)",
    },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const message = String(detail.error_description || detail.error || detail.errorCode || `Rakuten API returned ${response.status}`);
    if (response.status === 401 || response.status === 403 || /application[_-]?id|access[_-]?key|unauthori[sz]ed|auth/i.test(message)) {
      throw new RakutenAuthenticationError(`Rakuten API credentials were rejected: ${message}`);
    }
    throw new Error(`Rakuten API returned ${response.status}: ${message}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const observedAt = now();
  const offers = items
    .filter((item) => isVerifiedItem(item, game))
    .map((item) => toOffer(item, game, observedAt));

  return {
    status: offers.length ? "verified" : (items.length ? "no-verified-match" : "no-search-results"),
    offers,
  };
}

function isVerifiedItem(item, game) {
  const title = String(item.itemName || "");
  const normalizedTitle = normalize(title);
  return (
    /中古/.test(title)
    && /nintendo\s*switch|switch/i.test(title)
    && !/switch\s*2/i.test(title)
    && normalizedTitle.includes(normalize(game.title))
    && Number(item.availability) === 1
    && Number(item.postageFlag) === 0
    && Number(item.itemPrice) > 0
  );
}

function toOffer(item, game, observedAt) {
  return {
    slug: game.id,
    jan: game.jan,
    title: item.itemName,
    genre: game.genre,
    cover: game.imageUrl || null,
    platform: "Nintendo Switch",
    format: "package",
    edition: "standard",
    condition: "used-standard",
    inStock: true,
    kind: "purchase",
    source: "Rakuten Ichiba",
    priceWithShipping: Number(item.itemPrice),
    url: item.affiliateUrl || item.itemUrl,
    directUrl: item.itemUrl,
    verification: "direct-listing",
    observedAt,
    imageUrl: item.mediumImageUrls?.[0]?.imageUrl || item.mediumImageUrls?.[0] || null,
  };
}
