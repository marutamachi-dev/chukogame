import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("collector tables are private and six daily chunks are scheduled", async () => {
  const sql = await readFile("supabase/migrations/20260726140000_create_chukogame_source_collector.sql", "utf8");

  assert.match(sql, /chukogame_source_refresh_runs/);
  assert.match(sql, /chukogame_source_refresh_results/);
  assert.match(sql, /chukogame_source_offers/);
  assert.match(sql, /alter table public\.chukogame_source_offers enable row level security/i);
  assert.match(sql, /revoke all on table public\.chukogame_source_offers from anon, authenticated/i);
  assert.match(sql, /chukogame-rakuten-chunk-0/);
  assert.match(sql, /chukogame-rakuten-chunk-5/);
});
