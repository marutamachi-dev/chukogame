import { createClient } from "@supabase/supabase-js";
import { generatedGames } from "../src/data/generated-catalog.js";
import { medianPurchasePrice, observedDateInJst } from "../src/lib/price-history.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const observedOn = observedDateInJst();
const rows = generatedGames.flatMap((game) => {
  const prices = (game.purchase || []).map(({ price }) => ({ price })).filter(({ price }) => Number.isFinite(price));
  const median = medianPurchasePrice(prices);
  if (median == null) return [];
  const sales = (game.sale || []).map(({ price }) => price).filter(Number.isFinite);
  return [{
    game_jan: String(game.jan), observed_on: observedOn,
    lowest_purchase_price: Math.min(...prices.map(({ price }) => price)), median_purchase_price: median,
    highest_sale_price: sales.length ? Math.max(...sales) : null,
    eligible_seller_count: prices.length, source_count: prices.length,
  }];
});
const client = createClient(url, key, { auth: { persistSession: false } });
if (rows.length) {
  const { error } = await client.from("chukogame_price_history").upsert(rows, { onConflict: "game_jan,observed_on" });
  if (error) throw error;
}
console.log(`Recorded ${rows.length} verified price-history snapshots for ${observedOn}.`);
