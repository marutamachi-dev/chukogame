export const GAME_COUNT = 1000;
export const CHUNK_SIZE = 50;
export const CHUNK_COUNT = GAME_COUNT / CHUNK_SIZE;
export const MASTER_SORTS = ["-review_count", "-score", "+price", "-price"];
export const MASTER_QUERIES = ["", "\u30b2\u30fc\u30e0", "\u30bd\u30d5\u30c8"];

export function cleanCatalogTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/&amp;/gi, "&")
    .replace(/^\s*(?:在庫あり|即納|新品|ポスト投函[☆★]?送料無料)\s*/u, "")
    .replace(/[【\[][^】\]]*(?:新品|送料無料|即日|在庫|予約|メール便)[^】\]]*[】\]]/gu, " ")
    .replace(/[【\[](?:NS|Switch版|在庫品|お取寄せ品)[】\]]/giu, " ")
    .replace(/^\s*[【［\[](?:新品|新作|予約)[^】］\]]*[】］\]]\s*/u, "")
    .replace(/^\s*(?:任天堂|Nintendo)\s*(?=\((?:Switch|NSW)\))/iu, "")
    .replace(/^\s*(?:\((?:Switch|NSW)\)|(?:Switch|NSW))\s*/iu, "")
    .replace(/\s+返品種別[A-Z]\s*$/iu, "")
    .replace(/\s+HAC-[A-Z0-9-]+\s*$/iu, "")
    .replace(/\s+(?:Nintendo Switch )?パッケージ版\s*$/u, "")
    .replace(/\s*Switch用ソフト\s*\(パッケージ版\)\s*$/iu, "")
    .replace(/\s*Switch\s*\(パッケージ版\)\s*$/iu, "")
    .replace(/\s*\[Switch版\]\s*$/iu, "")
    .replace(/\s*[★☆■]+\s*(?:蔵出し)?\s*[★☆■]*\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

const excludedProductWords = [
  "追加パス", "追加コンテンツ", "ゼロの秘宝", "double pack", "ダブルパック",
  "本体セット", "同梱版", "pokemon go plus", "amiibo", "コントローラー",
  "switch 2", "switch2", "ダウンロード", "download", "海外版", "輸入版",
  "限定版", "特装版", "豪華版", "同梱版", "セット", "廉価版", "best price",
  "コードのみ", "オンラインコード", "追加コンテンツ", "dl版",
];
const strictExcludedProductWords = [
  "\u30b9\u30a4\u30c3\u30c72", "\u30cb\u30f3\u30c6\u30f3\u30c9\u30fc\u30b9\u30a4\u30c3\u30c72",
  "\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9", "\u6d77\u5916\u7248", "\u8f38\u5165\u7248", "\u7279\u5178", "\u9650\u5b9a\u7248",
  "\u8ffd\u52a0\u30d1\u30b9", "\u8ffd\u52a0\u30b3\u30f3\u30c6\u30f3\u30c4", "\u30bc\u30ed\u306e\u79d8\u5b9d",
  "\u672c\u4f53\u30bb\u30c3\u30c8", "\u540c\u68b1\u7248", "\u5468\u8fba\u6a5f\u5668", "\u30b3\u30f3\u30c8\u30ed\u30fc\u30e9\u30fc",
];

export function isValidJan(value) {
  if (!/^\d{13}$/.test(String(value))) return false;
  const digits = [...String(value)].map(Number);
  const sum = digits.slice(0, 12).reduce((total, digit, index) => (
    total + digit * (index % 2 === 0 ? 1 : 3)
  ), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

export function splitIntoChunks(games, chunkSize = CHUNK_SIZE) {
  return Array.from(
    { length: Math.ceil(games.length / chunkSize) },
    (_, index) => games.slice(index * chunkSize, (index + 1) * chunkSize),
  );
}

export function hasExcludedProductName(title) {
  const normalized = String(title).normalize("NFKC").toLowerCase();
  return [...excludedProductWords, ...strictExcludedProductWords].some((word) => normalized.includes(word));
}

export function validateGameMaster(
  games,
  { expectedCount = GAME_COUNT, expectedChunkSize = CHUNK_SIZE } = {},
) {
  const errors = [];
  if (!Array.isArray(games)) return ["game master must be an array"];
  if (games.length !== expectedCount) errors.push(`expected ${expectedCount} games, received ${games.length}`);

  const ids = new Set();
  const jans = new Set();
  for (const [index, game] of games.entries()) {
    const prefix = `record ${index}`;
    for (const field of ["id", "title", "genre", "releaseDate"]) {
      if (!String(game?.[field] || "").trim()) errors.push(`${prefix}: missing ${field}`);
    }
    if (ids.has(game?.id)) errors.push(`${prefix}: duplicate id ${game?.id}`);
    ids.add(game?.id);
    if (!isValidJan(game?.jan)) errors.push(`${prefix}: invalid JAN ${game?.jan || ""}`);
    if (jans.has(game?.jan)) errors.push(`${prefix}: duplicate JAN ${game?.jan}`);
    jans.add(game?.jan);
    if (!Array.isArray(game?.aliases)) errors.push(`${prefix}: aliases must be an array`);
    if (hasExcludedProductName(game?.title)) errors.push(`${prefix}: excluded product ${game?.title}`);
    if (!/^https:\/\//.test(game?.verification?.sourceUrl || "")) errors.push(`${prefix}: missing verification sourceUrl`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(game?.verification?.checkedAt || "")) errors.push(`${prefix}: invalid verification checkedAt`);
    if (!Number.isInteger(game?.chunk) || game.chunk < 0 || game.chunk >= CHUNK_COUNT) errors.push(`${prefix}: invalid chunk`);
  }

  if (expectedChunkSize != null) {
    for (let chunk = 0; chunk < CHUNK_COUNT; chunk += 1) {
      const count = games.filter((game) => game.chunk === chunk).length;
      if (count !== expectedChunkSize) errors.push(`chunk ${chunk} expected ${expectedChunkSize}, received ${count}`);
    }
  }
  return errors;
}

export function getGameChunk(games, chunkIndex) {
  const index = Number(chunkIndex);
  if (!Number.isInteger(index) || index < 0 || index >= CHUNK_COUNT) {
    throw new RangeError(`GAME_CHUNK must be an integer from 0 to ${CHUNK_COUNT - 1}`);
  }
  return games.filter((game) => game.chunk === index);
}

export function selectMasterCandidates(
  { popular = [], recent = [], coverage = [] },
  { popularCount = 500, recentCount = 200, totalCount = GAME_COUNT } = {},
) {
  const selected = [];
  const seenJans = new Set();
  const append = (items, limit, selectionGroup) => {
    let added = 0;
    for (const item of items) {
      if (selected.length >= totalCount || added >= limit || seenJans.has(String(item.jan))) continue;
      seenJans.add(String(item.jan));
      selected.push({ ...item, selectionGroup });
      added += 1;
    }
  };

  append(popular, popularCount, "popular");
  append(recent, recentCount, "recent");
  append(coverage, totalCount - selected.length, "coverage");
  append([...popular, ...recent], totalCount - selected.length, "coverage");
  return selected;
}

export async function requestWithRateLimit(
  request,
  sleep,
  { retryDelayMs = 65_000, maxRetries = 2 } = {},
) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await request();
    if (response.status !== 429 || attempt === maxRetries) return response;
    await sleep(retryDelayMs);
  }
  throw new Error("unreachable rate-limit retry state");
}
