import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/daily-catalog.yml", import.meta.url), "utf8");

test("daily workflow rebalances before refreshing every catalog chunk", () => {
  assert.match(workflow, /npm run rebalance:catalog/);
  assert.match(workflow, /GAME_CHUNK: \$\{\{ github\.event_name == 'schedule' && 'all'/);
  assert.ok(workflow.indexOf("npm run rebalance:catalog") < workflow.indexOf("npm run refresh:sources"));
  assert.match(workflow, /npm run finalize:rebalance/);
});

test("daily refresh provides Yahoo credentials without Rakuten credentials", () => {
  const block = workflow.slice(workflow.indexOf("Refresh marketplace source offers"));
  assert.match(block, /YAHOO_SHOPPING_APP_ID:/);
  assert.doesNotMatch(block, /RAKUTEN_APPLICATION_ID:/);
  assert.doesNotMatch(block, /RAKUTEN_ACCESS_KEY:/);
  assert.match(block, /GAME_CHUNK: \$\{\{ github\.event_name == 'schedule' && 'all'/);
});
