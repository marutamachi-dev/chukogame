import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { generatedGames } from "../src/data/generated-catalog.js";
import { groupHistorySnapshots } from "../src/lib/price-history.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const client = createClient(url, key, { auth: { persistSession: false } });
const { data: rows, error } = await client
  .from("chukogame_price_history")
  .select("game_jan, observed_on, median_purchase_price")
  .order("observed_on", { ascending: true });
if (error) throw error;

const history = groupHistorySnapshots(rows, new Set(generatedGames.map((game) => String(game.jan))));
const output = `// Generated from verified Supabase price snapshots. Do not edit manually.\nexport const priceHistoryByJan = ${JSON.stringify(history, null, 2)};\n`;
await writeFile(new URL("../src/data/price-history.js", import.meta.url), output, "utf8");
console.log(`Exported ${Object.keys(history).length} titles with verified price history.`);
