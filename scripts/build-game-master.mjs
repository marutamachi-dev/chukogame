import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GAME_COUNT, CHUNK_SIZE, cleanCatalogTitle, hasExcludedProductName, isValidJan,
  requestWithRateLimit, selectMasterCandidates, validateGameMaster,
} from "../src/lib/game-master.js";

const applicationId = process.env.YAHOO_SHOPPING_APP_ID;
if (!applicationId) {
  throw new Error("YAHOO_SHOPPING_APP_ID is required to build the game master.");
}

const endpoint = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
const packageCategoryId = "50522";
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const compact = (value) => String(value || "").normalize("NFKC").trim();

function slugify(title, jan) {
  const ascii = compact(title).toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ascii || "switch-game"}-${String(jan).slice(-6)}`;
}

function classifyGenre(title) {
  const rules = [
    [/(rpg|ロールプレイ|ポケモン|ゼノブレイド|ドラゴンクエスト|ファイナルファンタジー)/i, "RPG"],
    [/(マリオカート|レース|グランツーリスモ|need for speed)/i, "レース"],
    [/(スポーツ|サッカー|野球|テニス|フィットネス|オリンピック)/i, "スポーツ"],
    [/(シミュレーション|牧場|どうぶつの森|桃太郎電鉄|信長の野望)/i, "シミュレーション"],
    [/(パズル|テトリス|ぷよぷよ|脳トレ)/i, "パズル"],
    [/(パーティ|すごろく|人生ゲーム|ボードゲーム)/i, "パーティー"],
    [/(アドベンチャー|探偵|逆転裁判|ミステリー|物語)/i, "アドベンチャー"],
    [/(アクション|マリオ|ゼルダ|カービィ|スプラトゥーン|無双)/i, "アクション"],
  ];
  return rules.find(([pattern]) => pattern.test(title))?.[1] || "その他";
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

async function fetchPage(sort, start) {
  const params = new URLSearchParams({
    appid: applicationId,
    genre_category_id: packageCategoryId,
    results: "50",
    start: String(start),
    sort,
    condition: "new",
    image_size: "300",
  });
  const requestUrl = `${endpoint}?${params}`;
  const response = await requestWithRateLimit(() => fetch(requestUrl), delay);
  if (!response.ok) throw new Error(`Yahoo Shopping API ${response.status} on ${sort} start ${start}`);
  return (await response.json()).hits || [];
}

async function fetchPages(sort) {
  const items = [];
  for (let start = 1; start <= 901; start += 50) {
    items.push(...await fetchPage(sort, start));
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
    salesDate: item.releaseDate || "不明",
    itemUrl: item.url,
    largeImageUrl: item.exImage?.url || item.image?.medium || null,
  }));
}

const reviewed = await fetchPages("-review_count");
await delay(1100);
const recommended = await fetchPages("-score");
const popular = uniqueProducts(reviewed);
const recent = uniqueProducts([...reviewed, ...recommended])
  .sort((a, b) => String(b.releaseDate || "").localeCompare(String(a.releaseDate || "")));
const allCandidates = uniqueProducts([...reviewed, ...recommended]);
const selected = selectMasterCandidates({
  popular,
  recent,
  coverage: allCandidates,
});
if (selected.length !== GAME_COUNT) {
  throw new Error(`Only ${selected.length} eligible unique titles were returned; refusing to publish an incomplete master.`);
}

const checkedAt = new Date().toISOString().slice(0, 10);
const games = selected.map((item, index) => ({
  id: slugify(item.title, item.jan),
  title: cleanCatalogTitle(item.title),
  jan: String(item.jan),
  genre: classifyGenre(item.title),
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
console.log(`Generated ${games.length} verified Nintendo Switch package titles in 6 chunks.`);
