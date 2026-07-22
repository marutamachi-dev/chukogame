import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(import.meta.dirname, "..");
const planPath = resolve(root, "data/demand-rebalance.json");
const plan = JSON.parse(await readFile(planPath, "utf8"));
if (plan.skipped) process.exit(0);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const existing = await supabase.from("chukogame_catalog_state").upsert(
  plan.catalogState,
  { onConflict: "game_jan", ignoreDuplicates: true },
);
if (existing.error) throw new Error(existing.error.message);

if (plan.replacement.additions.length) {
  const removedJans = plan.replacement.removals.map((game) => game.jan);
  const history = plan.replacement.additions.map((game, index) => ({
    removed_jan: plan.replacement.removals[index].jan,
    added_jan: game.jan,
    removed_score: plan.replacement.removals[index].demandScore,
    added_score: game.demandScore,
  }));
  const [{ error: historyError }, { error: deleteError }] = await Promise.all([
    supabase.from("chukogame_catalog_history").insert(history),
    supabase.from("chukogame_catalog_state").delete().in("game_jan", removedJans),
  ]);
  if (historyError || deleteError) throw new Error(historyError?.message || deleteError?.message);
}
await unlink(planPath);
console.log(`Demand rebalance finalized: ${plan.replacement.additions.length} replacements.`);
