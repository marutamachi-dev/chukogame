import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const generator = await readFile(new URL("../scripts/generate-seo.mjs", import.meta.url), "utf8");
test("static detail pages contain crawlable price-comparison content", () => {
  assert.match(generator, /staticGameContent/);
  assert.match(generator, /買う先を比較する/);
  assert.match(generator, /価格の掲載基準/);
});