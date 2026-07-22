import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import gameMaster from "../src/data/game-master.json" with { type: "json" };
import { planCatalogReplacement, scoreDemand } from "../src/lib/demand-catalog.js";
import { cleanCatalogTitle, hasExcludedProductName, isValidJan, validateGameMaster } from "../src/lib/game-master.js";
import { matchesTitle } from "../src/lib/game-match.js";
import { normalizeTitle } from "../src/lib/price-rules.js";

const root = resolve(import.meta.dirname, "..");
const planPath = resolve(root, "data/demand-rebalance.json");
const masterPath = resolve(root, "src/data/game-master.json");
const packageCategoryId = "50522";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for demand rebalancing`);
  return value;
}

function slugify(title, jan) {
  const ascii = String(title).normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${ascii || "switch-game"}-${String(jan).slice(-6)}`;
}

function candidateFromYahoo(item, query, demandScore) {
  const title = cleanCatalogTitle(item.name);
  const jan = String(item.janCode || "");
  const normalizedQuery = normalizeTitle(query);
  const normalizedTitle = normalizeTitle(title);
  if (
    String(item.genreCategory?.id) !== packageCategoryId
    || item.condition !== "new"
    || !isValidJan(jan)
    || hasExcludedProductName(item.name)
    || !normalizedQuery
    || (!normalizedTitle.includes(normalizedQuery) && !normalizedQuery.includes(normalizedTitle))
  ) return null;
  return {
    id: slugify(title, jan),
    title,
    jan,
    genre: "その他",
    releaseDate: item.releaseDate || "発売日未確認",
    aliases: [],
    imageUrl: item.exImage?.url || item.image?.medium || null,
    searches: demandScore,
    selectionGroup: "demand",
    verification: {
      source: "Yahoo! Shopping package category API",
      sourceUrl: item.url,
      checkedAt: new Date().toISOString().slice(0, 10),
    },
  };
}

async function fetchCandidate(query, demandScore) {
  const params = new URLSearchParams({
    appid: required("YAHOO_SHOPPING_APP_ID"),
    genre_category_id: packageCategoryId,
    condition: "new",
    results: "20",
    query,
  });
  const response = await fetch(`https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?${params}`);
  if (!response.ok) throw new Error(`Yahoo Shopping candidate search returned ${response.status}`);
  const items = (await response.json()).hits || [];
  return items.map((item) => candidateFromYahoo(item, query, demandScore)).find(Boolean) || null;
}

try {
  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data: demandRows, error: demandError }, { data: stateRows, error: stateError }] = await Promise.all([
    supabase.rpc("chukogame_demand_30d"),
    supabase.from("chukogame_catalog_state").select("game_jan, listed_from"),
  ]);
  if (demandError || stateError) throw new Error(demandError?.message || stateError?.message);

  const today = new Date().toISOString().slice(0, 10);
  const stateByJan = new Map((stateRows || []).map((row) => [row.game_jan, row.listed_from]));
  const listed = gameMaster.map((game) => {
    const searchRows = (demandRows || []).filter((row) => row.query && matchesTitle(game, row.query));
    const viewRow = (demandRows || []).find((row) => row.game_jan === game.jan);
    const searchCount = searchRows.reduce((total, row) => total + row.search_count, 0);
    const missCount = searchRows.reduce((total, row) => total + row.miss_count, 0);
    return {
      ...game,
      demandScore: scoreDemand({ searchCount, missCount, viewCount: viewRow?.view_count || 0 }),
      listedFrom: stateByJan.get(game.jan) || "2000-01-01",
    };
  });
  const missedQueries = (demandRows || [])
    .filter((row) => row.query && row.miss_count > 0)
    .sort((a, b) => b.demand_score - a.demand_score)
    .slice(0, 30);
  const candidates = [];
  for (const row of missedQueries) {
    const candidate = await fetchCandidate(row.query, row.demand_score);
    if (candidate && !candidates.some((game) => game.jan === candidate.jan)) candidates.push(candidate);
  }

  const replacement = planCatalogReplacement({ listed, candidates, today });
  const replacementByJan = new Map(replacement.additions.map((game, index) => [replacement.removals[index].jan, game]));
  const nextMaster = gameMaster.map((game) => {
    const candidate = replacementByJan.get(game.jan);
    return candidate ? { ...candidate, chunk: game.chunk } : game;
  });
  const errors = validateGameMaster(nextMaster);
  if (errors.length) throw new Error(`Refusing invalid demand rebalance:\n${errors.join("\n")}`);
  const addedJans = new Set(replacement.additions.map((game) => game.jan));
  const catalogState = nextMaster.map((game) => ({
    game_jan: game.jan,
    listed_from: addedJans.has(game.jan) ? today : (stateByJan.get(game.jan) || "2000-01-01"),
  }));

  await writeFile(masterPath, `${JSON.stringify(nextMaster, null, 2)}\n`, "utf8");
  await writeFile(planPath, `${JSON.stringify({ today, replacement, catalogState }, null, 2)}\n`, "utf8");
  console.log(`Demand rebalance planned: ${replacement.additions.length} replacements.`);
} catch (error) {
  console.warn(`Demand rebalance skipped: ${error.message}`);
  await writeFile(planPath, `${JSON.stringify({ skipped: true, reason: error.message }, null, 2)}\n`, "utf8");
}
