import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GAME_COUNT, CHUNK_SIZE, MASTER_QUERIES, MASTER_SORTS, cleanCatalogTitle, detectGamePlatform, hasExcludedProductName, isValidJan,
  requestWithRateLimit, selectMasterCandidates, validateGameMaster,
} from "../src/lib/game-master.js";
import { classifyGameGenre } from "../src/lib/genre-classifier.js";

const applicationId = process.env.YAHOO_SHOPPING_APP_ID;
if (!applicationId) {
  throw new Error("YAHOO_SHOPPING_APP_ID is required to build the game master.");
}

const endpoint = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
const packageCategoryId = "50522";
const switch2TargetCount = 50;
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const compact = (value) => String(value || "").normalize("NFKC").trim();

function slugify(title, jan) {
  const ascii = compact(title).toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ascii || "switch-game"}-${String(jan).slice(-6)}`;
}

const curatedAliases = [
  [/ティアーズ オブ ザ キングダム/i, ["ティアキン", "ゼルダ ティアキン", "totk"]],
  [/ブレス オブ ザ ワイルド/i, ["ブレワイ", "ゼルダ ブレワイ", "botw"]],
  [/大乱闘スマッシュブラザーズ/i, ["スマブラ", "スマブラsp"]],
  [/あつまれ どうぶつの森/i, ["あつ森", "あつもり"]],
  [/マリオカート8/i, ["マリカー8", "マリオカート8dx"]],
  [/スプラトゥーン3/i, ["スプラ3", "スプラトゥーン３"]],
  [/ポケットモンスター スカーレット/i, ["ポケモンSV", "ポケモンスカーレット"]],
  [/ポケットモンスター バイオレット/i, ["ポケモンSV", "ポケモンバイオレット"]],
];

function buildAliases(item) {
  const aliases = new Set();
  const title = compact(item.title);
  const cleanedTitle = cleanCatalogTitle(title);
  if (cleanedTitle !== title) aliases.add(title);
  const withoutMarks = title.replace(/[™®©]/g, "").replace(/[：:]/g, " ").replace(/\s+/g, " ").trim();
  if (withoutMarks !== title) aliases.add(withoutMarks);
  for (const [pattern, values] of curatedAliases) {
    if (pattern.test(title)) values.forEach((value) => aliases.add(value));
  }
  aliases.delete(title);
  return [...aliases];
}

function eligible(item) {
  return Number(item.genreCategory?.id) === Number(packageCategoryId)
    && item.condition === "new"
    && isValidJan(String(item.janCode))
    && /^https:\/\//.test(item.url || "")
    && !hasExcludedProductName(item.name)
    && !/(本体|コントローラ|ケース|保護フィルム|攻略本|amiibo|アミーボ)/i.test(item.name);
}

async function fetchPage(sort, query, start) {
  const params = new URLSearchParams({
    appid: applicationId,
    genre_category_id: packageCategoryId,
    results: "50",
    start: String(start),
    sort,
    condition: "new",
    image_size: "300",
  });
  if (query) params.set("query", query);
  const requestUrl = `${endpoint}?${params}`;
  const response = await requestWithRateLimit(() => fetch(requestUrl), delay);
  if (!response.ok) throw new Error(`Yahoo Shopping API ${response.status} on ${sort} start ${start}`);
  return (await response.json()).hits || [];
}

async function fetchPages(sort, query) {
  const items = [];
  for (let start = 1; start <= 901; start += 50) {
    items.push(...await fetchPage(sort, query, start));
    if (start < 901) await delay(1100);
  }
  return items.filter(eligible);
}

function uniqueProducts(items) {
  const byJan = new Map();
  for (const item of items) {
    const jan = String(item.janCode);
    const current = byJan.get(jan);
    if (!current || compact(item.name).length < compact(current.name).length) byJan.set(jan, item);
  }
  return [...byJan.values()].map((item) => ({
    ...item,
    jan: String(item.janCode),
    title: compact(item.name),
    platform: detectGamePlatform(item.name),
    salesDate: item.releaseDate || "不明",
    itemUrl: item.url,
    largeImageUrl: item.exImage?.url || item.image?.medium || null,
  }));
}

const pagesBySearch = new Map();
for (const query of MASTER_QUERIES) {
  for (const sort of MASTER_SORTS) {
    pagesBySearch.set(`${query}:${sort}`, await fetchPages(sort, query));
    if (query !== MASTER_QUERIES.at(-1) || sort !== MASTER_SORTS.at(-1)) await delay(1100);
  }
}
const reviewed = pagesBySearch.get(":-review_count");
const recommended = pagesBySearch.get(":-score");
const popular = uniqueProducts(reviewed);
const recent = uniqueProducts([...reviewed, ...recommended])
  .sort((a, b) => String(b.releaseDate || "").localeCompare(String(a.releaseDate || "")));
const allCandidates = uniqueProducts([...pagesBySearch.values()].flat());
const selectPlatformCandidates = (platform, totalCount) => selectMasterCandidates({
  popular: popular.filter((item) => item.platform === platform),
  recent: recent.filter((item) => item.platform === platform),
  coverage: allCandidates.filter((item) => item.platform === platform),
}, { totalCount, popularCount: Math.ceil(totalCount / 2) });
const switch2Count = Math.min(switch2TargetCount, allCandidates.filter((item) => item.platform === "Nintendo Switch 2").length);
if (!switch2Count) throw new Error("No verified Nintendo Switch 2 package titles were returned; refusing to publish a Switch-only master.");
const selected = [
  ...selectPlatformCandidates("Nintendo Switch 2", switch2Count),
  ...selectPlatformCandidates("Nintendo Switch", GAME_COUNT - switch2Count),
];
if (selected.length !== GAME_COUNT) {
  throw new Error(`Only ${selected.length} eligible unique titles were returned; refusing to publish an incomplete master.`);
}

const checkedAt = new Date().toISOString().slice(0, 10);
const games = selected.map((item, index) => ({
  id: slugify(item.title, item.jan),
  title: cleanCatalogTitle(item.title),
  platform: item.platform,
  jan: String(item.jan),
  genre: classifyGameGenre(item.title, item.platform === "Nintendo Switch 2" ? "アクション" : undefined),
  releaseDate: compact(item.salesDate) || "不明",
  aliases: buildAliases(item),
  imageUrl: item.largeImageUrl || null,
  searches: GAME_COUNT - index,
  selectionGroup: item.selectionGroup,
  verification: {
    source: "Yahoo! Shopping package category API",
    sourceUrl: item.itemUrl,
    checkedAt,
  },
  chunk: Math.floor(index / CHUNK_SIZE),
}));

const errors = validateGameMaster(games);
if (errors.length) throw new Error(`Generated game master failed validation:\n${errors.join("\n")}`);
await writeFile(resolve(import.meta.dirname, "../src/data/game-master.json"), `${JSON.stringify(games, null, 2)}\n`, "utf8");
console.log(`Generated ${games.length} verified Nintendo Switch 2 / Nintendo Switch package titles in ${games.length / CHUNK_SIZE} chunks.`);
