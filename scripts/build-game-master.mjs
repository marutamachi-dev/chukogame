import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GAME_COUNT, CHUNK_SIZE, hasExcludedProductName, isValidJan,
  selectMasterCandidates, validateGameMaster,
} from "../src/lib/game-master.js";

const applicationId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
if (!applicationId || !accessKey) {
  throw new Error("RAKUTEN_APPLICATION_ID and RAKUTEN_ACCESS_KEY are required to build the game master.");
}

const endpoint = "https://openapi.rakuten.co.jp/services/api/BooksGame/Search/20170404";
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
  if (item.titleKana) aliases.add(compact(item.titleKana));
  const withoutMarks = title.replace(/[™®©]/g, "").replace(/[：:]/g, " ").replace(/\s+/g, " ").trim();
  if (withoutMarks !== title) aliases.add(withoutMarks);
  for (const [pattern, values] of curatedAliases) {
    if (pattern.test(title)) values.forEach((value) => aliases.add(value));
  }
  aliases.delete(title);
  return [...aliases];
}

function eligible(item) {
  return compact(item.hardware) === "Nintendo Switch"
    && Number(item.limitedFlag) === 0
    && isValidJan(String(item.jan))
    && /^https:\/\//.test(item.itemUrl || "")
    && !hasExcludedProductName(item.title);
}

async function fetchPage(sort, page) {
  const params = new URLSearchParams({
    applicationId, accessKey, format: "json", formatVersion: "2",
    hardware: "Nintendo Switch", booksGenreId: "006", hits: "30", page: String(page),
    sort, outOfStockFlag: "1",
    elements: "title,titleKana,hardware,label,jan,salesDate,itemUrl,largeImageUrl,limitedFlag,booksGenreId",
  });
  const response = await fetch(`${endpoint}?${params}`);
  if (!response.ok) throw new Error(`Rakuten Books API ${response.status} on ${sort} page ${page}`);
  return (await response.json()).items || [];
}

async function fetchPages(sort, count) {
  const items = [];
  for (let page = 1; page <= count; page += 1) {
    items.push(...await fetchPage(sort, page));
    if (page < count) await delay(1100);
  }
  return items.filter(eligible);
}

const popular = await fetchPages("sales", 20);
const recent = await fetchPages("-releaseDate", 12);
const selected = selectMasterCandidates({
  popular,
  recent,
  coverage: [...popular.slice(150), ...recent.slice(60)],
});
if (selected.length !== GAME_COUNT) {
  throw new Error(`Only ${selected.length} eligible unique titles were returned; refusing to publish an incomplete master.`);
}

const checkedAt = new Date().toISOString().slice(0, 10);
const games = selected.map((item, index) => ({
  id: slugify(item.title, item.jan),
  title: compact(item.title),
  jan: String(item.jan),
  genre: classifyGenre(item.title),
  releaseDate: compact(item.salesDate) || "不明",
  aliases: buildAliases(item),
  imageUrl: item.largeImageUrl || null,
  searches: GAME_COUNT - index,
  selectionGroup: item.selectionGroup,
  verification: {
    source: "Rakuten Books Game Search API",
    sourceUrl: item.itemUrl,
    checkedAt,
  },
  chunk: Math.floor(index / CHUNK_SIZE),
}));

const errors = validateGameMaster(games);
if (errors.length) throw new Error(`Generated game master failed validation:\n${errors.join("\n")}`);
await writeFile(resolve(import.meta.dirname, "../src/data/game-master.json"), `${JSON.stringify(games, null, 2)}\n`, "utf8");
console.log(`Generated ${games.length} verified Nintendo Switch package titles in 6 chunks.`);
